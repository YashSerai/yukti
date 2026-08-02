"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { seedCandidates, seedEvents } from "../lib/seed";
import { ConnectionsView, PurchasesView, WorkspaceToday, type WorkspaceSnapshot } from "./workspace-views";

type View = "Today" | "People" | "Purchases" | "Activity" | "Connections";
type SandboxSession = { transactionId: string; checkoutUrl: string; expiresAt: string };
type SandboxOutcome = { state: "pending" | "sandbox_declined" | "completed" | "failed"; scopedCredentialsReceived: boolean; providerConfirmation?: string };
type PreparationBrief = { summary: string; candidateReasons: Array<{ candidateId: string; reason: string }>; caution: string; model: string };
type GitHubUser = { login: string; displayName: string };
type OnboardingStatus = {
  isOwner: boolean; complete: boolean; phoneConnected: boolean; phone: string | null; pairingPending: boolean;
  pairingExpiresAt: string | null; peopleCount: number; calendarConnected: boolean; linqNumber: string | null;
};
type ConciergeSnapshot = {
  mode: "connected";
  people: Array<{ id: string; name: string; relationship: string; updatedAt?: string }>;
  facts: Array<{ id: string; personId: string; fact: string; kind: string; value: string; status: string; origin: string; source: string; confidence: number; createdAt?: string }>;
  rules: Array<{ id: string; personId: string; personName: string; kind: string; cadenceDays: number; maximumAmountMinor: number; currency: string; enabled: number | boolean; nextEligibleAt: string; lastPreparedAt?: string | null }>;
  messages: Array<{ direction: string; body: string; processingState: string; createdAt: string }>;
  products: Array<{ id: string; personName?: string | null; merchant: string; title: string; amountMinor: number; currency: string; url: string; imageUrl?: string | null; availability: string; sourceKind: string; evidence: string; retrievedAt: string }>;
  activity: Array<{ kind: string; detail: string; createdAt: string }>;
};

const money = (amount: number, currency: string) => new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(amount / 100);

const factSourceLabel = (source: string) => /^linq\b/i.test(source) ? "From your messages" : "Added in Yukti";

const messageDisplayValue = (body: string) => body.replace(/^For the demo,\s*/i, "");

const memoryDisplayValue = (fact: ConciergeSnapshot["facts"][number]) => {
  const raw = fact.value || fact.fact;
  if (fact.kind !== "budget") return raw;
  const parsed = /^(\d+)\s+([A-Z]{3})$/.exec(raw);
  return parsed ? money(Number(parsed[1]), parsed[2]) : raw;
};

