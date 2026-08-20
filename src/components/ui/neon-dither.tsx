import { useEffect, useMemo, useState } from "react";
import { Dithering } from "@paper-design/shaders-react";

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

type ThemeMode = "light" | "dark" | "system";

interface PaperDesignBackgroundProps {
  themeMode?: ThemeMode;
  intensity?: number;
  parallax?: boolean;
  className?: string;
}

export function PaperDesignBackground({
  themeMode = "system",
  intensity = 0.8,
  parallax = true,
  className = "",
}: PaperDesignBackgroundProps) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (themeMode === "dark") return true;
    if (themeMode === "light") return false;
    return getSystemPrefersDark();
  });

  // Keep Tailwind dark class in sync with system or prop
  useEffect(() => {
    const root = document.documentElement;
    const applyDark = (dark: boolean) => root.classList.toggle("dark", dark);

    if (themeMode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
        applyDark(e.matches);
      };
      applyDark(getSystemPrefersDark());
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      const dark = themeMode === "dark";
      setIsDark(dark);
      applyDark(dark);
      return undefined;
    }
  }, [themeMode]);

  const config = useMemo(() => {
    const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
    const t = clamp(intensity);

    if (isDark) {
      return {
        back: "#00000000",
        front: mix("#614B00", "#A87C00", t * 0.35),
        bg: "#000000",
        speed: 0.28 + t * 0.35,
        px: Math.round(2 + t * 2),
        scale: 1.05 + t * 0.15,
        glow: "radial-gradient(60% 40% at 50% 40%, rgba(255,210,90,0.10), transparent 70%)",
      };
    } else {
      return {
        back: "#00000000",
        front: mix("#3956A3", "#7FA4FF", t * 0.35),
        bg: "#F7FAFF",
        speed: 0.22 + t * 0.28,
        px: Math.round(2 + t * 2),
        scale: 1.03 + t * 0.12,
        glow: "radial-gradient(60% 40% at 50% 40%, rgba(120,165,255,0.10), transparent 70%)",
      };
    }
  }, [isDark, intensity]);

  // Optional mouse parallax
  useEffect(() => {
    if (!parallax) return;
    const root = document.getElementById("paper-bg-parallax");
    if (!root) return;
    const strength = 8;
    const onMove = (e: MouseEvent) => {
      const { innerWidth: w, innerHeight: h } = window;
      const x = (e.clientX / w) * 2 - 1;
      const y = (e.clientY / h) * 2 - 1;
      root.style.setProperty("--parallax-x", `${(-x * strength).toFixed(2)}px`);
      root.style.setProperty("--parallax-y", `${(-y * strength).toFixed(2)}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [parallax]);

  return (
    <div
      id="paper-bg-parallax"
      className={["pointer-events-none fixed inset-0 z-0 transition-colors duration-500", className].join(" ")}
      style={{
        backgroundColor: config.bg,
        transform: parallax ? "translate3d(var(--parallax-x,0), var(--parallax-y,0), 0)" : undefined,
        willChange: parallax ? "transform" : undefined,
      }}
    >
      <Dithering
        colorBack={config.back}
        colorFront={config.front}
        speed={config.speed}
        shape="wave"
        type="4x4"
        size={config.px}
        scale={config.scale}
        style={{ height: "100vh", width: "100vw" }}
      />

      {/* Theme-aware glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: config.glow,
          mixBlendMode: isDark ? "screen" : "multiply",
        }}
      />

      {/* Vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: "radial-gradient(120% 80% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.22) 100%)",
        }}
      />

      {/* Film grain */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.25' numOctaves='2' stitchTiles='stitch'/%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.11'/%3E%3C/filter%3E%3C/svg%3E\")",
          backgroundSize: "cover",
          opacity: 0.45,
          mixBlendMode: isDark ? "screen" : "multiply",
        }}
      />

      {/* Top shine */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 35%)",
          opacity: isDark ? 0.25 : 0.4,
        }}
      />
    </div>
  );
}

function mix(a: string, b: string, t: number): string {
  const ai = parseInt(a.replace("#", ""), 16);
  const bi = parseInt(b.replace("#", ""), 16);
  const ar = (ai >> 16) & 0xff, ag = (ai >> 8) & 0xff, ab = ai & 0xff;
  const br = (bi >> 16) & 0xff, bg = (bi >> 8) & 0xff, bb = bi & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1)}`;
}
