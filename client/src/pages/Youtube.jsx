import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  Play,
  Download,
  X,
  RefreshCw,
  CheckCircle,
  Eye,
  Clock,
  Video as VideoIcon,
  Image as ImageIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import YoutubeIcon from "../components/YoutubeIcon";
import {
  fetchYoutubeTrending,
  searchYoutubeVideos,
  triggerDownload,
} from "../api/apies";

export default function YoutubePage() {
  const navigate = useNavigate();
  const {
    downloadPath,
    handleRefresh,
    triggerToast,
    youtubeSearchQuery,
    setYoutubeSearchQuery,
    getFromCache,
    setInCache,
  } = useOutletContext();

  const [videos, setVideos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState("video");
  const [downloadQuality, setDownloadQuality] = useState("1080p");
  const [isSubmittingDownload, setIsSubmittingDownload] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

  const scrollRef = useRef(null);

  const categories = [
    "All",
    "Gaming",
    "Music",
    "Tech",
    "Comedy",
    "Latest",
    "Disha Vakani",
    "Clash of Clans",
    "Cricket",
    "Movies",
    "Live",
    "Sports",
    "News",
  ];

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const scrollAmount = 200;
      const scrollTo =
        direction === "left"
          ? scrollLeft - scrollAmount
          : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  // Fetch trending or search videos on change of youtubeSearchQuery or selectedCategory
  useEffect(() => {
    if (youtubeSearchQuery && youtubeSearchQuery.trim()) {
      performSearch(youtubeSearchQuery);
    } else {
      loadTrending(selectedCategory);
    }
  }, [youtubeSearchQuery, selectedCategory]);

  // Lock background body scroll when video player modal is active
  useEffect(() => {
    if (selectedVideo) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [selectedVideo]);

  const loadTrending = async (category) => {
    const cacheKey = `youtube-trending-${category}`;
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      setVideos(cachedData);
      return;
    }

    setIsLoading(true);
    try {
      const catKeyword = category === "All" ? "" : category;
      const data = await fetchYoutubeTrending(catKeyword);
      setVideos(data);
      setInCache(cacheKey, data);
    } catch (err) {
      console.error("Failed to load trending videos:", err.message);
      triggerToast("Failed to load videos. Check server connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const performSearch = async (query) => {
    const cacheKey = `youtube-search-${query}`;
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      setVideos(cachedData);
      return;
    }

    setIsLoading(true);
    setSelectedCategory(""); // Reset category highlights
    try {
      const data = await searchYoutubeVideos(query);
      setVideos(data);
      setInCache(cacheKey, data);
    } catch (err) {
      console.error("Failed to search videos:", err.message);
      triggerToast("Failed to search YouTube videos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (category) => {
    setYoutubeSearchQuery(""); // Clear search bar input in navbar/context
    if (selectedCategory === category) {
      // Force refresh this category
      const cacheKey = `youtube-trending-${category}`;
      setInCache(cacheKey, undefined);
      loadTrending(category);
    } else {
      setSelectedCategory(category);
    }
  };

  const handleVideoCardClick = (video, openDownloadDirectly = false) => {
    setSelectedVideo(video);
    setDownloadFormat("video");
    setDownloadQuality("1080p");
    setShowDownloadOptions(openDownloadDirectly);
  };

  const handleStartDownload = async () => {
    if (!selectedVideo) return;

    setIsSubmittingDownload(true);
    try {
      await triggerDownload(
        selectedVideo.url,
        "",
        downloadFormat === "video" ? downloadQuality : "Original",
        downloadFormat,
      );
      triggerToast(
        `Queued download: "${selectedVideo.title.slice(0, 30)}..." (${downloadFormat.toUpperCase()})`,
      );
      setSelectedVideo(null); // Close modal player overlay
      handleRefresh(); // Sync active downloading queue immediately
      navigate("/download"); // Redirect user to active queue page
    } catch (err) {
      console.error("Failed to start download:", err.message);
      triggerToast("Failed to queue download. Check server connectivity.");
    } finally {
      setIsSubmittingDownload(false);
    }
  };

  // Helper to format views count (e.g. 150000 -> 150K)
  const formatViews = (count) => {
    if (!count) return "0 views";
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M views";
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K views";
    }
    return count + " views";
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Category Chips Scrollbar */}
      <div className="relative group/chips">
        {/* Left Scroll Button */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white shadow-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-805 transition-all opacity-0 group-hover/chips:opacity-100"
          title="Scroll Left">
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Scrollable Chips List */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto px-8 pb-1 select-none scroll-smooth [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-bold"
                  : "bg-slate-200/95 dark:bg-[#272727]/90 hover:bg-slate-300 dark:hover:bg-[#3f3f3f]/90 text-slate-800 dark:text-white"
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white shadow-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-805 transition-all opacity-0 group-hover/chips:opacity-100"
          title="Scroll Right">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Main Video Feed Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-500 text-center gap-3">
          <RefreshCw className="h-10 w-10 animate-spin text-indigo-400" />
          <p className="font-semibold text-slate-600 dark:text-slate-350">
            Searching YouTube indexing feed...
          </p>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-500 text-center gap-2">
          <YoutubeIcon className="h-10 w-10 text-slate-400 dark:text-slate-750" />
          <p className="font-semibold text-slate-750 dark:text-slate-300">
            No YouTube videos found
          </p>
          <p className="text-xs">
            Try checking your internet connection or search another keyword.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {videos.map((vid) => (
            <div
              key={vid.id}
              onClick={() => handleVideoCardClick(vid, false)}
              className="group flex flex-col gap-3 cursor-pointer transition-all duration-300">
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800/40 bg-slate-100 dark:bg-slate-950 shadow-md">
                <img
                  src={vid.thumbnail}
                  alt={vid.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                />
                {/* Duration Badge */}
                <span className="absolute bottom-2.5 right-2.5 bg-slate-950/85 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold text-white tracking-wide">
                  {vid.duration}
                </span>
                 {/* Hover Play Overlay */}
                <div className="absolute inset-0 bg-slate-950/30 opacity-0 md:group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 pointer-events-none md:pointer-events-auto">
                  <div className="p-3 rounded-full bg-indigo-650/90 text-white shadow-xl scale-90 md:group-hover:scale-100 transition-transform duration-300">
                    <Play className="h-4.5 w-4.5 fill-white" />
                  </div>
                </div>
              </div>

              {/* Video Metadata Block */}
              <div className="flex gap-3 px-1">
                {/* Channel Avatar */}
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-650 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-[0_2px_8px_rgba(99,102,241,0.2)]">
                  {vid.channel.name
                    ? vid.channel.name.charAt(0).toUpperCase()
                    : "Y"}
                </div>

                {/* Text Metadata */}
                <div className="flex-1 min-w-0 space-y-1">
                  <h3
                    className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors pr-2"
                    title={vid.title}>
                    {vid.title}
                  </h3>
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-650 dark:text-slate-400 font-semibold truncate hover:text-slate-900 dark:hover:text-slate-250 transition-colors">
                      {vid.channel.name}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {formatViews(vid.views)} • {vid.uploadedAt}
                    </p>
                  </div>
                </div>

                 {/* Download Action Trigger */}
                <div className="flex-shrink-0 self-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVideoCardClick(vid, true);
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-white transition-all shadow-sm cursor-pointer animate-pulse"
                    title="Configure Download"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}       {/* Video Player + Download Manager Modal Overlay */}
      {selectedVideo && (
        <div 
          onClick={() => setSelectedVideo(null)}
          className="fixed inset-0 mt-20 z-[60] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-md animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
          >
            {/* Top Header Bar (Includes Brand Tag, Title, and Close Button) */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 dark:bg-indigo-650/15 border border-indigo-500/20 dark:border-indigo-500/30 text-indigo-650 dark:text-indigo-400 uppercase tracking-wide flex-shrink-0">
                  Streaming
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={selectedVideo.title}>
                  {selectedVideo.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex-shrink-0"
                title="Close Portal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Top Half: Youtube Embedded Player */}
            <div className="bg-black relative aspect-video w-full flex-shrink-0">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"></iframe>
            </div>

            {/* Bottom Half: Conditional View */}
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 backdrop-blur-md p-6">
              {!showDownloadOptions ? (
                /* WATCH VIEW: Video Title, Channel, and Download Button */
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fadeIn">
                  <div className="space-y-1.5 min-w-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 dark:bg-indigo-650/15 border border-indigo-500/20 dark:border-indigo-500/30 text-indigo-650 dark:text-indigo-400 uppercase tracking-wide">
                      YouTube Stream
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 pr-4">
                      {selectedVideo.title}
                    </h3>
                    <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">
                      Channel: {selectedVideo.channel.name}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDownloadOptions(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex-shrink-0">
                    <Download className="h-4 w-4" />
                    Download Video
                  </button>
                </div>
              ) : (
                /* DOWNLOAD VIEW: Target Folder, Format Selector, Select Video Quality, Start Download */
                <div className="space-y-5 animate-fadeIn">
                  {/* Title and back button */}
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800/80">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 dark:bg-indigo-650/15 border border-indigo-500/20 dark:border-indigo-500/30 text-indigo-650 dark:text-indigo-400 uppercase tracking-wide">
                        Download Configuration
                      </span>
                      <h4 className="text-xs text-slate-650 dark:text-slate-400 font-semibold truncate max-w-xs md:max-w-md block mt-1">
                        {selectedVideo.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDownloadOptions(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex-shrink-0">
                      ← Back to Player
                    </button>
                  </div>



                  {/* Format Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                      Format Selector
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          value: "video",
                          label: "Video (MP4)",
                          icon: VideoIcon,
                        },
                        { value: "audio", label: "Audio (MP3)", icon: Clock },
                        {
                          value: "image",
                          label: "Image (JPG)",
                          icon: ImageIcon,
                        },
                      ].map((fmt) => {
                        const Icon = fmt.icon;
                        return (
                          <button
                            key={fmt.value}
                            type="button"
                            onClick={() => setDownloadFormat(fmt.value)}
                            className={`py-2 px-1 rounded-xl border text-[10px] font-bold text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                              downloadFormat === fmt.value
                                ? "bg-indigo-500/10 dark:bg-indigo-650/20 border-indigo-500 text-indigo-650 dark:text-indigo-300 shadow-inner"
                                : "bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-855 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-800"
                            }`}>
                            <Icon className="h-3.5 w-3.5" />
                            <span>{fmt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Video Resolution Quality */}
                  {downloadFormat === "video" && (
                    <div className="space-y-2 animate-fadeIn">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                        Select Video Quality
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "1080p (Full HD)", value: "1080p" },
                          { label: "720p (HD)", value: "720p" },
                          { label: "480p (SD)", value: "480p" },
                          { label: "Original / Best", value: "Original" },
                        ].map((res) => (
                          <button
                            key={res.value}
                            type="button"
                            onClick={() => setDownloadQuality(res.value)}
                            className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                              downloadQuality === res.value
                                ? "bg-indigo-500/10 dark:bg-indigo-650/20 border-indigo-500 text-indigo-650 dark:text-indigo-300 shadow-inner"
                                : "bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-855 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-800"
                            }`}>
                            {res.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit Download button */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 mt-4">
                    <button
                      type="button"
                      onClick={handleStartDownload}
                      disabled={isSubmittingDownload}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer">
                      {isSubmittingDownload ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Queuing Stream...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Start Background Download
                        </>
                      )}
                    </button>
                    <p className="text-[9px] text-slate-500 dark:text-slate-500 mt-2 text-center leading-relaxed">
                      * Stream will continue playing in the background during
                      active file downloads on host server drive.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
