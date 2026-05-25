"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import type { MessageImage, PersonInfo } from "@/lib/types";
import { useAppStore } from "@/state/app-store";

const emptyPerson = (): PersonInfo => ({
  name: "",
  images: [],
  videos: [],
  urls: [],
  extraInfo: "",
});

export const SettingsDrawer = () => {
  const lang = useAppStore((s) => s.uiLanguage);
  const open = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);

  const storePerson = useAppStore((s) => s.personInfo);
  const setPersonInfo = useAppStore((s) => s.setPersonInfo);

  const darkMode = useAppStore((s) => s.darkMode);
  const setDarkMode = useAppStore((s) => s.setDarkMode);
  const showSubjectPanel = useAppStore((s) => s.showSubjectPanel);
  const setShowSubjectPanel = useAppStore((s) => s.setShowSubjectPanel);
  const autoSpeak = useAppStore((s) => s.autoSpeak);
  const setAutoSpeak = useAppStore((s) => s.setAutoSpeak);

  const [draft, setDraft] = useState<PersonInfo>(storePerson ?? emptyPerson());
  const [tagline, setTagline] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(storePerson ?? emptyPerson());
    const first = (storePerson?.extraInfo ?? "").split(/[.\n]/)[0] || "";
    setTagline(first.trim());
  }, [open, storePerson]);

  if (!open) return null;

  const T =
    lang === "el"
      ? {
          title: "Ρυθμίσεις",
          subject: "Πρόσωπο",
          name: "Όνομα",
          tagline: "Σλόγκαν",
          lore: "Πληροφορίες & ψευδώνυμα",
          photos: "Φωτογραφίες",
          general: "Γενικές",
          showSubj: "Δεξί πάνελ",
          showSubjSub: "Πορτρέτο, ψευδώνυμα, dial επαίνου",
          theme: "Σκούρο θέμα",
          themeSub: "Από την ανατολή στη δύση",
          voice: "Αυτόματη ομιλία",
          voiceSub: "Διαβάζει τις απαντήσεις φωναχτά",
          save: "Αποθήκευση",
          cancel: "Ακύρωση",
        }
      : {
          title: "Settings",
          subject: "Subject",
          name: "Name",
          tagline: "Tagline",
          lore: "Lore & aliases",
          photos: "Photos",
          general: "General",
          showSubj: "Right panel",
          showSubjSub: "Portrait, aliases, praise dial",
          theme: "Dark theme",
          themeSub: "From dawn to dusk",
          voice: "Auto-speak",
          voiceSub: "Read responses aloud",
          save: "Save",
          cancel: "Cancel",
        };

  const close = () => setOpen(false);

  const commitDraft = () => {
    const next: PersonInfo = {
      ...draft,
      name: draft.name.trim(),
      extraInfo:
        tagline && !draft.extraInfo.startsWith(tagline)
          ? `${tagline}. ${draft.extraInfo}`.trim()
          : draft.extraInfo,
    };
    if (!next.name && next.images.length === 0 && !next.extraInfo) {
      setPersonInfo(null);
    } else {
      setPersonInfo(next);
    }
    close();
  };

  const onPickPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const uploaded: MessageImage[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "image");
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        if (response.ok) {
          const data = await response.json();
          uploaded.push({ url: data.url, type: file.type, name: file.name });
        } else {
          // fallback to data URL
          await new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
              uploaded.push({
                url: ev.target?.result as string,
                type: file.type,
                name: file.name,
              });
              resolve();
            };
            reader.readAsDataURL(file);
          });
        }
      } catch {
        // skip
      }
    }
    if (uploaded.length) {
      setDraft((d) => ({ ...d, images: [...d.images, ...uploaded] }));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (i: number) => {
    setDraft((d) => ({ ...d, images: d.images.filter((_, j) => j !== i) }));
  };

  return (
    <div className="drawer-overlay" onClick={close}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>{T.title}</h2>
          <button className="icon-btn" onClick={close} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <div className="drawer-section-title">{T.subject}</div>
        <div className="field">
          <label>{T.name}</label>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder={lang === "el" ? "Όνομα προσώπου" : "Person's name"}
          />
        </div>
        <div className="field">
          <label>{T.tagline}</label>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder={lang === "el" ? "π.χ. Είναι τούμπανο." : "e.g. They're amazing."}
          />
        </div>
        <div className="field">
          <label>{T.lore}</label>
          <textarea
            value={draft.extraInfo}
            onChange={(e) => setDraft((d) => ({ ...d, extraInfo: e.target.value }))}
            placeholder={
              lang === "el"
                ? "Ιστορία, χαρακτηριστικά, ψευδώνυμα (π.χ. ψευδώνυμα: ο Κουκ, ο Μάικ)"
                : "Story, traits, aliases (e.g. aliases: Mike, Mike K., Mikey)"
            }
          />
        </div>
        <div className="field">
          <label>{T.photos}</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={onPickPhotos}
          />
          <div className="upload-grid">
            {draft.images.map((p, i) => (
              <div key={i} className="slot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.name || ""} />
                <button className="remove" onClick={() => removePhoto(i)} aria-label="Remove">
                  <Icon name="x" size={10} />
                </button>
              </div>
            ))}
            <button className="slot add-slot" onClick={() => fileInputRef.current?.click()}>
              <Icon name="plus" size={16} />
            </button>
          </div>
        </div>

        <div className="drawer-section-title">{T.general}</div>
        <div className="row-toggle">
          <div>
            <div className="row-toggle-text">{T.showSubj}</div>
            <div className="row-toggle-sub">{T.showSubjSub}</div>
          </div>
          <button
            className={"toggle " + (showSubjectPanel ? "on" : "")}
            onClick={() => setShowSubjectPanel(!showSubjectPanel)}
            aria-label="Toggle subject panel"
          />
        </div>
        <div className="row-toggle">
          <div>
            <div className="row-toggle-text">{T.theme}</div>
            <div className="row-toggle-sub">{T.themeSub}</div>
          </div>
          <button
            className={"toggle " + (darkMode ? "on" : "")}
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle theme"
          />
        </div>
        <div className="row-toggle">
          <div>
            <div className="row-toggle-text">{T.voice}</div>
            <div className="row-toggle-sub">{T.voiceSub}</div>
          </div>
          <button
            className={"toggle " + (autoSpeak ? "on" : "")}
            onClick={() => setAutoSpeak(!autoSpeak)}
            aria-label="Toggle auto-speak"
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
          <button className="side-link" style={{ width: "auto" }} onClick={close}>
            {T.cancel}
          </button>
          <button
            className="new-chat"
            style={{ width: "auto", padding: "10px 20px" }}
            onClick={commitDraft}
          >
            <Icon name="check" size={14} /> {T.save}
          </button>
        </div>
      </div>
    </div>
  );
};
