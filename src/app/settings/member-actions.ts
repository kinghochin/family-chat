"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MemberSettingsState = { ok: boolean; error?: string; message?: string; inviteLink?: string };

export async function updateProfileDetails(
  _previousState: MemberSettingsState,
  formData: FormData,
): Promise<MemberSettingsState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return { ok: false, error: "Add a display name." };

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in before updating your profile." };

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/", "layout");
    return { ok: true, message: "Profile details saved." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The profile could not be updated." };
  }
}

export async function createMemberInvite(
  _previousState: MemberSettingsState,
  formData: FormData,
): Promise<MemberSettingsState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false, error: "Enter a valid email address." };

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in before inviting a member." };

    const { data, error } = await supabase
      .from("household_invites")
      .insert({ email, invited_by: user.id })
      .select("token")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "The invitation could not be created." };

    const requestHeaders = await headers();
    const protocol = requestHeaders.get("x-forwarded-proto") || "http";
    const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
    const origin = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    revalidatePath("/settings/members");
    return { ok: true, message: `Invite created for ${email}.`, inviteLink: `${origin}/signup?invite=${data.token}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The invitation could not be created." };
  }
}
