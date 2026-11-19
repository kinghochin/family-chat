import Link from "next/link";
import { FamilyShell } from "@/components/family-shell";


const topics = [
  { title: "Japan trip", type: "Trip", messages: 18, updated: "Updated 12 min ago", status: "Summary ready", color: "lilac", href: "/topics/japan-trip", artifacts: 3, suggestion: "Confirm dates, then shortlist Tokyo hotels.", action: "Open trip plan" },
  { title: "Mum’s birthday", type: "Event", messages: 9, updated: "Updated yesterday", status: "Needs a decision", color: "peach", href: "/topics/japan-trip", artifacts: 0, suggestion: "Choose a restaurant and agree on a date.", action: "Review decisions" },
  { title: "School holidays", type: "Planning", messages: 7, updated: "Updated 3 days ago", status: "2 open questions", color: "blue", href: "/topics/japan-trip", artifacts: 0, suggestion: "Answer the two open questions before booking.", action: "Resolve questions" },
  { title: "Kitchen ideas", type: "Home", messages: 24, updated: "Updated 12 May", status: "Summary ready", color: "green", href: "/topics/japan-trip", artifacts: 0, suggestion: "Compare the three saved layouts and pick a favourite.", action: "Compare ideas" },
];

export default function TopicsPage() {
  return <FamilyShell active="topics" title="Topics" subtitle="The conversations your family decided to keep together.">
    <section className="topics-hero"><div><span className="family-overline">YOUR FAMILY MEMORY</span><h2>From scattered messages<br /><em>to shared context.</em></h2></div><button className="primary-button" type="button">＋ New topic</button></section>
    <div className="topic-stats"><div><strong>4</strong><span>Active topics</span></div><div><strong>58</strong><span>Messages organised</span></div><div><strong>3</strong><span>Open questions</span></div><div><strong>12m</strong><span>Last activity</span></div></div>
    <section className="topic-grid">{topics.map((topic) => <Link href={topic.href} className={`topic-card ${topic.color}`} key={topic.title}><div className="topic-card-head"><span className="topic-type">{topic.type}</span><span className="more-button">···</span></div><h3>{topic.title}</h3><p>{topic.messages} messages · {topic.updated}</p><div className="topic-card-foot"><span className="status-dot">●</span>{topic.status}<span className="artifact-count">{topic.artifacts} artifacts</span><span className="arrow">↗</span></div><div className="topic-suggestion"><span>✦</span><div><small>SUGGESTED NEXT ACTION</small><strong>{topic.suggestion}</strong></div><span className="topic-suggestion-action">{topic.action} ↗</span></div></Link>)}<button className="new-topic-card" type="button"><span>＋</span><strong>Create a topic</strong><small>Start with a conversation or a blank page</small></button></section>
    <section className="topic-principle"><span>✦</span><div><strong>Topics are created after the conversation.</strong><p>You do not need to decide where a message belongs while you are chatting. Find the thread later, select the messages, and let Gatherly organise it.</p></div></section>
  </FamilyShell>;
}
