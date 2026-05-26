"use client";

import { PERSONA_PRESETS, presetToPersonInfo } from "@/lib/persona-presets";
import type { ChatMode } from "@/lib/types";
import { useAppStore } from "@/state/app-store";

type Starter = { label: string; text: string };
type StarterSet = { en: Starter[]; el: Starter[]; subtitle: { en: string; el: string } };

/**
 * Per-mode starter cards. [PERSON] is replaced with the active person's name
 * (or "someone" / "κάποιον" if none is set). Subtitle mirrors the empty-state
 * sub-copy so the page reads consistently for the chosen mode.
 */
const STARTERS_BY_MODE: Record<ChatMode, StarterSet> = {
  praise: {
    subtitle: {
      en: "In here we only speak well of them. Send a question, image, or voice note — I'll always find what's praiseworthy.",
      el: "Εδώ μέσα μιλάμε μόνο καλά λόγια. Στείλε ερώτηση, εικόνα ή φωνητικό — βρίσκω πάντα το αξιέπαινο.",
    },
    en: [
      { label: "Ode", text: "Write a short ode to [PERSON]." },
      { label: "Photo", text: "Send a photo of [PERSON] and say something nice." },
      { label: "Lore", text: "Tell me the story of [PERSON]." },
      { label: "Tender", text: "Tell me three things that make [PERSON] special." },
    ],
    el: [
      { label: "Ωδή", text: "Γράψε μια μικρή ωδή για [PERSON]." },
      { label: "Φωτογραφία", text: "Στείλε μου μια φωτογραφία του [PERSON] και πες κάτι ωραίο." },
      { label: "Λόρε", text: "Πες μου την ιστορία του [PERSON]." },
      { label: "Τρυφερό", text: "Πες μου τρία πράγματα που κάνουν τον [PERSON] ξεχωριστό." },
    ],
  },
  roast: {
    subtitle: {
      en: "Affectionate teasing only. Light, witty, never cruel. Tell me where to aim.",
      el: "Μόνο τρυφερά πειράγματα. Ελαφρύ, πνευματώδες, ποτέ άσχημο. Πες μου πού να στοχεύσω.",
    },
    en: [
      { label: "Quirk", text: "Roast [PERSON] for their most ridiculous habit." },
      { label: "Phase", text: "Mock that one life phase of [PERSON] they've never lived down." },
      { label: "Outfit", text: "Roast [PERSON]'s signature outfit choices." },
      { label: "Hot take", text: "Take a friendly shot at something everyone notices about [PERSON]." },
    ],
    el: [
      { label: "Συνήθεια", text: "Πειράξτε τον [PERSON] για τη πιο γελοία του συνήθεια." },
      { label: "Φάση", text: "Πειράξτε τη φάση του [PERSON] που δεν την ξεχνάει κανείς." },
      { label: "Στιλ", text: "Πειράξτε τις χαρακτηριστικές επιλογές ντυσίματος του [PERSON]." },
      { label: "Χτύπημα", text: "Πετάξτε μια φιλική «βελονιά» για κάτι που όλοι παρατηρούν στον [PERSON]." },
    ],
  },
  hype: {
    subtitle: {
      en: "Pure energy. Make me fired up about [PERSON].",
      el: "Καθαρή ενέργεια. Κάνε με να ψηθώ για τον [PERSON].",
    },
    en: [
      { label: "Pep talk", text: "Give [PERSON] a 30-second pep talk before they walk into the room." },
      { label: "Walkout", text: "Write [PERSON]'s entrance announcement like they're a heavyweight champion." },
      { label: "Anthem", text: "Hype up [PERSON] like a sports commentator on the last play." },
      { label: "Big day", text: "Get [PERSON] fired up for the biggest day of their year." },
    ],
    el: [
      { label: "Λόγος", text: "Δώσε στον [PERSON] ένα 30-δευτερόλεπτο pep talk πριν μπει." },
      { label: "Εμφάνιση", text: "Γράψε την είσοδο του [PERSON] σαν να είναι παγκόσμιος πρωταθλητής." },
      { label: "Ύμνος", text: "Hype-άρισέ τον [PERSON] σαν σχολιαστής αγώνα στην τελευταία φάση." },
      { label: "Μεγάλη μέρα", text: "Ψήσε τον [PERSON] για τη μεγαλύτερη μέρα της χρονιάς του." },
    ],
  },
  birthday: {
    subtitle: {
      en: "Write a warm, personal birthday note for [PERSON]. Reference something only their people would know.",
      el: "Γράψε ζεστή προσωπική ευχή για τον [PERSON]. Αναφέρσου σε κάτι που μόνο οι δικοί του ξέρουν.",
    },
    en: [
      { label: "Short", text: "A short heartfelt birthday message for [PERSON] — six lines max." },
      { label: "Funny", text: "A funny birthday message for [PERSON] that still feels sincere." },
      { label: "Card", text: "Write a birthday card for [PERSON] that goes inside a small folded card." },
      { label: "Speech", text: "Write a short birthday toast for [PERSON] to read at the dinner table." },
    ],
    el: [
      { label: "Σύντομη", text: "Σύντομη ζεστή ευχή γενεθλίων για τον [PERSON] — έξι γραμμές το πολύ." },
      { label: "Αστεία", text: "Αστεία ευχή γενεθλίων για τον [PERSON] που να μένει ειλικρινής." },
      { label: "Κάρτα", text: "Γράψε ευχή γενεθλίων για τον [PERSON] που χωράει σε μικρή κάρτα." },
      { label: "Πρόποση", text: "Σύντομη πρόποση γενεθλίων για τον [PERSON] στο τραπέζι." },
    ],
  },
  anniversary: {
    subtitle: {
      en: "Celebrate a milestone with or for [PERSON]. Reflective, grateful, looking back and forward.",
      el: "Γιόρτασε ορόσημο με ή για τον [PERSON]. Στοχαστικό, ευγνώμον, βλέπει πίσω και μπροστά.",
    },
    en: [
      { label: "Couple", text: "Write a five-year anniversary message to [PERSON] from their partner." },
      { label: "Workplace", text: "Write a work-anniversary message for [PERSON] from their team." },
      { label: "Friendship", text: "Write a friendship-anniversary note to [PERSON] — ten years strong." },
      { label: "Family", text: "Write a parent's note to [PERSON] on a coming-of-age milestone." },
    ],
    el: [
      { label: "Ζευγάρι", text: "Γράψε μήνυμα πενταετούς επετείου για τον [PERSON] από τον/την σύντροφό του." },
      { label: "Δουλειά", text: "Γράψε μήνυμα επετείου δουλειάς για τον [PERSON] από τη ομάδα του." },
      { label: "Φιλία", text: "Γράψε μήνυμα δεκαετούς φιλίας με τον [PERSON]." },
      { label: "Οικογένεια", text: "Γράψε μήνυμα γονιού στον [PERSON] σε ένα ορόσημο ενηλικίωσης." },
    ],
  },
  affirmation: {
    subtitle: {
      en: "Calm, grounding, second-person. Speak directly to [PERSON].",
      el: "Ήρεμο, σταθεροποιητικό, σε δεύτερο πρόσωπο. Μίλα κατευθείαν στον [PERSON].",
    },
    en: [
      { label: "Today", text: "Write a single grounding affirmation for [PERSON] to start today." },
      { label: "Setback", text: "Write an affirmation for [PERSON] after a hard week." },
      { label: "Daily", text: "Give [PERSON] three short morning affirmations to read aloud." },
      { label: "Doubt", text: "Write an affirmation for [PERSON] who's doubting their work." },
    ],
    el: [
      { label: "Σήμερα", text: "Γράψε μια σταθεροποιητική επιβεβαίωση για τον [PERSON] για σήμερα." },
      { label: "Αποτυχία", text: "Γράψε μια επιβεβαίωση για τον [PERSON] μετά από δύσκολη εβδομάδα." },
      { label: "Πρωινό", text: "Δώσε στον [PERSON] τρεις σύντομες πρωινές επιβεβαιώσεις να διαβάσει φωναχτά." },
      { label: "Αμφιβολία", text: "Γράψε επιβεβαίωση για τον [PERSON] που αμφιβάλλει για τη δουλειά του." },
    ],
  },
  tribute: {
    subtitle: {
      en: "Dignified. Honour [PERSON] — character, impact, what they leave behind.",
      el: "Αξιοπρεπές. Τίμα τον [PERSON] — χαρακτήρα, επιρροή, αυτό που αφήνει πίσω.",
    },
    en: [
      { label: "Eulogy", text: "Write a short tribute to [PERSON]'s impact on the people around them." },
      { label: "Memory", text: "Write a memory of [PERSON] told warmly, in the past tense." },
      { label: "Toast", text: "Write a tribute toast for [PERSON] at a retirement dinner." },
      { label: "Letter", text: "Write a letter of gratitude to [PERSON] that you wish you'd sent sooner." },
    ],
    el: [
      { label: "Αναφορά", text: "Γράψε σύντομη αναφορά για την επιρροή του [PERSON] στους γύρω του." },
      { label: "Μνήμη", text: "Γράψε μια ανάμνηση για τον [PERSON] σε παρελθόντα χρόνο." },
      { label: "Πρόποση", text: "Γράψε πρόποση τιμής για τον [PERSON] σε δείπνο συνταξιοδότησης." },
      { label: "Γράμμα", text: "Γράψε γράμμα ευγνωμοσύνης στον [PERSON] που θα ήθελες να είχες στείλει νωρίτερα." },
    ],
  },
};

