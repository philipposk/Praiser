"use client";

import { PERSONA_PRESETS, presetToPersonInfo } from "@/lib/persona-presets";
import { useAppStore } from "@/state/app-store";

type Starter = { label: string; text: string };

const STARTERS_EL: Starter[] = [
  { label: "Ωδή", text: "Γράψε μια μικρή ωδή για [PERSON]." },
  { label: "Φωτογραφία", text: "Στείλε μου μια φωτογραφία του [PERSON] και πες κάτι ωραίο." },
  { label: "Λόρε", text: "Πες μου την ιστορία του [PERSON]." },
  { label: "Τρυφερό", text: "Πες μου τρία πράγματα που κάνουν τον [PERSON] ξεχωριστό." },
];

const STARTERS_EN: Starter[] = [
  { label: "Ode", text: "Write a short ode to [PERSON]." },
  { label: "Photo", text: "Send a photo of [PERSON] and say something nice." },
  { label: "Lore", text: "Tell me the story of [PERSON]." },
  { label: "Tender", text: "Tell me three things that make [PERSON] special." },
];

type EmptyStateProps = {
  onPick: (text: string) => void;
};

export const EmptyState = ({ onPick }: EmptyStateProps) => {
  const lang = useAppStore((s) => s.uiLanguage);
  const personInfo = useAppStore((s) => s.personInfo);
  const setPersonInfo = useAppStore((s) => s.setPersonInfo);
  const persons = useAppStore((s) => s.persons);

  const personName = personInfo?.name?.trim() || (lang === "el" ? "κάποιον" : "someone");
  const showPresets = !personInfo && persons.length === 0;
  const greet =
    lang === "el" ? (
      <>
        Πες μου για τον <span className="clay">{personName}</span>.
      </>
    ) : (
      <>
        Tell me about <span className="clay">{personName}</span>.
      </>
    );
  const sub =
    lang === "el"
      ? "Εδώ μέσα μιλάμε μόνο καλά λόγια. Στείλε ερώτηση, εικόνα ή φωνητικό — βρίσκω πάντα το αξιέπαινο."
      : "In here we only speak well of them. Send a question, image, or voice note — I'll always find what's praiseworthy.";

  const starters = (lang === "el" ? STARTERS_EL : STARTERS_EN).map((s) => ({
    ...s,
    text: s.text.replaceAll("[PERSON]", personName),
  }));

  const presetsLabel =
    lang === "el"
      ? "Δοκίμασε ένα έτοιμο πρόσωπο"
      : "Try a preset persona";

  return (
    <div className="empty">
      <h1 className="empty-greet">{greet}</h1>
      <p className="empty-sub">{sub}</p>

      {showPresets && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 640 }}>
          <span className="label">{presetsLabel}</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PERSONA_PRESETS.map((p) => (
              <button
                key={p.id}
                className="alias-chip"
                onClick={() => setPersonInfo(presetToPersonInfo(p))}
                style={{ cursor: "pointer", fontSize: 13, padding: "6px 12px" }}
                title={p.tagline}
              >
                <span style={{ marginRight: 6 }}>{p.emoji}</span>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="starters">
        {starters.map((s, i) => (
          <button key={i} className="starter" onClick={() => onPick(s.text)}>
            <span className="label">{s.label}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
