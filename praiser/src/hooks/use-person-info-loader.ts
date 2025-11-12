"use client";

import { useEffect } from "react";
import { useAppStore } from "@/state/app-store";

export const usePersonInfoLoader = () => {
  // Person info is now loaded from localStorage via loadStoredSettings
  // This hook is kept for compatibility but no longer needs to fetch from API
  // The personInfo will be loaded automatically when loadStoredSettings() is called
};

