"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";

type ItemType = "link" | "place" | "note" | "image" | "message";

type ResearchItem = {
  id: string;
  title: string;
  description: string;
  url?: string;
  type: ItemType;
  source: string;
  collectionId: string;
};

type Collection = {
  id: string;
  name: string;
  eyebrow: string;
  color: string;
};

const initialCollections: Collection[] = [
  { id: "inbox", name: "Inbox", eyebrow: "Fresh ideas", color: "violet" },
  { id: "tokyo", name: "Tokyo", eyebrow: "City energy", color: "orange" },
  { id: "kyoto", name: "Kyoto", eyebrow: "Slow moments", color: "green" },
  { id: "food", name: "Food & coffee", eyebrow: "Worth a detour", color: "pink" },
];

const initialItems: ResearchItem[] = [
  {
    id: "item-1",
    title: "Tsukiji Outer Market",
    description: "Early morning sushi, tamagoyaki and tiny stalls to explore.",
    url: "https://www.japan.travel/",
    type: "place",
    source: "Saved from web",
    collectionId: "tokyo",
  },
  {
    id: "item-2",
    title: "Fushimi Inari at sunrise",
    description: "Go before breakfast to beat the crowds and catch soft light.",
    type: "message",
    source: "Wife’s recommendation",
    collectionId: "kyoto",
  },
  {
    id: "item-3",
    title: "Kissa Balloon",
    description: "Retro kissaten with excellent coffee and pudding.",
    url: "https://maps.google.com/",
    type: "link",
    source: "Saved from Threads",
    collectionId: "food",
  },
  {
    id: "item-4",
    title: "Book a pocket Wi-Fi",
    description: "Compare airport pickup options before the trip.",
    type: "note",
    source: "Personal note",
    collectionId: "inbox",
  },
];

const icons: Record<ItemType, string> = {
  link: "↗",
  place: "⌖",
  note: "✦",
  image: "▧",
  message: "☼",
};

function DraggableCard({ item }: { item: ResearchItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`research-card ${isDragging ? "is-dragging" : ""}`}
    >
      <div className="card-topline">
        <span className={`item-icon ${item.type}`}>{icons[item.type]}</span>
        <span className="source-label">{item.source}</span>
        <span className="drag-grip">⠿</span>
      </div>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      {item.url && <div className="card-link">{item.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>}
      <div className="card-footer">
        <span className="type-pill">{item.type}</span>
        <span className="more-button">···</span>
      </div>
    </article>
  );
}

function CollectionColumn({ collection, items }: { collection: Collection; items: ResearchItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: collection.id });
  return (
    <section ref={setNodeRef} className={`collection-column ${collection.color} ${isOver ? "is-over" : ""}`}>
      <div className="column-header">
        <div>
          <span className="column-eyebrow">{collection.eyebrow}</span>
          <h2>{collection.name}</h2>
        </div>
        <span className="item-count">{items.length}</span>
      </div>
      <div className="column-items">
        {items.map((item) => <DraggableCard key={item.id} item={item} />)}
        {items.length === 0 && <div className="empty-column">Drop an idea here</div>}
      </div>
      <button className="column-add" type="button">＋ Add item</button>
    </section>
  );
}

export default function TripBoard() {
  const [collections] = useState(initialCollections);
  const [items, setItems] = useState(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCollection, setNewCollection] = useState("inbox");
  const [search, setSearch] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const visibleItems = useMemo(
    () => items.filter((item) => `${item.title} ${item.description} ${item.source}`.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );
  const activeItem = items.find((item) => item.id === activeId);

  function handleDragStart(event: { active: { id: string | number } }) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const target = String(event.over?.id ?? "");
    if (!target || !collections.some((collection) => collection.id === target)) return;
    setItems((current) => current.map((item) => item.id === String(event.active.id) ? { ...item, collectionId: target } : item));
  }

  function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTitle.trim()) return;
    setItems((current) => [
      ...current,
      {
        id: `item-${Date.now()}`,
        title: newTitle.trim(),
        description: newUrl.trim() ? "Saved link ready for your trip plan." : "A new idea to organise later.",
        url: newUrl.trim() || undefined,
        type: newUrl.trim() ? "link" : "note",
        source: "Added manually",
        collectionId: newCollection,
      },
    ]);
    setNewTitle("");
    setNewUrl("");
    setShowComposer(false);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark"><span>✦</span> Gatherly</div>
        <div className="workspace-switcher"><span className="workspace-dot">J</span><span>Jamie’s workspace</span><span className="chevron">⌄</span></div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#topics"><span>▦</span> My topics <b>3</b></a>
          <a className="nav-link" href="#shared"><span>♧</span> Shared with me</a>
          <a className="nav-link" href="#saved"><span>♡</span> Saved items</a>
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-link" href="#settings"><span>⚙</span> Settings</a>
          <div className="profile"><span className="avatar">JC</span><div><strong>Jamie Chen</strong><small>Free plan</small></div><span className="more-button">···</span></div>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>My topics</span><span>/</span><strong>Japan trip · October 2027</strong></div>
          <div className="top-actions"><button className="icon-button" type="button" aria-label="Notifications">♧</button><button className="avatar small" type="button">JC</button></div>
        </header>

        <div className="content-wrap">
          <div className="hero-row">
            <div>
              <div className="topic-kicker">TRIP PLAN <span>•</span> 4 collaborators</div>
              <h1>Japan trip <span>· October 2027</span></h1>
              <p className="hero-copy">All the places, ideas and recommendations worth keeping.</p>
            </div>
            <div className="hero-actions"><button className="secondary-button" type="button">↗ Share</button><button className="primary-button" type="button" onClick={() => setShowComposer(true)}>＋ Add idea</button></div>
          </div>

          <div className="toolbar"><div className="view-tabs"><button className="view-tab active" type="button">▦ Board</button><button className="view-tab" type="button">☷ List</button><button className="view-tab" type="button">◷ Timeline</button></div><label className="search-box"><span>⌕</span><input aria-label="Search ideas" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ideas" /></label><button className="filter-button" type="button">☷ Filter</button></div>

          {showComposer && <form className="composer" onSubmit={addItem}><div><span className="composer-label">ADD TO YOUR PLAN</span><h2>Save an idea</h2></div><input autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="What do you want to remember?" /><input value={newUrl} onChange={(event) => setNewUrl(event.target.value)} placeholder="Paste a link (optional)" type="url" /><select value={newCollection} onChange={(event) => setNewCollection(event.target.value)} aria-label="Collection">{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select><div className="composer-actions"><button type="button" className="secondary-button" onClick={() => setShowComposer(false)}>Cancel</button><button className="primary-button" type="submit">Save idea</button></div></form>}

          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="board"><div className="board-tip"><span>✦</span> Drag ideas between collections to shape your trip</div>{collections.map((collection) => <CollectionColumn key={collection.id} collection={collection} items={visibleItems.filter((item) => item.collectionId === collection.id)} />)}<button className="new-column" type="button"><span>＋</span><strong>New collection</strong><small>Organise your ideas your way</small></button></div>
            <DragOverlay>{activeItem ? <DraggableCard item={activeItem} /> : null}</DragOverlay>
          </DndContext>
        </div>
      </section>
    </main>
  );
}
