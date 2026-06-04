import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import { execSync, exec, spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { getYtDlpPath } from "../utils/ytDlpHelper.js";

// Helper to check if yt-dlp is available (either locally or globally)
const isYtDlpAvailable = (resolvedPath) => {
  if (resolvedPath !== "yt-dlp") {
    return fs.existsSync(resolvedPath);
  }
  try {
    execSync("yt-dlp --version", { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
};
import ytdl from "@distube/ytdl-core";
import Download from "../models/Download.js";

// In-memory queue to track active downloads in real-time
let activeDownloads = [];

// Helper to check if a URL is a YouTube URL
const isYoutubeUrl = (urlStr) => {
  try {
    const parsed = new URL(urlStr);
    return (
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtu.be" ||
      parsed.hostname.endsWith(".youtube.com")
    );
  } catch (e) {
    return false;
  }
};

// Helper to extract YouTube Video ID
const getYoutubeVideoId = (urlStr) => {
  try {
    const parsed = new URL(urlStr);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1);
    }
    if (parsed.searchParams.has("v")) {
      return parsed.searchParams.get("v");
    }
    const pathParts = parsed.pathname.split("/");
    const embedIndex = pathParts.indexOf("embed");
    if (embedIndex !== -1 && pathParts[embedIndex + 1]) {
      return pathParts[embedIndex + 1];
    }
    const vIndex = pathParts.indexOf("v");
    if (vIndex !== -1 && pathParts[vIndex + 1]) {
      return pathParts[vIndex + 1];
    }
    return null;
  } catch (e) {
    return null;
  }
};

// Helper to get video info using local yt-dlp
const getYtDlpInfo = (urlStr) => {
  return new Promise((resolve, reject) => {
    const ytdlpPath = getYtDlpPath();
    const command = ytdlpPath === "yt-dlp" ? `yt-dlp --dump-json "${urlStr}"` : `"${ytdlpPath}" --dump-json "${urlStr}"`;
    exec(command, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }
      try {
        const info = JSON.parse(stdout);
        resolve(info);
      } catch (e) {
        reject(e);
      }
    });
  });
};

// Helper to check media type from content-type or filename
const getMediaType = (url, contentType) => {
  const videoExtensions = [".mp4", ".mkv", ".webm", ".avi", ".mov", ".flv", ".wmv"];
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  
  if (videoExtensions.includes(ext)) return "video";
  if (contentType && contentType.startsWith("video/")) return "video";
  return "image"; // Default to image
};

// Helper to format bytes into readable strings
const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// GET all downloads (merges in-memory active downloads + MongoDB logs)
export const getDownloads = async (req, res) => {
  try {
    const dbLogs = await Download.find().sort({ timestamp: -1 });
    
    // Merge active downloads (sanitizing callback functions) with database logs
    const sanitizedActive = activeDownloads.map((j) => ({
      id: j.id,
      name: j.name,
      type: j.type,
      format: j.format,
      size: j.size,
      sizeBytes: j.sizeBytes,
      progress: j.progress,
      speed: j.speed,
      dash: j.dash,
      eta: j.eta,
      status: j.status,
      url: j.url,
      resolution: j.resolution,
      duration: j.duration,
      thumbnail: j.thumbnail,
      path: j.path,
      timestamp: j.timestamp
    }));

    const merged = [...sanitizedActive, ...dbLogs];
    res.status(200).json(merged);
  } catch (error) {
    res.status(500).json({ message: "Error fetching downloads", error: error.message });
  }
};

let isProcessing = false;

// Worker to sequentially process queued downloads
const processQueue = async () => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Check if any job is currently downloading
    const currentDownloading = activeDownloads.find((j) => j.status === "downloading");
    if (currentDownloading) {
      isProcessing = false;
      return;
    }

    // Pick first queued job
    const nextJob = activeDownloads.find((j) => j.status === "queued");
    if (!nextJob) {
      isProcessing = false;
      return;
    }

    // Run download stream
    await runDownloadJob(nextJob);
  } catch (err) {
    console.error("Queue worker error:", err.message);
  } finally {
    isProcessing = false;
    // Check again soon
    setTimeout(processQueue, 1000);
  }
};

