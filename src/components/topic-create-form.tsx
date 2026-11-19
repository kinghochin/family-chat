"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CreatedTopic = { id: string; name: string; description: string | null; start_at: string | null; end_at: string | null };

export function TopicCreateForm() {
  const router = useRouter();
  const [period, setPeriod] = useState("all");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedTopic | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setCreated(null);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/topics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: data.get("title"), description: data.get("description"), period, startDate: data.get("start_date"), endDate: data.get("end_date") }) });
      const result = await response.json() as { ok: boolean; error?: string; topic?: CreatedTopic };
      if (!result.ok || !result.topic) { setError(result.error || "The topic could not be created."); return; }
      setCreated(result.topic);
      event.currentTarget.reset();
      setPeriod("all");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The topic could not be created.");
    } finally {
      setPending(false);
    }
  }

  return <section className="topic-create-card">
    <div><span className="family-overline">NEW TOPIC</span><h3>Create a topic from your family memory</h3><p>Give the conversation a clear title, add a short description, and choose which message period belongs to it.</p></div>
    <form className="topic-create-form" onSubmit={submit}>
      <label>Title<input name="title" placeholder="e.g. Lisbon food ideas" maxLength={120} required /></label>
      <label>Short description<textarea name="description" placeholder="What is this conversation about?" maxLength={280} rows={3} /></label>
      <label>Message time period<select name="period" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">All time</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="custom">Custom period</option></select></label>
      {period === "custom" && <div className="topic-period-fields"><label>From<input type="date" name="start_date" required /></label><label>To<input type="date" name="end_date" required /></label></div>}
      <button className="primary-button" type="submit" disabled={pending}>{pending ? "Creating topic…" : "Create topic"}</button>
    </form>
    {error && <p className="settings-feedback error" role="alert">{error}</p>}
    {created && <p className="settings-feedback success" role="status">Topic “{created.name}” created with {created.start_at ? "the selected message period" : "all time"}.</p>}
  </section>;
}
