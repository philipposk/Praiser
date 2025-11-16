import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const SETTINGS_BLOB_KEY = "settings.json";

// Default settings to return when no blob exists
const DEFAULT_SETTINGS = {
  personInfo: {
    name: "Μιχάλης Κουκλάδας",
    images: [
      { url: "/uploads/images/1762934145576-wtk4h8bf7n.jpg", type: "image/jpeg", name: "1762934145576-wtk4h8bf7n.jpg" },
      { url: "/uploads/images/1762934145589-fwur6r98to.jpg", type: "image/jpeg", name: "1762934145589-fwur6r98to.jpg" },
      { url: "/uploads/images/1762934145605-g2lsch1v9ue.jpg", type: "image/jpeg", name: "1762934145605-g2lsch1v9ue.jpg" },
      { url: "/uploads/images/1762934145611-yxrei1sspz.jpeg", type: "image/jpeg", name: "1762934145611-yxrei1sspz.jpeg" },
      { url: "/uploads/images/1762934145622-iau992szepd.jpeg", type: "image/jpeg", name: "1762934145622-iau992szepd.jpeg" },
      { url: "/uploads/images/1762934145629-75nyhrxy6xi.jpg", type: "image/jpeg", name: "1762934145629-75nyhrxy6xi.jpg" },
      { url: "/uploads/images/1762934639740-surbwtqvhh.jpg", type: "image/jpeg", name: "1762934639740-surbwtqvhh.jpg" },
      { url: "/uploads/images/1762934639741-1ju429llgco.jpg", type: "image/jpeg", name: "1762934639741-1ju429llgco.jpg" },
      { url: "/uploads/images/1762934639745-q4ax61hcgih.jpg", type: "image/jpeg", name: "1762934639745-q4ax61hcgih.jpg" },
      { url: "/uploads/images/1762934639746-ajajtffmcjg.jpg", type: "image/jpeg", name: "1762934639746-ajajtffmcjg.jpg" },
      { url: "/uploads/images/1762934639747-ofdah12gt5h.jpg", type: "image/jpeg", name: "1762934639747-ofdah12gt5h.jpg" },
      { url: "/uploads/images/1762934639751-2ek4x2l79p5.jpg", type: "image/jpeg", name: "1762934639751-2ek4x2l79p5.jpg" },
      { url: "/uploads/images/1762934639792-d19x4miu1tc.jpg", type: "image/jpeg", name: "1762934639792-d19x4miu1tc.jpg" },
      { url: "/uploads/images/1762934639799-g0577p7eik.jpg", type: "image/jpeg", name: "1762934639799-g0577p7eik.jpg" },
      { url: "/uploads/images/1762934639800-hr5xjt8bwbw.jpg", type: "image/jpeg", name: "1762934639800-hr5xjt8bwbw.jpg" },
      { url: "/uploads/images/1762934639801-9eynxk6v5lg.jpg", type: "image/jpeg", name: "1762934639801-9eynxk6v5lg.jpg" },
      { url: "/uploads/images/1762934639802-i0fgrwu63va.jpg", type: "image/jpeg", name: "1762934639802-i0fgrwu63va.jpg" },
      { url: "/uploads/images/1762934639803-6nqwvaknjao.jpg", type: "image/jpeg", name: "1762934639803-6nqwvaknjao.jpg" }
    ],
    videos: [],
    urls: [],
    extraInfo:
      "Ο Μιχάλης Κουκλάδας – αλλιώς ο Μιχάλης ο Κουκλάδας, ο Κουκλάδασ, ο Κουκ, ο Μάικ, το Μιχαλιό. Είχε GLX, Kawasaki Z 750, XT 500 R και έκανε σουζες. Τώρα είναι κυριλές, έχει Beverly και φοράει κράνος. Είναι τούμπανο, είναι φέτες."
  },
  praiseBarVisible: true,
  praiseMode: "manual",
  manualPraiseVolume: 70,
  siteName: "Praiser",
  siteSubtitle: "AI Praise Assistant",
  chats: [],
};

// Store the blob URL in memory after first save (will be lost on server restart, but that's okay)
let cachedBlobUrl: string | null = null;

