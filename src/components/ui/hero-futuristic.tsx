import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import logoWhite from '@/assets/logo-white.png';

const DEFAULT_HEADLINE = "Your assignment\nawaits.";
const DEFAULT_SUBTITLE =
  "You've been invited to a timed coding challenge. One secure link, one shot — the clock starts the moment you open it.";
const DEFAULT_CTA = "Open your assignment →";

interface HeroProps {
  headline?: string;
  subtitle?: string;
  ctaText?: string;
  ctaTo?: string;
  onCtaClick?: () => void;
}

export function HeroFuturistic({
  headline = DEFAULT_HEADLINE,
  subtitle = DEFAULT_SUBTITLE,
  ctaText = DEFAULT_CTA,
  ctaTo = "/auth",
  onCtaClick,
}: HeroProps = {}) {
  const [phase, setPhase] = useState<"hidden" | "headline" | "sub" | "cta">("hidden");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("headline"), 120);
    const t2 = setTimeout(() => setPhase("sub"), 820);
    const t3 = setTimeout(() => setPhase("cta"), 1260);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const lines = headline.split("\n");

  return (
    <div className="relative h-svh overflow-hidden">
      {/* Stance Health logo — top-left, larger */}
      <div
        className="absolute top-0 left-0 z-20 p-6 transition-opacity duration-700"
        style={{ opacity: phase === "hidden" ? 0 : 1 }}
      >
        <Link to="/">
          <img src={logoWhite} alt="Stance Health" className="h-10 w-auto invert dark:invert-0" />
        </Link>
      </div>

      {/* Centered content */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
        {/* Headline */}
        <h1 className="text-5xl font-extrabold uppercase tracking-tight sm:text-7xl xl:text-8xl">
          {lines.map((line, i) => (
            <span
              key={i}
              className="block transition-all duration-700"
              style={{
                opacity: phase === "hidden" ? 0 : i === 0 ? 1 : 0.75,
                transform: phase === "hidden" ? "translateY(18px)" : "translateY(0)",
                transitionDelay: `${i * 80}ms`,
                color: "var(--foreground)",
              }}
            >
              {line}
            </span>
          ))}
        </h1>

        {/* Subtitle */}
        <p
          className="mt-6 max-w-md text-[15px] leading-relaxed sm:text-base transition-all duration-700"
          style={{
            opacity: phase === "sub" || phase === "cta" ? 1 : 0,
            transform: phase === "sub" || phase === "cta" ? "translateY(0)" : "translateY(10px)",
            color: "var(--foreground)",
          }}
        >
          {subtitle}
        </p>

        {/* CTA */}
        <div
          className="pointer-events-auto mt-8 transition-all duration-500"
          style={{
            opacity: phase === "cta" ? 1 : 0,
            transform: phase === "cta" ? "translateY(0)" : "translateY(8px)",
          }}
        >
          {onCtaClick ? (
            <button
              onClick={onCtaClick}
              className="inline-flex rounded-full border border-neutral-900/15 dark:border-white/25 bg-neutral-900 dark:bg-white px-7 py-3 text-sm font-semibold text-white dark:text-black shadow-sm transition-opacity hover:opacity-85 normal-case"
            >
              {ctaText}
            </button>
          ) : (
            <Link
              to={ctaTo as "/"}
              className="inline-flex rounded-full border border-neutral-900/15 dark:border-white/25 bg-neutral-900 dark:bg-white px-7 py-3 text-sm font-semibold text-white dark:text-black shadow-sm transition-opacity hover:opacity-85 normal-case"
            >
              {ctaText}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default HeroFuturistic;
