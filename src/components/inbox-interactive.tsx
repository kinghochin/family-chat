"use client";

import { useRef, useState, useTransition } from "react";
import { SourceBadge } from "@/components/family-shell";
import { sendWebMessage, type SendMessageState } from "@/app/inbox/actions";

type InboxMessage = {
  id: string;
  name: string;
  initials: string;
  tone: string;
  text: string;
  time: string;
  source: "Telegram" | "Web" | "Hermes";
  date: string;
};

const fallbackMessages: InboxMessage[] = [
  { id: "demo-1", name: "Mum", initials: "M", tone: "peach", text: "What do we think about Japan in October? The weather should be lovely.", time: "09:12", source: "Telegram", date: "Today" },
  { id: "demo-2", name: "Jamie", initials: "JC", tone: "purple", text: "I found a small hotel near Shibuya that looks really good.", time: "09:16", source: "Web", date: "Today" },
  { id: "demo-3", name: "Dad", initials: "D", tone: "blue", text: "I am happy with Japan. We should decide the dates first.", time: "09:25", source: "Telegram", date: "Today" },
  { id: "demo-4", name: "Mum", initials: "M", tone: "peach", text: "Also saving this restaurant in Kyoto — apparently you need to book early.", time: "Yesterday", source: "Telegram", date: "Yesterday" },
  { id: "demo-5", name: "Sophie", initials: "S", tone: "green", text: "I can check school holiday dates tonight.", time: "18:42", source: "Web", date: "Yesterday" },
];

function initialsFor(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Just now" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function InboxInteractive({ initialMessages = [] }: { initialMessages?: InboxMessage[] }) {
  const [messages, setMessages] = useState<InboxMessage[]>(initialMessages.length ? initialMessages : fallbackMessages);
  const [state, setState] = useState<SendMessageState>({ ok: false });
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await sendWebMessage(state, formData);
      setState(result);
      if (!result.ok || !result.message) return;
      const message = result.message;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [{
        id: message.id,
        name: message.sender_username,
        initials: initialsFor(message.sender_username),
        tone: "purple",
        text: message.content,
        time: formatTime(message.sent_at),
        source: "Web",
        date: "Today",
      }, ...current]);
      formRef.current?.reset();
    });
  }

  return <>
    <form ref={formRef} className="composer-wide" action={submit}>
      <div className="composer-avatar">JC</div>
      <div className="composer-fields"><input className="composer-username" name="sender_username" defaultValue="Jamie" aria-label="Your username" /><input className="composer-message" name="content" placeholder="What do you want to share with the family?" aria-label="Message" /></div>
      <button className="primary-button" type="submit" disabled={pending}>{pending ? "Sending…" : "Send message"}</button>
    </form>
    {state.error && <p className="composer-feedback error" role="alert">{state.error}</p>}
    {state.ok && <p className="composer-feedback success" role="status">Message saved to the family inbox.</p>}
    <div className="inbox-toolbar"><div><button className="filter-chip selected" type="button">All messages</button><button className="filter-chip" type="button">Needs organising</button><button className="filter-chip" type="button">In topics</button></div><div className="inbox-filters"><button type="button">⌕ Search</button><button type="button">◷ Date</button><button type="button">☷ Sender</button></div></div>
    <section className="inbox-intro"><div><span className="family-overline">MESSAGE MEMORY</span><h2>What&apos;s happening at home</h2><p>Messages stay here until someone turns a conversation into a topic.</p></div><button className="outline-button" type="button">Select messages</button></section>
    <section className="message-feed">{["Today", "Yesterday"].map((date) => <div key={date}><div className="feed-date"><span>{date}</span><i /></div>{messages.filter((message) => message.date === date).map((message) => <article className="message-row" key={message.id}><span className={`message-avatar ${message.tone}`}>{message.initials}</span><div className="message-body"><div className="message-meta"><strong>{message.name}</strong><span>{message.time}</span><SourceBadge source={message.source} /></div><p>{message.text}</p></div><button className="message-select" type="button">＋</button></article>)}</div>)}</section>
    <div className="selection-helper"><span>⌁</span><div><strong>See a conversation taking shape?</strong><small>Select related messages and create a topic afterward.</small></div><button className="primary-button" type="button">Create topic</button></div>
  </>;
}
