module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b1120",
        surface: "#161f33",
        elevated: "#1e2d47",
        primary: "#38bdf8",
        secondary: "#818cf8",
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#ef4444",
        "text-primary": "#f0f6ff",
        "text-secondary": "#e2e8f0",
        "text-muted": "#cbd5e1",
        border: "#475569",
      },
      fontFamily: {
        display: ["DM Sans", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
