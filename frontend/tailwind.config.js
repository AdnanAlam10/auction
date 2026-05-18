/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14110D",
          soft: "#2C2820",
          muted: "#6B6557",
        },
        paper: {
          DEFAULT: "#EFE9DD",
          2: "#E3DCCB",
          3: "#D7CFBA",
          warm: "#EDD9C0",
        },
        vermillion: {
          DEFAULT: "#C73E17",
          deep: "#7A2A0E",
          glow: "#E85A2C",
        },
        gold: "#B08850",
        moss: "#5C6B3F",
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Geist"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "Menlo", "monospace"],
      },
      letterSpacing: {
        widest2: "0.25em",
      },
      keyframes: {
        "extended-flash": {
          "0%": { opacity: "0" },
          "10%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "bid-pop": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "60%": { transform: "translateY(-2px)", opacity: "1" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "live-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.85)" },
        },
        "tick-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.04)" },
        },
      },
      animation: {
        "extended-flash": "extended-flash 900ms ease-out forwards",
        "bid-pop": "bid-pop 350ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        "live-pulse": "live-pulse 1.6s ease-in-out infinite",
        "tick-pulse": "tick-pulse 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
