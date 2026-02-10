

"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
export const dynamic = "force-dynamic";
const supabase = getSupabaseClient();
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/");
      }
    });
  }, [router]);

  return <p className="p-6">Signing you in…</p>;
}
