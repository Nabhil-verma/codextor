/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // Display face follows the style setting (`.style-minimal` in
        // src/index.css): Space Grotesk by default, Fraunces in minimal gold.
        display: [
          "var(--font-display, 'Space Grotesk', Inter, system-ui, sans-serif)",
        ],
        mono: ["'JetBrains Mono'", "'Fira Code'", "ui-monospace", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      /*
       * Every color resolves through a CSS variable (declared in src/index.css
       * for both :root and .dark), so the whole palette — surfaces, text,
       * borders and accents — flips with one class on <html>. Values are
       * space-separated RGB channels so Tailwind's `/opacity` modifiers keep
       * working unchanged.
       *
       * Token names are historical: `paper` = surface, `ink` = text, and
       * `gold` is now the Cyan Pulse accent (#00E5FF in night mode). Keeping
       * the names means every existing class re-themes without a rewrite.
       */
      colors: {
        paper: {
          DEFAULT: "rgb(var(--paper) / <alpha-value>)",
          50: "rgb(var(--paper-50) / <alpha-value>)",
          100: "rgb(var(--paper-100) / <alpha-value>)",
          200: "rgb(var(--paper-200) / <alpha-value>)",
          300: "rgb(var(--paper-300) / <alpha-value>)",
        },
        ink: {
          50: "rgb(var(--ink-50) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          850: "rgb(var(--ink-850) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          950: "rgb(var(--ink-950) / <alpha-value>)",
        },
        gold: {
          300: "rgb(var(--gold-300) / <alpha-value>)",
          400: "rgb(var(--gold-400) / <alpha-value>)",
          500: "rgb(var(--gold-500) / <alpha-value>)",
          600: "rgb(var(--gold-600) / <alpha-value>)",
          700: "rgb(var(--gold-700) / <alpha-value>)",
        },
      },
      boxShadow: {
        glow: "0 0 24px rgba(0, 229, 255, 0.22)",
        neon: "0 0 30px rgba(0, 229, 255, 0.28), 0 0 80px -10px rgba(0, 229, 255, 0.18)",
        violet: "0 0 30px rgba(139, 92, 246, 0.28)",
        emerald: "0 0 20px rgba(16, 185, 129, 0.3)",
        amber: "0 0 20px rgba(245, 158, 11, 0.3)",
        lift: "0 1px 2px rgba(0, 0, 0, 0.18), 0 12px 40px -12px rgba(0, 0, 0, 0.35)",
      },
      transitionTimingFunction: {
        // The signature easing: fast out, long settle.
        snap: "cubic-bezier(0.25, 1, 0.5, 1)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.8s infinite",
        float: "float 6s ease-in-out infinite",
        blink: "blink 1s steps(1) infinite",
        "pulse-ring": "pulseRing 2s cubic-bezier(0.25, 1, 0.5, 1) infinite",
      },
    },
  },
  plugins: [],
};
