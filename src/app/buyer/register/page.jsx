"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MPLocationFields } from "../../../component/MPLocationFields";
import { MP_STATE } from "../../../../lib/mpLocations";

const fields = [["name", "Contact person"], ["phone", "Mobile number"], ["email", "Business email"], ["businessName", "Business name"], ["gstin", "GSTIN"], ["panNumber", "PAN number"], ["address", "Business address"]];

export default function BuyerRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState({ state: MP_STATE, division: "", district: "", village: "", pinCode: "" });

  async function submit(event) {
    event.preventDefault(); setLoading(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth/buyer-register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) return setError(data.message);
    router.push("/buyer/login?created=1");
  }

  return <main className="min-h-screen bg-[#f6f8f4] p-6"><form onSubmit={submit} className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm"><Link href="/" className="text-sm font-bold text-green-700">← Home</Link><h1 className="mt-4 text-3xl font-black">Create buyer account</h1><p className="mt-2 text-gray-600">Business location must be selected from the supported Madhya Pradesh network.</p><div className="mt-6 grid gap-4 sm:grid-cols-2">{fields.map(([name, label]) => <label key={name} className="text-sm font-bold">{label}<input required name={name} inputMode={name === "phone" ? "numeric" : undefined} maxLength={name === "phone" ? 10 : undefined} type={name === "email" ? "email" : "text"} className="mt-1 block w-full rounded-xl border border-gray-300 p-3" /></label>)}<MPLocationFields value={location} onChange={setLocation} /><label className="text-sm font-bold">Buyer type<select name="buyerType" className="mt-1 block w-full rounded-xl border border-gray-300 p-3"><option value="PROCESSOR">Processor</option><option value="WHOLESALER">Wholesaler</option><option value="RETAILER">Retailer</option><option value="EXPORTER">Exporter</option></select></label><label className="text-sm font-bold">Password<input required minLength="8" name="password" type="password" className="mt-1 block w-full rounded-xl border border-gray-300 p-3" /></label></div>{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}<button disabled={loading} className="mt-6 rounded-xl bg-green-700 px-5 py-3 font-bold text-white disabled:opacity-50">{loading ? "Creating…" : "Create buyer account"}</button><p className="mt-4 text-sm">Already registered? <Link href="/buyer/login" className="font-bold text-green-700">Buyer login</Link></p></form></main>;
}
