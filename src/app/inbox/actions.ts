"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SendMessageState = {
  ok: boolean;
  error?: string;
  message?: {
    id: string;
    sender_username: string;
    content: string;
    source: "web";
    sent_at: string;
  };
};

export const initialSendMessageState: SendMessageState = { ok: false };

export async function sendWebMessage(
  _previousState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const content = String(formData.get("content") ?? "").trim();

  if (!content) return { ok: false, error: "Write a message before sending." };
  if (content.length > 2000) return { ok: false, error: "Messages must be 2,000 characters or fewer." };

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Please sign in before sending a message." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const senderUsername = profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Family member";

    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_username: senderUsername, content, source: "web" })
      .select("id, sender_username, content, source, sent_at")
      .single();

    if (error || !data) return { ok: false, error: error?.message ?? "The message could not be saved." };

    revalidatePath("/");
    revalidatePath("/inbox");
    return { ok: true, message: { ...data, source: "web" } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The message could not be saved." };
  }
}
