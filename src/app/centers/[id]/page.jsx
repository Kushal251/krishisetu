"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, IndianRupee, MapPin, Phone, Sprout } from "lucide-react";
import { LoggedInNavbar } from "../../../component/LoggedInNavbar";

const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const today = new Date().toISOString().slice(0, 10);

export default function CenterDetailPage() {
  const { id } = useParams();
  const [center, setCenter] = useState(null);
  const [availability, setAvailability] = useState({ dailyCapacity: 0, days: [] });
  const [form, setForm] = useState({ visitDate: "", quantity: "", password: "" });
  const [message, setMessage] = useState({ text: "", error: false });
  const [saving, setSaving] = useState(false);

  async function loadAvailability(date = today) {
    const response = await fetch(`/api/seller/centers/${id}/availability?date=${date}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setAvailability(data);
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/center/centers/${id}`, { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.center; }),
      fetch(`/api/seller/centers/${id}/availability?date=${today}`, { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data; }),
    ]).then(([loadedCenter, loadedAvailability]) => { setCenter(loadedCenter); setAvailability(loadedAvailability); }).catch((error) => setMessage({ text: error.message, error: true }));
  }, [id]);

  async function chooseDate(visitDate) {
    setForm((values) => ({ ...values, visitDate }));
    setMessage({ text: "", error: false });
    try { await loadAvailability(visitDate); } catch (error) { setMessage({ text: error.message, error: true }); }
  }

  async function book(event) {
    event.preventDefault();
    setSaving(true); setMessage({ text: "", error: false });
    try {
      const response = await fetch("/api/seller/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ centerId: id, ...form }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage({ text: `Booking confirmed at ${data.booking.center.name} for ${formatDate(form.visitDate)}.`, error: false });
      setForm({ visitDate: "", quantity: "", password: "" });
      await loadAvailability();
    } catch (error) { setMessage({ text: error.message, error: true }); } finally { setSaving(false); }
  }

  if (!center && !message.text) return <main className="grid min-h-screen place-items-center font-bold text-gray-500">Loading center…</main>;
  if (!center) return <><LoggedInNavbar /><main className="grid min-h-screen place-items-center p-6 text-center"><div><p className="font-bold text-red-700">{message.text}</p><Link href="/centers" className="mt-4 inline-block font-bold text-green-700">Back to centers</Link></div></main></>;
  const soybean = center.cropPrices[0];
  const selectedDay = availability.days.find((day) => day.date === form.visitDate);

  return <><LoggedInNavbar /><main className="min-h-screen bg-[#f6f8f4] p-5 sm:p-8"><div className="mx-auto max-w-5xl"><Link href="/centers" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600"><ArrowLeft size={16} />All centers</Link><section className="mt-4 rounded-3xl bg-white p-6 shadow-sm"><p className="text-xs font-bold tracking-wider text-green-700">PROCUREMENT CENTER</p><h1 className="mt-2 text-3xl font-black text-gray-900">{center.name}</h1><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600"><span className="flex items-center gap-1"><MapPin size={15} />{center.address}, {center.district}, {center.state}</span><span className="flex items-center gap-1"><Phone size={15} />{center.phone}</span></div></section>
    <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><section className="space-y-5"><Link href="/centers" className="block rounded-2xl bg-lime-50 p-5 hover:bg-lime-100"><p className="flex items-center gap-2 text-sm font-bold text-green-800"><Sprout size={17} /> Soybean price at this center</p><p className="mt-3 flex items-center text-3xl font-black text-gray-900"><IndianRupee size={26} />{soybean ? Number(soybean.price).toLocaleString("en-IN") : "Not updated"}</p>{soybean && <p className="mt-1 text-sm text-gray-600">per {soybean.unit} · Updated {formatDate(soybean.updatedAt.slice(0, 10))}</p>}<p className="mt-3 text-sm font-bold text-green-800">Click to compare other centers →</p></Link><section className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold tracking-wider text-green-700">DATE SUGGESTIONS</p><h2 className="mt-1 font-black text-gray-900">You can choose any available day</h2><p className="mt-1 text-sm text-gray-600">The center handles up to {Number(availability.dailyCapacity)} quintal each day. Full dates are marked busy.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{availability.days.map((day) => { const selected = form.visitDate === day.date; return <button key={day.date} type="button" disabled={day.isBusy} onClick={() => chooseDate(day.date)} className={`rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:border-red-100 disabled:bg-red-50 disabled:text-red-700 ${selected ? "border-green-700 bg-green-50 ring-1 ring-green-700" : "border-gray-200 hover:border-green-400"}`}><p className="font-black">{formatDate(day.date)}</p><p className="mt-1 text-xs font-bold">{day.isBusy ? "Busy — select another date" : `${Number(day.remainingQuantity).toLocaleString("en-IN")} quintal remaining`}</p></button>; })}</div></section></section>
      <form onSubmit={book} className="rounded-2xl bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><CalendarDays className="text-green-700" /><h2 className="text-xl font-black">Book a center visit</h2></div><p className="mt-2 text-sm text-gray-600">Pick one preferred visit date. Many sellers can book the same date until the center&apos;s daily quantity limit is full.</p>{message.text && <p className={`mt-4 rounded-xl p-3 text-sm font-bold ${message.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>{message.text}</p>}<label className="mt-5 block text-sm font-bold text-gray-700">Preferred visit date<input required min={today} type="date" value={form.visitDate} onChange={(event) => chooseDate(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2" /></label>{selectedDay && <p className={`mt-2 text-sm font-bold ${selectedDay.isBusy ? "text-red-700" : "text-green-800"}`}>{selectedDay.isBusy ? "This date is busy. Pick one of the suggested available dates." : `${Number(selectedDay.remainingQuantity).toLocaleString("en-IN")} quintal capacity remains for this date.`}</p>}<label className="mt-4 block text-sm font-bold text-gray-700">Soybean quantity (quintal)<input required min="0.01" max="99999999.99" step="0.01" type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2" /></label><label className="mt-4 block text-sm font-bold text-gray-700">Account password<input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2" /></label><button disabled={saving || !soybean || selectedDay?.isBusy} className="mt-6 w-full rounded-xl bg-green-700 px-4 py-3 font-bold text-white hover:bg-green-800 disabled:opacity-50">{saving ? "Booking…" : soybean ? "Book now" : "Price not available"}</button></form></div>
  </div></main></>;
}
