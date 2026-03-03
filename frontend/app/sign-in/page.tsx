"use client";

import Link from "next/link";
import { useState } from "react";

import { PhantomConnect } from "@/components/auth/PhantomConnect";
import { WalletConnect } from "@/components/auth/EvmWalletConnect";
import { signInWithEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEmail() {
    setLoading(true);
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-container flex min-h-[calc(100vh-3rem)] items-center justify-center py-10">
      <section className="ui-card w-full max-w-md p-6 sm:p-7">
        <header className="text-center">
          <p className="ui-kicker">Account Access</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Sign in to MoltMarket</h1>
          <p className="mt-2 text-sm text-slate-300">
            Use email magic link or wallet-based authentication.
          </p>
        </header>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="email" className="ui-label">
              Continue With Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="ui-input"
              aria-label="Email address"
            />
            <button
              type="button"
              onClick={() => void handleEmail()}
              disabled={loading || !email}
              className="ui-btn ui-btn-primary mt-3 w-full"
            >
              {loading ? "Sending link..." : sent ? "Check your email" : "Continue with Email"}
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-white/10" />
            OR
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div>
            <p className="ui-label">Continue With Wallet</p>
            <div className="space-y-2">
              <WalletConnect />
              <PhantomConnect />
            </div>
          </div>
        </div>

        <footer className="mt-6 text-center text-xs text-slate-400">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-cyan-200 hover:text-cyan-100">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-cyan-200 hover:text-cyan-100">
            Privacy Policy
          </Link>
          .
        </footer>
      </section>
    </main>
  );
}
