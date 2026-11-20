import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ topicId: string; requestId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { topicId, requestId } = await params;
  const body = await request.json() as { suggestionIds?: string[] };
  const ids = Array.isArray(body.suggestionIds) ? body.suggestionIds : [];
  if (!ids.length) return NextResponse.json({ ok: false, error: "Select at least one suggested message." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  const { data: suggestions } = await supabase.from("topic_message_suggestions").select("id, message_id").eq("topic_id", topicId).eq("request_id", requestId).in("id", ids);
  if (!suggestions?.length) return NextResponse.json({ ok: false, error: "Suggestions are unavailable." }, { status: 400 });
  const { error: insertError } = await supabase.from("topic_messages").upsert(suggestions.map((item) => ({ topic_id: topicId, message_id: item.message_id, selection_source: "confirmed" })), { onConflict: "topic_id,message_id" });
  if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
  const { error: updateError } = await supabase.from("topic_message_suggestions").update({ status: "confirmed" }).in("id", suggestions.map((item) => item.id));
  if (updateError) return NextResponse.json({ ok: false, error: updateError.message }, { status: 400 });
  await supabase.from("topics").update({ selection_status: "confirmed" }).eq("id", topicId);
  return NextResponse.json({ ok: true, confirmedCount: suggestions.length });
}