// Stream download stream task
const runDownloadJob = async (job) => {
  job.status = "downloading";
  job.eta = "Connecting...";
  job.speed = "0 B/s";

  const { id: jobId, url, path: fullFilePath, type, format, thumbnail, resolution, isYoutube } = job;
  let writer = null;

  if (isYoutube) {
    const ytdlpPath = getYtDlpPath();
    if (!isYtDlpAvailable(ytdlpPath)) {
      // Pure JS fallback via @distube/ytdl-core (works on Vercel, Render, local, everywhere)
      return new Promise((resolve) => {
        try {
          let options = {};
          if (type === "audio") {
            options = { filter: "audioonly", quality: "highestaudio" };
          } else {
            options = { filter: "audioandvideo", quality: "highest" };
          }

          const stream = ytdl(url, options);

          stream.on("error", async (streamErr) => {
            console.error("ytdl-core stream error:", streamErr.message);
            activeDownloads = activeDownloads.filter((j) => j.id !== jobId);
            try { writer.destroy(); } catch (e) {}
            if (fs.existsSync(fullFilePath)) {
              try { fs.unlinkSync(fullFilePath); } catch (e) {}
            }
            try {
              await Download.create({
                jobId,
                name: job.name,
                type,
                format,
                size: "0 B",
                sizeBytes: 0,
                status: "failed",
                speed: "0 B/s",
                url,
                resolution,
                path: fullFilePath,
              });
            } catch (dbErr) {
              console.error("Failed to log failure in DB:", dbErr.message);
            }
            resolve();
          });

          const writer = fs.createWriteStream(fullFilePath);

          job.cancel = () => {
            try {
              writer.destroy();
              stream.destroy();
            } catch (e) {}
          };

          let startTime = Date.now();

          stream.on("progress", (chunkLength, downloaded, total) => {
            const pct = total > 0 ? (downloaded / total) * 100 : 50;
            job.progress = Math.min(99, Math.round(pct));
            
            const now = Date.now();
            const elapsedSec = (now - startTime) / 1000;
            const bytesPerSec = downloaded / Math.max(1, elapsedSec);
            
            job.speed = `${formatBytes(bytesPerSec)}/s`;
            job.size = formatBytes(total);
            job.sizeBytes = total;
            
            const remainingBytes = total - downloaded;
            const etaSec = bytesPerSec > 0 ? Math.ceil(remainingBytes / bytesPerSec) : 0;
            job.eta = `${etaSec}s`;
          });

          stream.pipe(writer);

          writer.on("finish", async () => {
            activeDownloads = activeDownloads.filter((j) => j.id !== jobId);
            const finalSize = formatBytes(fs.statSync(fullFilePath).size);
            
            try {
              await Download.create({
                jobId,
                name: job.name,
                type,
                format,
                size: finalSize,
                sizeBytes: fs.statSync(fullFilePath).size,
                status: "completed",
                speed: job.speed,
                url,
                resolution: type === "audio" ? "N/A" : resolution,
                duration: job.duration || "0:30",
                thumbnail,
                path: fullFilePath,
              });
            } catch (dbErr) {
              console.error("Failed to log completion in DB:", dbErr.message);
            }
            resolve();
          });

          writer.on("error", async (err) => {
            if (job.status === "paused") {
              resolve();
              return;
            }
            activeDownloads = activeDownloads.filter((j) => j.id !== jobId);
            writer.close();
            if (fs.existsSync(fullFilePath)) {
              try { fs.unlinkSync(fullFilePath); } catch (e) {}
            }
            try {
              await Download.create({
                jobId,
                name: job.name,
                type,
                format,
                size: "0 B",
                sizeBytes: 0,
                status: "failed",
                speed: "0 B/s",
                url,
                resolution,
                path: fullFilePath,
              });
            } catch (dbErr) {
              console.error("Failed to log failure in DB:", dbErr.message);
            }
            resolve();
          });
        } catch (err) {
          activeDownloads = activeDownloads.filter((j) => j.id !== jobId);
          if (fs.existsSync(fullFilePath)) {
            try { fs.unlinkSync(fullFilePath); } catch (e) {}
          }
          Download.create({
            jobId,
            name: job.name,
            type: type || "video",
            format: format || "MP4",
            size: "0 B",
            sizeBytes: 0,
            status: "failed",
            speed: "0 B/s",
            url,
            resolution,
            path: fullFilePath,
          }).catch(() => {});
          resolve();
        }
      });
    }

    try {
      const args = [];

      if (type === "audio") {
        args.push("-f", "bestaudio/best");
        args.push("-x");
        args.push("--audio-format", "mp3");
        args.push("--audio-quality", "0");
      } else {
        if (resolution === "1080p") {
          args.push("-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best[height<=1080]/best");
        } else if (resolution === "720p") {
          args.push("-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best[height<=720]/best");
        } else if (resolution === "480p") {
          args.push("-f", "bestvideo[height<=480]+bestaudio/best[height<=480]/best[height<=480]/best");
        } else {
          // Original / best
          args.push("-f", "bestvideo+bestaudio/best");
        }
        args.push("--merge-output-format", "mp4");
        args.push("--remux-video", "mp4");
      }

      if (ffmpegPath) {
        args.push("--ffmpeg-location", ffmpegPath);
      }

      // Speed boost and playlist safety
      args.push("--concurrent-fragments", "8");
      args.push("--no-playlist");

      args.push("-o", fullFilePath);
      args.push(url);

      const child = spawn(ytdlpPath, args);
      
      // Store cancel handler on job object (handles Windows process trees)
      job.cancel = () => {
        try {
          if (process.platform === "win32") {
            exec(`taskkill /pid ${child.pid} /T /F`);
          } else {
            child.kill("SIGKILL");
          }
        } catch (e) {
          try {
            child.kill("SIGKILL");
          } catch (err) {}
        }
      };

      let downloadedBytes = 0;
      let lastDownloadedBytes = 0;
      let startTime = Date.now();
      let lastUpdateTime = Date.now();

      const progressRegex = /\[download\]\s+(\d+\.\d+)%\s+of\s+(\S+)\s+at\s+(\S+)\s+ETA\s+(\S+)/;

      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        const match = text.match(progressRegex);
        if (match) {
          const pct = parseFloat(match[1]);
          const totalSizeStr = match[2];
          const speedStr = match[3];
          const etaStr = match[4];

          job.progress = Math.min(99, Math.round(pct));
          job.speed = speedStr;
          job.eta = etaStr;
          job.size = totalSizeStr;

          // Estimate bytes (strip ~ if present for estimated size strings)
          const cleanSizeStr = totalSizeStr.replace("~", "");
          if (cleanSizeStr.toLowerCase().includes("mib")) {
            job.sizeBytes = Math.round(parseFloat(cleanSizeStr) * 1024 * 1024);
          } else if (cleanSizeStr.toLowerCase().includes("gib")) {
            job.sizeBytes = Math.round(parseFloat(cleanSizeStr) * 1024 * 1024 * 1024);
          } else if (cleanSizeStr.toLowerCase().includes("kib")) {
            job.sizeBytes = Math.round(parseFloat(cleanSizeStr) * 1024);
          }
        }
      });

      child.stderr.on("data", (chunk) => {
        console.error(`[yt-dlp error] ${chunk.toString().trim()}`);
      });

      return new Promise((resolve) => {
        child.on("close", async (code) => {
          if (job.status === "paused") {
            resolve();
            return;
          }
          activeDownloads = activeDownloads.filter((j) => j.id !== jobId);
          
          if (code === 0 && fs.existsSync(fullFilePath)) {
            const stats = fs.statSync(fullFilePath);
            const finalSizeBytes = stats.size;
            const finalSize = formatBytes(finalSizeBytes);
            const totalDuration = (Date.now() - startTime) / 1000;
            const avgSpeed = formatBytes(finalSizeBytes / Math.max(1, totalDuration)) + "/s";

            try {
              await Download.create({
                jobId,
                name: job.name,
                type,
                format,
                size: finalSize,
                sizeBytes: finalSizeBytes,
                status: "completed",
                speed: avgSpeed,
                url,
                resolution: type === "audio" ? "N/A" : resolution,
                duration: job.duration || "0:30",
                thumbnail,
                path: fullFilePath,
              });
            } catch (dbErr) {
              console.error("Failed to log completion in DB:", dbErr.message);
            }
          } else {
            if (fs.existsSync(fullFilePath)) {
              try { fs.unlinkSync(fullFilePath); } catch (e) {}
            }

            try {
              await Download.create({
                jobId,
                name: job.name,
                type,
                format,
                size: "0 B",
                sizeBytes: 0,
                status: "failed",
                speed: "0 B/s",
                url,
                resolution,
                path: fullFilePath,
              });
            } catch (dbErr) {
              console.error("Failed to log failure in DB:", dbErr.message);
            }
          }
          resolve();
        });

        child.on("error", async (err) => {
          if (job.status === "paused") {
            resolve();
            return;
          }
          activeDownloads = activeDownloads.filter((j) => j.id !== jobId);
          if (fs.existsSync(fullFilePath)) {
            try { fs.unlinkSync(fullFilePath); } catch (e) {}
          }
          try {
            await Download.create({
              jobId,
              name: job.name,
              type,
              format,
              size: "0 B",
              sizeBytes: 0,
              status: "failed",
              speed: "0 B/s",
              url,
              resolution,
              path: fullFilePath,
            });
          } catch (dbErr) {
            console.error("Failed to log failure in DB:", dbErr.message);
          }
          resolve();
        });
      });

    } catch (err) {
      activeDownloads = activeDownloads.filter((j) => j.id !== jobId);
      if (fs.existsSync(fullFilePath)) {
        try { fs.unlinkSync(fullFilePath); } catch (e) {}
      }
      try {
        await Download.create({
          jobId,
          name: job.name,
          type: type || "video",
          format: format || "MP4",
          size: "0 B",
          sizeBytes: 0,
          status: "failed",
          speed: "0 B/s",
          url,
          resolution,
          path: fullFilePath,
        });
      } catch (dbErr) {
        console.error("Failed to log failure in DB:", dbErr.message);
      }
      return Promise.resolve();
    }
  } else {
    try {
      const response = await axios({
        method: "get",
        url: url,
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 30000
      });

      const contentType = response.headers["content-type"];
      const totalSizeBytes = parseInt(response.headers["content-length"] || "0", 10);
      
      job.sizeBytes = totalSizeBytes;
      job.size = totalSizeBytes > 0 ? formatBytes(totalSizeBytes) : "Calculating...";

      writer = fs.createWriteStream(fullFilePath);
      
      // Store cancel handler on job object
      job.cancel = () => {
        try {
          writer.destroy();
          response.data.destroy();
        } catch (e) {}
      };

      let downloadedBytes = 0;
      let lastDownloadedBytes = 0;
      let startTime = Date.now();
      let lastUpdateTime = Date.now();

      response.data.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        
        const now = Date.now();
        if (now - lastUpdateTime >= 1000) {
          const timeDiff = (now - lastUpdateTime) / 1000;
          const bytesPerSec = (downloadedBytes - lastDownloadedBytes) / timeDiff;
          
          const progress = totalSizeBytes > 0 ? Math.round((downloadedBytes / totalSizeBytes) * 100) : 50;
          const remainingBytes = totalSizeBytes - downloadedBytes;
          const etaSec = bytesPerSec > 0 ? Math.ceil(remainingBytes / bytesPerSec) : 0;

          job.progress = Math.min(99, progress);
          job.speed = `${formatBytes(bytesPerSec)}/s`;
          job.eta = totalSizeBytes > 0 ? `${etaSec}s` : "Unknown";
          job.size = formatBytes(downloadedBytes);

          lastDownloadedBytes = downloadedBytes;
          lastUpdateTime = now;
        }
      });

      response.data.pipe(writer);

      return new Promise((resolve) => {
        writer.on("finish", async () => {
          // Remove from active queue
          activeDownloads = activeDownloads.filter((j) => j.id !== jobId);

          const finalSize = formatBytes(downloadedBytes);
          const totalDuration = (Date.now() - startTime) / 1000;
          const avgSpeed = formatBytes(downloadedBytes / Math.max(1, totalDuration)) + "/s";

          try {
            await Download.create({
              jobId,
              name: job.name,
              type,
              format,
              size: finalSize,
              sizeBytes: downloadedBytes,
              status: "completed",
              speed: avgSpeed,
              url,
              resolution,
              duration: type === "image" ? "N/A" : "0:25",
              thumbnail,
              path: fullFilePath,
            });
          } catch (dbErr) {
            console.error("Failed to log completion in DB:", dbErr.message);
          }
          resolve();
        });

        writer.on("error", async (err) => {
          if (job.status === "paused") {
            resolve();
            return;
          }
          activeDownloads = activeDownloads.filter((j) => j.id !== jobId);
          writer.close();
          if (fs.existsSync(fullFilePath)) {
            try { fs.unlinkSync(fullFilePath); } catch (e) {}
          }

          try {
            await Download.create({
              jobId,
              name: job.name,
              type,
              format,
              size: "0 B",
              sizeBytes: 0,
              status: "failed",
              speed: "0 B/s",
              url,
              resolution,
              path: fullFilePath,
            });
          } catch (dbErr) {
            console.error("Failed to log failure in DB:", dbErr.message);
          }
          resolve();
        });
      });

    } catch (err) {
      activeDownloads = activeDownloads.filter((j) => j.id !== jobId);
      if (writer) {
        writer.close();
      }
      if (fs.existsSync(fullFilePath)) {
        try { fs.unlinkSync(fullFilePath); } catch (e) {}
      }

      try {
        await Download.create({
          jobId,
          name: job.name,
          type: type || "video",
          format: format || "MP4",
          size: "0 B",
          sizeBytes: 0,
          status: "failed",
          speed: "0 B/s",
          url,
          resolution,
          path: fullFilePath,
        });
      } catch (dbErr) {
        console.error("Failed to log failure in DB:", dbErr.message);
      }
      return Promise.resolve();
    }
  }
};

