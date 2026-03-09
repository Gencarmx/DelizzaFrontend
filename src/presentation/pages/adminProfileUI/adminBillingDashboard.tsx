import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@core/supabase/client";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Building2,
  Store,
  LayoutDashboard,
  Receipt,
  Loader2,
  AlertTriangle,
  RefreshCw,
  LockOpen,
  Lock,
  FileText,
  CheckCircle2,
  XCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  ExternalLink,
  BadgeCheck,
  Clock,
  CreditCard,
  ChevronRight,
  Download,
  DownloadCloud,
  LogOut,
} from "lucide-react";

// ─── Storage helpers ───────────────────────────────────────────────────────────

/**
 * Extrae el path relativo dentro del bucket desde una Supabase signed URL.
 * Formato esperado: .../object/sign/billing-statements/{path}?token=...
 */
function extractStoragePath(signedUrl: string): string | null {
  try {
    const url = new URL(signedUrl);
    // pathname: /storage/v1/object/sign/billing-statements/period/business/folio.html
    const marker = "/billing-statements/";
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

/**
 * Genera una signed URL fresca (60 s) para el path dado y descarga el archivo.
 * Usa fetch + blob para forzar Content-Disposition:attachment aunque el servidor
 * no lo indique.
 */
async function downloadStatement(
  signedUrl: string,
  fileName: string,
  onError: (msg: string) => void
): Promise<void> {
  // 1. Intentar regenerar la URL desde el storage path para evitar URLs vencidas
  const path = extractStoragePath(signedUrl);
  let downloadUrl = signedUrl;

  if (path) {
    const { data } = await supabase.storage
      .from("billing-statements")
      .createSignedUrl(path, 60); // 60 segundos — suficiente para descargar
    if (data?.signedUrl) downloadUrl = data.signedUrl;
  }

  // 2. Fetch + blob + click programático
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

type ToastType = "success" | "error";
interface ToastState {
  message: string;
  type: ToastType;
}

type ConfirmActionType = "open" | "close";
interface ConfirmAction {
  type: ConfirmActionType;
}

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

function getStatusPillClasses(status: BillingPeriod["status"]) {
  switch (status) {
    case "open":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "closed":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "charged":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }
}

function StatementBadge({ status }: { status: CommissionRow["statement_status"] }) {
  if (!status) return <span className="text-xs text-gray-400 italic">—</span>;
  switch (status) {
    case "issued":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="w-3 h-3" /> Emitido
        </span>
      );
    case "paid":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <BadgeCheck className="w-3 h-3" /> Pagado
        </span>
      );
    case "draft":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          <FileText className="w-3 h-3" /> Borrador
        </span>
      );
  }
}

// ─── Admin Bottom Navigation ───────────────────────────────────────────────────

function AdminBottomNav() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: Building2, label: "Restaurantes", path: "/admin" },
    { icon: Receipt, label: "Comisiones", path: "/admin/billing" },
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

// ─── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accentBg: string;
  accentText: string;
}

