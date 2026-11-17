export type Urgency = "Routine" | "Moderate" | "Urgent";

export type Vitals = {
  tempC: number | null;
  bpSys: number | null;
  bpDia: number | null;
  hr: number | null;
  spo2: number | null;
  duration: string;
  symptoms: string[];
  notes: string;
};

export type NurseMessage = { from: "nurse" | "user"; text: string; red?: boolean };

export type AppointmentStatus =
  | "Booked"
  | "Ready for Doctor"
  | "In Consultation"
  | "Completed";

export type Appointment = {
  id: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  vitals?: Vitals;
  nurseChat?: NurseMessage[];
  summary?: string;
  urgency?: Urgency;
  redFlags?: string[];
  mine?: boolean;
  prescriptionId?: string;
};

export type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
};

export type Prescription = {
  id: string;
  appointmentId: string;
  patientName: string;
  doctorName: string;
  date: string;
  diagnosis: string;
  meds: Medication[];
  advice: string;
};

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  experience: number;
  nextSlot: string;
  fee: number;
  tone: 1 | 2 | 3 | 4;
  bio: string;
};

export const SPECIALTIES = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Pediatrician",
] as const;

export const DOCTORS: Doctor[] = [
  {
    id: "d1",
    name: "Dr. Amara Chen",
    specialty: "General Physician",
    rating: 4.9,
    reviews: 212,
    experience: 9,
    nextSlot: "Today",
    fee: 45,
    tone: 2,
    bio: "Family medicine with a focus on remote triage and preventive care.",
  },
  {
    id: "d2",
    name: "Dr. Julian Osei",
    specialty: "Cardiologist",
    rating: 4.8,
    reviews: 164,
    experience: 14,
    nextSlot: "Today",
    fee: 70,
    tone: 1,
    bio: "Interventional cardiology, telecardiology and post-operative follow-ups.",
  },
  {
    id: "d3",
    name: "Dr. Sofia Marino",
    specialty: "Dermatologist",
    rating: 4.7,
    reviews: 98,
    experience: 11,
    nextSlot: "Tomorrow",
    fee: 60,
    tone: 3,
    bio: "Medical and cosmetic dermatology with photo-based remote reviews.",
  },
  {
    id: "d4",
    name: "Dr. Priya Raghavan",
    specialty: "Pediatrician",
    rating: 5.0,
    reviews: 305,
    experience: 16,
    nextSlot: "Today",
    fee: 50,
    tone: 4,
    bio: "Newborn care, childhood development and pediatric urgent consults.",
  },
  {
    id: "d5",
    name: "Dr. Marcus Feld",
    specialty: "General Physician",
    rating: 4.6,
    reviews: 87,
    experience: 7,
    nextSlot: "Tomorrow",
    fee: 40,
    tone: 3,
    bio: "Adult primary care, chronic disease management and travel medicine.",
  },
  {
    id: "d6",
    name: "Dr. Elena Petrova",
    specialty: "Cardiologist",
    rating: 4.9,
    reviews: 141,
    experience: 18,
    nextSlot: "Today",
    fee: 75,
    tone: 2,
    bio: "Heart failure, arrhythmia monitoring and hypertension clinics.",
  },
];

export const SLOTS_BY_DOCTOR: Record<string, string[]> = {
  d1: ["09:00", "09:30", "10:00", "11:30", "13:00", "15:30", "16:00"],
  d2: ["10:00", "10:30", "12:00", "14:00", "14:30", "17:00"],
  d3: ["09:30", "11:00", "11:30", "15:00", "15:30", "16:30"],
  d4: ["08:30", "09:00", "10:30", "11:00", "13:30", "14:00", "16:00"],
  d5: ["09:00", "09:30", "12:30", "13:00", "14:30", "15:00"],
  d6: ["10:00", "11:30", "12:00", "13:30", "16:00", "16:30"],
};

/* ---------------- Store (localStorage-backed) ---------------- */

const KEY_ROLE = "clinic.role";
const KEY_ACTIVE = "clinic.activeAppt";

export function getRole(): "patient" | "doctor" {
  if (typeof window === "undefined") return "patient";
  return window.localStorage.getItem(KEY_ROLE) === "doctor" ? "doctor" : "patient";
}

export function setRole(role: "patient" | "doctor") {
  window.localStorage.setItem(KEY_ROLE, role);
}

export function setActiveAppointment(id: string) {
  window.localStorage.setItem(KEY_ACTIVE, id);
}

export function getActiveAppointmentId(): string | null {
  return window.localStorage.getItem(KEY_ACTIVE);
}

/* Demo appointments inserted into Supabase the first time the
   appointments table is empty, so the doctor queue is populated. */
