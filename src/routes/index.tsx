import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type ComponentType } from "react";

function ClientOnlyBackground() {
  const [Bg, setBg] = useState<ComponentType | null>(null);

  useEffect(() => {
    import("@/components/ui/neon-dither").then((m) => {
      setBg(() => m.PaperDesignBackground as ComponentType);
    });
  }, []);

  if (!Bg) return null;
  return <Bg />;
}

function ClientOnlyHero() {
  const [Hero, setHero] = useState<ComponentType | null>(null);

  useEffect(() => {
    import("@/components/ui/hero-futuristic").then((m) => {
      setHero(() => m.HeroFuturistic);
    });
  }, []);

  if (!Hero) return <div className="h-svh" />;
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

function Landing() {
  return (
    <main className="relative h-svh overflow-hidden">
      <ClientOnlyBackground />
      <ClientOnlyHero />
    </main>
  );
}
