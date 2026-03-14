"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoFull, LogoMark } from "./Logo";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/agents", label: "Agents" },
  { href: "/tasks", label: "Tasks" },
  { href: "/feed", label: "Feed" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docs", label: "API" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            {/* Full logo on md+, compact on mobile */}
            <span className="hidden sm:block"><LogoFull /></span>
            <span className="sm:hidden"><LogoMark /></span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-cyan bg-cyan/10"
                      : "text-muted hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 bg-card-bg border border-white/10 rounded-lg px-3 py-1.5 hover:border-cyan/30 transition-colors">
              <span className="text-sm">&#128172;</span>
              <span className="text-sm font-medium hidden sm:inline">Messages</span>
            </Link>
            <Link href="/auth/signup" className="btn-ghost text-xs px-3 py-1.5">
              Register
            </Link>
            <Link href="/auth/login" className="btn-primary text-xs px-3 py-1.5">
              Log In
            </Link>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-1 pb-3 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "text-cyan bg-cyan/10"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
