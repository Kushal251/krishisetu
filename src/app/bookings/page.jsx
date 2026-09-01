"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Circle, ClipboardCheck, IndianRupee, MapPin, Phone, Sprout } from "lucide-react";
import { LoggedInNavbar } from "../../component/LoggedInNavbar";

const formatDate = (value) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const money = (amount) => `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function totals(booking) {
  const result = booking.inspection;
  if (!result) return null;
  const gross = Number(booking.quantity) * Number(result.gradePrice);
  const deductions = Number(result.storageCharge) + Number(result.labourCharge) + Number(result.otherCharge);
  return { gross, deductions, bonus: Number(result.bonus), final: gross - deductions + Number(result.bonus) };
}

function Progress({ status }) {
  const stages = [{ id: "BOOKED", label: "Booked" }, { id: "ARRIVED", label: "Farmer arrived" }, { id: "INSPECTION", label: "Testing" }, { id: "GRADED", label: "Grade offer" }, { id: "COMPLETED", label: "Final bill" }];
  const position = stages.findIndex((stage) => stage.id === status);
  if (["NO_SHOW", "CANCELLED"].includes(status)) return <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{status === "NO_SHOW" ? "Booking closed: you did not arrive during the selected slot." : "Booking cancelled."}</p>;
  return <div className="mt-5 grid gap-2 sm:grid-cols-5">{stages.map((stage, index) => { const done = position >= index; const current = status === stage.id; return <div key={stage.id} className={`rounded-lg p-2 text-center text-xs font-bold ${current ? "bg-green-700 text-white" : done ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>{done ? <CheckCircle2 size={15} className="mx-auto mb-1" /> : <Circle size={15} className="mx-auto mb-1" />}{stage.label}</div>; })}</div>;
}

