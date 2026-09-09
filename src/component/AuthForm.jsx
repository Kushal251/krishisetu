"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Phone,
  UserRound,
  CreditCard
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MPLocationFields } from "./MPLocationFields";
import { MP_STATE } from "../../lib/mpLocations";

const Field = ({
  label,
  children,
}) => (
  <label className="block space-y-2">
    <span className="text-sm font-semibold text-gray-700">{label}</span>
    {children}
  </label>
);

const InputIcon = ({
  icon,
  children,
}) => (
  <div className="relative">
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
      {icon}
    </div>
    {children}
  </div>
);

/* ---------------- LOGIN ---------------- */

export function LoginForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    const data = Object.fromEntries(new FormData(e.currentTarget));

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!r.ok) throw new Error((await r.json()).message);

      router.push("/dashboard");
    } catch (e) {
      setError(e.message || "Unable to sign in.");
    }
  }

  return (
    <div className="w-full max-w-md">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-green-700 mb-8"
      >
        <ArrowLeft size={16} />
        Back to home
      </Link>

      <p className="text-xs font-bold tracking-[0.2em] text-green-700">
        WELCOME BACK
      </p>

      <h1 className="text-4xl font-black mt-2">Good to see you.</h1>

      <p className="text-gray-500 mt-3 mb-8">
        Log in to access your farm profile and opportunities.
      </p>

      <form onSubmit={submit} className="space-y-5">
        <Field label="Mobile number">
          <InputIcon icon={<Phone size={18} />}>
            <input
              name="phone"
              required
              placeholder="10-digit mobile number"
              className="w-full rounded-xl border border-gray-300 pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-700"
            />
          </InputIcon>
        </Field>

        <Field label="Password">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <LockKeyhole size={18} />
            </div>

            <input
              name="password"
              required
              type={show ? "text" : "password"}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-gray-300 pl-11 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-green-700"
            />

            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-green-700"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button className="w-full rounded-xl bg-green-700 py-3 font-bold text-white hover:bg-green-800 flex items-center justify-center gap-2">
          Log in
          <ArrowRight size={18} />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        New to KisanSetu?{" "}
        <Link href="/register" className="font-semibold text-green-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}

/* ---------------- REGISTER ---------------- */





const SELLER_TYPES = [
  ["FARMER", "🌾", "Farmer", "Individual grower"],
  ["FPO", "🏢", "FPO", "Farmer collective"],
  ["TRADER", "🚚", "Trader", "Agricultural trader"],
  ["COOPERATIVE", "🤝", "Cooperative", "Member-owned society"],
];

const inputClass = "mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-100";

export function RegisterForm() {
  const [sellerType, setSellerType] = useState("FARMER");
  const [location, setLocation] = useState({ state: MP_STATE, division: "", district: "", village: "", pinCode: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, sellerType, role: "SELLER" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Registration failed.");
      setCreated(true);
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  if (created) return <div className="  max-w-3w  text-center">
    <h1 className="text-3xl font-black">Profile created</h1>
    <p className="mt-3 text-gray-600">Your seller profile is pending verification.</p>
    <Link href="/login" className="mt-6 inline-block rounded-xl bg-green-700 px-6 py-3 font-bold text-white">Go to login</Link></div>;

  return <div className="w-full max-w-2xl"><Link href="/" className="text-sm font-semibold text-green-700">← Back to home</Link><h1 className="mt-4 text-4xl font-black">Create seller profile</h1><p className="mt-2 text-gray-500">Choose your seller type and provide your profile details.</p>
    <form className="mt-8 space-y-6" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{SELLER_TYPES.map(([value, icon, title, description]) => <button key={value} type="button" onClick={() => setSellerType(value)} className={`rounded-xl border p-4 text-left ${sellerType === value ? "border-green-700 bg-green-50 ring-1 ring-green-700" : "border-gray-300"}`}><div className="text-xl">{icon}</div><div className="mt-1 font-bold">{title}</div><div className="text-xs text-gray-500">{description}</div></button>)}</div>
      <section className="grid gap-4 sm:grid-cols-2"><Field label="Full name"><input name="name" required className={inputClass} /></Field>
        <Field label="Mobile number">
          <input name="phone" required inputMode="numeric" pattern="[0-9]{10}" maxLength="10" className={inputClass} />
        </Field>
        <Field label="Email address (optional)">
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </Field>
        <Field label="Aadhaar number">
          <input name="aadhaarNumber" required inputMode="numeric" pattern="[0-9]{12}" maxLength="12" className={inputClass} /></Field><Field label="Password (minimum 8 characters)">
            <input name="password" required type="password" minLength="8" className={inputClass} /></Field></section>
      <section className="grid gap-4 sm:grid-cols-2"><MPLocationFields value={location} onChange={setLocation} /><Field label="Full address">
          <input name="address" required className={inputClass} /></Field><Field label="Bank account number">
          <input name="bankAccount" required className={inputClass} /></Field><Field label="IFSC code"><input name="ifscCode" required className={inputClass} /></Field></section>
      {sellerType === "FARMER" && <section className="grid gap-4 rounded-xl bg-green-50 p-4 sm:grid-cols-2"><Field label="Land area"><input name="landArea" required type="number" min="0.01" step="0.01" className={inputClass} /></Field><Field label="Land unit"><select name="landUnit" required defaultValue="Acre" className={inputClass}><option>Acre</option><option>Hectare</option></select></Field><Field label="Khasra number (optional)"><input name="khasraNumber" className={inputClass} /></Field><Field label="PM-Kisan ID (optional)"><input name="pmKisanId" className={inputClass} /></Field><Field label="KCC number (optional)"><input name="kccNumber" className={inputClass} /></Field></section>}
      {sellerType === "FPO" && <section className="grid gap-4 rounded-xl bg-green-50 p-4 sm:grid-cols-2"><Field label="Organisation name"><input name="organizationName" required className={inputClass} /></Field><Field label="Registration number"><input name="registrationNo" required className={inputClass} /></Field><Field label="Member count"><input name="memberCount" required type="number" min="1" step="1" className={inputClass} /></Field></section>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-green-700 py-3 font-bold text-white disabled:opacity-50">{loading ? "Creating profile…" : "Create profile"}</button>
    </form>
  </div>;
}

/* ---------------- FORGOT PASSWORD ---------------- */

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    const data = Object.fromEntries(new FormData(e.currentTarget));

    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!r.ok) throw new Error((await r.json()).message);

      setSent(true);
    } catch (e) {
      setError(e.message);
    }
  }

  if (sent)
    return (
      <div className="max-w-md text-center">
        <CheckCircle2 className="mx-auto text-green-700" size={54} />
        <h2 className="text-3xl font-black mt-4">You&apos;re good to go.</h2>
        <p className="text-gray-500 mt-3 mb-8">
          Your password has been updated successfully.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-green-700 text-white px-6 py-3 rounded-xl font-bold"
        >
          Go to login
          <ArrowRight size={18} />
        </Link>
      </div>
    );

  return (
    <div className="w-full max-w-md">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-gray-500 mb-8"
      >
        <ArrowLeft size={16} />
        Back to login
      </Link>

      <p className="text-xs tracking-[0.2em] font-bold text-green-700">
        ACCOUNT RECOVERY
      </p>

      <h1 className="text-4xl font-black mt-2">Reset your password.</h1>

      <form onSubmit={submit} className="space-y-5 mt-8">
        {["phone", "aadhaarNumber", "otp"].map((name) => (
          <Field
            key={name}
            label={name.replace(/([A-Z])/g, " $1")}
          >
            <input
              name={name}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </Field>
        ))}

        <Field label="New password">
          <input
            name="newPassword"
            type="password"
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
          />
        </Field>

        <Field label="Confirm password">
          <input
            name="confirmPassword"
            type="password"
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
          />
        </Field>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button className="w-full rounded-xl bg-green-700 py-3 text-white font-bold flex justify-center items-center gap-2">
          Update password
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}
