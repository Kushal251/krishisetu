"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BrainCircuit, CloudSun, IndianRupee, MapPin, PackageOpen, RefreshCw, TrendingUp } from "lucide-react";
import { LoggedInNavbar } from "../../component/LoggedInNavbar";

const money = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const decimal = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });

export default function MarketForecastPage() {
  const [quantity, setQuantity] = useState("10");
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadForecast(nextQuantity = quantity) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/ml/forecast?quantity=${encodeURIComponent(nextQuantity)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Forecast could not be loaded.");
      setForecast(body);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/ml/forecast?quantity=10", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "Forecast could not be loaded.");
        if (active) setForecast(body);
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const best = forecast?.results?.[0];

  return <><LoggedInNavbar /><main className="min-h-screen bg-[#f6f8f4] p-5 sm:p-8"><div className="mx-auto max-w-6xl">
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-green-950 via-green-800 to-emerald-700 p-6 text-white sm:p-9"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="flex items-center gap-2 text-xs font-black tracking-widest text-lime-300"><BrainCircuit size={17} /> KRISHISETU ML FORECAST</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Soybean demand, supply &amp; price forecast</h1><p className="mt-3 max-w-2xl text-sm text-green-100">Registered centers ke live stock, incoming bookings, buyer demand, price history aur static seasonal weather profile ke basis par recommendation.</p></div>{forecast && <span className={`rounded-full px-3 py-1.5 text-xs font-black ${forecast.mode === "xgboost" ? "bg-lime-300 text-green-950" : "bg-amber-300 text-amber-950"}`}>{forecast.mode === "xgboost" ? "XGBoost active" : "Fallback estimate"}</span>}</div></section>

    <form onSubmit={(event) => { event.preventDefault(); loadForecast(); }} className="mt-5 flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-end"><label className="flex-1 text-sm font-black text-gray-700">Selling quantity (quintal)<input required min="0.01" max="100000" step="0.01" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-3 font-bold outline-none focus:border-green-600" /></label><button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 font-black text-white hover:bg-green-800 disabled:opacity-60"><RefreshCw size={18} className={loading ? "animate-spin" : ""} />{loading ? "Calculating…" : "Update forecast"}</button></form>

    {error && <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"><h2 className="font-black">Forecast unavailable</h2><p className="mt-1 text-sm">{error}</p></section>}
    {!error && loading && !forecast && <section className="mt-5 rounded-2xl bg-white p-8 text-center font-bold text-gray-500">Market data and ML prediction load ho raha hai…</section>}

    {best && <><section className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><article className="rounded-2xl bg-green-900 p-5 text-white"><MapPin className="text-lime-300" /><p className="mt-4 text-xs font-bold text-green-200">BEST CENTER</p><h2 className="mt-1 text-xl font-black">{best.centerName}</h2><p className="mt-1 text-sm text-green-100">{best.district}, {best.state}</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><IndianRupee className="text-blue-700" /><p className="mt-4 text-xs font-bold text-gray-500">PREDICTED PRICE</p><p className="mt-1 text-2xl font-black">₹{money(best.predictedPricePerQuintal)}</p><p className="text-sm text-gray-500">per quintal</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><TrendingUp className="text-emerald-700" /><p className="mt-4 text-xs font-bold text-gray-500">PREDICTED DEMAND</p><p className="mt-1 text-2xl font-black">{decimal(best.predictedDemandQuintal)}</p><p className="text-sm text-gray-500">quintal</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><PackageOpen className="text-amber-700" /><p className="mt-4 text-xs font-bold text-gray-500">ESTIMATED NET AMOUNT</p><p className="mt-1 text-2xl font-black">₹{money(best.netAmount)}</p><p className="text-sm text-gray-500">after estimated transport &amp; fee</p></article></section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-wider text-green-700">CENTER COMPARISON</p><h2 className="mt-1 text-2xl font-black">Expected return by center</h2></div><p className="text-xs text-gray-500">Model {forecast.modelVersion} · {new Date(forecast.generatedAt).toLocaleString("en-IN")}</p></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-gray-500"><th className="p-3">Center</th><th className="p-3">Demand</th><th className="p-3">Supply</th><th className="p-3">Current price</th><th className="p-3">Predicted price</th><th className="p-3">Weather</th><th className="p-3">Net amount</th><th className="p-3"></th></tr></thead><tbody>{forecast.results.map((item, index) => <tr key={item.centerId} className={`border-b border-gray-100 ${index === 0 ? "bg-green-50" : ""}`}><td className="p-3"><p className="font-black">{item.centerName}</p><p className="text-xs text-gray-500">{item.district} · approx. {item.distanceKm} km</p></td><td className="p-3 font-bold">{decimal(item.predictedDemandQuintal)} q</td><td className="p-3">{decimal(item.currentSupplyQuintal)} q</td><td className="p-3">₹{money(item.currentPricePerQuintal)}</td><td className="p-3 font-black text-green-800">₹{money(item.predictedPricePerQuintal)}</td><td className="p-3"><span className="inline-flex items-center gap-1"><CloudSun size={16} />{item.weather.condition}</span><p className="text-xs text-gray-500">{item.weather.temperatureC}°C · {item.weather.rainfallMm} mm</p></td><td className="p-3 font-black">₹{money(item.netAmount)}</td><td className="p-3"><Link href={`/centers/${item.centerId}`} className="inline-flex items-center gap-1 font-black text-green-700">View <ArrowRight size={15} /></Link></td></tr>)}</tbody></table></div></section>
      <p className="mt-4 text-xs text-gray-500">Displayed predicted price center ke declared current/base rate se capped hai, isliye seller payout forecast kabhi center rate se ऊपर नहीं जाएगा. Raw ML market estimate internal reference ke रूप में रखा जाता है. Final transport expense actual transaction ke samay अलग हो सकता है.</p></>}
  </div></main></>;
}
