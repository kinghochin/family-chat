import Link from "next/link";
import { FamilyShell } from "@/components/family-shell";
import { TopicCreateForm } from "@/components/topic-create-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TopicRecord = { id: string; name: string; description: string | null; start_at: string | null; end_at: string | null; created_at: string };

async function loadTopics(): Promise<TopicRecord[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("topics").select("id, name, description, start_at, end_at, created_at").order("created_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

function periodLabel(topic: TopicRecord) {
  if (!topic.start_at && !topic.end_at) return "All time";
  return `${new Date(topic.start_at || topic.end_at || topic.created_at).toLocaleDateString()} – ${new Date(topic.end_at || topic.start_at || topic.created_at).toLocaleDateString()}`;
}

export default async function TopicsPage() {
  const topics = await loadTopics();
  return <FamilyShell active="topics" title="Topics" subtitle="The conversations your family decided to keep together.">
    <section className="topics-hero"><div><span className="family-overline">YOUR FAMILY MEMORY</span><h2>From scattered messages<br /><em>to shared context.</em></h2></div><a className="primary-button" href="#create-topic">＋ New topic</a></section>
    <div id="create-topic"><TopicCreateForm /></div>
    <div className="topic-stats"><div><strong>{topics.length}</strong><span>Active topics</span></div><div><strong>0</strong><span>Messages organised</span></div><div><strong>0</strong><span>Open questions</span></div><div><strong>{topics.length ? "Just now" : "—"}</strong><span>Last activity</span></div></div>
    <section className="topic-grid">{topics.map((topic, index) => <Link className={`topic-card ${["lilac", "peach", "blue", "green"][index % 4]}`} href={`/topics/${topic.id}`} key={topic.id}><div className="topic-card-head"><span className="topic-type">Topic</span><span className="more-button">···</span></div><h3>{topic.name}</h3><p>{topic.description || "No description added."}</p><div className="topic-card-foot"><span className="status-dot">●</span>{periodLabel(topic)}<span className="artifact-count">0 messages</span></div></Link>)}<a className="new-topic-card" href="#create-topic"><span>＋</span><strong>Create a topic</strong><small>Start with a conversation or a blank page</small></a></section>
    {!topics.length && <p className="empty-topic-state">No topics yet. Create your first topic above.</p>}
    <section className="topic-principle"><span>✦</span><div><strong>Topics are created after the conversation.</strong><p>You do not need to decide where a message belongs while you are chatting. Find the thread later, select the messages, and let Gatherly organise it.</p></div></section>
  </FamilyShell>;
}
