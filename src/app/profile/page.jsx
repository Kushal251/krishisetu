"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VerificationPanel } from "../../component/VerificationPanel";
import { BuyerVerificationPanel } from "../../component/BuyerVerificationPanel";
import { LoggedInNavbar } from "../../component/LoggedInNavbar";
import { SeasonHistory } from "../../component/SeasonHistory";

const label = "text-xs font-bold uppercase tracking-wide text-gray-500";
const value = "mt-1 break-words text-base font-semibold text-gray-900";
const niceType = (type) => type?.replace("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
const mask = (text, visible = 4) => text ? `${"•".repeat(Math.max(0, text.length - visible))}${text.slice(-visible)}` : "Not provided";
function Detail({ title, children }) { return <div><p className={label}>{title}</p><p className={value}>{children || "Not provided"}</p></div>; }
function Status({ title, active }) { return <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{title}: {active ? "Verified" : "Pending"}</span>; }

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load profile.");
        setUser(data.user);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-black">Profile unavailable</h1><p className="mt-3 text-red-700">{error}</p><Link className="mt-5 inline-block font-bold text-green-700" href="/login">Go to login</Link></main>;
  if (!user) return <main className="grid min-h-screen place-items-center font-semibold text-gray-600">Loading profile…</main>;

  const seller = user.seller;
  const buyer = user.buyer;
  return <><LoggedInNavbar user={user} /><main className="min-h-screen bg-gray-50 p-5 sm:p-8"><div className="mx-auto max-w-4xl"><div className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/dashboard" className="text-sm font-bold text-green-700">← Back to home</Link><h1 className="mt-3 text-3xl font-black sm:text-4xl">My profile</h1><p className="mt-1 text-gray-600">Your KisanSetu account and {buyer ? "buyer business" : "seller"} details.</p></div><div className="rounded-xl bg-green-700 px-4 py-2 font-bold text-white">{niceType(seller?.sellerType || buyer?.buyerType || user.role)}</div></div>
    <section className="mt-7 rounded-2xl bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap gap-2"><Status title="Phone" active={user.phoneVerified} /><Status title="Aadhaar" active={user.aadhaarVerified} />{user.email && <Status title="Email" active={user.emailVerified} />}</div><h2 className="mt-6 text-xl font-black">Personal information</h2><div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Detail title="Full name">{user.name}</Detail><Detail title="Mobile number">{user.phone}</Detail><Detail title="Email">{user.email}</Detail><Detail title="Aadhaar number">{mask(user.aadhaarNumber)}</Detail><Detail title="Account created">{new Date(user.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</Detail></div></section>
    {seller && <><section className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black">Seller details</h2><div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Detail title="Seller type">{niceType(seller.sellerType)}</Detail><Detail title="Verification status">{seller.verificationStatus}</Detail><Detail title="Village">{seller.village}</Detail><Detail title="District">{seller.district}</Detail><Detail title="State">{seller.state}</Detail><Detail title="Address">{seller.address}</Detail></div></section>
    <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black">Bank details</h2><div className="mt-4 grid gap-5 sm:grid-cols-2"><Detail title="Bank account">{mask(seller.bankAccount)}</Detail><Detail title="IFSC code">{seller.ifscCode}</Detail></div></section>
    <VerificationPanel status={seller.verificationStatus} latestRequest={seller.verificationRequests?.[0]} notifications={user.notifications} />
    {seller.sellerType === "FARMER" && seller.verificationStatus === "VERIFIED" && <SeasonHistory />}
    {seller.farmer && <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black">Farmer profile</h2><div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Detail title="Land area">{seller.farmer.landArea} {seller.farmer.landUnit}</Detail><Detail title="Khasra number">{seller.farmer.khasraNumber}</Detail><Detail title="PM-Kisan ID">{seller.farmer.pmKisanId}</Detail><Detail title="KCC number">{seller.farmer.kccNumber}</Detail></div></section>}
    {seller.fpo && <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black">FPO profile</h2><div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Detail title="Organisation">{seller.fpo.organizationName}</Detail><Detail title="Registration number">{seller.fpo.registrationNo}</Detail><Detail title="Member count">{seller.fpo.memberCount}</Detail></div></section>}</>}
    {buyer && <><section className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black">Buyer business details</h2><div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Detail title="Business name">{buyer.businessName}</Detail><Detail title="Buyer type">{niceType(buyer.buyerType)}</Detail><Detail title="Verification status">{buyer.verificationStatus}</Detail><Detail title="GSTIN">{buyer.gstin}</Detail><Detail title="PAN number">{buyer.panNumber}</Detail><Detail title="Address">{buyer.address}</Detail><Detail title="City">{buyer.city}</Detail><Detail title="State">{buyer.state}</Detail><Detail title="PIN code">{buyer.pinCode}</Detail></div></section><BuyerVerificationPanel status={buyer.verificationStatus} latestRequest={buyer.verificationRequests?.[0]} notifications={user.notifications} /></>}</div></main></>;
}
