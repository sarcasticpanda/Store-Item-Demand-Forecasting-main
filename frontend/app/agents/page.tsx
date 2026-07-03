"use client";
import { useState, useEffect, useRef } from "react";
import { api, type Store, type AgentRun, type PurchaseOrder } from "@/lib/api";
import {
  Brain, Zap, Package, Truck, CheckCircle, XCircle,
  RefreshCw, ShoppingCart, ChevronDown, ChevronUp,
} from "lucide-react";

const AGENT_META: Record<string, { label: string; icon: typeof Brain; color: string }> = {
  demand:    { label: "Demand Agent",    icon: Brain,   color: "text-brand"    },
  inventory: { label: "Inventory Agent", icon: Package, color: "text-sig-blue" },
  logistics: { label: "Logistics Agent", icon: Truck,   color: "text-sig-green"},
};

const LEVEL_COLOR: Record<string, string> = {
  info: "text-ink-2", warning: "text-sig-amber", error: "text-sig-red", success: "text-sig-green",
};

const URGENCY_TAG: Record<string, string> = { critical: "tag-red", high: "tag-amber", normal: "tag-ink" };
const PRIORITY_TAG: Record<string, string> = { urgent: "tag-red", high: "tag-amber", normal: "tag-green" };

export default function AgentsPage() {
  const [stores, setStores]             = useState<Store[]>([]);
  const [storeId, setStoreId]           = useState(1);
  const [running, setRunning]           = useState(false);
  const [currentRun, setCurrentRun]     = useState<AgentRun | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [pendingPOs, setPendingPOs]     = useState<PurchaseOrder[]>([]);
  const [rejectNote, setRejectNote]     = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen]     = useState<Record<string, boolean>>({});
  const [poAction, setPoAction]         = useState<Record<string, "approving" | "rejecting" | null>>({});
  const [expanded, setExpanded]         = useState<Record<string, boolean>>({});
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.stores().then(setStores).catch(() => {});
    loadPendingPOs();
  }, []);

  useEffect(() => {
    if (!currentRun || visibleSteps >= currentRun.steps.length) return;
    const t = setTimeout(() => setVisibleSteps((v) => v + 1), 180);
    return () => clearTimeout(t);
  }, [currentRun, visibleSteps]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [visibleSteps]);

  async function loadPendingPOs() {
    try { setPendingPOs(await api.listPurchaseOrders("pending")); }
    catch { /* silent */ }
  }

  async function handleRun() {
    setRunning(true); setCurrentRun(null); setVisibleSteps(0);
    try {
      const run = await api.runAgents(storeId);
      setCurrentRun(run); setVisibleSteps(0); loadPendingPOs();
    } catch (e) { console.error(e); }
    finally { setRunning(false); }
  }

  async function handleApprove(poId: string) {
    setPoAction((p) => ({ ...p, [poId]: "approving" }));
    try {
      await api.approvePO(poId);
      setPendingPOs((prev) => prev.filter((p) => p._id !== poId));
      if (currentRun?.purchase_order_id === poId)
        setCurrentRun((r) => r ? { ...r, _po_status: "approved" } : r);
    } finally { setPoAction((p) => ({ ...p, [poId]: null })); }
  }

  async function handleReject(poId: string) {
    setPoAction((p) => ({ ...p, [poId]: "rejecting" }));
    try {
      await api.rejectPO(poId, rejectNote[poId] || "");
      setPendingPOs((prev) => prev.filter((p) => p._id !== poId));
      if (currentRun?.purchase_order_id === poId)
        setCurrentRun((r) => r ? { ...r, _po_status: "rejected" } : r);
      setRejectOpen((p) => ({ ...p, [poId]: false }));
    } finally { setPoAction((p) => ({ ...p, [poId]: null })); }
  }

  const toggleExpand = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div className="relative min-h-screen">
      {/* Masthead */}
      <header className="px-8 pt-8 pb-6 bg-surface" style={{ borderBottom: "1px solid var(--rule-strong)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="pill-brand"><Zap className="w-3 h-3" /> AI Control Tower</span>
        </div>
        <h1 className="display-heading text-3xl">Multi-Agent Inventory Planner</h1>
        <p className="text-ink-3 text-sm mt-1.5 font-mono">
          Three LangGraph agents debate demand signals and draft purchase orders for manager approval
        </p>
      </header>

      <div className="px-8 py-7 space-y-6 max-w-5xl">

        {/* Agent pipeline */}
        <div className="card">
          <p className="section-title mb-4">Agent Pipeline</p>
          <div className="flex items-center gap-3 flex-wrap">
            {(["demand", "inventory", "logistics"] as const).map((key, i) => {
              const m = AGENT_META[key];
              const Icon = m.icon;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded border border-rule bg-panel">
                    <Icon className={`w-4 h-4 ${m.color}`} />
                    <div>
                      <div className={`text-xs font-semibold ${m.color}`}>{m.label}</div>
                      <div className="text-[10px] text-ink-3 mt-0.5">
                        {key === "demand" ? "Forecast · Anomaly detection" :
                         key === "inventory" ? "Capacity · Festival adjust" :
                         "Draft PO · Cost analysis"}
                      </div>
                    </div>
                  </div>
                  {i < 2 && <div className="text-ink-4 font-mono text-lg">→</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Trigger */}
        <div className="card">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <label className="eyebrow">Store</label>
              <select value={storeId} onChange={(e) => setStoreId(+e.target.value)} className="select w-72">
                {stores.map((s) => <option key={s._id} value={s._id}>{s.name} · {s.city}</option>)}
              </select>
            </div>
            <button onClick={handleRun} disabled={running} className="btn-brand disabled:opacity-50">
              {running
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running agents…</>
                : <><Zap className="w-4 h-4" /> Run AI Analysis</>}
            </button>
          </div>
          {running && (
            <div className="flex items-center gap-2 text-sm text-ink-3 mt-4">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              Agents are analysing inventory and running forecasts…
            </div>
          )}
        </div>

        {/* Activity Feed */}
        {currentRun && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <span className="section-title">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse-slow" /> Agent Activity Feed
              </span>
              <span className="font-mono text-[10px] text-ink-3">{currentRun.store_name}</span>
            </div>

            <div ref={feedRef} className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {currentRun.steps.slice(0, visibleSteps).map((step, i) => {
                const meta = AGENT_META[step.agent];
                const Icon = meta?.icon ?? Brain;
                return (
                  <div key={i} className="flex gap-3 rounded px-3 py-2.5 bg-panel" style={{ animation: "fadeSlideIn 0.25s ease-out" }}>
                    <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 bg-surface border border-rule">
                      <Icon className={`w-3 h-3 ${meta?.color ?? "text-ink-3"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider font-mono ${meta?.color ?? "text-ink-3"}`}>
                          {meta?.label ?? step.agent}
                        </span>
                        <span className={`text-xs font-medium ${LEVEL_COLOR[step.level] ?? "text-ink-2"}`}>
                          {step.message}
                        </span>
                      </div>
                      {step.detail && <p className="text-[11px] text-ink-3 mt-0.5">{step.detail}</p>}
                    </div>
                  </div>
                );
              })}
              {visibleSteps < currentRun.steps.length && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-brand animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </div>
                  <span className="text-[11px] text-ink-3">Processing…</span>
                </div>
              )}
            </div>

            {visibleSteps >= currentRun.steps.length && currentRun.demand_analysis.length > 0 && (
              <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: "1px solid var(--rule)" }}>
                <div className="stat-chip text-center">
                  <span className="eyebrow">SKUs flagged</span>
                  <span className="figure text-xl mt-1 block">{currentRun.demand_analysis.length}</span>
                </div>
                <div className="stat-chip text-center">
                  <span className="eyebrow">Order lines</span>
                  <span className="figure text-xl text-brand mt-1 block">{currentRun.validated_orders.length}</span>
                </div>
                <div className="stat-chip text-center">
                  <span className="eyebrow">Total cost</span>
                  <span className="figure text-xl text-sig-green mt-1 block">
                    ₹{currentRun.validated_orders.reduce((s, o) => s + o.subtotal, 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Current run PO */}
        {currentRun?.purchase_order_id && (
          <POCard
            po={pendingPOs.find((p) => p._id === currentRun.purchase_order_id) ?? null}
            poId={currentRun.purchase_order_id}
            poStatus={(currentRun as any)._po_status}
            rejectNote={rejectNote} setRejectNote={setRejectNote}
            rejectOpen={rejectOpen} setRejectOpen={setRejectOpen}
            poAction={poAction}
            expanded={!!expanded[currentRun.purchase_order_id]}
            onToggle={() => toggleExpand(currentRun.purchase_order_id!)}
            onApprove={handleApprove} onReject={handleReject}
          />
        )}

        {/* Other pending POs */}
        {pendingPOs.filter((p) => p._id !== currentRun?.purchase_order_id).length > 0 && (
          <div className="space-y-4">
            <div className="section-divider-label">Other Pending Purchase Orders</div>
            {pendingPOs
              .filter((p) => p._id !== currentRun?.purchase_order_id)
              .map((po) => (
                <POCard
                  key={po._id}
                  po={po} poId={po._id}
                  rejectNote={rejectNote} setRejectNote={setRejectNote}
                  rejectOpen={rejectOpen} setRejectOpen={setRejectOpen}
                  poAction={poAction}
                  expanded={!!expanded[po._id]}
                  onToggle={() => toggleExpand(po._id)}
                  onApprove={handleApprove} onReject={handleReject}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── PO Card ────────────────────────────────────────────────────────── */
function POCard({
  po, poId, poStatus, rejectNote, setRejectNote,
  rejectOpen, setRejectOpen, poAction, expanded, onToggle, onApprove, onReject,
}: {
  po: PurchaseOrder | null;
  poId: string;
  poStatus?: string;
  rejectNote: Record<string, string>;
  setRejectNote: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  rejectOpen: Record<string, boolean>;
  setRejectOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  poAction: Record<string, "approving" | "rejecting" | null>;
  expanded: boolean;
  onToggle: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (poStatus === "approved") {
    return (
      <div className="card rail-green flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-sig-green" />
        <div>
          <p className="text-sm font-semibold text-sig-green">Purchase Order Approved</p>
          <p className="text-xs text-ink-3 font-mono">PO#{poId.slice(0, 8).toUpperCase()} · Order submitted for processing</p>
        </div>
      </div>
    );
  }

  if (poStatus === "rejected") {
    return (
      <div className="card rail-red flex items-center gap-3">
        <XCircle className="w-5 h-5 text-sig-red" />
        <div>
          <p className="text-sm font-semibold text-sig-red">Purchase Order Rejected</p>
          <p className="text-xs text-ink-3 font-mono">PO#{poId.slice(0, 8).toUpperCase()} · {rejectNote[poId] || "No reason given"}</p>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="card rail-brand flex items-center gap-3 py-5">
        <ShoppingCart className="w-5 h-5 text-brand" />
        <div>
          <p className="text-sm font-semibold text-ink">Purchase Order Generated</p>
          <p className="text-[11px] text-ink-3 font-mono mt-0.5">PO#{poId.slice(0, 8).toUpperCase()} · Loading details…</p>
        </div>
      </div>
    );
  }

  const totalCost = po.total_cost ?? po.items.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="card rail-brand space-y-0">
      {/* PO Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-brand" />
            <span className="text-sm font-bold text-ink font-mono">PO#{po._id.slice(0, 8).toUpperCase()}</span>
            <span className={`tag ${PRIORITY_TAG[po.priority] ?? "tag-ink"}`}>{po.priority}</span>
          </div>
          <p className="text-xs text-ink-3">{po.store_name} · ETA {po.estimated_delivery}</p>
        </div>
        <div className="text-right">
          <div className="figure text-xl">₹{totalCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
          <div className="text-[11px] text-ink-3">{po.items.length} line items</div>
        </div>
      </div>

      {/* Approve / Reject — always visible at the TOP */}
      <div className="flex items-start gap-3 py-4 flex-wrap" style={{ borderTop: "1px solid var(--rule)" }}>
        <button onClick={() => onApprove(po._id)} disabled={!!poAction[po._id]} className="btn-approve disabled:opacity-50">
          {poAction[po._id] === "approving" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Approve Order
        </button>

        <div className="flex-1 min-w-0">
          {rejectOpen[po._id] ? (
            <div className="flex gap-2">
              <input
                value={rejectNote[po._id] ?? ""}
                onChange={(e) => setRejectNote((n) => ({ ...n, [po._id]: e.target.value }))}
                placeholder="Reason for rejection (optional)"
                className="input flex-1"
              />
              <button onClick={() => onReject(po._id)} disabled={!!poAction[po._id]} className="btn-danger shrink-0 disabled:opacity-50">
                {poAction[po._id] === "rejecting" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Confirm Reject
              </button>
              <button onClick={() => setRejectOpen((o) => ({ ...o, [po._id]: false }))} className="btn-ghost shrink-0">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setRejectOpen((o) => ({ ...o, [po._id]: true }))}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-sig-red text-sm font-medium border border-rule-strong hover:bg-panel transition-colors">
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          )}
        </div>

        <button onClick={onToggle} className="btn-ghost text-xs shrink-0">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide" : "View"} line items
        </button>
      </div>

      {/* Line items — collapsed by default */}
      {expanded && (
        <div className="overflow-x-auto pt-4" style={{ borderTop: "1px solid var(--rule)" }}>
          <table className="data-table text-xs w-full">
            <thead>
              <tr>
                <th className="text-left">Product</th><th>Urgency</th><th>Stock</th>
                <th>Order Qty</th><th>Unit Cost</th><th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item, i) => (
                <tr key={i}>
                  <td className="text-left">
                    <div className="font-medium text-ink">{item.item_name}</div>
                    {item.festival_adjusted && <div className="text-[10px] text-sig-amber mt-0.5">Festival-adjusted</div>}
                  </td>
                  <td><span className={`tag ${URGENCY_TAG[item.urgency] ?? "tag-ink"}`}>{item.urgency}</span></td>
                  <td className="font-mono text-ink-3 tnum">{item.current_stock}</td>
                  <td className="font-mono font-bold text-ink tnum">{item.order_qty}</td>
                  <td className="font-mono text-ink-3 tnum">₹{item.unit_cost.toFixed(0)}</td>
                  <td className="font-mono text-sig-green tnum">₹{item.subtotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="text-right font-semibold text-ink-2 text-xs pt-2">Total</td>
                <td className="font-mono font-bold text-ink pt-2 tnum">₹{totalCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
