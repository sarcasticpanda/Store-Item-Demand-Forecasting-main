"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { api, type UploadResult, type UploadRecord, type Store } from "@/lib/api";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw } from "lucide-react";

export default function UploadPage() {
  const [stores, setStores]       = useState<Store[]>([]);
  const [storeId, setStoreId]     = useState(1);
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string[][] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]       = useState<UploadResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [history, setHistory]     = useState<UploadRecord[]>([]);
  const [dragOver, setDragOver]   = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.stores().then(setStores).catch(() => {});
    api.listUploads().then(setHistory).catch(() => {});
  }, []);

  const readPreview = (f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").slice(0, 11).filter(Boolean);
      setPreview(lines.map((l) => l.split(",").map((c) => c.trim())));
    };
    reader.readAsText(f);
  };

  const handleFile = (f: File) => {
    setFile(f); setResult(null); setError(null);
    readPreview(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) handleFile(f);
    else setError("Only CSV files are accepted");
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true); setError(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("store_id", String(storeId));
      const res = await api.uploadCsv(fd);
      setResult(res);
      // Refresh history
      api.listUploads().then(setHistory).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-bg-border"
        style={{ background: "linear-gradient(180deg, rgba(245,158,11,0.04) 0%, transparent 100%)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-400 border border-amber-400/30 bg-amber-400/5 px-3 py-1 rounded-full">
            <Upload className="w-3 h-3" />
            Data Upload
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Upload Sales Data</h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload your store's historical sales CSV to power real forecasts from your actual data
        </p>
      </div>

      <div className="px-8 py-7 space-y-6 max-w-4xl">
        {/* Format guide */}
        <div className="card border-amber-500/10">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-white text-sm">Required CSV Format</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table text-xs w-auto">
              <thead>
                <tr>
                  <th>date</th><th>product_name</th><th>units_sold</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>2025-01-01</td><td>Amul Milk 500ml</td><td>32</td></tr>
                <tr><td>2025-01-01</td><td>Maggi Noodles 70g</td><td>18</td></tr>
                <tr><td>2025-01-02</td><td>Amul Milk 500ml</td><td>29</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-600 mt-2">
            Also accepted: <span className="text-slate-500">product / item / name</span> for product column, and <span className="text-slate-500">units / sales / qty</span> for quantity column. Product names are fuzzy-matched to your catalog.
          </p>
        </div>

        {/* Store selector + upload zone */}
        <div className="card space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Store</label>
            <select value={storeId} onChange={(e) => setStoreId(+e.target.value)} className="select w-64">
              {stores.map((s) => <option key={s._id} value={s._id}>{s.name} · {s.city}</option>)}
            </select>
          </div>

          {/* Drop zone */}
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-3 py-14 ${
                dragOver
                  ? "border-amber-400/60 bg-amber-400/5"
                  : "border-bg-muted hover:border-amber-400/30 hover:bg-amber-400/3"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <Upload className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Drop your CSV here or click to browse</p>
                <p className="text-xs text-slate-600 mt-1">Only .csv files</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={reset} className="btn-ghost text-xs shrink-0">Remove</button>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        {/* CSV preview */}
        {preview && preview.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Preview — first 10 rows</h3>
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>{preview[0].map((h, i) => <th key={i}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.slice(1).map((row, ri) => (
                    <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSubmit} disabled={uploading}
                className="btn-primary disabled:opacity-50 flex items-center gap-2">
                {uploading ? <><RefreshCw className="w-4 h-4 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />Upload & Process</>}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="card border-emerald-500/15">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-emerald-300">Upload Successful</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="stat-chip">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Rows Imported</span>
                <span className="text-xl font-bold text-white font-mono">{result.rows_uploaded}</span>
              </div>
              <div className="stat-chip">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Products Matched</span>
                <span className="text-xl font-bold text-emerald-400 font-mono">{result.matched_products.length}</span>
              </div>
              <div className="stat-chip">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Unmatched</span>
                <span className="text-xl font-bold text-amber-400 font-mono">{result.unmatched.length}</span>
              </div>
            </div>
            {result.matched_products.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">Matched Products</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.matched_products.map((p) => (
                    <span key={p} className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">{p}</span>
                  ))}
                </div>
              </div>
            )}
            {result.unmatched.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />Unmatched Products
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.unmatched.map((p) => (
                    <span key={p} className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">{p}</span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 mt-2">Unmatched products are skipped. Check spelling against the product catalog.</p>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <a href="/forecast" className="btn-primary text-xs">View Forecasts →</a>
              <button onClick={reset} className="btn-ghost text-xs">Upload Another</button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/25 rounded-xl px-5 py-4">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">Upload Failed</p>
              <p className="text-xs text-red-400/70 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Upload history */}
        {history.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-white text-sm">Upload History</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Filename</th><th>Uploaded</th><th>Rows</th><th>Matched</th>
                </tr>
              </thead>
              <tbody>
                {history.map((log, i) => (
                  <tr key={i}>
                    <td className="font-mono text-xs">{log.filename}</td>
                    <td className="text-slate-500 text-xs">{new Date(log.uploaded_at).toLocaleString()}</td>
                    <td className="font-mono">{log.rows}</td>
                    <td className="text-emerald-400 font-mono">{log.matched_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
