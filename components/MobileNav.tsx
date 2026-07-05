"use client";

import { useState } from "react";
import Link from "next/link";

// Small client island so SiteHeader (and the pages using it) stay server
// components. Hamburger on small screens; links close the menu on tap.
export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-navy"
      >
        <span aria-hidden className="text-xl leading-none">
          {open ? "✕" : "☰"}
        </span>
      </button>
      {open && (
        <nav className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-line bg-white p-2 shadow-lg">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 font-semibold text-navy hover:bg-mint"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
