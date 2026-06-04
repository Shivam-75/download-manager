import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { Heart } from "lucide-react";
import {
  fetchDownloads,
  clearAllDownloads,
  fetchStorageStats,
} from "../api/apies";

// Centralized global cache in memory
const globalCache = new Map();

export default function Layout() {
  const [records, setRecords] = useState([]);
  const [downloadPath, setDownloadPath] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [storageStats, setStorageStats] = useState({
    totalBytes: 0,
    freeBytes: 0,
    usedBytes: 0,
  });
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState("");
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };
  const setInCache = (key, value) => {
    globalCache.set(key, value);
  };

  const getFromCache = (key) => {
    return globalCache.get(key);
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Initial fetch on mount
  useEffect(() => {
    const initFetch = async () => {
      setIsLoading(true);
      try {
        const data = await fetchDownloads();
        setRecords(data);
      } catch (err) {
        console.error("Initial downloads sync failed:", err.message);
      } finally {
        setIsLoading(false);
      }
    };
    initFetch();
  }, []);

  const hasActiveDownloads = records.some(
    (r) => r.status === "downloading" || r.status === "queued",
  );

  // Poll backend download logs ONLY when active downloads are in progress
  useEffect(() => {
    if (!hasActiveDownloads) return;

    let active = true;
    let timerId = null;

    const poll = async () => {
      try {
        const data = await fetchDownloads();
        if (active) {
          setRecords(data);
        }
      } catch (err) {
        console.error("Failed to sync downloads from server:", err.message);
      } finally {
        if (active) {
          timerId = setTimeout(poll, 1500);
        }
      }
    };

    timerId = setTimeout(poll, 1500);

    return () => {
      active = false;
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [hasActiveDownloads]);

  // Fetch storage stats when downloadPath changes
  useEffect(() => {
    let active = true;
    const loadStorage = async () => {
      try {
        const stats = await fetchStorageStats(downloadPath || "");
        if (active) {
          setStorageStats(stats);
        }
      } catch (err) {
        console.error("Failed to load storage stats:", err.message);
      }
    };

    loadStorage();

    return () => {
      active = false;
    };
  }, [downloadPath]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerToast("Initiating active network refresh...");
    globalCache.clear();
    try {
      const data = await fetchDownloads();
      setRecords(data);

      if (downloadPath) {
        const stats = await fetchStorageStats(downloadPath);
        setStorageStats(stats);
      }

      setTimeout(() => {
        setIsRefreshing(false);
        triggerToast("All download status metrics updated!");
      }, 500);
    } catch (err) {
      setIsRefreshing(false);
      triggerToast("Failed to refresh: Server offline");
    }
  };

  const handleClearHistory = async () => {
    if (records.length === 0) {
      triggerToast("Download history is already empty!");
      return;
    }
    if (
      confirm(
        "Are you sure you want to clear ALL media download logs from database?",
      )
    ) {
      try {
        await clearAllDownloads();
        setRecords([]);
        triggerToast("Download history cleared successfully.");
      } catch (err) {
        triggerToast("Failed to clear database history logs.");
      }
    }
  };

  return (
    <div className="relative h-screen w-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-black dark:text-slate-100 transition-colors duration-200 selection:bg-indigo-500/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl animate-slideUp text-sm">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{toastMessage}</span>
        </div>
      )}

      {/* Decorative Ambient Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px]"></div>
      <div className="pointer-events-none absolute top-1/3 -right-60 h-[700px] w-[700px] rounded-full bg-violet-600/3 dark:bg-violet-600/5 blur-[150px]"></div>

      {/* Navigation Header */}
      <Navbar
        onRefresh={handleRefresh}
        onClearHistory={handleClearHistory}
        isRefreshing={isRefreshing}
        youtubeSearchQuery={youtubeSearchQuery}
        setYoutubeSearchQuery={setYoutubeSearchQuery}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Page Area */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10">
          <Outlet
            context={{
              records,
              setRecords,
              isRefreshing,
              handleRefresh,
              downloadPath,
              setDownloadPath,
              storageStats,
              triggerToast,
              isLoading,
              youtubeSearchQuery,
              setYoutubeSearchQuery,
              getFromCache,
              setInCache,
              theme,
              toggleTheme,
            }}
          />
        </main>
      </div>
    </div>
  );
}
