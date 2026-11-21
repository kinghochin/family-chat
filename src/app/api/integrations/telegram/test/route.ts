import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const GETherlyMsgChatId = "-5417741365";

type TelegramResponse = { ok?: boolean; description?: string; result?: { message_id?: number } };

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });

  const { data: isOwner, error: ownerError } = await supabase.rpc("is_household_owner");
  if (ownerError || isOwner !== true) return NextResponse.json({ ok: false, error: "Only the household owner can send a Telegram test." }, { status: 403 });

  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.HERMES_TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: "Telegram bot token is not configured on the server." }, { status: 503 });

  const chatId = process.env.TELEGRAM_TEST_CHAT_ID || GETherlyMsgChatId;
  const text = `Gatherly test message\n\nTelegram delivery to Getherly msg is working.\nSent by ${user.email || "the household owner"}.`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json().catch(() => ({})) as TelegramResponse;
    if (!response.ok || body.ok !== true) {
      return NextResponse.json({ ok: false, error: body.description || "Telegram rejected the test message." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, message: "Test message sent to Getherly msg.", messageId: body.result?.message_id ?? null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not reach Telegram." }, { status: 502 });
  }
}
