"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoggedInNavbar } from "../../../component/LoggedInNavbar";
import { Building2, MapPin, Phone, ArrowRight, Plus, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { MPLocationFields } from "../../../component/MPLocationFields";
import { MP_STATE } from "../../../../lib/mpLocations";

const INITIAL_FORM = {
  code: "", name: "", state: MP_STATE, division: "", district: "", village: "",
  pinCode: "", address: "", latitude: "", longitude: "",
  phone: "", email: "", totalCapacity: "",
};

function StatusBadge({ status }) {
  const active = status === "ACTIVE";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
      active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
    }`}>
      {active ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
      {status}
    </span>
  );
}

export default function AdminCentersPage() {
  const [centers, setCenters]   = useState([]);
  const [form, setForm]         = useState(INITIAL_FORM);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage]   = useState({ text: "", error: false });
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState({ state: "", district: "", status: "ALL" });
  const [applied, setApplied]   = useState({ state: "", district: "", status: "ALL" });
  // if your not admin use this to redirect to home page
//  find role from cookies
  const [isAdmin, setIsAdmin] = useState(false);
   const router = useRouter();
   useEffect(() => {
    async function checkAdmin() {
      const response = await fetch("/api/me");
      const data = await response.json();
      console.log("data", data);
      if (response.ok && data.user && data.user.role === "ADMIN") {
        setIsAdmin(true);
      }else {
        setIsAdmin(false);
         router.push("/");
      }
    }
    checkAdmin();
  }
, [router]);

  console.log("isAdmin", isAdmin);
 

  async function loadCenters() {
    const params = new URLSearchParams();
    if (applied.state)              params.set("state",    applied.state);
    if (applied.district)           params.set("district", applied.district);
    if (applied.status !== "ALL")   params.set("status",   applied.status);
    const response = await fetch(`/api/center/centers?${params}`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setCenters(data.centers);
    else setMessage({ text: data.message, error: true });
  }

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (applied.state) params.set("state", applied.state);
    if (applied.district) params.set("district", applied.district);
    if (applied.status !== "ALL") params.set("status", applied.status);
    fetch(`/api/center/centers?${params}`, { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.centers; })
      .then((loadedCenters) => { if (active) setCenters(loadedCenters); })
      .catch((error) => { if (active) setMessage({ text: error.message, error: true }); });
    return () => { active = false; };
  }, [applied]);

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
    className: "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none",
  });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", error: false });
    try {
      const response = await fetch("/api/center/centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage({ text: `Center "${data.center.name}" created successfully.`, error: false });
      setForm(INITIAL_FORM);
      setShowForm(false);
      loadCenters();
    } catch (err) {
      setMessage({ text: err.message, error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <LoggedInNavbar />
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl">

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900">Centers</h1>
              <p className="mt-1 text-gray-600">Manage procurement center registrations across the network.</p>
            </div>
            <button
              onClick={() => { setShowForm((v) => !v); setMessage({ text: "", error: false }); }}
              className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-800"
            >
              {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add center</>}
            </button>
          </div>

          {/* Feedback message */}
          {message.text && (
            <div className={`mt-4 rounded-xl p-3 text-sm font-bold ${
              message.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"
            }`}>
              {message.text}
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <form onSubmit={submit} className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-black">Register new center</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Code *</label>
                  <input required placeholder="e.g. KS-MH-001" {...field("code")} />
                </div>
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Center name *</label>
                  <input required placeholder="Full center name" {...field("name")} />
                </div>
                <MPLocationFields value={form} onChange={setForm} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none disabled:bg-gray-100" />
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Address *</label>
                  <input required placeholder="Full address" {...field("address")} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Phone *</label>
                  <input required placeholder="Phone number" {...field("phone")} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Email</label>
                  <input type="email" placeholder="center@example.com" {...field("email")} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Total capacity (tons) *</label>
                  <input required type="number" min="1" step="0.01" placeholder="500" {...field("totalCapacity")} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Latitude</label>
                  <input type="number" step="any" placeholder="18.5204" {...field("latitude")} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Longitude</label>
                  <input type="number" step="any" placeholder="73.8567" {...field("longitude")} />
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-green-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Create center"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(INITIAL_FORM); }}
                  className="rounded-xl border px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Filters */}
          <form
            onSubmit={(e) => { e.preventDefault(); setApplied(search); }}
            className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm"
          >
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1 block text-xs font-bold text-gray-500">State</label>
              <input
                value={search.state}
                onChange={(e) => setSearch({ ...search, state: e.target.value })}
                placeholder="Filter by state"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1 block text-xs font-bold text-gray-500">District</label>
              <input
                value={search.district}
                onChange={(e) => setSearch({ ...search, district: e.target.value })}
                placeholder="Filter by district"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Status</label>
              <select
                value={search.status}
                onChange={(e) => setSearch({ ...search, status: e.target.value })}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <button className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white">
              Apply
            </button>
          </form>

          {/* Centers list */}
          <div className="mt-6 space-y-3">
            {centers.length === 0 && (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                <Building2 size={40} className="mx-auto text-gray-300" />
                <p className="mt-3 font-bold text-gray-500">No centers found.</p>
                <p className="mt-1 text-sm text-gray-400">Add the first center using the button above.</p>
              </div>
            )}
            {centers.map((center) => (
              <article
                key={center.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-green-100">
                    <Building2 size={22} className="text-green-800" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-black text-gray-900">{center.name}</h2>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                        {center.code}
                      </span>
                      <StatusBadge status={center.status} />
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <MapPin size={13} /> {center.district}, {center.state}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <Phone size={13} /> {center.phone}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>{center._count.operators} operator{center._count.operators !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{center._count.bookings} booking{center._count.bookings !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/admin/centers/${center.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Manage storage & purchases <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </div>

        </div>
      </main>
    </>
  );
}
