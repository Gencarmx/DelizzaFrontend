// supabase/functions/onesignal-notify/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Mapa appId → apiKey cargado desde un único secret JSON.
// Formato: { "<app-id>": "<rest-api-key>", ... }
// Ejemplo: {"2a57128f-78c0-...": "os_v2_app_...", "e2cfadbc-ca66-...": "os_v2_app_..."}
const appsConfig: Record<string, string> = (() => {
  try {
    return JSON.parse(Deno.env.get("ONESIGNAL_APPS_JSON") ?? "{}");
  } catch {
    console.error("[onesignal-notify] ONESIGNAL_APPS_JSON no es JSON válido");
    return {};
  }
})();

// App y key de producción (fallback cuando el destinatario no tiene appId guardado)
const DEFAULT_APP_ID  = Deno.env.get("ONESIGNAL_APP_ID")!;
const DEFAULT_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY")!;

// Supabase admin client — para leer profiles.onesignal_app_id del destinatario
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function resolveApiKey(appId: string): string | null {
  return appsConfig[appId] ?? null;
}

const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyPayload {
  /** auth.users.id del destinatario (external_user_id en OneSignal) */
  targetUserId: string;
  title: string;
  body: string;
  /** Ruta de la PWA a abrir al hacer clic en la notificación */
  url?: string;
  /** Datos extra para el manejador de clic */
  data?: Record<string, string>;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { targetUserId, title, body, url = "/", data }: NotifyPayload = await req.json();

    if (!targetUserId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "targetUserId, title y body son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Leer el appId de la app de OneSignal a la que el destinatario está suscrito.
    // Se guarda en profiles.onesignal_app_id al hacer login en el cliente.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("onesignal_app_id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const recipientAppId = profile?.onesignal_app_id ?? null;

    // Usar el appId del destinatario si está disponible; si no, el de producción.
    const resolvedAppId  = recipientAppId ?? DEFAULT_APP_ID;
    const resolvedApiKey = recipientAppId
      ? (resolveApiKey(recipientAppId) ?? DEFAULT_API_KEY)
      : DEFAULT_API_KEY;

    if (!resolvedAppId || !resolvedApiKey) {
      return new Response(
        JSON.stringify({ error: "Configuración de OneSignal incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${resolvedApiKey}`,
      },
      body: JSON.stringify({
        app_id: resolvedAppId,

        // Segmentar por external_user_id (= auth.users.id de Supabase)
        include_external_user_ids: [targetUserId],

        // Contenido de la notificación
        headings: { en: title, es: title },
        contents:  { en: body,  es: body  },

        // URL a abrir al hacer clic (PWA)
        url,

        // Datos custom para el Service Worker / handler de clic
        data: { url, ...data },

        // Iconos
        chrome_web_icon: "/dlizza-192x192.png",
        chrome_web_badge: "/dlizza-64x64.png",
        firefox_icon:     "/dlizza-192x192.png",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[onesignal-notify] Error de OneSignal API:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "OneSignal API error", details: result }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.info("[onesignal-notify] Notificación enviada:", JSON.stringify({
      targetUserId,
      appId: resolvedAppId,
      title,
      notificationId: result.id,
      recipients: result.recipients ?? 0,
      errors: result.errors ?? null,
    }));

    return new Response(
      JSON.stringify({ ok: true, notificationId: result.id, recipients: result.recipients }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[onesignal-notify] Error inesperado:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
