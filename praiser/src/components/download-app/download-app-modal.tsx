"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone, QrCode, Apple, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

type DeviceType = "desktop" | "tablet" | "mobile";
type Platform = "ios" | "android" | "unknown";

export const DownloadAppModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [currentUrl, setCurrentUrl] = useState(
    typeof window !== "undefined" ? window.location.href : ""
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
      
      // Detect device type
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const width = window.innerWidth;
      
      // Detect platform
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
      const isAndroid = /android/i.test(userAgent);
      
      if (isIOS) {
        setPlatform("ios");
      } else if (isAndroid) {
        setPlatform("android");
      }
      
      // Detect device type (rough heuristic)
      // Check if it's a touch device to better distinguish tablets from desktops
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      if (width >= 1024 && !isTouchDevice) {
        // Desktop: large screen and no touch
        setDeviceType("desktop");
      } else if (width >= 768 || (width >= 1024 && isTouchDevice)) {
        // Tablet: medium screen or large screen with touch
        setDeviceType("tablet");
      } else {
        // Mobile: small screen
        setDeviceType("mobile");
      }
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const showQRCode = deviceType === "desktop";
  
  // Don't show modal on mobile devices - they can install directly
  const isMobileDevice = deviceType === "mobile";

  return (
    <>
      {/* Download App Button - Hidden on mobile */}
      {!isMobileDevice && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <Download className="h-4 w-4" />
          <span>Download App</span>
        </button>
      )}

      {/* Modal - Only show on desktop/tablet */}
      {isOpen && !isMobileDevice && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />
          
          {/* Modal Content */}
          <div className="fixed top-1/2 left-1/2 z-50 flex h-[90vh] max-h-[90vh] w-[90vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                  <Smartphone className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Install App</h2>
                  <p className="text-sm text-white/60">Add to your home screen</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="min-h-0 flex-1 overflow-y-auto p-6 pb-8">
              <div className="space-y-6">
                  {showQRCode ? (
                    /* Desktop: Show QR Code */
                    <div className="flex flex-col items-center gap-6 rounded-xl border border-white/10 bg-white/5 p-6">
                      <div className="text-center">
                        <QrCode className="mx-auto mb-3 h-8 w-8 text-accent" />
                        <h3 className="mb-2 text-lg font-semibold text-white">Scan to Install</h3>
                        <p className="text-sm text-white/60">
                          Scan this QR code with your mobile device to open the website
                        </p>
                      </div>
                      {currentUrl && (
                        <div className="rounded-xl bg-white p-4">
                          <QRCodeSVG
                            value={currentUrl}
                            size={200}
                            level="H"
                            includeMargin={false}
                          />
                        </div>
                      )}
                      <div className="w-full space-y-4">
                        <PlatformInstructions platform="ios" />
                        <PlatformInstructions platform="android" />
                      </div>
                    </div>
                  ) : (
                    /* Mobile/Tablet: Show platform-specific instructions */
                    <div className="space-y-4">
                      {platform === "ios" ? (
                        <PlatformInstructions platform="ios" />
                      ) : platform === "android" ? (
                        <PlatformInstructions platform="android" />
                      ) : (
                        <>
                          <PlatformInstructions platform="ios" />
                          <PlatformInstructions platform="android" />
                        </>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

const PlatformInstructions = ({ platform }: { platform: "ios" | "android" }) => {
  const isIOS = platform === "ios";
  const Icon = isIOS ? Apple : Smartphone;
  const platformName = isIOS ? "iOS" : "Android";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          isIOS ? "bg-black/40" : "bg-green-500/20"
        )}>
          <Icon className={cn(
            "h-5 w-5",
            isIOS ? "text-white" : "text-green-400"
          )} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">{platformName}</h3>
          <p className="text-xs text-white/50">Mobile device</p>
        </div>
      </div>
      
      <ol className="space-y-4 text-sm leading-relaxed text-white/90">
        {isIOS ? (
          <>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                1
              </span>
              <div className="flex-1 pt-0.5">
                <span>Tap the <strong className="text-white">Share</strong> button <ShareIcon /> at the bottom of your screen</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                2
              </span>
              <div className="flex-1 pt-0.5">
                <span>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                3
              </span>
              <div className="flex-1 pt-0.5">
                <span>Tap <strong className="text-white">"Add"</strong> in the top right corner</span>
              </div>
            </li>
          </>
        ) : (
          <>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                1
              </span>
              <div className="flex-1 pt-0.5">
                <span>Tap the <strong className="text-white">Menu</strong> button <span className="text-white/50">(⋮)</span> in the top right corner</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                2
              </span>
              <div className="flex-1 pt-0.5">
                <span>Select <strong className="text-white">"Add to Home screen"</strong> or <strong className="text-white">"Install app"</strong></span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                3
              </span>
              <div className="flex-1 pt-0.5">
                <span>Tap <strong className="text-white">"Add"</strong> or <strong className="text-white">"Install"</strong> to confirm</span>
              </div>
            </li>
          </>
        )}
      </ol>
    </div>
  );
};

const ShareIcon = () => (
  <span className="ml-1 inline-flex items-center justify-center">
    <Share2 className="h-4 w-4 text-white/60" />
  </span>
);

