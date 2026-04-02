import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  targetUserId: string;
  title: string;
  body: string;
  url?: string;
  type?: "order_update" | "new_order";
}

Deno.serve(async (req: Request) => {
  // El preflight CORS siempre responde antes de tocar VAPID o cualquier secret
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Leer y validar secrets en tiempo de ejecución (no en módulo)
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_PUBLIC_KEY  = Deno.env.get("VITE_VAPID_PUBLIC_KEY");
    const VAPID_MAILTO      = Deno.env.get("VAPID_MAILTO");

    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY || !VAPID_MAILTO) {
      console.error("Faltan secrets VAPID:", { VAPID_PRIVATE_KEY: !!VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY: !!VAPID_PUBLIC_KEY, VAPID_MAILTO: !!VAPID_MAILTO });
      return Response.json(
        { error: "Secrets VAPID no configurados en la Edge Function" },
        { status: 500, headers: corsHeaders }
      );
    }

    webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const payload: PushPayload = await req.json();
    const { targetUserId, title, body, url = "/", type } = payload;

    if (!targetUserId || !title || !body) {
      return Response.json(
        { error: "Faltan parámetros requeridos: targetUserId, title, body" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", targetUserId);

    if (error) throw error;

    if (!subscriptions?.length) {
      return Response.json(
        { sent: 0, message: "No subscriptions found for user" },
        { headers: corsHeaders }
      );
    }

    const notificationPayload = JSON.stringify({ title, body, url, type });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notificationPayload
        )
      )
    );

    // Limpiar suscripciones expiradas (HTTP 410 = endpoint ya no existe)
    const expiredEndpoints = subscriptions
      .filter((_, i) => {
        const r = results[i];
        return r.status === "rejected" && (r.reason as any)?.statusCode === 410;
      })
      .map((s) => s.endpoint);

    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;

    // Log de resultados para diagnóstico
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`Push falló para endpoint ${i}:`, (r.reason as any)?.message ?? r.reason);
      }
    });

    return Response.json(
      { sent, total: subscriptions.length },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Error en send-push-notification:", err);
    return Response.json(
      { error: (err as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
});
