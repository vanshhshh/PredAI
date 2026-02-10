import { getSupabaseClient } from "./supabase";

export async function signInWithEmail(email: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
  });

  if (error) throw error;
}
