import React, { useState, useEffect } from "react";

export default function StreamixModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  // Download Config States
  const [format, setFormat] = useState("video");
  const [quality, setQuality] = useState("1080p");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mode States
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Active Job Progress Tracking States
  const [activeJobId, setActiveJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState("0 B/s");
  const [eta, setEta] = useState("Queued");
  const [status, setStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Listen to open event
  useEffect(() => {
    const handleOpen = (e) => {
      const { videoUrl, title } = e.detail;
      setVideoUrl(videoUrl);
      setVideoTitle(title || "YouTube Stream");
      setIsOpen(true);
      setFormat("video");
      setQuality("1080p");
      setIsConfiguring(true); // Re-open configuration form for the new video
      setIsMinimized(false); // Expand modal to let user configure
      setErrorMsg("");
    };

    window.addEventListener("streamix-open-modal", handleOpen);
    return () => {
      window.removeEventListener("streamix-open-modal", handleOpen);
    };
  }, []);

  // Active job polling effect
  useEffect(() => {
    if (!activeJobId || isConfiguring) return;

    let isMounted = true;
    let pollInterval = null;

    const pollJobStatus = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
        const res = await fetch(`${apiBaseUrl}/downloads`);
        if (!res.ok) return;
        const downloads = await res.json();

        if (!isMounted) return;

        // Find the active download job
        const job = downloads.find(
          (d) =>
            d.id === activeJobId ||
            d._id === activeJobId ||
            d.jobId === activeJobId,
        );
        if (job) {
          setProgress(job.progress || 0);
          setSpeed(job.speed || "0 B/s");
          setEta(job.eta || "--");
          setStatus(job.status || "queued");

          if (job.status === "completed") {
            clearInterval(pollInterval);
            setProgress(100);
            setStatus("completed");

            // Auto-redirect only if modal is expanded (not minimized)
            if (!isMinimized) {
              setTimeout(() => {
                if (isMounted) {
                  setIsOpen(false);
                  const dashboardUrl =
                    import.meta.env.VITE_DASHBOARD_URL ||
                    "http://localhost:5174";
                  window.location.href = `${dashboardUrl}/history`;
                }
              }, 1500);
            }
          } else if (job.status === "failed") {
            clearInterval(pollInterval);
            setStatus("failed");
            setErrorMsg("Download failed. Check server console.");
          }
        } else {
          // If the job is not found in downloads, it might have finished or failed
          clearInterval(pollInterval);
          setStatus("failed");
          setErrorMsg("Download job completed or not found.");
        }
      } catch (err) {
        console.error("Error polling job status:", err);
      }
    };

    pollInterval = setInterval(pollJobStatus, 1000);
    // Poll immediately
    pollJobStatus();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeJobId, isConfiguring, isMinimized]);

  const handlePause = async (e) => {
    e.stopPropagation();
    if (!activeJobId) return;
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${apiBaseUrl}/downloads/${activeJobId}/pause`, {
        method: "POST",
      });
      if (res.ok) {
        setStatus("paused");
        setSpeed("Paused");
        setEta("--");
      }
    } catch (err) {
      console.error("Failed to pause download:", err);
    }
  };

  const handleResume = async (e) => {
    e.stopPropagation();
    if (!activeJobId) return;
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${apiBaseUrl}/downloads/${activeJobId}/resume`, {
        method: "POST",
      });
      if (res.ok) {
        setStatus("queued");
        setSpeed("0 B/s");
        setEta("Queued");
      }
    } catch (err) {
      console.error("Failed to resume download:", err);
    }
  };

  const handleCancel = async (e) => {
    e.stopPropagation();
    if (!activeJobId) return;
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${apiBaseUrl}/downloads/${activeJobId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActiveJobId(null);
        setIsOpen(false);
        setIsMinimized(false);
      }
    } catch (err) {
      console.error("Failed to cancel download:", err);
    }
  };

  const handleConfirmDownload = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/downloads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: videoUrl,
          resolution: format === "video" ? quality : "Original",
          mediaType: format,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.jobId) {
          setActiveJobId(data.jobId);
          setStatus("queued");
          setProgress(0);
          setIsConfiguring(false); // Move to progress screen
        } else {
          alert("Failed to get download job ID from server.");
        }
      } else {
        alert("Failed to trigger background download. Check server console.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to local Streamix server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePillClick = () => {
    if (status === "completed") {
      // If completed, redirect to local history portal
      const dashboardUrl =
        import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5174";
      window.location.href = `${dashboardUrl}/history`;
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      // Otherwise, restore the full modal
      setIsMinimized(false);
    }
  };

  if (!isOpen) return null;

  // Minimized state pill rendering (Floating bottom-right)
  if (isMinimized && activeJobId && !isConfiguring) {
    return (
      <div className="streamix-minimized-pill" onClick={handlePillClick}>
        <div
          className={`streamix-minimized-icon-pulse ${status === "paused" ? "paused" : ""}`}
        />
        <span className="streamix-minimized-title" title={videoTitle}>
          {status === "completed" ? "Download Complete!" : videoTitle}
        </span>
        <span className="streamix-minimized-progress">
          {status === "completed" ? "Done" : `${progress}%`}
        </span>
      </div>
    );
  }

  return (
    <div
      className="streamix-modal-overlay"
      onClick={() => !activeJobId && setIsOpen(false)}>
      <div className="streamix-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="streamix-modal-header">
          <div style={{ minWidth: 0, flex: 1, marginRight: "12px" }}>
            <h3 className="streamix-modal-title">
              {!isConfiguring && activeJobId
                ? "Download Progress"
                : "Streamix Download Config"}
            </h3>
            <p className="streamix-modal-subtitle" title={videoTitle}>
              {videoTitle}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {!isConfiguring && activeJobId && (
              <button
                type="button"
                className="streamix-modal-close"
                onClick={() => setIsMinimized(true)}
                title="Minimize Tracker"
                style={{
                  padding: "4px 8px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}>
                —
              </button>
            )}
            {isConfiguring && (
              <button
                type="button"
                className="streamix-modal-close"
                onClick={() => setIsOpen(false)}>
                <svg
                  style={{ width: "18px", height: "18px" }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {!isConfiguring && activeJobId ? (
          /* Compact Live Download Progress UI */
          <div className="streamix-progress-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "#94a3b8",
                }}>
                {status === "completed"
                  ? "Transfer Complete"
                  : "Media Streaming Progress"}
              </span>
              <span
                className={`streamix-progress-status-badge streamix-status-${status}`}>
                {status}
              </span>
            </div>

            <div className="streamix-progress-bar-container">
              <div
                className="streamix-progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="streamix-progress-stats">
              <span>{progress}%</span>
              <span>
                {speed && speed !== "0 B/s" ? speed : ""}
                {eta && eta !== "--" && eta !== "Queued"
                  ? ` • ETA: ${eta}`
                  : ""}
              </span>
            </div>

            {errorMsg && (
              <div
                style={{
                  color: "#f87171",
                  fontSize: "11px",
                  marginTop: "2px",
                  fontWeight: "bold",
                }}>
                {errorMsg}
              </div>
            )}

            <div className="streamix-progress-actions">
              {status === "completed" || status === "failed" ? (
                <button
                  type="button"
                  className="streamix-btn-confirm"
                  onClick={() => {
                    const dashboardUrl =
                      import.meta.env.VITE_DASHBOARD_URL ||
                      "http://localhost:5174";
                    window.location.href = `${dashboardUrl}/history`;
                    setIsOpen(false);
                    setIsMinimized(false);
                  }}
                  style={{ marginTop: 0 }}>
                  View in History
                </button>
              ) : (
                <>
                  {status === "paused" ? (
                    <button
                      type="button"
                      className="streamix-btn-progress-action"
                      onClick={(e) => handleResume(e)}>
                      Resume
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="streamix-btn-progress-action"
                      onClick={(e) => handlePause(e)}
                      disabled={status === "queued"}>
                      Pause
                    </button>
                  )}
                  <button
                    type="button"
                    className="streamix-btn-progress-action cancel"
                    onClick={(e) => handleCancel(e)}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Standard Configuration Form */
          <>
            {/* Format Selector */}
            <div className="streamix-form-group">
              <label className="streamix-label">Select Media Format</label>
              <div className="streamix-tabs">
                <button
                  type="button"
                  className={`streamix-tab ${format === "video" ? "active" : ""}`}
                  onClick={() => setFormat("video")}>
                  Video (MP4)
                </button>
                <button
                  type="button"
                  className={`streamix-tab ${format === "audio" ? "active" : ""}`}
                  onClick={() => setFormat("audio")}>
                  Audio (MP3)
                </button>
                <button
                  type="button"
                  className={`streamix-tab ${format === "image" ? "active" : ""}`}
                  onClick={() => setFormat("image")}>
                  Image (JPG)
                </button>
              </div>
            </div>

            {/* Quality Selector */}
            {format === "video" && (
              <div className="streamix-form-group">
                <label className="streamix-label">Target Resolution</label>
                <select
                  className="streamix-select"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="720p">720p (HD)</option>
                  <option value="480p">480p (SD)</option>
                  <option value="Original">Original / Best</option>
                </select>
              </div>
            )}

            {/* Confirm Action Button */}
            <button
              type="button"
              className="streamix-btn-confirm"
              onClick={handleConfirmDownload}
              disabled={isSubmitting}>
              {isSubmitting
                ? "Starting Download..."
                : "Confirm Download Stream"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
