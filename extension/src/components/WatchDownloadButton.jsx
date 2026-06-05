import React, { useState } from "react";

export default function WatchDownloadButton() {
  const [status, setStatus] = useState("idle");

  const handleDownload = async (e) => {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL ||
        "https://download-manager-odz0.onrender.com/api";
      const response = await fetch(`${apiBaseUrl}/downloads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: window.location.href,
          downloadPath: "",
          resolution: "Original",
          mediaType: "video",
        }),
      });

      if (response.ok) {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        throw new Error();
      }
    } catch (err) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className={`streamix-watch-download-btn ${status}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "0 16px",
        height: "36px",
        borderRadius: "18px",
        border: "none",
        background:
          status === "success"
            ? "#10b981"
            : status === "error"
              ? "#ef4444"
              : "rgb(99, 102, 241)",
        color: "white",
        fontSize: "13px",
        fontWeight: "bold",
        cursor: "pointer",
        marginLeft: "8px",
        transition: "all 0.2s",
      }}>
      <svg
        style={{ width: "16px", height: "16px" }}
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
      <span>
        {status === "loading"
          ? "Downloading..."
          : status === "success"
            ? "Queued!"
            : status === "error"
              ? "Error"
              : "Download"}
      </span>
    </button>
  );
}
