import { createFileRoute, Link } from "@tanstack/react-router";
import logoWhite from "@/assets/logo-white.png";
import { useState, useEffect, type ComponentType } from "react";

// Dynamic import inside useEffect — the ONLY pattern that guarantees the module
// (and its postprocessing/three deps) is never evaluated during SSR.
// React.lazy still lets Vite bundle the module into the server entry and evaluate
// it at load time; useEffect never runs on the server.
function ClientOnlyHero() {
  const [Hero, setHero] = useState<ComponentType | null>(null);

  useEffect(() => {
    import("@/components/ui/hero-futuristic").then((m) => {
      setHero(() => m.HeroFuturistic);
    });
  }, []);

  if (!Hero) return <div className="h-svh bg-black" />;
  return <Hero />;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stance Health — Timed Coding Assignments" },
      {
        name: "description",
        content:
          "Stance Health's secure, timed take-home assignment platform: server-side timers, encrypted one-time links, and automatic submission windows.",
      },
      { property: "og:title", content: "Stance Health — Timed Coding Assignments" },
      {
        property: "og:description",
        content: "Secure timed take-home assignments with server-side timers and automatic submission windows.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const logos = [
  "DocuSign",
  "loom",
  "maze",
  "brage",
  "De Airwallex",
  "WIRED",
  "Forbes",
  "Evernote",
  "INTERCOM",
  "drips",
  "Linear",
  "Culture Amp",
];

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      {/* Hero with navbar floating on top of it */}
      <div className="relative">
        <ClientOnlyHero />

        {/* Navbar floats over the hero */}
        <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-8 py-6 text-[13px] text-white/70">
          <span className="flex items-center gap-2 font-medium text-white">
            <img src={logoWhite} alt="Stance Health" className="h-10 w-auto" />
          </span>
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#platform" className="transition-colors hover:text-white">
              Platform
            </a>
            <a href="#how" className="transition-colors hover:text-white">
              How it works
            </a>
            <a href="#security" className="transition-colors hover:text-white">
              Security
            </a>
          </nav>
          <Link
            to="/auth"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[13px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            Sign in
          </Link>
        </header>
      </div>

      <section className="relative z-10 border-t border-border/70 px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[11px] font-medium tracking-wide text-muted-foreground/70">
          {logos.map((logo) => (
            <span key={logo}>{logo}</span>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto grid max-w-6xl gap-4 px-6 py-20 md:grid-cols-3">
        {[
          {
            k: "01",
            t: "Invite by email",
            d: "Each candidate gets a signed, single-use link bound to their email and assignment.",
          },
          {
            k: "02",
            t: "Server-side clock",
            d: "The timer starts on first open. Start time, deadline and grace window live only on the server.",
          },
          {
            k: "03",
            t: "Automatic close",
            d: "At zero, a 10-minute push window email fires. After that, the link is permanently dead.",
          },
        ].map((item) => (
          <article key={item.k} className="panel p-6 text-left">
            <span className="text-mono text-[11px] text-muted-foreground">{item.k}</span>
            <h2 className="mt-3 text-base font-medium">{item.t}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{item.d}</p>
          </article>
        ))}
      </section>

      <footer id="security" className="border-t border-border/70 px-6 py-8 text-center text-[12px] text-muted-foreground">
        Signed JWT links · full audit trail · server-authoritative timing · Stance Health
      </footer>
    </main>
  );
}
