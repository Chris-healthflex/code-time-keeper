import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import logoWhite from '@/assets/logo-white.png';

const TITLE_WORDS = ['Timed', 'assignments.', 'Zero', 'tampering.'];
const SUBTITLE =
  'One encrypted link per candidate. The clock starts server-side the moment they open it — and closes itself exactly on time.';

interface HeroProps {
  titleWords?: string[];
  subtitle?: string;
  ctaText?: string;
  ctaTo?: string;
  onCtaClick?: () => void;
}

export function HeroFuturistic({
  titleWords = TITLE_WORDS,
  subtitle = SUBTITLE,
  ctaText = "Go to dashboard →",
  ctaTo = "/auth",
  onCtaClick,
}: HeroProps = {}) {
  const [visibleWords, setVisibleWords] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [delays, setDelays] = useState<number[]>([]);

  useEffect(() => {
    setDelays(titleWords.map(() => Math.random() * 0.07));
  }, [titleWords]);

  useEffect(() => {
    if (visibleWords < titleWords.length) {
      const t = setTimeout(() => setVisibleWords((v) => v + 1), 480);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSubtitleVisible(true), 600);
    return () => clearTimeout(t);
  }, [visibleWords, titleWords]);

  return (
    <div className="relative h-svh overflow-hidden">
      {/* Stance Health logo — top-left */}
      <div className="absolute top-0 left-0 z-20 p-6">
        <img src={logoWhite} alt="Stance Health" className="h-7 w-auto invert dark:invert-0" />
      </div>

      {/* Title — upper area */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center pt-28 px-10 sm:pt-32">
        <h1
          className="text-center text-4xl font-extrabold uppercase tracking-tight text-neutral-900 dark:text-white sm:text-6xl xl:text-7xl"
        >
          <span className="flex flex-wrap justify-center gap-x-3 leading-tight lg:gap-x-5">
            {titleWords.map((word, i) => (
              <span
                key={i}
                className={i < visibleWords ? 'hero-fade-in' : ''}
                style={{
                  animationDelay: `${i * 0.12 + (delays[i] ?? 0)}s`,
                  opacity: i < visibleWords ? undefined : 0,
                  display: 'inline-block',
                }}
              >
                {word}
              </span>
            ))}
          </span>
        </h1>
      </div>

      {/* Subtitle + CTA — bottom area */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center pb-16 px-10">
        <p
          className={`max-w-md text-center text-sm font-medium leading-relaxed normal-case sm:text-base ${subtitleVisible ? 'hero-fade-in-sub' : ''}`}
          style={{
            opacity: subtitleVisible ? undefined : 0,
            color: 'var(--foreground)',
          }}
        >
          {subtitle}
        </p>

        <div className="pointer-events-auto mt-6">
          {onCtaClick ? (
            <button
              onClick={onCtaClick}
              className={`inline-flex rounded-full border border-neutral-900/15 dark:border-white/25 bg-neutral-900 dark:bg-white px-6 py-2.5 text-sm font-medium text-white dark:text-black shadow-sm transition-opacity hover:opacity-90 normal-case ${subtitleVisible ? 'hero-fade-in-sub' : ''}`}
              style={{
                opacity: subtitleVisible ? undefined : 0,
                animationDelay: '0.25s',
              }}
            >
              {ctaText}
            </button>
          ) : (
            <Link
              to={ctaTo as "/"}
              className={`inline-flex rounded-full border border-neutral-900/15 dark:border-white/25 bg-neutral-900 dark:bg-white px-6 py-2.5 text-sm font-medium text-white dark:text-black shadow-sm transition-opacity hover:opacity-90 normal-case ${subtitleVisible ? 'hero-fade-in-sub' : ''}`}
              style={{
                opacity: subtitleVisible ? undefined : 0,
                animationDelay: '0.25s',
              }}
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
