"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MemberSettingsState = { ok: boolean; error?: string; message?: string; inviteLink?: string };

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function updateProfileDetails(_previousState: MemberSettingsState, formData: FormData): Promise<MemberSettingsState> {
  const displayName = text(formData, "display_name");
  if (!displayName) return { ok: false, error: "Add a display name." };
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in before updating your profile." };
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true, message: "Profile details saved." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The profile could not be updated." };
  }
}

export async function updateHouseholdMember(_previousState: MemberSettingsState, formData: FormData): Promise<MemberSettingsState> {
  const userId = text(formData, "user_id");
  const displayName = text(formData, "display_name");
  if (!userId || !displayName) return { ok: false, error: "Add a display name." };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("update_household_member", { target_user: userId, new_display_name: displayName });
    if (error || !data) return { ok: false, error: error?.message ?? "Only a household owner can edit members." };
    revalidatePath("/settings/members");
    revalidatePath("/", "layout");
    return { ok: true, message: "Member details updated." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The member could not be updated." };
  }
}

export async function removeHouseholdMember(_previousState: MemberSettingsState, formData: FormData): Promise<MemberSettingsState> {
  const userId = text(formData, "user_id");
  if (!userId) return { ok: false, error: "Member not found." };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("remove_household_member", { target_user: userId });
    if (error || !data) return { ok: false, error: error?.message ?? "Only a household owner can drop members, and owners cannot drop themselves." };
    revalidatePath("/settings/members");
    revalidatePath("/", "layout");
    return { ok: true, message: "Member dropped from the household." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The member could not be dropped." };
  }
}

export async function createMemberInvite(_previousState: MemberSettingsState, formData: FormData): Promise<MemberSettingsState> {
  const email = text(formData, "email").toLowerCase();
  if (!email || !email.includes("@")) return { ok: false, error: "Enter a valid email address." };
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in before inviting a member." };
    const { data, error } = await supabase.from("household_invites").insert({ email, invited_by: user.id }).select("token").single();
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
