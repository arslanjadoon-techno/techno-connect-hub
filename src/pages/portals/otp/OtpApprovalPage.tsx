import { useCallback, useEffect, useState } from "react";
import { Check, CheckCircle2, Clock3, X } from "lucide-react";
import { getToken } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/config";

type OtpRequest = { id: string; backofficeStatus: string; managerStatus: string; requestStatus: string; message: string };
const headers = () => ({ Authorization: `Bearer ${getToken() ?? ""}` });

export default function OtpApprovalPage({ kind = "manager" }: { kind?: "manager" | "backoffice" }) {
  const [pending, setPending] = useState<OtpRequest[]>([]);
  const [resolved, setResolved] = useState<OtpRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      fetch(`${API_BASE_URL}/api/v1/chat/otp-requests/${kind}/pending`, { headers: headers() }),
      fetch(`${API_BASE_URL}/api/v1/chat/otp-requests/${kind}/resolved`, { headers: headers() }),
    ]);
    if (!p.ok || !r.ok) throw new Error("Unable to load OTP requests");
    setPending(await p.json()); setResolved(await r.json());
  }, [kind]);
  useEffect(() => { load().catch(e => setError(e.message)); }, [load]);
  const decide = async (id: string, decision: "approve" | "reject") => {
    if (decision === "reject" && !window.confirm("Reject this OTP request? This cannot be undone.")) return;
    setBusy(id); setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/otp-requests/${id}/${kind}/${decision}`, { method: "POST", headers: headers() });
      if (!response.ok) throw new Error(`${decision === "approve" ? "Approval" : "Rejection"} failed`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally { setBusy(null); }
  };
  return <main className="min-h-full bg-slate-50/70 p-6"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-bold">{kind === "manager" ? "Managers Portal" : "Back Office Portal"}</h1><p className="mt-1 text-sm text-slate-500">OTP approvals</p>{error && <p className="my-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}<h2 className="mb-3 mt-7 flex items-center gap-2 font-semibold"><Clock3 size={16} /> Pending ({pending.length})</h2><div className="space-y-3">{pending.length === 0 ? <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-sm">No pending OTP requests.</div> : pending.map(x => <article key={x.id} className="rounded-xl bg-white p-5 shadow-sm"><p className="whitespace-pre-wrap text-sm text-slate-700">{x.message}</p><p className="mt-2 text-xs text-slate-500">Backoffice: {x.backofficeStatus} · Manager: {x.managerStatus}</p><div className="mt-4 flex gap-2"><button disabled={busy === x.id} onClick={() => decide(x.id, "approve")} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Check size={16} />{busy === x.id ? "Saving…" : "Approve"}</button><button disabled={busy === x.id} onClick={() => decide(x.id, "reject")} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50"><X size={16} />Reject</button></div></article>)}</div><h2 className="mb-3 mt-8 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Resolved ({resolved.length})</h2><div className="space-y-3">{resolved.length === 0 ? <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-sm">No resolved requests.</div> : resolved.map(x => <article key={x.id} className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm font-semibold">{x.requestStatus}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{x.message}</p><p className="mt-2 text-xs text-slate-500">Backoffice: {x.backofficeStatus} · Manager: {x.managerStatus}</p></article>)}</div></div></main>;
}
