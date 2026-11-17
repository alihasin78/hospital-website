"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  fmtDate,
  getRole,
  setRole,
  type Appointment,
  type Medication,
  type NurseMessage,
  type Prescription,
  type Urgency,
} from "@/lib/clinic";
import {
  addPrescription,
  fetchAppointments,
  fetchPrescriptions,
  updateAppointment,
} from "@/lib/db";

function urgencyBadgeClass(u?: Urgency) {
  return u === "Urgent" ? "badge-urgent" : u === "Moderate" ? "badge-warn" : "badge-ok";
}

function ConsultationInner() {
  const params = useSearchParams();
  const apptId = params.get("appt");

  const [mounted, setMounted] = useState(false);
  const [role, setRoleState] = useState<"patient" | "doctor">("patient");
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [candidates, setCandidates] = useState<Appointment[]>([]);
  const [callState, setCallState] = useState<"lobby" | "live" | "ended">("lobby");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [tab, setTab] = useState<"report" | "chat" | "rx">("report");
  const [chat, setChat] = useState<NurseMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [rxForm, setRxForm] = useState({ diagnosis: "", medName: "", dosage: "", frequency: "", medDuration: "", advice: "" });
  const [rxIssued, setRxIssued] = useState<Prescription | null>(null);
  const [camError, setCamError] = useState("");
  const [toast, setToast] = useState("");

  const patientVideo = useRef<HTMLVideoElement>(null);
  const screenVideo = useRef<HTMLVideoElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const patientStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);

  useEffect(() => {
    setMounted(true);
    setRoleState(getRole());
    let cancelled = false;
    (async () => {
      const all = await fetchAppointments();
      const a = apptId ? all.find((x) => x.id === apptId) : undefined;
      if (cancelled) return;
      if (a) {
        setAppt(a);
        const rxList = await fetchPrescriptions();
        if (cancelled) return;
        const found = rxList.find((r) => r.appointmentId === a.id);
        if (found) setRxIssued(found);
      } else {
        const ready = all
          .filter((x) => x.status === "Ready for Doctor" || x.status === "In Consultation")
          .sort((x, y) => (x.urgency === "Urgent" ? -1 : 1) - (y.urgency === "Urgent" ? -1 : 1));
        setCandidates(ready);
      }
    })();
    return () => { cancelled = true; };
  }, [apptId]);

  // Call timer
  useEffect(() => {
    if (callState !== "live") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

  useEffect(() => {
    return () => {
      patientStream.current?.getTracks().forEach((t) => t.stop());
      screenStream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function joinCall() {
    if (!appt) return;
    setCallState("live");
    await updateAppointment(appt.id, { status: "In Consultation" });
    setAppt({ ...appt, status: "In Consultation" });
    setChat([
      {
        from: "nurse" as const,
        text: `Consultation started with ${appt.doctorName}. ${role === "doctor" ? appt.patientName + " has joined the room." : "Your doctor has been briefed on your AI Pre-Checkup report."}`,
      },
    ]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      patientStream.current = stream;
      if (patientVideo.current) patientVideo.current.srcObject = stream;
    } catch {
      setCamError("Camera unavailable — using placeholder feed. Mic/camera toggles still simulate the call state.");
    }
  }

  function toggleCam() {
    const next = !camOff;
    setCamOff(next);
    patientStream.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
  }

  async function toggleShare() {
    if (sharing) {
      screenStream.current?.getTracks().forEach((t) => t.stop());
      screenStream.current = null;
      setSharing(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStream.current = stream;
      if (screenVideo.current) screenVideo.current.srcObject = stream;
      stream.getVideoTracks()[0].addEventListener("ended", () => setSharing(false));
      setSharing(true);
      pushChat("You started screen sharing.", false);
    } catch {
      setToastMsg("Screen share permission denied — continuing with camera only.");
    }
  }

  function pushChat(text: string, mine: boolean) {
    setChat((c) => [...c, { from: mine ? "user" : "nurse", text }]);
  }

  function sendChat() {
    if (!chatInput.trim()) return;
    pushChat(chatInput, true);
    const said = chatInput;
    setChatInput("");
    setTimeout(() => {
      pushChat(
        role === "doctor"
          ? `Noted — reviewing that alongside your pre-checkup report now, ${appt?.patientName.split(" ")[0]}.`
          : `Thanks for letting me know${said.length > 60 ? "" : ` (“${said}”)`} — I've reviewed your AI Nurse report and I'll factor that in. Anything else bothering you?`,
        false
      );
    }, 1000);
  }

  function endCall() {
    if (appt) {
      void updateAppointment(appt.id, { status: "Completed" });
    }
    patientStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current?.getTracks().forEach((t) => t.stop());
    setCallState("ended");
  }

  async function issueRx() {
    if (!appt || !rxForm.diagnosis.trim() || !rxForm.medName.trim()) {
      setToastMsg("Add a diagnosis and at least one medication.");
      return;
    }
    const med: Medication = {
      name: rxForm.medName.trim(),
      dosage: rxForm.dosage.trim() || "As directed",
      frequency: rxForm.frequency.trim() || "Once daily",
      duration: rxForm.medDuration.trim() || "5 days",
    };
    const rx: Prescription = {
      id: makeId("rx"),
      appointmentId: appt.id,
      patientName: appt.patientName,
      doctorName: appt.doctorName,
      date: todayISO(),
      diagnosis: rxForm.diagnosis.trim(),
      meds: [med],
      advice: rxForm.advice.trim() || "Stay hydrated and rest. Follow up if symptoms persist beyond the prescription duration.",
    };
    await addPrescription(rx);
    await updateAppointment(appt.id, { prescriptionId: rx.id, status: "Completed" });
    setRxIssued(rx);
    setAppt({ ...appt, prescriptionId: rx.id });
    setToastMsg("E-prescription issued and visible to the patient.");
  }

  function downloadRx() {
    if (!rxIssued) return;
    const lines = [
      "VITALIS VIRTUAL CLINIC — E-PRESCRIPTION",
      "=======================================",
      `Prescription #: ${rxIssued.id}`,
      `Date: ${rxIssued.date}`,
      `Patient: ${rxIssued.patientName}`,
      `Doctor: ${rxIssued.doctorName}`,
      `Diagnosis: ${rxIssued.diagnosis}`,
      "",
      "Medications:",
      ...rxIssued.meds.map(
        (m, i) => `  ${i + 1}. ${m.name} — ${m.dosage}, ${m.frequency}, for ${m.duration}`
      ),
      "",
      `Advice: ${rxIssued.advice}`,
      "",
      "This is a simulated digital prescription generated by the Vitalis demo app.",
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vitalis-rx-${rxIssued.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function setToastMsg(t: string) {
    setToast(t);
    setTimeout(() => setToast(""), 3000);
  }

  if (!mounted) return null;

  /* ---------- No appointment selected ---------- */
  if (!appt) {
    return (
      <section className="section">
        <div className="container-clinic" style={{ maxWidth: 720 }}>
          <div className="card-canvas" style={{ padding: 44 }}>
            <h1 className="display-md" style={{ marginBottom: 10 }}>
              Virtual Doctor Room
            </h1>
            <p className="body-md text-muted2" style={{ marginBottom: 24 }}>
              {role === "doctor"
                ? "Select a patient from the triage queue to open their room."
                : "Complete your AI pre-checkup to unlock the consultation room."}
            </p>
            {candidates.length > 0 && (
              <div className="stack-sm">
                {candidates.map((c) => (
                  <div key={c.id} className="appt-row" style={{ padding: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div className="title-sm">{c.patientName}</div>
                      <div className="body-sm text-muted2">
                        {c.doctorName} · {fmtDate(c.date)} {c.time}
                      </div>
                    </div>
                    <span className={`badge-pill ${urgencyBadgeClass(c.urgency)}`}>{c.urgency ?? "Pending"}</span>
                    <Link href={`/consultation?appt=${c.id}`} className="btn-teal btn-sm">
                      Join Virtual Room
                    </Link>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/book" className="btn-teal">Book Appointment</Link>
              <Link href="/dashboard" className="btn-outline">Dashboard</Link>
              <button className="btn-ghost" onClick={() => { setRole(role === "patient" ? "doctor" : "patient"); setRoleState(role === "patient" ? "doctor" : "patient"); }}>
                Switch to {role === "patient" ? "Doctor" : "Patient"} View
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ---------- Post-call ---------- */
  if (callState === "ended") {
    return (
      <section className="section">
        <div className="container-clinic" style={{ maxWidth: 680 }}>
          <div className="card-canvas" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 44 }}>📴</div>
            <h1 className="display-md" style={{ margin: "12px 0 10px" }}>
              Consultation ended
            </h1>
            <p className="body-md text-muted2">
              Duration {fmtSeconds(seconds)} · {appt.doctorName}
            </p>
            {rxIssued ? (
              <div className="card-cream" style={{ textAlign: "left", margin: "24px 0" }}>
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <div className="title-sm">Your e-prescription is ready</div>
                  <span className="badge-pill badge-ok badge-up">Issued</span>
                </div>
                <p className="body-sm text-muted2" style={{ margin: 0, marginBottom: 16 }}>
                  Diagnosis: {rxIssued.diagnosis} · {rxIssued.meds.length} medication(s) prescribed by {rxIssued.doctorName}.
                </p>
                <button className="btn-teal btn-sm" onClick={downloadRx}>
                  ⬇ Download Prescription
                </button>
              </div>
            ) : (
              <p className="body-sm text-muted2" style={{ margin: "20px 0" }}>
                No e-prescription was issued for this consultation.
              </p>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/dashboard" className="btn-teal">Go to Dashboard</Link>
              <Link href="/book" className="btn-outline">Book Another Visit</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ---------- Lobby ---------- */
  if (callState === "lobby") {
    const blocked = role === "patient" && appt.status === "Booked";
    return (
      <section className="section">
        <div className="container-clinic" style={{ maxWidth: 680 }}>
          <div className="card-dark" style={{ padding: 44, textAlign: "center" }}>
            <div className="nurse-avatar" style={{ width: 72, height: 72, fontSize: 24, margin: "0 auto 18px", background: "var(--teal)" }}>
              🩺
            </div>
            <h1 className="display-md" style={{ color: "var(--on-dark)", marginBottom: 10 }}>
              {role === "doctor" ? `${appt.patientName}'s room` : `${appt.doctorName}'s room`}
            </h1>
            <p className="body-md" style={{ color: "var(--on-dark-soft)", marginBottom: 24 }}>
              {fmtDate(appt.date)} · {appt.time} · {appt.specialty}
            </p>
            {blocked ? (
              <>
                <div className="badge-pill badge-urgent badge-up" style={{ marginBottom: 16 }}>
                  Pre-checkup pending — consultation locked
                </div>
                <p className="body-sm" style={{ color: "var(--on-dark-soft)", marginBottom: 24 }}>
                  Your doctor can only see you after the mandatory AI Pre-Checkup. Complete it to unlock this room.
                </p>
                <Link href={`/pre-checkup?appt=${appt.id}`} className="btn-teal">
                  Start AI Pre-Checkup →
                </Link>
              </>
            ) : (
              <>
                <p className="body-sm" style={{ color: "var(--on-dark-soft)", marginBottom: 24 }}>
                  {role === "doctor"
                    ? "Your patient's AI Nurse report is pre-loaded in the side panel."
                    : "Your AI Nurse report has been shared with the doctor."}
                </p>
                <button className="btn-teal" onClick={joinCall}>
                  {role === "doctor" ? "Join Virtual Room" : "Enter Consultation"} →
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  /* ---------- Live room ---------- */
  const mmss = fmtSeconds(seconds);
  const v = appt.vitals;

  return (
    <section className="section" style={{ paddingTop: 32 }}>
      <div className="container-clinic">
        <div className="room">
          <div className="room-grid">
            {/* Stage */}
            <div className="room-stage">
              <div className="flex-between">
                <span className="badge-pill badge-dark">
                  <span className="rec-dot" /> LIVE {mmss}
                </span>
                <span className="badge-pill badge-dark">
                  {sharing ? "You are sharing your screen" : `Encrypted · ${appt.doctorName}`}
                </span>
              </div>

              <div className="doctor-feed">
                {sharing ? (
                  <video ref={screenVideo} autoPlay muted playsInline style={{ width: "100%", height: 320, objectFit: "contain", borderRadius: "var(--r-lg)", background: "#000" }} />
                ) : (
                  <>
                    <div className={`doc-avatar t2`}>DR</div>
                    <div className="title-lg" style={{ color: "var(--on-dark)" }}>{appt.doctorName}</div>
                    <div className="body-sm" style={{ color: "var(--on-dark-soft)" }}>
                      {appt.specialty} · {muted ? "Doctor audio on" : "In consultation"}
                    </div>
                  </>
                )}
              </div>

              {/* Patient PiP */}
              <div className="pip">
                {!camOff && !camError ? (
                  <video ref={patientVideo} autoPlay muted playsInline />
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "var(--on-dark-soft)" }}>
                      {appt.patientName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="caption" style={{ color: "var(--on-dark-soft)", fontSize: 11 }}>
                      {camOff ? "Camera off" : "No camera"}
                    </div>
                  </div>
                )}
                <span
                  className="badge-pill badge-dark"
                  style={{ position: "absolute", bottom: 8, left: 8, fontSize: 11 }}
                >
                  {muted ? "🔇" : "🎤"} You
                </span>
              </div>

              {/* Controls */}
              <div className="room-controls">
                <button
                  className={`ctrl${muted ? " off" : ""}`}
                  title={muted ? "Unmute" : "Mute"}
                  onClick={() => setMuted((m) => !m)}
                >
                  {muted ? "🔇" : "🎙"}
                </button>
                <button
                  className={`ctrl${camOff ? " off" : ""}`}
                  title={camOff ? "Turn camera on" : "Turn camera off"}
                  onClick={toggleCam}
                >
                  {camOff ? "🚫" : "📷"}
                </button>
                <button
                  className={`ctrl${sharing ? " off" : ""}`}
                  title={sharing ? "Stop sharing" : "Share screen"}
                  onClick={toggleShare}
                >
                  🖥
                </button>
                <button className="ctrl end" title="End call" onClick={endCall}>
                  ✕
                </button>
              </div>
            </div>

            {/* Side panel */}
            <div className="room-side">
              <div className="side-tabs">
                {(["report", "chat", "rx"] as const).map((t) => (
                  <button key={t} className={`side-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
                    {t === "report" ? "AI Report" : t === "chat" ? "Chat" : "E-Prescription"}
                  </button>
                ))}
              </div>

              <div className="side-body" ref={tab === "chat" ? chatRef : undefined}>
                {tab === "report" && (
                  <>
                    <div className="flex-between" style={{ marginBottom: 14 }}>
                      <span className="caption-up" style={{ color: "var(--teal-bright)" }}>
                        Pre-Checkup Report
                      </span>
                      <span className={`badge-pill badge-up ${urgencyBadgeClass(appt.urgency)}`}>
                        {appt.urgency ?? "No report"}
                      </span>
                    </div>
                    {v ? (
                      <>
                        <div className="report-block">
                          <div className="row-line" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                            <span style={{ color: "var(--on-dark-soft)" }}>Temperature</span>
                            <span>{v.tempC?.toFixed(1)} °C</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                            <span style={{ color: "var(--on-dark-soft)" }}>Blood pressure</span>
                            <span>{v.bpSys}/{v.bpDia} mmHg</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                            <span style={{ color: "var(--on-dark-soft)" }}>Heart rate</span>
                            <span>{v.hr} BPM</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                            <span style={{ color: "var(--on-dark-soft)" }}>SpO₂</span>
                            <span>{v.spo2} %</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                            <span style={{ color: "var(--on-dark-soft)" }}>Duration</span>
                            <span>{v.duration}</span>
                          </div>
                        </div>
                        {(appt.redFlags ?? []).length > 0 && (
                          <div className="report-block" style={{ border: "1px solid #5c3a44" }}>
                            <div className="caption-up" style={{ color: "#e6a2a2", marginBottom: 6 }}>
                              ⚠ Red flags
                            </div>
                            {(appt.redFlags ?? []).join(" · ")}
                          </div>
                        )}
                        <div className="report-block">
                          <div className="caption-up" style={{ color: "var(--teal-bright)", marginBottom: 6 }}>
                            AI Nurse summary
                          </div>
                          {appt.summary}
                        </div>
                      </>
                    ) : (
                      <p className="body-sm" style={{ color: "var(--on-dark-soft)" }}>
                        No pre-checkup report on file for this appointment.
                      </p>
                    )}
                  </>
                )}

                {tab === "chat" && (
                  <>
                    {chat.map((m, i) => (
                      <div key={i} className={`bubble ${m.from === "nurse" ? "bubble-nurse" : "bubble-user"}`} style={{ marginBottom: 10 }}>
                        {m.text}
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <input
                        className="input"
                        style={{ background: "var(--surface-dark-soft)", borderColor: "rgba(255,255,255,0.12)", color: "var(--on-dark)" }}
                        placeholder="Message…"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendChat()}
                      />
                      <button className="btn-teal btn-sm" onClick={sendChat}>Send</button>
                    </div>
                  </>
                )}

                {tab === "rx" && (
                  <>
                    {rxIssued ? (
                      <>
                        <div className="flex-between" style={{ marginBottom: 10 }}>
                          <span className="caption-up" style={{ color: "var(--teal-bright)" }}>
                            E-Prescription
                          </span>
                          <span className="badge-pill badge-ok badge-up">Issued</span>
                        </div>
                        <div className="report-block">
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                            <span style={{ color: "var(--on-dark-soft)" }}>Patient</span>
                            <span>{rxIssued.patientName}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                            <span style={{ color: "var(--on-dark-soft)" }}>Doctor</span>
                            <span>{rxIssued.doctorName}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                            <span style={{ color: "var(--on-dark-soft)" }}>Diagnosis</span>
                            <span>{rxIssued.diagnosis}</span>
                          </div>
                        </div>
                        {rxIssued.meds.map((m, i) => (
                          <div className="rx-line" key={i}>
                            <div className="title-sm" style={{ color: "var(--on-dark)" }}>{i + 1}. {m.name}</div>
                            <div className="body-sm" style={{ color: "var(--on-dark-soft)" }}>
                              {m.dosage} · {m.frequency} · for {m.duration}
                            </div>
                          </div>
                        ))}
                        <div className="report-block mt-2">
                          <div className="caption-up" style={{ color: "var(--teal-bright)", marginBottom: 6 }}>Advice</div>
                          {rxIssued.advice}
                        </div>
                        <button className="btn-teal btn-block mt-2" onClick={downloadRx}>
                          ⬇ Download Prescription
                        </button>
                      </>
                    ) : role === "doctor" ? (
                      <>
                        <div className="caption-up" style={{ color: "var(--teal-bright)", marginBottom: 12 }}>
                          Issue E-Prescription
                        </div>
                        {([
                          ["diagnosis", "Diagnosis", "e.g. Acute bronchitis"],
                          ["medName", "Medication", "e.g. Azithromycin 250mg"],
                          ["dosage", "Dosage", "e.g. 1 tablet"],
                          ["frequency", "Frequency", "e.g. Twice daily"],
                          ["medDuration", "Duration", "e.g. 5 days"],
                        ] as const).map(([k, label, ph]) => (
                          <div className="field" key={k} style={{ marginBottom: 12 }}>
                            <label style={{ color: "var(--on-dark-soft)" }}>{label}</label>
                            <input
                              className="input"
                              style={{ background: "var(--surface-dark-soft)", borderColor: "rgba(255,255,255,0.12)", color: "var(--on-dark)" }}
                              placeholder={ph}
                              value={rxForm[k]}
                              onChange={(e) => setRxForm((f) => ({ ...f, [k]: e.target.value }))}
                            />
                          </div>
                        ))}
                        <div className="field" style={{ marginBottom: 14 }}>
                          <label style={{ color: "var(--on-dark-soft)" }}>Advice</label>
                          <textarea
                            className="textarea"
                            style={{ background: "var(--surface-dark-soft)", borderColor: "rgba(255,255,255,0.12)", color: "var(--on-dark)" }}
                            placeholder="Rest, hydration, return if worse…"
                            value={rxForm.advice}
                            onChange={(e) => setRxForm((f) => ({ ...f, advice: e.target.value }))}
                          />
                        </div>
                        <button className="btn-teal btn-block" onClick={issueRx}>
                          ✚ Issue & Sign Prescription
                        </button>
                      </>
                    ) : (
                      <p className="body-sm" style={{ color: "var(--on-dark-soft)" }}>
                        No prescription issued yet. Once the doctor signs it, it will appear here and in your dashboard — ready to download.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </section>
  );
}

function fmtSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix: string): string {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function ConsultationPage() {
  return (
    <Suspense fallback={null}>
      <ConsultationInner />
    </Suspense>
  );
}
