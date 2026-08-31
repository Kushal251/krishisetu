"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Phone, Sprout } from "lucide-react";
import { LoggedInNavbar } from "../../component/LoggedInNavbar";

const formatDate = (value) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function SellerBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/seller/bookings", { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.bookings; })
      .then(setBookings)
      .catch((requestError) => setError(requestError.message));
  }, []);

  return <><LoggedInNavbar /><main className="min-h-screen bg-[#f6f8f4] p-5 sm:p-8"><div className="mx-auto max-w-4xl"><p className="text-xs font-bold tracking-wider text-green-700">SELLER ACCOUNT</p><h1 className="mt-1 text-3xl font-black text-gray-900">My bookings</h1><p className="mt-2 text-gray-600">Your soybean center slot requests are listed here.</p>{error && <p className="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}<div className="mt-6 space-y-4">{bookings.map((booking) => <article key={booking.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 font-black text-gray-900"><Sprout size={18} className="text-green-700" /> Soybean · {Number(booking.quantity)} quintal</p><h2 className="mt-3 text-lg font-black">{booking.center.name}</h2><p className="mt-1 flex items-center gap-1 text-sm text-gray-600"><MapPin size={14} />{booking.center.address}, {booking.center.district}, {booking.center.state}</p><p className="mt-1 flex items-center gap-1 text-sm text-gray-600"><Phone size={14} />{booking.center.phone}</p></div><div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900"><p className="flex items-center gap-1 font-bold"><CalendarDays size={15} />{formatDate(booking.slotStart)} to {formatDate(booking.slotEnd)}</p><p className="mt-2 text-xs font-black">{booking.status.replace("_", " ")}</p></div></div></article>)}{!error && !bookings.length && <div className="rounded-2xl bg-white p-10 text-center shadow-sm"><h2 className="font-black text-gray-900">No bookings yet</h2><p className="mt-2 text-sm text-gray-600">Find a procurement center and reserve your soybean slot.</p><Link href="/centers" className="mt-5 inline-flex rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white">Explore centers</Link></div>}</div></div></main></>;
}
