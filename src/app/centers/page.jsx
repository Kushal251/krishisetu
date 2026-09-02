"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, IndianRupee, MapPin, ShieldCheck, Sparkles, Sprout, Truck } from "lucide-react";
import { LoggedInNavbar } from "../../component/LoggedInNavbar";

const number = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });
const priceText = (price) => price ? `₹${Number(price.price).toLocaleString("en-IN")} / ${price.unit}` : "Price not updated";

export default function CentersPage() {
  const [centers, setCenters] = useState([]);
  const [quantity, setQuantity] = useState("10");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load(preferredQuantity = quantity) {
    setLoading(true); setError("");
    fetch(`/api/center/centers?status=ACTIVE&recommend=true&quantity=${encodeURIComponent(preferredQuantity || 10)}`, { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.centers; })
      .then(setCenters).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }

  useEffect(() => {
    let active = true;
    fetch("/api/center/centers?status=ACTIVE&recommend=true&quantity=10", { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.centers; })
      .then((result) => { if (active) setCenters(result); }).catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <><LoggedInNavbar /><main className="min-h-screen bg-[#f6f8f4] p-5 sm:p-8"><div className="mx-auto max-w-6xl">
    <section className="rounded-3xl bg-gradient-to-br from-green-950 to-green-700 p-7 text-white"><p className="text-sm font-bold text-lime-300">SMART PROCUREMENT CENTERS</p><h1 className="mt-2 text-3xl font-black">Best center for your soybean</h1><p className="mt-2 max-w-3xl text-sm text-green-100">Centers are ranked using your quantity, distance, expected price, seasonal demand, weather-adjusted supply, center reliability, and your previous successful sales.</p><div className="mt-5 flex max-w-md gap-2"><input min="0.01" step="0.01" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/30 bg-white px-3 py-2 text-gray-900" placeholder="Quantity (qtl)" /><button onClick={() => load()} className="rounded-xl bg-lime-300 px-4 py-2 font-black text-green-950">Find best match</button></div></section>
    {error && <p className="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
    <div className="mt-6 grid gap-4 md:grid-cols-2">{centers.map((center, index) => { const soybean = center.cropPrices[0]; const rec = center.recommendation; return <article key={center.id} className={`rounded-2xl bg-white p-5 shadow-sm ${index === 0 ? "ring-2 ring-lime-400" : ""}`}><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-green-100 text-green-800"><Building2 size={21} /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-gray-900">{center.name}</h2>{index === 0 && <span className="inline-flex items-center gap-1 rounded-full bg-lime-100 px-2 py-1 text-xs font-black text-green-900"><Sparkles size={12} />Best match</span>}</div><p className="mt-1 flex items-center gap-1 text-sm text-gray-500"><MapPin size={14} />{center.district}, {center.state}</p></div></div><span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-800">#{rec?.rank || index + 1} · {number(rec?.score)} score</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-lime-50 p-4"><p className="flex items-center gap-1 text-xs font-bold uppercase text-green-800"><Sprout size={14} />Expected price</p><p className="mt-1 flex items-center gap-1 text-xl font-black"><IndianRupee size={18} />{rec ? `${number(rec.predictedPricePerQuintal)} / qtl` : priceText(soybean).replace("₹", "")}</p><p className="mt-1 text-xs text-gray-600">Net estimate ₹{number(rec?.estimatedNetAmount)}</p></div><div className="rounded-xl bg-blue-50 p-4"><p className="flex items-center gap-1 text-xs font-bold uppercase text-blue-800"><Truck size={14} />Route estimate</p><p className="mt-1 text-xl font-black">{number(rec?.distanceKm)} km</p><p className="mt-1 text-xs text-gray-600">Transport ₹{number(rec?.transportCost)}</p></div></div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold"><span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-violet-800"><ShieldCheck size={13} />{number(rec?.reliabilityPct)}% reliable</span><span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800">Season demand {number(rec?.projectedDemand)} qtl</span><span className="rounded-full bg-cyan-50 px-3 py-1.5 text-cyan-800">Expected supply {number(rec?.expectedSeasonSupply)} qtl</span></div>
      {rec?.reasons?.length > 0 && <p className="mt-3 text-sm text-gray-600">{rec.reasons.join(" · ")}</p>}
      <Link href={`/centers/${center.id}`} className="mt-5 inline-flex rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800">View center &amp; book slot</Link></article>; })}</div>
    {!error && !loading && centers.length === 0 && <div className="mt-6 rounded-2xl bg-white p-10 text-center text-gray-500">No active centers are available yet.</div>}{loading && <p className="mt-6 text-center font-bold text-gray-500">Calculating center recommendations…</p>}
  </div></main></>;
}