// POST start a new media download stream (adds to queue)
export const startDownload = async (req, res) => {
  let { url, resolution = "Original", mediaType = "video" } = req.body;

  if (!url) {
    return res.status(400).json({ message: "URL is required" });
  }

  try {
    // Always default to system Downloads folder
    const isVercel = process.env.VERCEL || process.env.NOW_REGION;
    const resolvedDir = isVercel
      ? path.join(os.tmpdir(), "Downloads")
      : path.join(os.homedir(), "Downloads");

    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true });
    }

    let isYoutube = isYoutubeUrl(url);
    let targetDownloadUrl = url;

    // Handle Youtube image download fallback (construct thumbnail URL)
    if (isYoutube && mediaType === "image") {
      const videoId = getYoutubeVideoId(url);
      if (videoId) {
        targetDownloadUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
      isYoutube = false; // treat it as a direct image download
    }

    let filename = "";
    let format = "";
    let thumbnail = "";
    let duration = "N/A";
    let type = mediaType;

    if (isYoutube) {
      try {
        const info = await getYtDlpInfo(url);
        const title = info.title || "Youtube Video";
        const cleanTitle = title.replace(/[\\/:*?"<>|]/g, "_");
        
        if (mediaType === "audio") {
          format = "MP3";
          filename = `${cleanTitle}.mp3`;
          type = "audio";
        } else {
          format = "MP4";
          filename = `${cleanTitle}.mp4`;
          type = "video";
        }

        const lenSec = parseInt(info.duration, 10) || 0;
        if (lenSec > 0) {
          const minutes = Math.floor(lenSec / 60);
          const seconds = lenSec % 60;
          duration = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
        } else {
          duration = "0:30";
        }

        thumbnail = info.thumbnail || `https://img.youtube.com/vi/${getYoutubeVideoId(url)}/hqdefault.jpg`;
      } catch (err) {
        console.error("Failed to fetch youtube video info via yt-dlp:", err.message);
        const videoId = getYoutubeVideoId(url) || `youtube_${Date.now()}`;
        if (mediaType === "audio") {
          format = "MP3";
          filename = `youtube_${videoId}.mp3`;
          type = "audio";
        } else {
          format = "MP4";
          filename = `youtube_${videoId}.mp4`;
          type = "video";
        }
        thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        duration = "0:30";
      }
    } else {
      // Direct file download
      try {
        filename = path.basename(new URL(targetDownloadUrl).pathname);
      } catch (err) {
        filename = `media_${Date.now()}`;
      }

      if (!filename || filename.indexOf(".") === -1) {
        if (mediaType === "audio") {
          format = "MP3";
          filename = `media_${Date.now()}.mp3`;
        } else if (mediaType === "video") {
          format = "MP4";
          filename = `media_${Date.now()}.mp4`;
        } else {
          format = "JPG";
          filename = `media_${Date.now()}.jpg`;
        }
      } else {
        const ext = path.extname(filename).toLowerCase();
        format = ext.replace(".", "").toUpperCase();
      }

      if (type === "image") {
        thumbnail = targetDownloadUrl;
        duration = "N/A";
      } else {
        thumbnail = "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=300&q=80";
        duration = type === "audio" ? "3:30" : "0:25";
      }
    }

    const jobId = "DL-" + Date.now();
    const fullFilePath = path.join(resolvedDir, filename);

    const queuedJob = {
      id: jobId,
      name: filename,
      type,
      format,
      size: "Queued...",
      sizeBytes: 0,
      progress: 0,
      speed: "0 B/s",
      eta: "Queued",
      status: "queued",
      url: targetDownloadUrl,
      resolution,
      duration,
      thumbnail,
      path: fullFilePath,
      isYoutube,
      timestamp: new Date().toISOString(),
    };

    activeDownloads.push(queuedJob);

    // Trigger queue processor asynchronously
    processQueue();

    res.status(202).json({
      success: true,
      message: "Download job queued successfully",
      jobId,
      filename,
      savePath: fullFilePath,
      status: "queued"
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to queue download", error: error.message });
  }
};

// DELETE a download log (and deletes file from local server disk)
export const deleteDownload = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if it's an active in-memory download job
    if (id.startsWith("DL-")) {
      const activeJob = activeDownloads.find((j) => j.id === id);
      if (activeJob) {
        if (activeJob.cancel) {
          activeJob.cancel();
        }
        activeDownloads = activeDownloads.filter((j) => j.id !== id);
        
        // Wait briefly for file write streams to close before deleting partial file
        setTimeout(() => {
          if (fs.existsSync(activeJob.path)) {
            try { fs.unlinkSync(activeJob.path); } catch (e) {}
          }
        }, 800);

        // Resume queue processing
        processQueue();

        return res.status(200).json({ success: true, message: "Active download queue job cancelled successfully" });
      }
      return res.status(404).json({ message: "Active queue job not found" });
    }

    const record = await Download.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Download log not found" });
    }

    if (fs.existsSync(record.path)) {
      try {
        fs.unlinkSync(record.path);
      } catch (fileErr) {
        console.error("Error unlinking file:", fileErr.message);
      }
    }

    await Download.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Download log and physical file deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting log", error: error.message });
  }
};

