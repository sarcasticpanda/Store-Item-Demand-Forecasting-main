"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight, ArrowRight, Clock, Menu, X,
  TrendingUp, Boxes, Bot, CalendarClock, Check,
} from "lucide-react";

/* ── Text-roll CTA (label rolls up on hover) ───────────────────── */
function RollLabel({ text }: { text: string }) {
  return (
    <span className="roll">
      <span>{text}</span>
      <span aria-hidden>{text}</span>
    </span>
  );
}

/* ── Abstract logistics network (hero graphic) ─────────────────── */
function NetworkMap() {
  const nodes = [
    { x: 40, y: 60 }, { x: 120, y: 40 }, { x: 210, y: 90 }, { x: 150, y: 150 },
    { x: 270, y: 150 }, { x: 90, y: 190 }, { x: 300, y: 60 }, { x: 230, y: 210 },
  ];
  const links: [number, number][] = [[0, 1], [1, 2], [2, 6], [2, 4], [3, 1], [3, 5], [4, 7], [3, 4], [5, 0]];
  const hot = [2, 4, 7];
  return (
    <svg viewBox="0 0 340 250" className="w-full h-auto" fill="none">
      {/* faint dot field */}
      {Array.from({ length: 12 }).map((_, r) =>
        Array.from({ length: 17 }).map((_, c) => (
          <circle key={`${r}-${c}`} cx={c * 20 + 6} cy={r * 20 + 6} r={1} fill="rgba(244,241,234,0.10)" />
        ))
      )}
      {links.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="rgba(242,101,34,0.5)" strokeWidth={1} className="route-line"
          style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          {hot.includes(i) && (
            <circle cx={n.x} cy={n.y} r={4} fill="#F26522" className="route-node"
              style={{ animationDelay: `${i * 0.4}s` }} />
          )}
          <circle cx={n.x} cy={n.y} r={hot.includes(i) ? 2 : 2.5}
            fill={hot.includes(i) ? "#F4F1EA" : "rgba(244,241,234,0.5)"} />
        </g>
      ))}
    </svg>
  );
}

const NAV = [
  { label: "Platform",    href: "#platform" },
  { label: "Forecasting", href: "#platform" },
  { label: "Agents",      href: "#platform" },
  { label: "Metrics",     href: "#metrics" },
];

const STATS = [
  "913K SALES ROWS", "88.3% MODEL R²", "3 AI AGENTS",
  "50 SKUs", "10 DARK STORES", "MAE 3.41 UNITS", "26.3% MAPE",
];

const FEATURES = [
  {
    n: "01", icon: TrendingUp, title: "LightGBM demand forecasting",
    body: "Time-series-aware model trained on 913K rows. Lag, rolling and EWM features predict every SKU to the day — dates remapped to your current timeline, festivals baked in.",
    tag: "88.3% R² · MAE 3.41",
  },
  {
    n: "02", icon: Bot, title: "Three agents draft your POs",
    body: "A LangGraph pipeline — demand → inventory → logistics — debates the signals, respects dark-store capacity, and hands you a costed purchase order to approve or reject.",
    tag: "Demand · Inventory · Logistics",
  },
  {
    n: "03", icon: Boxes, title: "Stockout radar",
    body: "Reorder points, safety stock and EOQ per SKU. Self-healing alerts clear themselves after restock, and the dashboard sorts by severity so the fire is always on top.",
    tag: "Reorder · Safety · EOQ",
  },
  {
    n: "04", icon: CalendarClock, title: "Festival-aware, shelf-aware",
    body: "Diwali, Holi, Navratri and more lift demand by category — but only when it's the right time to stock. Dairy won't be pre-ordered 59 days out; staples will.",
    tag: "Category stocking horizons",
  },
];