function todayAt(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function demoAppointments(): Appointment[] {
  return [
    {
      id: "a-seed-1",
      patientName: "Tomás Herrera",
      doctorId: "d2",
      doctorName: "Dr. Julian Osei",
      specialty: "Cardiologist",
      date: todayAt(0),
      time: "10:00",
      status: "Ready for Doctor",
      urgency: "Urgent",
      vitals: {
        tempC: 37.9,
        bpSys: 168,
        bpDia: 104,
        hr: 118,
        spo2: 93,
        duration: "2 days",
        symptoms: ["Chest pain", "Shortness of breath"],
        notes: "Chest tightness when climbing stairs, worse at night.",
      },
      summary:
        "Patient reports chest tightness and dyspnea for 2 days. Vitals abnormal: BP 168/104, HR 118, SpO2 93%. Red flags detected: chest pain + low oxygen saturation.",
      redFlags: ["Chest pain", "Low SpO2"],
      mine: false,
    },
    {
      id: "a-seed-2",
      patientName: "Lena Kovacs",
      doctorId: "d1",
      doctorName: "Dr. Amara Chen",
      specialty: "General Physician",
      date: todayAt(0),
      time: "11:30",
      status: "Ready for Doctor",
      urgency: "Moderate",
      vitals: {
        tempC: 38.4,
        bpSys: 122,
        bpDia: 80,
        hr: 96,
        spo2: 97,
        duration: "3 days",
        symptoms: ["Fever", "Sore throat", "Headache"],
        notes: "Fever peaking in the evenings, managed with paracetamol.",
      },
      summary:
        "Low-grade febrile illness with sore throat and headache for 3 days. Vitals mostly normal; mild tachycardia at 96 BPM.",
      redFlags: [],
      mine: false,
    },
    {
      id: "a-seed-3",
      patientName: "Noah Bennett",
      doctorId: "d4",
      doctorName: "Dr. Priya Raghavan",
      specialty: "Pediatrician",
      date: todayAt(1),
      time: "09:00",
      status: "Booked",
      mine: false,
    },
  ];
}

/* ---------------- Vitals helpers ---------------- */

export const NORMAL = {
  tempC: [36.1, 37.2] as const,
  bpSys: [90, 130] as const,
  bpDia: [60, 85] as const,
  hr: [60, 100] as const,
  spo2: [95, 100] as const,
};

export type Level = "ok" | "warn" | "bad";

export function vitalsLevel(
  key: "tempC" | "bpSys" | "bpDia" | "hr" | "spo2",
  value: number | null
): Level {
  if (value === null || Number.isNaN(value)) return "ok";
  const [lo, hi] = NORMAL[key];
  if (value >= lo && value <= hi) return "ok";
  switch (key) {
    case "spo2":
      return value < 92 ? "bad" : "warn";
    case "hr":
      return value > 130 || value < 45 ? "bad" : "warn";
    case "bpSys":
      return value >= 180 || value <= 80 ? "bad" : "warn";
    case "bpDia":
      return value >= 120 || value <= 50 ? "bad" : "warn";
    case "tempC":
      return value >= 39.5 ? "bad" : "warn";
  }
}

export const RED_FLAG_WORDS = [
  "chest pain",
  "chest pressure",
  "can't breathe",
  "cant breathe",
  "difficulty breathing",
  "shortness of breath",
  "coughing blood",
  "blood in stool",
  "fainting",
  "passed out",
  "seizure",
  "slurred speech",
  "numb on one side",
  "severe bleeding",
  "suicidal",
  "unresponsive",
  "stiff neck",
];

export function detectRedFlags(text: string): string[] {
  const t = text.toLowerCase();
  return RED_FLAG_WORDS.filter((w) => t.includes(w));
}

export function computeUrgency(
  vitals: Vitals,
  redFlags: string[]
): Urgency {
  if (
    redFlags.length > 0 ||
    (vitals.spo2 !== null && vitals.spo2 < 92) ||
    (vitals.bpSys !== null && vitals.bpSys >= 180) ||
    (vitals.hr !== null && (vitals.hr > 130 || vitals.hr < 45)) ||
    (vitals.tempC !== null && vitals.tempC >= 39.5)
  )
    return "Urgent";

  const warns =
    (vitals.spo2 !== null && vitals.spo2 < 95 ? 1 : 0) +
    (vitals.bpSys !== null && vitals.bpSys >= 140 ? 1 : 0) +
    (vitals.bpDia !== null && vitals.bpDia >= 90 ? 1 : 0) +
    (vitals.hr !== null && (vitals.hr > 100 || vitals.hr < 55) ? 1 : 0) +
    (vitals.tempC !== null && vitals.tempC >= 38 ? 1 : 0);

  if (warns >= 2) return "Urgent";
  if (warns === 1) return "Moderate";
  return "Routine";
}

export function urgencyRank(u?: Urgency): number {
  return u === "Urgent" ? 0 : u === "Moderate" ? 1 : 2;
}

export function buildSummary(
  patientName: string,
  vitals: Vitals,
  redFlags: string[]
): string {
  const parts: string[] = [];
  if (vitals.symptoms.length)
    parts.push(`Reports: ${vitals.symptoms.join(", ")}.`);
  if (vitals.duration) parts.push(`Symptom duration: ${vitals.duration}.`);
  const v: string[] = [];
  if (vitals.tempC !== null) v.push(`Temp ${vitals.tempC.toFixed(1)}°C`);
  if (vitals.bpSys !== null && vitals.bpDia !== null)
    v.push(`BP ${vitals.bpSys}/${vitals.bpDia} mmHg`);
  if (vitals.hr !== null) v.push(`HR ${vitals.hr} BPM`);
  if (vitals.spo2 !== null) v.push(`SpO2 ${vitals.spo2}%`);
  if (v.length) parts.push(`Recorded vitals — ${v.join(", ")}.`);
  if (vitals.notes) parts.push(`Patient notes: “${vitals.notes}”`);
  if (redFlags.length)
    parts.push(`⚠ Red flags flagged by AI Nurse: ${redFlags.join(", ")}.`);
  return `${patientName} — pre-checkup summary. ${parts.join(" ")}`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
