"use client";

import { useCallback, useEffect, useState } from "react";
import { seedAudit, seedCandidates, seedEvents } from "../lib/seed";

type View = "Today" | "People" | "Wallet" | "Audit";
type SandboxSession = { transactionId: string; checkoutUrl: string; expiresAt: string };
type SandboxOutcome = { state: "pending" | "sandbox_declined" | "completed" | "failed"; scopedCredentialsReceived: boolean; providerConfirmation?: string };
type PreparationBrief = { summary: string; candidateReasons: Array<{ candidateId: string; reason: string }>; caution: string; model: string };
type ProviderStatus = { checkedAt: string; providers: Record<string, { state: string; detail?: string; model?: string }> };
type GitHubUser = { login: string; displayName: string };
type ConciergeSnapshot = {
  mode: "connected" | "seeded";
  people: Array<{ id: string; name: string; relationship: string; updatedAt?: string }>;
  facts: Array<{ id: string; personId: string; fact: string; kind: string; value: string; status: string; origin: string; source: string; confidence: number; createdAt?: string }>;
  rules: Array<{ id: string; personId: string; personName: string; kind: string; cadenceDays: number; maximumAmountMinor: number; currency: string; enabled: number | boolean; nextEligibleAt: string; lastPreparedAt?: string | null }>;
  messages: Array<{ direction: string; body: string; processingState: string; createdAt: string }>;
  products: Array<{ id: string; merchant: string; title: string; amountMinor: number; currency: string; url: string; imageUrl?: string | null; availability: string; sourceKind: string; evidence: string; retrievedAt: string }>;
};

const money = (amount: number, currency: string) => new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(amount / 100);

