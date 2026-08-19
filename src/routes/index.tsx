import { createFileRoute, Link } from "@tanstack/react-router";
import dotWorld from "@/assets/dot-world.jpg";

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
    <main className="relative min-h-screen overflow-hidden bg-background">
      <header className="relative z-10 flex items-center justify-center gap-8 py-6 text-[13px] text-muted-foreground">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <span className="inline-block size-4 rounded-[5px] bg-primary" />
          Stance Health
        </span>
        <nav className="hidden items-center gap-7 md:flex">
          <a href="#platform" className="transition-colors hover:text-foreground">
            Platform
          </a>
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#security" className="transition-colors hover:text-foreground">
            Security
          </a>
        </nav>
        <Link
          to="/auth"
          className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Sign in
        </Link>
      </header>

      <section className="relative flex min-h-[74vh] flex-col items-center justify-center px-6 text-center">
        <img
          src={dotWorld}
          alt=""
          aria-hidden="true"
          width={1920}
          height={912}
          className="pointer-events-none absolute inset-x-0 top-1/2 -z-0 w-full -translate-y-1/2 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
        />
        <div className="relative z-10 mx-auto max-w-2xl">
          <h1 className="text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            <span className="text-muted-foreground">Timed assignments,</span>
            <br />
            Zero tampering.
          </h1>
          <p className="mx-auto mt-5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            One encrypted link per candidate. The clock starts server-side the moment they open it — and closes
            itself exactly on time.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/auth" className="cta-glow inline-flex px-6 py-2.5 text-sm font-medium">
              Open admin console
            </Link>
          </div>
        </div>
      </section>

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
