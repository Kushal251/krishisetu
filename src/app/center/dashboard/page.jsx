"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRightLeft, Boxes, CheckCircle2, ShoppingCart, Warehouse } from "lucide-react";
import { LoggedInNavbar } from "../../../component/LoggedInNavbar";

const initialForm = { buyerPrice: "", availableUntil: "", pickupStart: "", pickupEnd: "" };
const number = (value) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function CenterDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [forms, setForms] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [workingId, setWorkingId] = useState("");

  async function load() {
    const response = await fetch("/api/center/dashboard", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Could not load center dashboard.");
    setData(payload);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/me").then((response) => response.json()).then((payload) => { if (payload.user?.role !== "CENTER") router.replace("/"); }).catch(() => router.replace("/"));
    fetch("/api/center/dashboard", { cache: "no-store" }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "Could not load center dashboard."); return payload; }).then((payload) => { if (active) setData(payload); }).catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [router]);

  function formFor(bookingId) { return forms[bookingId] || initialForm; }
  function setField(bookingId, field, value) { setForms((current) => ({ ...current, [bookingId]: { ...formFor(bookingId), [field]: value } })); }

  async function confirmPurchase(bookingId) {
    setWorkingId(bookingId); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/center/purchases/${bookingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formFor(bookingId)) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not confirm purchase.");
      setMessage(payload.message);
      await load();
    } catch (requestError) { setError(requestError.message); } finally { setWorkingId(""); }
  }

  if (error && !data) return <main className="grid min-h-screen place-items-center p-6"><p className="rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p></main>;
  if (!data) return <main className="grid min-h-screen place-items-center font-bold text-gray-600">Loading center dashboard…</main>;
  const { center, kpis, pendingPurchases, listings } = data;
  return <><LoggedInNavbar /><main className="min-h-screen bg-[#f6f8f4] p-5 sm:p-8"><div className="mx-auto max-w-6xl"><p className="text-xs font-bold tracking-wider text-green-700">CENTER OPERATIONS</p><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="mt-1 text-3xl font-black">{center.name}</h1><p className="mt-2 text-gray-600">Confirm seller purchases, manage storage, and trade soybean with other centers.</p></div><div className="flex flex-wrap gap-2"><Link href="/center/market" className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white"><ShoppingCart size={17} />Buy from centers</Link><Link href="/center/trades" className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-bold text-green-800"><ArrowRightLeft size={17} />Trade requests & history</Link></div></div>{error && <p className="mt-5 rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}{message && <p className="mt-5 rounded-xl bg-green-50 p-3 font-bold text-green-800">{message}</p>}
    <section className="mt-6 grid gap-4 sm:grid-cols-3"><article className="rounded-2xl bg-green-800 p-5 text-white"><Warehouse size={24} /><p className="mt-4 text-sm font-bold text-green-100">USED STORAGE</p><p className="mt-1 text-3xl font-black">{number(center.usedCapacity)} qtl</p><p className="mt-1 text-sm text-green-100">of {number(center.totalCapacity)} qtl</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><Boxes className="text-green-700" size={24} /><p className="mt-4 text-sm font-bold text-gray-500">AVAILABLE STORAGE</p><p className="mt-1 text-3xl font-black">{number(center.availableCapacity)} qtl</p><p className="mt-1 text-sm text-gray-600">{kpis.utilizationPct}% utilized</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><CheckCircle2 className="text-violet-700" size={24} /><p className="mt-4 text-sm font-bold text-gray-500">PENDING PURCHASES</p><p className="mt-1 text-3xl font-black">{pendingPurchases.length}</p><p className="mt-1 text-sm text-gray-600">Seller offers ready to confirm</p></article></section>
    <section className="mt-7"><h2 className="text-2xl font-black">Confirm seller purchases</h2><p className="mt-1 text-sm text-gray-600">Confirming marks settlement complete (without a payment gateway), adds stock to storage, and creates a buyer listing.</p><div className="mt-4 space-y-4">{pendingPurchases.map((booking) => { const form = formFor(booking.id); return <article key={booking.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-black">{booking.seller.user.name}</h3><p className="mt-1 text-sm text-gray-600">{booking.seller.user.phone} · Soybean grade {booking.inspection.grade}</p><p className="mt-2 font-bold text-green-800">{number(booking.quantity)} quintal · Seller grade price ₹{number(booking.inspection.gradePrice)} / quintal</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">SELLER READY</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-bold">Buyer sale price / qtl<input required min="0.01" step="0.01" type="number" value={form.buyerPrice} onChange={(event) => setField(booking.id, "buyerPrice", event.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label><label className="text-sm font-bold">Available to order until<input required type="date" value={form.availableUntil} onChange={(event) => setField(booking.id, "availableUntil", event.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label><label className="text-sm font-bold">Buyer pickup starts<input required type="date" value={form.pickupStart} onChange={(event) => setField(booking.id, "pickupStart", event.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label><label className="text-sm font-bold">Buyer pickup ends<input required type="date" value={form.pickupEnd} onChange={(event) => setField(booking.id, "pickupEnd", event.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label></div><button disabled={workingId === booking.id} onClick={() => confirmPurchase(booking.id)} className="mt-4 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{workingId === booking.id ? "Confirming…" : "Confirm purchase, settlement & storage"}</button></article>; })}{pendingPurchases.length === 0 && <p className="rounded-2xl bg-white p-6 text-gray-600 shadow-sm">No seller-accepted offers are waiting for purchase confirmation.</p>}</div></section>
    <section className="mt-7"><h2 className="text-2xl font-black">Stored soybean available to buyers</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{listings.map((listing) => <article key={listing.id} className="rounded-2xl bg-white p-5 shadow-sm"><p className="font-black">Soybean · Grade {listing.grade}</p><p className="mt-2 text-xl font-black text-green-800">{number(Number(listing.availableQty) - Number(listing.reservedQty))} quintal available</p><p className="mt-1 text-sm text-gray-600">₹{number(listing.pricePerQuintal)} / quintal · Order by {new Date(listing.availableUntil).toLocaleDateString("en-IN")}</p><p className="mt-1 text-sm text-gray-600">Buyer pickup: {new Date(listing.pickupStart).toLocaleDateString("en-IN")} – {new Date(listing.pickupEnd).toLocaleDateString("en-IN")}</p></article>)}</div>{listings.length === 0 && <p className="mt-4 rounded-2xl bg-white p-6 text-gray-600 shadow-sm">No soybean stock has been published for buyers yet.</p>}</section></div></main></>;
}
