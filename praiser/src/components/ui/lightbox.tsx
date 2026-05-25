"use client";

import { useEffect } from "react";

import { Icon } from "@/components/ui/icon";

type Props = {
  src: string | null;
  onClose: () => void;
};

export const Lightbox = ({ src, onClose }: Props) => {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div className="lightbox" onClick={onClose}>
      <button className="close" onClick={onClose} aria-label="Close">
        <Icon name="x" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" onClick={(e) => e.stopPropagation()} />
    </div>
  );
};
