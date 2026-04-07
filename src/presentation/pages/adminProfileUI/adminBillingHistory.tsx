import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@core/supabase/client";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Building2,
  Receipt,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Store,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Download,
  DownloadCloud,
  BadgeCheck,
  Clock,
  FileText,
  CreditCard,
  Package,
  LogOut,
  Calendar,
  X,
  Maximize2,
  Printer,
} from "lucide-react";

// ─── Storage helpers (mismos que adminBillingDashboard) ────────────────────────

function extractStoragePath(signedUrl: string): string | null {
  try {
    const url = new URL(signedUrl);
    const marker = "/billing-statements/";
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

async function downloadStatement(
  signedUrl: string,
  fileName: string,
  onError: (msg: string) => void
): Promise<void> {
  const path = extractStoragePath(signedUrl);
  let downloadUrl = signedUrl;
  if (path) {
    const { data } = await supabase.storage
      .from("billing-statements")
      .createSignedUrl(path, 60);
    if (data?.signedUrl) downloadUrl = data.signedUrl;
  }
  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch (e: unknown) {
    onError((e as Error)?.message ?? "Error al descargar el archivo.");
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BillingPeriod {
  id: string;
  period_start: string;
  period_end: string;
  status: "open" | "closed" | "charged";
  closed_at: string | null;
  created_at: string;
}

interface CommissionRow {
  business_id: string;
  business_name: string;
  total_orders: number;
  total_commission: number;
  statement_status: "draft" | "issued" | "paid" | null;
  statement_id: string | null;
  pdf_url: string | null;
  issued_at: string | null;
}

interface PeriodSummary {
  total_businesses: number;
  total_orders: number;
  total_commission: number;
}

type ToastType = "success" | "error";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getPeriodLabel(period: BillingPeriod) {
  const start = new Date(period.period_start);
  const end = new Date(period.period_end);
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return `${monthNames[start.getMonth()]} ${start.getFullYear()} · ${start.getDate()}–${end.getDate()}`;
}

function StatementBadge({ status }: { status: CommissionRow["statement_status"] }) {
  if (!status) return <span className="text-xs text-gray-400 italic">—</span>;
  switch (status) {
    case "issued":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="w-3 h-3" /> Emitido
        </span>
      );
    case "paid":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <BadgeCheck className="w-3 h-3" /> Pagado
        </span>
      );
    case "draft":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          <FileText className="w-3 h-3" /> Borrador
        </span>
      );
  }
}

// ─── Admin Bottom Navigation ───────────────────────────────────────────────────

function AdminBottomNav() {
  const location = useLocation();
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const navItems = [
    { icon: Building2, label: "Restaurantes", path: "/admin" },
    { icon: Receipt, label: "Comisiones", path: "/admin/billing" },
    { icon: Package, label: "Pedidos", path: "/admin/orders" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-3 flex justify-around items-center z-50 shadow-lg pb-safe">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`flex flex-col items-center gap-1 transition-colors ${
            isActive(item.path)
              ? "text-red-600 dark:text-red-400"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          <item.icon
            className="w-6 h-6"
            strokeWidth={isActive(item.path) ? 2.5 : 2}
          />
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default function AdminBillingHistory() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [periodRows, setPeriodRows] = useState<Record<string, CommissionRow[]>>({});
  const [periodSummaries, setPeriodSummaries] = useState<Record<string, PeriodSummary>>({});
  const [loadingRows, setLoadingRows] = useState<string | null>(null);

  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<{ url: string; title: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [bulkPeriodId, setBulkPeriodId] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const bulkAbortRef = useRef(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/login");
  }, [navigate]);

  // ── Fetch all closed periods ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("billing_periods")
          .select("id, period_start, period_end, status, closed_at, created_at")
          .in("status", ["closed", "charged"])
          .order("closed_at", { ascending: false });

        if (err) throw err;
        setPeriods(data ?? []);
      } catch (e: unknown) {
        setError((e as Error)?.message ?? "Error al cargar el historial.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Fetch commissions + statements for a period ────────────────────────────
  const fetchPeriodRows = useCallback(async (periodId: string) => {
    if (periodRows[periodId]) return; // ya cargado
    setLoadingRows(periodId);
    try {
      const { data: rawComm, error: commErr } = await supabase
        .from("order_commissions")
        .select("business_id, fee_amount")
        .eq("billing_period_id", periodId);

      if (commErr) throw commErr;

      const grouped: Record<string, { total_orders: number; total_commission: number }> = {};
      for (const row of rawComm ?? []) {
        if (!grouped[row.business_id]) {
          grouped[row.business_id] = { total_orders: 0, total_commission: 0 };
        }
        grouped[row.business_id].total_orders += 1;
        grouped[row.business_id].total_commission += Number(row.fee_amount);
      }

      const businessIds = Object.keys(grouped);

      if (businessIds.length === 0) {
        setPeriodRows((prev) => ({ ...prev, [periodId]: [] }));
        setPeriodSummaries((prev) => ({
          ...prev,
          [periodId]: { total_businesses: 0, total_orders: 0, total_commission: 0 },
        }));
        return;
      }

      const [{ data: businesses }, { data: statements }] = await Promise.all([
        supabase.from("businesses").select("id, name").in("id", businessIds),
        supabase
          .from("billing_statements")
          .select("id, business_id, status, pdf_url, issued_at")
          .eq("billing_period_id", periodId)
          .in("business_id", businessIds),
      ]);

      const bizMap: Record<string, string> = {};
      for (const b of businesses ?? []) bizMap[b.id] = b.name;

      type StmtEntry = { id: string; status: CommissionRow["statement_status"]; pdf_url: string | null; issued_at: string | null };
      const stmtMap: Record<string, StmtEntry> = {};
      for (const s of statements ?? []) {
        stmtMap[s.business_id] = {
          id: s.id,
          status: s.status as CommissionRow["statement_status"],
          pdf_url: s.pdf_url,
          issued_at: s.issued_at,
        };
      }

      const rows: CommissionRow[] = businessIds
        .map((bid) => ({
          business_id: bid,
          business_name: bizMap[bid] ?? bid,
          total_orders: grouped[bid].total_orders,
          total_commission: grouped[bid].total_commission,
          statement_status: stmtMap[bid]?.status ?? null,
          statement_id: stmtMap[bid]?.id ?? null,
          pdf_url: stmtMap[bid]?.pdf_url ?? null,
          issued_at: stmtMap[bid]?.issued_at ?? null,
        }))
        .sort((a, b) => b.total_commission - a.total_commission);

      const totalOrders = rows.reduce((s, r) => s + r.total_orders, 0);
      const totalCommission = rows.reduce((s, r) => s + r.total_commission, 0);

      setPeriodRows((prev) => ({ ...prev, [periodId]: rows }));
      setPeriodSummaries((prev) => ({
        ...prev,
        [periodId]: { total_businesses: rows.length, total_orders: totalOrders, total_commission: totalCommission },
      }));
    } catch (e: unknown) {
      showToast((e as Error)?.message ?? "Error al cargar el periodo.", "error");
    } finally {
      setLoadingRows(null);
    }
  }, [periodRows, showToast]);

  // ── Toggle expand ──────────────────────────────────────────────────────────
  const handleToggle = useCallback((periodId: string) => {
    setExpandedId((prev) => {
      if (prev === periodId) return null;
      fetchPeriodRows(periodId);
      return periodId;
    });
  }, [fetchPeriodRows]);

  // ── Regenerar documento ────────────────────────────────────────────────────
  const handleRegenerate = useCallback(
    async (row: CommissionRow, periodId: string) => {
      setRegeneratingId(row.business_id);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sin sesión activa.");

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/generate-billing-statement`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ billing_period_id: periodId, business_id: row.business_id }),
          }
        );

        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Error al regenerar.");

        const newPdfUrl: string | null = result.document_url ?? null;

        setPeriodRows((prev) => ({
          ...prev,
          [periodId]: (prev[periodId] ?? []).map((r) =>
            r.business_id === row.business_id
              ? {
                  ...r,
                  pdf_url: newPdfUrl ?? r.pdf_url,
                  statement_id: result.statement_id ?? r.statement_id,
                  statement_status: r.statement_status ?? "issued",
                }
              : r
          ),
        }));

        // Abrir el preview modal automáticamente después de generar
        if (newPdfUrl) {
          const path = extractStoragePath(newPdfUrl);
          let previewUrl = newPdfUrl;
          if (path) {
            const { data } = await supabase.storage
              .from("billing-statements")
              .createSignedUrl(path, 300);
            if (data?.signedUrl) previewUrl = data.signedUrl;
          }
          setPreviewModal({ url: previewUrl, title: row.business_name });
        } else {
          showToast(`Documento generado: ${row.business_name}`, "success");
        }
      } catch (e: unknown) {
        showToast((e as Error)?.message ?? "Error al generar.", "error");
      } finally {
        setRegeneratingId(null);
      }
    },
    [showToast]
  );

  // ── Regenerar todos los faltantes de un periodo ────────────────────────────
  const handleRegenerateAll = useCallback(
    async (periodId: string) => {
      const rows = periodRows[periodId] ?? [];
      const missing = rows.filter((r) => !r.pdf_url && r.statement_id);
      if (missing.length === 0) {
        showToast("No hay documentos faltantes en este periodo.", "error");
        return;
      }

      bulkAbortRef.current = false;
      setBulkPeriodId(periodId);
      setBulkProgress({ current: 0, total: missing.length, label: "" });

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sin sesión activa.");
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

        for (let i = 0; i < missing.length; i++) {
          if (bulkAbortRef.current) break;
          const row = missing[i];
          setBulkProgress({ current: i + 1, total: missing.length, label: row.business_name });

          try {
            const res = await fetch(
              `${supabaseUrl}/functions/v1/generate-billing-statement`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ billing_period_id: periodId, business_id: row.business_id }),
              }
            );
            const result = await res.json();
            if (res.ok) {
              setPeriodRows((prev) => ({
                ...prev,
                [periodId]: (prev[periodId] ?? []).map((r) =>
                  r.business_id === row.business_id
                    ? { ...r, pdf_url: result.document_url ?? r.pdf_url, statement_id: result.statement_id ?? r.statement_id, statement_status: r.statement_status ?? "issued" }
                    : r
                ),
              }));
            }
          } catch {
            // continúa con el siguiente
          }
        }

        if (!bulkAbortRef.current) {
          showToast(`${missing.length} documento${missing.length > 1 ? "s" : ""} regenerado${missing.length > 1 ? "s" : ""}.`, "success");
        }
      } catch (e: unknown) {
        showToast((e as Error)?.message ?? "Error al regenerar.", "error");
      } finally {
        setBulkPeriodId(null);
        setBulkProgress(null);
      }
    },
    [periodRows, showToast]
  );

  // ── Ver documento (modal con iframe) ──────────────────────────────────────
  const handleViewOne = useCallback(
    async (row: CommissionRow) => {
      if (!row.pdf_url) return;
      setViewingId(row.business_id);
      try {
        const path = extractStoragePath(row.pdf_url);
        let url = row.pdf_url;
        if (path) {
          const { data } = await supabase.storage
            .from("billing-statements")
            .createSignedUrl(path, 300);
          if (data?.signedUrl) url = data.signedUrl;
        }
        setPreviewModal({ url, title: row.business_name });
      } catch {
        showToast("Error al abrir el documento.", "error");
      } finally {
        setViewingId(null);
      }
    },
    [showToast]
  );

  // ── Descarga individual ────────────────────────────────────────────────────
  const handleDownloadOne = useCallback(
    async (row: CommissionRow) => {
      if (!row.pdf_url) return;
      setDownloadingId(row.business_id);
      const safeName = row.business_name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      await downloadStatement(row.pdf_url, `estado_cuenta_${safeName}.html`, (msg) =>
        showToast(msg, "error")
      );
      setDownloadingId(null);
    },
    [showToast]
  );

  // ── Descarga masiva de un periodo ──────────────────────────────────────────
  const handleDownloadAll = useCallback(
    async (periodId: string) => {
      const withDocs = (periodRows[periodId] ?? []).filter((r) => r.pdf_url);
      if (withDocs.length === 0) {
        showToast("No hay documentos disponibles en este periodo.", "error");
        return;
      }

      bulkAbortRef.current = false;
      setBulkPeriodId(periodId);
      setBulkProgress({ current: 0, total: withDocs.length, label: "" });

      for (let i = 0; i < withDocs.length; i++) {
        if (bulkAbortRef.current) break;
        const row = withDocs[i];
        setBulkProgress({ current: i + 1, total: withDocs.length, label: row.business_name });
        const safeName = row.business_name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        await downloadStatement(row.pdf_url!, `estado_cuenta_${safeName}.html`, (msg) =>
          showToast(`${row.business_name}: ${msg}`, "error")
        );
        await new Promise((r) => setTimeout(r, 400));
      }

      setBulkPeriodId(null);
      setBulkProgress(null);
      if (!bulkAbortRef.current) {
        showToast(`${withDocs.length} documento${withDocs.length > 1 ? "s" : ""} descargado${withDocs.length > 1 ? "s" : ""}.`, "success");
      }
    },
    [periodRows, showToast]
  );

  // ── Mark as paid ───────────────────────────────────────────────────────────
  const handleMarkPaid = useCallback(
    async (statementId: string, businessId: string, periodId: string) => {
      try {
        const { error: err } = await supabase
          .from("billing_statements")
          .update({ status: "paid", updated_at: new Date().toISOString() })
          .eq("id", statementId);
        if (err) throw err;

        setPeriodRows((prev) => ({
          ...prev,
          [periodId]: (prev[periodId] ?? []).map((r) =>
            r.business_id === businessId ? { ...r, statement_status: "paid" } : r
          ),
        }));
        showToast("Estado de cuenta marcado como pagado.", "success");
      } catch (e: unknown) {
        showToast((e as Error)?.message ?? "Error al actualizar.", "error");
      }
    },
    [showToast]
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Toast ───────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
          style={{ animation: "slideInRight 0.3s ease-out" }}
        >
          {toast.type === "success" ? (
            <BadgeCheck className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* ── Bulk progress banner ─────────────────────────────────────────── */}
      {bulkProgress && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm mx-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl shadow-2xl px-5 py-4"
          style={{ animation: "scaleIn 0.2s ease-out" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-semibold">Procesando…</span>
            </div>
            <button
              onClick={() => { bulkAbortRef.current = true; }}
              className="text-xs opacity-60 hover:opacity-100 transition-opacity"
            >
              Cancelar
            </button>
          </div>
          <div className="w-full bg-white/20 dark:bg-black/20 rounded-full h-1.5 mb-2">
            <div
              className="bg-white dark:bg-gray-900 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
            />
          </div>
          <p className="text-xs opacity-70 truncate">
            {bulkProgress.current}/{bulkProgress.total} — {bulkProgress.label}
          </p>
        </div>
      )}

      {/* ── Document Preview Modal ───────────────────────────────────────── */}
      {previewModal && (
        <div className="fixed inset-0 z-[70] flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setPreviewModal(null)}
          />
          {/* Panel */}
          <div
            className="relative flex flex-col w-full h-full max-w-5xl mx-auto my-4 sm:my-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            style={{ animation: "scaleIn 0.2s ease-out" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    Estado de cuenta
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {previewModal.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => iframeRef.current?.contentWindow?.print()}
                  title="Guardar como PDF / Imprimir"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Guardar PDF
                </button>
                <a
                  href={previewModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir en nueva pestaña"
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewModal(null)}
                  title="Cerrar"
                  className="p-2 rounded-lg text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* iframe */}
            <iframe
              ref={iframeRef}
              src={previewModal.url}
              className="flex-1 w-full border-0"
              title={`Estado de cuenta — ${previewModal.title}`}
            />
          </div>
        </div>
      )}

      {/* ── Page Shell ───────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-28">

        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-10 pb-4 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center justify-between max-w-2xl sm:max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <Link
                to="/admin/billing"
                className="p-2 -ml-1 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="font-extrabold text-lg text-gray-900 dark:text-white tracking-tight leading-none">
                  Historial de quincenas
                </h1>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  PERIODOS CERRADOS · {periods.length} periodo{periods.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="p-2 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </header>

        <div className="max-w-2xl sm:max-w-5xl mx-auto px-4 py-5 flex flex-col gap-4">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-lg w-1/3" />
                      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-lg w-1/2" />
                    </div>
                    <div className="h-6 w-20 bg-gray-100 dark:bg-gray-700 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && periods.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-5 py-14 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Sin periodos cerrados
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
                Aquí aparecerán las quincenas una vez que se cierren desde el panel de comisiones.
              </p>
              <Link
                to="/admin/billing"
                className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
              >
                Ir a Comisiones →
              </Link>
            </div>
          )}

          {/* Period cards */}
          {!loading && periods.map((period) => {
            const isExpanded = expandedId === period.id;
            const rows = periodRows[period.id];
            const summary = periodSummaries[period.id];
            const isLoadingRows = loadingRows === period.id;
            const isBulkActive = bulkPeriodId === period.id;
            const missingDocs = (rows ?? []).filter((r) => !r.pdf_url && r.statement_id).length;
            const availableDocs = (rows ?? []).filter((r) => r.pdf_url).length;

            return (
              <div
                key={period.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* Period header row */}
                <button
                  onClick={() => handleToggle(period.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-colors text-left"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-[18px] h-[18px] text-amber-600 dark:text-amber-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                      {getPeriodLabel(period)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {period.closed_at
                        ? `Cerrado el ${formatDate(period.closed_at)}`
                        : formatDate(period.period_start) + " → " + formatDate(period.period_end)}
                    </p>
                    {/* Mini stats si ya se cargaron */}
                    {summary && (
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                          <Store className="w-3 h-3" /> {summary.total_businesses} restaurante{summary.total_businesses !== 1 ? "s" : ""}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                          <TrendingUp className="w-3 h-3" /> {summary.total_orders} órdenes
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                          <DollarSign className="w-3 h-3" /> {formatCurrency(summary.total_commission)}
                        </span>
                        {missingDocs > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3" /> {missingDocs} doc{missingDocs !== 1 ? "s" : ""} faltante{missingDocs !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status badge + chevron */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      Cerrada
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700">

                    {/* Loading rows */}
                    {isLoadingRows && (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500 dark:text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando datos del periodo…
                      </div>
                    )}

                    {/* Empty period */}
                    {!isLoadingRows && rows?.length === 0 && (
                      <div className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        Este periodo no tiene comisiones registradas.
                      </div>
                    )}

                    {/* Rows */}
                    {!isLoadingRows && rows && rows.length > 0 && (
                      <>
                        {/* Action bar */}
                        <div className="flex items-center justify-between gap-2 px-5 py-3 bg-gray-50 dark:bg-gray-900/40 flex-wrap">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{rows.length}</span>{" "}
                            restaurante{rows.length !== 1 ? "s" : ""} ·{" "}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{availableDocs}</span>{" "}
                            con documento
                          </p>
                          <div className="flex items-center gap-2">
                            {missingDocs > 0 && (
                              <button
                                onClick={() => handleRegenerateAll(period.id)}
                                disabled={isBulkActive || regeneratingId !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isBulkActive && bulkProgress ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                Regenerar {missingDocs} faltante{missingDocs !== 1 ? "s" : ""}
                              </button>
                            )}
                            {availableDocs > 0 && (
                              <button
                                onClick={() => handleDownloadAll(period.id)}
                                disabled={isBulkActive || downloadingId !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold hover:bg-gray-700 dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isBulkActive && bulkProgress ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <DownloadCloud className="w-3.5 h-3.5" />
                                )}
                                Descargar todos ({availableDocs})
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Desktop table header */}
                        <div className="hidden sm:flex items-center px-5 py-2.5 border-b border-gray-100 dark:border-gray-700 gap-4">
                          <div className="flex-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            Restaurante
                          </div>
                          <div className="w-20 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">
                            Órdenes
                          </div>
                          <div className="w-28 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">
                            Comisión
                          </div>
                          <div className="w-24 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">
                            Estado
                          </div>
                          <div className="w-32 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">
                            Documento
                          </div>
                          <div className="w-20 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">
                            Cobro
                          </div>
                        </div>

                        {/* Business rows */}
                        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                          {rows.map((row) => (
                            <div key={row.business_id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/10 transition-colors">

                              {/* Mobile */}
                              <div className="sm:hidden flex items-start gap-3 px-4 py-4">
                                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Store className="w-[18px] h-[18px] text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {row.business_name}
                                  </p>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {row.total_orders} orden{row.total_orders !== 1 ? "es" : ""}
                                    </span>
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">
                                      {formatCurrency(row.total_commission)}
                                    </span>
                                  </div>
                                  {row.statement_status && (
                                    <div className="mt-2">
                                      <StatementBadge status={row.statement_status} />
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                    {row.pdf_url ? (
                                      <>
                                        <button
                                          onClick={() => handleViewOne(row)}
                                          disabled={viewingId === row.business_id}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {viewingId === row.business_id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <FileText className="w-3 h-3" />
                                          )}
                                          Ver documento
                                        </button>
                                        <button
                                          onClick={() => handleDownloadOne(row)}
                                          disabled={downloadingId === row.business_id || isBulkActive}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {downloadingId === row.business_id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Download className="w-3 h-3" />
                                          )}
                                          Descargar
                                        </button>
                                      </>
                                    ) : row.statement_id ? (
                                      <button
                                        onClick={() => handleRegenerate(row, period.id)}
                                        disabled={regeneratingId === row.business_id || isBulkActive}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {regeneratingId === row.business_id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <FileText className="w-3 h-3" />
                                        )}
                                        Generar y ver
                                      </button>
                                    ) : null}
                                    {row.statement_id && row.statement_status === "issued" && (
                                      <button
                                        onClick={() => handleMarkPaid(row.statement_id!, row.business_id, period.id)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                                      >
                                        <CreditCard className="w-3 h-3" /> Marcar pagado
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Desktop */}
                              <div className="hidden sm:flex items-center px-5 py-3.5 gap-4">
                                <div className="flex-1 flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                    <Store className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {row.business_name}
                                  </span>
                                </div>
                                <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 text-right tabular-nums">
                                  {row.total_orders}
                                </div>
                                <div className="w-28 text-sm font-bold text-red-600 dark:text-red-400 text-right tabular-nums">
                                  {formatCurrency(row.total_commission)}
                                </div>
                                <div className="w-24 flex justify-center">
                                  <StatementBadge status={row.statement_status} />
                                </div>
                                {/* Documento */}
                                <div className="w-32 flex items-center gap-1.5 justify-center">
                                  {row.pdf_url ? (
                                    <>
                                      <button
                                        onClick={() => handleViewOne(row)}
                                        disabled={viewingId === row.business_id}
                                        title="Ver documento"
                                        className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {viewingId === row.business_id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <FileText className="w-4 h-4" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => handleDownloadOne(row)}
                                        disabled={downloadingId === row.business_id || isBulkActive}
                                        title="Descargar"
                                        className="p-2 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {downloadingId === row.business_id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Download className="w-4 h-4" />
                                        )}
                                      </button>
                                    </>
                                  ) : row.statement_id ? (
                                    <button
                                      onClick={() => handleRegenerate(row, period.id)}
                                      disabled={regeneratingId === row.business_id || isBulkActive}
                                      title="Generar y ver documento"
                                      className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {regeneratingId === row.business_id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <FileText className="w-4 h-4" />
                                      )}
                                    </button>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">—</span>
                                  )}
                                </div>
                                {/* Cobro */}
                                <div className="w-20 flex justify-center">
                                  {row.statement_id && row.statement_status === "issued" ? (
                                    <button
                                      onClick={() => handleMarkPaid(row.statement_id!, row.business_id, period.id)}
                                      title="Marcar como pagado"
                                      className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 transition-colors"
                                    >
                                      <CreditCard className="w-4 h-4" />
                                    </button>
                                  ) : row.statement_status === "paid" ? (
                                    <span title="Pagado"><BadgeCheck className="w-4 h-4 text-emerald-500" /></span>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">—</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer totals */}
                        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{summary?.total_orders ?? "—"}</span> órdenes completadas
                          </p>
                          <p className="text-sm font-bold text-red-600 dark:text-red-400">
                            {summary ? formatCurrency(summary.total_commission) : "—"} total
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AdminBottomNav />

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.92); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
