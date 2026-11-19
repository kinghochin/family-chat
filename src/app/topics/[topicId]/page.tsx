import Link from "next/link";
import { notFound } from "next/navigation";
import { FamilyShell } from "@/components/family-shell";
import { TopicAssistant } from "@/components/topic-assistant";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TopicRecord = { id: string; name: string; description: string | null; start_at: string | null; end_at: string | null; created_at: string };

function periodLabel(topic: TopicRecord) {
  if (!topic.start_at && !topic.end_at) return "All time";
  const start = new Date(topic.start_at || topic.end_at || topic.created_at).toLocaleDateString();
  const end = new Date(topic.end_at || topic.start_at || topic.created_at).toLocaleDateString();
  return `${start} – ${end}`;
}

export default async function TopicDetailsPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: topic } = await supabase.from("topics").select("id, name, description, start_at, end_at, created_at").eq("id", topicId).maybeSingle();
  if (!topic) notFound();
  const record = topic as TopicRecord;

  return <FamilyShell active="topics" title={record.name} subtitle="A shared view of the conversation so far.">
    <div className="topic-detail-actions"><Link className="back-link" href="/topics">← All topics</Link><div><button className="outline-button" type="button">＋ Add messages</button><button className="primary-button" type="button">✦ Refresh summary</button></div></div>
    <section className="detail-heading"><div><div className="topic-type prominent">TOPIC · {periodLabel(record)}</div><h2>{record.name}</h2><p>{record.description || "No description added."}</p></div><div className="topic-collaborators"><span className="member-avatar dark">✦</span><small>Shared family topic</small></div></section>
    <div className="detail-layout"><div className="detail-main"><section className="summary-card"><div className="summary-head"><div><span className="family-overline">TOPIC OVERVIEW</span><h3>{record.name}</h3></div><span className="summary-spark">✦</span></div><p className="summary-copy">This topic has been created and is ready for messages. Add related messages to generate a shared summary and keep the family context together.</p><div className="summary-sections"><div><span className="summary-icon decision">✓</span><div><strong>Decisions</strong><p>No confirmed decisions yet.</p><small>Awaiting source messages</small></div></div><div><span className="summary-icon task">→</span><div><strong>Next steps</strong><p>Add messages to get suggestions.</p><small>Not generated yet</small></div></div><div><span className="summary-icon question">?</span><div><strong>Open questions</strong><p>No open questions yet.</p><small>Awaiting source messages</small></div></div></div><div className="summary-foot"><span>0 source messages</span><button type="button">View generation details ↗</button></div></section><TopicAssistant /></div><aside className="detail-side"><section className="side-card"><span className="family-overline">MESSAGE PERIOD</span><h3>{periodLabel(record)}</h3><p>Messages added to this topic will use this time period.</p></section></aside></div>
  </FamilyShell>;
}
