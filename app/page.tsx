import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container-clinic hero-grid">
          <div>
            <span className="badge-pill badge-teal badge-up" style={{ marginBottom: 20 }}>
              Virtual Clinic · Telemedicine
            </span>
            <h1 className="display-xl" style={{ marginBottom: 20 }}>
              Your clinic visit, from your living room.
            </h1>
            <p className="body-md lead" style={{ marginBottom: 28 }}>
              Vitalis pairs real doctors with an AI Pre-Checkup Nurse: book a
              slot online, get your vitals triaged before the consult, and meet
              your doctor in a secure virtual room.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/book" className="btn-teal">
                Book an Online Slot →
              </Link>
              <Link href="/pre-checkup" className="btn-outline">
                Meet the AI Nurse
              </Link>
            </div>
          </div>

          {/* Dark product surface — the 3-step journey */}
          <div className="hero-visual">
            <div className="flex-between" style={{ padding: "0 4px" }}>
              <span className="caption-up" style={{ color: "var(--on-dark-soft)" }}>
                The remote journey
              </span>
              <span className="badge-pill badge-dark">
                <span className="dot-ok" /> 3 doctors online now
              </span>
            </div>
            {[
              {
                n: "1",
                t: "Book an Online Slot",
                s: "Filter by specialty, pick a doctor, choose your time — no waiting room.",
              },
              {
                n: "2",
                t: "AI Nurse Pre-Checkup & Vitals",
                s: "Record temperature, blood pressure, heart rate and SpO₂. Ava flags red-flag symptoms before the doctor ever joins.",
              },
              {
                n: "3",
                t: "Virtual Doctor Video Consultation",
                s: "The doctor reviews your AI report live in the video room and issues an e-prescription you can download.",
              },
            ].map((s) => (
              <div className="journey-step" key={s.n}>
                <div className="step-num">{s.n}</div>
                <div>
                  <div className="js-title">{s.t}</div>
                  <div className="js-sub">{s.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it helps */}
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container-clinic">
          <h2 className="display-lg" style={{ marginBottom: 32 }}>
            Care that starts before the call.
          </h2>
          <div className="grid-3">
            {[
              {
                icon: "🩺",
                t: "Triage, not guesswork",
                d: "Our AI Nurse asks one targeted question at a time, screens for urgent red-flag symptoms, and compiles a clinical summary so your doctor starts the consult already informed.",
              },
              {
                icon: "📊",
                t: "Vitals with context",
                d: "Temperature, blood pressure, heart rate and oxygen level are captured against normal-range indicators and attached to your appointment automatically.",
              },
              {
                icon: "📝",
                t: "E-prescriptions in minutes",
                d: "At the end of the consultation, your digital prescription is ready to view and download — no pharmacy queue, no paper slips.",
              },
            ].map((f) => (
              <div className="card-cream" key={f.t}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div className="title-md" style={{ marginBottom: 8 }}>
                  {f.t}
                </div>
                <p className="body-sm text-muted2" style={{ margin: 0 }}>
                  {f.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-clinic">
          <div className="cta-band">
            <h2 className="display-sm" style={{ marginBottom: 12 }}>
              Ready to be seen — without going anywhere?
            </h2>
            <p className="body-md" style={{ color: "#d7e0ea", marginBottom: 24 }}>
              Doctors are online today across four specialties.
            </p>
            <Link
              href="/book"
              className="btn-teal"
              style={{ background: "var(--canvas)", color: "var(--blue)" }}
            >
              Book Your Appointment
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
