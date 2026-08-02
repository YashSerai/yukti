"use client";

import { useMemo, useState } from "react";

export type WorkspaceTask = {
  id: string; title: string; startsAt: string; source: string; status: string; personName?: string | null;
  kind?: string | null; description?: string | null; actionState?: string | null; requiredQuestion?: string | null;
  answer?: string | null; location?: string | null; sourceUrl?: string | null;
};
export type Purchase = {
  id: string; merchant: string; amountMinor: number; currency: string; expiresAt: string; consumedAt?: string | null;
  title: string; eventTitle: string; transactionId?: string | null; transactionState?: string | null; failureCode?: string | null;
  merchantReference?: string | null; updatedAt?: string | null;
};
export type WorkspaceSnapshot = {
  tasks: WorkspaceTask[]; purchases: Purchase[];
  connections: { calendarConnected: boolean; gmailConnected: boolean; syncs: Array<{ provider: string; lastSyncedAt?: string | null; lastError?: string | null }> };
};

const money = (amount: number, currency: string) => new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(amount / 100);

export function WorkspaceToday({ snapshot, busy, error, onCreate, onUpdate, onOpenPeople }: {
  snapshot: WorkspaceSnapshot | null; busy: boolean; error: string | null;
  onCreate: (body: Record<string, unknown>) => Promise<boolean>; onUpdate: (body: Record<string, unknown>) => Promise<boolean>; onOpenPeople: () => void;
}) {
  const visible = useMemo(() => snapshot?.tasks.filter((task) => !["dismissed", "completed"].includes(task.status)) ?? [], [snapshot]);
  const [selectedId, setSelectedId] = useState<string | null>(null); const selected = visible.find((task) => task.id === selectedId) ?? visible[0];
  const [adding, setAdding] = useState(false); const [answer, setAnswer] = useState("");
  const [title, setTitle] = useState(""); const [kind, setKind] = useState("admin");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); if (await onCreate({ title: String(form.get("title") ?? title), startsAt: String(form.get("startsAt") ?? ""), kind: String(form.get("kind") ?? kind) })) { setTitle(""); setAdding(false); } };
  const answerTask = async (event: React.FormEvent) => { event.preventDefault(); if (selected && await onUpdate({ id: selected.id, answer })) setAnswer(""); };
  if (busy && !snapshot) return <section className="workspace-loading" aria-live="polite">Loading your day...</section>;
  return <section className="account-today">
    <aside className="account-agenda" aria-label="Upcoming tasks">
      <div className="agenda-title"><div><span>{new Date().toLocaleDateString([], { month: "long", year: "numeric" })}</span><h1>Today</h1></div><button onClick={() => setAdding((value) => !value)}>{adding ? "Close" : "Add"}</button></div>
      {adding && <form className="quick-task" onSubmit={submit}><label>What needs attention?<input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required /></label><label>When<input name="startsAt" type="datetime-local" required /></label><label>Type<select name="kind" value={kind} onChange={(event) => setKind(event.target.value)}><option value="admin">Personal admin</option><option value="appointment">Appointment</option><option value="occasion">Occasion</option><option value="gift">Gift</option></select></label><button className="primary" disabled={busy}>Save task</button></form>}
      <div className="account-event-list">
        {visible.map((task) => <button key={task.id} className={task.id === selected?.id ? "selected" : ""} onClick={() => setSelectedId(task.id)}><time><small>{new Date(task.startsAt).toLocaleDateString([], { weekday: "short" })}</small>{new Date(task.startsAt).getDate()}</time><span><strong>{task.title}</strong><small>{taskState(task)}</small></span></button>)}
        {!visible.length && <div className="agenda-empty"><strong>Your day is clear.</strong><p>Add a task or connect your calendar to bring upcoming plans here.</p></div>}
      </div>
    </aside>
    <article className="task-workspace">
      {error && <p className="inline-error" role="alert">{error}</p>}
      {!selected ? <div className="task-empty"><span>Nothing waiting</span><h2>Yukti will keep an eye on what comes next.</h2><p>People holds the details that make reminders and gifts personal.</p><button className="primary" onClick={onOpenPeople}>Open People</button></div> : <>
        <div className="task-heading"><div><span>{sourceName(selected.source)}</span><h2>{selected.title}</h2><p>{selected.description || defaultDescription(selected)}</p></div><time>{new Date(selected.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></div>
        {selected.requiredQuestion && !selected.answer && <form className="task-question" onSubmit={answerTask}><label>{selected.requiredQuestion}<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={500} required /></label><button className="primary" disabled={busy}>Save answer</button></form>}
        {selected.answer && <div className="task-answer"><span>Your answer</span><p>{selected.answer}</p></div>}
        {selected.personName && <p className="task-person">For {selected.personName}</p>}
        {selected.location && <p className="task-person">At {selected.location}</p>}
        <div className="task-actions"><button onClick={() => void onUpdate({ id: selected.id, state: "completed" })} disabled={busy}>Mark complete</button><button onClick={() => void onUpdate({ id: selected.id, state: "dismissed" })} disabled={busy}>Dismiss</button>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer">Open source</a>}</div>
      </>}
    </article>
  </section>;
}

export function PurchasesView({ snapshot }: { snapshot: WorkspaceSnapshot | null }) {
  const purchases = snapshot?.purchases ?? [];
  const [renderedAt] = useState(() => Date.now());
  return <section className="secondary-page purchases-page"><div className="purchases-heading"><h1>Purchases</h1><p>Approvals and checkout results stay together. Card details are entered only in secure checkout.</p></div>
    <div className="purchase-ledger">{purchases.map((item) => <article key={item.id}><div><span>{purchaseState(item, renderedAt)}</span><h2>{item.title}</h2><p>{item.merchant} · {item.eventTitle}</p></div><strong>{money(item.amountMinor, item.currency)}</strong><dl><div><dt>Approval</dt><dd>{item.consumedAt ? "Used" : Date.parse(item.expiresAt) > renderedAt ? "Ready" : "Expired"}</dd></div><div><dt>Checkout</dt><dd>{item.transactionState ? item.transactionState.replace(/_/g, " ") : "Not started"}</dd></div>{item.merchantReference && <div><dt>Reference</dt><dd>{item.merchantReference}</dd></div>}</dl></article>)}
      {!purchases.length && <div className="purchase-empty"><strong>No purchases yet.</strong><p>When you approve an item, its checkout status will appear here.</p></div>}
    </div>
  </section>;
}

export function ConnectionsView({ snapshot, busy, error, onSync }: { snapshot: WorkspaceSnapshot | null; busy: boolean; error: string | null; onSync: (provider: "calendar" | "gmail" | "all") => Promise<void> }) {
  const connect = async (kind: "calendar" | "gmail") => {
    const endpoint = kind === "calendar" ? "/api/onboarding/calendar" : "/api/connections/gmail";
    const response = await fetch(endpoint, { method: "POST" }); const result = await response.json() as { redirectUrl?: string };
    if (response.ok && result.redirectUrl) window.location.assign(result.redirectUrl);
  };
  const calendarSync = snapshot?.connections.syncs.find((item) => item.provider === "calendar"); const gmailSync = snapshot?.connections.syncs.find((item) => item.provider === "gmail");
  return <section className="secondary-page connections-page"><div className="connections-heading"><h1>Connections</h1><p>Choose where Yukti should look for dates and deadlines. Email is optional.</p></div>{error && <p className="inline-error" role="alert">{error}</p>}
    <div className="connection-ledger"><ConnectionRow title="Google Calendar" detail="Birthdays, appointments, reservations, and other upcoming events." connected={Boolean(snapshot?.connections.calendarConnected)} syncedAt={calendarSync?.lastSyncedAt} busy={busy} onConnect={() => connect("calendar")} onSync={() => onSync("calendar")} /><ConnectionRow title="Gmail" detail="Recent messages that mention appointments, renewals, deliveries, or important dates." connected={Boolean(snapshot?.connections.gmailConnected)} syncedAt={gmailSync?.lastSyncedAt} busy={busy} onConnect={() => connect("gmail")} onSync={() => onSync("gmail")} /></div>
    {(snapshot?.connections.calendarConnected || snapshot?.connections.gmailConnected) && <button className="primary sync-all" onClick={() => void onSync("all")} disabled={busy}>{busy ? "Checking..." : "Check all connected sources"}</button>}
  </section>;
}

function ConnectionRow({ title, detail, connected, syncedAt, busy, onConnect, onSync }: { title: string; detail: string; connected: boolean; syncedAt?: string | null; busy: boolean; onConnect: () => void; onSync: () => void }) {
  return <article><div><span>{connected ? "Connected" : "Not connected"}</span><h2>{title}</h2><p>{detail}</p>{syncedAt && <small>Last checked {new Date(syncedAt).toLocaleString()}</small>}</div><button onClick={connected ? onSync : onConnect} disabled={busy}>{connected ? "Check now" : "Connect"}</button></article>;
}
function taskState(task: WorkspaceTask) { if (task.requiredQuestion && !task.answer) return "Needs an answer"; if (task.kind === "occasion") return "Occasion"; if (task.kind === "appointment") return "Appointment"; return task.status === "watching" ? "Watching" : task.status.replace(/_/g, " "); }
function sourceName(source: string) { return source === "google_calendar" ? "From Google Calendar" : source === "gmail" ? "From Gmail" : source === "linq" ? "From your messages" : "Added in Yukti"; }
function defaultDescription(task: WorkspaceTask) { return task.kind === "occasion" ? "Yukti can help prepare a thoughtful gift before this date." : task.kind === "appointment" ? "Yukti will keep this appointment visible and surface anything that needs preparation." : "Yukti will keep this on your list until you complete or dismiss it."; }
function purchaseState(item: Purchase, now: number) { return item.transactionState ? item.transactionState.replace(/_/g, " ") : item.consumedAt ? "Checkout started" : Date.parse(item.expiresAt) > now ? "Approved" : "Approval expired"; }
