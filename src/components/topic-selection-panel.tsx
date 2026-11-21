"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Suggestion = { id: string; message_id: string; relevance_score: number | null; rationale: string; status: string; messages: { id: string; sender_username: string; content: string; source: string; sent_at: string } | null };
type RequestState = { id: string; status: string; candidate_count: number; error: string | null; created_at: string } | null;
const REQUEST_TIMEOUT_MS = 2 * 60 * 1000;

export function TopicSelectionPanel({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [request, setRequest] = useState<RequestState>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const response = await fetch(`/api/topics/${topicId}/selection-requests`, { cache: "no-store" });
    const result = await response.json() as { request: RequestState; suggestions: Suggestion[] };
    setRequest(result.request);
    setSuggestions(result.suggestions ?? []);
    setSelected((result.suggestions ?? []).filter((item) => item.status === "suggested").map((item) => item.id));
    setNow(Date.now());
  }, [topicId]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const requestStatus = request?.status;
  const requestIsStale = Boolean(request?.created_at && now - new Date(request.created_at).getTime() >= REQUEST_TIMEOUT_MS);
  useEffect(() => {
    if (!requestStatus || !["pending", "processing"].includes(requestStatus) || requestIsStale) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, REQUEST_TIMEOUT_MS - (Date.now() - new Date(request?.created_at || Date.now()).getTime())));
    return () => window.clearTimeout(timer);
  }, [request?.created_at, requestIsStale, requestStatus]);

  useEffect(() => {
    if (!request?.id || !requestStatus || !["pending", "processing"].includes(requestStatus) || requestIsStale) return;
    let channel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | undefined;
    try {
      const supabase = createSupabaseBrowserClient();
      channel = supabase.channel(`topic-selection-${request.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "topic_selection_requests", filter: `id=eq.${request.id}` }, () => {
          void load();
          window.setTimeout(() => void load(), 500);
        })
        .subscribe();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Live selection updates are unavailable.";
      window.setTimeout(() => setMessage(errorMessage), 0);
    }
    return () => { if (channel) void createSupabaseBrowserClient().removeChannel(channel); };
  }, [load, request?.id, requestIsStale, requestStatus]);

  async function requestSelection() {
    setPending(true); setMessage("");
    const response = await fetch(`/api/topics/${topicId}/selection-requests`, { method: "POST" });
    const result = await response.json() as { ok: boolean; error?: string; request?: RequestState };
    if (!result.ok) setMessage(result.error || "Could not ask Hermes to select messages."); else { setRequest(result.request ?? null); setMessage("Hermes is reviewing the messages and will notify Getherly msg when suggestions are ready."); }
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
  const buttonBusy = pending || (request?.status === "processing" && !requestIsStale);
  const buttonLabel = requestIsStale ? "↻ Retry Ask Hermes" : request?.status === "processing" ? "Hermes is reviewing…" : "✦ Ask Hermes";

  return <section className="selection-panel"><div className="selection-panel-head"><div><span className="family-overline">AI MESSAGE SELECTION</span><h3>Find the messages related to this topic</h3><p>Hermes will review messages in the selected time period. The callback will update this page when suggestions are ready.</p></div><button className="primary-button" type="button" onClick={requestSelection} disabled={buttonBusy}>{buttonLabel}</button></div>{message && <p className="selection-feedback" role="status">{message}</p>}{requestIsStale && request?.status === "processing" && <p className="selection-feedback error" role="alert">The previous Hermes request did not call back within two minutes. You can retry it now.</p>}{request?.status === "failed" && <p className="selection-feedback error" role="alert">{request.error || "The AI selection failed."}</p>}{suggestions.length > 0 && <><div className="suggestion-list">{suggestions.map((suggestion) => suggestion.messages && <label className={`suggestion-row ${suggestion.status === "confirmed" ? "confirmed" : ""}`} key={suggestion.id}><input type="checkbox" checked={selected.includes(suggestion.id) || suggestion.status === "confirmed"} disabled={suggestion.status === "confirmed"} onChange={() => toggle(suggestion.id)} /><div><strong>{suggestion.messages.sender_username}</strong><small>{new Date(suggestion.messages.sent_at).toLocaleString()} · {suggestion.messages.source}</small><p>{suggestion.messages.content}</p><em>{suggestion.rationale || "Selected as relevant to this topic."}</em></div><span>{suggestion.relevance_score ? `${Math.round(suggestion.relevance_score * 100)}%` : "—"}</span></label>)}</div><button className="outline-button" type="button" onClick={confirm} disabled={pending || !selected.length}>Confirm selected messages</button></>}</section>;
}
