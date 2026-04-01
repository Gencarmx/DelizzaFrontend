import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY  = Deno.env.get("VITE_VAPID_PUBLIC_KEY")!;
const VAPID_MAILTO      = Deno.env.get("VAPID_MAILTO")!;

webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  targetUserId: string;   // auth.users.id del destinatario
  title: string;
  body: string;
  url?: string;           // ruta a abrir al hacer clic en la notificación
  type?: "order_update" | "new_order";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: PushPayload = await req.json();
    const { targetUserId, title, body, url = "/", type } = payload;

    if (!targetUserId || !title || !body) {
      return Response.json(
        { error: "Faltan parámetros requeridos: targetUserId, title, body" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Cliente con service_role para leer todas las suscripciones sin RLS
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

    // Enviar a todos los dispositivos del usuario (puede tener móvil + desktop)
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notificationPayload
        )
      )
    );

    // Limpiar suscripciones expiradas (HTTP 410 = Gone — el endpoint ya no existe)
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

    return Response.json(
      { sent, total: subscriptions.length },
      { headers: corsHeaders }
    );
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
});
