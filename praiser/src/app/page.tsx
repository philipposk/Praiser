"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Sidebar } from "@/components/sidebar/sidebar";
import { AdminPanel } from "@/components/admin/admin-panel";
import { useAppStore, loadStoredSettings } from "@/state/app-store";
import { usePersonInfoLoader } from "@/hooks/use-person-info-loader";
import { usePraiseMode } from "@/hooks/use-praise-mode";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Load stored settings from API (with localStorage fallback) on client mount
  useEffect(() => {
    loadStoredSettings().catch((error) => {
      console.error("Error loading settings:", error);
    });
  }, []);
  
  // Load person info on app startup
  usePersonInfoLoader();
  // Handle praise mode logic
  usePraiseMode();

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background touch-manipulation">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-black/40 p-3 text-white/80 backdrop-blur-sm lg:hidden touch-manipulation"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with mobile overlay */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-transform duration-300 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Sidebar 
          onClose={() => setSidebarOpen(false)} 
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <ChatPanel />
      </div>
      <AdminPanel 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
    </main>
  );
}

