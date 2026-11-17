"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  buildSummary,
  computeUrgency,
  detectRedFlags,
  fmtDate,
  type Appointment,
  type Level,
  type NurseMessage,
  type Urgency,
  type Vitals,
  vitalsLevel,
} from "@/lib/clinic";
import { fetchAppointments, updateAppointment } from "@/lib/db";
import { closingAdvice, nurseGreet, nextTurn, type NurseStep } from "@/lib/nurse";

const EMPTY_VITALS: Vitals = {
  tempC: null,
  bpSys: null,
  bpDia: null,
  hr: null,
  spo2: null,
  duration: "",
  symptoms: [],
  notes: "",
};

const SYMPTOM_OPTIONS = [
  "Fever",
  "Cough or cold",
  "Chest pain",
  "Headache",
  "Stomach pain",
  "Skin rash",
  "Fatigue",
  "Joint pain",
];

const DURATIONS = ["Less than 24 hours", "1–2 days", "3–7 days", "1–4 weeks", "Over a month"];

function PreCheckupInner() {
  const params = useSearchParams();
  const apptId = params.get("appt");

  const [mounted, setMounted] = useState(false);
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [vitals, setVitals] = useState<Vitals>(EMPTY_VITALS);
  const [fahrenheit, setFahrenheit] = useState(true);
  const [messages, setMessages] = useState<NurseMessage[]>([]);
  const [step, setStep] = useState<NurseStep>("greet");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [urgency, setUrgency] = useState<Urgency | null>(null);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    fetchAppointments().then((all) => {
      if (cancelled) return;
      const a = (apptId ? all.find((x) => x.id === apptId) : null) ??
        all.filter((x) => x.mine && x.status !== "Completed").slice(-1)[0] ??
        all[0] ?? null;
      if (a) {
        setAppt(a);
        if (a.vitals) setVitals(a.vitals);
        if (a.status !== "Booked" && a.summary) {
          setDone(true);
          setUrgency(a.urgency ?? null);
          setRedFlags(a.redFlags ?? []);
          setMessages(a.nurseChat ?? []);
          setStep("done");
        }
      }
    });
    return () => { cancelled = true; };
  }, [apptId]);

  // Greet once we know the patient
  useEffect(() => {
    if (!appt || firstRun.current || done) return;
    firstRun.current = true;
    setTyping(true);
    const t = setTimeout(() => {
      const g = nurseGreet(appt.patientName.split(" ")[0]);
      setMessages([{ from: "nurse", text: g.text }]);
      setStep(g.step);
      setTyping(false);
    }, 700);
    return () => clearTimeout(t);
  }, [appt, done]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function num(v: string): number | null {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function setField<K extends keyof Vitals>(k: K, v: Vitals[K]) {
    setVitals((p) => ({ ...p, [k]: v }));
  }

  function toggleSymptom(s: string) {
    setVitals((p) => ({
      ...p,
      symptoms: p.symptoms.includes(s)
        ? p.symptoms.filter((x) => x !== s)
        : [...p.symptoms, s],
    }));
  }

  function send(text: string) {
    if (!text.trim() || typing || done) return;
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setTyping(true);
    const turn = nextTurn(step, vitals, text);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        ...(turn.urgent ? [{ from: "nurse" as const, text: "⚠ This may be a red-flag symptom — escalating to your doctor's priority queue.", red: true }] : []),
        { from: "nurse", text: turn.text, red: turn.urgent },
      ]);
      setStep(turn.step);
      setTyping(false);
    }, 900);
  }

  async function complete() {
    if (!appt) return;
    const flags = Array.from(
      new Set([...detectRedFlags(vitals.notes), ...detectRedFlags(vitals.symptoms.join(" "))])
    );
    const u = computeUrgency(vitals, flags);
    const summary = buildSummary(appt.patientName, vitals, flags);
    setUrgency(u);
    setRedFlags(flags);
    setDone(true);
    setMessages((m) => [
      ...m,
      { from: "nurse", text: closingAdvice(u), red: u === "Urgent" },
    ]);
    await updateAppointment(appt.id, {
      vitals,
      nurseChat: messages,
      summary,
      urgency: u,
      redFlags: flags,
      status: "Ready for Doctor",
    });
    setAppt((a) => (a ? { ...a, vitals, summary, urgency: u, redFlags: flags, status: "Ready for Doctor" } : a));
  }

  const vitalsFilled =
    vitals.tempC !== null && vitals.bpSys !== null && vitals.bpDia !== null && vitals.hr !== null && vitals.spo2 !== null;

  const tempDisplay = fahrenheit
    ? vitals.tempC === null ? "" : (vitals.tempC * 9) / 5 + 32
    : vitals.tempC ?? "";

  function setTemp(display: string) {
    if (display.trim() === "") return setField("tempC", null);
    const n = Number(display);
    if (!Number.isFinite(n)) return;
    setField("tempC", fahrenheit ? ((n - 32) * 5) / 9 : n);
  }

  function levelNote(label: string, level: Level, normal: string) {
    const cls = level === "ok" ? "ok" : level === "warn" ? "warn" : "bad";
    const msg =
      level === "ok" ? "Within normal range" : level === "warn" ? "Outside normal range — noted for doctor" : "Critical — flagged urgent";
    return (
      <div className={`range-note ${cls}`}>
        {level === "ok" ? "●" : "●"} {label}: {msg} · normal {normal}
      </div>
    );
  }

  if (!mounted) return null;

  if (!appt) {
    return (
      <section className="section">
        <div className="container-clinic" style={{ maxWidth: 640 }}>
          <div className="card-canvas" style={{ textAlign: "center", padding: 48 }}>
            <h1 className="display-md" style={{ marginBottom: 12 }}>
              No appointment to pre-check
            </h1>
            <p className="body-md text-muted2" style={{ marginBottom: 24 }}>
              The AI Pre-Checkup Nurse is part of the appointment journey. Book a
              slot first, or open your dashboard to continue an existing
              appointment.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/book" className="btn-teal">Book an Appointment</Link>
              <Link href="/dashboard" className="btn-outline">My Dashboard</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container-clinic">
        <div style={{ maxWidth: 640, marginBottom: 28 }}>
          <span className="badge-pill badge-blue badge-up">Step 2 of 3</span>
          <h1 className="display-lg" style={{ margin: "14px 0 8px" }}>
            AI Pre-Checkup Nurse
          </h1>
          <p className="body-md text-muted2" style={{ margin: 0 }}>
            {appt.patientName} · {appt.doctorName} · {fmtDate(appt.date)} at {appt.time} — Ava records your
            vitals and screens for urgent symptoms before the doctor joins.
          </p>
        </div>

        <div className="split">
          {/* LEFT — Vitals form */}
          <div className="card-canvas">
            <div className="flex-between" style={{ marginBottom: 20 }}>
              <div className="title-md">Patient Vitals</div>
              <div className="unit-toggle">
                <button className={fahrenheit ? "on" : ""} onClick={() => setFahrenheit(true)}>°F</button>
                <button className={!fahrenheit ? "on" : ""} onClick={() => setFahrenheit(false)}>°C</button>
              </div>
            </div>

            <div className="vital-grid">
              <div className="field">
                <label>Body Temperature ({fahrenheit ? "°F" : "°C"})</label>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  placeholder={fahrenheit ? "e.g. 98.6" : "e.g. 37.0"}
                  value={tempDisplay === null ? "" : String(tempDisplay)}
                  onChange={(e) => setTemp(e.target.value)}
                />
                {vitals.tempC !== null && levelNote("Temp", vitalsLevel("tempC", vitals.tempC), fahrenheit ? "97.0–99.0 °F" : "36.1–37.2 °C")}
              </div>

              <div className="field">
                <label>Blood Pressure (mmHg)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    className="input"
                    type="number"
                    placeholder="Systolic"
                    value={vitals.bpSys ?? ""}
                    onChange={(e) => setField("bpSys", num(e.target.value))}
                  />
                  <span className="text-muted2">/</span>
                  <input
                    className="input"
                    type="number"
                    placeholder="Diastolic"
                    value={vitals.bpDia ?? ""}
                    onChange={(e) => setField("bpDia", num(e.target.value))}
                  />
                </div>
                {vitals.bpSys !== null && levelNote("BP", vitalsLevel("bpSys", vitals.bpSys), "90–130 / 60–85")}
              </div>

              <div className="field">
                <label>Heart Rate (BPM)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 72"
                  value={vitals.hr ?? ""}
                  onChange={(e) => setField("hr", num(e.target.value))}
                />
                {vitals.hr !== null && levelNote("HR", vitalsLevel("hr", vitals.hr), "60–100 BPM")}
              </div>

              <div className="field">
                <label>Oxygen Level (SpO₂ %)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 98"
                  value={vitals.spo2 ?? ""}
                  onChange={(e) => setField("spo2", num(e.target.value))}
                />
                {vitals.spo2 !== null && levelNote("SpO₂", vitalsLevel("spo2", vitals.spo2), "95–100 %")}
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Symptom Duration</label>
                <select
                  className="select"
                  value={vitals.duration}
                  onChange={(e) => setField("duration", e.target.value)}
                >
                  <option value="">Select duration…</option>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Which symptoms are you experiencing?</label>
                <div className="chips">
                  {SYMPTOM_OPTIONS.map((s) => (
                    <button
                      key={s}
                      className="chip"
                      style={
                        vitals.symptoms.includes(s)
                          ? { background: "var(--teal)", borderColor: "var(--teal)", color: "#fff" }
                          : undefined
                      }
                      onClick={() => toggleSymptom(s)}
                    >
                      {vitals.symptoms.includes(s) ? "✓ " : ""}{s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Describe your symptoms in your own words</label>
                <textarea
                  className="textarea"
                  placeholder="e.g. Tight feeling in my chest since yesterday evening, worse when walking upstairs…"
                  value={vitals.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                />
                {detectRedFlags(vitals.notes).length > 0 && (
                  <div className="range-note bad">
                    ⚠ Red-flag phrase detected: “{detectRedFlags(vitals.notes)[0]}” — Ava will mark this urgent.
                  </div>
                )}
              </div>
            </div>

            {!done ? (
              <button
                className="btn-teal btn-block mt-3"
                disabled={!vitalsFilled}
                onClick={complete}
              >
                {vitalsFilled ? "Complete Pre-Checkup" : "Fill all vitals to complete pre-checkup"}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
                <Link href={`/consultation?appt=${appt.id}`} className="btn-teal" style={{ flex: 1 }}>
                  Enter Virtual Doctor Room →
                </Link>
                <Link href="/dashboard" className="btn-outline">Dashboard</Link>
              </div>
            )}
          </div>

          {/* RIGHT — AI Nurse chat + live summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="chat-panel">
              <div className="chat-head">
                <div className="nurse-avatar">A</div>
                <div style={{ flex: 1 }}>
                  <div className="title-sm">Ava · AI Pre-Checkup Nurse</div>
                  <div className="caption text-muted2">
                    <span className="dot-ok" style={{ marginRight: 6 }} />
                    Asking one question at a time
                  </div>
                </div>
                <span className={`badge-pill badge-up ${urgency === "Urgent" ? "badge-urgent" : ""}`}>
                  {done ? `Triage: ${urgency}` : "Intake in progress"}
                </span>
              </div>

              <div className="chat-body" ref={chatRef}>
                {messages.map((m, i) => (
                  <div key={i} className={`bubble ${m.from === "nurse" ? (m.red ? "bubble-red" : "bubble-nurse") : "bubble-user"}`}>
                    {m.text}
                  </div>
                ))}
                {typing && (
                  <div className="bubble bubble-nurse" style={{ width: 64 }}>
                    <span className="typing-dots"><span /><span /><span /></span>
                  </div>
                )}
              </div>

              {!done && (
                <div className="chat-input-row">
                  <input
                    className="input"
                    placeholder="Type your answer…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send(input)}
                    disabled={typing}
                  />
                  <button className="btn-teal" onClick={() => send(input)} disabled={typing || !input.trim()}>
                    Send
                  </button>
                </div>
              )}
            </div>

            {/* Live clinical summary */}
            <div className="summary-card">
              <div className="caption-up" style={{ color: "var(--teal-bright)", marginBottom: 12 }}>
                Pre-Checkup Clinical Summary
              </div>
              {[
                ["Patient", appt.patientName],
                ["Symptoms", vitals.symptoms.length ? vitals.symptoms.join(", ") : "—"],
                ["Duration", vitals.duration || "—"],
                ["Temperature", vitals.tempC !== null ? `${vitals.tempC.toFixed(1)} °C` : "—"],
                [
                  "Blood pressure",
                  vitals.bpSys !== null && vitals.bpDia !== null
                    ? `${vitals.bpSys}/${vitals.bpDia} mmHg`
                    : "—",
                ],
                ["Heart rate", vitals.hr !== null ? `${vitals.hr} BPM` : "—"],
                ["SpO₂", vitals.spo2 !== null ? `${vitals.spo2} %` : "—"],
                ["Red flags", done ? (redFlags.length ? redFlags.join(", ") : "None detected") : "Screening…"],
                ["Triage urgency", done ? urgency! : "Pending completion"],
              ].map(([k, v]) => (
                <div className="row" key={k as string}>
                  <span className="k">{k}</span>
                  <span className="v">{v}</span>
                </div>
              ))}
              {done && (
                <p className="body-sm" style={{ color: "var(--on-dark-soft)", margin: "14px 0 0" }}>
                  {appt.summary}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PreCheckupPage() {
  return (
    <Suspense fallback={null}>
      <PreCheckupInner />
    </Suspense>
  );
}
