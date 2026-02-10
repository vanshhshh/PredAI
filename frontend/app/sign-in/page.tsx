
"use client";

import { useState } from "react";
import { signInWithEmail } from "@/lib/auth";

import { WalletConnect } from "@/components/auth/EvmWalletConnect";
import { PhantomConnect } from "@/components/auth/PhantomConnect";
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
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 border rounded-lg p-6">

        <h1 className="text-2xl font-semibold text-center">
          Sign in to PredAI
        </h1>

        {/* EMAIL */}
        <div className="space-y-2">
          <input
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
          <button
            onClick={handleEmail}
            disabled={loading || !email}
            className="w-full bg-black text-white py-2 rounded-md"
          >
            {sent ? "Check your email" : "Continue with Email"}
          </button>
        </div>

        <div className="text-center text-xs text-gray-500">
          OR
        </div>

        {/* EVM */}
        <WalletConnect />

        {/* SOLANA */}
        <PhantomConnect />

        <p className="text-xs text-gray-500 text-center">
          By continuing, you agree to the Terms & Privacy Policy.
        </p>
      </div>
    </main>
  );
}
