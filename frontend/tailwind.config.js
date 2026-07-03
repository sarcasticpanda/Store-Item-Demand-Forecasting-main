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
        // ── Warm paper surfaces (Light Ops Terminal) ─────────────
        ground:  "#F4F0E7",   // page background — warm paper
        surface: "#FFFDF9",   // cards / panels — bright paper
        panel:   "#EFE9DB",   // recessed areas / table headers
        sunk:    "#E7E0CF",   // deepest inset
        // ── Ink type scale (warm near-black) ─────────────────────
        ink: {
          DEFAULT: "#1B1712",  // primary text
          2:       "#4C463B",  // secondary text
          3:       "#8A8071",  // muted labels
          4:       "#B4AA97",  // faint / disabled
        },
        // ── Rules / hairlines ────────────────────────────────────
        rule: {
          DEFAULT: "#E1D9C7",  // hairline
          strong:  "#CDC3AC",  // emphasized divider
        },
        // ── Brand: deep ink-blue (interactive / active) ──────────
        brand: {
          DEFAULT: "#1C3D5A",
          ink:     "#12293D",
          soft:    "#E5EAF0",
        },
        // ── Signal colors — stock state only (stamp-ink tones) ───
        sig: {
          red:   "#B23B2E",   // critical / stockout
          amber: "#9A6B15",   // reorder
          green: "#2E6E43",   // ok / healthy
          blue:  "#2C5F86",   // overstock / info
        },
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        sans:    ["Archivo", "system-ui", "sans-serif"],
        mono:    ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        // squared-off, manifest feel — small radii only
        DEFAULT: "4px",
        md: "5px",
        lg: "6px",
        xl: "8px",
      },
      boxShadow: {
        // soft ink shadows, no glow
        card:       "0 1px 2px rgba(27,23,18,0.05), 0 1px 1px rgba(27,23,18,0.03)",
        "card-lift":"0 4px 14px rgba(27,23,18,0.08), 0 1px 3px rgba(27,23,18,0.04)",
        inset:      "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};
