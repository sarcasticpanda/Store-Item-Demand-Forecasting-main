"use client";
import { useState, useEffect } from "react";
import { api, type PipelineStatus, type PipelineRun } from "@/lib/api";
import { RefreshCw, CheckCircle, XCircle, Clock, Play, Cpu, Calendar, Zap } from "lucide-react";

function StatusIcon({ s }: { s: string }) {
  if (s === "success") return <CheckCircle className="w-4 h-4 text-sig-green" />;
  if (s === "failed")  return <XCircle className="w-4 h-4 text-sig-red" />;
  return <Clock className="w-4 h-4 text-sig-amber animate-spin" />;
}
function statusColor(s: string) {
  if (s === "success") return "text-sig-green";
  if (s === "failed")  return "text-sig-red";
  return "text-sig-amber";
}

export default function PipelinePage() {
  const [status, setStatus]   = useState<PipelineStatus | null>(null);
  const [history, setHistory] = useState<PipelineRun[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [s, h] = await Promise.all([
      api.pipelineStatus().catch(() => null),
      api.pipelineHistory().catch(() => []),
    ]);
    setStatus(s); setHistory(h); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const retrain = async () => {
    setRunning(true);
    await api.retrain().catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));
    await load();
    setRunning(false);
  };

  const improvement = status?.mae_before != null && status?.mae_after != null
    ? ((status.mae_before - status.mae_after) / status.mae_before * 100)
    : null;

  return (
    <div className="relative min-h-screen">
      {/* Masthead */}
      <header className="px-8 pt-8 pb-6 bg-surface" style={{ borderBottom: "1px solid var(--rule-strong)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="pill-amber"><Cpu className="w-3 h-3" /> ML Pipeline</span>
            </div>
            <h1 className="display-heading text-3xl">Pipeline</h1>
            <p className="text-ink-3 text-sm mt-1.5 font-mono">Model retraining · performance monitoring · run history</p>
          </div>
          <button onClick={retrain} disabled={running} className="btn-primary disabled:opacity-60">
            {running ? <><RefreshCw className="w-4 h-4 animate-spin" />Retraining…</> : <><Play className="w-4 h-4" />Trigger Retrain</>}
          </button>
        </div>
      </header>

      <div className="px-8 py-7 space-y-6">
        {/* Last run */}
        {!loading && status && (
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <StatusIcon s={status.status} />
              <h2 className="section-title !text-ink">Last Run</h2>
              <span className={`ml-auto tag ${status.status === "success" ? "tag-green" : status.status === "failed" ? "tag-red" : "tag-amber"}`}>
                {status.status.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 pt-1">
              {[
                { label: "Triggered At",  value: status.triggered_at ? new Date(status.triggered_at).toLocaleString() : "—" },
                { label: "Trigger Type",  value: status.trigger_type ?? "—" },
                { label: "Duration",      value: status.duration_seconds ? `${status.duration_seconds}s` : "—" },
                { label: "Run ID",        value: status.run_id ? status.run_id.slice(0, 10) + "…" : "—" },
              ].map((f) => (
                <div key={f.label}>
                  <p className="eyebrow">{f.label}</p>
                  <p className="text-sm text-ink mt-1 capitalize font-mono">{f.value}</p>
                </div>
              ))}
            </div>

            {status.mae_before != null && (
              <div className="pt-4 grid grid-cols-3 gap-4" style={{ borderTop: "1px solid var(--rule)" }}>
                <div className="card-sunk text-center">
                  <p className="eyebrow">MAE</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-lg font-mono text-ink-3 tnum">{status.mae_before ?? "—"}</span>
                    <span className="text-ink-4 text-xs">→</span>
                    <span className={`text-lg font-bold font-mono tnum ${status.mae_after != null && status.mae_before != null
                      ? status.mae_after < status.mae_before ? "text-sig-green" : "text-sig-red" : "text-ink"}`}>{status.mae_after ?? "—"}</span>
                  </div>
                </div>
                <div className="card-sunk text-center">
                  <p className="eyebrow">R²</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-lg font-mono text-ink-3 tnum">{status.r2_before ?? "—"}</span>
                    <span className="text-ink-4 text-xs">→</span>
                    <span className={`text-lg font-bold font-mono tnum ${status.r2_after != null && status.r2_before != null
                      ? status.r2_after > status.r2_before ? "text-sig-green" : "text-sig-red" : "text-ink"}`}>{status.r2_after ?? "—"}</span>
                  </div>
                </div>
                <div className="card-sunk text-center">
                  <p className="eyebrow">MAE Improvement</p>
                  {improvement !== null
                    ? <p className={`figure text-2xl mt-2 ${improvement > 0 ? "text-sig-green" : "text-sig-red"}`}>
                        {improvement > 0 ? "−" : "+"}{Math.abs(improvement).toFixed(1)}%
                      </p>
                    : <p className="figure text-2xl text-ink-4 mt-2">—</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trigger info */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Calendar, label: "Scheduled Run", desc: "Every Sunday at 2:00 AM automatically",       color: "text-sig-blue"  },
            { icon: Zap,      label: "Auto-Trigger",  desc: "Triggers if MAE degrades >15% from baseline", color: "text-sig-amber" },
            { icon: Play,     label: "Manual Run",    desc: "Click Trigger Retrain button above anytime",  color: "text-brand"     },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="card flex gap-3 items-start">
              <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 bg-panel border border-rule">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="text-xs text-ink-3 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* History */}
        <div className="card p-0">
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--rule-strong)" }}>
            <RefreshCw className="w-3.5 h-3.5 text-ink-3" />
            <h2 className="section-title !text-ink">Run History</h2>
            <span className="ml-auto tag tag-ink">{history.length} runs</span>
          </div>
          {history.length === 0 ? (
            <p className="text-ink-3 text-sm text-center py-12">No retraining runs yet — trigger one above</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th><th>Triggered At</th><th>Type</th>
                  <th className="text-right">MAE Before</th><th className="text-right">MAE After</th>
                  <th className="text-right">R² After</th><th className="text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <StatusIcon s={r.status} />
                        <span className={`text-xs font-semibold capitalize ${statusColor(r.status)}`}>{r.status}</span>
                      </div>
                    </td>
                    <td className="text-ink-3 text-xs font-mono">{r.triggered_at ? new Date(r.triggered_at).toLocaleString() : "—"}</td>
                    <td className="text-ink-2 capitalize">{r.trigger_type ?? "—"}</td>
                    <td className="text-right font-mono text-ink-3 tnum">{r.mae_before ?? "—"}</td>
                    <td className={`text-right font-mono tnum ${r.mae_after != null && r.mae_before != null
                      ? r.mae_after < r.mae_before ? "text-sig-green" : "text-sig-red" : "text-ink-3"}`}>{r.mae_after ?? "—"}</td>
                    <td className="text-right font-mono text-ink-2 tnum">{r.r2_after ?? "—"}</td>
                    <td className="text-right font-mono text-ink-3 tnum">{r.duration_seconds ? `${r.duration_seconds}s` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
