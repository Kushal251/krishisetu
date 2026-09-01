"use client";

import { useEffect, useState } from "react";
import { LoggedInNavbar } from "../../../component/LoggedInNavbar";

const initialFilters = { state: "", city: "", buyerType: "ALL", status: "PENDING" };

export default function AdminBuyerVerificationsPage() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [expandedId, setExpandedId] = useState("");

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(appliedFilters).toString();
    fetch(`/api/admin/buyer-verification-requests?${query}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load requests.");
        if (active) setRequests(data.requests);
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [appliedFilters]);

  async function review(requestId, action) {
    const adminNote = action === "REJECT" ? window.prompt("Rejection reason (shown to buyer):") : "";
    if (adminNote === null) return;
    setWorkingId(requestId); setError("");
    try {
      const response = await fetch(`/api/admin/buyer-verification-requests/${requestId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, adminNote }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not review request.");
      setRequests((items) => items.filter((item) => item.id !== requestId));
    } catch (reviewError) { setError(reviewError.message); } finally { setWorkingId(""); }
  }

  return <><LoggedInNavbar /><main className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-black">Buyer verification requests</h1><p className="mt-2 text-gray-600">Review buyer business details separately from seller verification requests.</p>
    <form onSubmit={(event) => { event.preventDefault(); setAppliedFilters(filters); }} className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"><input value={filters.state} onChange={(event) => setFilters({ ...filters, state: event.target.value })} placeholder="State" className="rounded-lg border px-3 py-2 text-sm" /><input value={filters.city} onChange={(event) => setFilters({ ...filters, city: event.target.value })} placeholder="City" className="rounded-lg border px-3 py-2 text-sm" /><select value={filters.buyerType} onChange={(event) => setFilters({ ...filters, buyerType: event.target.value })} className="rounded-lg border px-3 py-2 text-sm"><option value="ALL">All buyer types</option><option value="PROCESSOR">Processor</option><option value="WHOLESALER">Wholesaler</option><option value="RETAILER">Retailer</option><option value="EXPORTER">Exporter</option></select><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="rounded-lg border px-3 py-2 text-sm"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ALL">All statuses</option></select><button className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white">Apply filters</button></form>
    {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}<div className="mt-6 space-y-4">{requests.length === 0 && !error && <p className="text-gray-600">No buyer requests match these filters.</p>}{requests.map((item) => { const open = expandedId === item.id; const { buyer } = item; return <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{buyer.businessName} — {buyer.buyerType}</h2><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.status === "PENDING" ? "bg-amber-100 text-amber-800" : item.status === "APPROVED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{item.status}</span></div><p className="mt-1 text-sm text-gray-600">{buyer.user.name} · {buyer.user.phone} · {buyer.city}, {buyer.state}</p><p className="mt-3 text-sm"><span className="font-bold">Buyer note:</span> {item.note || "No note provided"}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setExpandedId(open ? "" : item.id)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold">{open ? "Hide details" : "View full form"}</button>{item.status === "PENDING" && <><button disabled={workingId === item.id} onClick={() => review(item.id, "APPROVE")} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Approve</button><button disabled={workingId === item.id} onClick={() => review(item.id, "REJECT")} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Reject</button></>}</div></div>{open && <div className="mt-5 grid gap-5 border-t pt-5 sm:grid-cols-2 lg:grid-cols-3"><Details title="Contact details" values={[["Contact name", buyer.user.name], ["Phone", buyer.user.phone], ["Email", buyer.user.email]]} /><Details title="Business details" values={[["Business name", buyer.businessName], ["Buyer type", buyer.buyerType], ["GSTIN", buyer.gstin], ["PAN", buyer.panNumber], ["Verification", buyer.verificationStatus]]} /><Details title="Address" values={[["Address", buyer.address], ["City", buyer.city], ["State", buyer.state], ["PIN code", buyer.pinCode]]} />{item.adminNote && <Details title="Admin remarks" values={[["Remark", item.adminNote], ["Reviewed on", item.reviewedAt ? new Date(item.reviewedAt).toLocaleString("en-IN") : null]]} />}</div>}</article>; })}</div></div></main></>;
}

function Details({ title, values }) {
  return <section className="rounded-xl bg-gray-50 p-4"><h3 className="font-black">{title}</h3><dl className="mt-3 space-y-2 text-sm">{values.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase text-gray-500">{label}</dt><dd className="break-words font-medium text-gray-900">{value || "Not provided"}</dd></div>)}</dl></section>;
}
