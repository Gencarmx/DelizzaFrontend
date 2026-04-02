/**
 * ProductAddonsSection
 * Panel de administración para gestionar extras/adiciones de un producto.
 *
 * Props:
 *   - embedded: cuando es true omite el card wrapper propio y se integra
 *     directamente dentro de la card padre (ProductEdit).
 */

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";
import Button from "@components/restaurant-ui/buttons/Button";
import type { ProductAddon } from "@core/supabase/types";
import { getAddonsByProductId, upsertProductAddons } from "@core/services/addonService";

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface DraftAddon {
  tempId: string;   // clave React — nunca va a Supabase
  id?: string;      // UUID real si ya existe en DB
  category_name: string;
  name: string;
  price: number;
  max_quantity: number;
  active: boolean;
}

let tempCounter = 0;
const nextTempId = () => `temp_${++tempCounter}`;

function groupByCategory(addons: DraftAddon[]): Map<string, DraftAddon[]> {
  const map = new Map<string, DraftAddon[]>();
  for (const a of addons) {
    const list = map.get(a.category_name) ?? [];
    list.push(a);
    map.set(a.category_name, list);
  }
  return map;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AddonDraftPayload {
  category_name: string;
  name: string;
  price: number;
  max_quantity: number;
  sort_order: number;
  active: boolean;
}

interface ProductAddonsSectionProps {
  /**
   * UUID del producto existente.
   * Si se omite → modo draft: no carga ni guarda en DB.
   * El padre debe guardar los extras vía `onChange` después de crear el producto.
   */
  productId?: string;
  onSaved?: () => void;
  /**
   * Se llama en cada cambio cuando `productId` está ausente (modo draft).
   * Recibe el array listo para pasar a `upsertProductAddons`.
   */
  onChange?: (addons: AddonDraftPayload[]) => void;
  /** Omite el card wrapper — úsalo cuando se embebe dentro de otra card */
  embedded?: boolean;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ProductAddonsSection({
  productId,
  onSaved,
  onChange,
  embedded = false,
}: ProductAddonsSectionProps) {
  const isDraftMode = !productId;
  const [addons, setAddons] = useState<DraftAddon[]>([]);
  const [isLoading, setIsLoading] = useState(!isDraftMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // ── Carga inicial (solo cuando hay productId) ─────────────────────────────
  const loadAddons = useCallback(async () => {
    if (!productId) return;
    try {
      setIsLoading(true);
      const data: ProductAddon[] = await getAddonsByProductId(productId);
      setAddons(
        data.map(a => ({
          tempId: nextTempId(),
          id: a.id,
          category_name: a.category_name,
          name: a.name,
          price: a.price,
          max_quantity: a.max_quantity,
          active: a.active,
        }))
      );
    } catch {
      setError("No se pudieron cargar los extras. Intenta recargar la página.");
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => { loadAddons(); }, [loadAddons]);

  // ── Notificar al padre en modo draft (efecto, nunca durante render) ────────
  useEffect(() => {
    if (!isDraftMode || !onChange) return;
    let sortOrder = 0;
    onChange(
      addons.map(a => ({
        category_name: a.category_name,
        name: a.name.trim(),
        price: a.price,
        max_quantity: a.max_quantity,
        sort_order: sortOrder++,
        active: a.active,
      }))
    );
  }, [addons, isDraftMode, onChange]);

  // ── Mutaciones del draft ──────────────────────────────────────────────────
  const updateAddon = (tempId: string, field: keyof DraftAddon, value: unknown) =>
    setAddons(prev => prev.map(a => (a.tempId === tempId ? { ...a, [field]: value } : a)));

  const removeAddon = (tempId: string) =>
    setAddons(prev => prev.filter(a => a.tempId !== tempId));

  const addAddonToCategory = (categoryName: string) =>
    setAddons(prev => [
      ...prev,
      { tempId: nextTempId(), category_name: categoryName, name: "", price: 0, max_quantity: 1, active: true },
    ]);

  const removeCategory = (categoryName: string) =>
    setAddons(prev => prev.filter(a => a.category_name !== categoryName));

  const addNewCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    addAddonToCategory(name);
    setNewCategoryName("");
    setShowNewCategory(false);
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!productId) return;
    for (const addon of addons) {
      if (!addon.name.trim()) { setError("Todos los extras deben tener un nombre."); return; }
      if (addon.price < 0)    { setError("El precio de un extra no puede ser negativo."); return; }
    }
    try {
      setIsSaving(true);
      setError(null);
      await upsertProductAddons(
        productId,
        addons.map(a => ({
          category_name: a.category_name,
          name: a.name.trim(),
          price: a.price,
          max_quantity: a.max_quantity,
          sort_order: 0,
          active: a.active,
        }))
      );
      setSuccessMsg("Extras guardados correctamente.");
      setTimeout(() => setSuccessMsg(null), 3000);
      onSaved?.();
      await loadAddons();
    } catch {
      setError("Error al guardar los extras. Intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Contenido compartido (categorías + controles) ─────────────────────────
  const groups = groupByCategory(addons);

  const body = (
    <div className="flex flex-col gap-4">
      {/* Feedback */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          {error}
        </p>
      )}
      {successMsg && (
        <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          ✓ {successMsg}
        </p>
      )}

      {/* Estado vacío */}
      {groups.size === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">
          Agrega categorías para organizar los extras (ej: Proteínas, Salsas).
        </p>
      )}

      {/* Categorías */}
      {Array.from(groups.entries()).map(([categoryName, items]) => (
        <div key={categoryName} className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
          {/* Header categoría */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/60">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">
              {categoryName}
            </span>
            <button
              type="button"
              onClick={() => removeCategory(categoryName)}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-500"
              title="Eliminar categoría"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Extras */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map(addon => (
              <div key={addon.tempId} className="flex items-center gap-2 px-4 py-2.5">
                {/* Nombre */}
                <input
                  type="text"
                  value={addon.name}
                  onChange={e => updateAddon(addon.tempId, "name", e.target.value)}
                  placeholder="Nombre del extra"
                  className="flex-1 min-w-0 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
                {/* Precio */}
                <div className="relative w-24 flex-shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={addon.price}
                    onChange={e => updateAddon(addon.tempId, "price", parseFloat(e.target.value) || 0)}
                    className="w-full pl-6 pr-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                </div>
                {/* Máx cantidad */}
                <select
                  value={addon.max_quantity}
                  onChange={e => updateAddon(addon.tempId, "max_quantity", parseInt(e.target.value))}
                  className="w-16 flex-shrink-0 px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  title="Cantidad máxima por pedido"
                >
                  {[1, 2, 3, 5, 10].map(n => <option key={n} value={n}>x{n}</option>)}
                </select>
                {/* Toggle activo */}
                <button
                  type="button"
                  onClick={() => updateAddon(addon.tempId, "active", !addon.active)}
                  className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors text-xs font-bold ${
                    addon.active
                      ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                  }`}
                  title={addon.active ? "Activo — clic para desactivar" : "Inactivo — clic para activar"}
                >
                  {addon.active ? "✓" : "✗"}
                </button>
                {/* Eliminar extra */}
                <button
                  type="button"
                  onClick={() => removeAddon(addon.tempId)}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-500"
                  title="Eliminar extra"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Agregar extra a esta categoría */}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => addAddonToCategory(categoryName)}
              className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-600 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar extra
            </button>
          </div>
        </div>
      ))}

      {/* Nueva categoría */}
      {showNewCategory ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter")  { e.preventDefault(); addNewCategory(); }
              if (e.key === "Escape") { setShowNewCategory(false); setNewCategoryName(""); }
            }}
            placeholder="Nombre de la categoría (ej: Proteínas)"
            autoFocus
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-amber-400 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          <Button type="button" variant="primary" size="sm" onClick={addNewCategory}>Agregar</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }}>
            Cancelar
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewCategory(true)}
          className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-600 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar categoría
        </button>
      )}

      {/* Leyenda */}
      {groups.size > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Columnas: Nombre · Precio · Máx. por pedido · Activo
        </p>
      )}

      {/* Guardar — solo en modo edición (no en draft) */}
      {!isDraftMode && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            isLoading={isSaving}
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar extras
          </Button>
        </div>
      )}
    </div>
  );

  const spinner = (
    <div className="flex justify-center py-6">
      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Header colapsable compartido ──────────────────────────────────────────
  const summaryText = addons.length === 0
    ? "Sin extras configurados"
    : `${addons.length} extra${addons.length !== 1 ? "s" : ""} en ${groups.size} categoría${groups.size !== 1 ? "s" : ""}`;

  // ── Modo embebido (dentro del card de Información del producto) ───────────
  if (embedded) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-px bg-gray-200 dark:bg-gray-700" />
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-between w-full text-left group"
        >
          <div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Extras del producto
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{summaryText}</p>
          </div>
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 flex-shrink-0" />
            : <ChevronUp   className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 flex-shrink-0" />
          }
        </button>
        {!collapsed && (isLoading ? spinner : body)}
      </div>
    );
  }

  // ── Modo standalone (card propia) ─────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Extras del producto</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{summaryText}</p>
        </div>
        {collapsed
          ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          : <ChevronUp   className="w-5 h-5 text-gray-400 flex-shrink-0" />
        }
      </button>

      {!collapsed && (
        <div className="px-6 pb-6 pt-5 border-t border-gray-100 dark:border-gray-700">
          {isLoading ? spinner : body}
        </div>
      )}
    </div>
  );
}
