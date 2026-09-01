"use client";

import { useState } from "react";

export function BuyerVerificationPanel({ status, latestRequest, notifications = [] }) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isPending = latestRequest?.status === "PENDING";
  const requestPending = isPending || submitted;
  const rejectionReason = latestRequest?.status === "REJECTED" ? latestRequest.adminNote : "";

  async function reapply() {
    setSending(true); setMessage("");
    try {
      const response = await fetch("/api/buyer/verification-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not submit your request.");
      setSubmitted(true);
      setMessage("Your new verification request has been sent to the admin and is pending review.");
      setNote("");
    } catch (requestError) { setMessage(requestError.message || "Could not submit your request."); } finally { setSending(false); }
  }

  return <><section className={`mt-5 rounded-2xl border p-5 ${status === "VERIFIED" ? "border-green-200 bg-green-50" : status === "REJECTED" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}><h2 className="text-xl font-black">Buyer verification</h2>
    {status === "VERIFIED" ? <p className="mt-2 font-semibold text-green-800">✓ Your buyer business profile is verified.</p> : <><p className="mt-2 text-sm font-semibold">{requestPending ? "Status: Pending — your request is with the admin." : status === "REJECTED" ? "Status: Rejected — you can submit a new request after reviewing the reason below." : "Status: Pending — verification will be reviewed by an admin."}</p>
      {rejectionReason && <p className="mt-3 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-800"><span className="font-black">Admin rejection reason:</span> {rejectionReason}</p>}
      {!requestPending && status !== "VERIFIED" && <><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength="500" placeholder="Optional note for the admin" className="mt-4 w-full rounded-xl border border-amber-300 bg-white p-3 text-sm" /><button type="button" onClick={reapply} disabled={sending} className="mt-3 rounded-xl bg-green-700 px-4 py-2 font-bold text-white disabled:opacity-50">{sending ? "Sending…" : "Submit verification request again"}</button></>}
      {message && <p className="mt-3 text-sm font-semibold">{message}</p>}</>}
  </section>{notifications.length > 0 && <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Messages</h2><div className="mt-4 space-y-3">{notifications.map((notification) => <article key={notification.id} className="rounded-xl bg-gray-50 p-4"><p className="font-bold">{notification.title}</p><p className="mt-1 text-sm text-gray-700">{notification.message}</p><p className="mt-2 text-xs text-gray-500">{new Date(notification.createdAt).toLocaleString("en-IN")}</p></article>)}</div></section>}</>;
}
