"use client";

/**
 * Brand alias: praiser.app/roast
 *
 * Sets the default starter-card mode to "roast" then immediately redirects
 * to the main app. The store's `startMode` field drives EmptyState so the
 * user lands with roast prompts without needing a person pre-loaded.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/state/app-store";

export default function RoastAlias() {
  const setStartMode = useAppStore((s) => s.setStartMode);
  const router = useRouter();

  useEffect(() => {
    setStartMode("roast");
    router.replace("/");
  }, [setStartMode, router]);

  return null;
}
