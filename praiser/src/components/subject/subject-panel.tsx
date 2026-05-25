"use client";

import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { useAppStore } from "@/state/app-store";

type Props = {
  onImageClick: (url: string) => void;
};

const praiseDescriptor = (v: number, lang: "el" | "en"): string => {
  if (lang === "el") {
    if (v < 12) return "Διακριτικός σεβασμός";
    if (v < 30) return "Ζεστή εκτίμηση";
    if (v < 55) return "Ειλικρινής θαυμασμός";
    if (v < 78) return "Λυρική αποθέωση";
    if (v < 95) return "Επικός διθύραμβος";
    return "Σχεδόν ιερόσυλο";
  }
  if (v < 12) return "Discreet respect";
  if (v < 30) return "Warm appreciation";
  if (v < 55) return "Honest admiration";
  if (v < 78) return "Lyrical exaltation";
  if (v < 95) return "Epic dithyramb";
  return "Almost sacrilegious";
};

// Parse aliases from extraInfo. Looks for common patterns like
// "aliases: foo, bar", "ψευδώνυμα: foo, bar", or splits the first line on commas.
const parseAliases = (extra: string): string[] => {
  if (!extra) return [];
  const lower = extra.toLowerCase();
  const markers = ["aliases:", "ψευδώνυμα:", "alias:", "ψευδώνυμο:"];
  for (const m of markers) {
    const idx = lower.indexOf(m);
    if (idx >= 0) {
      const rest = extra.slice(idx + m.length).split(/[.\n]/)[0];
      return rest
        .split(/[,·]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 60)
        .slice(0, 8);
    }
  }
  return [];
};

const firstSentence = (text: string): string => {
  if (!text) return "";
  const idx = text.search(/[.!?·\n]/);
  return idx > 0 ? text.slice(0, idx).trim() : text.trim();
};

