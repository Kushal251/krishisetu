"use client";

import Link from "next/link";
import { ArrowRight, Sprout } from "lucide-react";
import { useEffect, useState } from "react";

export function SeasonBanner() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch("/api/season/current", { cache: "no-store" }).then(async (response) => response.ok ? response.json() : null).then(setData).catch(() => {}); }, []);
  if (!data?.season) return null;
  const registration = data.registration;
  const label = `${data.season.name[0]}${data.season.name.slice(1).toLowerCase()} ${data.season.year}`;
  return <section className="rounded-2xl bg-lime-300 p-5 text-green-950"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-start gap-3"><Sprout className="mt-1" size={28} /><div><p className="text-xs font-bold uppercase tracking-wider">Season registration active</p><h2 className="mt-1 text-xl font-black">{label} crop declaration</h2><p className="mt-1 text-sm">{registration.status === "DRAFT" || registration.status === "REJECTED" ? "Tell us which crops you have sown on your land." : `Declaration ${registration.status.toLowerCase()}.`}</p></div></div><Link href="/season-registration" className="inline-flex items-center gap-2 rounded-xl bg-green-900 px-4 py-2.5 text-sm font-bold text-white">{registration.status === "DRAFT" || registration.status === "REJECTED" ? "Declare crops" : "View declaration"}<ArrowRight size={16} /></Link></div></section>;
}