export async function GET() {
  try {
    console.log("GET /api/settings - Starting to load settings from blob");
    
    // Try to list all blobs to find our settings
    try {
      const { blobs } = await list({
        limit: 100, // Get more blobs to find our settings
      });

      console.log(`Found ${blobs.length} blobs total`);
      
      // Find the exact match or any blob with "settings" in the name
      const settingsBlob = blobs.find(blob => {
        const path = blob.pathname || blob.url || "";
        return path === SETTINGS_BLOB_KEY || 
               path.includes("settings.json") ||
               path.endsWith("settings.json") ||
               path.includes("settings");
      });

      if (settingsBlob) {
        console.log("Found settings blob:", {
          pathname: settingsBlob.pathname,
          url: settingsBlob.url,
        });
        cachedBlobUrl = settingsBlob.url;

        // Fetch the blob content
        const response = await fetch(settingsBlob.url, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        
        if (!response.ok) {
          console.error("Failed to fetch blob content:", response.status, response.statusText);
          console.log("Returning default settings due to fetch error");
          return NextResponse.json({ settings: DEFAULT_SETTINGS });
        }

        const data = await response.text();
        console.log("Blob content length:", data.length);
        
        if (!data || data.trim().length === 0) {
          console.log("Blob content is empty - returning default settings");
          return NextResponse.json({ settings: DEFAULT_SETTINGS });
        }

        const settings = JSON.parse(data);
        console.log("Settings loaded from blob successfully:", {
          hasPersonInfo: !!settings.personInfo,
          praiseBarVisible: settings.praiseBarVisible,
          praiseMode: settings.praiseMode,
          siteName: settings.siteName,
          chatsCount: settings.chats?.length || 0,
        });
        // Merge with defaults to ensure all fields are present
        return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, ...settings } });
      } else {
        console.log("No settings blob found in list. Available blobs:", blobs.map(b => b.pathname || b.url));
      }
    } catch (listError: any) {
      console.error("Error listing blobs:", {
        message: listError.message,
        stack: listError.stack,
        name: listError.name,
      });
    }

    // If we have a cached URL, try to use it
    if (cachedBlobUrl) {
      console.log("Trying cached blob URL:", cachedBlobUrl);
      try {
        const response = await fetch(cachedBlobUrl, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        
        if (response.ok) {
          const data = await response.text();
          const settings = JSON.parse(data);
          console.log("Settings loaded from cached blob URL");
          // Merge with defaults to ensure all fields are present
          return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, ...settings } });
        } else {
          console.log("Cached URL failed:", response.status, response.statusText);
        }
      } catch (fetchError: any) {
        console.error("Failed to fetch from cached URL:", fetchError.message);
        cachedBlobUrl = null;
      }
    }

    console.log("No settings blob found - returning default settings");
    return NextResponse.json({ 
      settings: DEFAULT_SETTINGS, 
      message: "No custom settings found, using defaults",
    });
  } catch (error: any) {
    console.error("Error reading settings from blob:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    // Return defaults even on error to ensure consistent behavior
    return NextResponse.json({ 
      settings: DEFAULT_SETTINGS, 
      error: error.message || "Unknown error",
      message: "Using default settings due to error",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/settings - Starting to save settings to blob");
    
    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: "No settings provided" },
        { status: 400 }
      );
    }

    console.log("Saving settings to blob...", {
      personInfo: settings.personInfo ? "present" : "null",
      praiseBarVisible: settings.praiseBarVisible,
      praiseMode: settings.praiseMode,
      siteName: settings.siteName,
      chatsCount: settings.chats?.length || 0,
    });

    // Convert settings to JSON string
    const settingsJson = JSON.stringify(settings, null, 2);
    console.log("Settings JSON size:", settingsJson.length, "bytes");
    
    const settingsBlob = new Blob([settingsJson], { type: "application/json" });

    console.log("Calling put() with key:", SETTINGS_BLOB_KEY);
    
    // Save to Vercel Blob
    // Using a consistent key - Vercel Blob requires allowOverwrite to overwrite existing blobs
    const blob = await put(SETTINGS_BLOB_KEY, settingsBlob, {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true, // CRITICAL: Allow overwriting existing settings blob
    });

    console.log("Settings saved to blob successfully:", {
      url: blob.url,
      pathname: blob.pathname,
    });
    
    // Cache the URL for faster retrieval
    cachedBlobUrl = blob.url;
    return NextResponse.json({ 
      success: true, 
      url: blob.url,
      pathname: blob.pathname,
      message: "Settings saved successfully",
    });
  } catch (error: any) {
    console.error("Error saving settings to blob:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    
    // Check if it's an authentication error
    if (error.message?.includes("token") || 
        error.message?.includes("unauthorized") || 
        error.message?.includes("401") ||
        error.message?.includes("403")) {
      console.error("Vercel Blob authentication error. Please check BLOB_READ_WRITE_TOKEN environment variable.");
      return NextResponse.json(
        { 
          error: "Blob storage not configured", 
          details: "Please set BLOB_READ_WRITE_TOKEN environment variable in Vercel.",
          message: error.message,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to save settings", 
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}

