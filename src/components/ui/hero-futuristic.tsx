import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import PixelBlast from './PixelBlast';

const TITLE_WORDS = ['Timed', 'assignments.', 'Zero', 'tampering.'];
const SUBTITLE =
  'One encrypted link per candidate. The clock starts server-side the moment they open it — and closes itself exactly on time.';

export function HeroFuturistic() {
  const [visibleWords, setVisibleWords] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [delays, setDelays] = useState<number[]>([]);

  useEffect(() => {
    setDelays(TITLE_WORDS.map(() => Math.random() * 0.07));
  }, []);

  useEffect(() => {
    if (visibleWords < TITLE_WORDS.length) {
      const t = setTimeout(() => setVisibleWords((v) => v + 1), 480);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSubtitleVisible(true), 600);
    return () => clearTimeout(t);
  }, [visibleWords]);

  return (
    <div className="relative h-svh overflow-hidden bg-black">
      {/* PixelBlast fills the entire hero */}
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

      {/* Title — upper area */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center pt-28 px-10 sm:pt-32">
        <h1
          className="text-center text-4xl font-extrabold uppercase tracking-tight text-white sm:text-6xl xl:text-7xl"
          style={{ textShadow: '0 2px 40px rgba(0,0,0,0.8)' }}
        >
          <span className="flex flex-wrap justify-center gap-x-3 leading-tight lg:gap-x-5">
            {TITLE_WORDS.map((word, i) => (
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
          className={`max-w-sm text-center text-sm font-medium leading-relaxed normal-case sm:text-base ${subtitleVisible ? 'hero-fade-in-sub' : ''}`}
          style={{
            opacity: subtitleVisible ? undefined : 0,
            color: 'rgba(255,255,255,0.85)',
            textShadow: '0 2px 20px rgba(0,0,0,1), 0 0 60px rgba(0,0,0,0.9)',
          }}
        >
          {SUBTITLE}
        </p>

        <div className="pointer-events-auto mt-6">
          <Link
            to="/auth"
            className={`cta-glow inline-flex px-6 py-2.5 text-sm font-medium normal-case ${subtitleVisible ? 'hero-fade-in-sub' : ''}`}
            style={{
              opacity: subtitleVisible ? undefined : 0,
              animationDelay: '0.25s',
            }}
          >
            Open admin console
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HeroFuturistic;
