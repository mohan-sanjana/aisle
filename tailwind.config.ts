import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}",
  ],
  // Light mode only — Phase 1 explicitly excludes dark mode.
  darkMode: ["class", "[data-theme='never']"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1180px",
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        brand: {
          50: "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          200: "rgb(var(--brand-200) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
          800: "rgb(var(--brand-800) / <alpha-value>)",
          900: "rgb(var(--brand-900) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Locked type ramp (see spec section 5.1)
        h1: ["36px", { lineHeight: "1.15", fontWeight: "700" }],
        h2: ["28px", { lineHeight: "1.2", fontWeight: "600" }],
        h3: ["22px", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        small: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        mono: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
      },
      boxShadow: {
        // Spec: shadows only on hover popovers and modals.
        popover: "0 8px 24px -6px rgba(15, 23, 42, 0.12), 0 2px 8px -2px rgba(15, 23, 42, 0.08)",
      },
      // Customizations for the @tailwindcss/typography `prose` class.
      // Knowledge modules wrap MDX content in <article class="prose prose-lg">
      // and inherit these rules.
      typography: {
        DEFAULT: {
          css: {
            "--tw-prose-body": "rgb(30 41 59)",
            "--tw-prose-headings": "rgb(15 23 42)",
            "--tw-prose-lead": "rgb(51 65 85)",
            "--tw-prose-bold": "rgb(15 23 42)",
            "--tw-prose-bullets": "rgb(21 128 61)", // brand-700
            "--tw-prose-links": "rgb(21 128 61)",
            "--tw-prose-code": "rgb(15 23 42)",
            "--tw-prose-hr": "rgb(226 232 240)",
            "--tw-prose-quotes": "rgb(15 23 42)",
            maxWidth: "70ch",
            "h2, h3, h4": {
              scrollMarginTop: "6rem",
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
