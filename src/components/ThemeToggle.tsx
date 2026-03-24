import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "pill";
}

export default function ThemeToggle({ className = "", variant = "icon" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  // Requirement: mandatory true dark mode.
  // Keep the UI element non-destructive and always force `dark`.
  const toggle = () => setTheme("dark");

  if (variant === "pill") {
    return (
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 ${className}`}
      >
        <Sun className="h-3.5 w-3.5" />
        STEALTH
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-sm transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground ${className}`}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4" />
    </button>
  );
}
