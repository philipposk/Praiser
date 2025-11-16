"use client";

import { useState, useRef, useEffect } from "react";
import { User, Image as ImageIcon, Video, Link as LinkIcon, FileText, X, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useAppStore } from "@/state/app-store";
import { cn } from "@/lib/utils";
import type { MessageImage } from "@/lib/types";

export const PersonInputPanel = () => {
  const personInfo = useAppStore((state) => state.personInfo);
  const setPersonInfo = useAppStore((state) => state.setPersonInfo);
  
  const [name, setName] = useState(personInfo?.name || "");
  const [images, setImages] = useState<MessageImage[]>(personInfo?.images || []);
  const [videos, setVideos] = useState<Array<{ url: string; type: string; name?: string }>>(personInfo?.videos || []);
  const [urls, setUrls] = useState<string[]>(personInfo?.urls || []);
  const [extraInfo, setExtraInfo] = useState(personInfo?.extraInfo || "");
  const [newUrl, setNewUrl] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(!!personInfo?.name);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isInitializingRef = useRef(true);
  const hasInitializedRef = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load person info from store (which loads from localStorage)
  useEffect(() => {
    if (personInfo) {
      isInitializingRef.current = true;
      setName(personInfo.name || "");
      setImages(personInfo.images || []);
      setVideos(personInfo.videos || []);
      setUrls(personInfo.urls || []);
      setExtraInfo(personInfo.extraInfo || "");
      setIsCollapsed(!!personInfo.name);
      // Reset flag after a brief delay to allow state to settle
      setTimeout(() => {
        isInitializingRef.current = false;
        hasInitializedRef.current = true;
      }, 100);
    } else if (!hasInitializedRef.current) {
      // If no personInfo and we haven't initialized yet, mark as initialized
      setTimeout(() => {
        isInitializingRef.current = false;
        hasInitializedRef.current = true;
      }, 100);
    }
  }, [personInfo]);

  // Auto-save to store whenever fields change (debounced, not during initialization)
  useEffect(() => {
    // Skip auto-save during initialization or if nothing is filled
    if (isInitializingRef.current) {
      return;
    }
    
    // Don't auto-save if name is empty and no other data (user hasn't started yet)
    if (!name.trim() && images.length === 0 && videos.length === 0 && urls.length === 0 && !extraInfo.trim()) {
      return;
    }
    
    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Debounce auto-save by 1 second (to avoid too many saves while typing)
    autoSaveTimeoutRef.current = setTimeout(() => {
      const personData = {
        name: name.trim(),
        images,
        videos,
        urls: urls.filter(u => u.trim()),
        extraInfo: extraInfo.trim(),
      };
      
      // Check if images are data URLs (base64) - these are too large for blob storage
      const hasDataUrls = images.some(img => img.url.startsWith('data:'));
      if (hasDataUrls) {
        console.warn("⚠️ Some images are data URLs - they need to be uploaded first!");
      }
      
      // Auto-save to store (which triggers immediate API save)
      console.log("💾 Auto-saving person info to store...", {
        name: personData.name || "unnamed",
        imagesCount: personData.images.length,
        hasDataUrls,
      });
      
      try {
        setPersonInfo(personData);
        console.log("✅ Person info saved to store successfully");
      } catch (error) {
        console.error("❌ Error saving person info to store:", error);
      }
    }, 1000); // 1 second debounce
    
    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [name, images, videos, urls, extraInfo, setPersonInfo]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const personData = {
        name: name.trim(),
        images,
        videos,
        urls: urls.filter(u => u.trim()),
        extraInfo: extraInfo.trim(),
      };
      
      // Save to store (which also saves to localStorage and API)
      setPersonInfo(personData);
      
      setIsCollapsed(true);
    } catch (error) {
      console.error("Error saving person info:", error);
      alert("Failed to save person info. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!file.type.startsWith("image/")) {
          console.warn("Skipping non-image file:", file.name);
          return null;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "image");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();
        return {
          url: data.url,
          type: data.type,
          name: data.name,
        } as MessageImage;
      });

      const uploadedImages = (await Promise.all(uploadPromises)).filter(
        (img) => img !== null
      ) as MessageImage[];

      setImages((prev) => [...prev, ...uploadedImages]);
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Failed to upload some images. Please try again.");
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const handleVideoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!file.type.startsWith("video/")) {
          console.warn("Skipping non-video file:", file.name);
          return null;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "video");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();
        return {
          url: data.url,
          type: data.type,
          name: data.name,
        };
      });

      const uploadedVideos = (await Promise.all(uploadPromises)).filter(
        (video) => video !== null
      ) as Array<{ url: string; type: string; name?: string }>;

      setVideos((prev) => [...prev, ...uploadedVideos]);
    } catch (error) {
      console.error("Error uploading videos:", error);
      alert("Failed to upload some videos. Please try again.");
    } finally {
      setIsUploading(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const addUrl = () => {
    if (newUrl.trim() && !urls.includes(newUrl.trim())) {
      setUrls((prev) => [...prev, newUrl.trim()]);
      setNewUrl("");
    }
  };

  const removeUrl = (index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const hasPersonInfo = personInfo && personInfo.name.trim();

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 shadow-lg shadow-black/40 backdrop-blur">
      <div 
        className="mb-4 flex cursor-pointer items-center justify-between"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Person</p>
          {isCollapsed && hasPersonInfo ? (
            <h2 className="mt-1 text-xl font-semibold text-white">{personInfo.name}</h2>
          ) : (
            <h2 className="mt-1 text-xl font-semibold text-white">Who is this about?</h2>
          )}
          {isCollapsed && hasPersonInfo && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/60">
              {personInfo.images.length > 0 && (
                <span className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {personInfo.images.length} image{personInfo.images.length !== 1 ? 's' : ''}
                </span>
              )}
              {personInfo.videos.length > 0 && (
                <span className="flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  {personInfo.videos.length} video{personInfo.videos.length !== 1 ? 's' : ''}
                </span>
              )}
              {personInfo.urls.length > 0 && (
                <span className="flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  {personInfo.urls.length} URL{personInfo.urls.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
          className="ml-4 rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </button>
      </div>

      <div className={cn("space-y-4 transition-all duration-300", isCollapsed ? "max-h-0 overflow-hidden opacity-0" : "max-h-[2000px] opacity-100")}>
        {/* Name Input */}
        <div>
          <label htmlFor="person-name" className="mb-2 block text-xs font-medium text-white/80">
            <User className="mr-2 inline h-4 w-4" />
            Name
          </label>
          <input
            id="person-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter the person's name"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
          />
        </div>

        {/* Images */}
        <div>
          <label className="mb-2 block text-xs font-medium text-white/80">
            <ImageIcon className="mr-2 inline h-4 w-4" />
            Images
          </label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploading}
            className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Add Images"}
          </button>
          {images.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={img.url}
                    alt={img.name || `Image ${idx + 1}`}
                    className="h-20 w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -right-1 -top-1 rounded-full bg-rose-500 p-0.5 text-white transition hover:bg-rose-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Videos */}
        <div>
          <label className="mb-2 block text-xs font-medium text-white/80">
            <Video className="mr-2 inline h-4 w-4" />
            Videos
          </label>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg"
            multiple
            className="hidden"
            onChange={handleVideoSelect}
          />
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={isUploading}
            className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Add Videos"}
          </button>
          {videos.length > 0 && (
            <div className="mt-2 space-y-2">
              {videos.map((video, idx) => (
                <div key={idx} className="relative flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 p-2">
                  <Video className="h-4 w-4 text-white/60" />
                  <span className="flex-1 truncate text-xs text-white/80">{video.name || `Video ${idx + 1}`}</span>
                  <button
                    type="button"
                    onClick={() => removeVideo(idx)}
                    className="rounded-full bg-rose-500 p-1 text-white transition hover:bg-rose-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* URLs */}
        <div>
          <label className="mb-2 block text-xs font-medium text-white/80">
            <LinkIcon className="mr-2 inline h-4 w-4" />
            URLs (to study)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUrl()}
              placeholder="https://..."
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={addUrl}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10"
            >
              Add
            </button>
          </div>
          {urls.length > 0 && (
            <div className="mt-2 space-y-1">
              {urls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 p-2">
                  <LinkIcon className="h-3 w-3 text-white/60" />
                  <span className="flex-1 truncate text-xs text-white/80">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeUrl(idx)}
                    className="rounded-full bg-rose-500 p-1 text-white transition hover:bg-rose-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Extra Info */}
        <div>
          <label htmlFor="extra-info" className="mb-2 block text-xs font-medium text-white/80">
            <FileText className="mr-2 inline h-4 w-4" />
            Extra Info
          </label>
          <textarea
            id="extra-info"
            value={extraInfo}
            onChange={(e) => setExtraInfo(e.target.value)}
            placeholder="Any additional information about this person..."
            rows={3}
            className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
          />
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || isSaving || isUploading}
          className={cn(
            "w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition hover:shadow-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {isSaving ? "Saving..." : "Save Person Info"}
        </button>
      </div>
    </section>
  );
};

