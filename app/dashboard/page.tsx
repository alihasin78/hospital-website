"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fmtDate,
  getRole,
  setRole,
  urgencyRank,
  type Appointment,
  type Prescription,
} from "@/lib/clinic";
import { fetchAppointments, fetchPrescriptions } from "@/lib/db";

function urgencyClass(u?: string) {
  return u === "Urgent" ? "u-urgent" : u === "Moderate" ? "u-moderate" : "u-routine";
}

function badgeFor(a: Appointment) {
  if (a.status === "Booked")
    return <span className="status-badge badge-warn" style={{ background: "#f8eeda", color: "#96660a" }}>● Pending Pre-Checkup</span>;
  if (a.status === "Ready for Doctor")
    return <span className="status-badge badge-ok" style={{ background: "#e3f2e9", color: "#226b45" }}>● Ready for Doctor</span>;
  if (a.status === "In Consultation")
    return <span className="status-badge badge-teal" style={{ background: "var(--teal-soft)", color: "var(--teal-active)" }}>● In Consultation</span>;
  return <span className="status-badge" style={{ background: "var(--surface-card)", color: "var(--muted)" }}>● Completed</span>;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [role, setRoleState] = useState<"patient" | "doctor">("patient");
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [rxs, setRxs] = useState<Prescription[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setRoleState(getRole());
    fetchAppointments().then(setAppts);
    fetchPrescriptions().then(setRxs);
  }, []);

  function switchRole() {
    const next = role === "patient" ? "doctor" : "patient";
    setRole(next);
    setRoleState(next);
  }

  function downloadRx(rxId: string) {
    const rx = rxs.find((r) => r.id === rxId);
    if (!rx) return;
    const lines = [
      "VITALIS VIRTUAL CLINIC — E-PRESCRIPTION",
      "=======================================",
      `Prescription #: ${rx.id}`,
      `Date: ${rx.date}`,
      `Patient: ${rx.patientName}`,
      `Doctor: ${rx.doctorName}`,
      `Diagnosis: ${rx.diagnosis}`,
      "",
      "Medications:",
      ...rx.meds.map((m, i) => `  ${i + 1}. ${m.name} — ${m.dosage}, ${m.frequency}, for ${m.duration}`),
      "",
      `Advice: ${rx.advice}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vitalis-rx-${rx.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!mounted) return null;

  const upcoming = appts
    .filter((a) => a.status !== "Completed")
    .sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));
  const completed = appts.filter((a) => a.status === "Completed");

  return (
    <section className="section">
      <div className="container-clinic">
        <div className="flex-between" style={{ marginBottom: 28 }}>
          <div>
            <span className="badge-pill badge-blue badge-up">{role === "doctor" ? "Doctor View" : "Patient View"}</span>
            <h1 className="display-lg" style={{ margin: "12px 0 6px" }}>
              {role === "doctor" ? "Doctor Dashboard" : "Patient Dashboard"}
            </h1>
            <p className="body-md text-muted2" style={{ margin: 0 }}>
              {role === "doctor"
                ? "Patient queue sorted by AI triage urgency. Review the nurse report, then join the room."
                : "Your appointments, pre-checkup status, and prescriptions in one place."}
            </p>
          </div>
          <button className="btn-outline" onClick={switchRole}>
            Switch to {role === "doctor" ? "Patient" : "Doctor"} View
          </button>
        </div>

        {role === "patient" ? (
          <>
            <div className="title-md" style={{ marginBottom: 14 }}>Upcoming appointments</div>
            {upcoming.length === 0 && (
              <div className="card-canvas" style={{ textAlign: "center", padding: 40 }}>
                <p className="body-md text-muted2" style={{ marginBottom: 16 }}>
                  No upcoming appointments.
                </p>
                <Link href="/book" className="btn-teal">Book an Appointment</Link>
              </div>
            )}
            {upcoming.map((a) => (
              <div className="appt-row" key={a.id}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="title-sm">{a.doctorName}</div>
                  <div className="body-sm text-muted2">
                    {a.specialty} · {fmtDate(a.date)} at {a.time}
                  </div>
                </div>
                {badgeFor(a)}
                {a.urgency && (
                  <span className={`badge-pill badge-up ${a.urgency === "Urgent" ? "badge-urgent" : a.urgency === "Moderate" ? "badge-warn" : "badge-ok"}`}>
                    Triage: {a.urgency}
                  </span>
                )}
                {a.status === "Booked" ? (
                  <Link href={`/pre-checkup?appt=${a.id}`} className="btn-teal btn-sm">
                    Start AI Pre-Checkup →
                  </Link>
                ) : (
                  <Link href={`/consultation?appt=${a.id}`} className="btn-teal btn-sm">
                    Enter Virtual Room →
                  </Link>
                )}
              </div>
            ))}

            <div className="title-md" style={{ margin: "36px 0 14px" }}>Past e-prescriptions</div>
            {completed.length === 0 && (
              <p className="body-sm text-muted2">
                Completed consultations and their prescriptions will appear here.
              </p>
            )}
            {completed.map((a) => {
              const rx = rxs.find((r) => r.appointmentId === a.id || r.id === a.prescriptionId);
              return (
                <div className="appt-row" key={a.id}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div className="title-sm">{a.doctorName}</div>
                    <div className="body-sm text-muted2">
                      {a.specialty} · {fmtDate(a.date)} · {a.patientName}
                    </div>
                  </div>
                  {badgeFor(a)}
                  {rx ? (
                    <button className="btn-outline btn-sm" onClick={() => downloadRx(rx.id)}>
                      ⬇ Download e-prescription
                    </button>
                  ) : (
                    <span className="body-sm text-muted2">No prescription issued</span>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div className="title-md" style={{ marginBottom: 14 }}>
              Triage queue <span className="text-muted2" style={{ fontWeight: 400 }}>(sorted by AI urgency)</span>
            </div>
            {upcoming.length === 0 && (
              <div className="card-canvas" style={{ textAlign: "center", padding: 40 }}>
                <p className="body-md text-muted2">The queue is empty.</p>
              </div>
            )}
            {upcoming.map((a) => (
              <div className="appt-row" key={a.id}>
                <div className={`urgency-strip ${urgencyClass(a.urgency)}`} />
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="title-sm">{a.patientName}</div>
                  <div className="body-sm text-muted2">
                    {a.doctorName} · {fmtDate(a.date)} at {a.time}
                  </div>
                </div>
                <span className={`badge-pill badge-up ${a.urgency === "Urgent" ? "badge-urgent" : a.urgency === "Moderate" ? "badge-warn" : a.urgency ? "badge-ok" : ""}`}>
                  {a.urgency ?? "Awaiting pre-checkup"}
                </span>
                {badgeFor(a)}
                <button
                  className="btn-outline btn-sm"
                  onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                >
                  {expanded === a.id ? "Hide AI Report" : "View AI Report"}
                </button>
                <Link
                  href={`/consultation?appt=${a.id}`}
                  className={`btn-teal btn-sm${a.status === "Booked" ? " disabled-link" : ""}`}
                  style={a.status === "Booked" ? { opacity: 0.5, pointerEvents: "none" } : undefined}
                  aria-disabled={a.status === "Booked"}
                >
                  Join Virtual Room →
                </Link>
                {expanded === a.id && (
                  <div style={{ width: "100%", background: "var(--surface-soft)", borderRadius: "var(--r-md)", padding: 18, fontSize: 14 }}>
                    {a.vitals ? (
                      <>
                        <div className="caption-up text-teal" style={{ marginBottom: 8 }}>AI Nurse Report</div>
                        <div className="grid-2" style={{ gap: 8 }}>
                          <span>🌡 Temp: <strong>{a.vitals.tempC?.toFixed(1)} °C</strong></span>
                          <span>🩸 BP: <strong>{a.vitals.bpSys}/{a.vitals.bpDia} mmHg</strong></span>
                          <span>❤️ HR: <strong>{a.vitals.hr} BPM</strong></span>
                          <span>🫁 SpO₂: <strong>{a.vitals.spo2} %</strong></span>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <strong>Symptoms:</strong> {a.vitals.symptoms.join(", ") || "—"} ({a.vitals.duration})
                        </div>
                        {a.vitals.notes && (
                          <div style={{ marginTop: 4 }}><strong>Notes:</strong> “{a.vitals.notes}”</div>
                        )}
                        {a.summary && (
                          <p className="body-sm text-muted2" style={{ margin: "10px 0 0" }}>{a.summary}</p>
                        )}
                      </>
                    ) : (
                      <span className="text-muted2">Patient hasn&apos;t completed the AI Pre-Checkup yet.</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
