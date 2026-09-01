"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Building2, Boxes, CheckCircle2, ClipboardCheck, Handshake, MapPin, Phone, Plus, ShoppingCart, Trash2, UserCog, Warehouse, X } from "lucide-react";
import { LoggedInNavbar } from "../../../../component/LoggedInNavbar";

const purchaseForm = { buyerPrice: "", availableUntil: "", pickupStart: "", pickupEnd: "" };
const quantity = (value) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function AdminCenterDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [center, setCenter] = useState(null);
  const [message, setMessage] = useState({ text: "", error: false });
  const [price, setPrice] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [showOperator, setShowOperator] = useState(false);
  const [operatorId, setOperatorId] = useState("");
  const [purchaseForms, setPurchaseForms] = useState({});
  const [confirmingId, setConfirmingId] = useState("");
  const [tradeData, setTradeData] = useState({ market: [], trades: [] });
  const [tradeForms, setTradeForms] = useState({});
  const [workingTrade, setWorkingTrade] = useState("");
  const [listingPrices, setListingPrices] = useState({});
  const [savingListingId, setSavingListingId] = useState("");

  async function loadCenter() {
    const response = await fetch(`/api/center/centers/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setCenter(data.center);
    setPrice(data.center.cropPrices[0]?.price?.toString() || "");
    setListingPrices(Object.fromEntries(data.center.listings.map((listing) => [listing.id, listing.pricePerQuintal.toString()])));
  }

  const getTrading = useCallback(async () => {
    const [marketResponse, tradeResponse] = await Promise.all([
      fetch(`/api/center/trades/market?centerId=${id}`, { cache: "no-store" }),
      fetch(`/api/center/trades?centerId=${id}`, { cache: "no-store" }),
    ]);
    const [market, tradeResult] = await Promise.all([marketResponse.json(), tradeResponse.json()]);
    if (!marketResponse.ok) throw new Error(market.message);
    if (!tradeResponse.ok) throw new Error(tradeResult.message);
    return { market: market.listings, trades: tradeResult.trades };
  }, [id]);

  useEffect(() => {
    let active = true;
    fetch("/api/me").then((response) => response.json()).then((data) => { if (data.user?.role !== "ADMIN") router.replace("/"); }).catch(() => router.replace("/"));
    fetch(`/api/center/centers/${id}`, { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.center; })
      .then((loadedCenter) => { if (active) { setCenter(loadedCenter); setPrice(loadedCenter.cropPrices[0]?.price?.toString() || ""); setListingPrices(Object.fromEntries(loadedCenter.listings.map((listing) => [listing.id, listing.pricePerQuintal.toString()]))); } })
      .catch((error) => { if (active) setMessage({ text: error.message, error: true }); });
    getTrading().then((trading) => { if (active) setTradeData(trading); }).catch((error) => { if (active) setMessage({ text: error.message, error: true }); });
    return () => { active = false; };
  }, [id, router, getTrading]);

  async function savePrice(event) {
    event.preventDefault(); setSavingPrice(true); setMessage({ text: "", error: false });
    try {
      const response = await fetch(`/api/center/centers/${id}/price`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ price }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      setMessage({ text: "Soybean price updated for sellers.", error: false }); await loadCenter();
    } catch (error) { setMessage({ text: error.message, error: true }); } finally { setSavingPrice(false); }
  }

  async function assignOperator(event) {
    event.preventDefault();
    try {
      const response = await fetch(`/api/center/centers/${id}/operators`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: operatorId }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      setOperatorId(""); setShowOperator(false); setMessage({ text: "Operator assigned.", error: false }); await loadCenter();
    } catch (error) { setMessage({ text: error.message, error: true }); }
  }

  async function removeOperator(userId) {
    try {
      const response = await fetch(`/api/center/centers/${id}/operators`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      setMessage({ text: "Operator removed.", error: false }); await loadCenter();
    } catch (error) { setMessage({ text: error.message, error: true }); }
  }

  function formFor(bookingId) { return purchaseForms[bookingId] || purchaseForm; }
  function setPurchaseField(bookingId, field, value) { setPurchaseForms((forms) => ({ ...forms, [bookingId]: { ...formFor(bookingId), [field]: value } })); }

  async function confirmPurchase(bookingId) {
    setConfirmingId(bookingId); setMessage({ text: "", error: false });
    try {
      const response = await fetch(`/api/center/purchases/${bookingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formFor(bookingId), centerId: id }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      setMessage({ text: data.message, error: false }); await loadCenter();
    } catch (error) { setMessage({ text: error.message, error: true }); } finally { setConfirmingId(""); }
  }

  function tradeFormFor(trade) { return tradeForms[trade.id] || { quantity: trade.finalQty || trade.requestedQty, proposedPrice: trade.proposedPrice || trade.listing.pricePerQuintal, negotiationNote: trade.negotiationNote || "" }; }
  function setTradeField(tradeId, field, value) { setTradeForms((forms) => ({ ...forms, [tradeId]: { ...forms[tradeId], [field]: value } })); }
  async function createTrade(listingId) {
    const requestedQty = tradeForms[`listing-${listingId}`]?.quantity;
    setWorkingTrade(`listing-${listingId}`); setMessage({ text: "", error: false });
    try { const response = await fetch("/api/center/trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, quantity: requestedQty, centerId: id }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setMessage({ text: data.message, error: false }); const [, trading] = await Promise.all([loadCenter(), getTrading()]); setTradeData(trading); } catch (error) { setMessage({ text: error.message, error: true }); } finally { setWorkingTrade(""); }
  }
  async function updateTrade(trade, action) {
    setWorkingTrade(`${trade.id}-${action}`); setMessage({ text: "", error: false });
    try { const response = await fetch(`/api/center/trades/${trade.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...tradeFormFor(trade), centerId: id }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setMessage({ text: data.message, error: false }); const [, trading] = await Promise.all([loadCenter(), getTrading()]); setTradeData(trading); } catch (error) { setMessage({ text: error.message, error: true }); } finally { setWorkingTrade(""); }
  }
  async function saveListingPrice(listing) {
    setSavingListingId(listing.id); setMessage({ text: "", error: false });
    try { const response = await fetch(`/api/center/listings/${listing.id}/price`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ centerId: id, pricePerQuintal: listingPrices[listing.id] }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setMessage({ text: data.message, error: false }); await Promise.all([loadCenter(), getTrading().then(setTradeData)]); } catch (error) { setMessage({ text: error.message, error: true }); } finally { setSavingListingId(""); }
  }

  if (!center) return <><LoggedInNavbar /><main className="grid min-h-screen place-items-center font-bold text-gray-500">Loading center…</main></>;
  const soybean = center.cropPrices[0];
  const centerHistoryLink = `/admin/centers/${id}/history`;
  const marketCenters = Object.values(tradeData.market.reduce((groups, listing) => {
    const availableQty = Number(listing.availableQty) - Number(listing.reservedQty);
    if (!groups[listing.center.id]) groups[listing.center.id] = { ...listing.center, listings: [], availableQty: 0 };
    groups[listing.center.id].listings.push(listing);
    groups[listing.center.id].availableQty += availableQty;
    return groups;
  }, {}));
  return <><LoggedInNavbar /><main className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin/centers" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600"><ArrowLeft size={16} />All centers</Link><Link href={centerHistoryLink} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white">Payment history</Link></div><section className="mt-4 rounded-2xl bg-white p-6 shadow-sm"><div className="flex items-start gap-4"><div className="grid h-14 w-14 place-items-center rounded-xl bg-green-100 text-green-800"><Building2 size={26} /></div><div><h1 className="text-2xl font-black">{center.name}</h1><p className="mt-1 text-sm text-gray-500">{center.code} · {center.status}</p><p className="mt-2 flex items-center gap-1 text-sm text-gray-600"><MapPin size={14} />{center.address}, {center.district}, {center.state}</p><p className="mt-1 flex items-center gap-1 text-sm text-gray-600"><Phone size={14} />{center.phone}</p></div></div></section>
    {message.text && <p className={`mt-4 rounded-xl p-3 text-sm font-bold ${message.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>{message.text}</p>}
    <section className="mt-6 grid gap-4 sm:grid-cols-3"><article className="rounded-2xl bg-green-800 p-5 text-white"><Warehouse size={22} /><p className="mt-3 text-xs font-bold tracking-wider text-green-100">USED STORAGE</p><p className="mt-1 text-2xl font-black">{quantity(center.usedCapacity)} qtl</p><p className="text-sm text-green-100">of {quantity(center.totalCapacity)} qtl</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><Boxes className="text-green-700" size={22} /><p className="mt-3 text-xs font-bold tracking-wider text-gray-500">AVAILABLE STORAGE</p><p className="mt-1 text-2xl font-black">{quantity(Number(center.totalCapacity) - Number(center.usedCapacity))} qtl</p></article><article className="rounded-2xl bg-white p-5 shadow-sm"><CheckCircle2 className="text-amber-700" size={22} /><p className="mt-3 text-xs font-bold tracking-wider text-gray-500">READY PURCHASES</p><p className="mt-1 text-2xl font-black">{center.bookings.length}</p></article></section>
    <div className="mt-6 grid gap-6 md:grid-cols-2"><section className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold tracking-wider text-green-700">SELLER PRICE</p><h2 className="mt-1 text-xl font-black">Soybean rate</h2><p className="mt-2 text-sm text-gray-600">Current: {soybean ? `₹${Number(soybean.price).toLocaleString("en-IN")} per ${soybean.unit}` : "Not set"}</p><form onSubmit={savePrice} className="mt-4 flex gap-2"><input required min="1" step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price per quintal" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" /><button disabled={savingPrice} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{savingPrice ? "Saving…" : "Save"}</button></form></section>
      <section className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-black"><UserCog size={19} className="text-green-700" />Operators</h2><button onClick={() => setShowOperator((value) => !value)} className="inline-flex items-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-xs font-bold text-white">{showOperator ? <X size={14} /> : <Plus size={14} />}{showOperator ? "Cancel" : "Assign"}</button></div>{showOperator && <form onSubmit={assignOperator} className="mt-3 flex gap-2"><input required value={operatorId} onChange={(event) => setOperatorId(event.target.value)} placeholder="CENTER user ID" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" /><button className="rounded-lg border px-3 text-sm font-bold">Add</button></form>}<div className="mt-4 space-y-2">{center.operators.length ? center.operators.map((operator) => <div key={operator.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3"><div><p className="font-bold">{operator.name}</p><p className="text-xs text-gray-500">{operator.phone}</p></div><button onClick={() => removeOperator(operator.id)} className="rounded-lg p-2 text-red-700 hover:bg-red-50" title="Remove operator"><Trash2 size={16} /></button></div>) : <p className="py-4 text-center text-sm text-gray-500">No operators assigned.</p>}</div></section></div>
    <section id="purchase-manager" className="mt-6 rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Confirm seller purchase & publish buyer stock</h2><p className="mt-1 text-sm text-gray-600">After seller acceptance, set sale price and dates here. This marks settlement complete and adds the crop to storage.</p><div className="mt-4 space-y-4">{center.bookings.map((booking) => { const form = formFor(booking.id); return <article key={booking.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-black">{booking.seller.user.name} · Soybean grade {booking.inspection.grade}</p><p className="mt-1 text-sm text-gray-700">{booking.seller.user.phone} · {quantity(booking.quantity)} qtl · Seller price ₹{quantity(booking.inspection.gradePrice)} / qtl</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-bold">Buyer price / qtl<input required min="0.01" step="0.01" type="number" value={form.buyerPrice} onChange={(event) => setPurchaseField(booking.id, "buyerPrice", event.target.value)} className="mt-1 block w-full rounded-lg border p-2 text-sm" /></label><label className="text-xs font-bold">Order deadline<input required type="date" value={form.availableUntil} onChange={(event) => setPurchaseField(booking.id, "availableUntil", event.target.value)} className="mt-1 block w-full rounded-lg border p-2 text-sm" /></label><label className="text-xs font-bold">Pickup start<input required type="date" value={form.pickupStart} onChange={(event) => setPurchaseField(booking.id, "pickupStart", event.target.value)} className="mt-1 block w-full rounded-lg border p-2 text-sm" /></label><label className="text-xs font-bold">Pickup end<input required type="date" value={form.pickupEnd} onChange={(event) => setPurchaseField(booking.id, "pickupEnd", event.target.value)} className="mt-1 block w-full rounded-lg border p-2 text-sm" /></label></div><button disabled={confirmingId === booking.id} onClick={() => confirmPurchase(booking.id)} className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{confirmingId === booking.id ? "Confirming…" : "Confirm purchase, settlement & storage"}</button></article>; })}{!center.bookings.length && <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">No seller-approved purchases are waiting for this center.</p>}</div></section>
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Buyer-visible soybean stock & market selling price</h2><p className="mt-1 text-sm text-gray-600">Set the price at which this center sells stock to buyers or another center. It cannot go below purchase cost, charges, and a 5% center margin.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{center.listings.map((listing) => { const cost = Number(listing.costPrice); const charges = Number(listing.storageCharge) + Number(listing.handlingCharge); const floor = cost * 1.05 + charges; const margin = Number(listing.pricePerQuintal) - cost - charges; return <article key={listing.id} className="rounded-xl bg-green-50 p-4"><p className="font-black">Grade {listing.grade} · {quantity(Number(listing.availableQty) - Number(listing.reservedQty))} qtl available</p><p className="mt-1 text-sm text-green-900">Current market price: ₹{quantity(listing.pricePerQuintal)} / qtl</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><p className="rounded-lg bg-white p-2"><span className="block font-bold text-gray-500">Purchase cost</span>{cost ? `₹${quantity(cost)} / qtl` : "Legacy cost not recorded"}</p><p className="rounded-lg bg-white p-2"><span className="block font-bold text-gray-500">Minimum profitable price</span>₹{quantity(floor)} / qtl</p><p className="col-span-2 rounded-lg bg-white p-2 font-bold text-green-800">Current margin after charges: ₹{quantity(margin)} / qtl</p></div><div className="mt-3 flex gap-2"><input min={floor} step="0.01" type="number" value={listingPrices[listing.id] ?? ""} onChange={(event) => setListingPrices((prices) => ({ ...prices, [listing.id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border bg-white p-2 text-sm" /><button disabled={savingListingId === listing.id} onClick={() => saveListingPrice(listing)} className="rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{savingListingId === listing.id ? "Saving…" : "Set market price"}</button></div><p className="mt-3 text-sm text-gray-600">Order until {new Date(listing.availableUntil).toLocaleDateString("en-IN")} · Pickup: {new Date(listing.pickupStart).toLocaleDateString("en-IN")} – {new Date(listing.pickupEnd).toLocaleDateString("en-IN")}</p></article>; })}</div>{!center.listings.length && <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">No published buyer stock yet.</p>}</section>
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ShoppingCart size={20} className="text-green-700" /><div><h2 className="text-xl font-black">Buy soybean from another center</h2><p className="mt-1 text-sm text-gray-600">Choose a center first, then view all its soybean stock grade-wise and place a request.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2">{marketCenters.map((marketCenter) => <article key={marketCenter.id} className="rounded-xl border border-green-100 bg-green-50 p-4"><p className="font-black">{marketCenter.name}</p><p className="mt-1 text-sm text-gray-700">{marketCenter.district}, {marketCenter.state}</p><p className="mt-2 text-sm font-bold text-green-900">{quantity(marketCenter.availableQty)} qtl across {marketCenter.listings.length} soybean grade listing{marketCenter.listings.length === 1 ? "" : "s"}</p><p className="mt-1 text-xs text-gray-600">Grades available: {[...new Set(marketCenter.listings.map((listing) => listing.grade))].join(", ")}</p><Link href={`/admin/centers/${id}/market/${marketCenter.id}`} className="mt-4 inline-flex rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white">View stock & trade</Link></article>)}</div>{!marketCenters.length && <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">No other center has soybean stock available right now.</p>}</section>
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ArrowRightLeft size={20} className="text-green-700" /><div><h2 className="text-xl font-black">Center-to-center trade manager</h2><p className="mt-1 text-sm text-gray-600">Manage physical checks, offers, acceptance, settlement, and storage transfer for this center.</p></div></div><div className="mt-4 space-y-3">{tradeData.trades.map((trade) => { const isBuyer = trade.buyerCenterId === id; const form = tradeFormFor(trade); return <article key={trade.id} className="rounded-xl border border-gray-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-green-700">{isBuyer ? "BUYING FROM" : "SELLING TO"}</p><p className="font-black">{isBuyer ? trade.sellerCenter.name : trade.buyerCenter.name} · Soybean grade {trade.listing.grade}</p><p className="mt-1 text-sm text-gray-600">Requested {quantity(trade.requestedQty)} qtl · {trade.proposedPrice ? `Offer ₹${quantity(trade.proposedPrice)} / qtl` : "Price offer pending"}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{trade.status.replaceAll("_", " ")}</span></div>{trade.negotiationNote && <p className="mt-2 text-sm text-gray-600">Note: {trade.negotiationNote}</p>}{isBuyer && trade.status === "ORDERED" && <div className="mt-3 flex gap-2"><button disabled={workingTrade === `${trade.id}-REQUEST_PHYSICAL_CHECK`} onClick={() => updateTrade(trade, "REQUEST_PHYSICAL_CHECK")} className="inline-flex items-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white"><ClipboardCheck size={15} />Request physical check</button><button onClick={() => updateTrade(trade, "CANCEL")} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700">Cancel</button></div>}{isBuyer && trade.status === "PHYSICAL_CHECKED" && <div className="mt-3 grid gap-2 sm:grid-cols-4"><input min="0.01" step="0.01" type="number" value={form.quantity} onChange={(event) => setTradeField(trade.id, "quantity", event.target.value)} placeholder="Final quantity" className="rounded-lg border p-2 text-sm" /><input min="0.01" step="0.01" type="number" value={form.proposedPrice} onChange={(event) => setTradeField(trade.id, "proposedPrice", event.target.value)} placeholder="Price/qtl" className="rounded-lg border p-2 text-sm" /><input value={form.negotiationNote} onChange={(event) => setTradeField(trade.id, "negotiationNote", event.target.value)} placeholder="Negotiation note" className="rounded-lg border p-2 text-sm" /><button onClick={() => updateTrade(trade, "SUBMIT_OFFER")} className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white"><Handshake size={15} />Send offer</button></div>}{!isBuyer && trade.status === "PHYSICAL_CHECK_PENDING" && <div className="mt-3 flex gap-2"><button onClick={() => updateTrade(trade, "GRANT_PHYSICAL_CHECK")} className="rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white">Allow physical check</button><button onClick={() => updateTrade(trade, "REJECT_SALE")} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700">Decline</button></div>}{!isBuyer && trade.status === "CONFIRMED" && <div className="mt-3 flex gap-2"><button onClick={() => updateTrade(trade, "ACCEPT_SALE")} className="rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white">Accept offer & transfer stock</button><button onClick={() => updateTrade(trade, "REJECT_SALE")} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700">Decline offer</button></div>}{isBuyer && ["PHYSICAL_CHECK_PENDING", "PHYSICAL_CHECKED", "CONFIRMED"].includes(trade.status) && <button onClick={() => updateTrade(trade, "CANCEL")} className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700">Cancel request</button>}</article>; })}</div>{!tradeData.trades.length && <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">No center-to-center trade requests for this center yet.</p>}</section>
  </div></main></>;
}
