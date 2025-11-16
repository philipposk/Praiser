"use client";

import { useState } from "react";
import { Settings, X, Lock, Eye, EyeOff, AlertCircle, Check } from "lucide-react";
import { useAppStore, type PraiseMode, saveSettingsToServer } from "@/state/app-store";
import { cn } from "@/lib/utils";
import { PersonInputPanel } from "@/components/person/person-input-panel";
import { PraiseVolumeControl } from "@/components/praise/praise-volume-control";

const ADMIN_USERNAME = "username";
const ADMIN_PASSWORD = "password";

export const AdminPanel = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savedStates, setSavedStates] = useState<{
    praiseMode?: boolean;
    praiseBarVisible?: boolean;
    manualPraiseVolume?: boolean;
    siteName?: boolean;
    siteSubtitle?: boolean;
  }>({});
  
  const praiseBarVisible = useAppStore((state) => state.praiseBarVisible);
  const setPraiseBarVisible = useAppStore((state) => state.setPraiseBarVisible);
  const praiseMode = useAppStore((state) => state.praiseMode);
  const setPraiseMode = useAppStore((state) => state.setPraiseMode);
  const manualPraiseVolume = useAppStore((state) => state.manualPraiseVolume);
  const setManualPraiseVolume = useAppStore((state) => state.setManualPraiseVolume);
  const siteName = useAppStore((state) => state.siteName);
  const setSiteName = useAppStore((state) => state.setSiteName);
  const siteSubtitle = useAppStore((state) => state.siteSubtitle);
  const setSiteSubtitle = useAppStore((state) => state.setSiteSubtitle);

  // Show checkmark when settings are changed and save immediately
  const handlePraiseModeChange = (mode: PraiseMode) => {
    setPraiseMode(mode);
    // Save immediately for admin settings
    setTimeout(() => saveSettingsToServer(true), 100);
    setSavedStates((prev) => ({ ...prev, praiseMode: true }));
    setTimeout(() => setSavedStates((prev) => ({ ...prev, praiseMode: false })), 2000);
  };

  const handlePraiseBarVisibleChange = () => {
    setPraiseBarVisible(!praiseBarVisible);
    // Save immediately for admin settings
    setTimeout(() => saveSettingsToServer(true), 100);
    setSavedStates((prev) => ({ ...prev, praiseBarVisible: true }));
    setTimeout(() => setSavedStates((prev) => ({ ...prev, praiseBarVisible: false })), 2000);
  };

  const handleManualPraiseVolumeChange = (value: number) => {
    setManualPraiseVolume(value);
    // Save immediately for admin settings
    setTimeout(() => saveSettingsToServer(true), 100);
    setSavedStates((prev) => ({ ...prev, manualPraiseVolume: true }));
    setTimeout(() => setSavedStates((prev) => ({ ...prev, manualPraiseVolume: false })), 2000);
  };

  const handleSiteNameChange = (value: string) => {
    setSiteName(value);
    // Save immediately for admin settings
    setTimeout(() => saveSettingsToServer(true), 100);
    setSavedStates((prev) => ({ ...prev, siteName: true }));
    setTimeout(() => setSavedStates((prev) => ({ ...prev, siteName: false })), 2000);
  };

  const handleSiteSubtitleChange = (value: string) => {
    setSiteSubtitle(value);
    // Save immediately for admin settings
    setTimeout(() => saveSettingsToServer(true), 100);
    setSavedStates((prev) => ({ ...prev, siteSubtitle: true }));
    setTimeout(() => setSavedStates((prev) => ({ ...prev, siteSubtitle: false })), 2000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setUsername("");
      setPassword("");
    } else {
      setLoginError("Invalid credentials");
    }
  };

  const handleLogout = async () => {
    // Check if we need to show notification for locked mode
    if (praiseMode === "manual" && !praiseBarVisible) {
      const confirmed = window.confirm(
        "The intensity is locked at " + manualPraiseVolume + "% and hidden from users. Are you sure you want to exit?"
      );
      if (!confirmed) return;
    }
    
    // Get current state to ensure we save the latest person info
    const currentState = useAppStore.getState();
    console.log("💾 Saving all settings before closing admin panel...", {
      hasPersonInfo: !!currentState.personInfo,
      personName: currentState.personInfo?.name || "none",
      imagesCount: currentState.personInfo?.images?.length || 0,
      praiseMode: currentState.praiseMode,
      praiseBarVisible: currentState.praiseBarVisible,
    });
    
    // Force immediate save of ALL settings
    saveSettingsToServer(true); // Immediate save
    
    // Wait a moment for the save to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log("✅ Settings save initiated, closing panel...");
    setIsAuthenticated(false);
    onClose();
  };

  // Show notification when trying to close panel with locked mode
  const handleClose = () => {
    if (isAuthenticated && praiseMode === "manual" && !praiseBarVisible) {
      const confirmed = window.confirm(
        "The intensity is locked at " + manualPraiseVolume + "% and hidden from users. Are you sure you want to exit?"
      );
      if (!confirmed) return;
    }
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  // Get mode description
  const getModeDescription = () => {
    if (!praiseBarVisible) {
      if (praiseMode === "manual") {
        return `Praise level locked at ${manualPraiseVolume}%`;
      } else if (praiseMode === "auto-random") {
        return "Praise level changes automatically (users cannot adjust)";
      } else if (praiseMode === "crescendo") {
        return "Praise level increases automatically (users cannot adjust)";
      }
    } else {
      return "Users can change the praise level on their own";
    }
    return "";
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={() => !isAuthenticated && handleClose()}
        aria-hidden="true"
      />
      
      {/* Admin Panel */}
      <div className={cn(
        "fixed z-50 w-[90vw] max-w-md rounded-2xl border border-white/5 bg-black/80 backdrop-blur-xl shadow-2xl",
        !isAuthenticated 
          ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
          : "bottom-4 right-4"
      )}>
        {!isAuthenticated ? (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-white/40" />
                <h2 className="text-base font-medium text-white/60">Admin</h2>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-username" className="mb-2 block text-xs font-medium text-white/80">
                  Username
                </label>
                <input
                  id="admin-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  autoFocus
                />
              </div>
              
              <div>
                <label htmlFor="admin-password" className="mb-2 block text-xs font-medium text-white/80">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 pr-10 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              {loginError && (
                <p className="text-sm text-rose-400">{loginError}</p>
              )}
              
              <button
                type="submit"
                className="w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition hover:shadow-accent/50"
              >
                Login
              </button>
            </form>
          </div>
        ) : (
          <div className="flex max-h-[80vh] flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-white">Admin Settings</h2>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Logout"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto p-4 space-y-4">
              {/* Praise Mode Selection */}
              <div className="relative rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Intensity Mode</h3>
                  {savedStates.praiseMode && (
                    <Check className="h-4 w-4 text-green-400 animate-in fade-in" />
                  )}
                </div>
                <div className="space-y-2">
                  {(["auto-random", "crescendo", "manual"] as PraiseMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handlePraiseModeChange(mode)}
                      className={cn(
                        "w-full rounded-lg border px-4 py-3 text-left transition",
                        praiseMode === mode
                          ? "border-accent bg-accent/20 text-white"
                          : "border-white/10 bg-black/40 text-white/70 hover:border-white/20 hover:bg-black/60"
                      )}
                    >
                      <div className="font-medium">
                        {mode === "auto-random" && "Auto-Random"}
                        {mode === "crescendo" && "Crescendo"}
                        {mode === "manual" && "Manual"}
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        {mode === "auto-random" && "Intensity changes randomly (0, 100, and 3 middle values) within 5 questions"}
                        {mode === "crescendo" && "Starts at 0, goes to 100 in 10 questions, then resets"}
                        {mode === "manual" && "Admin controls the intensity level"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bar Visibility Toggle - Always shown */}
              <div className="relative rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white">Bar Visibility</h3>
                      {savedStates.praiseBarVisible && (
                        <Check className="h-4 w-4 text-green-400 animate-in fade-in" />
                      )}
                    </div>
                    <p className="text-xs text-white/60">
                      {praiseBarVisible 
                        ? "Users can adjust the intensity"
                        : "Bar is hidden - intensity is locked"}
                    </p>
                  </div>
                  <button
                    onClick={handlePraiseBarVisibleChange}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition shrink-0",
                      praiseBarVisible ? "bg-accent" : "bg-white/20"
                    )}
                    aria-label={praiseBarVisible ? "Hide bar" : "Show bar"}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition",
                        praiseBarVisible ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Mode Status Notification */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-300 mb-1">
                      {praiseMode === "auto-random" && "Auto-Random Mode"}
                      {praiseMode === "crescendo" && "Crescendo Mode"}
                      {praiseMode === "manual" && "Manual Mode"}
                    </p>
                    <p className="text-xs text-white/70">
                      {getModeDescription()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual Intensity Control (shown when bar is hidden in manual mode) */}
              {praiseMode === "manual" && !praiseBarVisible && (
                <div className="relative rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="mb-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-amber-400">Locked Intensity</h3>
                        {savedStates.manualPraiseVolume && (
                          <Check className="h-4 w-4 text-green-400 animate-in fade-in" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-white/70">
                        The intensity is locked at this level and hidden from users
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/80">Intensity Level</span>
                      <span className="text-sm font-semibold text-amber-400">{manualPraiseVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={manualPraiseVolume}
                      onChange={(e) => handleManualPraiseVolumeChange(Number(e.target.value))}
                      className="w-full h-2 rounded-full bg-white/10 appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              )}
              
              {/* Site Name */}
              <div className="relative rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Site Name</h3>
                  {savedStates.siteName && (
                    <Check className="h-4 w-4 text-green-400 animate-in fade-in" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => handleSiteNameChange(e.target.value)}
                    placeholder="Enter site name"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  />
                  <p className="text-xs text-white/60">
                    The site name will appear in the title and the logo will show the first letter.
                  </p>
                </div>
              </div>

              {/* Site Subtitle */}
              <div className="relative rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Site Subtitle</h3>
                  {savedStates.siteSubtitle && (
                    <Check className="h-4 w-4 text-green-400 animate-in fade-in" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={siteSubtitle}
                    onChange={(e) => handleSiteSubtitleChange(e.target.value)}
                    placeholder="Enter site subtitle"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  />
                  <p className="text-xs text-white/60">
                    The subtitle appears below the site name in the empty chat state.
                  </p>
                </div>
              </div>
              
              {/* Person Management */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">Person</h3>
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <PersonInputPanel />
                </div>
              </div>
            </div>
            
            {/* Footer with Done Button */}
            <div className="border-t border-white/10 p-4">
              <button
                onClick={handleLogout}
                className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition hover:shadow-accent/50"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

