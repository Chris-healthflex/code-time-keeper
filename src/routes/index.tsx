import { createFileRoute } from "@tanstack/react-router";
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

function Landing() {
  return (
    <main className="relative h-svh overflow-hidden bg-black">
      <ClientOnlyHero />
    </main>
  );
}
