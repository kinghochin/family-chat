import { FamilyShell, SourceBadge } from "@/components/family-shell";

const messages = [
  { id: 1, name: "Mum", initials: "M", tone: "peach", text: "What do we think about Japan in October? The weather should be lovely.", time: "09:12", source: "Telegram" as const, date: "Today" },
  { id: 2, name: "Jamie", initials: "JC", tone: "purple", text: "I found a small hotel near Shibuya that looks really good.", time: "09:16", source: "Web" as const, date: "Today" },
  { id: 3, name: "Dad", initials: "D", tone: "blue", text: "I am happy with Japan. We should decide the dates first.", time: "09:25", source: "Telegram" as const, date: "Today" },
  { id: 4, name: "Mum", initials: "M", tone: "peach", text: "Also saving this restaurant in Kyoto — apparently you need to book early.", time: "Yesterday", source: "Telegram" as const, date: "Yesterday" },
  { id: 5, name: "Sophie", initials: "S", tone: "green", text: "I can check school holiday dates tonight.", time: "18:42", source: "Web" as const, date: "Yesterday" },
];

export function InboxPage() {
  return <FamilyShell active="inbox" title="Family inbox" subtitle="Every message, ready to become something useful.">
    <section className="composer-wide"><div className="composer-avatar">JC</div><div className="composer-input">What do you want to share with the family?<span>⌘ ↵</span></div><button className="primary-button" type="button">Send message</button></section>
    <div className="inbox-toolbar"><div><button className="filter-chip selected" type="button">All messages</button><button className="filter-chip" type="button">Needs organising</button><button className="filter-chip" type="button">In topics</button></div><div className="inbox-filters"><button type="button">⌕ Search</button><button type="button">◷ Date</button><button type="button">☷ Sender</button></div></div>
    <section className="inbox-intro"><div><span className="family-overline">MESSAGE MEMORY</span><h2>What&apos;s happening at home</h2><p>Messages stay here until someone turns a conversation into a topic.</p></div><button className="outline-button" type="button">Select messages</button></section>
    <section className="message-feed"><div className="feed-date"><span>Today</span><i /></div>{messages.filter((m) => m.date === "Today").map((message) => <article className="message-row" key={message.id}><span className={`message-avatar ${message.tone}`}>{message.initials}</span><div className="message-body"><div className="message-meta"><strong>{message.name}</strong><span>{message.time}</span><SourceBadge source={message.source} /></div><p>{message.text}</p></div><button className="message-select" type="button">＋</button></article>)}<div className="feed-date"><span>Yesterday</span><i /></div>{messages.filter((m) => m.date === "Yesterday").map((message) => <article className="message-row" key={message.id}><span className={`message-avatar ${message.tone}`}>{message.initials}</span><div className="message-body"><div className="message-meta"><strong>{message.name}</strong><span>{message.time}</span><SourceBadge source={message.source} /></div><p>{message.text}</p></div><button className="message-select" type="button">＋</button></article>)}</section>
    <div className="selection-helper"><span>⌁</span><div><strong>See a conversation taking shape?</strong><small>Select related messages and create a topic afterward.</small></div><button className="primary-button" type="button">Create topic</button></div>
  </FamilyShell>;
}

export default InboxPage;
