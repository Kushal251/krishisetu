"use client";

import { useEffect, useState } from "react";
import { LoggedInNavbar } from "../../../component/LoggedInNavbar";

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState("");
  const [filters, setFilters] = useState({ state: "", district: "", village: "", sellerType: "ALL", status: "PENDING" });
  const [appliedFilters, setAppliedFilters] = useState({ state: "", district: "", village: "", sellerType: "ALL", status: "PENDING" });
  const [expandedId, setExpandedId] = useState("");

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(appliedFilters).toString();
    fetch(`/api/admin/verification-requests?${query}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load requests.");
        if (active) setRequests(data.requests);
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [appliedFilters]);

  async function review(requestId, action) {
    const adminNote = action === "REJECT" ? window.prompt("Rejection reason (shown to seller):") : "";
    if (adminNote === null) return;
    setWorkingId(requestId); setError("");
    try {
      const response = await fetch(`/api/admin/verification-requests/${requestId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, adminNote }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not review request.");
      setRequests((items) => items.filter((item) => item.id !== requestId));
    } catch (error) { setError(error.message); } finally { setWorkingId(""); }
  }

  return <><LoggedInNavbar /><main className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-black">Seller verification requests</h1><p className="mt-2 text-gray-600">Search submitted profiles by location and review every form detail before approval.</p>
    <form onSubmit={(event) => { event.preventDefault(); setAppliedFilters(filters); }} className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6"><input value={filters.state} onChange={(event) => setFilters({ ...filters, state: event.target.value })} placeholder="State" className="rounded-lg border px-3 py-2 text-sm" /><input value={filters.district} onChange={(event) => setFilters({ ...filters, district: event.target.value })} placeholder="District" className="rounded-lg border px-3 py-2 text-sm" /><input value={filters.village} onChange={(event) => setFilters({ ...filters, village: event.target.value })} placeholder="Village" className="rounded-lg border px-3 py-2 text-sm" /><select value={filters.sellerType} onChange={(event) => setFilters({ ...filters, sellerType: event.target.value })} className="rounded-lg border px-3 py-2 text-sm"><option value="ALL">All seller types</option><option value="FARMER">Farmer</option><option value="FPO">FPO</option><option value="TRADER">Trader</option><option value="COOPERATIVE">Cooperative</option></select><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="rounded-lg border px-3 py-2 text-sm"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ALL">All statuses</option></select><button className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white">Apply filters</button></form>
    {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}<div className="mt-6 space-y-4">{requests.length === 0 && !error && <p className="text-gray-600">No requests match these filters.</p>}{requests.map((item) => { const open = expandedId === item.id; const { seller } = item; return <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{seller.user.name} — {seller.sellerType}</h2><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.status === "PENDING" ? "bg-amber-100 text-amber-800" : item.status === "APPROVED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{item.status}</span></div><p className="mt-1 text-sm text-gray-600">{seller.user.phone} · {seller.village}, {seller.district}, {seller.state}</p><p className="mt-3 text-sm"><span className="font-bold">Seller note:</span> {item.note || "No note provided"}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setExpandedId(open ? "" : item.id)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold">{open ? "Hide details" : "View full form"}</button>{item.status === "PENDING" && <><button disabled={workingId === item.id} onClick={() => review(item.id, "APPROVE")} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Approve</button><button disabled={workingId === item.id} onClick={() => review(item.id, "REJECT")} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Reject</button></>}</div></div>{open && <div className="mt-5 grid gap-5 border-t pt-5 sm:grid-cols-2 lg:grid-cols-3"><Details title="Personal details" values={[["Name", seller.user.name], ["Phone", seller.user.phone], ["Email", seller.user.email], ["Aadhaar", seller.user.aadhaarNumber]]} /><Details title="Address" values={[["Village", seller.village], ["District", seller.district], ["State", seller.state], ["Address", seller.address]]} /><Details title="Bank details" values={[["Account", seller.bankAccount], ["IFSC", seller.ifscCode], ["Verification", seller.verificationStatus]]} />{seller.farmer && <Details title="Farmer details" values={[["Land", `${seller.farmer.landArea} ${seller.farmer.landUnit}`], ["Khasra", seller.farmer.khasraNumber], ["PM-Kisan ID", seller.farmer.pmKisanId], ["KCC", seller.farmer.kccNumber]]} />}{seller.fpo && <Details title="FPO details" values={[["Organisation", seller.fpo.organizationName], ["Registration no.", seller.fpo.registrationNo], ["Members", seller.fpo.memberCount]]} />}{item.adminNote && <Details title="Admin remarks" values={[["Remark", item.adminNote], ["Reviewed on", item.reviewedAt ? new Date(item.reviewedAt).toLocaleString("en-IN") : null]]} />}</div>}</article>; })}</div></div></main></>;
}

function Details({ title, values }) {
  return <section className="rounded-xl bg-gray-50 p-4"><h3 className="font-black">{title}</h3><dl className="mt-3 space-y-2 text-sm">{values.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase text-gray-500">{label}</dt><dd className="break-words font-medium text-gray-900">{value || "Not provided"}</dd></div>)}</dl></section>;
}
