import { FamilyShell } from "@/components/family-shell";
import { InboxInteractive } from "@/components/inbox-interactive";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const instant = false;

type InboxMessage = {
  id: string;
  name: string;
  initials: string;
  tone: string;
  text: string;
  time: string;
  source: "Telegram" | "Web" | "Hermes";
  date: string;
};

function displaySource(source: string): InboxMessage["source"] {
  return source === "telegram" ? "Telegram" : source === "hermes" ? "Hermes" : "Web";
}

function dateGroup(sentAt: string) {
  const sent = new Date(sentAt);
  const today = new Date();
  return sent.toDateString() === today.toDateString() ? "Today" : "Yesterday";
}

async function loadMessages(): Promise<InboxMessage[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_username, content, source, sent_at")
      .is("deleted_at", null)
      .order("sent_at", { ascending: false })
      .limit(100);

    if (error || !data) return [];

    return data.map((message) => ({
      id: message.id,
      name: message.sender_username,
      initials: message.sender_username.slice(0, 2).toUpperCase(),
      tone: "purple",
      text: message.content,
      time: new Date(message.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      source: displaySource(message.source),
      date: dateGroup(message.sent_at),
    }));
  } catch {
    return [];
  }
}

export async function InboxPage() {
  const messages = await loadMessages();

  return <FamilyShell active="inbox" title="Family inbox" subtitle="Every message, ready to become something useful.">
    <InboxInteractive initialMessages={messages} />
  </FamilyShell>;
}

export default InboxPage;