export default function Landing() {
  const [time, setTime] = useState("");
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const tick = () => setTime(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="landing min-h-screen w-full overflow-x-hidden">
      {/* ══ NAV ══ */}
      <div className="fixed top-0 inset-x-0 z-40 p-3 sm:p-4">
        <nav className="max-w-[1400px] mx-auto flex items-center justify-between gap-3
          rounded-full pl-3 pr-3 py-2.5"
          style={{ background: "rgba(10,33,36,0.72)", border: "1px solid var(--lnd-line)", backdropFilter: "blur(14px)" }}>
          {/* left */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <span className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F26522] transition-transform group-hover:scale-95">
                <span className="text-[12px] font-extrabold tracking-tight text-[#0A2124]">iQ</span>
              </span>
              <span className="font-extrabold tracking-tight text-[15px] text-[#F4F1EA]">InvenIQ</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {NAV.map((l) => (
                <a key={l.label} href={l.href} className="text-[13px] text-[#F4F1EA]/70 hover:text-[#F4F1EA] transition-colors">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          {/* right */}
          <div className="flex items-center gap-3">
            <span className="hidden lg:flex items-center gap-1.5 text-[12px] text-[#F4F1EA]/55 font-mono">
              <Clock className="w-3.5 h-3.5" /> {time || "--:--"} local
            </span>
            <Link href="/dashboard"
              className="group relative flex items-center gap-2 rounded-full bg-[#F26522] hover:bg-[#E05A1A] pl-4 pr-1.5 py-1.5 transition-colors">
              <span className="text-[13px] font-semibold text-[#0A2124]"><RollLabel text="Launch dashboard" /></span>
              <span className="w-6 h-6 rounded-full bg-[#0A2124] flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5 text-[#F26522] arrow-rot" />
              </span>
            </Link>
            <button onClick={() => setMenu(true)} className="md:hidden w-9 h-9 rounded-full bg-[#F4F1EA]/10 flex items-center justify-center">
              <Menu className="w-4 h-4 text-[#F4F1EA]" />
            </button>
          </div>
        </nav>
      </div>

      {/* ══ MOBILE MENU ══ */}
      {menu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenu(false)} />
          <div className="absolute inset-x-3 bottom-3 rounded-2xl p-6 bg-[#0E2A2E] border border-[#F4F1EA]/12 rise">
            <div className="flex items-center justify-between mb-6">
              <span className="lnd-eyebrow">{time} local</span>
              <button onClick={() => setMenu(false)} className="w-9 h-9 rounded-full bg-[#F4F1EA]/10 flex items-center justify-center">
                <X className="w-4 h-4 text-[#F4F1EA]" />
              </button>
            </div>
            <div className="flex flex-col gap-4 mb-6">
              {NAV.map((l) => (
                <a key={l.label} href={l.href} onClick={() => setMenu(false)} className="text-[26px] font-medium text-[#F4F1EA]">{l.label}</a>
              ))}
            </div>
            <Link href="/dashboard" className="flex items-center justify-between rounded-full bg-[#F26522] px-5 py-3.5">
              <span className="text-[15px] font-semibold text-[#0A2124]">Launch dashboard</span>
              <ArrowUpRight className="w-5 h-5 text-[#0A2124]" />
            </Link>
          </div>
        </div>
      )}

      {/* ══ HERO ══ */}
      <section className="relative min-h-screen flex flex-col overflow-hidden">
        {/* drifting glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="glow-a absolute -top-40 -left-32 w-[52vw] h-[52vw] rounded-full blur-[110px]"
            style={{ background: "radial-gradient(circle, rgba(242,101,34,0.42), transparent 65%)" }} />
          <div className="glow-b absolute top-1/3 -right-24 w-[46vw] h-[46vw] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(19,73,76,0.85), transparent 60%)" }} />
          <div className="absolute inset-0 opacity-[0.5]"
            style={{ backgroundImage: "radial-gradient(rgba(244,241,234,0.05) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        </div>

        <div className="flex-1" />
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 pb-16 lg:pb-24 pt-32">
          <div className="grid lg:grid-cols-[1fr_auto] items-end gap-12">
            {/* headline */}
            <div>
              <p className="lnd-eyebrow mb-6 rise">InvenIQ — Demand Intelligence</p>
              <h1 className="display-x text-[#F4F1EA] rise"
                style={{ fontSize: "clamp(3rem, 9vw, 8rem)", animationDelay: "0.05s" }}>
                Beyond<br />the<br /><span className="text-[#F26522]">stockout</span>
              </h1>
              <p className="mt-7 max-w-xl text-[15px] sm:text-[17px] leading-relaxed text-[#F4F1EA]/70 rise" style={{ animationDelay: "0.15s" }}>
                Demand intelligence for quick commerce. Forecast every SKU, prevent every
                stockout, and let AI agents draft the purchase orders — across your whole dark-store network.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row items-start sm:items-center gap-4 rise" style={{ animationDelay: "0.25s" }}>
                <Link href="/dashboard"
                  className="group flex items-center gap-2.5 rounded-full bg-[#F26522] hover:bg-[#E05A1A] pl-6 pr-2 py-2 transition-colors">
                  <span className="text-[14px] font-semibold text-[#0A2124]"><RollLabel text="Launch dashboard" /></span>
                  <span className="w-8 h-8 rounded-full bg-[#0A2124] flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-[#F26522] arrow-rot" />
                  </span>
                </Link>
                <div className="flex items-center gap-2.5 rounded-full bg-[#F4F1EA]/8 border border-[#F4F1EA]/12 pl-4 pr-3 py-2">
                  <span className="w-5 h-5 rounded-full bg-[#2E6E43] flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#F4F1EA]" />
                  </span>
                  <span className="text-[13px] font-medium text-[#F4F1EA]">Live model · LightGBM active</span>
                </div>
              </div>
            </div>

            {/* network graphic */}
            <div className="hidden lg:block w-[360px] rise" style={{ animationDelay: "0.2s" }}>
              <NetworkMap />
              <p className="mt-2 max-w-[280px] text-[12px] leading-relaxed text-[#F4F1EA]/55 ml-auto text-right">
                Live signals from every dark store, forecast to the day — orange nodes flag stockout risk.
              </p>
            </div>
          </div>
        </div>

        {/* bottom-left big stat, CARGOX-style */}
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 pb-8">
          <div className="flex items-end gap-3">
            <span className="display-x text-[#F26522] leading-none" style={{ fontSize: "clamp(2.2rem,5vw,3.4rem)" }}>913K+</span>
            <span className="text-[12px] leading-tight text-[#F4F1EA]/55 mb-1 max-w-[180px]">
              historical sales rows powering every forecast
            </span>
          </div>
        </div>
      </section>

      {/* ══ STAT MARQUEE ══ */}
      <div className="border-y border-[#F4F1EA]/12 py-4 overflow-hidden">
        <div className="flex w-max marquee-track">
          {[...STATS, ...STATS].map((s, i) => (
            <span key={i} className="flex items-center gap-4 px-6 text-[13px] font-mono tracking-wider text-[#F4F1EA]/70">
              {s} <span className="text-[#F26522]">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ══ PLATFORM / FEATURES ══ */}
      <section id="platform" className="bg-[#F4F1EA] text-[#0A2124]">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 py-20 lg:py-28">
          <div className="flex items-center gap-3 mb-7">
            <span className="w-7 h-7 rounded-full bg-[#0A2124] text-[#F4F1EA] text-[12px] font-semibold flex items-center justify-center">1</span>
            <span className="text-[12px] font-medium border border-[#0A2124]/15 rounded-full px-4 py-1.5">The platform</span>
          </div>
          <h2 className="font-medium tracking-tight leading-[1.1] max-w-3xl mb-14 lg:mb-20"
            style={{ fontSize: "clamp(1.8rem,4.5vw,3.4rem)" }}>
            Everything from raw sales to a signed purchase order — in one operations layer.
          </h2>

          <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
            {FEATURES.map((f) => (
              <div key={f.n} className="group rounded-2xl bg-[#FBFAF6] border border-[#0A2124]/8 p-7 lg:p-9
                transition-shadow hover:shadow-[0_12px_40px_rgba(10,33,36,0.10)]">
                <div className="flex items-start justify-between mb-6">
                  <span className="w-11 h-11 rounded-xl bg-[#0A2124] flex items-center justify-center">
                    <f.icon className="w-5 h-5 text-[#F26522]" />
                  </span>
                  <span className="font-mono text-[12px] text-[#0A2124]/35">{f.n}</span>
                </div>
                <h3 className="text-[20px] lg:text-[22px] font-semibold tracking-tight mb-3">{f.title}</h3>
                <p className="text-[14px] lg:text-[15px] leading-relaxed text-[#0A2124]/65 mb-5">{f.body}</p>
                <span className="inline-flex items-center gap-2 text-[12px] font-mono text-[#0A2124]/55 border-t border-[#0A2124]/10 pt-4 w-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F26522]" /> {f.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ METRICS ══ */}
      <section id="metrics" className="bg-[#0A2124]">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 py-20 lg:py-28">
          <div className="flex items-center gap-3 mb-7">
            <span className="w-7 h-7 rounded-full bg-[#F26522] text-[#0A2124] text-[12px] font-semibold flex items-center justify-center">2</span>
            <span className="text-[12px] font-medium text-[#F4F1EA]/80 border border-[#F4F1EA]/15 rounded-full px-4 py-1.5">Measured, not guessed</span>
          </div>
          <h2 className="display-x text-[#F4F1EA] leading-[0.95] mb-14" style={{ fontSize: "clamp(2.2rem,6vw,4.5rem)" }}>
            The numbers<br />behind the model
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#F4F1EA]/10 rounded-2xl overflow-hidden border border-[#F4F1EA]/10">
            {[
              { k: "88.3%", v: "Model R² — variance explained on held-out 2017 data" },
              { k: "3.41", v: "MAE — average unit error per SKU per day" },
              { k: "4.76", v: "RMSE — root mean squared error" },
              { k: "26.3%", v: "MAPE — mean absolute percentage error" },
            ].map((m) => (
              <div key={m.k} className="bg-[#0A2124] p-7 lg:p-9">
                <div className="display-x text-[#F26522] leading-none mb-4" style={{ fontSize: "clamp(2.4rem,4vw,3.6rem)" }}>{m.k}</div>
                <p className="text-[13px] leading-relaxed text-[#F4F1EA]/55">{m.v}</p>
              </div>
            ))}
          </div>

          {/* final CTA */}
          <div className="mt-16 lg:mt-24 rounded-3xl bg-gradient-to-br from-[#13494C] to-[#0E2A2E] border border-[#F4F1EA]/10 p-9 lg:p-14 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            <div>
              <p className="lnd-eyebrow mb-4">Ready when you are</p>
              <h3 className="display-x text-[#F4F1EA] leading-[0.95]" style={{ fontSize: "clamp(2rem,5vw,3.6rem)" }}>
                See your demand,<br />before it happens
              </h3>
            </div>
            <Link href="/dashboard"
              className="group flex items-center gap-3 rounded-full bg-[#F26522] hover:bg-[#E05A1A] pl-7 pr-2.5 py-2.5 transition-colors shrink-0">
              <span className="text-[15px] font-semibold text-[#0A2124]"><RollLabel text="Launch dashboard" /></span>
              <span className="w-9 h-9 rounded-full bg-[#0A2124] flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-[#F26522] arrow-rot" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="bg-[#0A2124] border-t border-[#F4F1EA]/10">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-[#F26522] flex items-center justify-center">
              <span className="text-[10px] font-extrabold text-[#0A2124]">iQ</span>
            </span>
            <span className="font-mono text-[12px] text-[#F4F1EA]/50">InvenIQ · FastAPI · MongoDB · Next.js · LightGBM</span>
          </div>
          <span className="font-mono text-[12px] text-[#F4F1EA]/40">Pattern model · 2013–2017 training data</span>
        </div>
      </footer>
    </div>
  );
}
