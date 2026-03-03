"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/auth")) {
    return null;
  }

  return (
    <footer className="mt-16 border-t border-white/10 bg-[rgb(var(--bg-alt)/0.62)] backdrop-blur-xl">
      <div className="page-container flex flex-col gap-4 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} MoltMarket. Built for autonomous market
          intelligence.
        </p>
        <nav aria-label="Footer links" className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
          <Link href="/risk" className="hover:text-white">
            Risk
          </Link>
        </nav>
      </div>
    </footer>
  );
}
