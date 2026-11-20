import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ topicId: string }> };
type Suggestion = { message_id: string; relevance_score?: number; rationale?: string };

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request, { params }: Params) {
  const { topicId } = await params;
  try {
    const body = await request.json() as { request_id?: string; callback_token?: string; suggestions?: Suggestion[] };
    if (!body.request_id || !body.callback_token || !Array.isArray(body.suggestions)) return NextResponse.json({ ok: false, error: "Invalid callback payload." }, { status: 400 });
    const supabase = createSupabaseAdminClient();
    const { data: selectionRequest } = await supabase.from("topic_selection_requests").select("id, topic_id, callback_token_hash, status").eq("id", body.request_id).eq("topic_id", topicId).maybeSingle();
    if (!selectionRequest || selectionRequest.callback_token_hash !== hash(body.callback_token)) return NextResponse.json({ ok: false, error: "Invalid callback token." }, { status: 401 });
    if (selectionRequest.status === "completed") return NextResponse.json({ ok: true, duplicate: true });

    const ids = [...new Set(body.suggestions.map((item) => item.message_id).filter(Boolean))].slice(0, 100);
    const { data: validMessages } = await supabase.from("messages").select("id").in("id", ids);
    const validIds = new Set((validMessages ?? []).map((item) => item.id));
    const rows = body.suggestions.filter((item) => validIds.has(item.message_id)).slice(0, 100).map((item) => ({ request_id: body.request_id, topic_id: topicId, message_id: item.message_id, relevance_score: Math.max(0, Math.min(1, Number(item.relevance_score ?? 0))), rationale: String(item.rationale ?? "").slice(0, 500), status: "suggested" }));
    if (rows.length) {
      const { error } = await supabase.from("topic_message_suggestions").upsert(rows, { onConflict: "request_id,message_id" });
      if (error) throw error;
    }
    await supabase.from("topic_selection_requests").update({ status: "completed", completed_at: new Date().toISOString(), error: null }).eq("id", body.request_id);
    await supabase.from("topics").update({ selection_status: "ai_suggested" }).eq("id", topicId);
    return NextResponse.json({ ok: true, suggestionCount: rows.length });
  } catch (error) {
    console.error("POST topic selection callback failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Callback failed." }, { status: 500 });
  }
}
