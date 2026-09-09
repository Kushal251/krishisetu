"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, IndianRupee, MapPin, PackageCheck, SlidersHorizontal, Sparkles, TrendingUp } from "lucide-react";
import { LoggedInNavbar } from "../../../component/LoggedInNavbar";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const number = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });

export default function BuyerMarketPage() {
  const [listings, setListings] = useState([]);
  const [centers, setCenters] = useState([]);
  const [forms, setForms] = useState({});
  const [preference, setPreference] = useState({ quantity: "10", grade: "A" });
  const [forecast, setForecast] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminBuyerId, setAdminBuyerId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(current = preference) {
    setLoading(true); setMessage("");
    try {
      const query = new URLSearchParams({ quantity: current.quantity, grade: current.grade });
      const response = await fetch(`/api/buyer/listings?${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load centers.");
      setListings(data.listings); setCenters(data.centers); setForecast(data.forecast); setAdminMode(Boolean(data.adminMode));
    } catch (error) { setMessage(error.message); } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/buyer/listings?quantity=10&grade=A", { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || "Could not load centers."); return data; }).then((data) => { if (active) { setListings(data.listings); setCenters(data.centers); setForecast(data.forecast); setAdminMode(Boolean(data.adminMode)); } }).catch((error) => { if (active) setMessage(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function order(listingId) {
    const values = forms[listingId] || {};
    const response = await fetch("/api/buyer/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, quantity: values.quantity, deliveryAddress: values.deliveryAddress, buyerId: adminMode ? adminBuyerId : undefined }) });
    const data = await response.json();
    setMessage(response.ok ? "Order placed. Request physical check from My orders." : data.message);
    if (response.ok) load();
  }

  return <><LoggedInNavbar /><main className="min-h-screen bg-[#f6f8f4] p-5 sm:p-8"><div className="mx-auto max-w-6xl"><section className="rounded-3xl bg-gradient-to-br from-slate-950 to-green-800 p-7 text-white"><p className="flex items-center gap-2 text-xs font-black tracking-widest text-lime-300"><Sparkles size={16} /> BUYER RECOMMENDATIONS</p><h1 className="mt-2 text-3xl font-black">Best soybean centers for your requirement</h1><p className="mt-2 max-w-3xl text-sm text-green-100">Price, requested grade, available stock, distance, seasonal demand, center reliability and your previous successful purchases are considered.</p></section>
    <form onSubmit={(event) => { event.preventDefault(); load(); }} className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-5 shadow-sm"><SlidersHorizontal className="mb-3 text-green-700" /><label className="min-w-48 flex-1 text-sm font-black">Required quantity (qtl)<input required min="0.01" max="100000" step="0.01" type="number" value={preference.quantity} onChange={(event) => setPreference({ ...preference, quantity: event.target.value })} className="mt-1 block w-full rounded-lg border px-3 py-2" /></label><label className="min-w-40 text-sm font-black">Preferred grade<select value={preference.grade} onChange={(event) => setPreference({ ...preference, grade: event.target.value })} className="mt-1 block w-full rounded-lg border px-3 py-2"><option>A</option><option>B</option><option>C</option></select></label><button disabled={loading} className="rounded-xl bg-green-700 px-5 py-2.5 font-black text-white disabled:opacity-50">{loading ? "Ranking…" : "Apply preference"}</button>{forecast && <span className="rounded-full bg-green-50 px-3 py-2 text-xs font-bold text-green-800">{forecast.mode === "xgboost" ? "XGBoost ranking" : "Fallback ranking"}</span>}</form>
    {adminMode && <label className="mt-4 block rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm font-black text-violet-900">Admin acting for verified buyer<input value={adminBuyerId} onChange={(event) => setAdminBuyerId(event.target.value)} placeholder="Enter verified Buyer ID before placing an order" className="mt-2 block w-full rounded-lg border bg-white p-2 font-normal text-gray-900" /></label>}
    {message && <p className="mt-4 rounded-lg bg-amber-50 p-3 font-bold text-amber-900">{message}</p>}
    <section className="mt-7"><h2 className="text-2xl font-black">Recommended centers</h2><p className="mt-1 text-sm text-gray-600">Highest match पहले दिखाया गया है.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{centers.map((center, index) => { const recommendation = center.recommendation; return <article key={center.id} className={`rounded-2xl p-5 shadow-sm ${index === 0 ? "border-2 border-green-600 bg-green-50" : "bg-white"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-green-700">#{index + 1} RECOMMENDED</p><h3 className="mt-1 text-xl font-black">{center.name}</h3><p className="mt-1 flex items-center gap-1 text-sm text-gray-600"><MapPin size={14} />{center.district}, {center.state} · approx. {recommendation.distanceKm} km</p></div><span className="rounded-full bg-green-800 px-3 py-1 text-sm font-black text-white">{recommendation.matchScore}% match</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-white p-3"><p className="text-xs text-gray-500">Pred. price</p><p className="font-black">{money(recommendation.predictedPricePerQuintal)}</p></div><div className="rounded-xl bg-white p-3"><p className="text-xs text-gray-500">Available</p><p className="font-black">{number(recommendation.currentSupplyQuintal)} q</p></div><div className="rounded-xl bg-white p-3"><p className="text-xs text-gray-500">Reliability</p><p className="font-black">{recommendation.reliabilityPct}%</p></div></div>{recommendation.priorSuccessfulPurchase && <p className="mt-3 flex items-center gap-2 text-sm font-bold text-green-800"><BadgeCheck size={17} />You previously completed an order here.</p>}</article>; })}</div></section>
    <section className="mt-8"><h2 className="text-2xl font-black">Ranked stock listings</h2><p className="mt-1 text-sm text-gray-600">Landed cost, grade match और fulfillment history के अनुसार sorted.</p><div className="mt-4 grid gap-5 md:grid-cols-2">{listings.map((item) => { const values = forms[item.id] || {}; const rec = item.recommendation; return <article key={item.id} className={`rounded-2xl bg-white p-5 shadow-sm ${rec.rank === 1 ? "ring-2 ring-green-600" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-green-700">RANK #{rec.rank}</p><h3 className="text-xl font-black">{item.center.name}</h3><p className="text-sm text-gray-600">{item.center.district}, {item.center.state}</p></div><span className="rounded-full bg-lime-100 px-3 py-1 font-black text-green-900">{rec.score}% match</span></div><p className="mt-4 font-black">Soybean · Grade {item.grade} {rec.gradeMatch && <span className="text-green-700">✓ preferred</span>}</p><p className="mt-1 flex items-center gap-1 text-2xl font-black text-green-800"><IndianRupee size={21} />{money(item.pricePerQuintal).replace("₹", "")} / qtl</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><p className="rounded-lg bg-gray-50 p-2"><PackageCheck className="mr-1 inline" size={15} />{number(rec.availableQuintal)} q available</p><p className="rounded-lg bg-gray-50 p-2"><TrendingUp className="mr-1 inline" size={15} />{number(rec.predictedDemandQuintal)} q demand</p><p className="rounded-lg bg-gray-50 p-2">Landed: {money(rec.landedCostPerQuintal)}/q</p><p className="rounded-lg bg-gray-50 p-2">Reliability: {rec.reliabilityPct}%</p></div><div className="mt-3 flex flex-wrap gap-2">{rec.reasons.map((reason) => <span key={reason} className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800">{reason}</span>)}</div><input type="number" min="0.01" max={rec.availableQuintal} placeholder="Quantity (quintal)" value={values.quantity || ""} onChange={(event) => setForms({ ...forms, [item.id]: { ...values, quantity: event.target.value } })} className="mt-4 w-full rounded-lg border p-2" /><textarea placeholder="Delivery / pickup address" value={values.deliveryAddress || ""} onChange={(event) => setForms({ ...forms, [item.id]: { ...values, deliveryAddress: event.target.value } })} className="mt-2 w-full rounded-lg border p-2" /><button onClick={() => order(item.id)} className="mt-3 rounded-lg bg-green-700 px-4 py-2 font-bold text-white">Place order</button></article>; })}</div>{!loading && listings.length === 0 && <p className="mt-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-amber-900">No soybean stock currently matches an active listing.</p>}</section>
  </div></main></>;
}