// DELETE wipe entire download database history
export const clearAllDownloads = async (req, res) => {
  try {
    // Delete database records
    await Download.deleteMany();
    res.status(200).json({ success: true, message: "Download database logs cleared" });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear logs database", error: error.message });
  }
};

// GET list of active system disks/drives
export const getDisks = async (req, res) => {
  try {
    let drives = [];
    if (process.platform === "win32") {
      try {
        const stdout = execSync("wmic logicaldisk get caption").toString();
        drives = stdout
          .split("\r\n")
          .map((line) => line.trim())
          .filter((line) => line && line !== "Caption" && /^[A-Z]:$/i.test(line));
      } catch (e) {
        // Fallback: check A to Z
        for (let i = 65; i <= 90; i++) {
          const drive = String.fromCharCode(i) + ":";
          try {
            fs.accessSync(drive + "\\", fs.constants.F_OK);
            drives.push(drive);
          } catch (err) {}
        }
      }
    } else {
      // Unix-based default root mount
      drives = ["/"];
    }
    res.status(200).json(drives);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch disks list", error: error.message });
  }
};

// GET list of subfolders within a directory path
export const getFolders = async (req, res) => {
  const { path: dirPath } = req.query;
  if (!dirPath) {
    return res.status(400).json({ message: "Path parameter is required" });
  }

  try {
    const resolvedPath = path.resolve(dirPath);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ message: "Path does not exist" });
    }

    const items = fs.readdirSync(resolvedPath, { withFileTypes: true });
    const folders = items
      .filter((item) => {
        try {
          return item.isDirectory() && 
                 !item.name.startsWith(".") && 
                 !item.name.startsWith("$") &&
                 item.name !== "System Volume Information";
        } catch (e) {
          return false;
        }
      })
      .map((item) => item.name);

    res.status(200).json(folders);
  } catch (error) {
    res.status(500).json({ message: "Error reading directory folders", error: error.message });
  }
};

