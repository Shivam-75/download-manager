import React, { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Database,
  Calendar,
  Image as ImageIcon,
  Video as VideoIcon,
  Play,
  Copy,
  Trash2,
  ArrowUpDown,
  RefreshCw,
  MoreVertical,
} from "lucide-react";
import {
  removeDownload,
  triggerDownload,
  openFileInExplorer,
} from "../api/apies";

export default function History() {
  const { records, setRecords, downloadPath, triggerToast, isLoading } =
    useOutletContext();
  const [sortField, setSortField] = useState("timestamp");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const itemsPerPage = 6;

  const isMobile = React.useMemo(
    () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    [],
  );
  const isLocalDesktop = React.useMemo(() => {
    return (
      !window.location.hostname.includes("vercel.app") &&
      !isMobile &&
      !window.Capacitor
    );
  }, [isMobile]);

  const handleViewFile = async (rec) => {
    const apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL ||
      "https://download-manager-gm8u.vercel.app/api";
    const isVercel = window.location.hostname.includes("vercel.app");
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isVercel || isMobile) {
      const downloadUrl = `${apiBaseUrl}/downloads/stream?url=${encodeURIComponent(rec.url)}&mediaType=${rec.type}&resolution=${rec.resolution || "Original"}`;
      window.open(downloadUrl, "_blank");
      triggerToast("Streaming file download to your device...");
    } else {
      try {
        await openFileInExplorer(rec._id || rec.id);
        triggerToast("Opening file location in explorer...");
      } catch (err) {
        const errMsg =
          err.response?.data?.message || "Failed to open file location.";
        triggerToast(errMsg);
      }
    }
  };

  // Show only completed or failed records in History page (active ones stay on Dashboard queue)
  const historyRecords = useMemo(() => {
    return records.filter(
      (r) => r.status === "completed" || r.status === "failed",
    );
  }, [records]);

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    triggerToast("Media download link copied!");
  };

  const handleDeleteRecord = async (id) => {
    if (
      confirm(
        "Are you sure you want to remove this download log from history? This also deletes the physical file from the server disk.",
      )
    ) {
      try {
        await removeDownload(id);
        setRecords((prev) => prev.filter((r) => r.id !== id));
        setSelectedMedia(null);
        triggerToast("Download history item and file removed.");
      } catch (err) {
        triggerToast("Failed to remove log from server.");
      }
    }
  };

  const handleRedownload = async (url, name) => {
    try {
      await triggerDownload(url, downloadPath);
      triggerToast(`Restarting media transfer: ${name}`);
    } catch (err) {
      triggerToast("Failed to restart transfer.");
    }
  };

  // Sorting Logic
  const sortedRecords = useMemo(() => {
    return [...historyRecords].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "timestamp") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [historyRecords, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedRecords.slice(start, start + itemsPerPage);
  }, [sortedRecords, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn relative">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Download History
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Browse and preview image and video files downloaded locally.
          </p>
        </div>
      </div>

      {/* Main Cards Grid */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-slate-500 font-medium">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
                <span>Loading download history...</span>
              </div>
            </div>
          ) : historyRecords.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 font-medium">
              No files found in download history.
            </div>
          ) : (
            paginatedRecords.map((rec) => (
              <div
                key={rec._id || rec.id}
                className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 shadow-sm hover:shadow-md transition-all duration-300 relative w-full sm:w-[322px] sm:h-[203px] mx-auto">
                {/* Top: Thumbnail Container */}
                <div className="relative aspect-video sm:aspect-none sm:h-[110px] w-full rounded-t-xl overflow-hidden bg-slate-100 dark:bg-slate-900 flex-shrink-0">
                  {rec.thumbnail ? (
                    <img
                      src={rec.thumbnail}
                      alt={rec.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-200 dark:bg-slate-900 flex items-center justify-center">
                      {rec.type === "video" ? (
                        <VideoIcon className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  )}
                  {/* Top-Right Status Badge */}
                  <span
                    className={`absolute top-2 right-2 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold text-white tracking-wide uppercase ${
                      rec.status === "completed"
                        ? "bg-emerald-600/85 border border-emerald-500/20"
                        : "bg-rose-600/85 border border-rose-500/20"
                    }`}>
                    {rec.status}
                  </span>
                  {/* Bottom-Left Size Badge */}
                  <span className="absolute bottom-2 left-2 bg-black px-1.5 py-0.5 rounded text-[9px] font-extrabold text-white tracking-wide">
                    {rec.size || "0 B"}
                  </span>
                  {/* Progress Line for Completed (Full Red) */}
                  {rec.status === "completed" && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-650" />
                  )}
                </div>

                {/* Bottom: Info and Actions */}
                <div className="p-2.5 space-y-1 flex flex-col justify-between flex-1 min-h-0">
                  {/* Title & Three-Dots Menu */}
                  <div className="flex justify-between items-start gap-1.5">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-xs font-bold text-slate-855 dark:text-slate-255 leading-snug line-clamp-2 pr-1"
                        title={rec.name}>
                        {rec.name}
                      </h3>
                    </div>

                    {/* Action Dropdown Menu */}
                    <div className="relative flex-shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveMenuId(
                            activeMenuId === (rec._id || rec.id)
                              ? null
                              : rec._id || rec.id,
                          )
                        }
                        className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer">
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {activeMenuId === (rec._id || rec.id) && (
                        <>
                          <div
                            className="fixed inset-0 z-20 cursor-default"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                            }}
                          />
                          <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-1 flex flex-col gap-0.5 animate-fadeIn">
                            {rec.status === "completed" && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleViewFile(rec);
                                  setActiveMenuId(null);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full text-left cursor-pointer">
                                <Play className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                                View / Play file
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                handleCopyUrl(rec.url);
                                setActiveMenuId(null);
                              }}
                              className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full text-left cursor-pointer">
                              <Copy className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                              Copy download link
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleRedownload(rec.url, rec.name);
                                setActiveMenuId(null);
                              }}
                              className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full text-left cursor-pointer">
                              <RefreshCw className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                              Re-download media
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteRecord(rec._id || rec.id);
                                setActiveMenuId(null);
                              }}
                              className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-colors w-full text-left cursor-pointer border-t border-slate-100 dark:border-slate-800/80 mt-0.5 pt-1.5">
                              <Trash2 className="h-3 w-3" />
                              Delete from history
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* URL */}
                  <a
                    href={rec.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-500 hover:text-indigo-650 dark:text-indigo-400 dark:hover:text-indigo-300 truncate block font-medium hover:underline pr-2">
                    {rec.url}
                  </a>

                  {/* Footer Row */}
                  <div className="flex justify-between items-center text-[10px] font-medium pt-1 border-t border-slate-100 dark:border-slate-900/60 mt-0.5">
                    <span className="text-slate-550 dark:text-slate-500">
                      {formatDate(rec.timestamp)}
                    </span>
                    <span
                      className={`font-semibold ${rec.status === "completed" ? "text-emerald-600" : "text-rose-650"}`}>
                      {rec.status === "completed" ? "Completed" : "Failed"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination controls */}
        {historyRecords.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/20">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-855 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors">
              Previous
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      currentPage === page
                        ? "bg-indigo-600 dark:bg-indigo-650 text-white font-bold"
                        : "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}>
                    {page}
                  </button>
                ),
              )}
            </div>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-855 disabled:opacity-40 disabled:hover:text-slate-450 transition-colors">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
