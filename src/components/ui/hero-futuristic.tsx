import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import PixelBlast from './PixelBlast';
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
    <div className="relative h-svh overflow-hidden bg-black">
      <style>{`
        @keyframes heroBgPulse {
          0% { opacity: 0.45; transform: scale(1); }
          100% { opacity: 0.9; transform: scale(1.12); }
        }
      `}</style>

      {/* Gradient layer — always visible, animates even if WebGL fails */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 25% 55%, rgba(70,50,220,0.38) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 75% 45%, rgba(40,80,200,0.18) 0%, transparent 65%)',
          animation: 'heroBgPulse 5s ease-in-out infinite alternate',
        }}
      />

      {/* PixelBlast fills the entire hero (transparent — blends over gradient) */}
      <div className="absolute inset-0">
        <PixelBlast
          variant="circle"
          pixelSize={6}
          color="#5566ee"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
      </div>

      {/* Stance Health logo — top-left */}
      <div className="absolute top-0 left-0 z-20 p-6">
        <img src={logoWhite} alt="Stance Health" className="h-7 w-auto" />
      </div>

      {/* Title — upper area */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center pt-28 px-10 sm:pt-32">
        <h1
          className="text-center text-4xl font-extrabold uppercase tracking-tight text-white sm:text-6xl xl:text-7xl"
          style={{ textShadow: '0 2px 40px rgba(0,0,0,0.8)' }}
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
            color: 'rgba(255,255,255,0.85)',
            textShadow: '0 2px 20px rgba(0,0,0,1), 0 0 60px rgba(0,0,0,0.9)',
          }}
        >
          {subtitle}
        </p>

        <div className="pointer-events-auto mt-6">
          {onCtaClick ? (
            <button
              onClick={onCtaClick}
              className={`inline-flex rounded-full border border-white/25 bg-white px-6 py-2.5 text-sm font-medium text-black shadow-sm transition-opacity hover:opacity-90 normal-case ${subtitleVisible ? 'hero-fade-in-sub' : ''}`}
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
              className={`inline-flex rounded-full border border-white/25 bg-white px-6 py-2.5 text-sm font-medium text-black shadow-sm transition-opacity hover:opacity-90 normal-case ${subtitleVisible ? 'hero-fade-in-sub' : ''}`}
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
