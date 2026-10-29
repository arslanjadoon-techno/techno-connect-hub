import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { getToken } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/config";

type OtpRequest = {
  id: string;
  backofficeStatus: string;
  managerStatus: string;
  requestStatus: string;
  message: string;
  requesterName?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type OtpSnapshot = { pending: OtpRequest[]; resolved: OtpRequest[] };

const headers = () => ({ Authorization: `Bearer ${getToken() ?? ""}` });

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
};

const normalized = (value?: string) => value?.trim().toLowerCase() || "";

const newestFirst = (items: OtpRequest[]) =>
  [...items].sort((a, b) => {
    const aTime = Date.parse(a.createdAt ?? "");
    const bTime = Date.parse(b.createdAt ?? "");
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });

function StatusPill({ label, value }: { label: string; value: string }) {
  const isApproved = normalized(value) === "approved";
  const isRejected = normalized(value) === "rejected";
  const tone = isApproved
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : isRejected
      ? "bg-red-50 text-red-700 ring-red-200"
      : "bg-amber-50 text-amber-700 ring-amber-200";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tone}`}>
      <span className="text-slate-400">{label}</span>
      {value}
    </span>
  );
}

export default function OtpApprovalPage({ kind = "manager" }: { kind?: "manager" | "backoffice" }) {
  const [pending, setPending] = useState<OtpRequest[]>([]);
  const [resolved, setResolved] = useState<OtpRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [otpDialogId, setOtpDialogId] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpDialogError, setOtpDialogError] = useState("");
  const loadingRef = useRef(false);

  const load = useCallback(async (showSpinner = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (showSpinner) setRefreshing(true);

    try {
      // A single snapshot request replaces the old pending + resolved requests.
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/otp-requests/${kind}`, {
        headers: headers(),
        cache: "no-store",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Unable to load OTP requests");

      const snapshot = body as OtpSnapshot;
      setPending(newestFirst(Array.isArray(snapshot.pending) ? snapshot.pending : []));
      setResolved(newestFirst(Array.isArray(snapshot.resolved) ? snapshot.resolved : []));
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [kind]);

  useEffect(() => {
    setError("");
    setLoading(true);
    load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load OTP requests"));

    const interval = window.setInterval(() => {
      load().catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(interval);
  }, [load]);

  const readyCount = useMemo(
    () =>
      kind === "backoffice"
        ? pending.filter((item) => normalized(item.managerStatus) === "approved").length
        : pending.length,
    [kind, pending],
  );

  const closeOtpDialog = (force = false) => {
    if (busy && !force) return;
    setOtpDialogId(null);
    setOtpValue("");
    setOtpDialogError("");
  };

  const decide = async (id: string, decision: "approve" | "reject", otp?: string) => {
    if (decision === "reject" && !window.confirm("Reject this OTP request? This cannot be undone.")) return;
    if (decision === "approve" && kind === "backoffice" && !otp?.trim()) {
      setOtpDialogError("Enter the OTP before approving.");
      return;
    }

    setBusy(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/otp-requests/${id}/${kind}/${decision}`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify(decision === "approve" && kind === "backoffice" ? { otp: otp?.trim() } : {}),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (body?.decisionSaved) await load().catch(() => undefined);
        throw new Error(body?.error || `${decision === "approve" ? "Approval" : "Rejection"} failed`);
      }

      if (decision === "approve" && kind === "backoffice") closeOtpDialog(true);
      setNotice(
        decision === "approve"
          ? kind === "backoffice"
            ? "Approved. The OTP notification is queued for the requester's direct chat, and the group was notified without the OTP."
            : "Approved. Notifications are queued for the requester and group; Backoffice can now issue the OTP."
          : "Rejected. Notifications are queued for the requester and group.",
      );
      try {
        await load(true);
      } catch {
        setError("Decision saved, but the approval list could not refresh. Refresh the page to see the latest status.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      if (decision === "approve" && kind === "backoffice") setOtpDialogError(message);
      else setError(message);
    } finally {
      setBusy(null);
    }
  };

  const approve = (id: string) => {
    if (kind === "backoffice") {
      setOtpDialogId(id);
      setOtpValue("");
      setOtpDialogError("");
      return;
    }
    void decide(id, "approve");
  };

  const portalTitle = kind === "manager" ? "Managers Portal" : "Back Office Portal";
  const portalDescription =
    kind === "manager"
      ? "Review OTP requests assigned to you."
      : "Approve manager-approved requests and send the OTP privately.";

  return (
    <main className="min-h-full bg-[#f7f8fc] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{portalTitle}</h1>
                <p className="mt-1 text-sm text-slate-500">{portalDescription}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => load(true).catch((e) => setError(e instanceof Error ? e.message : "Refresh failed"))}
            disabled={refreshing || loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} size={16} />
            Refresh
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending requests</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{pending.length}</p>
            <p className="mt-1 text-xs text-slate-500">Waiting for a decision</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Ready for action</p>
            <p className="mt-2 text-3xl font-bold text-violet-950">{readyCount}</p>
            <p className="mt-1 text-xs text-violet-700">
              {kind === "backoffice" ? "Manager-approved requests" : "Assigned to you"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolved</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{resolved.length}</p>
            <p className="mt-1 text-xs text-slate-500">Latest decisions</p>
          </div>
        </section>

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={17} />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
            <span>{notice}</span>
          </div>
        )}

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <Clock3 className="text-violet-700" size={18} /> Pending
              </h2>
              <p className="mt-1 text-xs text-slate-500">Review each request before taking action.</p>
            </div>
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">{pending.length}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500 shadow-sm">
              <Loader2 className="mr-2 animate-spin" size={18} /> Loading requests...
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
              No pending OTP requests.
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((item) => {
                const waitingForManager = kind === "backoffice" && normalized(item.managerStatus) !== "approved";
                return (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-violet-200 hover:shadow-md">
                    <div className="border-l-4 border-violet-500 p-4 sm:p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800">OTP Request</span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                              <UserRound size={13} /> {item.requesterName || "Requester"}
                            </span>
                            {item.createdAt && <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>}
                          </div>
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{item.message}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <StatusPill label="Manager" value={item.managerStatus} />
                            <StatusPill label="Backoffice" value={item.backofficeStatus} />
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                          <button
                            type="button"
                            disabled={busy === item.id || waitingForManager}
                            onClick={() => approve(item.id)}
                            title={waitingForManager ? "Waiting for manager approval" : undefined}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {busy === item.id ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                            {busy === item.id ? "Saving..." : waitingForManager ? "Waiting for manager" : kind === "backoffice" ? "Enter OTP & approve" : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={busy === item.id || waitingForManager}
                            onClick={() => void decide(item.id, "reject")}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <X size={16} /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-9 pb-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <CheckCircle2 className="text-emerald-600" size={18} /> Resolved
              </h2>
              <p className="mt-1 text-xs text-slate-500">Approved and rejected requests.</p>
            </div>
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">{resolved.length}</span>
          </div>
          {resolved.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">No resolved requests.</div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {resolved.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${normalized(item.requestStatus) === "rejected" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {item.requestStatus}
                        </span>
                        <span className="text-xs text-slate-500">{item.requesterName || "Requester"}</span>
                      </div>
                      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.message}</p>
                    </div>
                    {item.updatedAt && <span className="shrink-0 text-xs text-slate-400">{formatDate(item.updatedAt)}</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusPill label="Manager" value={item.managerStatus} />
                    <StatusPill label="Backoffice" value={item.backofficeStatus} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {otpDialogId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeOtpDialog();
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="otp-dialog-title"
            onSubmit={(event) => {
              event.preventDefault();
              void decide(otpDialogId, "approve", otpValue);
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700"><Send size={19} /></div>
              <div>
                <h2 id="otp-dialog-title" className="text-lg font-bold text-slate-950">Send OTP privately</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">The code goes to the requester&apos;s direct chat and never appears in the group.</p>
              </div>
            </div>
            <label className="mt-6 block text-sm font-semibold text-slate-700" htmlFor="otp-value">OTP code</label>
            <input
              id="otp-value"
              autoFocus
              value={otpValue}
              onChange={(event) => { setOtpValue(event.target.value); setOtpDialogError(""); }}
              placeholder="Enter OTP"
              autoComplete="one-time-code"
              inputMode="numeric"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg tracking-[0.2em] outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
            {otpDialogError && <p className="mt-2 text-sm text-red-600">{otpDialogError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={Boolean(busy)} onClick={() => closeOtpDialog()} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50">
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                {busy ? "Sending..." : "Send OTP & approve"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
