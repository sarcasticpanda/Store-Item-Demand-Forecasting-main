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
        // Base surfaces — deep space dark
        bg: {
          base:   "#06070a",
          panel:  "#0d0f14",
          card:   "#111318",
          hover:  "#161921",
          border: "#1e2130",
          muted:  "#252838",
        },
        // Electric blue accent
        accent: {
          blue:   "#3b82f6",
          cyan:   "#06b6d4",
          violet: "#8b5cf6",
          green:  "#10b981",
          amber:  "#f59e0b",
          red:    "#ef4444",
        },
        // Glow shades for effects
        glow: {
          blue:   "rgba(59,130,246,0.15)",
          cyan:   "rgba(6,182,212,0.15)",
          violet: "rgba(139,92,246,0.15)",
          green:  "rgba(16,185,129,0.15)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(59,130,246,0.03) 1px,transparent 1px),linear-gradient(to right,rgba(59,130,246,0.03) 1px,transparent 1px)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        "grid": "32px 32px",
      },
      boxShadow: {
        "glow-blue":   "0 0 20px rgba(59,130,246,0.2), 0 0 60px rgba(59,130,246,0.05)",
        "glow-cyan":   "0 0 20px rgba(6,182,212,0.2),  0 0 60px rgba(6,182,212,0.05)",
        "glow-violet": "0 0 20px rgba(139,92,246,0.2), 0 0 60px rgba(139,92,246,0.05)",
        "glow-green":  "0 0 20px rgba(16,185,129,0.2), 0 0 60px rgba(16,185,129,0.05)",
        "card":        "0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
        "card-hover":  "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      animation: {
        "spotlight": "spotlight 2s ease .75s 1 forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "float": "float 6s ease-in-out infinite",
        "scan": "scan 4s linear infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite alternate",
      },
      keyframes: {
        spotlight: {
          "0%": { opacity: "0", transform: "translate(-72%, -62%) scale(0.5)" },
          "100%": { opacity: "1", transform: "translate(-50%,-40%) scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        glowPulse: {
          "0%": { boxShadow: "0 0 10px rgba(59,130,246,0.1)" },
          "100%": { boxShadow: "0 0 30px rgba(59,130,246,0.4)" },
        },
      },
    },
  },
  plugins: [],
};
