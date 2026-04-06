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

    const token = authHeader.replace("Bearer ", "");
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("user_role, active")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.user_role !== "admin" || !profile.active) {
      return Response.json({ error: "Solo los administradores pueden ejecutar esta función" }, { status: 403 });
    }

    // ── Entrada ─────────────────────────────────────────────────────────────────
    const { billing_period_id, business_id } = await req.json();
    if (!billing_period_id || !business_id) {
      return Response.json({ error: "Se requieren billing_period_id y business_id" }, { status: 400 });
    }

    // ── Datos del periodo ────────────────────────────────────────────────────────
    const { data: period, error: periodError } = await serviceClient
      .from("billing_periods")
      .select("id, period_start, period_end, status")
      .eq("id", billing_period_id)
      .single();

    if (periodError || !period) {
      return Response.json({ error: "Periodo de facturación no encontrado" }, { status: 404 });
    }

    // ── Datos del negocio y su dueño ─────────────────────────────────────────────
    const { data: business, error: bizError } = await serviceClient
      .from("businesses")
      .select("id, name, address, phone, owner_id")
      .eq("id", business_id)
      .single();

    if (bizError || !business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    let owner = null;
    if (business.owner_id) {
      const { data } = await serviceClient
        .from("profiles")
        .select("full_name, phone_number")
        .eq("id", business.owner_id)
        .single();
      owner = data;
    }

    // ── Comisiones del periodo para este negocio ─────────────────────────────────
    const { data: commissions, error: commError } = await serviceClient
      .from("order_commissions")
      .select("id, order_id, fee_amount, order_total, order_completed_at, created_at")
      .eq("billing_period_id", billing_period_id)
      .eq("business_id", business_id)
      .order("order_completed_at", { ascending: true });

    if (commError) {
      return Response.json({ error: "Error al obtener comisiones" }, { status: 500 });
    }

    const totalOrders = commissions?.length ?? 0;
    const totalCommission = commissions?.reduce((sum, c) => sum + Number(c.fee_amount), 0) ?? 0;

    // ── Generar folio único ──────────────────────────────────────────────────────
    const folio = "EDC-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    // ── Generar HTML del estado de cuenta ────────────────────────────────────────
    const issuedAt = new Date().toLocaleDateString("es-MX", {
      year: "numeric", month: "long", day: "numeric",
    });

    const periodStart = new Date(period.period_start).toLocaleDateString("es-MX", {
      year: "numeric", month: "long", day: "numeric",
    });
    const periodEnd = new Date(period.period_end).toLocaleDateString("es-MX", {
      year: "numeric", month: "long", day: "numeric",
    });

    const transactionRows = (commissions ?? []).map((c, i) => {
      const fecha = new Date(c.order_completed_at).toLocaleDateString("es-MX", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${fecha}</td>
          <td style="font-family:monospace;font-size:0.8em">${c.order_id.substring(0, 8).toUpperCase()}</td>
          <td style="text-align:right">$${Number(c.order_total).toFixed(2)}</td>
          <td style="text-align:right">$${Number(c.fee_amount).toFixed(2)}</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Estado de Cuenta — ${business.name} — ${folio}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; padding: 40px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #e63946; padding-bottom: 24px; }
      .brand { font-size: 28px; font-weight: 900; color: #e63946; letter-spacing: -1px; }
      .doc-title { font-size: 20px; font-weight: 700; color: #1a1a1a; }
      .folio { font-size: 13px; color: #666; margin-top: 4px; }
      .issued { font-size: 13px; color: #666; }
      .section { margin-bottom: 24px; }
      .section h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
      .section p { line-height: 1.6; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      thead tr { background: #1a1a1a; color: #fff; }
      thead th { padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
      tbody tr:nth-child(even) { background: #f9f9f9; }
      tbody td { padding: 9px 12px; border-bottom: 1px solid #eee; }
      .summary { background: #fff8f8; border: 2px solid #e63946; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
      .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
      .summary-row.total { font-size: 18px; font-weight: 900; color: #e63946; border-top: 2px solid #e63946; margin-top: 8px; padding-top: 12px; }
      .legal { background: #f5f5f5; border-left: 4px solid #999; padding: 16px; font-size: 12px; color: #555; line-height: 1.6; }
      .legal strong { color: #1a1a1a; }
      @media print {
        @page { size: A4; margin: 20mm 15mm; }
        body { padding: 0; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .header { border-bottom: 3px solid #e63946 !important; }
        thead tr { background: #1a1a1a !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        tbody tr:nth-child(even) { background: #f9f9f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .summary { background: #fff8f8 !important; border: 2px solid #e63946 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .summary-row.total { color: #e63946 !important; }
        .legal { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="brand">Delizza</div>
        <div class="doc-title">Estado de Cuenta</div>
        <div class="folio">Folio: <strong>${folio}</strong></div>
      </div>
      <div style="text-align:right">
        <div class="issued">Fecha de emisión:</div>
        <div style="font-weight:600">${issuedAt}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="section">
        <h3>Establecimiento</h3>
        <p><strong>${business.name}</strong></p>
        ${business.address ? `<p>${business.address}</p>` : ""}
        ${business.phone ? `<p>Tel: ${business.phone}</p>` : ""}
      </div>
      <div class="section">
        <h3>Responsable</h3>
        <p><strong>${owner?.full_name ?? "—"}</strong></p>
        ${owner?.phone_number ? `<p>Tel: ${owner.phone_number}</p>` : ""}
      </div>
    </div>

    <div class="section">
      <h3>Periodo de Facturación</h3>
      <p>${periodStart} — ${periodEnd}</p>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Fecha</th>
          <th>Folio Orden</th>
          <th style="text-align:right">Total Orden</th>
          <th style="text-align:right">Comisión Delizza</th>
        </tr>
      </thead>
      <tbody>
        ${transactionRows || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999">Sin transacciones en este periodo</td></tr>'}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row"><span>Total de transacciones:</span><span><strong>${totalOrders}</strong></span></div>
      <div class="summary-row"><span>Comisión por transacción:</span><span>$${totalOrders > 0 ? Number(commissions![0].fee_amount).toFixed(2) : "10.00"} MXN</span></div>
      <div class="summary-row total"><span>TOTAL A COBRAR:</span><span>$${totalCommission.toFixed(2)} MXN</span></div>
    </div>

    <div class="legal">
      <strong>Aviso Legal —</strong> El presente documento es emitido por Delizza y certifica las comisiones generadas por el uso de la plataforma
      durante el periodo señalado. Cada transacción listada corresponde a una orden con estado <em>completada</em> registrada en el sistema.
      Este documento tiene validez probatoria ante cualquier disputa comercial. La tarifa aplicada fue de
      <strong>$${totalOrders > 0 ? Number(commissions![0].fee_amount).toFixed(2) : "10.00"} MXN por transacción completada</strong>,
      conforme a los términos de servicio vigentes al momento de cada operación.
    </div>
  </body>
  </html>`;

    // ── Subir HTML a Supabase Storage ─────────────────────────────────────────────
    const fileName = `${billing_period_id}/${business_id}/${folio}.html`;
    const { error: uploadError } = await serviceClient.storage
      .from("billing-statements")
      .upload(fileName, new TextEncoder().encode(html), {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadError) {
      return Response.json({ error: `Error al subir documento: ${uploadError.message}` }, { status: 500 });
    }

    // URL firmada válida por 7 días
    const { data: signedUrl } = await serviceClient.storage
      .from("billing-statements")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);

    // ── Guardar billing_statement (SELECT → UPDATE o INSERT) ─────────────────────
    // Evitamos upsert con onConflict porque PostgREST interpreta el nombre del
    // constraint como columna en ciertas versiones, generando el error
    // 'column "unique_statement_per_period_business" does not exist'.
    const now = new Date().toISOString();
    const pdfUrlValue = signedUrl?.signedUrl ?? null;

    const { data: existing } = await serviceClient
      .from("billing_statements")
      .select("id")
      .eq("billing_period_id", billing_period_id)
      .eq("business_id", business_id)
      .maybeSingle();

    let statementId: string;

    if (existing?.id) {
      // ── UPDATE ────────────────────────────────────────────────────────────────
      const { data: updated, error: updateError } = await serviceClient
        .from("billing_statements")
        .update({
          total_orders: totalOrders,
          total_commission: totalCommission,
          status: "issued",
          pdf_url: pdfUrlValue,
          issued_at: now,
          updated_at: now,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (updateError) {
        console.error("Error al actualizar statement:", updateError);
        return Response.json({ error: `Error al actualizar statement: ${updateError.message}` }, { status: 500 });
      }
      statementId = updated.id;
    } else {
      // ── INSERT ────────────────────────────────────────────────────────────────
      const { data: inserted, error: insertError } = await serviceClient
        .from("billing_statements")
        .insert({
          billing_period_id,
          business_id,
          total_orders: totalOrders,
          total_commission: totalCommission,
          status: "issued",
          pdf_url: pdfUrlValue,
          issued_at: now,
          updated_at: now,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error al insertar statement:", insertError);
        return Response.json({ error: `Error al insertar statement: ${insertError.message}` }, { status: 500 });
      }
      statementId = inserted.id;
    }

    console.log("Statement guardado exitosamente:", statementId);

    return Response.json({
      success: true,
      statement_id: statementId,
      folio,
      business_name: business.name,
      total_orders: totalOrders,
      total_commission: totalCommission,
      document_url: pdfUrlValue,
    });

}
