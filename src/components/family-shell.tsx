import Link from "next/link";

export function FamilyShell({
  children,
  active = "inbox",
  title = "Family space",
  subtitle = "One place for the conversations that matter.",
}: {
  children: React.ReactNode;
  active?: "inbox" | "topics" | "artifacts" | "members" | "flow";
  title?: string;
  subtitle?: string;
}) {
  return (
    <main className="family-shell">
      <aside className="family-sidebar">
        <Link href="/inbox" className="family-logo"><span>✦</span> Gatherly</Link>
        <div className="family-household"><span className="household-avatar">H</span><div><strong>The Harris family</strong><small>5 members</small></div><span className="chevron">⌄</span></div>
        <nav className="family-nav" aria-label="Family navigation">
          <Link className={active === "inbox" ? "active" : ""} href="/inbox"><span>▤</span> Inbox</Link>
          <Link className={active === "topics" ? "active" : ""} href="/topics"><span>◈</span> Topics <b>4</b></Link>
          <Link className={active === "artifacts" ? "active" : ""} href="/artifacts"><span>▧</span> Artifacts <b>3</b></Link>
          <Link className={active === "members" ? "active" : ""} href="/settings/members"><span>♧</span> Family members</Link>
          <Link className={active === "flow" ? "active" : ""} href="/flow"><span>⌁</span> Product flow</Link>
        </nav>
        <div className="family-sidebar-bottom"><div className="family-member"><span className="member-avatar">JC</span><div><strong>Jamie Chen</strong><small>Online now</small></div><span className="more-button">···</span></div></div>
      </aside>
      <section className="family-main">
        <header className="family-topbar"><div><span className="family-overline">THE HARRIS FAMILY</span><h1>{title}</h1><p>{subtitle}</p></div><div className="family-top-actions"><button className="family-round-button" type="button">⌕</button><button className="family-round-button" type="button">♧</button><span className="member-avatar dark">JC</span></div></header>
        <div className="family-content">{children}</div>
      </section>
    </main>
  );
}

export function SourceBadge({ source }: { source: "Telegram" | "Web" | "Hermes" }) {
  return <span className={`source-badge ${source.toLowerCase()}`}>{source === "Telegram" ? "✈" : source === "Hermes" ? "✦" : "⌨"} {source}</span>;
}
