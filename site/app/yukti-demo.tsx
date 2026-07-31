"use client";

import { useState } from "react";
import { seedAudit, seedCandidates, seedEvents } from "../lib/seed";

type View = "Today" | "People" | "Wallet" | "Audit";
type SandboxSession = { transactionId: string; checkoutUrl: string; expiresAt: string };
type PreparationBrief = { summary: string; candidateReasons: Array<{ candidateId: string; reason: string }>; caution: string; model: string };
type ProviderStatus = { checkedAt: string; providers: Record<string, { state: string; detail?: string; model?: string }> };

const money = (amount: number, currency: string) => new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(amount / 100);

export function YuktiDemo() {
  const [view, setView] = useState<View>("Today");
  const [selectedEvent, setSelectedEvent] = useState<string>(seedEvents[0].id);
  const [selectedCandidate, setSelectedCandidate] = useState<string>(seedCandidates[0].id);
  const [reviewing, setReviewing] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [sandboxSession, setSandboxSession] = useState<SandboxSession | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [brief, setBrief] = useState<PreparationBrief | null>(null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const candidate = seedCandidates.find((item) => item.id === selectedCandidate) ?? seedCandidates[0];

  const reset = () => {
    if (sandboxSession) return;
    setView("Today"); setSelectedEvent(seedEvents[0].id); setSelectedCandidate(seedCandidates[0].id); setReviewing(false); setApproved(false); setApprovalId(null); setApprovalError(null); setPaymentError(null); setBrief(null); setBriefError(null);
  };

  const checkProviders = async () => {
    setStatusBusy(true); setStatusError(null);
    try {
      const response = await fetch("/api/status", { method: "POST" });
      const result = await response.json() as ProviderStatus;
      if (!response.ok || !result.providers) throw new Error("status_failed");
      setProviderStatus(result);
    } catch {
      setStatusError("Provider status is unavailable. No external action was attempted.");
    } finally { setStatusBusy(false); }
  };

  const prepareWithGemini = async () => {
    setBriefBusy(true); setBriefError(null);
    try {
      const response = await fetch("/api/prepare", { method: "POST" });
      const result = await response.json() as { brief?: PreparationBrief; error?: string };
      if (!response.ok || !result.brief) throw new Error(result.error ?? "prepare_failed");
      setBrief(result.brief);
    } catch {
      setBriefError("Gemini could not prepare a brief. The seeded options are still available.");
    } finally { setBriefBusy(false); }
  };

  const startPrava = async () => {
    if (!approvalId) return;
    setPaymentBusy(true); setPaymentError(null);
    try {
      const response = await fetch("/api/prava/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ approvalId }) });
      const result = await response.json() as Partial<SandboxSession> & { error?: string };
      if (!response.ok || !result.transactionId || !result.checkoutUrl || !result.expiresAt) throw new Error(result.error ?? "session_failed");
      setSandboxSession(result as SandboxSession);
    } catch {
      setPaymentError("Prava’s sandbox could not start. Create a fresh approval and try again.");
    } finally { setPaymentBusy(false); }
  };

  const cancelPrava = async () => {
    if (!sandboxSession) return;
    setPaymentBusy(true); setPaymentError(null);
    try {
      const response = await fetch("/api/prava/sessions/revoke", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transactionId: sandboxSession.transactionId }) });
      if (!response.ok) throw new Error("revoke_failed");
      setSandboxSession(null); setApproved(false); setApprovalId(null);
    } catch {
      setPaymentError("Yukti could not confirm cancellation. The sandbox session expires after 15 minutes.");
    } finally { setPaymentBusy(false); }
  };

  const approve = async () => {
    setApprovalBusy(true);
    setApprovalError(null);
    try {
      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id }),
      });
      const result = await response.json() as { approval?: { id: string }; error?: string };
      if (!response.ok || !result.approval) throw new Error(result.error ?? "approval_failed");
      setApprovalId(result.approval.id);
      setApproved(true);
      setReviewing(false);
    } catch {
      setApprovalError("Approval could not be recorded. Please try again.");
    } finally {
      setApprovalBusy(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="wordmark" onClick={reset} disabled={Boolean(sandboxSession)} aria-label="Reset Yukti demo"><span>Y</span> Yukti</button>
        <nav aria-label="Primary navigation">
          {(["Today", "People", "Wallet", "Audit"] as View[]).map((item) => (
            <button key={item} className={view === item ? "nav-active" : ""} onClick={() => setView(item)}>{item}</button>
          ))}
        </nav>
        <span className="avatar" aria-label="Signed in as Yash Serai">YS</span>
      </header>

      <div className="demo-strip"><span>Seeded judge demo</span><p>Recommendations are fixtures. No live purchase has been attempted.</p><button onClick={reset} disabled={Boolean(sandboxSession)} title={sandboxSession ? "Cancel the open Prava session before resetting" : undefined}>Reset</button></div>

      {view === "Today" ? (
        <section className="today-grid">
          <aside className="calendar-panel" aria-label="Upcoming events">
            <div className="eyebrow">August 2026</div>
            <h1>What needs your attention.</h1>
            <div className="event-list">
              {seedEvents.map((event) => (
                <button key={event.id} className={`event-row ${selectedEvent === event.id ? "selected" : ""}`} onClick={() => setSelectedEvent(event.id)}>
                  <span className="date-tile"><small>{event.day}</small>{event.date}</span>
                  <span className="event-copy"><strong>{event.title}</strong><small>{event.time} · {event.state}</small></span>
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </div>
            <div className="privacy-note"><span aria-hidden="true">◇</span><p><strong>Preparation stays private.</strong> Yukti shows what it used and waits before any transaction.</p></div>
          </aside>

          <article className="workspace">
            {selectedEvent === "evt-sarah" ? (
              <>
                <div className="workspace-head"><div><div className="eyebrow brass">Ready to review</div><h2>Sarah’s birthday, prepared.</h2><p>Two options fit what you remember about Sarah and can arrive before dinner.</p></div><div className="deadline"><small>Decision window</small><strong>2 days</strong><span>for comfortable delivery</span></div></div>
                <div className="context-line"><span>Known context</span><p>Jasmine tea · ceramics class · prefers useful gifts</p><div className="context-actions"><button onClick={() => setView("People")}>View memory</button><button onClick={prepareWithGemini} disabled={briefBusy}>{briefBusy ? "Gemini is preparing…" : brief ? "Refresh Gemini brief" : "Prepare with Gemini 3.6 Flash"}</button></div></div>
                {brief && <div className="model-brief"><span>Senso memory → Gemini decision brief</span><p>{brief.summary}</p><small>{brief.caution}</small></div>}
                {briefError && <p className="inline-error" role="alert">{briefError}</p>}
                <div className="candidate-grid">
                  {seedCandidates.map((item, index) => (
                    <button key={item.id} disabled={Boolean(sandboxSession)} className={`candidate-card ${selectedCandidate === item.id ? "chosen" : ""}`} onClick={() => { setSelectedCandidate(item.id); setApproved(false); setApprovalId(null); setApprovalError(null); setPaymentError(null); }}>
                      <div className={`object-study study-${index + 1}`} aria-hidden="true"><span /><i /></div>
                      <span className="merchant">{item.merchant}</span><h3>{item.title}</h3><p>{item.reason}</p>
                      {brief && <p className="model-reason">{brief.candidateReasons.find((reason) => reason.candidateId === item.id)?.reason}</p>}
                      <div className="candidate-meta"><strong>{money(item.price, item.currency)}</strong><span>{item.arrival}</span></div>
                      <small>{brief ? `Senso fixture → ${brief.model}` : item.evidence}</small>
                    </button>
                  ))}
                </div>
                <section className="approval-envelope">
                  <div className="fold" aria-hidden="true" />
                  <div><span className="eyebrow">Transaction envelope</span><h3>{candidate.title}</h3><p>{candidate.merchant} · {money(candidate.price, candidate.currency)} · CAD only</p></div>
                  <dl><div><dt>Bound to</dt><dd>Sarah’s birthday dinner</dd></div><div><dt>Expires</dt><dd>In 15 minutes</dd></div><div><dt>Status</dt><dd>{approved ? "Recorded on server" : "Awaiting you"}</dd></div></dl>
                  {!approved && <button className="primary" onClick={() => setReviewing(true)}>Review and approve</button>}
                  {approved && !sandboxSession && <button className="primary" onClick={startPrava} disabled={paymentBusy}>{paymentBusy ? "Starting sandbox…" : "Continue in Prava sandbox"}</button>}
                  {sandboxSession && <div className="sandbox-actions"><a className="primary" href={sandboxSession.checkoutUrl} target="_blank" rel="noreferrer">Open secure Prava checkout</a><button onClick={cancelPrava} disabled={paymentBusy}>{paymentBusy ? "Cancelling…" : "Cancel sandbox session"}</button></div>}
                  {approvalId && !sandboxSession && <p className="microcopy" role="status">Approval {approvalId.slice(0, 8)} is ready for a Prava sandbox session.</p>}
                  {sandboxSession && <p className="microcopy" role="status">Prava created a secure, scoped sandbox session. No live charge is possible.</p>}
                  {paymentError && <p className="form-error" role="alert">{paymentError}</p>}
                  <p className="microcopy">Approval is single-use and cannot be applied to another item, merchant, or amount.</p>
                </section>
              </>
            ) : (
              <EmptyEvent eventId={selectedEvent} />
            )}
          </article>
        </section>
      ) : <SecondaryView view={view} providerStatus={providerStatus} statusBusy={statusBusy} statusError={statusError} onCheckProviders={checkProviders} />}

      {reviewing && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setReviewing(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="approval-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setReviewing(false)} aria-label="Close review">×</button>
            <span className="eyebrow brass">Final check</span><h2 id="approval-title">Approve this exact purchase?</h2>
            <div className="receipt"><p>{candidate.title}</p><span>{candidate.merchant}</span><strong>{money(candidate.price, candidate.currency)}</strong></div>
            <ul><li>Only this merchant and amount</li><li>Expires after 15 minutes</li><li>No card details are stored by Yukti</li></ul>
            <button className="primary wide" onClick={approve} disabled={approvalBusy}>{approvalBusy ? "Recording exact approval…" : approved ? "Create a fresh approval" : "Approve seeded demo"}</button>
            {approvalError && <p className="form-error" role="alert">{approvalError}</p>}
            <p className="modal-foot">This records a single-use approval on Yukti’s server. It does not contact Prava or charge a card.</p>
          </section>
        </div>
      )}
    </main>
  );
}

function EmptyEvent({ eventId }: { eventId: string }) {
  const passport = eventId === "evt-passport";
  return <div className="empty-event"><span className="large-mark">{passport ? "12" : "15"}</span><div className="eyebrow brass">{passport ? "Needs one answer" : "Watching"}</div><h2>{passport ? "Passport renewal needs your travel date." : "Nothing to do yet."}</h2><p>{passport ? "Yukti can prepare the renewal checklist after you confirm whether international travel is booked in the next six months." : "Yukti will surface the dentist follow-up if a form, payment, or calendar decision appears."}</p><p className="page-note">{passport ? "Travel detail collection is outside this transaction demo." : "No action is available until the follow-up becomes relevant."}</p></div>;
}

function SecondaryView({ view, providerStatus, statusBusy, statusError, onCheckProviders }: { view: Exclude<View, "Today">; providerStatus: ProviderStatus | null; statusBusy: boolean; statusError: string | null; onCheckProviders: () => void }) {
  if (view === "People") return <section className="secondary-page"><div className="eyebrow">People</div><h1>Memory you can inspect.</h1><div className="person-card"><span className="avatar large">S</span><div><h2>Sarah</h2><p>Friend · 3 saved facts · all seeded</p></div><span className="fixture-label">Read-only fixture</span></div><p className="page-note">Jasmine tea · taking a ceramics class · prefers useful gifts</p></section>;
  if (view === "Wallet") return <section className="secondary-page"><div className="eyebrow">Wallet</div><h1>No open transactions.</h1><div className="ledger-zero"><strong>$0.00</strong><span>spent through this seeded demo</span></div><p className="page-note">Yukti creates short-lived, purchase-scoped approval envelopes. A real Prava credential is requested only after approval.</p></section>;
  return <section className="secondary-page"><div className="eyebrow">Audit</div><h1>Consequences, recorded.</h1><div className="connection-check"><div><strong>Provider readiness</strong><p>Checks configuration and read-only health. It does not send a message or start a payment.</p></div><button className="secondary" onClick={onCheckProviders} disabled={statusBusy}>{statusBusy ? "Checking…" : "Check connections"}</button></div>{statusError && <p className="inline-error" role="alert">{statusError}</p>}{providerStatus && <div className="provider-grid" aria-live="polite">{Object.entries(providerStatus.providers).map(([name, status]) => <div key={name}><span>{name}</span><strong>{status.state.replaceAll("_", " ")}</strong>{status.detail && <small>{status.detail}</small>}</div>)}</div>}<div className="audit-list">{seedAudit.map((item) => <div key={item.time + item.title}><time>{item.time}</time><span><strong>{item.title}</strong><small>{item.detail}</small></span></div>)}</div></section>;
}
