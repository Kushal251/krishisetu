"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, ClipboardCheck, MapPin, Sprout, UserRound } from "lucide-react";
import { LoggedInNavbar } from "../../../component/LoggedInNavbar";

const date = (value) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const initialGrade = { grade: "A", moisture: "", brokenGrain: "", foreignMatter: "", aiScore: "", basePrice: "", gradePrice: "", storageCharge: "0", labourCharge: "0", otherCharge: "0", bonus: "0", bonusReason: "", suggestion: "" };
const statusStyle = { BOOKED: "bg-blue-100 text-blue-800", ARRIVED: "bg-amber-100 text-amber-800", INSPECTION: "bg-violet-100 text-violet-800", GRADED: "bg-orange-100 text-orange-800", COMPLETED: "bg-green-100 text-green-800", NO_SHOW: "bg-red-100 text-red-800", CANCELLED: "bg-gray-100 text-gray-700" };

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState("");
  const [gradeForm, setGradeForm] = useState({});

  async function loadBookings() {
    const response = await fetch("/api/admin/bookings", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setBookings(data.bookings);
  }

  useEffect(() => {
    fetch("/api/me").then((response) => response.json()).then((data) => { if (data.user?.role !== "ADMIN") router.replace("/"); }).catch(() => router.replace("/"));
    fetch("/api/admin/bookings", { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.bookings; })
      .then(setBookings)
      .catch((requestError) => setError(requestError.message));
  }, [router]);

  async function updateBooking(bookingId, body) {
    setWorkingId(bookingId); setError("");
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      await loadBookings();
    } catch (requestError) { setError(requestError.message); } finally { setWorkingId(""); }
  }

  function formFor(bookingId) { return gradeForm[bookingId] || initialGrade; }
  function setField(bookingId, field, value) { setGradeForm((forms) => ({ ...forms, [bookingId]: { ...formFor(bookingId), [field]: value } })); }

  return <><LoggedInNavbar /><main className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-6xl"><p className="text-xs font-bold tracking-wider text-green-700">ADMIN WORKFLOW</p><h1 className="mt-1 text-3xl font-black">Seller bookings</h1><p className="mt-2 text-gray-600">Record arrival, finish quality testing, publish a grade offer, and track the seller&apos;s decision.</p>{error && <p className="mt-5 rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}
    <div className="mt-6 space-y-5">{bookings.map((booking) => { const form = formFor(booking.id); const seller = booking.seller; const isFarmer = seller.sellerType === "FARMER"; return <article key={booking.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 font-black"><Sprout size={18} className="text-green-700" />Soybean · {Number(booking.quantity)} quintal</p><h2 className="mt-3 text-lg font-black text-gray-900">{booking.center.name}</h2><p className="mt-1 flex items-center gap-1 text-sm text-gray-600"><MapPin size={14} />{booking.center.address}, {booking.center.district}, {booking.center.state}</p></div><div className="text-right"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusStyle[booking.status]}`}>{booking.status.replace("_", " ")}</span><p className="mt-3 flex items-center justify-end gap-1 text-sm font-bold text-gray-700"><CalendarDays size={15} />{date(booking.slotStart)} to {date(booking.slotEnd)}</p></div></div>
      <section className="mt-5 grid gap-4 rounded-xl bg-gray-50 p-4 md:grid-cols-3"><div><p className="flex items-center gap-2 font-black text-gray-900"><UserRound size={16} className="text-green-700" />{seller.user.name} · {seller.sellerType}</p><p className="mt-1 text-sm text-gray-600">{seller.user.phone}{seller.user.email ? ` · ${seller.user.email}` : ""}</p><p className="mt-1 text-sm text-gray-600">{seller.address}, {seller.village}, {seller.district}, {seller.state}</p></div><div className="text-sm text-gray-700"><p><span className="font-bold">Verification:</span> {seller.verificationStatus}</p>{seller.farmer && <p className="mt-1"><span className="font-bold">Farm:</span> {seller.farmer.landArea} {seller.farmer.landUnit} · Khasra {seller.farmer.khasraNumber || "Not provided"}</p>}{seller.fpo && <p className="mt-1"><span className="font-bold">FPO:</span> {seller.fpo.organizationName} · {seller.fpo.memberCount} members</p>}</div><div className="text-sm text-gray-700"><p><span className="font-bold">Aadhaar:</span> {seller.user.aadhaarNumber || "Not provided"}</p><p className="mt-1"><span className="font-bold">Booking ID:</span> {booking.id}</p></div></section>
      <div className="mt-5 flex flex-wrap gap-3">{booking.status === "BOOKED" && <button disabled={workingId === booking.id} onClick={() => updateBooking(booking.id, { action: "MARK_ARRIVED" })} className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Mark farmer arrived</button>}{booking.status === "ARRIVED" && <button disabled={workingId === booking.id} onClick={() => updateBooking(booking.id, { action: "START_TESTING" })} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><ClipboardCheck size={16} />Start testing</button>}{booking.status === "GRADED" && <><p className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-800"><CheckCircle2 size={16} />Offer published · Seller decision: {booking.inspection?.sellerDecision}</p>{booking.inspection?.sellerDecision === "ACCEPTED" && <Link href={`/admin/centers/${booking.center.id}#purchase-manager`} className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white">Confirm center purchase & publish buyer stock</Link>}</>}{booking.status === "COMPLETED" && <p className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-sm font-bold text-green-800"><CheckCircle2 size={16} />Sale settled · Stock saved in center storage</p>}{booking.status === "NO_SHOW" && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-800">Seller did not arrive in the selected slot.</p>}</div>
      {booking.status === "INSPECTION" && <form onSubmit={(event) => { event.preventDefault(); updateBooking(booking.id, { action: "PUBLISH_GRADE", ...form }); }} className="mt-5 rounded-xl border border-violet-100 bg-violet-50 p-4"><h3 className="font-black text-violet-950">Publish test result and settlement offer</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-bold">Grade<select value={form.grade} onChange={(event) => setField(booking.id, "grade", event.target.value)} className="mt-1 block w-full rounded-lg border p-2"><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></label>{[["moisture", "Moisture %"], ["brokenGrain", "Broken grain %"], ["foreignMatter", "Foreign matter %"], ["aiScore", "AI score (optional)"], ["basePrice", "Base price / quintal"], ["gradePrice", "Grade price / quintal"], ["storageCharge", "Storage charge"], ["labourCharge", "Labour charge"], ["otherCharge", "Other deductions"], ["bonus", isFarmer ? "Farmer bonus" : "Bonus (not eligible)"]].map(([field, label]) => <label key={field} className="text-sm font-bold">{label}<input required={field !== "aiScore"} disabled={field === "bonus" && !isFarmer} min="0" step="0.01" type="number" value={form[field]} onChange={(event) => setField(booking.id, field, event.target.value)} className="mt-1 block w-full rounded-lg border p-2 disabled:bg-gray-100" /></label>)}</div><label className="mt-3 block text-sm font-bold">Bonus reason<input value={form.bonusReason} onChange={(event) => setField(booking.id, "bonusReason", event.target.value)} className="mt-1 block w-full rounded-lg border p-2" placeholder="Reason shown to farmer" /></label><label className="mt-3 block text-sm font-bold">Suggestion for seller<textarea value={form.suggestion} onChange={(event) => setField(booking.id, "suggestion", event.target.value)} className="mt-1 block w-full rounded-lg border p-2" rows="3" placeholder="For example, reduce moisture and request re-testing for a better grade." /></label><button disabled={workingId === booking.id} className="mt-4 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{workingId === booking.id ? "Publishing…" : "Publish grade & offer"}</button></form>}
      {booking.inspection && <section className="mt-5 rounded-xl border border-gray-100 p-4 text-sm"><h3 className="font-black text-gray-900">Latest testing and settlement</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><p><span className="font-bold">Grade:</span> {booking.inspection.grade}</p><p><span className="font-bold">Moisture:</span> {booking.inspection.moisture}%</p><p><span className="font-bold">Base price:</span> ₹{Number(booking.inspection.basePrice)} / qtl</p><p><span className="font-bold">Grade price:</span> ₹{Number(booking.inspection.gradePrice)} / qtl</p></div></section>}</article>; })}{!error && !bookings.length && <div className="rounded-2xl bg-white p-10 text-center text-gray-500">No seller bookings yet.</div>}</div></div></main></>;
}
