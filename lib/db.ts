import { supabase } from "./supabase";
import {
  demoAppointments,
  type Appointment,
  type Prescription,
} from "./clinic";

/* localStorage mirrors of the Supabase data. The app reads from the
   mirror for instant renders and refreshes it from Supabase on load;
   every write goes to Supabase first and is mirrored locally. If
   Supabase is unreachable or the schema hasn't been applied yet, the
   app degrades gracefully to localStorage-only mode. */

const LS_APPTS = "clinic.appointments";
const LS_RX = "clinic.prescriptions";

function readLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, list: T[]) {
  window.localStorage.setItem(key, JSON.stringify(list));
}

function todayAt(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function localAppointments(): Appointment[] {
  const list = readLocal<Appointment>(LS_APPTS);
  if (!list.length) {
    // Refresh demo dates so they always look "today/tomorrow"
    const demo = demoAppointments();
    demo[0].date = todayAt(0);
    demo[1].date = todayAt(0);
    demo[2].date = todayAt(1);
    writeLocal(LS_APPTS, demo);
    return demo;
  }
  return list;
}

function localPrescriptions(): Prescription[] {
  return readLocal<Prescription>(LS_RX);
}

/* ---------------- Appointments ---------------- */

export async function fetchAppointments(): Promise<Appointment[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, data, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      let rows = (data ?? []).map((r) => r.data as Appointment);
      if (rows.length === 0) {
        const demo = demoAppointments();
        demo[0].date = todayAt(0);
        demo[1].date = todayAt(0);
        demo[2].date = todayAt(1);
        const { error: insertError } = await supabase
          .from("appointments")
          .insert(demo.map((a) => ({ id: a.id, data: a, patient_name: a.patientName, status: a.status, urgency: a.urgency ?? null })));
        if (!insertError) rows = demo;
      }
      if (rows.length) {
        writeLocal(LS_APPTS, rows);
        return rows;
      }
    } catch {
      // fall through to localStorage
    }
  }
  return localAppointments();
}

export async function addAppointment(a: Appointment): Promise<void> {
  writeLocal(LS_APPTS, [...localAppointments(), a]);
  if (supabase) {
    try {
      await supabase
        .from("appointments")
        .insert({ id: a.id, data: a, patient_name: a.patientName, status: a.status, urgency: a.urgency ?? null });
    } catch {
      // mirrored locally; Supabase unreachable
    }
  }
}

export async function updateAppointment(
  id: string,
  patch: Partial<Appointment>
): Promise<void> {
  const merged = localAppointments().map((a) =>
    a.id === id ? { ...a, ...patch } : a
  );
  writeLocal(LS_APPTS, merged);
  if (supabase) {
    const next = merged.find((a) => a.id === id);
    if (next) {
      try {
        await supabase
          .from("appointments")
          .update({ data: next, patient_name: next.patientName, status: next.status, urgency: next.urgency ?? null })
          .eq("id", id);
      } catch {
        // ignore
      }
    }
  }
}

/* ---------------- Prescriptions ---------------- */

export async function fetchPrescriptions(): Promise<Prescription[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, data")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []).map((r) => r.data as Prescription);
      if (rows.length) {
        writeLocal(LS_RX, rows);
        return rows;
      }
    } catch {
      // fall through
    }
  }
  return localPrescriptions();
}

export async function addPrescription(rx: Prescription): Promise<void> {
  writeLocal(LS_RX, [...localPrescriptions(), rx]);
  if (supabase) {
    try {
      await supabase
        .from("prescriptions")
        .insert({ id: rx.id, data: rx, appointment_id: rx.appointmentId, patient_name: rx.patientName });
    } catch {
      // ignore
    }
  }
}

/* ---------------- Patient portal ---------------- */

export type PortalRegistration = {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  specialty: string;
  message: string;
  created_at: string;
};

export async function registerPatient(
  input: Omit<PortalRegistration, "id" | "created_at">
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) {
    return { ok: false, error: "Database not configured. Run supabase/schema.sql in your Supabase project and restart the dev server." };
  }
  try {
    const { error } = await supabase.from("portal_patients").insert(input);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export async function fetchPortalPatients(): Promise<PortalRegistration[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("portal_patients")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6);
    if (error) return [];
    return (data ?? []) as PortalRegistration[];
  } catch {
    return [];
  }
}
