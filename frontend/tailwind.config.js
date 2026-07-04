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
        // ── Deep teal ground (matches landing) ───────────────────
        ground:  "#0A2124",   // page background — deep teal-black
        surface: "#0E2A2E",   // cards / panels
        panel:   "#14383B",   // recessed / chips / table headers
        sunk:    "#071A1C",   // deepest inset (progress tracks)
        // ── Cream ink type scale ─────────────────────────────────
        ink: {
          DEFAULT: "#F4F1EA",  // primary text (warm cream)
          2:       "#B8C4BF",  // secondary
          3:       "#7E908B",  // muted labels
          4:       "#566863",  // faint
        },
        // ── Rules / hairlines ────────────────────────────────────
        rule: {
          DEFAULT: "#1E3B3E",
          strong:  "#2C4F52",
        },
        // ── Brand: orange (interactive / active) ─────────────────
        brand: {
          DEFAULT: "#F26522",
          ink:     "#E05A1A",
          soft:    "rgba(242,101,34,0.15)",
        },
        // ── Signal colors — stock state (bright for dark) ────────
        sig: {
          red:   "#F87171",   // critical / stockout
          amber: "#F5A524",   // reorder
          green: "#34D399",   // ok / healthy
          blue:  "#60A5FA",   // overstock / info
        },
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        sans:    ["Archivo", "system-ui", "sans-serif"],
        mono:    ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "4px",
        md: "5px",
        lg: "6px",
        xl: "8px",
      },
      boxShadow: {
        card:       "0 1px 2px rgba(0,0,0,0.28)",
        "card-lift":"0 8px 30px rgba(0,0,0,0.35)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};
