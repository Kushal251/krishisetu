"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, MapPin, Phone, Plus, Trash2, UserCog, X } from "lucide-react";
import { LoggedInNavbar } from "../../../../component/LoggedInNavbar";

export default function AdminCenterDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [center, setCenter] = useState(null);
  const [message, setMessage] = useState({ text: "", error: false });
  const [price, setPrice] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [showOperator, setShowOperator] = useState(false);
  const [operatorId, setOperatorId] = useState("");

  async function loadCenter() {
    const response = await fetch(`/api/center/centers/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setCenter(data.center);
    setPrice(data.center.cropPrices[0]?.price?.toString() || "");
  }

  useEffect(() => {
    fetch("/api/me").then((response) => response.json()).then((data) => { if (data.user?.role !== "ADMIN") router.replace("/"); }).catch(() => router.replace("/"));
    loadCenter().catch((error) => setMessage({ text: error.message, error: true }));
  }, [id, router]);

  async function savePrice(event) {
    event.preventDefault(); setSavingPrice(true); setMessage({ text: "", error: false });
    try {
      const response = await fetch(`/api/center/centers/${id}/price`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ price }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      setMessage({ text: "Soybean price updated for sellers.", error: false }); await loadCenter();
    } catch (error) { setMessage({ text: error.message, error: true }); } finally { setSavingPrice(false); }
  }

  async function assignOperator(event) {
    event.preventDefault();
    try {
      const response = await fetch(`/api/center/centers/${id}/operators`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: operatorId }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      setOperatorId(""); setShowOperator(false); setMessage({ text: "Operator assigned.", error: false }); await loadCenter();
    } catch (error) { setMessage({ text: error.message, error: true }); }
  }

  async function removeOperator(userId) {
    try {
      const response = await fetch(`/api/center/centers/${id}/operators`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      setMessage({ text: "Operator removed.", error: false }); await loadCenter();
    } catch (error) { setMessage({ text: error.message, error: true }); }
  }

  if (!center) return <><LoggedInNavbar /><main className="grid min-h-screen place-items-center font-bold text-gray-500">Loading center…</main></>;
  const soybean = center.cropPrices[0];
  return <><LoggedInNavbar /><main className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-5xl"><Link href="/admin/centers" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600"><ArrowLeft size={16} />All centers</Link><section className="mt-4 rounded-2xl bg-white p-6 shadow-sm"><div className="flex items-start gap-4"><div className="grid h-14 w-14 place-items-center rounded-xl bg-green-100 text-green-800"><Building2 size={26} /></div><div><h1 className="text-2xl font-black">{center.name}</h1><p className="mt-1 text-sm text-gray-500">{center.code} · {center.status}</p><p className="mt-2 flex items-center gap-1 text-sm text-gray-600"><MapPin size={14} />{center.address}, {center.district}, {center.state}</p><p className="mt-1 flex items-center gap-1 text-sm text-gray-600"><Phone size={14} />{center.phone}</p></div></div></section>
    {message.text && <p className={`mt-4 rounded-xl p-3 text-sm font-bold ${message.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>{message.text}</p>}
    <div className="mt-6 grid gap-6 md:grid-cols-2"><section className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold tracking-wider text-green-700">SELLER PRICE</p><h2 className="mt-1 text-xl font-black">Soybean rate</h2><p className="mt-2 text-sm text-gray-600">Current: {soybean ? `₹${Number(soybean.price).toLocaleString("en-IN")} per ${soybean.unit}` : "Not set"}</p><form onSubmit={savePrice} className="mt-4 flex gap-2"><input required min="1" step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price per quintal" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" /><button disabled={savingPrice} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{savingPrice ? "Saving…" : "Save"}</button></form></section>
      <section className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-black"><UserCog size={19} className="text-green-700" />Operators</h2><button onClick={() => setShowOperator((value) => !value)} className="inline-flex items-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-xs font-bold text-white">{showOperator ? <X size={14} /> : <Plus size={14} />}{showOperator ? "Cancel" : "Assign"}</button></div>{showOperator && <form onSubmit={assignOperator} className="mt-3 flex gap-2"><input required value={operatorId} onChange={(event) => setOperatorId(event.target.value)} placeholder="CENTER user ID" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" /><button className="rounded-lg border px-3 text-sm font-bold">Add</button></form>}<div className="mt-4 space-y-2">{center.operators.length ? center.operators.map((operator) => <div key={operator.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3"><div><p className="font-bold">{operator.name}</p><p className="text-xs text-gray-500">{operator.phone}</p></div><button onClick={() => removeOperator(operator.id)} className="rounded-lg p-2 text-red-700 hover:bg-red-50" title="Remove operator"><Trash2 size={16} /></button></div>) : <p className="py-4 text-center text-sm text-gray-500">No operators assigned.</p>}</div></section></div>
  </div></main></>;
}
