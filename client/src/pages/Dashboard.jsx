import React from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  Download,
  HardDrive,
  Activity,
  CheckCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function Dashboard() {
  const { records, storageStats } = useOutletContext();

  // Active downloads are logs from server currently marked as 'downloading', 'queued', or 'paused'
  const activeDownloads = records.filter(
    (r) => r.status === "downloading" || r.status === "queued" || r.status === "paused",
  );

  // Dynamically calculate metrics from global records
  const completedRecords = records.filter((r) => r.status === "completed");
  const totalCompletedCount = completedRecords.length;

  const imageRecords = completedRecords.filter((r) => r.type === "image");
  const videoRecords = completedRecords.filter((r) => r.type === "video");

  const imageBytes = imageRecords.reduce(
    (acc, curr) => acc + (curr.sizeBytes || 0),
    0,
  );
  const videoBytes = videoRecords.reduce(
    (acc, curr) => acc + (curr.sizeBytes || 0),
    0,
  );
  const totalBytes = imageBytes + videoBytes;

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const driveTotal = storageStats?.totalBytes || 0;
  const driveUsed = storageStats?.usedBytes || 0;
  const drivePercent = driveTotal > 0 ? Math.min(100, parseFloat(((driveUsed / driveTotal) * 100).toFixed(1))) : 0;
  const formattedDriveUsed = formatSize(driveUsed);
  const formattedDriveTotal = formatSize(driveTotal);

  const stats = [
    {
      title: "Active Downloads",
      value: activeDownloads.length,
      change: `${activeDownloads.length} Queue Jobs Running`,
      icon: Download,
      color: "from-blue-500 to-cyan-500",
      glowColor: "rgba(6, 182, 212, 0.15)",
    },
    {
      title: "Storage Allocation",
      value: driveTotal > 0 ? formattedDriveTotal : "Calculating...",
      change: driveTotal > 0 ? `${formattedDriveUsed} used (${drivePercent}%)` : "Checking server drives...",
      icon: HardDrive,
      color: "from-indigo-500 to-violet-500",
      glowColor: "rgba(99, 102, 241, 0.15)",
    },
    {
      title: "Average Download Speed",
      value: totalCompletedCount > 0 ? "14.2 MB/s" : "0 MB/s",
      change: "Direct Server Stream",
      icon: Activity,
      color: "from-emerald-500 to-teal-500",
      glowColor: "rgba(16, 185, 129, 0.15)",
    },
    {
      title: "Total Files Saved",
      value: totalCompletedCount,
      change: `${imageRecords.length} Img | ${videoRecords.length} Vid`,
      icon: CheckCircle,
      color: "from-purple-500 to-pink-500",
      glowColor: "rgba(168, 85, 247, 0.15)",
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Greeting Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          System Overview
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Monitor your background transfers and server storage metrics.
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/20 p-6 backdrop-blur-sm transition-all duration-300 hover:border-slate-350 dark:hover:border-slate-700/80 hover:translate-y-[-2px] hover:shadow-xl hover:shadow-indigo-500/5 group">
              {/* Card Ambient Glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle at 100% 0%, ${stat.glowColor} 0%, transparent 60%)`,
                }}
              />

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {stat.title}
                </span>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {stat.value}
                </span>
                <p className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {stat.change}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Premium Card */}
    </div>
  );
}
