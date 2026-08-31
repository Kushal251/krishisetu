"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Sprout } from "lucide-react";
import { LoggedInNavbar } from "../../../component/LoggedInNavbar";

const date = (value) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/me").then((response) => response.json()).then((data) => { if (data.user?.role !== "ADMIN") router.replace("/"); }); fetch("/api/admin/bookings", { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.bookings; }).then(setBookings).catch((requestError) => setError(requestError.message)); }, [router]);
  return <><LoggedInNavbar /><main className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-5xl"><h1 className="text-3xl font-black">Seller bookings</h1><p className="mt-1 text-gray-600">Every submitted soybean slot booking appears here.</p>{error && <p className="mt-5 rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}<div className="mt-6 space-y-3">{bookings.map((booking) => <article key={booking.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 font-black"><Sprout size={18} className="text-green-700" />Soybean · {Number(booking.quantity)} quintal</p><p className="mt-2 font-bold text-gray-800">{booking.seller.user.name} <span className="font-normal text-gray-500">· {booking.seller.user.phone}</span></p><p className="mt-1 flex items-center gap-1 text-sm text-gray-600"><MapPin size={14} />{booking.center.name}, {booking.center.district}</p></div><div className="rounded-xl bg-green-50 p-3 text-sm text-green-900"><p className="flex items-center gap-1 font-bold"><CalendarDays size={15} />{date(booking.slotStart)} to {date(booking.slotEnd)}</p><p className="mt-1 text-xs font-bold">{booking.status}</p></div></div></article>)}{!error && !bookings.length && <div className="rounded-2xl bg-white p-10 text-center text-gray-500">No seller bookings yet.</div>}</div></div></main></>;
}
