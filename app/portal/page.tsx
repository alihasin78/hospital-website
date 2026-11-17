"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SPECIALTIES } from "@/lib/clinic";
import {
  fetchPortalPatients,
  registerPatient,
  type PortalRegistration,
} from "@/lib/db";

const EMPTY = { name: "", email: "", phone: "", dob: "", specialty: "General Physician", message: "" };

export default function PortalPage() {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [registrations, setRegistrations] = useState<PortalRegistration[]>([]);

  useEffect(() => {
    fetchPortalPatients().then(setRegistrations);
  }, []);

  function setField(k: keyof typeof EMPTY, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setError("");
    if (!form.name.trim() || !form.email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    const res = await registerPatient({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dob: form.dob,
      specialty: form.specialty,
      message: form.message.trim(),
    });
    setSubmitting(false);
    if (res.ok) {
      setSuccess(form.name.trim().split(" ")[0]);
      setForm(EMPTY);
      fetchPortalPatients().then(setRegistrations);
    } else {
      setError(res.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <section className="section">
      <div className="container-clinic">
        <div style={{ maxWidth: 640, marginBottom: 28 }}>
          <span className="badge-pill badge-teal badge-up">Patient Portal</span>
          <h1 className="display-lg" style={{ margin: "14px 0 8px" }}>
            Register with the virtual clinic
          </h1>
          <p className="body-md text-muted2" style={{ margin: 0 }}>
            Create your portal record once — then book appointments, complete AI
            pre-checkups and receive e-prescriptions, all saved to our secure
            Supabase database.
          </p>
        </div>

        <div className="split">
          {/* Form */}
          <div className="card-canvas">
            {success ? (
              <div style={{ textAlign: "center", padding: 24 }}>
                <div style={{ fontSize: 40 }}>🎉</div>
                <h2 className="display-sm" style={{ margin: "12px 0 10px" }}>
                  Welcome, {success}!
                </h2>
                <p className="body-md text-muted2" style={{ marginBottom: 24 }}>
                  Your portal record has been saved. You can now book an
                  appointment with any of our doctors.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/book" className="btn-teal">Book an Appointment →</Link>
                  <button className="btn-outline" onClick={() => setSuccess(null)}>
                    Register another patient
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="title-md" style={{ marginBottom: 20 }}>Registration form</div>
                <div className="vital-grid">
                  <div className="field">
                    <label>Full name *</label>
                    <input className="input" placeholder="e.g. Jordan Blake" value={form.name} onChange={(e) => setField("name", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Email address *</label>
                    <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Phone number</label>
                    <input className="input" placeholder="+1 555 000 0000" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Date of birth</label>
                    <input className="input" type="date" value={form.dob} onChange={(e) => setField("dob", e.target.value)} />
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>Preferred specialty</label>
                    <select className="select" value={form.specialty} onChange={(e) => setField("specialty", e.target.value)}>
                      {SPECIALTIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>How can we help? (optional)</label>
                    <textarea className="textarea" placeholder="Briefly describe your reason for registering…" value={form.message} onChange={(e) => setField("message", e.target.value)} />
                  </div>
                </div>
                {error && (
                  <div className="range-note bad" style={{ marginTop: 12 }}>⚠ {error}</div>
                )}
                <button className="btn-teal btn-block mt-3" onClick={submit} disabled={submitting}>
                  {submitting ? "Saving to database…" : "Create Portal Record"}
                </button>
                <p className="body-sm text-muted2" style={{ margin: "14px 0 0", textAlign: "center" }}>
                  Your details are stored securely in our Supabase database.
                </p>
              </>
            )}
          </div>

          {/* Side info + recent registrations */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="card-cream">
              <div className="title-md" style={{ marginBottom: 14 }}>
                What you get with a portal record
              </div>
              <div className="stack-sm body-sm text-muted2">
                <div>📅 &nbsp;Book video appointments across four specialties</div>
                <div>🤖 &nbsp;Mandatory AI Nurse pre-checkup with vitals tracking</div>
                <div>🩺 &nbsp;Doctor-side triage queue so urgent cases go first</div>
                <div>📝 &nbsp;Downloadable e-prescriptions after every consult</div>
              </div>
              <hr className="hr-soft" />
              <div className="body-sm text-muted2">
                Need urgent care? This portal is not for emergencies — call your
                local emergency number immediately.
              </div>
            </div>

            {registrations.length > 0 && (
              <div className="summary-card">
                <div className="caption-up" style={{ color: "var(--teal-bright)", marginBottom: 12 }}>
                  Recent portal registrations
                </div>
                {registrations.map((r) => (
                  <div className="row" key={r.id}>
                    <span className="k">{r.name}</span>
                    <span className="v" style={{ fontWeight: 400, fontSize: 12.5 }}>
                      {r.specialty} · {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