export const SubjectPanel = ({ onImageClick }: Props) => {
  const lang = useAppStore((s) => s.uiLanguage);
  const personInfo = useAppStore((s) => s.personInfo);
  const praiseVolume = useAppStore((s) => s.praiseVolume);
  const setManualPraiseVolume = useAppStore((s) => s.setManualPraiseVolume);
  const setPraiseVolume = useAppStore((s) => s.setPraiseVolume);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  const photos = useMemo(() => personInfo?.images?.map((i) => i.url) ?? [], [personInfo]);
  const aliases = useMemo(() => parseAliases(personInfo?.extraInfo ?? ""), [personInfo]);
  const tagline = useMemo(() => firstSentence(personInfo?.extraInfo ?? ""), [personInfo]);
  const lore = personInfo?.extraInfo ?? "";

  const [idx, setIdx] = useState(0);
  const [loreOpen, setLoreOpen] = useState(false);

  useEffect(() => {
    if (photos.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 5500);
    return () => clearInterval(t);
  }, [photos.length]);

  useEffect(() => {
    if (idx >= photos.length) setIdx(0);
  }, [photos.length, idx]);

  const T =
    lang === "el"
      ? {
          subject: "Το θέμα μας",
          aliases: "Ψευδώνυμα",
          lore: "Λόρε",
          praiseLevel: "Επίπεδο επαίνου",
          gallery: "Συλλογή",
          more: "διαβάστε περισσότερα",
          less: "λιγότερα",
          subtle: "Διακριτικό",
          epic: "Επικό",
          noPerson: "Δεν έχει οριστεί πρόσωπο",
          addPerson: "Προσθήκη προσώπου",
        }
      : {
          subject: "The subject",
          aliases: "Aliases",
          lore: "Lore",
          praiseLevel: "Praise level",
          gallery: "Gallery",
          more: "read more",
          less: "less",
          subtle: "Subtle",
          epic: "Epic",
          noPerson: "No person set",
          addPerson: "Add person",
        };

  const onPraiseChange = (value: number) => {
    setPraiseVolume(value);
    setManualPraiseVolume(value);
  };

  if (!personInfo || !personInfo.name.trim()) {
    return (
      <aside className="subject-panel">
        <div className="subj-header">
          <span className="label">{T.subject}</span>
          <button className="icon-btn" aria-label="Edit subject" onClick={() => setSettingsOpen(true)}>
            <Icon name="pencil" size={14} />
          </button>
        </div>
        <div className="subj-portrait" style={{ display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
            <Icon name="user" size={32} />
            <div style={{ fontSize: 13, marginTop: 12 }}>{T.noPerson}</div>
            <button
              className="side-link"
              style={{ marginTop: 12, width: "auto", color: "var(--clay)" }}
              onClick={() => setSettingsOpen(true)}
            >
              <Icon name="plus" size={12} /> {T.addPerson}
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="subject-panel">
      <div className="subj-header">
        <span className="label">{T.subject}</span>
        <button className="icon-btn" aria-label="Edit subject" onClick={() => setSettingsOpen(true)}>
          <Icon name="pencil" size={14} />
        </button>
      </div>

      {photos.length > 0 ? (
        <div
          className="subj-portrait"
          onClick={() => onImageClick(photos[idx])}
          style={{ cursor: "pointer" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[idx]} alt={personInfo.name} key={idx} />
          <div className="subj-portrait-overlay">
            <div
              style={{
                position: "relative",
                zIndex: 1,
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                opacity: 0.85,
              }}
              className="mono"
            >
              #{(idx + 1).toString().padStart(2, "0")} / {photos.length.toString().padStart(2, "0")}
            </div>
            <div className="portrait-dots" style={{ position: "relative", zIndex: 1 }}>
              {photos.map((_, i) => (
                <button
                  key={i}
                  className={i === idx ? "on" : ""}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdx(i);
                  }}
                  aria-label={`Photo ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="subj-portrait" style={{ display: "grid", placeItems: "center" }}>
          <Icon name="user" size={40} />
        </div>
      )}

      <div>
        <h2 className="subj-name">{personInfo.name}</h2>
        {tagline && <p className="subj-tagline">{tagline}</p>}
      </div>

      {/* Praise dial */}
      <div className="praise-dial">
        <div className="praise-dial-head">
          <span className="praise-dial-label">{T.praiseLevel}</span>
          <div className="praise-dial-value">
            {Math.round(praiseVolume)}
            <sup>%</sup>
          </div>
        </div>
        <div className="praise-track">
          <div className="praise-track-bar" />
          <div className="praise-track-fill" style={{ width: `${praiseVolume}%` }} />
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(praiseVolume)}
            onChange={(e) => onPraiseChange(parseInt(e.target.value, 10))}
          />
        </div>
        <div className="praise-ticks">
          <span>{T.subtle}</span>
          <span>·</span>
          <span>{T.epic}</span>
        </div>
        <div className="praise-descriptor">— {praiseDescriptor(praiseVolume, lang)}</div>
      </div>

      {aliases.length > 0 && (
        <div className="subj-section">
          <span className="label">{T.aliases}</span>
          <div className="alias-chips">
            {aliases.map((a) => (
              <span key={a} className="alias-chip">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {lore && (
        <div className="subj-section">
          <span className="label">{T.lore}</span>
          <div className={"lore" + (loreOpen ? "" : " lore-collapsed")}>{lore}</div>
          {lore.length > 140 && (
            <button className="lore-toggle" onClick={() => setLoreOpen((o) => !o)}>
              {loreOpen ? T.less : T.more}
            </button>
          )}
        </div>
      )}

      {photos.length > 0 && (
        <div className="subj-section">
          <span className="label">
            {T.gallery}{" "}
            <span
              className="mono"
              style={{ color: "var(--muted-2)", marginLeft: 6 }}
            >
              {photos.length}
            </span>
          </span>
          <div className="gallery-strip">
            {photos.slice(0, 8).map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p} alt="" onClick={() => onImageClick(p)} />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
