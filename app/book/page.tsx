"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DOCTORS,
  SLOTS_BY_DOCTOR,
  SPECIALTIES,
  fmtDate,
  setActiveAppointment,
  type Appointment,
  type Doctor,
} from "@/lib/clinic";
import { addAppointment, fetchAppointments } from "@/lib/db";

export default function BookPage() {
  const [specialty, setSpecialty] = useState<string>("All");
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [pending, setPending] = useState<Appointment | null>(null);
  const [err, setErr] = useState("");

  const [days, setDays] = useState<{ iso: string; label: string; offset: number }[]>([]);

  useEffect(() => {
    const out: { iso: string; label: string; offset: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push({
        iso: d.toISOString().slice(0, 10),
        label: i === 0 ? "Today" : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
        offset: i,
      });
    }
    setDays(out);
    fetchAppointments().then((list) => {
      const mine = list.filter((a) => a.mine && a.status === "Booked");
      if (mine.length) setPending(mine[mine.length - 1]);
    });
  }, []);

  const filtered = useMemo(
    () =>
      specialty === "All"
        ? DOCTORS
        : DOCTORS.filter((d) => d.specialty === specialty),
    [specialty]
  );

  async function confirmBooking() {
    if (!selected || !slot) return;
    if (!name.trim()) {
      setErr("Please enter the patient name.");
      return;
    }
    const appt: Appointment = {
      id: "a-" + Date.now().toString(36),
      patientName: name.trim(),
      doctorId: selected.id,
      doctorName: selected.name,
      specialty: selected.specialty,
      date: days.find((d) => d.offset === dayOffset)!.iso,
      time: slot,
      status: "Booked",
      mine: true,
    };
    await addAppointment(appt);
    setActiveAppointment(appt.id);
    setBooked(appt);
    setErr("");
  }

  if (booked) {
    return (
      <section className="section">
        <div className="container-clinic" style={{ maxWidth: 720 }}>
          <div className="card-canvas" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 44 }}>✅</div>
            <h1 className="display-md" style={{ margin: "12px 0 10px" }}>
              Appointment confirmed
            </h1>
            <p className="body-md text-muted2" style={{ marginBottom: 8 }}>
              {booked.patientName} · {booked.doctorName} ({booked.specialty})
            </p>
            <p className="body-sm text-muted2" style={{ marginBottom: 28 }}>
              {fmtDate(booked.date)} at {booked.time}
            </p>

            <div
              style={{
                background: "var(--surface-card)",
                borderRadius: "var(--r-lg)",
                padding: 24,
                textAlign: "left",
                marginBottom: 28,
              }}
            >
              <div className="title-sm" style={{ marginBottom: 8 }}>
                Next: mandatory AI Pre-Checkup
              </div>
              <p className="body-sm text-muted2" style={{ margin: 0 }}>
                Before the doctor can see you, our AI Pre-Checkup Nurse records
                your vitals and symptom summary. The consultation unlocks once
                your report is complete.
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href={`/pre-checkup?appt=${booked.id}`} className="btn-teal">
                Start Mandatory AI Pre-Checkup →
              </Link>
              <Link href="/dashboard" className="btn-outline">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container-clinic">
        <div style={{ maxWidth: 640, marginBottom: 24 }}>
          <span className="badge-pill badge-blue badge-up">Step 1 of 3</span>
          <h1 className="display-lg" style={{ margin: "14px 0 10px" }}>
            Book an online slot
          </h1>
          <p className="body-md text-muted2" style={{ margin: 0 }}>
            Filter by specialty, choose your doctor, then pick a date and time.
          </p>
        </div>

        {pending && (
          <div
            className="card-cream"
            style={{ marginBottom: 28, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}
          >
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="title-sm">You have an upcoming appointment</div>
              <p className="body-sm text-muted2" style={{ margin: "6px 0 0" }}>
                {pending.patientName} · {pending.doctorName} · {fmtDate(pending.date)} at {pending.time}
              </p>
            </div>
            <Link href={`/pre-checkup?appt=${pending.id}`} className="btn-teal btn-sm">
              Continue AI Pre-Checkup →
            </Link>
          </div>
        )}

        {/* Specialty filter */}
        <div className="cat-tabs" style={{ marginBottom: 24 }}>
          {["All", ...SPECIALTIES].map((s) => (
            <button
              key={s}
              className={`cat-tab${specialty === s ? " active" : ""}`}
              onClick={() => {
                setSpecialty(s);
                setSelected(null);
                setSlot(null);
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Doctor cards */}
        <div className="doc-grid" style={{ marginBottom: 32 }}>
          {filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setSelected(d);
                setSlot(null);
              }}
              style={{ all: "unset", cursor: "pointer", display: "block" }}
            >
              <div className={`doc-card${selected?.id === d.id ? " selected" : ""}`} style={{ height: "100%" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div className={`doc-avatar t${d.tone}`}>
                    {d.name.split(" ").map((w) => w[1]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div className="title-sm">{d.name}</div>
                    <div className="caption text-teal">{d.specialty}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="stars">★ {d.rating}</span>
                  <span className="body-sm text-muted2">({d.reviews})</span>
                  <span className="badge-pill badge-ok">
                    <span className="dot-ok" /> {d.nextSlot}
                  </span>
                </div>
                <p className="body-sm text-muted2" style={{ margin: 0, flex: 1 }}>
                  {d.bio}
                </p>
                <div className="flex-between">
                  <span className="body-sm text-muted2">
                    {d.experience} yrs · ${d.fee}
                  </span>
                  <span className="caption" style={{ color: selected?.id === d.id ? "var(--teal-active)" : "var(--teal)" }}>
                    {selected?.id === d.id ? "Selected ✓" : "Select →"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Booking panel */}
        <div className={`card-canvas${selected ? "" : " "}`} style={{ opacity: selected ? 1 : 0.55, pointerEvents: selected ? "auto" : "none" }}>
          {selected && (
            <>
              <div className="flex-between" style={{ marginBottom: 20 }}>
                <div>
                  <div className="title-md">Booking with {selected.name}</div>
                  <div className="body-sm text-muted2">
                    {selected.specialty} · Consultation fee ${selected.fee}
                  </div>
                </div>
                <span className="badge-pill badge-teal">
                  <span className="dot-ok" /> Available
                </span>
              </div>

              <div className="grid-2" style={{ marginBottom: 20 }}>
                <div className="field">
                  <label>Patient name</label>
                  <input
                    className="input"
                    placeholder="e.g. Jordan Blake"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {err && <div className="range-note bad">{err}</div>}
                </div>
                <div className="field">
                  <label>Reason for visit (optional)</label>
                  <input className="input" placeholder="e.g. follow-up, fever, rash…" />
                </div>
              </div>

              <div className="field" style={{ marginBottom: 20 }}>
                <label>Date</label>
                <div className="cat-tabs">
                  {days.map((d) => (
                    <button
                      key={d.offset}
                      className={`cat-tab${dayOffset === d.offset ? " active" : ""}`}
                      onClick={() => {
                        setDayOffset(d.offset);
                        setSlot(null);
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field" style={{ marginBottom: 24 }}>
                <label>Time slot</label>
                <div className="slot-grid">
                  {(SLOTS_BY_DOCTOR[selected.id] ?? []).map((t) => (
                    <button
                      key={t}
                      className={`slot${slot === t ? " selected" : ""}`}
                      onClick={() => setSlot(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-between">
                <span className="body-sm text-muted2">
                  {selected && slot
                    ? `${fmtDate(days.find((d) => d.offset === dayOffset)!.iso)} at ${slot}`
                    : "Select a time slot to continue"}
                </span>
                <button className="btn-teal" disabled={!slot} onClick={confirmBooking}>
                  Confirm Appointment
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
