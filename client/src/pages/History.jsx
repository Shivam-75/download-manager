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
  RefreshCw
} from "lucide-react";
import { removeDownload, triggerDownload, openFileInExplorer } from "../api/apies";

export default function History() {
  const { records, setRecords, downloadPath, triggerToast, isLoading } = useOutletContext();
  const [sortField, setSortField] = useState("timestamp");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const handleViewFile = async (id) => {
    try {
      await openFileInExplorer(id);
      triggerToast("Opening file location in explorer...");
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to open file location.";
      triggerToast(errMsg);
    }
  };

  // Show only completed or failed records in History page (active ones stay on Dashboard queue)
  const historyRecords = useMemo(() => {
    return records.filter((r) => r.status === "completed" || r.status === "failed");
  }, [records]);

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    triggerToast("Media download link copied!");
  };

  const handleDeleteRecord = async (id) => {
    if (confirm("Are you sure you want to remove this download log from history? This also deletes the physical file from the server disk.")) {
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
      hour12: false
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

      {/* Main Table Grid */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/10 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-550 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-900/20 select-none">
                <th className="py-4.5 px-6 font-semibold">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    File Name <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-4.5 px-6 font-semibold">Media Type</th>
                <th className="py-4.5 px-6 font-semibold">Format</th>
                <th className="py-4.5 px-6 font-semibold">
                  <button
                    onClick={() => handleSort("sizeBytes")}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Size <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-4.5 px-6 font-semibold">Speed</th>
                <th className="py-4.5 px-6 font-semibold">
                  <button
                    onClick={() => handleSort("timestamp")}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Date Downloaded <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-4.5 px-6 font-semibold">Status</th>
                <th className="py-4.5 px-6 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/40 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
                      <span>Loading download history...</span>
                    </div>
                  </td>
                </tr>
              ) : historyRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 font-medium">
                    No files found in download history.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => (
                  <tr
                    key={rec._id || rec.id}
                    className="group hover:bg-slate-100/40 dark:hover:bg-slate-900/20 transition-colors duration-150"
                  >
                    {/* File name with Thumbnail preview */}
                    <td className="py-3.5 px-6 font-semibold text-slate-805 dark:text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex-shrink-0 relative">
                          {rec.thumbnail ? (
                            <img
                              src={rec.thumbnail}
                              alt={rec.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-slate-200 dark:bg-slate-900 flex items-center justify-center">
                              {rec.type === "video" ? <VideoIcon className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                            </div>
                          )}
                          {rec.type === "video" && rec.status === "completed" && (
                            <div className="absolute inset-0 bg-slate-950/20 flex items-center justify-center">
                              <Play className="h-3.5 w-3.5 text-white/90 fill-white/80" />
                            </div>
                          )}
                        </div>
                        <span className="truncate max-w-[220px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                          {rec.name}
                        </span>
                      </div>
                    </td>

                    {/* Media Type Badge */}
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 capitalize font-medium">
                        {rec.type === "video" ? (
                          <VideoIcon className="h-3.5 w-3.5 text-purple-650 dark:text-purple-400" />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                        )}
                        {rec.type}
                      </span>
                    </td>

                    {/* Format */}
                    <td className="py-3.5 px-6 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{rec.format}</td>

                    {/* Size */}
                    <td className="py-3.5 px-6 text-slate-700 dark:text-slate-350">{rec.size}</td>

                    {/* Speed */}
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-500 dark:text-slate-400">{rec.speed}</td>

                    {/* Date */}
                    <td className="py-3.5 px-6 text-slate-600 dark:text-slate-400">{formatDate(rec.timestamp)}</td>

                    {/* Status */}
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize border ${
                          rec.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/10"
                        }`}
                      >
                        {rec.status === "completed" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {rec.status}
                      </span>
                    </td>

                    {/* View File clicker */}
                    <td className="py-3.5 px-6 text-right font-medium">
                      {rec.status === "completed" ? (
                        <button
                          onClick={() => handleViewFile(rec._id || rec.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-rose-500 dark:text-rose-455 font-semibold italic">
                          File Unavailable
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {historyRecords.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/20">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-855 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
            >
              Previous
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    currentPage === page
                      ? "bg-indigo-600 dark:bg-indigo-650 text-white font-bold"
                      : "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-855 disabled:opacity-40 disabled:hover:text-slate-450 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
