"use client";

import { useEffect, useState } from "react";

import { ChatPanel } from "@/components/chat/chat-panel";
import { SettingsDrawer } from "@/components/settings/settings-drawer";
import { Sidebar } from "@/components/sidebar/sidebar";
import { SubjectPanel } from "@/components/subject/subject-panel";
import { Icon } from "@/components/ui/icon";
import { Lightbox } from "@/components/ui/lightbox";
import { useLiveVoiceMode } from "@/hooks/use-live-voice-mode";
import { usePraiseMode } from "@/hooks/use-praise-mode";
import { loadStoredSettings, useAppStore } from "@/state/app-store";

export default function Home() {
  const showSubjectPanel = useAppStore((s) => s.showSubjectPanel);
  const uiLanguage = useAppStore((s) => s.uiLanguage);

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Mount-time effects
  useEffect(() => {
    void loadStoredSettings();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("lang", uiLanguage);
  }, [uiLanguage]);

  usePraiseMode();
  // Mount live voice orchestrator so liveMode store flag has effect.
  useLiveVoiceMode();

  return (
    <>
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle sidebar"
      >
        <Icon name={mobileOpen ? "x" : "menu"} size={18} />
      </button>

      <div className={"app " + (showSubjectPanel ? "" : "no-subject")}>
        <div
          className={"sidebar-col " + (mobileOpen ? "mobile-open" : "")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileOpen(false);
          }}
        >
          <Sidebar />
        </div>

        <ChatPanel onImageClick={setLightboxSrc} />

        {showSubjectPanel && <SubjectPanel onImageClick={setLightboxSrc} />}
      </div>

      <SettingsDrawer />
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  );
}
