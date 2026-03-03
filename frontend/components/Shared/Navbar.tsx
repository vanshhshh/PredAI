"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";

import { WalletConnectButton } from "./WalletConnectButton";

type NavItem = {
  href: string;
  label: string;
  match: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", match: "/dashboard" },
  { href: "/markets/list", label: "Markets", match: "/markets" },
  { href: "/agents/my-agents", label: "Agents", match: "/agents" },
  { href: "/yield/portfolio", label: "Yield", match: "/yield" },
  {
    href: "/governance/proposals",
    label: "Governance",
    match: "/governance",
  },
  { href: "/social/feeds", label: "Social", match: "/social" },
  { href: "/guide", label: "Guide", match: "/guide" },
];

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHidden = useMemo(() => {
    if (!pathname) return false;
    return pathname.startsWith("/sign-in") || pathname.startsWith("/auth");
  }, [pathname]);

  if (isHidden) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgb(var(--bg-alt)/0.76)] backdrop-blur-xl">
      <div className="page-container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300">
            M
          </span>
          <div>
            <p className="text-sm font-semibold tracking-wide text-white group-hover:text-cyan-300">
              MoltMarket
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Intelligence Finance
            </p>
          </div>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 lg:flex"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActiveRoute(pathname, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                  active
                    ? "bg-cyan-400/20 text-cyan-200"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/markets/create" className="ui-btn ui-btn-secondary">
            Create Market
          </Link>
          <Link href="/agents/create" className="ui-btn ui-btn-secondary">
            Create Agent
          </Link>
          <WalletConnectButton />
        </div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation menu"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="ui-btn ui-btn-secondary lg:hidden"
        >
          Menu
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="border-t border-white/10 lg:hidden">
          <div className="page-container flex flex-col gap-3 py-4">
            {NAV_ITEMS.map((item) => {
              const active = isActiveRoute(pathname, item.match);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-cyan-400/20 text-cyan-200"
                      : "bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-2 flex gap-2">
              <Link
                href="/markets/create"
                onClick={() => setMenuOpen(false)}
                className="ui-btn ui-btn-secondary flex-1"
              >
                New Market
              </Link>
              <Link
                href="/agents/create"
                onClick={() => setMenuOpen(false)}
                className="ui-btn ui-btn-secondary flex-1"
              >
                New Agent
              </Link>
            </div>

            <div className="pt-1">
              <WalletConnectButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function isActiveRoute(pathname: string | null, match: string): boolean {
  if (!pathname) return false;
  return pathname === match || pathname.startsWith(`${match}/`);
}