export default function SellerBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState("");

  async function loadBookings() {
    const response = await fetch("/api/seller/bookings", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setBookings(data.bookings);
  }

  useEffect(() => {
    fetch("/api/seller/bookings", { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.bookings; })
      .then(setBookings)
      .catch((requestError) => setError(requestError.message));
  }, []);

  async function decide(bookingId, action) {
    setWorkingId(bookingId); setError("");
    try {
      const response = await fetch(`/api/seller/bookings/${bookingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      await loadBookings();
    } catch (requestError) { setError(requestError.message); } finally { setWorkingId(""); }
  }

  return <><LoggedInNavbar /><main className="min-h-screen bg-[#f6f8f4] p-5 sm:p-8"><div className="mx-auto max-w-5xl"><p className="text-xs font-bold tracking-wider text-green-700">SELLER ACCOUNT</p><h1 className="mt-1 text-3xl font-black text-gray-900">My bookings</h1><p className="mt-2 text-gray-600">Track each procurement stage, review the quality result, and decide on the final offer.</p>{error && <p className="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}<div className="mt-6 space-y-5">{bookings.map((booking) => { const inspection = booking.inspection; const bill = totals(booking); return <article key={booking.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 font-black text-gray-900"><Sprout size={18} className="text-green-700" /> Soybean · {Number(booking.quantity)} quintal</p><h2 className="mt-3 text-lg font-black">{booking.center.name}</h2><p className="mt-1 flex items-center gap-1 text-sm text-gray-600"><MapPin size={14} />{booking.center.address}, {booking.center.district}, {booking.center.state}</p><p className="mt-1 flex items-center gap-1 text-sm text-gray-600"><Phone size={14} />{booking.center.phone}</p></div><div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900"><p className="flex items-center gap-1 font-bold"><CalendarDays size={15} />{formatDate(booking.slotStart)} to {formatDate(booking.slotEnd)}</p><p className="mt-2 text-xs font-black">{booking.status.replace("_", " ")}</p></div></div><Progress status={booking.status} />
      {inspection && <section className="mt-5 grid gap-4 rounded-xl bg-lime-50 p-4 lg:grid-cols-2"><div><p className="text-xs font-bold tracking-wider text-green-800">QUALITY TEST RESULT</p><h3 className="mt-1 text-xl font-black text-gray-900">Grade {inspection.grade}</h3><div className="mt-3 grid grid-cols-3 gap-2 text-sm"><p><span className="block text-xs text-gray-500">Moisture</span><b>{inspection.moisture}%</b></p><p><span className="block text-xs text-gray-500">Broken</span><b>{inspection.brokenGrain}%</b></p><p><span className="block text-xs text-gray-500">Foreign matter</span><b>{inspection.foreignMatter}%</b></p></div>{inspection.suggestion && <div className="mt-4 rounded-lg bg-white p-3 text-sm text-gray-700"><b className="text-green-900">Center suggestion:</b> {inspection.suggestion}</div>}</div><div className="rounded-xl bg-white p-4"><p className="text-xs font-bold tracking-wider text-green-800">PRICE OFFER</p><p className="mt-2 text-sm text-gray-600">Base price: <b>{money(inspection.basePrice)} / quintal</b></p><p className="mt-1 text-lg font-black text-gray-900">Grade price: {money(inspection.gradePrice)} / quintal</p>{inspection.sellerDecision === "PENDING" && booking.status === "GRADED" && <div className="mt-4 flex flex-wrap gap-2"><button disabled={workingId === booking.id} onClick={() => decide(booking.id, "ACCEPT_OFFER")} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Sell at this price</button><button disabled={workingId === booking.id} onClick={() => decide(booking.id, "REQUEST_RETEST")} className="rounded-lg border border-green-700 px-4 py-2 text-sm font-bold text-green-800 disabled:opacity-50">Request re-test</button></div>}{inspection.sellerDecision === "ACCEPTED" && booking.status === "GRADED" && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900">You accepted the offer. Waiting for the center to confirm purchase and storage before settlement is completed.</p>}{inspection.sellerDecision === "RETEST_REQUESTED" && <p className="mt-4 text-sm font-bold text-violet-800">Re-test requested. The center will begin testing again.</p>}</div></section>}
      {booking.status === "COMPLETED" && <p className="mt-5 rounded-xl bg-green-700 p-4 font-black text-white">✓ Center purchase confirmed — payment settlement successful. Your crop is now saved in the center&apos;s storage and available for buyer sale.</p>}
      {bill && (booking.status === "GRADED" || booking.status === "COMPLETED") && <section className="mt-5 rounded-xl border border-green-200 bg-white p-4"><div className="flex items-center gap-2"><IndianRupee className="text-green-700" size={19} /><h3 className="font-black text-gray-900">{booking.status === "COMPLETED" ? "Final settlement bill" : "Estimated settlement bill"}</h3></div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><p>Crop value<br /><b>{Number(booking.quantity)} × {money(inspection.gradePrice)} = {money(bill.gross)}</b></p><p>Storage charge<br /><b>- {money(inspection.storageCharge)}</b></p><p>Labour charge<br /><b>- {money(inspection.labourCharge)}</b></p><p>Other deductions<br /><b>- {money(inspection.otherCharge)}</b></p>{bill.bonus > 0 && <p className="lg:col-span-2 text-green-800">Farmer bonus<br /><b>+ {money(bill.bonus)}</b>{inspection.bonusReason && <span className="block text-xs font-normal">Reason: {inspection.bonusReason}</span>}</p>}<p className="rounded-lg bg-green-50 p-3 text-lg font-black text-green-900">Payable amount<br />{money(bill.final)}</p></div></section>}</article>; })}{!error && !bookings.length && <div className="rounded-2xl bg-white p-10 text-center shadow-sm"><h2 className="font-black text-gray-900">No bookings yet</h2><p className="mt-2 text-sm text-gray-600">Find a procurement center and reserve your soybean slot.</p><Link href="/centers" className="mt-5 inline-flex rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white">Explore centers</Link></div>}</div></div></main></>;
}