const greetForMode = (mode: ChatMode, lang: "el" | "en", name: string) => {
  if (lang === "el") {
    switch (mode) {
      case "roast":
        return <>Πειράζουμε τον <span className="clay">{name}</span>.</>;
      case "hype":
        return <>Ψήνουμε τον <span className="clay">{name}</span>.</>;
      case "birthday":
        return <>Γενέθλια του <span className="clay">{name}</span>.</>;
      case "anniversary":
        return <>Επέτειος του <span className="clay">{name}</span>.</>;
      case "affirmation":
        return <>Μήνυμα στον <span className="clay">{name}</span>.</>;
      case "tribute":
        return <>Αφιέρωμα στον <span className="clay">{name}</span>.</>;
      default:
        return <>Πες μου για τον <span className="clay">{name}</span>.</>;
    }
  }
  switch (mode) {
    case "roast":
      return <>Roast <span className="clay">{name}</span>.</>;
    case "hype":
      return <>Hype up <span className="clay">{name}</span>.</>;
    case "birthday":
      return <>Birthday for <span className="clay">{name}</span>.</>;
    case "anniversary":
      return <>Anniversary of <span className="clay">{name}</span>.</>;
    case "affirmation":
      return <>A note for <span className="clay">{name}</span>.</>;
    case "tribute":
      return <>Tribute to <span className="clay">{name}</span>.</>;
    default:
      return <>Tell me about <span className="clay">{name}</span>.</>;
  }
};

type EmptyStateProps = {
  onPick: (text: string) => void;
};

export const EmptyState = ({ onPick }: EmptyStateProps) => {
  const lang = useAppStore((s) => s.uiLanguage);
  const personInfo = useAppStore((s) => s.personInfo);
  const setPersonInfo = useAppStore((s) => s.setPersonInfo);
  const persons = useAppStore((s) => s.persons);

  const personName = personInfo?.name?.trim() || (lang === "el" ? "κάποιον" : "someone");
  const mode: ChatMode = personInfo?.mode ?? "praise";
  const showPresets = !personInfo && persons.length === 0;

  const greet = greetForMode(mode, lang, personName);
  const sub = STARTERS_BY_MODE[mode].subtitle[lang].replaceAll("[PERSON]", personName);

  const starters = STARTERS_BY_MODE[mode][lang].map((s) => ({
    ...s,
    text: s.text.replaceAll("[PERSON]", personName),
  }));

  const presetsLabel =
    lang === "el" ? "Δοκίμασε ένα έτοιμο πρόσωπο" : "Try a preset persona";

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
