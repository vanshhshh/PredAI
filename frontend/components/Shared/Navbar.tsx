"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import { yieldEnabled } from "@/lib/features";

import { WalletConnectButton } from "./WalletConnectButton";

type NavItem = {
  href: string;
  label: string;
  match: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", match: "/dashboard" },
  { href: "/markets/list", label: "Markets", match: "/markets" },
  { href: "/paper", label: "Paper", match: "/paper" },
  { href: "/agents/my-agents", label: "Agents", match: "/agents" },
  ...(yieldEnabled ? [{ href: "/yield/portfolio", label: "Yield", match: "/yield" }] : []),
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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isHidden = useMemo(() => {
    if (!pathname) return false;
    return pathname.startsWith("/sign-in") || pathname.startsWith("/auth");
  }, [pathname]);

  if (isHidden) {
    return null;
  }

  return (
    <header className="app-header">
      <div className="page-container app-header-inner">
        <Link href="/" className="brand-link group">
          <span className="brand-mark">M</span>
          <div>
            <p className="text-sm font-semibold text-white transition group-hover:text-cyan-200">
              MoltMarket
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
              Polygon markets
            </p>
          </div>
        </Link>

        <nav
          aria-label="Primary"
          className="nav-list"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActiveRoute(pathname, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "nav-link-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/markets/create" className="ui-btn ui-btn-primary">
            Create Market
          </Link>
          <WalletConnectButton />
        </div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation menu"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="mobile-menu-button"
        >
          <span className="menu-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="mobile-nav-panel lg:hidden">
          <div className="page-container flex flex-col gap-3 py-4">
            {NAV_ITEMS.map((item) => {
              const active = isActiveRoute(pathname, item.match);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`nav-link ${active ? "nav-link-active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href="/markets/create"
                onClick={() => setMenuOpen(false)}
                className="ui-btn ui-btn-primary flex-1"
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
