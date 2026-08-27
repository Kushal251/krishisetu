"use client";

import Link from "next/link";
import { LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

export function LoggedInNavbar({ user: initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initialUser) return;
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return data.user;
      })
      .then((viewer) => { if (viewer) setUser(viewer); })
      .catch(() => {});
  }, [initialUser]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  if (!user) return null;
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    ...(user.seller?.sellerType === "FARMER" && user.seller?.verificationStatus === "VERIFIED" ? [{ href: "/season-registration", label: "My crops" }] : []),
    { href: "/profile", label: "My profile" },
    ...(user.role === "ADMIN" ? [{ href: "/admin/verifications", label: "Verification requests", admin: true }, { href: "/admin/seasons", label: "Seasons", admin: true }, { href: "/admin/season-registrations", label: "Crop declarations", admin: true }] : []),
  ];
  const active = (href) => pathname === href;

  return <header className="sticky top-0 z-50 border-b border-green-100 bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-6xl items-center gap-5 px-5 sm:px-7">
      <Link href="/" className="text-xl font-black text-gray-900">Krishi<span className="text-green-700">Setu</span></Link>
      <nav className="hidden flex-1 items-center gap-1 md:flex">{links.map((link) => <Link key={link.href} href={link.href} className={`rounded-lg px-3 py-2 text-sm font-bold ${active(link.href) ? "bg-green-100 text-green-800" : "text-gray-600 hover:bg-gray-100"}`}>{link.admin && <ShieldCheck className="mr-1 inline" size={15} />}{link.label}</Link>)}</nav>
      <div className="ml-auto hidden items-center gap-3 md:flex"><div className="grid h-9 w-9 place-items-center rounded-full bg-green-700 text-xs font-black text-white">{initials(user.name)}</div><div className="leading-tight"><p className="text-sm font-bold text-gray-900">{user.name}</p><p className="text-xs text-gray-500">{user.role}</p></div><button type="button" onClick={logout} disabled={loggingOut} className="ml-2 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"><LogOut size={16} />{loggingOut ? "Leaving…" : "Logout"}</button></div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="ml-auto rounded-lg p-2 text-gray-700 md:hidden" aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button>
    </div>
    {open && <div className="border-t border-gray-100 bg-white px-5 py-3 md:hidden"><nav className="space-y-1">{links.map((link) => <Link key={link.href} onClick={() => setOpen(false)} href={link.href} className={`block rounded-lg px-3 py-2 font-bold ${active(link.href) ? "bg-green-100 text-green-800" : "text-gray-700"}`}>{link.label}</Link>)}<div className="mt-3 flex items-center gap-3 border-t pt-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-green-700 text-xs font-black text-white">{initials(user.name)}</div><div className="flex-1"><p className="text-sm font-bold">{user.name}</p><p className="text-xs text-gray-500">{user.role}</p></div><button type="button" onClick={logout} disabled={loggingOut} className="inline-flex items-center gap-1 text-sm font-bold text-red-700"><LogOut size={16} />Logout</button></div></nav></div>}
  </header>;
}
