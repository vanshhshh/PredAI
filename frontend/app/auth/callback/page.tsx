// File: frontend/app/auth/callback/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function handleAuth() {
      try {
        // Exchange OAuth code for session (important in production)
        const code = new URLSearchParams(window.location.search).get("code");

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }

        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          router.push("/sign-in");
          return;
        }

        // 👇 OPTIONAL: Check if username exists
        const user = data.session.user;

        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        if (!profile?.username) {
          router.push("/onboarding/username");
        } else {
          router.push("/");
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        router.push("/sign-in");
      }
    }

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-600">
        Signing you in…
      </p>
    </div>
  );
}
