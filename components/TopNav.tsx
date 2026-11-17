"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getRole, setRole } from "@/lib/clinic";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/book", label: "Book Appointment" },
  { href: "/pre-checkup", label: "AI Pre-Checkup Nurse" },
  { href: "/consultation", label: "Virtual Doctor Room" },
  { href: "/portal", label: "Patient Portal" },
];

export default function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [role, setRoleState] = useState<"patient" | "doctor">("patient");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setRoleState(getRole());
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function toggleRole() {
    const next = role === "patient" ? "doctor" : "patient";
    setRole(next);
    setRoleState(next);
  }

  return (
    <header className="topnav">
      <div className="container-clinic topnav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">+</span>
          Vitalis
        </Link>

        <nav className={`topnav-links${open ? " open" : ""}`}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link${
                pathname === l.href ? " active" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/dashboard" className="nav-link">
            Dashboard
          </Link>
        </nav>

        <div className="role-toggle" title="Switch between patient and doctor views">
          <span
            className={`role-label${mounted && role === "patient" ? " on" : ""}`}
            onClick={() => mounted && role !== "patient" && toggleRole()}
          >
            Patient
          </span>
          <button
            aria-label="Toggle patient / doctor view"
            className={`role-switch${mounted && role === "doctor" ? " doctor" : ""}`}
            onClick={toggleRole}
          />
          <span
            className={`role-label${mounted && role === "doctor" ? " on" : ""}`}
            onClick={() => mounted && role !== "doctor" && toggleRole()}
          >
            Doctor
          </span>
        </div>

        <button
          className="nav-toggle"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          ☰
        </button>
      </div>
    </header>
  );
}
