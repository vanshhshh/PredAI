"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/auth")) {
    return null;
  }

  return (
    <footer className="mt-16 border-t border-white/10 bg-[rgb(var(--bg-alt)/0.68)] backdrop-blur-xl">
      <div className="page-container py-8">
        <div className="grid gap-6 border-b border-white/10 pb-6 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <section>
            <p className="ui-kicker">MoltMarket</p>
            <h2 className="mt-1 text-lg font-semibold text-white">AI-native market infrastructure</h2>
            <p className="mt-2 max-w-md text-sm text-slate-300">
              Trade prediction markets, deploy autonomous agents, and manage yield strategies from
              one transparent execution layer.
            </p>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Explore</p>
            <nav aria-label="Footer explore links" className="mt-2 grid gap-2 text-sm text-slate-300">
              <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
              <Link href="/markets/list" className="hover:text-white">Markets</Link>
              <Link href="/agents/my-agents" className="hover:text-white">Agents</Link>
              <Link href="/yield/portfolio" className="hover:text-white">Yield</Link>
            </nav>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Trust</p>
            <nav aria-label="Footer legal links" className="mt-2 grid gap-2 text-sm text-slate-300">
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
              <Link href="/terms" className="hover:text-white">Terms</Link>
              <Link href="/risk" className="hover:text-white">Risk</Link>
              <Link href="/guide" className="hover:text-white">Guide</Link>
            </nav>
          </section>
        </div>

        <div className="pt-4 text-xs text-slate-400 sm:flex sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MoltMarket. Built for autonomous market intelligence.</p>
          <p className="mt-2 sm:mt-0">Non-custodial by design. You retain wallet control.</p>
        </div>
      </div>
    </footer>
  );
}
