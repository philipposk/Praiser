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
  const persons = useAppStore((s) => s.persons);
  const addPerson = useAppStore((s) => s.addPerson);
  const removePerson = useAppStore((s) => s.removePerson);
  const setCurrentPerson = useAppStore((s) => s.setCurrentPerson);

  const darkMode = useAppStore((s) => s.darkMode);
  const setDarkMode = useAppStore((s) => s.setDarkMode);
  const showSubjectPanel = useAppStore((s) => s.showSubjectPanel);
  const setShowSubjectPanel = useAppStore((s) => s.setShowSubjectPanel);
  const autoSpeak = useAppStore((s) => s.autoSpeak);
  const setAutoSpeak = useAppStore((s) => s.setAutoSpeak);

  const [draft, setDraft] = useState<PersonInfo>(storePerson ?? emptyPerson());
  const [tagline, setTagline] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const voiceFileInputRef = useRef<HTMLInputElement | null>(null);

  const [wikiBusy, setWikiBusy] = useState(false);
  const [wikiError, setWikiError] = useState<string | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);

  // Probe ElevenLabs availability when drawer opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/tts/clone", { method: "GET" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { available?: boolean } | null) => {
        if (!cancelled) setVoiceAvailable(Boolean(data?.available));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

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
          newPerson: "Νέο πρόσωπο",
          deletePerson: "Διαγραφή",
          switchTo: "Επιλογή",
          fetchWiki: "Από Wikipedia",
          fetching: "Φόρτωση…",
          voiceClone: "Κλωνοποίηση φωνής",
          voiceCloneSub: "Ανέβασε δείγμα ήχου (10-60 δευτερόλεπτα) για κλωνοποιημένη φωνή",
          voiceUpload: "Επιλογή ήχου",
          voiceCloned: "Φωνή κλωνοποιήθηκε ✓",
          voiceClear: "Επαναφορά",
          voiceUnavailable: "Απαιτεί ELEVENLABS_API_KEY στον server.",
          generatePortrait: "Δημιουργία πορτρέτου",
          generatingPortrait: "Σχεδιάζω…",
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
          newPerson: "New person",
          deletePerson: "Delete",
          switchTo: "Switch",
          fetchWiki: "From Wikipedia",
          fetching: "Fetching…",
          voiceClone: "Voice clone",
          voiceCloneSub: "Upload a 10-60s audio sample so the person speaks in their own voice",
          voiceUpload: "Choose audio",
          voiceCloned: "Voice cloned ✓",
          voiceClear: "Reset",
          voiceUnavailable: "Requires ELEVENLABS_API_KEY on the server.",
          generatePortrait: "Generate portrait",
          generatingPortrait: "Drawing…",
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

  const importFromWikipedia = async () => {
    if (wikiBusy) return;
    const name = draft.name.trim();
    if (!name) {
      setWikiError(lang === "el" ? "Πρόσθεσε όνομα πρώτα." : "Add a name first.");
      return;
    }
    setWikiBusy(true);
    setWikiError(null);
    try {
      const params = new URLSearchParams({ q: name, lang });
      const response = await fetch(`/api/import/wikipedia?${params.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      const data: {
        title?: string;
        description?: string;
        extract?: string;
        thumbnail?: string | null;
      } = await response.json();

      setDraft((d) => {
        const extract = data.extract?.trim() ?? "";
        const desc = data.description?.trim() ?? "";
        const joined = [desc, extract].filter(Boolean).join(". ");
        const nextExtraInfo = d.extraInfo
          ? joined
            ? `${d.extraInfo}\n\n${joined}`
            : d.extraInfo
          : joined;
        const nextImages =
          data.thumbnail && !d.images.some((img) => img.url === data.thumbnail)
            ? [
                { url: data.thumbnail, type: "image/jpeg", name: `${data.title ?? name}.jpg` },
                ...d.images,
              ]
            : d.images;
        return {
          ...d,
          name: data.title ?? d.name,
          extraInfo: nextExtraInfo,
          images: nextImages,
        };
      });
      if (data.extract) {
        const first = data.extract.split(/[.\n]/)[0]?.trim();
        if (first) setTagline(first);
      }
    } catch (error) {
      setWikiError(error instanceof Error ? error.message : "Failed");
    } finally {
      setWikiBusy(false);
    }
  };

  const generatePortrait = async () => {
    if (portraitBusy) return;
    const name = draft.name.trim();
    if (!name) {
      setPortraitError(lang === "el" ? "Όνομα πρώτα." : "Name first.");
      return;
    }
    setPortraitBusy(true);
    setPortraitError(null);
    try {
      const hint = (tagline || draft.extraInfo)?.toString().slice(0, 200) ?? "";
      const response = await fetch("/api/portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, hint, style: "portrait" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      const data: { url?: string } = await response.json();
      if (data.url) {
        setDraft((d) => ({
          ...d,
          images: [{ url: data.url!, type: "image/jpeg", name: `${name} (AI)` }, ...d.images],
        }));
      }
    } catch (error) {
      setPortraitError(error instanceof Error ? error.message : "Failed");
    } finally {
      setPortraitBusy(false);
    }
  };

  const onPickVoiceSample = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (!draft.name.trim()) {
      setVoiceError(lang === "el" ? "Όνομα πρώτα." : "Name first.");
      if (voiceFileInputRef.current) voiceFileInputRef.current.value = "";
      return;
    }

    setVoiceBusy(true);
    setVoiceError(null);
    try {
      const formData = new FormData();
      formData.append("name", draft.name.trim());
      for (const f of files) formData.append("files", f, f.name);
      const response = await fetch("/api/tts/clone", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      const data: { voiceId?: string } = await response.json();
      if (data.voiceId) {
        setDraft((d) => ({ ...d, ttsVoiceId: data.voiceId }));
      }
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : "Failed");
    } finally {
      setVoiceBusy(false);
      if (voiceFileInputRef.current) voiceFileInputRef.current.value = "";
    }
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

        {persons.length > 0 && (
          <div className="field">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {persons.map((p) => {
                const active = p.id === draft.id;
                return (
                  <div
                    key={p.id}
                    className={"chat-item " + (active ? "active" : "")}
                    onClick={() => {
                      if (p.id && !active) {
                        setCurrentPerson(p.id);
                      }
                    }}
                    style={{ borderRadius: 8 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="chat-item-title">{p.name || "—"}</div>
                      <div className="chat-item-meta">
                        {(p.mode ?? "praise").toUpperCase()} · {p.images.length}{" "}
                        {lang === "el" ? "φωτο" : "photos"}
                      </div>
                    </div>
                    {persons.length > 1 && (
                      <button
                        className="chat-item-delete"
                        aria-label={T.deletePerson}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (p.id && confirm(`${T.deletePerson} ${p.name}?`)) {
                            removePerson(p.id);
                          }
                        }}
                        style={{ opacity: 1 }}
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                className="side-link"
                style={{ width: "auto", color: "var(--clay)", marginTop: 4 }}
                onClick={() => {
                  const id = addPerson({
                    name: "",
                    images: [],
                    videos: [],
                    urls: [],
                    extraInfo: "",
                    mode: "praise",
                  });
                  setDraft({
                    id,
                    name: "",
                    images: [],
                    videos: [],
                    urls: [],
                    extraInfo: "",
                    mode: "praise",
                  });
                  setTagline("");
                }}
              >
                <Icon name="plus" size={12} /> {T.newPerson}
              </button>
            </div>
          </div>
        )}

        <div className="field">
          <label>{T.name}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder={lang === "el" ? "Όνομα προσώπου" : "Person's name"}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="side-link"
              style={{
                width: "auto",
                padding: "8px 12px",
                color: "var(--clay)",
                whiteSpace: "nowrap",
              }}
              onClick={importFromWikipedia}
              disabled={wikiBusy || !draft.name.trim()}
              title={T.fetchWiki}
            >
              <Icon name="book" size={12} />
              {wikiBusy ? T.fetching : T.fetchWiki}
            </button>
          </div>
          {wikiError && (
            <span style={{ fontSize: 11, color: "var(--clay)", marginTop: 4 }}>{wikiError}</span>
          )}
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="side-link"
              style={{
                width: "auto",
                padding: "6px 10px",
                color: "var(--clay)",
              }}
              onClick={generatePortrait}
              disabled={portraitBusy || !draft.name.trim()}
              title={T.generatePortrait}
            >
              <Icon name="sparkles" size={12} />
              {portraitBusy ? T.generatingPortrait : T.generatePortrait}
            </button>
            {portraitError && (
              <span style={{ fontSize: 11, color: "var(--clay)" }}>{portraitError}</span>
            )}
          </div>
        </div>

        <div className="field">
          <label>{T.voiceClone}</label>
          <input
            ref={voiceFileInputRef}
            type="file"
            accept="audio/*"
            multiple
            style={{ display: "none" }}
            onChange={onPickVoiceSample}
          />
          {!voiceAvailable && (
            <div className="row-toggle-sub" style={{ marginTop: 2 }}>
              {T.voiceUnavailable}
            </div>
          )}
          {voiceAvailable && draft.ttsVoiceId && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--clay)", fontSize: 13 }}>{T.voiceCloned}</span>
              <span className="mono" style={{ color: "var(--muted-2)", fontSize: 11 }}>
                {draft.ttsVoiceId.slice(0, 10)}…
              </span>
              <button
                type="button"
                className="side-link"
                style={{ width: "auto", color: "var(--muted)", marginLeft: "auto" }}
                onClick={() => setDraft((d) => ({ ...d, ttsVoiceId: undefined }))}
              >
                {T.voiceClear}
              </button>
            </div>
          )}
          {voiceAvailable && !draft.ttsVoiceId && (
            <>
              <div className="row-toggle-sub" style={{ marginTop: 2 }}>
                {T.voiceCloneSub}
              </div>
              <button
                type="button"
                className="side-link"
                style={{
                  width: "auto",
                  padding: "8px 12px",
                  marginTop: 6,
                  color: "var(--clay)",
                }}
                onClick={() => voiceFileInputRef.current?.click()}
                disabled={voiceBusy || !draft.name.trim()}
              >
                <Icon name="mic" size={12} />
                {voiceBusy ? T.fetching : T.voiceUpload}
              </button>
            </>
          )}
          {voiceError && (
            <span style={{ fontSize: 11, color: "var(--clay)", marginTop: 4 }}>{voiceError}</span>
          )}
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
