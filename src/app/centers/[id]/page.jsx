"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, IndianRupee, MapPin, Phone, Sprout } from "lucide-react";
import { LoggedInNavbar } from "../../../component/LoggedInNavbar";

const formatDate = (value) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const today = new Date().toISOString().slice(0, 10);

export default function CenterDetailPage() {
  const { id } = useParams();
  const [center, setCenter] = useState(null);
  const [unavailable, setUnavailable] = useState([]);
  const [form, setForm] = useState({ slotStart: "", slotEnd: "", quantity: "", password: "" });
  const [message, setMessage] = useState({ text: "", error: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/center/centers/${id}`, { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.center; }),
      fetch(`/api/seller/centers/${id}/availability`, { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.unavailableSlots; }),
    ]).then(([loadedCenter, slots]) => { setCenter(loadedCenter); setUnavailable(slots); }).catch((error) => setMessage({ text: error.message, error: true }));
  }, [id]);

  async function book(event) {
    event.preventDefault();
    setSaving(true); setMessage({ text: "", error: false });
    try {
      const response = await fetch("/api/seller/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ centerId: id, ...form }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage({ text: `Slot booked at ${data.booking.center.name}. The booking is now visible to the admin.`, error: false });
      setUnavailable((slots) => [...slots, { slotStart: data.booking.slotStart, slotEnd: data.booking.slotEnd }]);
      setForm({ slotStart: "", slotEnd: "", quantity: "", password: "" });
    } catch (error) { setMessage({ text: error.message, error: true }); } finally { setSaving(false); }
  }

  if (!center && !message.text) return <main className="grid min-h-screen place-items-center font-bold text-gray-500">Loading center…</main>;
  if (!center) return <><LoggedInNavbar /><main className="grid min-h-screen place-items-center p-6 text-center"><div><p className="font-bold text-red-700">{message.text}</p><Link href="/centers" className="mt-4 inline-block font-bold text-green-700">Back to centers</Link></div></main></>;
  const soybean = center.cropPrices[0];

  return <><LoggedInNavbar /><main className="min-h-screen bg-[#f6f8f4] p-5 sm:p-8"><div className="mx-auto max-w-5xl"><Link href="/centers" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600"><ArrowLeft size={16} />All centers</Link><section className="mt-4 rounded-3xl bg-white p-6 shadow-sm"><p className="text-xs font-bold tracking-wider text-green-700">PROCUREMENT CENTER</p><h1 className="mt-2 text-3xl font-black text-gray-900">{center.name}</h1><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600"><span className="flex items-center gap-1"><MapPin size={15} />{center.address}, {center.district}, {center.state}</span><span className="flex items-center gap-1"><Phone size={15} />{center.phone}</span></div></section>
    <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><section className="space-y-5"><Link href="/centers" className="block rounded-2xl bg-lime-50 p-5 hover:bg-lime-100"><p className="flex items-center gap-2 text-sm font-bold text-green-800"><Sprout size={17} /> Soybean price at this center</p><p className="mt-3 flex items-center text-3xl font-black text-gray-900"><IndianRupee size={26} />{soybean ? Number(soybean.price).toLocaleString("en-IN") : "Not updated"}</p>{soybean && <p className="mt-1 text-sm text-gray-600">per {soybean.unit} · Updated {formatDate(soybean.updatedAt)}</p>}<p className="mt-3 text-sm font-bold text-green-800">Click to compare other centers →</p></Link><div className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-black text-gray-900">Unavailable dates</h2><p className="mt-1 text-sm text-gray-500">Choose a range that does not overlap these slots.</p><div className="mt-3 space-y-2 text-sm">{unavailable.length ? unavailable.map((slot, index) => <p key={`${slot.slotStart}-${index}`} className="rounded-lg bg-gray-50 px-3 py-2">{formatDate(slot.slotStart)} to {formatDate(slot.slotEnd)}</p>) : <p className="text-green-700">No booked slots yet.</p>}</div></div></section>
      <form onSubmit={book} className="rounded-2xl bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><CalendarDays className="text-green-700" /><h2 className="text-xl font-black">Book your visit slot</h2></div><p className="mt-2 text-sm text-gray-600">Select your available dates, quantity, then confirm with your account password.</p>{message.text && <p className={`mt-4 rounded-xl p-3 text-sm font-bold ${message.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>{message.text}</p>}<div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-gray-700">From date<input required min={today} type="date" value={form.slotStart} onChange={(event) => setForm({ ...form, slotStart: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2" /></label><label className="text-sm font-bold text-gray-700">To date<input required min={form.slotStart || today} type="date" value={form.slotEnd} onChange={(event) => setForm({ ...form, slotEnd: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2" /></label></div><label className="mt-4 block text-sm font-bold text-gray-700">Soybean quantity (quintal)<input required min="0.01" step="0.01" type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2" /></label><label className="mt-4 block text-sm font-bold text-gray-700">Account password<input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2" /></label><button disabled={saving || !soybean} className="mt-6 w-full rounded-xl bg-green-700 px-4 py-3 font-bold text-white hover:bg-green-800 disabled:opacity-50">{saving ? "Booking…" : soybean ? "Book now" : "Price not available"}</button></form></div>
  </div></main></>;
}
