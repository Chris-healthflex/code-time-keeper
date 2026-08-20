import { useMemo } from "react";
import { Dithering } from "@paper-design/shaders-react";
import { useTheme } from "@/lib/theme";

export function PaperDesignBackground({ className = "" }: { className?: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const config = useMemo(() => {
    if (isDark) {
      return {
        back: "#00000000",
        front: "#3a2b00",   // dimmer amber — less overwhelming
        bg: "#000000",
        speed: 0.4,
        size: 2,            // smaller dots
        scale: 0.85,        // tighter pattern
        opacity: 0.55,      // overall layer opacity
        glow: "radial-gradient(55% 35% at 50% 40%, rgba(255,200,70,0.06), transparent 70%)",
        glowBlend: "screen" as const,
      };
    }
    return {
      back: "#00000000",
      front: "#9fb3e8",   // light periwinkle — stays clearly lighter than dark text
      bg: "#f4f7ff",
      speed: 0.3,
      size: 2,
      scale: 0.85,
      opacity: 0.35,      // much more subtle in light mode
      glow: "radial-gradient(55% 35% at 50% 40%, rgba(80,120,255,0.05), transparent 70%)",
      glowBlend: "multiply" as const,
    };
  }, [isDark]);

  return (
    <div
      className={["pointer-events-none fixed inset-0 z-0 transition-colors duration-500", className].join(" ")}
      style={{ backgroundColor: config.bg }}
    >
      <div style={{ opacity: config.opacity }}>
        <Dithering
          colorBack={config.back}
          colorFront={config.front}
          speed={config.speed}
          shape="wave"
          type="4x4"
          size={config.size}
          scale={config.scale}
          style={{ height: "100vh", width: "100vw" }}
        />
      </div>

      {/* Glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: config.glow, mixBlendMode: config.glowBlend }}
      />

      {/* Vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.20) 100%)" }}
      />

      {/* Film grain */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.25' numOctaves='2' stitchTiles='stitch'/%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.11'/%3E%3C/filter%3E%3C/svg%3E\")",
          opacity: 0.4,
          mixBlendMode: isDark ? "screen" : "multiply",
        }}
      />
    </div>
  );
}
