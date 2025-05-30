"use client";
import { useState, useEffect } from "react";
import { api, type PipelineStatus, type PipelineRun } from "@/lib/api";
import { RefreshCw, CheckCircle, XCircle, Clock, Play, Cpu, Calendar, Zap } from "lucide-react";

function StatusIcon({ s }: { s: string }) {
  if (s === "success") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (s === "failed")  return <XCircle className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-amber-400 animate-spin" />;
}
function statusGlow(s: string) {
  if (s === "success") return "text-emerald-400";
  if (s === "failed")  return "text-red-400";
  return "text-amber-400";
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
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-bg-border"
        style={{ background: "linear-gradient(180deg, rgba(245,158,11,0.04) 0%, transparent 100%)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-accent-amber border border-accent-amber/30 bg-accent-amber/5 px-3 py-1 rounded-full">
                <Cpu className="w-3 h-3" />
                ML Pipeline
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Pipeline</h1>
            <p className="text-slate-500 text-sm mt-1">Model retraining, performance monitoring, run history</p>
          </div>
          <button onClick={retrain} disabled={running}
            className="btn-primary flex items-center gap-2 disabled:opacity-60">
            {running
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Retraining…</>
              : <><Play className="w-4 h-4" />Trigger Retrain</>}
          </button>
        </div>
      </div>

      <div className="px-8 py-7 space-y-6">
        {/* Last run status */}
        {!loading && status && (
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <StatusIcon s={status.status} />
              <h2 className="font-semibold text-white text-sm">Last Run</h2>
              <span className={`ml-auto text-xs font-bold uppercase tracking-wider ${statusGlow(status.status)}`}>
                {status.status.replace("_", " ")}
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
                  <p className="section-title">{f.label}</p>
                  <p className="text-sm text-white mt-1 capitalize font-mono">{f.value}</p>
                </div>
              ))}
            </div>

            {status.mae_before != null && (
              <div className="pt-4 border-t border-bg-border grid grid-cols-3 gap-4">
                <div className="card text-center">
                  <p className="section-title">MAE</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-lg font-mono text-slate-400">{status.mae_before ?? "—"}</span>
                    <span className="text-slate-700 text-xs">→</span>
                    <span className={`text-lg font-bold font-mono ${status.mae_after != null && status.mae_before != null
                      ? status.mae_after < status.mae_before ? "text-emerald-400" : "text-red-400"
                      : "text-white"}`}>{status.mae_after ?? "—"}</span>
                  </div>
                </div>
                <div className="card text-center">
                  <p className="section-title">R²</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-lg font-mono text-slate-400">{status.r2_before ?? "—"}</span>
                    <span className="text-slate-700 text-xs">→</span>
                    <span className={`text-lg font-bold font-mono ${status.r2_after != null && status.r2_before != null
                      ? status.r2_after > status.r2_before ? "text-emerald-400" : "text-red-400"
                      : "text-white"}`}>{status.r2_after ?? "—"}</span>
                  </div>
                </div>
                <div className="card text-center">
                  <p className="section-title">MAE Improvement</p>
                  {improvement !== null
                    ? <p className={`text-2xl font-bold font-mono mt-2 ${improvement > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {improvement > 0 ? "−" : "+"}{Math.abs(improvement).toFixed(1)}%
                      </p>
                    : <p className="text-2xl font-bold text-slate-600 mt-2">—</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pipeline trigger info */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Calendar, label: "Scheduled Run",  desc: "Every Sunday at 2:00 AM automatically",         color: "text-blue-400",    bg: "bg-blue-500/10" },
            { icon: Zap,      label: "Auto-Trigger",   desc: "Triggers if MAE degrades >15% from baseline",   color: "text-amber-400",   bg: "bg-amber-500/10" },
            { icon: Play,     label: "Manual Run",     desc: "Click Trigger Retrain button above anytime",    color: "text-violet-400",  bg: "bg-violet-500/10" },
          ].map(({ icon: Icon, label, desc, color, bg }) => (
            <div key={label} className="card flex gap-3 items-start group hover:border-bg-muted transition-colors">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* History table */}
        <div className="card p-0">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-bg-border">
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-white text-sm">Run History</h2>
            <span className="ml-auto text-xs text-slate-600 font-mono border border-bg-muted px-2 py-0.5 rounded-full">
              {history.length} runs
            </span>
          </div>
          {history.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-12">No retraining runs yet — trigger one above</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Triggered At</th>
                  <th>Type</th>
                  <th className="text-right">MAE Before</th>
                  <th className="text-right">MAE After</th>
                  <th className="text-right">R² After</th>
                  <th className="text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <StatusIcon s={r.status} />
                        <span className={`text-xs font-semibold capitalize ${statusGlow(r.status)}`}>{r.status}</span>
                      </div>
                    </td>
                    <td className="text-slate-400 text-xs font-mono">
                      {r.triggered_at ? new Date(r.triggered_at).toLocaleString() : "—"}
                    </td>
                    <td className="text-slate-400 capitalize">{r.trigger_type ?? "—"}</td>
                    <td className="text-right font-mono text-slate-500">{r.mae_before ?? "—"}</td>
                    <td className={`text-right font-mono ${r.mae_after != null && r.mae_before != null
                      ? r.mae_after < r.mae_before ? "text-emerald-400" : "text-red-400"
                      : "text-slate-500"}`}>{r.mae_after ?? "—"}</td>
                    <td className="text-right font-mono text-slate-400">{r.r2_after ?? "—"}</td>
                    <td className="text-right font-mono text-slate-500">
                      {r.duration_seconds ? `${r.duration_seconds}s` : "—"}
                    </td>
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
