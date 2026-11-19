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
    attachments?: Array<{ name: string; path: string; type: string; size: number }>;
  };
};

export const initialSendMessageState: SendMessageState = { ok: false };

export async function sendWebMessage(
  _previousState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const content = String(formData.get("content") ?? "").trim();
  const files = formData.getAll("attachments").filter((value): value is File => {
    if (!value || typeof value !== "object") return false;
    const candidate = value as { size?: unknown };
    return typeof candidate.size === "number" && candidate.size > 0;
  });

  if (!content && files.length === 0) return { ok: false, error: "Write a message or attach a file before sending." };
  if (content.length > 2000) return { ok: false, error: "Messages must be 2,000 characters or fewer." };
  if (files.length > 5) return { ok: false, error: "You can attach up to 5 files per message." };
  if (files.some((file) => file.size > 10 * 1024 * 1024)) return { ok: false, error: "Each attachment must be 10 MB or smaller." };

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

    const uploadedAttachments: Array<{ name: string; path: string; type: string; size: number }> = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (uploadError) return { ok: false, error: uploadError.message };
      uploadedAttachments.push({ name: file.name, path, type: file.type || "application/octet-stream", size: file.size });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_username: senderUsername, content: content || "Attachment", source: "web", attachments: uploadedAttachments })
      .select("id, sender_username, content, source, sent_at, attachments")
      .single();

    if (error || !data) return { ok: false, error: error?.message ?? "The message could not be saved." };

    revalidatePath("/");
    revalidatePath("/inbox");
    return { ok: true, message: { ...data, source: "web" } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The message could not be saved." };
  }
}
