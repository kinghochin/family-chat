"use client";

import { useState } from "react";

export function TelegramTestButton() {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  async function sendTest() {
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/integrations/telegram/test", { method: "POST" });
      const body = await response.json().catch(() => ({})) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || body.ok !== true) throw new Error(body.error || "The Telegram test failed.");
      setFeedback({ ok: true, text: body.message || "Test message sent to Getherly msg." });
    } catch (error) {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : "The Telegram test failed." });
    } finally {
      setPending(false);
    }
  }

  return <div className="telegram-test-control">
    <button className="outline-button" type="button" onClick={sendTest} disabled={pending}>
      {pending ? "Sending test…" : "Send test to Getherly msg"}
    </button>
    <p className="settings-note">Sends a fixed diagnostic message to the configured Telegram group. The bot token stays on the server.</p>
    {feedback && <p className={`settings-feedback ${feedback.ok ? "success" : "error"}`} role={feedback.ok ? "status" : "alert"}>{feedback.text}</p>}
  </div>;
}
