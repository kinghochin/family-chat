import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ topicId: string }> };

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function GET(_request: Request, { params }: Params) {
  const { topicId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: request } = await supabase.from("topic_selection_requests").select("id, status, candidate_count, error, created_at, completed_at").eq("topic_id", topicId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!request) return NextResponse.json({ ok: true, request: null, suggestions: [] });
  const { data: suggestions } = await supabase.from("topic_message_suggestions").select("id, message_id, relevance_score, rationale, status, messages(id, sender_username, content, source, sent_at)").eq("request_id", request.id).order("relevance_score", { ascending: false });
  return NextResponse.json({ ok: true, request, suggestions: suggestions ?? [] });
}

export async function POST(_request: Request, { params }: Params) {
  const { topicId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });

  const { data: topic } = await supabase.from("topics").select("id, name, description, start_at, end_at").eq("id", topicId).maybeSingle();
  if (!topic) return NextResponse.json({ ok: false, error: "Topic not found or unavailable." }, { status: 404 });
  const { data: existing } = await supabase.from("topic_selection_requests").select("id, status, created_at").eq("topic_id", topicId).in("status", ["pending", "processing"]).maybeSingle();
  if (existing) {
    if (Date.now() - new Date(existing.created_at).getTime() < 2 * 60 * 1000) return NextResponse.json({ ok: false, error: "A message selection request is already running.", requestId: existing.id }, { status: 409 });
    await supabase.from("topic_selection_requests").update({ status: "failed", error: "The previous Hermes request timed out." }).eq("id", existing.id);
  }

  let messagesQuery = supabase.from("messages").select("id, sender_username, content, source, sent_at").is("deleted_at", null).order("sent_at", { ascending: false }).limit(200);
  if (topic.start_at) messagesQuery = messagesQuery.gte("sent_at", topic.start_at);
  if (topic.end_at) messagesQuery = messagesQuery.lte("sent_at", topic.end_at);
  const { data: messages, error: messagesError } = await messagesQuery;
  if (messagesError) return NextResponse.json({ ok: false, error: messagesError.message }, { status: 400 });
  if (!messages?.length) return NextResponse.json({ ok: false, error: "There are no messages in this topic's time period." }, { status: 400 });

  const callbackToken = crypto.randomBytes(32).toString("hex");
  const { data: selectionRequest, error: insertError } = await supabase.from("topic_selection_requests").insert({ topic_id: topicId, requested_by: user.id, status: "processing", candidate_count: messages.length, callback_token_hash: hash(callbackToken) }).select("id, status, candidate_count, created_at").single();
  if (insertError || !selectionRequest) return NextResponse.json({ ok: false, error: insertError?.message ?? "Could not create selection request." }, { status: 400 });

  const webhookUrl = process.env.HERMES_WEBHOOK_URL;
  if (!webhookUrl) {
    await supabase.from("topic_selection_requests").update({ status: "failed", error: "HERMES_WEBHOOK_URL is not configured." }).eq("id", selectionRequest.id);
    return NextResponse.json({ ok: false, error: "Hermes webhook is not configured yet." }, { status: 503 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(_request.url).origin;
  const callbackUrl = `${appUrl}/api/topics/${topicId}/selection-callback`;
  const payload = { event_type: "topic.selection_requested", request_id: selectionRequest.id, callback_url: callbackUrl, callback_token: callbackToken, telegram_chat_id: process.env.HERMES_TELEGRAM_CHAT_ID || "805353200", topic, messages, instruction: "Select only the most relevant messages. Return JSON with message_id, relevance_score between 0 and 1, and rationale for each selected message. Then POST the JSON to callback_url using callback_token. Also send a concise review notification to telegram_chat_id." };
  const payloadBody = JSON.stringify(payload);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.HERMES_WEBHOOK_SECRET) headers["X-Hub-Signature-256"] = `sha256=${crypto.createHmac("sha256", process.env.HERMES_WEBHOOK_SECRET).update(payloadBody).digest("hex")}`;
    const response = await fetch(webhookUrl, { method: "POST", headers, body: payloadBody, signal: AbortSignal.timeout(15000) });
    const responseBody = await response.json().catch(() => ({})) as { status?: string; error?: string };
    if (!response.ok || responseBody.status === "ignored" || responseBody.status === "duplicate") throw new Error(responseBody.error || `Hermes webhook did not accept the event${responseBody.status ? ` (${responseBody.status})` : "."}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reach Hermes webhook.";
    await supabase.from("topic_selection_requests").update({ status: "failed", error: message }).eq("id", selectionRequest.id);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, request: selectionRequest });
}
