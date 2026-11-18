export function SourceBadge({ source }: { source: "Telegram" | "Web" | "Hermes" }) {
  return <span className={`source-badge ${source.toLowerCase()}`}>{source === "Telegram" ? "✈" : source === "Hermes" ? "✦" : "⌨"} {source}</span>;
}