export function YuktiDemo() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [view, setView] = useState<View>("Today");
  const [selectedEvent, setSelectedEvent] = useState<string>(seedEvents[0].id);
  const [selectedCandidate, setSelectedCandidate] = useState<string>(seedCandidates[0].id);
  const [approvedProduct, setApprovedProduct] = useState<{ id: string; merchant: string; title: string; price: number; currency: string } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [sandboxSession, setSandboxSession] = useState<SandboxSession | null>(null);
  const [sandboxOutcome, setSandboxOutcome] = useState<SandboxOutcome | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [brief, setBrief] = useState<PreparationBrief | null>(null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [concierge, setConcierge] = useState<ConciergeSnapshot | null>(null);
  const [conciergeBusy, setConciergeBusy] = useState(false);
  const [conciergeError, setConciergeError] = useState<string | null>(null);
  const candidate = approvedProduct ?? seedCandidates.find((item) => item.id === selectedCandidate) ?? seedCandidates[0];

  useEffect(() => {
    void fetch("/api/me", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { user?: GitHubUser };
      if (result.user) setUser(result.user);
    }).finally(() => setAuthChecking(false));
  }, []);

  const loadConcierge = useCallback(async () => {
    setConciergeBusy(true); setConciergeError(null);
    try {
      const response = await fetch("/api/concierge", { cache: "no-store" });
      const result = await response.json() as ConciergeSnapshot & { error?: string };
      if (!response.ok || !result.mode) throw new Error(result.error ?? "memory_unavailable");
      setConcierge(result);
    } catch { setConciergeError("Yukti could not load relationship memory."); }
    finally { setConciergeBusy(false); }
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/concierge", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as ConciergeSnapshot & { error?: string };
      if (!response.ok || !result.mode) throw new Error(result.error ?? "memory_unavailable");
      setConcierge(result);
    }).catch(() => setConciergeError("Yukti could not load relationship memory."));
  }, [user]);

  const updateConcierge = async (path: string, body: Record<string, unknown>) => {
    setConciergeBusy(true); setConciergeError(null);
    try {
      const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "update_failed");
      await loadConcierge();
      return result;
    } catch { setConciergeError("That change was not saved. Nothing else was changed."); return null; }
    finally { setConciergeBusy(false); }
  };

  const scanFlowers = async (send: boolean) => {
    setConciergeBusy(true); setConciergeError(null);
    try {
      const response = await fetch("/api/concierge/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ send }) });
      const result = await response.json() as { error?: string; reason?: string; state?: string };
      if (!response.ok && result.error === "grounded_search_unavailable") {
        setConciergeError(`Google Search could not verify a current option. ${result.reason ?? "No product or approval was created."}`);
        return;
      }
      if (!response.ok) throw new Error(result.error ?? "scan_failed");
      const notice = result.state === "nothing_due" ? "No flower reminder is due yet. You can change its cadence below."
        : result.state === "missing_location" ? "Add the recipient's city or postal code before Yukti searches. Delivery availability depends on the destination."
        : null;
      await loadConcierge();
      if (notice) setConciergeError(notice);
    } catch { setConciergeError("The live flower catalog is unavailable right now. Yukti did not send a message or create an approval."); }
    finally { setConciergeBusy(false); }
  };

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const transactionId = params.get("payment") === "returned" ? params.get("transaction") : null;
    if (!transactionId) return;
    void fetch("/api/prava/sessions/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transactionId }) })
      .then(async (response) => {
        const result = await response.json() as SandboxOutcome & { error?: string };
        if (!response.ok && response.status !== 202) throw new Error(result.error ?? "verify_failed");
        setSandboxOutcome(result);
      })
      .catch(() => setPaymentError("Prava’s result is not available yet. No purchase was retried."))
      .finally(() => {
        setPaymentBusy(false);
        window.history.replaceState({}, "", window.location.pathname);
      });
  }, [user]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null); reset();
  };

  const reset = () => {
    if (sandboxSession) return;
    setView("Today"); setSelectedEvent(seedEvents[0].id); setSelectedCandidate(seedCandidates[0].id); setApprovedProduct(null); setReviewing(false); setApproved(false); setApprovalId(null); setApprovalError(null); setPaymentError(null); setSandboxOutcome(null); setBrief(null); setBriefError(null);
  };

  const checkProviders = async () => {
    setStatusBusy(true); setStatusError(null);
    try {
      const response = await fetch("/api/status", { method: "POST" });
      const result = await response.json() as ProviderStatus;
      if (!response.ok || !result.providers) throw new Error("status_failed");
      setProviderStatus(result);
    } catch {
      setStatusError("Provider status is unavailable or the safety quota has been reached. No external action was attempted.");
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
      setBriefError("Gemini could not prepare a brief or the safety quota has been reached. The seeded options are still available.");
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
      setSandboxOutcome(null);
    } catch {
      setPaymentError("Prava’s sandbox could not start. Create a fresh approval and try again.");
    } finally { setPaymentBusy(false); }
  };

  const verifyPrava = async () => {
    if (!sandboxSession) return;
    setPaymentBusy(true); setPaymentError(null);
    try {
      const response = await fetch("/api/prava/sessions/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transactionId: sandboxSession.transactionId }) });
      const result = await response.json() as SandboxOutcome & { error?: string };
      if (!response.ok && response.status !== 202) throw new Error(result.error ?? "verify_failed");
      setSandboxOutcome(result);
    } catch {
      setPaymentError("Prava’s result is not available yet. No purchase was retried.");
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

  const approveProduct = async (product: ConciergeSnapshot["products"][number]) => {
    setApprovalBusy(true); setApprovalError(null);
    try {
      const response = await fetch("/api/approvals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productSnapshotId: product.id }) });
      const result = await response.json() as { approval?: { id: string }; error?: string };
      if (!response.ok || !result.approval) throw new Error(result.error ?? "approval_failed");
      setApprovedProduct({ id: `live-${product.id}`, merchant: product.merchant, title: product.title, price: product.amountMinor, currency: product.currency });
      setApprovalId(result.approval.id); setApproved(true); setView("Today"); setSelectedEvent("evt-sarah");
    } catch { setConciergeError("That live product could not be approved. Refresh the merchant result and try again."); }
    finally { setApprovalBusy(false); }
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
        {user ? <div className="auth-control"><span title={user.displayName}>@{user.login}</span><button onClick={logout}>Sign out</button></div>
          : <a className="auth-control sign-in" href="/api/auth/github/start?return_to=/">{authChecking ? "Checking sign-in…" : "Sign in with GitHub"}</a>}
      </header>

      <div className="demo-strip"><span>{concierge?.mode === "connected" ? "Connected owner" : "Seeded judge demo"}</span><p>{concierge?.mode === "connected" ? "Linq memory and product scans are live. Every purchase still waits for approval." : "Birthday recommendations are fixtures. No live purchase has been attempted."}</p><button onClick={reset} disabled={Boolean(sandboxSession)} title={sandboxSession ? "Cancel the open Prava session before resetting" : undefined}>Reset</button></div>
      {!authChecking && !user && <div className="auth-banner"><div><strong>Explore freely. Sign in only to run sponsor integrations.</strong><p>GitHub identity protects the shared sandbox keys. Yukti requests no repository or email access.</p></div><a href="/api/auth/github/start?return_to=/">Continue with GitHub</a></div>}

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
                <div className="context-line"><span>Known context</span><p>Jasmine tea · ceramics class · prefers useful gifts</p><div className="context-actions"><button onClick={() => setView("People")}>View memory</button><button onClick={prepareWithGemini} disabled={briefBusy || !user}>{briefBusy ? "Gemini is preparing…" : brief ? "Refresh Gemini brief" : "Prepare with Gemini 3.6 Flash"}</button></div></div>
                {brief && <div className="model-brief"><span>Senso memory → Gemini decision brief</span><p>{brief.summary}</p><small>{brief.caution}</small></div>}
                {briefError && <p className="inline-error" role="alert">{briefError}</p>}
                <div className="candidate-grid">
                  {seedCandidates.map((item, index) => (
                    <button key={item.id} disabled={Boolean(sandboxSession)} className={`candidate-card ${!approvedProduct && selectedCandidate === item.id ? "chosen" : ""}`} onClick={() => { setApprovedProduct(null); setSelectedCandidate(item.id); setApproved(false); setApprovalId(null); setApprovalError(null); setPaymentError(null); }}>
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
                  {!approved && user && <button className="primary" onClick={() => setReviewing(true)}>Review and approve</button>}
                  {!approved && !user && <a className="primary" href="/api/auth/github/start?return_to=/">Sign in to approve</a>}
                  {approved && !sandboxSession && <button className="primary" onClick={startPrava} disabled={paymentBusy}>{paymentBusy ? "Starting sandbox…" : "Continue in Prava sandbox"}</button>}
                  {sandboxSession && <div className="sandbox-actions"><a className="primary" href={sandboxSession.checkoutUrl} target="_blank" rel="noreferrer">Open secure Prava checkout</a><button onClick={verifyPrava} disabled={paymentBusy}>{paymentBusy ? "Checking…" : "Verify sandbox result"}</button><button onClick={cancelPrava} disabled={paymentBusy || sandboxOutcome?.state === "sandbox_declined" || sandboxOutcome?.state === "completed"}>{paymentBusy ? "Cancelling…" : "Cancel sandbox session"}</button></div>}
                  {approvalId && !sandboxSession && <p className="microcopy" role="status">Approval {approvalId.slice(0, 8)} is ready for a Prava sandbox session.</p>}
                  {sandboxSession && <p className="microcopy" role="status">Prava created a secure, scoped sandbox session. No live charge is possible.</p>}
                  {sandboxOutcome?.state === "pending" && <p className="microcopy" role="status">Prava is still securing the sandbox card. Check again in a moment.</p>}
                  {sandboxOutcome?.state === "sandbox_declined" && <p className="microcopy success-note" role="status">Scoped credentials received. The seeded merchant simulator declined the test card, and Yukti reported that outcome to Prava.</p>}
                  {sandboxOutcome?.state === "completed" && <p className="microcopy success-note" role="status">Prava confirmed the sandbox transaction lifecycle.</p>}
                  {paymentError && <p className="form-error" role="alert">{paymentError}</p>}
                  <p className="microcopy">Approval is single-use and cannot be applied to another item, merchant, or amount.</p>
                </section>
              </>
            ) : (
              <EmptyEvent eventId={selectedEvent} />
            )}
          </article>
        </section>
      ) : <SecondaryView view={view} providerStatus={providerStatus} statusBusy={statusBusy} statusError={statusError} authenticated={Boolean(user)} onCheckProviders={checkProviders}
        concierge={concierge} conciergeBusy={conciergeBusy} conciergeError={conciergeError} onReloadConcierge={loadConcierge} onUpdateConcierge={updateConcierge} onScanFlowers={scanFlowers} onApproveProduct={approveProduct} />}

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

function SecondaryView({ view, providerStatus, statusBusy, statusError, authenticated, onCheckProviders, concierge, conciergeBusy, conciergeError, onReloadConcierge, onUpdateConcierge, onScanFlowers, onApproveProduct }: { view: Exclude<View, "Today">; providerStatus: ProviderStatus | null; statusBusy: boolean; statusError: string | null; authenticated: boolean; onCheckProviders: () => void; concierge: ConciergeSnapshot | null; conciergeBusy: boolean; conciergeError: string | null; onReloadConcierge: () => Promise<void>; onUpdateConcierge: (path: string, body: Record<string, unknown>) => Promise<unknown>; onScanFlowers: (send: boolean) => Promise<void>; onApproveProduct: (product: ConciergeSnapshot["products"][number]) => Promise<void> }) {
  if (view === "People") return <PeopleView snapshot={concierge} busy={conciergeBusy} error={conciergeError} authenticated={authenticated} onReload={onReloadConcierge} onUpdate={onUpdateConcierge} onScan={onScanFlowers} onApproveProduct={onApproveProduct} />;
  if (view === "Wallet") return <section className="secondary-page"><div className="eyebrow">Wallet</div><h1>No open transactions.</h1><div className="ledger-zero"><strong>$0.00</strong><span>spent through this seeded demo</span></div><p className="page-note">Yukti creates short-lived, purchase-scoped approval envelopes. A real Prava credential is requested only after approval.</p></section>;
  return <section className="secondary-page"><div className="eyebrow">Audit</div><h1>Consequences, recorded.</h1><div className="connection-check"><div><strong>Provider readiness</strong><p>Checks configuration and read-only health. It does not send a message or start a payment.</p></div><button className="secondary" onClick={onCheckProviders} disabled={statusBusy || !authenticated}>{statusBusy ? "Checking…" : authenticated ? "Check connections" : "Sign in to check"}</button></div>{statusError && <p className="inline-error" role="alert">{statusError}</p>}{providerStatus && <div className="provider-grid" aria-live="polite">{Object.entries(providerStatus.providers).map(([name, status]) => <div key={name}><span>{name}</span><strong>{status.state.replaceAll("_", " ")}</strong>{status.detail && <small>{status.detail}</small>}</div>)}</div>}<div className="audit-list">{seedAudit.map((item) => <div key={item.time + item.title}><time>{item.time}</time><span><strong>{item.title}</strong><small>{item.detail}</small></span></div>)}</div></section>;
}

function PeopleView({ snapshot, busy, error, authenticated, onReload, onUpdate, onScan, onApproveProduct }: { snapshot: ConciergeSnapshot | null; busy: boolean; error: string | null; authenticated: boolean; onReload: () => Promise<void>; onUpdate: (path: string, body: Record<string, unknown>) => Promise<unknown>; onScan: (send: boolean) => Promise<void>; onApproveProduct: (product: ConciergeSnapshot["products"][number]) => Promise<void> }) {
  const [personName, setPersonName] = useState("Sarah");
  const [kind, setKind] = useState("preference");
  const [value, setValue] = useState("");
  const [cadence, setCadence] = useState(28);
  const [budget, setBudget] = useState(75);
  const connected = snapshot?.mode === "connected";
  const addFact = async (event: React.FormEvent) => { event.preventDefault(); await onUpdate("/api/concierge/facts", { personName, kind, value }); setValue(""); };
  const addRule = async (event: React.FormEvent) => { event.preventDefault(); await onUpdate("/api/concierge/rules", { personName, cadenceDays: cadence, maximumAmountMinor: budget * 100 }); };

  return <section className="secondary-page people-page">
    <div className="people-heading"><div><div className="eyebrow">People</div><h1>What Yukti remembers.</h1></div><p>Every fact keeps its source. Correct it, remove it, or stop reminders without opening iMessage.</p></div>
    {!authenticated && <p className="inline-error">Sign in with GitHub to open the private relationship ledger.</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    {busy && !snapshot && <p className="page-note" role="status">Loading relationship memory...</p>}
    {snapshot && <div className="relationship-ledger">
      <aside className="people-rail" aria-label="People in memory">
        {snapshot.people.map((person) => <button type="button" key={person.id} onClick={() => setPersonName(person.name)} className={personName.toLowerCase() === person.name.toLowerCase() ? "active-person" : ""}><span>{person.name.slice(0, 1)}</span><strong>{person.name}</strong><small>{person.relationship}</small></button>)}
        {!snapshot.people.length && <p>No one saved yet. Add the first fact or text Yukti.</p>}
      </aside>
      <div className="memory-sheet">
        <div className="memory-sheet-head"><div><h2>{personName}</h2><p>{connected ? "Connected memory" : "Seeded judge memory"}</p></div><button className="secondary" onClick={() => void onReload()} disabled={busy}>Refresh</button></div>
        <div className="fact-list">
          {snapshot.facts.filter((fact) => snapshot.people.find((person) => person.id === fact.personId)?.name.toLowerCase() === personName.toLowerCase()).map((fact) => <MemoryFactRow key={fact.id} fact={fact} editable={connected} busy={busy} onUpdate={onUpdate} />)}
          {!snapshot.facts.length && <p className="memory-empty">Text Yukti something like &quot;Sarah loves tulips&quot; or add a fact below.</p>}
        </div>
        {connected && <form className="memory-form" onSubmit={addFact}>
          <label>Person<input value={personName} onChange={(event) => setPersonName(event.target.value)} maxLength={40} required /></label>
          <label>Fact type<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="preference">Preference</option><option value="relationship">Relationship</option><option value="budget">Budget</option><option value="location">Delivery location</option><option value="note">Note</option></select></label>
          <label className="fact-value">What should Yukti remember?<input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Loves tulips" maxLength={120} required /></label>
          <button className="primary" disabled={busy}>Save fact</button>
        </form>}
      </div>
    </div>}

    {connected && <section className="proactive-workbench">
      <div className="cadence-copy"><h2>Flowers, prepared on your cadence.</h2><p>Yukti finds a current option and asks first. A recurring reminder never becomes a recurring charge.</p></div>
      <form onSubmit={addRule} className="cadence-form"><label>Person<input value={personName} onChange={(event) => setPersonName(event.target.value)} required /></label><label>Every<span><input type="number" min="7" max="365" value={cadence} onChange={(event) => setCadence(Number(event.target.value))} /> days</span></label><label>Stay under<span><input type="number" min="10" max="1000" value={budget} onChange={(event) => setBudget(Number(event.target.value))} /> USD</span></label><button className="secondary" disabled={busy}>Save reminder</button></form>
      <div className="rule-list">{snapshot?.rules.map((rule) => <div key={rule.id}><div><strong>{rule.personName}: flowers every {rule.cadenceDays} days</strong><small>Up to {money(rule.maximumAmountMinor, rule.currency)}. Next scan {new Date(rule.nextEligibleAt).toLocaleDateString()}.</small></div><button onClick={() => void onUpdate("/api/concierge/rules/toggle", { id: rule.id, enabled: !Boolean(rule.enabled) })} disabled={busy}>{rule.enabled ? "Pause" : "Resume"}</button></div>)}</div>
      <div className="scan-actions"><button className="primary" onClick={() => void onScan(false)} disabled={busy || !snapshot?.rules.length}>{busy ? "Checking..." : "Find a live flower option"}</button><button className="send-action" onClick={() => void onScan(true)} disabled={busy || !snapshot?.rules.length}>Prepare and text me</button></div>
      <div className="real-products">{snapshot?.products.map((product) => <LiveProductCard key={product.id} product={product} busy={busy} onApprove={onApproveProduct} />)}</div>
    </section>}

    {connected && snapshot?.messages.length ? <section className="conversation-log"><h2>Recent Linq conversation</h2>{snapshot.messages.map((message, index) => <div key={`${message.createdAt}-${index}`} className={message.direction}><span>{message.direction === "inbound" ? "You" : "Yukti"}</span><p>{message.body}</p><time>{new Date(message.createdAt).toLocaleString()}</time></div>)}</section> : null}
  </section>;
}

function LiveProductCard({ product, busy, onApprove }: { product: ConciergeSnapshot["products"][number]; busy: boolean; onApprove: (product: ConciergeSnapshot["products"][number]) => Promise<void> }) {
  const evidence = parseProductEvidence(product.evidence);
  return <article>{product.imageUrl && <img src={product.imageUrl} alt="" />}<div><span>{product.merchant} · retrieved {new Date(product.retrievedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span><h3>{product.title}</h3><strong>From {money(product.amountMinor, product.currency)}</strong><p>{product.availability}</p>{evidence && <div className="grounding-note"><small>{evidence.toolUsed === "google_search" ? "Google Search checked" : "Gemini checked the live merchant page"} for {evidence.location}. The merchant still confirms the exact address and delivery date.</small>{evidence.citations.map((citation, index) => <a key={citation.url} href={citation.url} target="_blank" rel="noreferrer">Source {index + 1}: {citation.title}</a>)}</div>}<div className="product-actions"><button onClick={() => void onApprove(product)} disabled={busy}>Approve this exact option</button><a href={product.url} target="_blank" rel="noreferrer">View current merchant page</a></div></div></article>;
}

function parseProductEvidence(raw: string) {
  try {
    const value = JSON.parse(raw) as { deliveryLocation?: string; groundedResearch?: { toolUsed?: "google_search" | "url_context_fallback"; citations?: Array<{ url: string; title: string }> } };
    const citations = value.groundedResearch?.citations?.filter((item) => /^https:\/\//.test(item.url)).slice(0, 3) ?? [];
    return value.deliveryLocation && citations.length ? { location: value.deliveryLocation, citations, toolUsed: value.groundedResearch?.toolUsed ?? "google_search" } : null;
  } catch { return null; }
}

function MemoryFactRow({ fact, editable, busy, onUpdate }: { fact: ConciergeSnapshot["facts"][number]; editable: boolean; busy: boolean; onUpdate: (path: string, body: Record<string, unknown>) => Promise<unknown> }) {
  const [editing, setEditing] = useState(false); const [value, setValue] = useState(fact.value || fact.fact);
  return <div className="memory-row"><div className="memory-provenance"><span>{fact.kind}</span><small>{fact.origin} · {fact.source}</small></div>{editing ? <input value={value} onChange={(event) => setValue(event.target.value)} aria-label={`Edit ${fact.kind}`} /> : <p>{fact.value || fact.fact}</p>}<div className="memory-controls">{editable && (editing ? <button onClick={async () => { await onUpdate("/api/concierge/facts/update", { id: fact.id, value }); setEditing(false); }} disabled={busy}>Save</button> : <button onClick={() => setEditing(true)}>Correct</button>)}{editable && <button onClick={() => void onUpdate("/api/concierge/facts/delete", { id: fact.id })} disabled={busy}>Delete</button>}</div></div>;
}
