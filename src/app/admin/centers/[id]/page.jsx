"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LoggedInNavbar } from "../../../../component/LoggedInNavbar";
import {
  Building2, ArrowLeft, MapPin, Phone, Mail, Layers, UserCog,
  Plus, X, Trash2, CheckCircle2, AlertCircle, Warehouse,
} from "lucide-react";

function StatusBadge({ status }) {
  const active = status === "ACTIVE";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
      active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
    }`}>
      {active ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
      {status}
    </span>
  );
}

function CapacityBar({ used, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-gray-500">
        <span>{used} / {total} tons</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminCenterDetailPage() {
  const { id } = useParams();
  const [center, setCenter]     = useState(null);
  const [error, setError]       = useState("");
  const [message, setMessage]   = useState({ text: "", err: false });

  // Warehouse form
  const [warehouseForm, setWarehouseForm] = useState({ name: "", totalCapacity: "" });
  const [showWH, setShowWH]               = useState(false);
  const [savingWH, setSavingWH]           = useState(false);

  // Operator form
  const [opUserId, setOpUserId]   = useState("");
  const [showOp, setShowOp]       = useState(false);
  const [savingOp, setSavingOp]   = useState(false);
  const [removingOp, setRemovingOp] = useState("");

  // Status toggle
  const [savingStatus, setSavingStatus] = useState(false);

  async function loadCenter() {
    const response = await fetch(`/api/center/centers/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setError(data.message); return; }
    setCenter(data.center);
  }

  useEffect(() => { loadCenter(); }, [id]);

  async function addWarehouse(e) {
    e.preventDefault();
    setSavingWH(true); setMessage({ text: "", err: false });
    try {
      const response = await fetch("/api/center/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...warehouseForm, centerId: id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage({ text: `Warehouse "${data.warehouse.name}" added.`, err: false });
      setWarehouseForm({ name: "", totalCapacity: "" });
      setShowWH(false);
      loadCenter();
    } catch (err) { setMessage({ text: err.message, err: true }); }
    finally { setSavingWH(false); }
  }

  async function assignOperator(e) {
    e.preventDefault();
    setSavingOp(true); setMessage({ text: "", err: false });
    try {
      const response = await fetch(`/api/center/centers/${id}/operators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: opUserId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage({ text: `Operator "${data.operator.name}" assigned.`, err: false });
      setOpUserId(""); setShowOp(false);
      loadCenter();
    } catch (err) { setMessage({ text: err.message, err: true }); }
    finally { setSavingOp(false); }
  }

  async function removeOperator(userId, name) {
    if (!window.confirm(`Remove ${name} as operator?`)) return;
    setRemovingOp(userId); setMessage({ text: "", err: false });
    try {
      const response = await fetch(`/api/center/centers/${id}/operators`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage({ text: "Operator removed.", err: false });
      loadCenter();
    } catch (err) { setMessage({ text: err.message, err: true }); }
    finally { setRemovingOp(""); }
  }

  async function toggleStatus() {
    if (!center) return;
    const next = center.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!window.confirm(`Set center status to ${next}?`)) return;
    setSavingStatus(true);
    try {
      const response = await fetch(`/api/center/centers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setCenter((c) => ({ ...c, status: data.center.status }));
      setMessage({ text: `Status updated to ${next}.`, err: false });
    } catch (err) { setMessage({ text: err.message, err: true }); }
    finally { setSavingStatus(false); }
  }

  if (error) return (
    <>
      <LoggedInNavbar />
      <main className="grid min-h-screen place-items-center p-6">
        <div className="text-center">
          <p className="text-red-700 font-bold">{error}</p>
          <Link href="/admin/centers" className="mt-4 inline-flex items-center gap-2 font-bold text-green-700">
            <ArrowLeft size={16} /> Back to centers
          </Link>
        </div>
      </main>
    </>
  );

  if (!center) return (
    <>
      <LoggedInNavbar />
      <main className="grid min-h-screen place-items-center font-bold text-gray-500">
        Loading center…
      </main>
    </>
  );

  const usedCap  = parseFloat(center.usedCapacity);
  const totalCap = parseFloat(center.totalCapacity);

  return (
    <>
      <LoggedInNavbar />
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl">

          {/* Back link */}
          <Link href="/admin/centers" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900">
            <ArrowLeft size={15} /> All centers
          </Link>

          {/* Center header */}
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-green-100">
                <Building2 size={26} className="text-green-800" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black text-gray-900">{center.name}</h1>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">{center.code}</span>
                  <StatusBadge status={center.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><MapPin size={13} /> {center.address}</span>
                  <span className="flex items-center gap-1"><Phone size={13} /> {center.phone}</span>
                  {center.email && <span className="flex items-center gap-1"><Mail size={13} /> {center.email}</span>}
                </div>
                <div className="mt-2 text-sm text-gray-500">{center.district}, {center.state} – {center.pinCode}</div>
              </div>
            </div>
            <button
              onClick={toggleStatus}
              disabled={savingStatus}
              className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 ${
                center.status === "ACTIVE"
                  ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  : "bg-green-700 text-white hover:bg-green-800"
              }`}
            >
              {savingStatus ? "Saving…" : center.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
          </div>

          {/* Feedback */}
          {message.text && (
            <div className={`mt-4 rounded-xl p-3 text-sm font-bold ${
              message.err ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"
            }`}>
              {message.text}
            </div>
          )}

          {/* Storage capacity */}
          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-black text-gray-900">Storage capacity</h2>
            <div className="mt-3">
              <CapacityBar used={usedCap} total={totalCap} />
            </div>
            <div className="mt-3 flex flex-wrap gap-6 text-sm">
              <div><p className="text-xs font-bold uppercase text-gray-400">Total</p><p className="font-black text-gray-900">{totalCap} T</p></div>
              <div><p className="text-xs font-bold uppercase text-gray-400">Used</p><p className="font-black text-amber-700">{usedCap} T</p></div>
              <div><p className="text-xs font-bold uppercase text-gray-400">Available</p><p className="font-black text-green-700">{(totalCap - usedCap).toFixed(2)} T</p></div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">

            {/* Warehouses */}
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-black text-gray-900">
                  <Warehouse size={18} className="text-green-700" /> Warehouses ({center.warehouses.length})
                </h2>
                <button
                  onClick={() => setShowWH((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-bold text-white"
                >
                  {showWH ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add</>}
                </button>
              </div>

              {showWH && (
                <form onSubmit={addWarehouse} className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-gray-50 p-3">
                  <div className="flex-1 min-w-[150px]">
                    <label className="mb-1 block text-xs font-bold text-gray-500">Name *</label>
                    <input
                      required
                      value={warehouseForm.name}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                      placeholder="Warehouse A"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="w-28">
                    <label className="mb-1 block text-xs font-bold text-gray-500">Capacity (T) *</label>
                    <input
                      required type="number" min="1" step="0.01"
                      value={warehouseForm.totalCapacity}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, totalCapacity: e.target.value })}
                      placeholder="200"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit" disabled={savingWH}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {savingWH ? "Adding…" : "Add"}
                  </button>
                </form>
              )}

              <div className="mt-3 space-y-2">
                {center.warehouses.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No warehouses yet.</p>
                )}
                {center.warehouses.map((wh) => (
                  <div key={wh.id} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900 text-sm">{wh.name}</p>
                      <span className="text-xs text-gray-500">{parseFloat(wh.usedCapacity)}/{parseFloat(wh.totalCapacity)} T</span>
                    </div>
                    <div className="mt-2">
                      <CapacityBar used={parseFloat(wh.usedCapacity)} total={parseFloat(wh.totalCapacity)} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Operators */}
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-black text-gray-900">
                  <UserCog size={18} className="text-green-700" /> Operators ({center.operators.length})
                </h2>
                <button
                  onClick={() => setShowOp((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-bold text-white"
                >
                  {showOp ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Assign</>}
                </button>
              </div>

              {showOp && (
                <form onSubmit={assignOperator} className="mt-3 flex items-end gap-2 rounded-xl bg-gray-50 p-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-bold text-gray-500">User ID (CENTER role) *</label>
                    <input
                      required
                      value={opUserId}
                      onChange={(e) => setOpUserId(e.target.value)}
                      placeholder="Paste user ID"
                      className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <button
                    type="submit" disabled={savingOp}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {savingOp ? "Assigning…" : "Assign"}
                  </button>
                </form>
              )}

              <div className="mt-3 space-y-2">
                {center.operators.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No operators assigned yet.</p>
                )}
                {center.operators.map((op) => (
                  <div key={op.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{op.name}</p>
                      <p className="text-xs text-gray-500">{op.phone} {op.email ? `· ${op.email}` : ""}</p>
                      <p className="text-xs font-mono text-gray-300 mt-0.5">{op.id}</p>
                    </div>
                    <button
                      onClick={() => removeOperator(op.id, op.name)}
                      disabled={removingOp === op.id}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      title="Remove operator"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </div>
      </main>
    </>
  );
}
