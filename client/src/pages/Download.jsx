import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Download,
  X,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  Video as VideoIcon,
  Link,
  CheckCircle,
  Clock,
  MoreVertical,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import {
  triggerDownload,
  removeDownload,
  pauseDownload,
  resumeDownload,
} from "../api/apies";

export default function DownloadPage() {
  const {
    records,
    handleRefresh,
    isRefreshing,
    triggerToast,
    isLoading,
  } = useOutletContext();

  const [inputUrl, setInputUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaType, setMediaType] = useState("video");
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Quality/Resolution Selection Modal State
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [choiceResolution, setChoiceResolution] = useState("Original");

  // Active downloads are logs from server currently marked as 'downloading', 'queued', or 'paused'
  const activeDownloads = records.filter(
    (r) => r.status === "downloading" || r.status === "queued" || r.status === "paused",
  );

  const handleStartDownload = (e) => {
    e.preventDefault();
    if (!inputUrl) {
      triggerToast("Please provide a valid download URL.");
      return;
    }
    if (mediaType === "video") {
      setChoiceResolution("Original");
      setShowResolutionModal(true);
    } else {
      confirmAndStartDownloadDirect();
    }
  };

  const startDownloadJob = async (resQuality) => {
    setIsSubmitting(true);
    try {
      await triggerDownload(inputUrl, "", resQuality, mediaType);
      triggerToast(
        `Download queued successfully: ${mediaType.toUpperCase()} format`
      );
      setInputUrl("");
      handleRefresh(); // Force reload list
    } catch (err) {
      triggerToast("Failed to queue download. Check server connectivity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmAndStartDownload = async () => {
    setShowResolutionModal(false);
    await startDownloadJob(choiceResolution);
  };

  const confirmAndStartDownloadDirect = async () => {
    await startDownloadJob("Original");
  };

  const handleCancelDownload = async (id) => {
    try {
      await removeDownload(id);
      triggerToast("Download job cancelled.");
      handleRefresh();
    } catch (err) {
      triggerToast("Failed to cancel download.");
    }
  };

  const handlePause = async (id) => {
    try {
      await pauseDownload(id);
      triggerToast("Download paused successfully.");
      setActiveMenuId(null);
      handleRefresh();
    } catch (err) {
      triggerToast("Failed to pause download.");
    }
  };

  const handleResume = async (id) => {
    try {
      await resumeDownload(id);
      triggerToast("Download resumed successfully.");
      setActiveMenuId(null);
      handleRefresh();
    } catch (err) {
      triggerToast("Failed to resume download.");
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Greeting Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Start Media Transfer
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Queue high-speed video or image downloads directly onto the host
          server drive.
        </p>
      </div>

      {/* Setup Control Form Card & Queue Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Left Column: Forms */}
        <div className="space-y-6">
          {/* Paste URL Downloader Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/10 p-6 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Link className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                Submit Download Link
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Paste any direct image/video URL to stream to host drive
              </p>
            </div>

            <form onSubmit={handleStartDownload} className="mt-6 space-y-4">
              {/* Media Type Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { value: "video", label: "Video (MP4)" },
                  { value: "audio", label: "Audio (MP3)" },
                  { value: "image", label: "Image" },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setMediaType(type.value)}
                    className={`w-full py-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                      mediaType === type.value
                        ? "bg-indigo-500/10 dark:bg-indigo-650/20 border-indigo-500 text-indigo-650 dark:text-indigo-300 shadow-inner"
                        : "bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-855 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-350 dark:hover:border-slate-800"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder={
                    mediaType === "video"
                      ? "Paste video URL (e.g. YouTube, mp4 link)"
                      : mediaType === "audio"
                      ? "Paste audio URL (e.g. YouTube, mp3 link)"
                      : "Paste image URL (e.g. Unsplash, jpg link)"
                  }
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl py-2.5 px-4 text-sm text-slate-805 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer">
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Initiating Stream...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Start Download to Disk
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Active Downloads Queue */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/10 p-6 backdrop-blur-sm h-full min-h-[420px]">
          <div>
            <div className="border-b border-slate-200 dark:border-slate-800/60 pb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="h-5 w-5 text-indigo-550 dark:text-indigo-455" />
                Active Downloading Queue
                {isRefreshing && (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400 ml-auto" />
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live background media file retrieval jobs on server
              </p>
            </div>

            <div className="mt-6 space-y-5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
                  <p className="font-semibold text-slate-600 dark:text-slate-350">Syncing queue status...</p>
                </div>
              ) : activeDownloads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center gap-2">
                  <CheckCircle className="h-8 w-8 text-emerald-500/80" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-300">
                      All media downloads completed
                    </p>
                    <p className="text-xs mt-0.5 text-slate-500">
                      Paste links to queue additional image or video assets.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5">
                  {activeDownloads.map((dl) => (
                    <div
                      key={dl.id}
                      className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                      {/* Thumbnail Container */}
                      <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-900">
                        <img
                          src={dl.thumbnail}
                          alt={dl.name}
                          className="h-full w-full object-cover"
                        />
                        {/* Top-Right Status Badge */}
                        <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-lg text-[9px] font-extrabold text-white tracking-wider uppercase ${
                          dl.status === "downloading" ? "bg-red-600" : dl.status === "paused" ? "bg-slate-750/90" : "bg-indigo-600/90"
                        }`}>
                          {dl.status === "downloading" ? "Downloading" : dl.status === "paused" ? "Paused" : "Queued"}
                        </span>
                        {/* Bottom-Left Size Badge */}
                        <span className="absolute bottom-3 left-3 px-1.5 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm text-[10px] font-bold text-white">
                          {dl.size || "0 B"}
                        </span>
                        {/* Bottom Progress Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-250 dark:bg-slate-900">
                          {dl.status === "queued" ? (
                            <div className="h-full w-full bg-indigo-500/25 animate-pulse" />
                          ) : (
                            <div
                              className="h-full bg-red-650 transition-all duration-300"
                              style={{ width: `${dl.progress}%` }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-4 flex flex-col gap-3">
                        {/* Title and Action Menu */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1 space-y-1">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2 pr-1" title={dl.name}>
                              {dl.name}
                            </h3>
                            <a
                              href={dl.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-500 hover:text-indigo-650 dark:text-indigo-400 dark:hover:text-indigo-300 truncate block font-medium hover:underline pr-2"
                            >
                              {dl.url}
                            </a>
                          </div>

                          {/* Action Dropdown Menu */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveMenuId(activeMenuId === dl.id ? null : dl.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              <MoreVertical className="h-4.5 w-4.5" />
                            </button>

                            {activeMenuId === dl.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-20 cursor-default" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                  }}
                                />
                                <div className="absolute right-0 top-full mt-1.5 z-30 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-1.5 flex flex-col gap-0.5 animate-fadeIn">
                                  {dl.status === "paused" ? (
                                    <button
                                      type="button"
                                      onClick={() => handleResume(dl.id)}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full text-left cursor-pointer"
                                    >
                                      <Play className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                      Resume download
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handlePause(dl.id)}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full text-left ${dl.status === "queued" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                      disabled={dl.status === "queued"}
                                    >
                                      <Pause className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                      Pause download
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCancelDownload(dl.id);
                                      setActiveMenuId(null);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors w-full text-left cursor-pointer border-t border-slate-100 dark:border-slate-800/80 mt-0.5 pt-2"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete from downloads
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Date & Progress Info */}
                        <div className="flex justify-between items-center text-xs text-slate-500 mt-1 pt-2.5 border-t border-slate-250 dark:border-slate-900/60">
                          <span>{new Date(dl.timestamp || Date.now()).toLocaleDateString()}</span>
                          <span className="font-semibold text-rose-500 dark:text-rose-455">
                            {dl.progress}% {dl.speed && dl.speed !== "0 B/s" && `• ${dl.speed}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quality Selection Modal Overlay */}
      {showResolutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <VideoIcon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                Select Download Quality
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">
                Choose the target streaming resolution for this download job.
              </p>
            </div>

            {/* Resolution Options */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "1080p (Full HD)", value: "1080p" },
                { label: "720p (HD)", value: "720p" },
                { label: "480p (SD)", value: "480p" },
                { label: "Original / Direct", value: "Original" },
              ].map((res) => (
                <button
                  key={res.value}
                  type="button"
                  onClick={() => setChoiceResolution(res.value)}
                  className={`p-3.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    choiceResolution === res.value
                      ? "bg-indigo-500/10 dark:bg-indigo-650/20 border-indigo-500 text-indigo-655 dark:text-indigo-300 shadow-inner"
                      : "bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-855 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-350 dark:hover:border-slate-800"
                  }`}>
                  {res.label}
                </button>
              ))}
            </div>

            {/* Modal Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowResolutionModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-xs font-bold">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndStartDownload}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs font-bold">
                Confirm Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
