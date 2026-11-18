"use client";

import { FormEvent, useState } from "react";

type Answer = {
  title: string;
  body: string;
  bullets: string[];
};

const defaultAnswer: Answer = {
  title: "Suggested trip plan",
  body: "Start by confirming the October dates. Once the dates work for school holidays, book a Tokyo base near Shibuya and reserve one Kyoto restaurant before filling in the day-by-day itinerary.",
  bullets: [
    "Confirm the October dates with the family",
    "Shortlist and compare two Tokyo hotels",
    "Choose a Kyoto restaurant and check availability",
  ],
};

function answerFor(prompt: string): Answer {
  const query = prompt.toLowerCase();

  if (query.includes("decision") || query.includes("decided")) {
    return {
      title: "What the family has decided",
      body: "Japan is the preferred destination. The dates and accommodation are still open, so they should not be treated as confirmed yet.",
      bullets: ["Destination: Japan", "Dates: not confirmed", "Accommodation: not confirmed"],
    };
  }

  if (query.includes("book") || query.includes("still") || query.includes("need")) {
    return {
      title: "What still needs to be booked",
      body: "The next booking decisions are the October dates, Tokyo accommodation, and one Kyoto restaurant.",
      bullets: ["Agree the school-holiday dates", "Book a Tokyo hotel near Shibuya", "Reserve a Kyoto restaurant"],
    };
  }

  if (query.includes("packing")) {
    return {
      title: "Starter packing list",
      body: "This is a first draft based on the October trip discussion. It should be updated when the final dates and activities are known.",
      bullets: ["Comfortable walking shoes", "Light layers for October", "Travel adapters and medicines"],
    };
  }

  return defaultAnswer;
}

export function TopicAssistant() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;
    setAnswer(answerFor(cleanPrompt));
  }

  function handleExample(example: string) {
    setPrompt(example);
    setAnswer(answerFor(example));
  }

  return (
    <section className="topic-assistant" aria-labelledby="topic-assistant-title">
      <div className="assistant-heading">
        <div>
          <span className="family-overline">ASK THIS TOPIC</span>
          <h3 id="topic-assistant-title">What would you like to work out?</h3>
          <p>Ask a question in your own words. The answer will be shown with the messages used.</p>
        </div>
        <span className="summary-spark">✦</span>
      </div>
      <form className="assistant-form" onSubmit={submit}>
        <input
          aria-label="Ask about this topic"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Give me the plan for the trip…"
        />
        <button className="primary-button" type="submit">Ask</button>
      </form>
      <div className="assistant-examples" aria-label="Example questions">
        <span>Try asking:</span>
        {["Give me the plan for the trip", "What have we decided?", "What still needs to be booked?", "Make a packing list"].map((example) => (
          <button type="button" key={example} onClick={() => handleExample(example)}>{example}</button>
        ))}
      </div>
      {answer && <div className="assistant-answer" aria-live="polite">
        <div className="assistant-answer-head"><div><span className="family-overline">DRAFTED FROM TOPIC MESSAGES</span><h4>{answer.title}</h4></div><span className="suggestion-pill">Suggested</span></div>
        <p>{answer.body}</p>
        <ul>{answer.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
        <div className="assistant-sources"><span>Sources</span><button type="button">Mum · 09:12 ↗</button><button type="button">Dad · 09:25 ↗</button><button type="button">Jamie · 09:16 ↗</button></div>
      </div>}
    </section>
  );
}
