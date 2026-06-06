import React, { useState } from "react";

export default function DownloadButton({ videoUrl }) {
  const [status, setStatus] = useState("idle"); // idle, loading, success, error

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (status === "loading") return;

    setStatus("loading");
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/downloads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: videoUrl,
          downloadPath: "", // Will use default system folder
          resolution: "Original",
          mediaType: "video",
        }),
      });

      if (response.ok) {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        throw new Error("Failed to queue download");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className={`streamix-download-btn ${status}`}
      title="Download with Streamix">
      {status === "loading" ? (
        <svg className="streamix-spinner" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>
      ) : status === "success" ? (
        <svg
          className="streamix-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : status === "error" ? (
        <svg
          className="streamix-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg
          className="streamix-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
    </button>
  );
}
