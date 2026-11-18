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
  const senderUsername = String(formData.get("sender_username") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!senderUsername) return { ok: false, error: "Add your username before sending." };
  if (!content) return { ok: false, error: "Write a message before sending." };
  if (content.length > 2000) return { ok: false, error: "Messages must be 2,000 characters or fewer." };

  try {
    const supabase = await createSupabaseServerClient();
    let { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const anonymous = await supabase.auth.signInAnonymously();
      if (anonymous.error || !anonymous.data.user) {
        return { ok: false, error: "Please enable Supabase Anonymous Sign-Ins before sending web messages." };
      }
      user = anonymous.data.user;
    }

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
