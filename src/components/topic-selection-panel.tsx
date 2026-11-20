"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = { id: string; message_id: string; relevance_score: number | null; rationale: string; status: string; messages: { id: string; sender_username: string; content: string; source: string; sent_at: string } | null };
type RequestState = { id: string; status: string; candidate_count: number; error: string | null } | null;

export function TopicSelectionPanel({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [request, setRequest] = useState<RequestState>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/topics/${topicId}/selection-requests`, { cache: "no-store" });
    const result = await response.json() as { request: RequestState; suggestions: Suggestion[] };
    setRequest(result.request);
    setSuggestions(result.suggestions ?? []);
    setSelected((result.suggestions ?? []).filter((item) => item.status === "suggested").map((item) => item.id));
  }, [topicId]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const requestStatus = request?.status;
  useEffect(() => { if (!requestStatus || !["pending", "processing"].includes(requestStatus)) return; const timer = window.setInterval(() => void load(), 3000); return () => window.clearInterval(timer); }, [load, request?.id, requestStatus]);

  async function requestSelection() {
    setPending(true); setMessage("");
    const response = await fetch(`/api/topics/${topicId}/selection-requests`, { method: "POST" });
    const result = await response.json() as { ok: boolean; error?: string; request?: RequestState };
    if (!result.ok) setMessage(result.error || "Could not ask Hermes to select messages."); else { setRequest(result.request ?? null); setMessage("Hermes is reviewing the messages and will notify Telegram when suggestions are ready."); }
    setPending(false);
  }

  async function confirm() {
    if (!request || !selected.length) return;
    setPending(true); setMessage("");
    const response = await fetch(`/api/topics/${topicId}/selection-requests/${request.id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ suggestionIds: selected }) });
    const result = await response.json() as { ok: boolean; error?: string; confirmedCount?: number };
    if (!result.ok) setMessage(result.error || "Could not confirm messages."); else { setMessage(`${result.confirmedCount} messages confirmed for this topic.`); await load(); router.refresh(); }
    setPending(false);
  }

  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }

  return <section className="selection-panel"><div className="selection-panel-head"><div><span className="family-overline">AI MESSAGE SELECTION</span><h3>Find the messages related to this topic</h3><p>Hermes will review messages in the selected time period. You decide what becomes part of the topic.</p></div><button className="primary-button" type="button" onClick={requestSelection} disabled={pending || request?.status === "processing"}>{request?.status === "processing" ? "Hermes is reviewing…" : "✦ Ask Hermes"}</button></div>{message && <p className="selection-feedback" role="status">{message}</p>}{request?.status === "failed" && <p className="selection-feedback error" role="alert">{request.error || "The AI selection failed."}</p>}{suggestions.length > 0 && <><div className="suggestion-list">{suggestions.map((suggestion) => suggestion.messages && <label className={`suggestion-row ${suggestion.status === "confirmed" ? "confirmed" : ""}`} key={suggestion.id}><input type="checkbox" checked={selected.includes(suggestion.id) || suggestion.status === "confirmed"} disabled={suggestion.status === "confirmed"} onChange={() => toggle(suggestion.id)} /><div><strong>{suggestion.messages.sender_username}</strong><small>{new Date(suggestion.messages.sent_at).toLocaleString()} · {suggestion.messages.source}</small><p>{suggestion.messages.content}</p><em>{suggestion.rationale || "Selected as relevant to this topic."}</em></div><span>{suggestion.relevance_score ? `${Math.round(suggestion.relevance_score * 100)}%` : "—"}</span></label>)}</div><button className="outline-button" type="button" onClick={confirm} disabled={pending || !selected.length}>Confirm selected messages</button></>}</section>;
}
