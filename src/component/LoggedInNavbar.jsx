"use client";

import Link from "next/link";
import { BookOpenCheck, ChevronDown, LayoutDashboard, LogOut, Menu, Settings2, ShieldCheck, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

function NavMenu({ label, links, open, onToggle, menuRef, active }) {
  return <div ref={menuRef} className="relative"><button type="button" onClick={onToggle} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold ${links.some((link) => active(link.href)) ? "bg-green-100 text-green-800" : "text-gray-600 hover:bg-gray-100"}`} aria-expanded={open} aria-haspopup="menu"><Settings2 size={15} />{label}<ChevronDown size={15} className={open ? "rotate-180" : ""} /></button>{open && <div role="menu" className="absolute left-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">{links.map((link) => <Link key={link.href} href={link.href} onClick={onToggle} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold ${active(link.href) ? "bg-green-50 text-green-800" : "text-gray-700 hover:bg-gray-50"}`}><ShieldCheck size={16} />{link.label}</Link>)}</div>}</div>;
}

export function LoggedInNavbar({ user: initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileMenuRef = useRef(null);
  const adminMenuRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initialUser) return;
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => response.ok ? (await response.json()).user : null)
      .then((viewer) => { if (viewer) setUser(viewer); })
      .catch(() => {});
  }, [initialUser]);

  useEffect(() => {
    const closeMenus = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileOpen(false);
      if (!adminMenuRef.current?.contains(event.target)) setAdminOpen(false);
    };
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  async function logout() {
    setLoggingOut(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { router.replace("/login"); router.refresh(); }
  }

  if (!user) return null;
  const isSeller = user.role === "SELLER";
  const isFarmer = user.seller?.sellerType === "FARMER" && user.seller?.verificationStatus === "VERIFIED";
  const navLinks = user.role === "CENTER"
    ? [{ href: "/dashboard", label: "Dashboard" }, { href: "/center/dashboard", label: "Center dashboard" }, { href: "/center/market", label: "Buy from centers" }]
    : [{ href: "/dashboard", label: "Dashboard" }, user.role === "BUYER" ? { href: "/buyer/market", label: "Buy soybean" } : { href: "/centers", label: "Browse centers" }];
  const adminLinks = [
    { href: "/admin/centers", label: "Manage centers" },
    { href: "/admin/bookings", label: "Seller bookings" },
    { href: "/admin/buyer-orders", label: "Buyer orders" },
    { href: "/admin/verifications", label: "Seller verification requests" },
    { href: "/admin/buyer-verifications", label: "Buyer verification requests" },
    { href: "/admin/seasons", label: "Seasons" },
    { href: "/admin/season-registrations", label: "Crop declarations" },
  ];
  const profileLinks = [
    { href: "/profile", label: "My profile", icon: UserRound },
    ...(isFarmer ? [{ href: "/season-registration", label: "My crops", icon: LayoutDashboard }] : []),
    ...(isSeller ? [{ href: "/bookings", label: "My bookings", icon: BookOpenCheck }] : []),
    ...(isSeller ? [{ href: "/seller/payment-history", label: "Settlement history", icon: BookOpenCheck }] : []),
    ...(user.role === "BUYER" ? [{ href: "/buyer/orders", label: "My orders", icon: BookOpenCheck }] : []),
    ...(user.role === "BUYER" ? [{ href: "/buyer/payment-history", label: "Payment history", icon: BookOpenCheck }] : []),
    ...(user.role === "CENTER" ? [{ href: "/center/trades", label: "Trade history", icon: BookOpenCheck }] : []),
  ];
  const active = (href) => pathname === href;

  return <header className="sticky top-0 z-50 border-b border-green-100 bg-white/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-7"><Link href="/" className="shrink-0 text-xl font-black text-gray-900">Krishi<span className="text-green-700">Setu</span></Link><nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex">{navLinks.map((link) => <Link key={link.href} href={link.href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${active(link.href) ? "bg-green-100 text-green-800" : "text-gray-600 hover:bg-gray-100"}`}>{link.label}</Link>)}{user.role === "ADMIN" && <NavMenu label="Admin tools" links={adminLinks} open={adminOpen} onToggle={() => setAdminOpen((value) => !value)} menuRef={adminMenuRef} active={active} />}</nav>
    <div ref={profileMenuRef} className="relative ml-auto hidden md:block"><button type="button" onClick={() => setProfileOpen((value) => !value)} className="flex items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-green-50" aria-expanded={profileOpen} aria-haspopup="menu"><span className="grid h-9 w-9 place-items-center rounded-full bg-green-700 text-xs font-black text-white">{initials(user.name)}</span><span className="hidden text-left leading-tight lg:block"><span className="block text-sm font-bold text-gray-900">{user.name}</span><span className="block text-xs text-gray-500">{user.role}</span></span><ChevronDown size={16} className={`text-gray-500 transition-transform ${profileOpen ? "rotate-180" : ""}`} /></button>{profileOpen && <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"><div className="border-b border-gray-100 px-4 py-3"><p className="truncate text-sm font-black text-gray-900">{user.name}</p><p className="text-xs text-gray-500">{user.role}</p></div>{profileLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setProfileOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold ${active(href) ? "bg-green-50 text-green-800" : "text-gray-700 hover:bg-gray-50"}`}><Icon size={17} />{label}</Link>)}<button type="button" onClick={logout} disabled={loggingOut} className="mt-1 flex w-full items-center gap-3 border-t border-gray-100 px-4 py-2.5 text-left text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"><LogOut size={17} />{loggingOut ? "Logging out…" : "Logout"}</button></div>}</div>
    <button type="button" onClick={() => setMobileOpen((value) => !value)} className="ml-auto rounded-lg p-2 text-gray-700 md:hidden" aria-label="Toggle navigation">{mobileOpen ? <X /> : <Menu />}</button></div>
    {mobileOpen && <div className="border-t border-gray-100 bg-white px-5 py-3 md:hidden"><nav className="space-y-1">{navLinks.map((link) => <Link key={link.href} onClick={() => setMobileOpen(false)} href={link.href} className={`block rounded-lg px-3 py-2 font-bold ${active(link.href) ? "bg-green-100 text-green-800" : "text-gray-700"}`}>{link.label}</Link>)}{user.role === "ADMIN" && <details className="rounded-lg border border-gray-100 px-3 py-2"><summary className="cursor-pointer font-bold text-gray-700">Admin tools</summary><div className="mt-2 space-y-1 border-t pt-2">{adminLinks.map((link) => <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={`block rounded-lg px-2 py-2 text-sm font-bold ${active(link.href) ? "bg-green-100 text-green-800" : "text-gray-700"}`}>{link.label}</Link>)}</div></details>}<div className="mt-3 border-t border-gray-100 pt-3"><div className="mb-2 flex items-center gap-3 px-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-green-700 text-xs font-black text-white">{initials(user.name)}</span><div><p className="text-sm font-bold">{user.name}</p><p className="text-xs text-gray-500">{user.role}</p></div></div>{profileLinks.map(({ href, label, icon: Icon }) => <Link key={href} onClick={() => setMobileOpen(false)} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2 font-bold ${active(href) ? "bg-green-100 text-green-800" : "text-gray-700"}`}><Icon size={17} />{label}</Link>)}<button type="button" onClick={logout} disabled={loggingOut} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"><LogOut size={17} />{loggingOut ? "Logging out…" : "Logout"}</button></div></nav></div>}</header>;
}
