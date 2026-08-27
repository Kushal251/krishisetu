"use client";

import Link from "next/link";
import { ArrowRight, BellRing, CalendarDays, CheckCircle2, CircleAlert, FileText, Landmark, MapPin, Sprout, Tractor } from "lucide-react";
import { useEffect, useState } from "react";
import { LoggedInNavbar } from "../../component/LoggedInNavbar";
import { SeasonBanner } from "../../component/SeasonBanner";

const updates = [
  { title: "PM-KISAN beneficiary details", text: "Keep your Aadhaar and bank details updated before the next benefit cycle.", type: "Important update", icon: CircleAlert, tone: "amber" },
  { title: "Crop insurance registration window", text: "Check your nearest agriculture office or official portal for current registration dates.", type: "Farmer notice", icon: CalendarDays, tone: "green" },
  { title: "Soil Health Card services", text: "Contact your local agriculture department for soil testing and nutrient recommendations.", type: "Service update", icon: FileText, tone: "blue" },
];

const schemes = [
  { name: "PM-KISAN", summary: "Income support for eligible landholding farmer families.", tag: "Income support", icon: Landmark },
  { name: "Pradhan Mantri Fasal Bima Yojana", summary: "Crop insurance support for notified crops and areas.", tag: "Crop insurance", icon: Sprout },
  { name: "Kisan Credit Card", summary: "Short-term credit support for cultivation and related needs.", tag: "Farm credit", icon: Tractor },
];

function StatusCard({ seller }) {
  const verified = seller?.verificationStatus === "VERIFIED";
  return <section className={`rounded-2xl p-5 text-white ${verified ? "bg-green-800" : "bg-amber-700"}`}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-white/75">Profile status</p><h2 className="mt-2 text-2xl font-black">{verified ? "Verified seller" : "Verification pending"}</h2><p className="mt-2 max-w-xl text-sm text-white/85">{verified ? "Your profile is verified. You can use farmer services as they become available." : "Complete profile verification to access all seller and farmer services."}</p></div>{verified ? <CheckCircle2 size={38} /> : <CircleAlert size={38} />}</div><Link href="/profile" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-gray-900">View profile <ArrowRight size={16} /></Link></section>;
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || "Unable to load dashboard."); return data.user; })
      .then(setUser)
      .catch((requestError) => setError(requestError.message));
  }, []);

  if (error) return <main className="grid min-h-screen place-items-center p-6"><div className="max-w-md text-center"><h1 className="text-2xl font-black">Dashboard unavailable</h1><p className="mt-2 text-red-700">{error}</p><Link href="/login" className="mt-5 inline-block font-bold text-green-700">Go to login</Link></div></main>;
  if (!user) return <main className="grid min-h-screen place-items-center font-bold text-gray-600">Loading your dashboard…</main>;

  const seller = user.seller;
  return <><LoggedInNavbar user={user} /><main className="min-h-screen bg-[#f6f8f4]"><div className="mx-auto max-w-6xl p-5 sm:p-8"><section className="rounded-3xl bg-gradient-to-br from-green-950 to-green-700 px-6 py-8 text-white sm:px-9"><p className="text-sm font-bold text-lime-300">WELCOME BACK</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Namaste, {user.name}</h1><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-green-100">{seller && <span className="inline-flex items-center gap-2"><MapPin size={16} />{seller.village}, {seller.district}</span>}<span className="inline-flex items-center gap-2"><BellRing size={16} />Government updates and schemes</span></div></section>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><div className="space-y-6"><StatusCard seller={seller} />{seller?.sellerType === "FARMER" && seller.verificationStatus === "VERIFIED" && <SeasonBanner />}<section><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-wider text-green-700">LATEST FOR FARMERS</p><h2 className="mt-1 text-2xl font-black">Forms &amp; updates</h2></div><span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-600">Static demo data</span></div><div className="mt-4 space-y-3">{updates.map((update) => { const Icon = update.icon; return <article key={update.title} className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${update.tone === "amber" ? "bg-amber-100 text-amber-800" : update.tone === "blue" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}><Icon size={21} /></div><div><p className="text-xs font-bold text-gray-500">{update.type}</p><h3 className="mt-1 font-black">{update.title}</h3><p className="mt-1 text-sm text-gray-600">{update.text}</p></div></article>; })}</div></section></div>
      <aside className="space-y-6"><section className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold tracking-wider text-green-700">GOVERNMENT SCHEMES</p><h2 className="mt-1 text-2xl font-black">Explore support</h2><div className="mt-4 space-y-3">{schemes.map((scheme) => { const Icon = scheme.icon; return <article key={scheme.name} className="rounded-xl border border-gray-100 p-4"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-lime-100 text-green-800"><Icon size={18} /></div><div><h3 className="font-black text-gray-900">{scheme.name}</h3><p className="mt-1 text-xs font-bold text-green-700">{scheme.tag}</p></div></div><p className="mt-3 text-sm text-gray-600">{scheme.summary}</p></article>; })}</div></section><section className="rounded-2xl border border-dashed border-green-300 bg-green-50 p-5"><h2 className="font-black text-green-950">Need to update details?</h2><p className="mt-2 text-sm text-green-900">Keep your location, bank, and farm details accurate for future services.</p><Link href="/profile" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-green-800">Open my profile <ArrowRight size={16} /></Link></section></aside></div></div></main></>;
}