// GET physical storage (disk) usage metrics for a path
export const getStorageStats = async (req, res) => {
  const { path: dirPath } = req.query;
  const targetPath = dirPath ? path.resolve(dirPath) : path.join(os.homedir(), "Downloads");

  try {
    let checkPath = targetPath;
    // Walk up until we find an existing folder/root to query
    while (checkPath && !fs.existsSync(checkPath)) {
      checkPath = path.dirname(checkPath);
    }

    if (!checkPath) {
      checkPath = process.platform === "win32" ? "C:\\" : "/";
    }

    const stats = fs.statfsSync(checkPath);
    const totalBytes = stats.blocks * stats.bsize;
    const freeBytes = stats.bfree * stats.bsize;
    const usedBytes = totalBytes - freeBytes;

    res.status(200).json({
      success: true,
      totalBytes,
      freeBytes,
      usedBytes,
      path: checkPath
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to read storage statistics", error: error.message });
  }
};

// POST open local file in system explorer (opens containing directory and highlights the file on Windows)
export const viewFileInExplorer = async (req, res) => {
  const { id } = req.body;

  try {
    const record = await Download.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Download log not found" });
    }

    const filePath = path.resolve(record.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Physical file not found on disk" });
    }

    if (process.platform === "win32") {
      const winPath = filePath.replace(/\//g, "\\");
      exec(`explorer.exe /select,"${winPath}"`);
    } else if (process.platform === "darwin") {
      exec(`open -R "${filePath}"`);
    } else {
      const dirPath = path.dirname(filePath);
      exec(`xdg-open "${dirPath}"`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to open file location", error: error.message });
  }
};

// POST pause an active download job
export const pauseDownload = async (req, res) => {
  const { id } = req.params;
  try {
    const activeJob = activeDownloads.find((j) => j.id === id);
    if (activeJob) {
      if (activeJob.status === "downloading" && activeJob.cancel) {
        activeJob.cancel();
      }
      activeJob.status = "paused";
      activeJob.speed = "Paused";
      activeJob.eta = "--";
      
      // Process the next item in queue
      processQueue();
      return res.status(200).json({ success: true, message: "Download paused successfully", job: activeJob });
    }
    res.status(404).json({ message: "Active download job not found" });
  } catch (error) {
    res.status(500).json({ message: "Failed to pause download", error: error.message });
  }
};

// POST resume a paused download job
export const resumeDownload = async (req, res) => {
  const { id } = req.params;
  try {
    const activeJob = activeDownloads.find((j) => j.id === id);
    if (activeJob) {
      if (activeJob.status === "paused") {
        activeJob.status = "queued";
        activeJob.speed = "0 B/s";
        activeJob.eta = "Queued";
        
        // Trigger queue processor to pick it up
        processQueue();
        return res.status(200).json({ success: true, message: "Download resumed successfully", job: activeJob });
      }
      return res.status(400).json({ message: "Job is not paused" });
    }
    res.status(404).json({ message: "Active download job not found" });
  } catch (error) {
    res.status(500).json({ message: "Failed to resume download", error: error.message });
  }
};

// GET stream/download media directly to client device (mobile/browser)
export const streamMediaDirect = async (req, res) => {
  const { url, mediaType = "video", resolution = "Original" } = req.query;

  if (!url) {
    return res.status(400).json({ message: "URL is required" });
  }

  const isYoutube = isYoutubeUrl(url);

  try {
    if (isYoutube) {
      // Fetch YouTube video info
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title || "Youtube_Video";
      const cleanTitle = title.replace(/[\\/:*?"<>|]/g, "_");

      if (mediaType === "audio") {
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(cleanTitle)}.mp3"`);
        res.setHeader("Content-Type", "audio/mpeg");
        
        // ytdl audioonly stream with error handling to avoid crashes
        const audioStream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });
        audioStream.on("error", (err) => {
          console.error("Direct audio stream error:", err.message);
          if (!res.headersSent) res.redirect(url);
        });
        audioStream.pipe(res);
      } else {
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(cleanTitle)}.mp4"`);
        res.setHeader("Content-Type", "video/mp4");

        // Choose appropriate resolution format
        let format = null;
        if (resolution === "1080p") {
          format = ytdl.chooseFormat(info.formats, { quality: "137" }); // 1080p video id
        } else if (resolution === "720p") {
          format = ytdl.chooseFormat(info.formats, { quality: "136" }); // 720p video id
        } else if (resolution === "480p") {
          format = ytdl.chooseFormat(info.formats, { quality: "135" }); // 480p video id
        }

        // Fallback to highest format that has both audio and video
        if (!format) {
          format = ytdl.chooseFormat(info.formats, { filter: "audioandvideo", quality: "highest" }) 
                   || ytdl.chooseFormat(info.formats, { filter: "audioandvideo" });
        }

        // If we are on Vercel, redirect to the direct URL to avoid 4.5MB / 10s serverless function timeout limits
        const isVercel = process.env.VERCEL || process.env.NOW_REGION;
        if (isVercel && format && format.url) {
          return res.redirect(format.url);
        }

        if (format && format.url) {
          // Stream from Google video server directly through our server if not on Vercel
          const streamResponse = await axios({
            method: "get",
            url: format.url,
            responseType: "stream"
          });
          streamResponse.data.pipe(res);
        } else {
          // Fallback to default ytdl stream with error handling to avoid crashes
          const fallbackStream = ytdl(url, { quality: "highest" });
          fallbackStream.on("error", (err) => {
            console.error("Direct fallback video stream error:", err.message);
            if (!res.headersSent) res.redirect(url);
          });
          fallbackStream.pipe(res);
        }
      }
    } else {
      // Direct file url (e.g. image, direct video link)
      let filename = "downloaded_file";
      try {
        filename = path.basename(new URL(url).pathname);
      } catch (e) {}

      // If we are on Vercel, redirect to the direct file URL to bypass Vercel limits completely
      const isVercel = process.env.VERCEL || process.env.NOW_REGION;
      if (isVercel) {
        return res.redirect(url);
      }

      const response = await axios({
        method: "get",
        url: url,
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      const contentType = response.headers["content-type"];
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      response.data.pipe(res);
    }
  } catch (error) {
    console.error("Direct streaming error:", error.message);
    // If anything fails or throws an error, redirect user to the original url as fallback
    try {
      res.redirect(url);
    } catch (e) {
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to stream media", error: error.message });
      }
    }
  }
};

// GET download a completed file from server disk
export const downloadCompletedFile = async (req, res) => {
  const { id } = req.params;
  try {
    const record = await Download.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Download log not found" });
    }

    const filePath = path.resolve(record.path);
    if (!fs.existsSync(filePath)) {
      // Fallback: redirect to stream endpoint if local file is missing (e.g., on Vercel ephemeral disk)
      const apiBaseUrl = process.env.VERCEL || process.env.NOW_REGION ? "" : "/api";
      const streamUrl = `${apiBaseUrl}/downloads/stream?url=${encodeURIComponent(record.url)}&mediaType=${record.type}&resolution=${record.resolution || "Original"}`;
      return res.redirect(streamUrl);
    }

    res.download(filePath, path.basename(filePath));
  } catch (error) {
    console.error("Download completed file error:", error.message);
    res.status(500).json({ message: "Failed to download file", error: error.message });
  }
};
