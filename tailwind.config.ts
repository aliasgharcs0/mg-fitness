import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["DM Serif Display", "Georgia", "serif"],
        headings: ["Oswald", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        matte: "#0a0a0a",
        obsidian: "#161616",
        brandOrange: "#FF4D00",
        brandYellow: "#FFC300",
        stealth: {
          void: "#0a0a0a",
          surface: "#161616",
        },
        /** Kept as aliases for legacy classes while migrating */
        cyberLime: "#FFC300",
        neonLime: "#FFC300",
        electricYellow: "#FFC300",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      backgroundImage: {
        // Industrial scanlines overlay
        "scanlines":
          "repeating-linear-gradient(to bottom, rgba(204,255,0,0.06) 0px, rgba(204,255,0,0.06) 1px, transparent 2px, transparent 6px)",
      },
      borderRadius: {
        lg: "var(--radius)",
        xl: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "calc(var(--radius) + 2px)",
      },
      boxShadow: {
        "card": "0 1px 3px 0 hsl(220 30% 12% / 0.04), 0 1px 2px -1px hsl(220 30% 12% / 0.04)",
        "card-hover": "0 4px 12px -2px hsl(220 30% 12% / 0.08), 0 2px 4px -2px hsl(220 30% 12% / 0.04)",
        "elevated": "0 10px 25px -5px hsl(220 30% 12% / 0.08), 0 4px 10px -6px hsl(220 30% 12% / 0.04)",
        "glow-cyber": "0 0 28px rgba(255, 77, 0, 0.35), 0 0 32px rgba(255, 195, 0, 0.35)",
        "glow-cyber-lg": "0 0 44px rgba(255, 77, 0, 0.48), 0 0 48px rgba(255, 195, 0, 0.48)",
        "neon-orange": "0 0 0 1px rgba(255,77,0,0.5), 0 0 18px rgba(255,77,0,0.35), 0 0 26px rgba(255,195,0,0.3)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.15s cubic-bezier(0.25,0.1,0.25,1)",
        "accordion-up": "accordion-up 0.15s cubic-bezier(0.25,0.1,0.25,1)",
        "fade-in": "fade-in 0.22s cubic-bezier(0.25,0.1,0.25,1) forwards",
        "slide-in-left": "slide-in-left 0.18s cubic-bezier(0.25,0.1,0.25,1) forwards",
        "count-up": "count-up 0.28s cubic-bezier(0.25,0.1,0.25,1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
