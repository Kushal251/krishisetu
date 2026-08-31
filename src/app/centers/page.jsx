"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, IndianRupee, MapPin, Sprout } from "lucide-react";
import { LoggedInNavbar } from "../../component/LoggedInNavbar";

const priceText = (price) => price ? `₹${Number(price.price).toLocaleString("en-IN")} / ${price.unit}` : "Price not updated";

export default function CentersPage() {
  const [centers, setCenters] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/center/centers?status=ACTIVE", { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.centers; })
      .then(setCenters)
      .catch((requestError) => setError(requestError.message));
  }, []);

  return <><LoggedInNavbar /><main className="min-h-screen bg-[#f6f8f4] p-5 sm:p-8"><div className="mx-auto max-w-5xl"><section className="rounded-3xl bg-gradient-to-br from-green-950 to-green-700 p-7 text-white"><p className="text-sm font-bold text-lime-300">PROCUREMENT CENTERS</p><h1 className="mt-2 text-3xl font-black">Find a soybean selling center</h1><p className="mt-2 max-w-2xl text-sm text-green-100">Compare today&apos;s soybean rates, review center details, and reserve an available visit slot.</p></section>
    {error && <p className="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
    <div className="mt-6 grid gap-4 md:grid-cols-2">{centers.map((center) => { const soybean = center.cropPrices[0]; return <article key={center.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-green-100 text-green-800"><Building2 size={21} /></div><div><h2 className="font-black text-gray-900">{center.name}</h2><p className="mt-1 flex items-center gap-1 text-sm text-gray-500"><MapPin size={14} />{center.district}, {center.state}</p></div></div><span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-800">Active</span></div><div className="mt-5 rounded-xl bg-lime-50 p-4"><p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-green-800"><Sprout size={14} /> Soybean today</p><p className="mt-1 flex items-center gap-1 text-xl font-black text-gray-900"><IndianRupee size={18} />{priceText(soybean).replace("₹", "")}</p></div><Link href={`/centers/${center.id}`} className="mt-5 inline-flex rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800">View center &amp; book slot</Link></article>; })}</div>
    {!error && centers.length === 0 && <div className="mt-6 rounded-2xl bg-white p-10 text-center text-gray-500">No active centers are available yet.</div>}
  </div></main></>;
}