export function YuktiDemo() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [view, setView] = useState<View>("Today");
  const [selectedEvent, setSelectedEvent] = useState<string>(seedEvents[0].id);
  const [selectedCandidate, setSelectedCandidate] = useState<string>(seedCandidates[0].id);
  const [approvedProduct, setApprovedProduct] = useState<{ id: string; personName?: string | null; merchant: string; title: string; price: number; currency: string } | null>(null);
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
  const [concierge, setConcierge] = useState<ConciergeSnapshot | null>(null);
  const [conciergeBusy, setConciergeBusy] = useState(false);
  const [conciergeError, setConciergeError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const candidate = approvedProduct ?? seedCandidates.find((item) => item.id === selectedCandidate) ?? seedCandidates[0];
  const ownerTasks = workspace?.tasks.filter((task) => !["dismissed", "completed"].includes(task.status)) ?? [];
  const ownerEvents = [
    ...seedEvents.filter((event) => event.id === "evt-sarah" || !workspace || ownerTasks.some((task) => task.title === event.title)),
    ...ownerTasks.filter((task) => !["Passport renewal", "Dentist follow-up", "Sarah's birthday dinner"].includes(task.title)).map((task) => ({
      id: task.id,
      day: new Date(task.startsAt).toLocaleDateString([], { weekday: "short" }),
      date: String(new Date(task.startsAt).getDate()).padStart(2, "0"),
      title: task.title,
      time: new Date(task.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      person: task.personName ?? "You",
      state: task.requiredQuestion && !task.answer ? "Needs one answer" : task.status === "watching" ? "Watching" : task.status.replace(/_/g, " "),
      kind: task.kind ?? "admin",
    })),
  ];
  const selectedWorkspaceTask = ownerTasks.find((task) => task.id === selectedEvent)
    ?? ownerTasks.find((task) => selectedEvent === "evt-passport" ? task.title === "Passport renewal" : selectedEvent === "evt-dentist" ? task.title === "Dentist follow-up" : false);

  useEffect(() => {
    void fetch("/api/me", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { user?: GitHubUser; onboarding?: OnboardingStatus };
      if (result.user) setUser(result.user);
      if (result.onboarding) setOnboarding(result.onboarding);
    }).catch(() => undefined).finally(() => setAuthResolved(true));
  }, []);

  const refreshIdentity = useCallback(async () => {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (!response.ok) throw new Error("identity_unavailable");
    const result = await response.json() as { user: GitHubUser; onboarding: OnboardingStatus };
    setUser(result.user); setOnboarding(result.onboarding);
    return result.onboarding;
  }, []);

  const loadConcierge = useCallback(async () => {
    setConciergeBusy(true); setConciergeError(null);
    try {
      const response = await fetch("/api/concierge", { cache: "no-store" });
      const result = await response.json() as ConciergeSnapshot & { error?: string };
      if (!response.ok || !result.mode) throw new Error(result.error ?? "memory_unavailable");
      setConcierge(result);
    } catch { setConciergeError("Couldn’t load your people right now."); }
    finally { setConciergeBusy(false); }
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/concierge", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as ConciergeSnapshot & { error?: string };
      if (!response.ok || !result.mode) throw new Error(result.error ?? "memory_unavailable");
      setConcierge(result);
    }).catch(() => setConciergeError("Couldn’t load your people right now."));
  }, [user]);

  const loadWorkspace = useCallback(async () => {
    setWorkspaceBusy(true); setWorkspaceError(null);
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const result = await response.json() as WorkspaceSnapshot & { error?: string };
      if (!response.ok || !Array.isArray(result.tasks)) throw new Error(result.error ?? "workspace_unavailable");
      setWorkspace(result);
    } catch { setWorkspaceError("Couldn’t load your day right now."); }
    finally { setWorkspaceBusy(false); }
  }, []);

  useEffect(() => {
    if (!user || !onboarding?.complete) return;
    void fetch("/api/workspace", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as WorkspaceSnapshot & { error?: string };
      if (!response.ok || !Array.isArray(result.tasks)) throw new Error(result.error ?? "workspace_unavailable");
      setWorkspace(result);
    }).catch(() => setWorkspaceError("Couldn’t load your day right now."));
  }, [user, onboarding?.complete]);

  const updateWorkspace = async (path: string, body: Record<string, unknown>) => {
    setWorkspaceBusy(true); setWorkspaceError(null);
    try {
      const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "workspace_update_failed");
      await loadWorkspace(); return true;
    } catch { setWorkspaceError("That change was not saved. Nothing else was changed."); return false; }
    finally { setWorkspaceBusy(false); }
  };

  const syncConnections = async (provider: "calendar" | "gmail" | "all") => {
    setWorkspaceBusy(true); setWorkspaceError(null);
    try {
      const response = await fetch("/api/connections/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider }) });
      if (!response.ok) throw new Error("sync_failed"); await loadWorkspace();
    } catch { setWorkspaceError("Yukti couldn’t check that source. Your existing tasks are unchanged."); }
    finally { setWorkspaceBusy(false); }
  };

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
      const result = await response.json() as { error?: string; state?: string };
      if (!response.ok && result.error === "grounded_search_unavailable") {
        setConciergeError("Couldn’t verify current merchant details. No product or approval was created.");
        return;
      }
      if (!response.ok) throw new Error(result.error ?? "scan_failed");
      const notice = result.state === "nothing_due" ? "No flower reminder is due yet. You can change its cadence below."
        : result.state === "missing_location" ? "Add the recipient's city or postal code before Yukti searches. Delivery availability depends on the destination."
        : null;
      await loadConcierge();
      if (notice) setConciergeError(notice);
    } catch { setConciergeError("Flower search is unavailable right now. No message was sent and no approval was created."); }
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
    setUser(null); setOnboarding(null); setConcierge(null); setWorkspace(null); reset();
  };

  const reset = () => {
    if (sandboxSession) return;
    setView("Today"); setSelectedEvent(seedEvents[0].id); setSelectedCandidate(seedCandidates[0].id); setApprovedProduct(null); setReviewing(false); setApproved(false); setApprovalId(null); setApprovalError(null); setPaymentError(null); setSandboxOutcome(null); setBrief(null); setBriefError(null);
  };

  const prepareWithGemini = async () => {
    setBriefBusy(true); setBriefError(null);
    try {
      const response = await fetch("/api/prepare", { method: "POST" });
      const result = await response.json() as { brief?: PreparationBrief; error?: string };
      if (!response.ok || !result.brief) throw new Error(result.error ?? "prepare_failed");
      setBrief(result.brief);
    } catch {
      setBriefError("Couldn’t refresh the options. Your saved choices are still available.");
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
      setApprovedProduct({ id: `live-${product.id}`, personName: product.personName, merchant: product.merchant, title: product.title, price: product.amountMinor, currency: product.currency });
      setApprovalId(result.approval.id); setApproved(true); setView("Today");
    } catch { setConciergeError("Couldn’t approve that option. Check the merchant page again and retry."); }
    finally { setApprovalBusy(false); }
  };

  if (!authResolved) return <LandingPage />;
  if (!user) return <LandingPage />;
  if (!onboarding) return <ProductError onRetry={() => void refreshIdentity()} />;
  if (!onboarding.complete) return <OnboardingFlow user={user} status={onboarding} onStatus={setOnboarding} onComplete={refreshIdentity} onSignOut={logout} />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="wordmark" onClick={reset} disabled={Boolean(sandboxSession)} aria-label="Reset Yukti"><span>Y</span> Yukti</button>
        <nav aria-label="Primary navigation">
          {(["Today", "People", "Purchases", "Activity", "Connections"] as View[]).map((item) => (
            <button key={item} className={view === item ? "nav-active" : ""} onClick={() => setView(item)}>{item}</button>
          ))}
        </nav>
        <div className="auth-control"><span title={user.displayName}>@{user.login}</span><button onClick={logout}>Sign out</button></div>
      </header>

      {view === "Today" ? (onboarding.isOwner ? (
        <section className="today-grid">
          <aside className="calendar-panel" aria-label="Upcoming events">
            <div className="eyebrow">August 2026</div>
            <h1>Upcoming</h1>
            <div className="event-list">
              {ownerEvents.map((event) => (
                <button key={event.id} className={`event-row ${selectedEvent === event.id ? "selected" : ""}`} onClick={() => setSelectedEvent(event.id)}>
                  <span className="date-tile"><small>{event.day}</small>{event.date}</span>
                  <span className="event-copy"><strong>{event.title}</strong><small>{event.time} · {event.state}</small></span>
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </aside>

          <article className="workspace">
            {selectedEvent === "evt-sarah" ? (
              <>
                <div className="workspace-head"><div><div className="eyebrow brass">Ready to review</div><h2>Sarah’s birthday</h2><p>Two options match what you remember about Sarah and can arrive before dinner.</p></div><div className="deadline"><small>Order within</small><strong>2 days</strong><span>for comfortable delivery</span></div></div>
                <div className="context-line"><span>What Yukti used</span><p>Jasmine tea · ceramics class · prefers useful gifts</p><div className="context-actions"><button onClick={() => setView("People")}>View Sarah</button><button onClick={prepareWithGemini} disabled={briefBusy || !user}>{briefBusy ? "Checking options…" : brief ? "Check again" : "Check current options"}</button></div></div>
                {brief && <div className="model-brief"><span>Why these fit</span><p>{brief.summary}</p><small>{brief.caution}</small></div>}
                {briefError && <p className="inline-error" role="alert">{briefError}</p>}
                <div className="candidate-grid">
                  {seedCandidates.map((item, index) => (
                    <button key={item.id} disabled={Boolean(sandboxSession)} className={`candidate-card ${!approvedProduct && selectedCandidate === item.id ? "chosen" : ""}`} onClick={() => { setApprovedProduct(null); setSelectedCandidate(item.id); setApproved(false); setApprovalId(null); setApprovalError(null); setPaymentError(null); }}>
                      <div className={`object-study study-${index + 1}`} aria-hidden="true"><span /><i /></div>
                      <span className="merchant">{item.merchant}</span><h3>{item.title}</h3><p>{item.reason}</p>
                      {brief && <p className="model-reason">{brief.candidateReasons.find((reason) => reason.candidateId === item.id)?.reason}</p>}
                      <div className="candidate-meta"><strong>{money(item.price, item.currency)}</strong><span>{item.arrival}</span></div>
                      <small>{brief ? "Checked against memory and current product details" : item.evidence}</small>
                    </button>
                  ))}
                </div>
                <section className="approval-envelope">
                  <div className="fold" aria-hidden="true" />
                  <div><span className="eyebrow">Purchase approval</span><h3>{candidate.title}</h3><p>{candidate.merchant} · {money(candidate.price, candidate.currency)}</p></div>
                  <dl><div><dt>For</dt><dd>Sarah’s birthday dinner</dd></div><div><dt>Expires</dt><dd>In 15 minutes</dd></div><div><dt>Status</dt><dd>{approved ? "Approved" : "Needs approval"}</dd></div></dl>
                  {!approved && user && <button className="primary" onClick={() => setReviewing(true)}>Review and approve</button>}
                  {!approved && !user && <a className="primary" href="/api/auth/github/start?return_to=/">Sign in to approve</a>}
                  {approved && !sandboxSession && <button className="primary" onClick={startPrava} disabled={paymentBusy}>{paymentBusy ? "Opening checkout…" : "Continue to secure checkout"}</button>}
                  {sandboxSession && <div className="sandbox-actions"><a className="primary" href={sandboxSession.checkoutUrl} target="_blank" rel="noreferrer">Open secure Prava checkout</a><button onClick={verifyPrava} disabled={paymentBusy}>{paymentBusy ? "Checking…" : "Verify sandbox result"}</button><button onClick={cancelPrava} disabled={paymentBusy || sandboxOutcome?.state === "sandbox_declined" || sandboxOutcome?.state === "completed"}>{paymentBusy ? "Cancelling…" : "Cancel sandbox session"}</button></div>}
                  {approvalId && !sandboxSession && <p className="microcopy" role="status">Your approval is ready for checkout.</p>}
                  {sandboxSession && <p className="microcopy" role="status">Prava created a secure, scoped sandbox session. No live charge is possible.</p>}
                  {sandboxOutcome?.state === "pending" && <p className="microcopy" role="status">Prava is still securing the sandbox card. Check again in a moment.</p>}
                  {sandboxOutcome?.state === "sandbox_declined" && <p className="microcopy success-note" role="status">Scoped credentials received. The merchant declined the test card, and Yukti reported that outcome to Prava.</p>}
                  {sandboxOutcome?.state === "completed" && <p className="microcopy success-note" role="status">Prava confirmed the sandbox transaction lifecycle.</p>}
                  {paymentError && <p className="form-error" role="alert">{paymentError}</p>}
                  <p className="microcopy">Approval is single-use and cannot be applied to another item, merchant, or amount.</p>
                </section>
              </>
            ) : (
              <OwnerTask eventId={selectedEvent} task={selectedWorkspaceTask} busy={workspaceBusy} onUpdate={async (body) => {
                const saved = await updateWorkspace("/api/tasks/update", body);
                if (saved && ["completed", "dismissed"].includes(String(body.state))) setSelectedEvent("evt-sarah");
                return saved;
              }} />
            )}
          </article>
        </section>
      ) : <WorkspaceToday snapshot={workspace} busy={workspaceBusy} error={workspaceError} onCreate={(body) => updateWorkspace("/api/tasks", body)} onUpdate={(body) => updateWorkspace("/api/tasks/update", body)} onOpenPeople={() => setView("People")} />) : <SecondaryView view={view} authenticated={Boolean(user)}
        concierge={concierge} conciergeBusy={conciergeBusy} conciergeError={conciergeError} onReloadConcierge={loadConcierge} onUpdateConcierge={updateConcierge} onScanFlowers={scanFlowers} onApproveProduct={approveProduct} workspace={workspace} workspaceBusy={workspaceBusy} workspaceError={workspaceError} onSyncConnections={syncConnections} />}

      {reviewing && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setReviewing(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="approval-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setReviewing(false)} aria-label="Close review">×</button>
            <h2 id="approval-title">Approve this purchase?</h2>
            <div className="receipt"><p>{candidate.title}</p><span>{candidate.merchant}</span><strong>{money(candidate.price, candidate.currency)}</strong></div>
            <ul><li>Only this merchant and amount</li><li>Expires after 15 minutes</li><li>No card details are stored by Yukti</li></ul>
            <button className="primary wide" onClick={approve} disabled={approvalBusy}>{approvalBusy ? "Saving approval…" : approved ? "Approve again" : "Approve purchase"}</button>
            {approvalError && <p className="form-error" role="alert">{approvalError}</p>}
            <p className="modal-foot">Checkout opens next. You will not be charged here.</p>
          </section>
        </div>
      )}
    </main>
  );
}

function ProductError({ onRetry }: { onRetry: () => void }) {
  return <main className="product-error"><Link className="landing-wordmark" href="/">Yukti</Link><h1>We couldn&apos;t open your account.</h1><p>Your data was not changed.</p><button className="primary" onClick={onRetry}>Try again</button></main>;
}

function LandingPage() {
  return <main className="landing-page">
    <header className="landing-nav"><a className="landing-wordmark" href="#top">Yukti</a><nav aria-label="Landing page"><a href="#how">How it works</a><a className="landing-sign-in" href="/api/auth/github/start?return_to=/">Sign in</a></nav></header>
    <section className="landing-hero" id="top">
      <div className="landing-copy"><p className="eyebrow brass">A gifting concierge that remembers</p><h1>Thoughtful gifts, without starting from scratch.</h1><p className="landing-lede">Tell Yukti who matters to you, what they like, and what you usually spend. It keeps those details ready, finds a current option when the time is right, and waits for your approval before checkout.</p><div className="landing-actions"><a className="primary" href="/api/auth/github/start?return_to=/">Get started with GitHub</a><a href="#how">See how it works</a></div><small>GitHub is used only to keep each account separate.</small></div>
      <div className="gift-still" aria-hidden="true"><div className="gift-lid" /><div className="gift-box"><span className="ribbon-vertical" /><span className="ribbon-horizontal" /></div><div className="gift-note">For someone<br />you know well.</div><div className="brass-dish" /><div className="stem stem-one" /><div className="stem stem-two" /></div>
    </section>
    <section className="landing-method" id="how"><div><span>01</span><h2>Remember the person</h2><p>Save only what you tell Yukti through your messages or account.</p></div><div><span>02</span><h2>Prepare the gift</h2><p>Yukti checks a current merchant page against the person, place, and budget.</p></div><div><span>03</span><h2>Approve the purchase</h2><p>You review the exact item, merchant, amount, and expiry before checkout opens.</p></div></section>
    <footer className="landing-footer"><span>Yukti</span><a href="/api/auth/github/start?return_to=/">Open your account</a></footer>
  </main>;
}

function OnboardingFlow({ user, status, onStatus, onComplete, onSignOut }: { user: GitHubUser; status: OnboardingStatus; onStatus: (status: OnboardingStatus) => void; onComplete: () => Promise<OnboardingStatus>; onSignOut: () => Promise<void> }) {
  const [phone, setPhone] = useState("");
  const [pairing, setPairing] = useState<{ code: string; message: string; linqNumber: string; expiresAt: string } | null>(null);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [personSaved, setPersonSaved] = useState(status.peopleCount > 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/onboarding", { cache: "no-store" });
    if (!response.ok) return null;
    const next = await response.json() as OnboardingStatus;
    onStatus(next); setPersonSaved(next.peopleCount > 0);
    return next;
  }, [onStatus]);

  useEffect(() => {
    if (status.phoneConnected || (!pairing && !status.pairingPending)) return;
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [pairing, refresh, status.pairingPending, status.phoneConnected]);

  const startPairing = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const response = await fetch("/api/onboarding/pair", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }) });
      const result = await response.json() as { code?: string; message?: string; linqNumber?: string; expiresAt?: string; error?: string };
      if (!response.ok || !result.code || !result.message || !result.linqNumber || !result.expiresAt) throw new Error(result.error ?? "pairing_failed");
      setPairing(result as { code: string; message: string; linqNumber: string; expiresAt: string });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error && caught.message === "phone_already_connected" ? "That number is already connected to another Yukti account." : "We couldn't start the connection. Check the number and try again.");
    } finally { setBusy(false); }
  };

  const addPerson = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const response = await fetch("/api/onboarding/person", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, relationship }) });
      if (!response.ok) throw new Error("person_failed");
      setPersonSaved(true); await refresh();
    } catch { setError("That person was not saved. Try again."); }
    finally { setBusy(false); }
  };

  const connectCalendar = async () => {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/onboarding/calendar", { method: "POST" });
      const result = await response.json() as { redirectUrl?: string };
      if (!response.ok || !result.redirectUrl) throw new Error("calendar_failed");
      window.location.assign(result.redirectUrl);
    } catch { setError("Calendar connection is unavailable right now. You can finish setup and connect it later."); setBusy(false); }
  };

  const finish = async () => {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/onboarding/complete", { method: "POST" });
      if (!response.ok) throw new Error("complete_failed");
      await onComplete();
    } catch { setError("Setup is not complete yet. Check the steps above."); setBusy(false); }
  };

  const step = !status.phoneConnected ? 1 : !personSaved ? 2 : 3;
  return <main className="onboarding-shell">
    <header><Link className="landing-wordmark" href="/">Yukti</Link><div><span>@{user.login}</span><button onClick={() => void onSignOut()}>Sign out</button></div></header>
    <section className="onboarding-card">
      <div className="onboarding-progress" aria-label={`Setup step ${step} of 3`}><i className={step >= 1 ? "done" : ""} /><i className={step >= 2 ? "done" : ""} /><i className={step >= 3 ? "done" : ""} /></div>
      {step === 1 && <div className="onboarding-step"><p className="eyebrow brass">Step 1 of 3</p><h1>Connect your messages</h1><p>Yukti learns only from messages sent to its number. Enter the mobile number you will text from, then send the pairing message exactly as shown.</p>
        {!pairing ? <form onSubmit={startPairing}><label>Your mobile number<input inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 604 555 0123" required /></label><button className="primary" disabled={busy}>{busy ? "Preparing…" : status.pairingPending ? "Create a new code" : "Continue"}</button></form>
          : <div className="pairing-instruction"><span>From {phone || "your phone"}, text</span><strong>{pairing.message}</strong><span>to</span><a href={`sms:${pairing.linqNumber}?body=${encodeURIComponent(pairing.message)}`}>{pairing.linqNumber}</a><small>This code expires in 10 minutes. This page updates after your message arrives.</small></div>}
      </div>}
      {step === 2 && <div className="onboarding-step"><p className="eyebrow brass">Step 2 of 3</p><h1>Add someone you care about</h1><p>Start with one person. Yukti will use this relationship only inside your account.</p><form onSubmit={addPerson}><label>Their name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex" maxLength={40} required /></label><label>Your relationship<input value={relationship} onChange={(event) => setRelationship(event.target.value)} placeholder="Friend" maxLength={40} required /></label><button className="primary" disabled={busy}>{busy ? "Saving…" : "Save and continue"}</button></form></div>}
      {step === 3 && <div className="onboarding-step"><p className="eyebrow brass">Step 3 of 3</p><h1>Bring in important dates</h1><p>Connect Google Calendar so Yukti can prepare for birthdays and plans already on your schedule. You can also add reminders manually.</p><div className="calendar-choice">{status.calendarConnected ? <p className="connected-note">Google Calendar is connected.</p> : <button className="secondary wide" onClick={connectCalendar} disabled={busy}>{busy ? "Opening Google…" : "Connect Google Calendar"}</button>}<button className="primary wide" onClick={finish} disabled={busy}>{status.calendarConnected ? "Finish setup" : "Finish without calendar"}</button></div></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  </main>;
}

function OwnerTask({ eventId, task, busy, onUpdate }: { eventId: string; task?: WorkspaceSnapshot["tasks"][number]; busy: boolean; onUpdate: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [answer, setAnswer] = useState("");
  const passport = eventId === "evt-passport" || task?.title === "Passport renewal";
  const title = task?.title ?? (passport ? "Passport renewal" : "Dentist follow-up");
  const question = task?.requiredQuestion ?? (passport ? "Do you have international travel booked in the next six months?" : null);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (task && await onUpdate({ id: task.id, answer })) setAnswer(""); };
  return <div className="empty-event"><span className="large-mark">{task ? String(new Date(task.startsAt).getDate()).padStart(2, "0") : passport ? "12" : "15"}</span><div className="eyebrow brass">{question && !task?.answer ? "Needs one answer" : "Watching"}</div><h2>{title}</h2><p>{task?.description ?? (passport ? "Confirm your travel plans and Yukti will keep the renewal checklist moving." : "Yukti will keep this appointment visible and surface anything that needs preparation.")}</p>
    {question && !task?.answer && task && <form className="task-question" onSubmit={submit}><label>{question}<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={500} required /></label><button className="primary" disabled={busy}>Save answer</button></form>}
    {task?.answer && <div className="task-answer"><span>Your answer</span><p>{task.answer}</p></div>}
    {task && <div className="task-actions"><button onClick={() => void onUpdate({ id: task.id, state: "completed" })} disabled={busy}>Mark complete</button><button onClick={() => void onUpdate({ id: task.id, state: "dismissed" })} disabled={busy}>Dismiss</button>{task.sourceUrl && <a href={task.sourceUrl} target="_blank" rel="noreferrer">Open source</a>}</div>}
    {!task && <p className="page-note">This task is still loading.</p>}
  </div>;
}

function SecondaryView({ view, authenticated, concierge, conciergeBusy, conciergeError, onReloadConcierge, onUpdateConcierge, onScanFlowers, onApproveProduct, workspace, workspaceBusy, workspaceError, onSyncConnections }: { view: Exclude<View, "Today">; authenticated: boolean; concierge: ConciergeSnapshot | null; conciergeBusy: boolean; conciergeError: string | null; onReloadConcierge: () => Promise<void>; onUpdateConcierge: (path: string, body: Record<string, unknown>) => Promise<unknown>; onScanFlowers: (send: boolean) => Promise<void>; onApproveProduct: (product: ConciergeSnapshot["products"][number]) => Promise<void>; workspace: WorkspaceSnapshot | null; workspaceBusy: boolean; workspaceError: string | null; onSyncConnections: (provider: "calendar" | "gmail" | "all") => Promise<void> }) {
  if (view === "People") return <PeopleView snapshot={concierge} busy={conciergeBusy} error={conciergeError} authenticated={authenticated} onReload={onReloadConcierge} onUpdate={onUpdateConcierge} onScan={onScanFlowers} onApproveProduct={onApproveProduct} />;
  if (view === "Purchases") return <PurchasesView snapshot={workspace} />;
  if (view === "Connections") return <ConnectionsView snapshot={workspace} busy={workspaceBusy} error={workspaceError} onSync={onSyncConnections} />;
  return <section className="secondary-page"><div className="activity-heading"><h1>Activity</h1><p>A record of changes and approvals in your account.</p></div><div className="audit-list">{concierge?.activity.map((item) => <div key={`${item.createdAt}-${item.kind}`}><time>{new Date(item.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time><span><strong>{activityLabel(item.kind)}</strong><small>{activityDetail(item.kind, item.detail)}</small></span></div>)}{!concierge?.activity.length && <p className="page-note">Your approvals, memory changes, and checkout results will appear here.</p>}</div></section>;
}

function PeopleView({ snapshot, busy, error, authenticated, onReload, onUpdate, onScan, onApproveProduct }: { snapshot: ConciergeSnapshot | null; busy: boolean; error: string | null; authenticated: boolean; onReload: () => Promise<void>; onUpdate: (path: string, body: Record<string, unknown>) => Promise<unknown>; onScan: (send: boolean) => Promise<void>; onApproveProduct: (product: ConciergeSnapshot["products"][number]) => Promise<void> }) {
  const [personName, setPersonName] = useState("");
  const [kind, setKind] = useState("preference");
  const [value, setValue] = useState("");
  const [cadence, setCadence] = useState(28);
  const [budget, setBudget] = useState(75);
  const connected = snapshot?.mode === "connected";
  const activePersonName = personName || snapshot?.people[0]?.name || "";
  const addFact = async (event: React.FormEvent) => { event.preventDefault(); await onUpdate("/api/concierge/facts", { personName: activePersonName, kind, value }); setValue(""); };
  const addRule = async (event: React.FormEvent) => { event.preventDefault(); await onUpdate("/api/concierge/rules", { personName: activePersonName, cadenceDays: cadence, maximumAmountMinor: budget * 100 }); };

  return <section className="secondary-page people-page">
    <div className="people-heading"><div><h1>People</h1></div><p>Review what Yukti remembers and where each detail came from.</p></div>
    {!authenticated && <p className="inline-error">Sign in to see and edit your people.</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    {busy && !snapshot && <p className="page-note" role="status">Loading people...</p>}
    {snapshot && <div className="relationship-ledger">
      <aside className="people-rail" aria-label="People in memory">
        {snapshot.people.map((person) => <button type="button" key={person.id} onClick={() => setPersonName(person.name)} className={activePersonName.toLowerCase() === person.name.toLowerCase() ? "active-person" : ""}><span>{person.name.slice(0, 1)}</span><strong>{person.name}</strong><small>{person.relationship}</small></button>)}
        {!snapshot.people.length && <p>No one saved yet. Add the first fact or text Yukti.</p>}
      </aside>
      <div className="memory-sheet">
        <div className="memory-sheet-head"><div><h2>{activePersonName}</h2></div><button className="secondary" onClick={() => void onReload()} disabled={busy}>Refresh</button></div>
        <div className="fact-list">
          {snapshot.facts.filter((fact) => snapshot.people.find((person) => person.id === fact.personId)?.name.toLowerCase() === activePersonName.toLowerCase()).map((fact) => <MemoryFactRow key={fact.id} fact={fact} editable={connected} busy={busy} onUpdate={onUpdate} />)}
          {!snapshot.facts.length && <p className="memory-empty">Text Yukti what this person likes, or add a fact below.</p>}
        </div>
        {connected && <form className="memory-form" onSubmit={addFact}>
          <label>Person<input value={activePersonName} onChange={(event) => setPersonName(event.target.value)} maxLength={40} required /></label>
          <label>Fact type<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="preference">Preference</option><option value="relationship">Relationship</option><option value="budget">Budget</option><option value="location">Delivery location</option><option value="note">Note</option></select></label>
          <label className="fact-value">What should Yukti remember?<input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Loves tulips" maxLength={120} required /></label>
          <button className="primary" disabled={busy}>Save fact</button>
        </form>}
      </div>
    </div>}

    {connected && <section className="proactive-workbench">
      <div className="cadence-copy"><h2>Flower reminder</h2><p>When it is due, Yukti finds a current option and asks before any purchase.</p></div>
      <form onSubmit={addRule} className="cadence-form"><label>Person<input value={activePersonName} onChange={(event) => setPersonName(event.target.value)} required /></label><label>Every<span><input type="number" min="7" max="365" value={cadence} onChange={(event) => setCadence(Number(event.target.value))} /> days</span></label><label>Stay under<span><input type="number" min="10" max="1000" value={budget} onChange={(event) => setBudget(Number(event.target.value))} /> USD</span></label><button className="secondary" disabled={busy}>Save reminder</button></form>
      <div className="rule-list">{snapshot?.rules.map((rule) => <div key={rule.id}><div><strong>{rule.personName}: flowers every {rule.cadenceDays} days</strong><small>Up to {money(rule.maximumAmountMinor, rule.currency)}. Next scan {new Date(rule.nextEligibleAt).toLocaleDateString()}.</small></div><button onClick={() => void onUpdate("/api/concierge/rules/toggle", { id: rule.id, enabled: !Boolean(rule.enabled) })} disabled={busy}>{rule.enabled ? "Pause" : "Resume"}</button></div>)}</div>
      <div className="scan-actions"><button className="primary" onClick={() => void onScan(false)} disabled={busy || !snapshot?.rules.length}>{busy ? "Checking..." : "Find a flower option"}</button><button className="send-action" onClick={() => void onScan(true)} disabled={busy || !snapshot?.rules.length}>Find and text me</button></div>
      <div className="real-products">{snapshot?.products.map((product) => <LiveProductCard key={product.id} product={product} busy={busy} onApprove={onApproveProduct} />)}</div>
    </section>}

    {connected && snapshot?.messages.length ? <section className="conversation-log"><h2>Recent messages</h2>{snapshot.messages.map((message, index) => <div key={`${message.createdAt}-${index}`} className={message.direction}><span>{message.direction === "inbound" ? "You" : "Yukti"}</span><p>{messageDisplayValue(message.body)}</p><time>{new Date(message.createdAt).toLocaleString()}</time></div>)}</section> : null}
  </section>;
}

function LiveProductCard({ product, busy, onApprove }: { product: ConciergeSnapshot["products"][number]; busy: boolean; onApprove: (product: ConciergeSnapshot["products"][number]) => Promise<void> }) {
  const evidence = parseProductEvidence(product.evidence);
  return <article>{product.imageUrl && <Image src={product.imageUrl} alt="" width={130} height={150} unoptimized />}<div><span>{product.merchant} · checked {new Date(product.retrievedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span><h3>{product.title}</h3><strong>From {money(product.amountMinor, product.currency)}</strong><p>{product.availability}</p>{evidence && <div className="grounding-note"><small>Current merchant page checked for {evidence.location}. The merchant confirms the exact address and delivery date.</small>{evidence.citations.map((citation) => <a key={citation.url} href={citation.url} target="_blank" rel="noreferrer">{citation.title}</a>)}</div>}<div className="product-actions"><button onClick={() => void onApprove(product)} disabled={busy}>Approve this option</button><a href={product.url} target="_blank" rel="noreferrer">View merchant page</a></div></div></article>;
}

function parseProductEvidence(raw: string) {
  try {
    const value = JSON.parse(raw) as { deliveryLocation?: string; groundedResearch?: { toolUsed?: "google_search" | "url_context_fallback"; citations?: Array<{ url: string; title: string }> } };
    const citations = value.groundedResearch?.citations?.filter((item) => /^https:\/\//.test(item.url)).slice(0, 3) ?? [];
    return value.deliveryLocation && citations.length ? { location: value.deliveryLocation, citations, toolUsed: value.groundedResearch?.toolUsed ?? "google_search" } : null;
  } catch { return null; }
}

function activityLabel(kind: string) {
  return ({
    "approval.created": "Purchase approved",
    "memory.deleted": "Memory removed",
    "preparation.generated": "Gift options refreshed",
    "payment.sandbox_result": "Checkout result received",
    "linq.reply_failed": "Message reply delayed",
    "onboarding.completed": "Account setup completed",
  } as Record<string, string>)[kind] ?? "Account updated";
}

function activityDetail(kind: string, raw: string) {
  try {
    const detail = JSON.parse(raw) as { amountMinor?: number; currency?: string; state?: string };
    if (kind === "approval.created" && detail.amountMinor && detail.currency) return `${money(detail.amountMinor, detail.currency)} approved for one checkout.`;
    if (kind === "payment.sandbox_result") return detail.state ? `Checkout returned ${detail.state.replace(/_/g, " ")}.` : "Checkout returned a result.";
  } catch { /* Older activity may not contain structured details. */ }
  return kind === "memory.deleted" ? "A saved detail was deleted."
    : kind === "preparation.generated" ? "Yukti checked your saved context again."
    : kind === "linq.reply_failed" ? "Your message was saved, but the reply could not be sent."
    : kind === "onboarding.completed" ? "Messages and your first person are ready."
    : "Your account changed.";
}

function MemoryFactRow({ fact, editable, busy, onUpdate }: { fact: ConciergeSnapshot["facts"][number]; editable: boolean; busy: boolean; onUpdate: (path: string, body: Record<string, unknown>) => Promise<unknown> }) {
  const [editing, setEditing] = useState(false); const [value, setValue] = useState(fact.value || fact.fact);
  return <div className="memory-row"><div className="memory-provenance"><span>{fact.kind}</span><small>{factSourceLabel(fact.source)}</small></div>{editing ? <input value={value} onChange={(event) => setValue(event.target.value)} aria-label={`Edit ${fact.kind}`} /> : <p>{memoryDisplayValue(fact)}</p>}<div className="memory-controls">{editable && (editing ? <button onClick={async () => { await onUpdate("/api/concierge/facts/update", { id: fact.id, value }); setEditing(false); }} disabled={busy}>Save</button> : <button onClick={() => setEditing(true)}>Correct</button>)}{editable && <button onClick={() => void onUpdate("/api/concierge/facts/delete", { id: fact.id })} disabled={busy}>Delete</button>}</div></div>;
}
