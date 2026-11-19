"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type HouseholdSettingsState = { ok: boolean; error?: string; message?: string };

export async function updateHouseholdSettings(
  _previousState: HouseholdSettingsState,
  formData: FormData,
): Promise<HouseholdSettingsState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const avatarLabel = String(formData.get("avatar_label") ?? "").trim().slice(0, 2).toUpperCase();

  if (!name) return { ok: false, error: "Add a group name." };
  if (!description) return { ok: false, error: "Add a short group description." };
  if (!avatarLabel) return { ok: false, error: "Add a group avatar label." };

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in before changing group details." };

    const { error } = await supabase
      .from("household_settings")
      .update({ name, description, avatar_label: avatarLabel })
      .eq("id", true);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/", "layout");
    return { ok: true, message: "Group details saved." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The group details could not be saved." };
  }
}
