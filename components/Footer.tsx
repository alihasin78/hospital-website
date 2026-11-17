import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container-clinic">
        <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "32px" }}>
          <div>
            <Link href="/" className="brand" style={{ marginBottom: 12 }}>
              <span className="brand-mark">+</span>
              Vitalis
            </Link>
            <p style={{ fontSize: 14, marginTop: 12 }}>
              Remote-first healthcare: triaged by an AI nurse, treated by real
              doctors — without leaving home.
            </p>
          </div>
          <div>
            <h4>Clinic</h4>
            <Link href="/book">Book Appointment</Link>
            <Link href="/pre-checkup">AI Pre-Checkup Nurse</Link>
            <Link href="/consultation">Virtual Doctor Room</Link>
          </div>
          <div>
            <h4>Account</h4>
            <Link href="/dashboard">Patient Dashboard</Link>
            <Link href="/dashboard">Doctor Dashboard</Link>
          </div>
          <div>
            <h4>Support</h4>
            <a href="#">Emergency: call 911</a>
            <a href="#">help@vitalis.clinic</a>
            <a href="#">+1 (800) 555-0199</a>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 Vitalis Virtual Clinic. Demo application —
          not for real medical use. Always call your local emergency number for
          emergencies.
        </div>
      </div>
    </footer>
  );
}
