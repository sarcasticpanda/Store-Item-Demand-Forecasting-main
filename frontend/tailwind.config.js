/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Deep navy surfaces (not black) ───────────────────────
        bg: {
          base:   "#03070E",   // deepest navy
          panel:  "#06101C",   // panel navy
          card:   "#091522",   // card navy
          hover:  "#0C1A2A",
          border: "#0F2236",   // navy border
          muted:  "#152B44",   // muted navy
        },
        // ── Primary accent: amber/saffron (replaces blue) ─────────
        accent: {
          blue:   "#60A5FA",   // muted sky (demoted — info only)
          cyan:   "#10B981",   // emerald green (replaces cyan)
          violet: "#A78BFA",   // soft violet
          green:  "#22C55E",   // vivid green
          amber:  "#F59E0B",   // AMBER — primary action color
          red:    "#F87171",   // warm red
        },
        // ── Sidebar forest green ──────────────────────────────────
        forest: {
          900: "#030C06",
          800: "#051009",
          700: "#08180D",
          600: "#0D2415",
          500: "#16A34A",
        },
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        sans:    ["Inter", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        // amber-tinted grid instead of blue
        "grid-pattern": "linear-gradient(rgba(245,158,11,0.018) 1px,transparent 1px),linear-gradient(to right,rgba(245,158,11,0.018) 1px,transparent 1px)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      backgroundSize: {
        "grid": "40px 40px",
      },
      boxShadow: {
        "glow-amber":  "0 0 24px rgba(245,158,11,0.25), 0 0 60px rgba(245,158,11,0.06)",
        "glow-green":  "0 0 24px rgba(34,197,94,0.2),  0 0 60px rgba(34,197,94,0.05)",
        "glow-violet": "0 0 24px rgba(167,139,250,0.2), 0 0 60px rgba(167,139,250,0.05)",
        "card":        "0 1px 4px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.025)",
        "card-hover":  "0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
        "card-amber":  "0 0 0 1px rgba(245,158,11,0.15), 0 4px 20px rgba(245,158,11,0.06)",
      },
      animation: {
        "spotlight": "spotlight 2s ease .75s 1 forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "float": "float 6s ease-in-out infinite",
        "scan": "scan 8s linear infinite",
      },
      keyframes: {
        spotlight: {
          "0%":   { opacity: "0", transform: "translate(-72%, -62%) scale(0.5)" },
          "100%": { opacity: "1", transform: "translate(-50%,-40%) scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        scan: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
};
