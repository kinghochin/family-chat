import Link from "next/link";
import { FamilyShell } from "@/components/family-shell";


const artifacts = [
  { title: "Japan trip plan", type: "Suggested plan", topic: "Japan trip", updated: "Created just now", tone: "lilac", icon: "✦", description: "A practical sequence from confirming dates to booking Tokyo and Kyoto." },
  { title: "Japan packing list", type: "Checklist", topic: "Japan trip", updated: "Created today", tone: "green", icon: "✓", description: "A starter list for an October family trip, ready to refine." },
  { title: "Japan booking checklist", type: "Action list", topic: "Japan trip", updated: "Created today", tone: "peach", icon: "→", description: "Three outstanding bookings and the suggested owner for each." },
];

export default function ArtifactsPage() {
  return <FamilyShell active="artifacts" title="Artifacts" subtitle="Useful outputs your family can return to and act on.">
    <Link className="back-link artifacts-back-link" href="/topics/japan-trip">← Back to Japan trip</Link>
    <section className="artifacts-hero"><div><span className="family-overline">FROM YOUR TOPICS</span><h2>Turn conversation into<br /><em>something useful.</em></h2><p>Plans, checklists, and decision summaries stay here after the conversation moves on.</p></div><button className="primary-button" type="button">＋ New artifact</button></section>
    <div className="artifact-filter"><span className="filter-chip selected">All artifacts · 3</span><span className="filter-chip">Plans</span><span className="filter-chip">Checklists</span><span className="filter-chip">Decision summaries</span></div>
    <section className="artifact-grid">{artifacts.map((artifact) => <article className={`artifact-card ${artifact.tone}`} key={artifact.title}><div className="artifact-card-top"><span className="artifact-icon">{artifact.icon}</span><span className="more-button">···</span></div><span className="artifact-type">{artifact.type}</span><h3>{artifact.title}</h3><p>{artifact.description}</p><div className="artifact-meta"><span>{artifact.topic}</span><span>{artifact.updated}</span></div><div className="artifact-actions"><Link href="/topics/japan-trip">Open artifact ↗</Link><button type="button">Share</button></div></article>)}</section>
    <section className="artifacts-note"><span>✦</span><div><strong>Artifacts are suggestions until the family confirms them.</strong><p>Generated plans stay clearly separate from decisions and can always be traced back to the source messages.</p></div></section>
  </FamilyShell>;
}
