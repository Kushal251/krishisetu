"use client";

import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    Check,
    ChevronRight,
    CircleDollarSign,
    Leaf,
    Menu,
    ShieldCheck,
    Sprout,
    Star,
    X,
} from "lucide-react";
import { useState } from "react";

const benefits = [
    {
        title: "Live mandi prices",
        text: "Know the right price before you sell",
        icon: BarChart3,
    },
    {
        title: "Trusted buyers",
        text: "Connect with verified businesses",
        icon: ShieldCheck,
    },
    {
        title: "Smarter finance",
        text: "Loans and schemes, made simple",
        icon: CircleDollarSign,
    },
];

const cards = [
    {
        title: "Fresh produce",
        text: "Sell directly to reliable buyers",
        image:
            "https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&w=900&q=80",
    },
    {
        title: "Equipment & tools",
        text: "Discover fair deals for every farm",
        image:
            "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=900&q=80",
    },
    {
        title: "Subsidies & schemes",
        text: "Find support you are eligible for",
        image:
            "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=900&q=80",
    },
];

export default function Home() {
    const [open, setOpen] = useState(false);

    return (
        <main className="bg-[#F6F5ED] text-[#17362A]">
            {/* Announcement */}
            <div className="h-10 bg-lime-300 flex items-center justify-center gap-2 text-xs font-bold">
                <Sprout size={15} />
                <span>PM Kisan support is just a few steps away</span>
                <a href="#opportunities" className="hidden md:flex items-center underline">
                    Explore schemes <ArrowRight size={14} />
                </a>
            </div>

            {/* Navbar */}
            <header className="sticky top-0 z-50 bg-[#FBFAF5]/90 backdrop-blur border-b border-gray-200">
                <div className="max-w-7xl mx-auto h-20 px-6 lg:px-12 flex items-center">
                    <Link href="/" className="flex items-center gap-2  text-2xl font-extrabold">
                        <div className="w-9 h-9 rounded-xl bg-green-700 text-lime-300 flex items-center justify-center">
                            <Leaf size={18} />
                        </div>
                        <div>
                            Krishi<span className="text-green-700">Setu</span>
                        </div>

                    </Link>

                    <nav className="hidden md:flex mx-auto gap-8 text-sm font-semibold text-gray-700">
                        <a href="#opportunities">Explore</a>
                        <a href="#how">How it works</a>
                        <a href="#stories">Stories</a>
                    </nav>

                    <div className="hidden md:flex items-center gap-3 text-sm font-bold">
                        <Link href="/login" className="text-gray-700 hover:text-green-700">Seller login</Link>
                        <Link href="/register" className="rounded-lg border border-green-700 px-3 py-2 text-green-800 hover:bg-green-50">Seller signup</Link>
                        <Link href="/buyer/login" className="text-gray-700 hover:text-green-700">Buyer login</Link>
                        <Link href="/buyer/register" className="bg-green-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-green-800 transition">Buyer signup <ArrowRight size={16} /></Link>
                    </div>

                    <button className="ml-auto md:hidden" onClick={() => setOpen(!open)}>
                        {open ? <X /> : <Menu />}
                    </button>
                </div>

                {open && (
                    <div className="md:hidden border-t bg-white px-6 py-4 space-y-4 font-semibold">
                        <a href="#opportunities" className="block">
                            Explore
                        </a>
                        <Link href="/login" className="block">Seller login</Link>
                        <Link href="/register" className="block text-green-700">Seller signup</Link>
                        <Link href="/buyer/login" className="block">Buyer login</Link>
                        <Link href="/buyer/register" className="block text-green-700">Buyer signup</Link>
                    </div>
                )}
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden bg-green-950 text-white">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-40"
                    style={{
                        backgroundImage:
                            "url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1900&q=80)",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-green-950 via-green-950/80 to-green-900/30" />

                <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-15 grid lg:grid-cols-2 gap-10 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-lime-300/30 bg-lime-300/10 text-lime-300 text-xs font-bold tracking-wider">
                            <Star size={13} fill="currentColor" />
                            Built for India&apos;s growers
                        </div>

                        <h1 className="mt-6 text-5xl lg:text-7xl font-black leading-none tracking-tight">
                            Grow with more
                            <br />
                            <span className="font-serif italic text-lime-300">confidence.</span>
                        </h1>

                        <p className="mt-6 text-lg text-gray-200 max-w-xl leading-8">
                            A simpler way to discover fair prices, trusted buyers and the support your farm deserves.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <Link
                                href="/register"
                                className="bg-green-700 hover:bg-green-800 px-6 py-3 rounded-lg font-bold flex items-center gap-2"
                            >
                                Start selling
                                <ArrowRight size={18} />
                            </Link>

                            <a href="#how" className="flex items-center gap-3 font-semibold">
                                <span className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center text-xs">
                                    ▶
                                </span>
                                See how it works
                            </a>
                        </div>

                        <div className="mt-12 flex gap-8">
                            <div>
                                <p className="text-2xl font-bold">50k+</p>
                                <p className="text-xs text-gray-300">farmers connected</p>
                            </div>

                            <div>
                                <p className="text-2xl font-bold">₹320 Cr</p>
                                <p className="text-xs text-gray-300">value unlocked</p>
                            </div>

                            <div>
                                <p className="text-2xl font-bold">22 states</p>
                                <p className="text-xs text-gray-300">and growing</p>
                            </div>
                        </div>
                    </div>

                    {/* Price Card */}
                    <div className="hidden lg:flex justify-end">
                        <div className="w-72 bg-white rounded-2xl p-5 text-[#17362A] shadow-2xl rotate-2">
                            <div className="flex justify-between text-xs font-semibold text-gray-500">
                                <span>Today&apos;s Mandi Pulse</span>
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">Live</span>
                            </div>

                            <h3 className="mt-4 text-lg font-bold">
                                Tomato <span className="text-xs text-gray-500 font-normal">Grade A</span>
                            </h3>

                            <div className="mt-2 text-3xl font-extrabold">
                                ₹2,840
                                <span className="text-sm text-gray-500 font-normal"> /qtl</span>
                            </div>

                            <p className="text-green-600 text-sm font-semibold mt-1">↗ 8.4% from yesterday</p>

                            <div className="flex items-end gap-1 h-20 mt-4 border-b pb-2">
                                {[20, 30, 28, 40, 38, 55, 62].map((h, i) => (
                                    <div
                                        key={i}
                                        style={{ height: `${h}px` }}
                                        className={`flex-1 rounded-t ${i === 6 ? "bg-lime-300" : i === 5 ? "bg-green-700" : "bg-green-200"
                                            }`}
                                    />
                                ))}
                            </div>

                            <div className="flex justify-between mt-3 text-xs">
                                <span>Azadpur Mandi</span>
                                <span className="text-gray-500">8 min ago</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 text-center">
                <p className="text-green-700 text-xs font-bold tracking-[0.2em]">EVERYTHING IN ONE PLACE</p>

                <h2 className="mt-4 text-4xl lg:text-5xl font-black leading-tight">
                    A better season begins
                    <br />
                    with better decisions.
                </h2>

                <div className="grid md:grid-cols-3 gap-6 mt-14">
                    {benefits.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.title} className="bg-white rounded-2xl p-7 border border-gray-200 text-left">
                                <div className="w-12 h-12 rounded-xl bg-lime-100 text-green-700 flex items-center justify-center">
                                    <Icon size={24} />
                                </div>

                                <h3 className="mt-6 text-xl font-bold">{item.title}</h3>

                                <p className="mt-2 text-gray-600">{item.text}</p>

                                <a href="#opportunities" className="mt-5 inline-flex items-center text-green-700 font-semibold text-sm">
                                    Learn more
                                    <ChevronRight size={16} />
                                </a>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Opportunities */}
            <section id="opportunities" className="bg-green-50 py-24">
                <div className="max-w-7xl mx-auto px-6 lg:px-12">
                    <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
                        <div>
                            <p className="text-green-700 text-xs font-bold tracking-[0.2em]">MADE FOR YOUR FARM</p>
                            <h2 className="mt-3 text-4xl lg:text-5xl font-black">
                                Find your next
                                <br />
                                opportunity.
                            </h2>
                        </div>

                        <a
                            href="#"
                            className="hidden md:flex border border-green-700 text-green-700 px-4 py-3 rounded-lg font-semibold items-center gap-2"
                        >
                            View all services
                            <ArrowRight size={16} />
                        </a>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mt-12">
                        {cards.map((card) => (
                            <article key={card.title} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                                <div
                                    className="h-56 bg-cover bg-center flex justify-end items-end p-4"
                                    style={{ backgroundImage: `url(${card.image})` }}
                                >
                                    <span className="bg-white rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1">
                                        Explore
                                        <ArrowRight size={14} />
                                    </span>
                                </div>

                                <div className="p-5">
                                    <h3 className="text-xl font-bold">{card.title}</h3>
                                    <p className="mt-2 text-gray-600">{card.text}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* How */}
            <section id="how" className="bg-green-700 text-white py-24">
                <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <p className="text-lime-300 text-xs font-bold tracking-[0.2em]">SIMPLE BY DESIGN</p>

                        <h2 className="mt-4 text-4xl lg:text-5xl font-black">
                            Less running around.
                            <br />
                            More moving forward.
                        </h2>

                        <p className="mt-6 text-green-100 leading-8">
                            Whether you&apos;re selling a harvest or looking for farm support, KisanSetu brings the right people and information together.
                        </p>

                        <Link
                            href="/register"
                            className="mt-8 inline-flex bg-lime-300 text-[#17362A] px-6 py-3 rounded-lg font-bold items-center gap-2"
                        >
                            Create your profile
                            <ArrowRight size={18} />
                        </Link>
                    </div>

                    <div className="divide-y divide-white/20 border-t border-white/20">
                        {[
                            "Tell us about your farm",
                            "Get matched to what matters",
                            "Make confident decisions",
                        ].map((step, i) => (
                            <div key={step} className="py-8 flex items-center gap-5">
                                <span className="text-lime-300 font-bold text-sm">{`0${i + 1}`}</span>

                                <h3 className="flex-1 text-2xl font-semibold">{step}</h3>

                                <Check className="text-lime-300" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonial */}
            <section id="stories" className="py-24 bg-[#FBFAF5]">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <div className="text-7xl text-lime-300 font-serif">“</div>

                    <blockquote className="mt-4 text-3xl font-serif italic leading-relaxed text-[#264735]">
                        For the first time, I knew the mandi price before my crop left the village. That changed everything.
                    </blockquote>

                    <div className="mt-8 flex items-center justify-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-amber-400 flex items-center justify-center font-bold">
                            RK
                        </div>

                        <div className="text-left">
                            <p className="font-bold">Ramesh Kumar</p>
                            <p className="text-sm text-gray-500">Vegetable farmer, Nashik</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#153427] text-white py-10">
                <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center gap-6">
                    <Link href="/" className="flex items-center gap-2 text-xl font-bold">
                        <div className="w-8 h-8 rounded-lg bg-green-700 text-lime-300 flex items-center justify-center">
                            <Leaf size={16} />
                        </div>
                        Kisan<span className="text-lime-300">Setu</span>
                    </Link>

                    <p className="text-sm text-green-100 flex-1 text-center md:text-left">
                        Helping Indian agriculture move forward, together.
                    </p>

                    <div className="flex gap-5 text-sm text-green-100">
                        <a href="#">Privacy</a>
                        <a href="#">Terms</a>
                        <a href="#">Contact</a>
                    </div>
                </div>
            </footer>
        </main>
    );
}
