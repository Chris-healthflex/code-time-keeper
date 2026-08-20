import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start with "dark" for SSR consistency; hydrate from <html> class on mount
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Pick up whatever the inline FOUC-prevention script already applied
    const initial = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(initial);

    // Keep in sync with OS changes when user has no saved preference
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onOsChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        const next: Theme = e.matches ? "dark" : "light";
        document.documentElement.classList.toggle("dark", e.matches);
        setTheme(next);
      }
    };
    mq.addEventListener("change", onOsChange);
    return () => mq.removeEventListener("change", onOsChange);
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("theme", next);
      return next;
    });
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Inline script content — injected into <head> before first paint to prevent FOUC.
// Keep this as a plain string (no imports) so it can safely run before hydration.
export const themeInitScript = `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t!='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}})();`;
