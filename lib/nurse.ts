import { detectRedFlags, type Urgency, type Vitals } from "./clinic";

export type NurseStep =
  | "greet"
  | "ask-main"
  | "ask-severity"
  | "ask-associated"
  | "ask-redflag-followup"
  | "redflag-warn"
  | "advice"
  | "done";

export type NurseTurn = {
  step: NurseStep;
  text: string;
  chips?: string[];
  urgent?: boolean;
};

const MAIN_SYMPTOMS = [
  "Fever",
  "Cough or cold",
  "Chest pain",
  "Headache",
  "Stomach pain",
  "Skin rash",
  "Fatigue",
  "Joint pain",
];

export function nurseGreet(patientName: string): NurseTurn {
  return {
    step: "greet",
    text: `Hello ${patientName}, I'm Ava, your AI Pre-Checkup Nurse. Before your doctor joins, I'll record your vitals (the form on the left) and ask a few targeted questions so nothing is missed. First — what is your main symptom today?`,
    chips: MAIN_SYMPTOMS,
  };
}

export function nextTurn(
  step: NurseStep,
  vitals: Vitals,
  answer: string
): NurseTurn {
  const red = detectRedFlags(answer);
  switch (step) {
    case "greet":
    case "ask-main": {
      vitals.symptoms.push(answer);
      if (red.length) return redFlagTurn(red);
      return {
        step: "ask-severity",
        text: `Thank you. How would you rate the ${answer.toLowerCase()} — mild, moderate, or severe?`,
        chips: ["Mild", "Moderate", "Severe"],
      };
    }
    case "ask-severity": {
      if (answer === "Severe") {
        return {
          step: "ask-associated",
          text:
            "Noted — severe symptoms raise priority. Are you also experiencing any of these? Select all that apply, or type what else you feel.",
          chips: [
            "Shortness of breath",
            "Dizziness",
            "Nausea",
            "None of these",
          ],
        };
      }
      return {
        step: "ask-associated",
        text: "Got it. Any other symptoms alongside it? Select any that apply, or type 'none'.",
        chips: ["Shortness of breath", "Dizziness", "Nausea", "None of these"],
      };
    }
    case "ask-associated": {
      if (answer !== "None of these" && answer.toLowerCase() !== "none") {
        vitals.symptoms.push(answer);
      }
      const red = detectRedFlags(vitals.notes);
      if (red.length) return redFlagTurn(red);
      return {
        step: "advice",
        text: "Thank you — I've captured everything. Please make sure the vitals form on the left is filled in, then tap “Complete Pre-Checkup” so I can compile your clinical summary for the doctor.",
      };
    }
    case "ask-redflag-followup": {
      const stillRed = detectRedFlags(answer);
      if (stillRed.length) return redFlagTurn(stillRed);
      return {
        step: "ask-associated",
        text:
          "Okay, that's reassuring. Any other symptoms alongside it? Select any that apply, or type 'none'.",
        chips: ["Shortness of breath", "Dizziness", "Nausea", "None of these"],
      };
    }
    default:
      return {
        step: "advice",
        text: "I've captured everything. Please complete the vitals form on the left, then tap “Complete Pre-Checkup”.",
      };
  }
}

function redFlagTurn(flags: string[]): NurseTurn {
  const f = flags[0];
  const isBreathing =
    f.includes("breath") || f.includes("breathe") || f.includes("chest");
  return {
    step: "ask-redflag-followup",
    urgent: true,
    text: `⚠ I've flagged “${f}” as a possible red-flag symptom. ${
      isBreathing
        ? "If this is happening right now or worsening fast, please seek emergency care immediately — this chat does not replace emergency services."
        : "I'll mark this as urgent in your summary so the doctor sees it first."
    } To be safe: is it happening continuously right now, or only when you exert yourself?`,
    chips: ["Continuously right now", "Only on exertion", "It has passed"],
  };
}

export function closingAdvice(urgency: Urgency): string {
  if (urgency === "Urgent")
    return "Your pre-checkup is marked URGENT. Your doctor has been moved to the top of the queue — please join the virtual room as soon as they call you. If symptoms worsen before then, call your local emergency number.";
  if (urgency === "Moderate")
    return "Your pre-checkup is complete and marked MODERATE priority. Your doctor will review the AI Nurse report before calling you into the virtual room.";
  return "Everything looks mostly stable. Your pre-checkup is complete — the doctor will review the summary and call you into the virtual room at your slot time.";
}
