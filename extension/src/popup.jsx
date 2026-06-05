import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

function Popup() {
  const [activeDownloads, setActiveDownloads] = useState([]);
  const [isConnected, setIsConnected] = useState(true);

  // Poll active downloads from local server
  useEffect(() => {
    const fetchActiveJobs = async () => {
      try {
        const apiBaseUrl =
          import.meta.env.VITE_API_BASE_URL ||
          "https://download-manager-odz0.onrender.com/api";
        const response = await fetch(`${apiBaseUrl}/downloads`);
        if (response.ok) {
          const data = await response.json();
          // Filter to only include active downloads (downloading, queued, paused)
          const active = data.filter(
            (r) =>
              r.status === "downloading" ||
              r.status === "queued" ||
              r.status === "paused",
          );
          setActiveDownloads(active);
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (err) {
        console.error("Failed to sync downloads in popup:", err);
        setIsConnected(false);
      }
    };

    fetchActiveJobs();
    const interval = setInterval(fetchActiveJobs, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleOpenDashboard = (e) => {
    e.preventDefault();
    const dashboardUrl =
      import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5174";
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url: `${dashboardUrl}/download` });
    } else {
      window.open(`${dashboardUrl}/download`, "_blank");
    }
  };

  return (
    <div
      style={{
        padding: "16px",
        background: "#0f172a",
        color: "#f8fafc",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: "border-box",
      }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "16px",
          borderBottom: "1px solid #1e293b",
          paddingBottom: "12px",
        }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            boxShadow: "0 4px 10px rgba(99, 102, 241, 0.3)",
          }}>
          <svg
            style={{ width: "16px", height: "16px", color: "white" }}
            fill="currentColor"
            viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: "bold",
              letterSpacing: "0.5px",
            }}>
            Streamix
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "10px",
              color: isConnected ? "#10b981" : "#ef4444",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: isConnected ? "#10b981" : "#ef4444",
                display: "inline-block",
              }}
            />
            {isConnected ? "Server Connected" : "Server Offline"}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {activeDownloads.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            maxHeight: "350px",
            overflowY: "auto",
            paddingRight: "4px",
          }}>
          <h3
            style={{
              margin: "0 0 4px 0",
              fontSize: "11px",
              fontWeight: "800",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
            Live Background Transfers ({activeDownloads.length})
          </h3>

          {activeDownloads.map((dl) => (
            <div
              key={dl.id}
              style={{
                display: "flex",
                gap: "10px",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "12px",
                padding: "10px",
                position: "relative",
                overflow: "hidden",
              }}>
              {/* Mini Thumbnail */}
              <div
                style={{
                  width: "70px",
                  height: "45px",
                  borderRadius: "6px",
                  overflow: "hidden",
                  background: "#020617",
                  flexShrink: 0,
                }}>
                {dl.thumbnail ? (
                  <img
                    src={dl.thumbnail}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "#475569",
                    }}>
                    <svg
                      style={{ width: "16px", height: "16px" }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Download Details */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}>
                <h4
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#f8fafc",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={dl.name}>
                  {dl.name}
                </h4>

                {/* Progress Details Row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "2px",
                  }}>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: "bold",
                      color:
                        dl.status === "paused"
                          ? "#94a3b8"
                          : dl.status === "queued"
                            ? "#a78bfa"
                            : "#ef4444",
                      textTransform: "uppercase",
                    }}>
                    {dl.status === "downloading" ? "downloading" : dl.status}
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      color: "#94a3b8",
                      fontFamily: "monospace",
                    }}>
                    {dl.progress}%{" "}
                    {dl.speed && dl.speed !== "0 B/s" && `• ${dl.speed}`}
                  </span>
                </div>

                {/* Progress Bar Wrapper */}
                <div
                  style={{
                    width: "100%",
                    height: "4px",
                    background: "#020617",
                    borderRadius: "2px",
                    overflow: "hidden",
                    marginTop: "6px",
                  }}>
                  <div
                    style={{
                      width: `${dl.progress}%`,
                      height: "100%",
                      background:
                        dl.status === "paused"
                          ? "#64748b"
                          : dl.status === "queued"
                            ? "#818cf8"
                            : "linear-gradient(90deg, #6366f1, #a855f7)",
                      transition: "width 0.3s ease-out",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Default Instructions Mode */
        <div
          style={{
            padding: "12px",
            borderRadius: "12px",
            background: "#1e293b",
            fontSize: "11px",
            lineHeight: "1.5",
            textAlign: "left",
            border: "1px solid #334155",
          }}>
          <strong
            style={{
              display: "block",
              marginBottom: "6px",
              color: "#818cf8",
              fontSize: "12px",
            }}>
            How to use:
          </strong>
          1. Open any YouTube page.
          <br />
          2. Hover over any video thumbnail.
          <br />
          3. Click the floating <strong style={{ color: "#818cf8" }}>
            ↓
          </strong>{" "}
          Streamix icon to configure & queue your download.
          <br />
          4. Alternatively, click the{" "}
          <strong style={{ color: "#818cf8" }}>Download</strong> button inside
          the watch details bar.
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "16px",
          borderTop: "1px solid #1e293b",
          paddingTop: "10px",
          fontSize: "9px",
          color: "#64748b",
        }}>
        <span>v1.0.0</span>
        <a
          href={`${import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5174"}/download`}
          onClick={handleOpenDashboard}
          style={{
            color: "#38bdf8",
            textDecoration: "none",
            fontWeight: "bold",
            cursor: "pointer",
          }}>
          Open Dashboard →
        </a>
      </div>
    </div>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<Popup />);
