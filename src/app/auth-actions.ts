"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthState = { ok: boolean; error?: string; message?: string };

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function validatePassword(password: string) {
  return password.length >= 8 ? undefined : "Password must be at least 8 characters.";
}

export async function signInAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const email = value(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "Enter your email and password." };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to sign in." };
  }

  redirect("/");
}

export async function signUpAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const displayName = value(formData, "display_name");
  const email = value(formData, "email");
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password);
  if (!displayName || !email || !password) return { ok: false, error: "Complete your name, email, and password." };
  if (passwordError) return { ok: false, error: passwordError };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { ok: false, error: error.message };
    const inviteToken = value(formData, "invite_token");
    if (data.session && inviteToken) {
      await supabase.rpc("accept_household_invite", { invite_token: inviteToken });
    }
    if (data.session) redirect("/");
    return { ok: true, message: "Account created. Check your email to confirm your account, then sign in." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create your account." };
  }
}

export async function signOutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The local auth cookie may already be expired; redirect regardless.
  }

  redirect("/login");
}