function StatCard({ icon: Icon, label, value, accentBg, accentText }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentBg}`}
      >
        <Icon className={`w-[18px] h-[18px] ${accentText}`} />
      </div>
      <div>
        <div className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
          {value}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default function AdminBillingDashboard() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [activePeriod, setActivePeriod] = useState<BillingPeriod | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loadingPeriod, setLoadingPeriod] = useState(true);
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // Descarga individual: businessId → true mientras descarga
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  // Descarga masiva
  const [bulkDownload, setBulkDownload] = useState<{
    active: boolean;
    current: number;
    total: number;
    label: string;
  } | null>(null);
  const bulkAbortRef = useRef(false);

  const navigate = useNavigate();

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/login");
  }, [navigate]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Fetch open billing period ──────────────────────────────────────────────
  const fetchActivePeriod = useCallback(async () => {
    setLoadingPeriod(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("billing_periods")
        .select("id, period_start, period_end, status, closed_at, created_at")
        .eq("status", "open")
        .maybeSingle();

      if (err) throw err;
      setActivePeriod(data ?? null);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Error al cargar el periodo activo.");
    } finally {
      setLoadingPeriod(false);
    }
  }, []);

  // ── Fetch commissions for the active period ────────────────────────────────
  const fetchCommissions = useCallback(
    async (periodId: string) => {
      setLoadingCommissions(true);
      try {
        // 1. Raw commissions grouped by business
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
          setCommissions([]);
          return;
        }

        // 2. Business names
        const { data: businesses, error: bizErr } = await supabase
          .from("businesses")
          .select("id, name")
          .in("id", businessIds);

        if (bizErr) throw bizErr;

        const bizMap: Record<string, string> = {};
        for (const b of businesses ?? []) bizMap[b.id] = b.name;

        // 3. Billing statements for this period
        const { data: statements, error: stmtErr } = await supabase
          .from("billing_statements")
          .select("id, business_id, status, pdf_url, issued_at")
          .eq("billing_period_id", periodId)
          .in("business_id", businessIds);

        if (stmtErr) throw stmtErr;

        type StmtEntry = {
          id: string;
          status: CommissionRow["statement_status"];
          pdf_url: string | null;
          issued_at: string | null;
        };
        const stmtMap: Record<string, StmtEntry> = {};
        for (const s of statements ?? []) {
          stmtMap[s.business_id] = {
            id: s.id,
            status: s.status as CommissionRow["statement_status"],
            pdf_url: s.pdf_url,
            issued_at: s.issued_at,
          };
        }

        // 4. Build rows sorted by commission desc
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

        setCommissions(rows);
      } catch (e: unknown) {
        showToast(
          (e as Error)?.message ?? "Error al cargar las comisiones.",
          "error"
        );
      } finally {
        setLoadingCommissions(false);
      }
    },
    [showToast]
  );

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchActivePeriod();
  }, [fetchActivePeriod]);

  useEffect(() => {
    if (activePeriod?.id) {
      fetchCommissions(activePeriod.id);
    } else {
      setCommissions([]);
    }
  }, [activePeriod, fetchCommissions]);

  // ── Open billing period ────────────────────────────────────────────────────
  const openPeriod = async () => {
    setActionLoading(true);
    setConfirmAction(null);
    try {
      const now = new Date();
      const day = now.getDate();
      let periodStart: Date;
      let periodEnd: Date;

      if (day <= 15) {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        periodEnd = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59);
      } else {
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        periodStart = new Date(now.getFullYear(), now.getMonth(), 16, 0, 0, 0);
        periodEnd = new Date(now.getFullYear(), now.getMonth(), lastDay, 23, 59, 59);
      }

      const { data, error: err } = await supabase
        .from("billing_periods")
        .insert({
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          status: "open",
        })
        .select("id, period_start, period_end, status, closed_at, created_at")
        .single();

      if (err) throw err;
      setActivePeriod(data);
      showToast("Quincena abierta correctamente.", "success");
    } catch (e: unknown) {
      showToast(
        (e as Error)?.message ?? "Error al abrir la quincena.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ── Close billing period via Edge Function ─────────────────────────────────
  const closePeriod = async () => {
    if (!activePeriod) return;
    setActionLoading(true);
    setConfirmAction(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión activa.");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/close-billing-period`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ billing_period_id: activePeriod.id }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Error al cerrar la quincena.");

      const generated = result.summary?.statements_generated ?? 0;
      showToast(
        `Quincena cerrada. ${generated} estado${generated !== 1 ? "s" : ""} de cuenta generado${generated !== 1 ? "s" : ""}.`,
        "success"
      );
      await fetchActivePeriod();
    } catch (e: unknown) {
      showToast(
        (e as Error)?.message ?? "Error al cerrar la quincena.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ── Mark statement as paid ─────────────────────────────────────────────────
  const markAsPaid = async (statementId: string, businessId: string) => {
    try {
      const { error: err } = await supabase
        .from("billing_statements")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("id", statementId);

      if (err) throw err;

      setCommissions((prev) =>
        prev.map((c) =>
          c.business_id === businessId ? { ...c, statement_status: "paid" } : c
        )
      );
      showToast("Estado de cuenta marcado como pagado.", "success");
    } catch (e: unknown) {
      showToast(
        (e as Error)?.message ?? "Error al actualizar el estado.",
        "error"
      );
    }
  };

  // ── Descarga individual ────────────────────────────────────────────────────
  const handleDownloadOne = useCallback(
    async (row: CommissionRow) => {
      if (!row.pdf_url) return;
      setDownloadingId(row.business_id);
      const safeName = row.business_name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const fileName = `estado_cuenta_${safeName}.html`;
      await downloadStatement(row.pdf_url, fileName, (msg) =>
        showToast(msg, "error")
      );
      setDownloadingId(null);
    },
    [showToast]
  );

  // ── Descarga masiva (todos los archivos disponibles) ───────────────────────
  const handleDownloadAll = useCallback(async () => {
    const withDocs = commissions.filter((c) => c.pdf_url);
    if (withDocs.length === 0) {
      showToast("No hay documentos disponibles para descargar.", "error");
      return;
    }

    bulkAbortRef.current = false;
    setBulkDownload({ active: true, current: 0, total: withDocs.length, label: "" });

    for (let i = 0; i < withDocs.length; i++) {
      if (bulkAbortRef.current) break;
      const row = withDocs[i];
      setBulkDownload({
        active: true,
        current: i + 1,
        total: withDocs.length,
        label: row.business_name,
      });
      const safeName = row.business_name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const fileName = `estado_cuenta_${safeName}.html`;
      await downloadStatement(row.pdf_url!, fileName, (msg) =>
        showToast(`${row.business_name}: ${msg}`, "error")
      );
      // Pequeña pausa para que el navegador procese cada descarga
      await new Promise((r) => setTimeout(r, 400));
    }

    setBulkDownload(null);
    if (!bulkAbortRef.current) {
      showToast(
        `${withDocs.length} documento${withDocs.length > 1 ? "s" : ""} descargado${withDocs.length > 1 ? "s" : ""}.`,
        "success"
      );
    }
  }, [commissions, showToast]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalOrders = commissions.reduce((s, c) => s + c.total_orders, 0);
  const totalCommission = commissions.reduce((s, c) => s + c.total_commission, 0);
  const pendingCount = commissions.filter((c) => c.statement_status === "issued").length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
          style={{ animation: "slideInRight 0.3s ease-out" }}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* ── Bulk download progress banner ─────────────────────────────────── */}
      {bulkDownload && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm mx-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl shadow-2xl px-5 py-4"
          style={{ animation: "scaleIn 0.2s ease-out" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 animate-bounce" />
              <span className="text-sm font-semibold">Descargando archivos…</span>
            </div>
            <button
              onClick={() => { bulkAbortRef.current = true; setBulkDownload(null); }}
              className="text-xs opacity-60 hover:opacity-100 transition-opacity"
            >
              Cancelar
            </button>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-white/20 dark:bg-black/20 rounded-full h-1.5 mb-2">
            <div
              className="bg-white dark:bg-gray-900 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(bulkDownload.current / bulkDownload.total) * 100}%` }}
            />
          </div>
          <p className="text-xs opacity-70 truncate">
            {bulkDownload.current}/{bulkDownload.total} — {bulkDownload.label}
          </p>
        </div>
      )}

      {/* ── Confirm Modal ─────────────────────────────────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmAction(null)}
          />
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700"
            style={{ animation: "scaleIn 0.2s ease-out" }}
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                confirmAction.type === "close"
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-emerald-100 dark:bg-emerald-900/30"
              }`}
            >
              {confirmAction.type === "close" ? (
                <Lock className="w-7 h-7 text-red-600 dark:text-red-400" />
              ) : (
                <LockOpen className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">
              {confirmAction.type === "close"
                ? "¿Cerrar la quincena?"
                : "¿Abrir una nueva quincena?"}
            </h3>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
              {confirmAction.type === "close"
                ? "Se generarán los estados de cuenta para todos los restaurantes con comisiones registradas. Esta acción no se puede deshacer."
                : "Se creará un nuevo periodo quincenal basado en la fecha actual. Las comisiones se capturarán automáticamente al completar órdenes."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAction.type === "close" ? closePeriod : openPeriod}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  confirmAction.type === "close"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </span>
                ) : confirmAction.type === "close" ? (
                  "Cerrar quincena"
                ) : (
                  "Abrir quincena"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Shell ────────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-28">

        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-10 pb-4 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xl select-none">
                D
              </div>
              <div>
                <span className="font-extrabold text-lg text-gray-900 dark:text-white tracking-tight leading-none">
                  LIZZA
                </span>
                <span className="text-[10px] text-gray-400 block leading-none mt-0.5">
                  SUPER ADMIN · COMISIONES
                </span>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchActivePeriod}
                disabled={loadingPeriod || actionLoading}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
                title="Actualizar"
              >
                <RefreshCw
                  className={`w-[18px] h-[18px] ${loadingPeriod ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={handleSignOut}
                title="Cerrar sesión"
                className="p-2 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors"
              >
                <LogOut className="w-[18px] h-[18px]" />
              </button>

              {!loadingPeriod && (
                <button
                  onClick={() =>
                    setConfirmAction({ type: activePeriod ? "close" : "open" })
                  }
                  disabled={actionLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${
                    activePeriod
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-red-200 dark:shadow-red-900/30"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-emerald-900/30"
                  }`}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : activePeriod ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <LockOpen className="w-4 h-4" />
                  )}
                  <span className="hidden xs:inline">
                    {activePeriod ? "Cerrar quincena" : "Abrir quincena"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-5 flex flex-col gap-5">

          {/* ── Period Status Card ──────────────────────────────────────── */}
          <div
            className={`rounded-2xl border p-4 transition-colors ${
              activePeriod
                ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    activePeriod
                      ? "bg-emerald-100 dark:bg-emerald-900/30"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <Calendar
                    className={`w-5 h-5 ${
                      activePeriod
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  />
                </div>
                <div>
                  {loadingPeriod ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Verificando periodo...
                      </span>
                    </div>
                  ) : activePeriod ? (
                    <>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 leading-tight">
                        Quincena activa
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5 font-medium">
                        {getPeriodLabel(activePeriod)}
                      </p>
                      <p className="text-[11px] text-emerald-500/80 dark:text-emerald-600 mt-0.5">
                        {formatDate(activePeriod.period_start)} →{" "}
                        {formatDate(activePeriod.period_end)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 leading-tight">
                        Sin quincena abierta
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Abre una quincena para comenzar a registrar comisiones.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {activePeriod && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${getStatusPillClasses(
                    activePeriod.status
                  )}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                  {activePeriod.status === "open"
                    ? "Abierta"
                    : activePeriod.status === "closed"
                    ? "Cerrada"
                    : "Cobrada"}
                </span>
              )}
            </div>
          </div>

          {/* ── Error ──────────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Error al cargar datos
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* ── Summary Stats ──────────────────────────────────────────── */}
          {activePeriod && !loadingCommissions && commissions.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={Store}
                label="Restaurantes"
                value={commissions.length}
                accentBg="bg-blue-100 dark:bg-blue-900/30"
                accentText="text-blue-600 dark:text-blue-400"
              />
              <StatCard
                icon={TrendingUp}
                label="Órdenes totales"
                value={totalOrders}
                accentBg="bg-amber-100 dark:bg-amber-900/30"
                accentText="text-amber-600 dark:text-amber-400"
              />
              <StatCard
                icon={DollarSign}
                label="Comisión total"
                value={formatCurrency(totalCommission)}
                accentBg="bg-red-100 dark:bg-red-900/30"
                accentText="text-red-600 dark:text-red-400"
              />
            </div>
          )}

          {/* ── Commissions Table ──────────────────────────────────────── */}
          {activePeriod && (
            <section>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-[18px] h-[18px] text-red-600 dark:text-red-400" />
                  Comisiones por restaurante
                </h2>
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
                      {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {/* Botón descargar todos */}
                  {!loadingCommissions && commissions.some((c) => c.pdf_url) && (
                    <button
                      onClick={handleDownloadAll}
                      disabled={!!bulkDownload || !!downloadingId}
                      title="Descargar todos los estados de cuenta"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold hover:bg-gray-700 dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {bulkDownload ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <DownloadCloud className="w-3.5 h-3.5" />
                      )}
                      Descargar todos
                    </button>
                  )}
                </div>
              </div>

              {/* Loading skeleton */}
              {loadingCommissions && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm divide-y divide-gray-50 dark:divide-gray-700/50">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse w-1/2" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse w-1/4" />
                      </div>
                      <div className="h-6 w-24 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loadingCommissions && commissions.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-5 py-12 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Receipt className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Sin comisiones registradas aún
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">
                    Las comisiones se capturan automáticamente cuando una orden
                    cambia a estado{" "}
                    <span className="font-semibold text-gray-600 dark:text-gray-300">
                      completada
                    </span>{" "}
                    mientras la quincena está abierta.
                  </p>
                </div>
              )}

              {/* Commissions list */}
              {!loadingCommissions && commissions.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">

                  {/* Desktop header */}
                  <div className="hidden sm:flex items-center px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 gap-4">
                    <div className="flex-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Store className="w-3 h-3" /> Restaurante
                    </div>
                    <div className="w-20 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                      Órdenes
                    </div>
                    <div className="w-28 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                      Comisión
                    </div>
                    <div className="w-24 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                      Estado
                    </div>
                    <div className="w-28 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                      Documento
                    </div>
                    <div className="w-20 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                      Cobro
                    </div>
                  </div>

                  {/* Rows */}
                  {commissions.map((row, idx) => (
                    <div
                      key={row.business_id}
                      className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-colors ${
                        idx < commissions.length - 1
                          ? "border-b border-gray-50 dark:border-gray-700/50"
                          : ""
                      }`}
                    >
                      {/* ── Mobile layout ── */}
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
                              {row.total_orders} orden
                              {row.total_orders !== 1 ? "es" : ""}
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
                            {row.pdf_url && (
                              <>
                                {/* Ver en browser */}
                                <a
                                  href={row.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Ver
                                </a>
                                {/* Descargar */}
                                <button
                                  onClick={() => handleDownloadOne(row)}
                                  disabled={downloadingId === row.business_id || !!bulkDownload}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium hover:bg-gray-700 dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {downloadingId === row.business_id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Download className="w-3 h-3" />
                                  )}
                                  Descargar
                                </button>
                              </>
                            )}
                            {row.statement_id &&
                              row.statement_status === "issued" && (
                                <button
                                  onClick={() =>
                                    markAsPaid(row.statement_id!, row.business_id)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  Marcar pagado
                                </button>
                              )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1.5" />
                      </div>

                      {/* ── Desktop layout ── */}
                      <div className="hidden sm:flex items-center px-5 py-4 gap-4">
                        {/* Restaurant */}
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                            <Store className="w-[18px] h-[18px] text-red-600 dark:text-red-400" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {row.business_name}
                          </span>
                        </div>

                        {/* Orders */}
                        <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 text-right tabular-nums">
                          {row.total_orders}
                        </div>

                        {/* Commission */}
                        <div className="w-28 text-sm font-bold text-red-600 dark:text-red-400 text-right tabular-nums">
                          {formatCurrency(row.total_commission)}
                        </div>

                        {/* Statement status */}
                        <div className="w-24 flex justify-center">
                          <StatementBadge status={row.statement_status} />
                        </div>

                        {/* Documento: Ver + Descargar */}
                        <div className="w-28 flex items-center gap-1.5 justify-center">
                          {row.pdf_url ? (
                            <>
                              <a
                                href={row.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Ver estado de cuenta en el navegador"
                                className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleDownloadOne(row)}
                                disabled={downloadingId === row.business_id || !!bulkDownload}
                                title="Descargar estado de cuenta"
                                className="p-2 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {downloadingId === row.business_id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic">—</span>
                          )}
                        </div>

                        {/* Cobro: Marcar pagado */}
                        <div className="w-20 flex items-center gap-1.5 justify-center">
                          {row.statement_id &&
                          row.statement_status === "issued" ? (
                            <button
                              onClick={() =>
                                markAsPaid(row.statement_id!, row.business_id)
                              }
                              title="Marcar como pagado"
                              className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 transition-colors"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          ) : row.statement_status === "paid" ? (
                            <span title="Pagado">
                              <BadgeCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Footer totals */}
                  <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {commissions.length}
                      </span>{" "}
                      restaurante{commissions.length !== 1 ? "s" : ""} ·{" "}
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {totalOrders}
                      </span>{" "}
                      órdenes completadas
                    </p>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(totalCommission)} total
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── No active period CTA ──────────────────────────────────── */}
          {!loadingPeriod && !activePeriod && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm px-5 py-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <LayoutDashboard className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-700 dark:text-gray-300">
                  No hay quincena activa
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs leading-relaxed">
                  Abre una quincena para iniciar el seguimiento de comisiones del
                  periodo actual.
                </p>
              </div>
              <button
                onClick={() => setConfirmAction({ type: "open" })}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30"
              >
                <LockOpen className="w-4 h-4" />
                Abrir quincena
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
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
