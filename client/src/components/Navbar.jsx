import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Download,
  History as HistoryIcon,
  Menu,
  X,
  Cpu,
  RefreshCw,
  Trash2,
  LayoutDashboard,
  Search,
  Sun,
  Moon,
  Server,
  CheckCircle2,
} from "lucide-react";
import YoutubeIcon from "./YoutubeIcon";

export default function Navbar({
  onRefresh,
  onClearHistory,
  isRefreshing,
  youtubeSearchQuery,
  setYoutubeSearchQuery,
  theme,
  toggleTheme,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(youtubeSearchQuery || "");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [showServerModal, setShowServerModal] = useState(false);
  const [serverInput, setServerInput] = useState(() => {
    return localStorage.getItem("custom_server_url") || "";
  });
  const [connectionStatus, setConnectionStatus] = useState(null); // 'checking', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState("");

  const handleSaveServer = async (e) => {
    if (e) e.preventDefault();
    let targetUrl = serverInput.trim();
    if (targetUrl) {
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = "http://" + targetUrl;
      }
      targetUrl = targetUrl.replace(/\/+$/, "");
      if (!targetUrl.endsWith("/api")) {
        targetUrl = targetUrl + "/api";
      }
    }

    setConnectionStatus("checking");
    setErrorMessage("");

    try {
      const fallbackUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
      const testUrl = `${targetUrl || fallbackUrl}/downloads`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(testUrl, {
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        if (targetUrl) {
          localStorage.setItem("custom_server_url", targetUrl);
        } else {
          localStorage.removeItem("custom_server_url");
        }
        setConnectionStatus("success");
        setTimeout(() => {
          setShowServerModal(false);
          setConnectionStatus(null);
          if (onRefresh) onRefresh();
        }, 1200);
      } else {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.error("Connection test failed:", err);
      setConnectionStatus("error");
      setErrorMessage(err.name === "AbortError" ? "Connection timeout. Server took too long to respond." : err.message || "Failed to reach the server.");
    }
  };

  // Synchronize local input with outer state
  useEffect(() => {
    setSearchInput(youtubeSearchQuery || "");
  }, [youtubeSearchQuery]);

  // Reset search when navigating away from /youtube
  useEffect(() => {
    if (location.pathname !== "/youtube") {
      setSearchInput("");
      setYoutubeSearchQuery("");
      setShowMobileSearch(false);
    }
  }, [location.pathname, setYoutubeSearchQuery]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setYoutubeSearchQuery(searchInput);
    if (location.pathname !== "/youtube") {
      navigate("/youtube");
    }
  };

  if (showMobileSearch) {
    return (
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/75 dark:bg-slate-950/75 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-3">
            <button
              onClick={() => {
                setShowMobileSearch(false);
                setSearchInput("");
                setYoutubeSearchQuery("");
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-900 focus:outline-none transition-colors cursor-pointer"
              title="Close Search"
            >
              <X className="h-6 w-6" />
            </button>
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search YouTube videos..."
                autoFocus
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl py-2 pl-4 pr-10 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </nav>
    );
  }

  const navItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Download",
      path: "/download",
      icon: Download,
    },
    {
      name: "History",
      path: "/history",
      icon: HistoryIcon,
    },
    {
      name: "YouTube",
      path: "/youtube",
      icon: YoutubeIcon,
    },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full">
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/75 dark:bg-slate-950/75 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            {/* Left Section: Hamburger Toggle & Logo Group */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Mobile Hamburger menu toggle */}
              <button
                onClick={() => setIsOpen(true)}
                className="flex md:hidden items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-900 focus:outline-none transition-all cursor-pointer"
                title="Open Navigation menu"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Logo Section */}
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-650 shadow-lg shadow-indigo-500/20 flex-shrink-0">
                  <svg className="h-4.5 w-4.5 text-white fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-lg font-bold tracking-wide text-transparent">
                  Streamix
                </span>
              </div>
            </div>

            {/* Desktop Search Bar (Centered) */}
            <div className="hidden md:flex flex-1 max-w-md mx-6">
              <form onSubmit={handleSearchSubmit} className="w-full relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search YouTube videos..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl py-2 pl-4 pr-10 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

            {/* Desktop Navigation Links & Desktop Controls */}
            <div className="hidden md:flex md:items-center md:gap-6 lg:gap-8 flex-shrink-0">
              {/* Navigation Links */}
              <div className="flex items-center gap-4 lg:gap-5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 border ${
                          isActive
                            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-650 dark:text-indigo-400 shadow-inner"
                            : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900/60"
                        }`
                      }>
                      <Icon className="h-4.5 w-4.5" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </div>

              {/* Desktop controls */}
              <div className="flex items-center gap-3 lg:gap-4">
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border border-slate-200 dark:border-slate-880 rounded-xl bg-white dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer">
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Refresh Queue
                </button>
                <button
                  onClick={onClearHistory}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border border-rose-200 dark:border-rose-900/30 rounded-xl bg-rose-50/50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-455 hover:bg-rose-100 dark:hover:bg-rose-600 hover:text-rose-700 dark:hover:text-white transition-all cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear History
                </button>
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-850 transition-all cursor-pointer"
                  title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                  {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setServerInput(localStorage.getItem("custom_server_url") || "");
                    setConnectionStatus(null);
                    setErrorMessage("");
                    setShowServerModal(true);
                  }}
                  className="flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-850 transition-all cursor-pointer"
                  title="Server Connection Settings">
                  <Server className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Mobile search navigation shortcut (far right) */}
            <button
              onClick={() => {
                navigate("/youtube");
                setShowMobileSearch(true);
              }}
              className="flex md:hidden items-center justify-center p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 focus:outline-none transition-colors cursor-pointer"
              title="Search YouTube"
            >
              <Search className="h-5.5 w-5.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay & Panel */}
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-sm md:hidden animate-fadeIn"
          />

          {/* Sliding Drawer Container */}
          <div className="fixed top-0 left-0 bottom-0 z-50 w-[260px] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-900 p-4 flex flex-col justify-between md:hidden shadow-2xl animate-slideRight">
            <div>
              {/* Drawer Header: Close button + Logo */}
              <div className="flex items-center gap-3 h-16 border-b border-slate-250 dark:border-slate-900 pb-3 mb-4">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  title="Close Navigation menu"
                >
                  <Menu className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-650 shadow-lg flex-shrink-0">
                    <svg className="h-4.5 w-4.5 text-white fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span className="bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-base font-bold tracking-wide text-transparent">
                    Streamix
                  </span>
                </div>
              </div>

              {/* Navigation list */}
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-650 dark:text-indigo-400 font-bold shadow-inner"
                            : "text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900/60"
                        }`
                      }>
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions inside drawer */}
            <div className="border-t border-slate-200 dark:border-slate-900 pt-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  onRefresh();
                  setIsOpen(false);
                }}
                disabled={isRefreshing}
                className="w-full flex items-center justify-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer">
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh Queue
              </button>
              <button
                onClick={() => {
                  onClearHistory();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-900/35 text-rose-455 hover:bg-rose-600 hover:text-white text-xs font-bold transition-all cursor-pointer">
                <Trash2 className="h-4 w-4" />
                Clear History
              </button>
              <button
                onClick={() => {
                  toggleTheme();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all cursor-pointer">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              <button
                onClick={() => {
                  setServerInput(localStorage.getItem("custom_server_url") || "");
                  setConnectionStatus(null);
                  setErrorMessage("");
                  setIsOpen(false);
                  setShowServerModal(true);
                }}
                className="w-full flex items-center justify-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all cursor-pointer">
                <Server className="h-4 w-4" />
                Server Settings
              </button>
            </div>
          </div>
        </>
      )}

      {/* Server Settings Modal */}
      {showServerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                Server Connection
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                Enter your PC's IP address or Render server URL to connect the app.
              </p>
            </div>

            <form onSubmit={handleSaveServer} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Server API URL
                </label>
                <input
                  type="text"
                  value={serverInput}
                  onChange={(e) => setServerInput(e.target.value)}
                  placeholder="e.g. http://192.168.1.100:5000/api"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl py-2.5 px-4 text-sm text-slate-805 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                />
                <p className="text-[10px] text-slate-500 font-medium">
                  Leave empty to reset to default server configuration.
                </p>
              </div>

              {connectionStatus === "checking" && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-650 dark:text-indigo-400 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Testing server connection...
                </div>
              )}

              {connectionStatus === "success" && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Connection successful! Saving settings...
                </div>
              )}

              {connectionStatus === "error" && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold">
                  <p className="font-bold flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Connection Failed
                  </p>
                  <p className="mt-1 text-[11px] font-medium opacity-90">{errorMessage}</p>
                </div>
              )}

              <div className="flex items-center gap-3 border-t border-slate-200 dark:border-slate-800/80 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowServerModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-950 text-slate-650 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connectionStatus === "checking"}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-650 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all text-xs font-bold cursor-pointer"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
