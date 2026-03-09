import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const res = await handleRequest(req);
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.headers.set(key, value);
    }
    return res;
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500, headers: corsHeaders });
  }
});

async function handleRequest(req: Request) {
    // ── Autenticación: solo admins ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("user_role, active")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.user_role !== "admin" || !profile.active) {
      return Response.json({ error: "Solo los administradores pueden ejecutar esta función" }, { status: 403 });
    }

    // ── Entrada ─────────────────────────────────────────────────────────────────
    const { billing_period_id } = await req.json();
    if (!billing_period_id) {
      return Response.json({ error: "Se requiere billing_period_id" }, { status: 400 });
    }

    // ── Verificar que el periodo existe y está abierto ───────────────────────────
    const { data: period, error: periodError } = await serviceClient
      .from("billing_periods")
      .select("id, status, period_start, period_end")
      .eq("id", billing_period_id)
      .single();

    if (periodError || !period) {
      return Response.json({ error: "Periodo de facturación no encontrado" }, { status: 404 });
    }

    if (period.status !== "open") {
      return Response.json(
        { error: `El periodo ya se encuentra en estado '${period.status}'. Solo se pueden cerrar periodos 'open'.` },
        { status: 400 }
      );
    }

    // ── Obtener los negocios distintos con comisiones en el periodo ───────────────
    const { data: commissions, error: commError } = await serviceClient
      .from("order_commissions")
      .select("business_id")
      .eq("billing_period_id", billing_period_id);

    if (commError) {
      return Response.json({ error: "Error al obtener comisiones del periodo" }, { status: 500 });
    }

    const businessIds = [...new Set((commissions ?? []).map((c) => c.business_id))];

    if (businessIds.length === 0) {
      // Cerrar el periodo aunque no haya comisiones
      await serviceClient
        .from("billing_periods")
        .update({ status: "closed", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", billing_period_id);

      return Response.json({
        success: true,
        period_closed: true,
        summary: {
          total_businesses: 0,
          statements_generated: 0,
          grand_total_orders: 0,
          grand_total_commission: 0,
        },
        statements: [],
      });
    }

    // ── Cerrar el periodo antes de generar documentos ────────────────────────────
    const { error: closeError } = await serviceClient
      .from("billing_periods")
      .update({ status: "closed", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", billing_period_id);

    if (closeError) {
      return Response.json({ error: `Error al cerrar el periodo: ${closeError.message}` }, { status: 500 });
    }

    // ── Generar estado de cuenta por cada negocio ────────────────────────────────
    const functionUrl = `${SUPABASE_URL}/functions/v1/generate-billing-statement`;

    const statementResults = [];
    const chunkSize = 5;
    for (let i = 0; i < businessIds.length; i += chunkSize) {
      const chunk = businessIds.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(async (businessId) => {
          try {
            const res = await fetch(functionUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
              },
              body: JSON.stringify({ billing_period_id, business_id: businessId }),
            });

            const result = await res.json();

            if (!res.ok) {
              return {
                business_id: businessId,
                business_name: result.business_name ?? businessId,
                status: "error",
                error: result.error ?? "Error desconocido",
              };
            }

            return {
              business_id: businessId,
              business_name: result.business_name,
              total_orders: result.total_orders,
              total_commission: result.total_commission,
              document_url: result.document_url,
              folio: result.folio,
              status: "success",
            };
          } catch (err) {
            return {
              business_id: businessId,
              status: "error",
              error: String(err),
            };
          }
        })
      );
      statementResults.push(...chunkResults);
    }

    // ── Calcular resumen ─────────────────────────────────────────────────────────
    const successful = statementResults.filter((s) => s.status === "success");
    const grandTotalOrders = successful.reduce((sum, s) => sum + (s.total_orders ?? 0), 0);
    const grandTotalCommission = successful.reduce((sum, s) => sum + (s.total_commission ?? 0), 0);

    return Response.json({
      success: true,
      period_closed: true,
      summary: {
        total_businesses: businessIds.length,
        statements_generated: successful.length,
        grand_total_orders: grandTotalOrders,
        grand_total_commission: grandTotalCommission,
      },
      statements: statementResults,
    });

}
