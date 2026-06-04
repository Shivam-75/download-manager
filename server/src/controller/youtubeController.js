import { spawn } from "child_process";
import path from "path";

// Execute local yt-dlp search query using spawn to prevent argument escaping issues
const runYtDlpSearch = (query, limit = 24) => {
  return new Promise((resolve, reject) => {
    const ytdlpPath = path.resolve("./bin/yt-dlp.exe");
    const args = [
      `ytsearch${limit}:${query}`,
      "--flat-playlist",
      "--dump-single-json"
    ];
    
    const child = spawn(ytdlpPath, args);
    let stdoutData = "";
    let stderrData = "";

    child.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp search failed with exit code ${code}. Stderr: ${stderrData}`));
      }
      try {
        const data = JSON.parse(stdoutData);
        resolve(data.entries || []);
      } catch (e) {
        reject(new Error(`Failed to parse yt-dlp search output: ${e.message}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
};

// Format yt-dlp entries for frontend consumption
const formatVideoList = (entries) => {
  return (entries || []).map((entry) => {
    // Format duration from seconds to MM:SS
    let durationRaw = "N/A";
    if (entry.duration) {
      const sec = parseInt(entry.duration, 10);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      durationRaw = `${m}:${s < 10 ? "0" : ""}${s}`;
    }

    // Get best thumbnail
    let thumbnail = `https://img.youtube.com/vi/${entry.id}/hqdefault.jpg`;
    if (entry.thumbnails && entry.thumbnails.length > 0) {
      thumbnail = entry.thumbnails[entry.thumbnails.length - 1].url || thumbnail;
    }

    // Format publish date from YYYYMMDD
    let uploadedAt = "Recently";
    if (entry.upload_date) {
      const year = entry.upload_date.slice(0, 4);
      const month = entry.upload_date.slice(4, 6);
      const day = entry.upload_date.slice(6, 8);
      uploadedAt = `${day}-${month}-${year}`;
    }

    return {
      id: entry.id,
      url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
      title: entry.title || "YouTube Video",
      duration: durationRaw,
      thumbnail: thumbnail,
      channel: {
        name: entry.uploader || "Unknown Channel",
        url: entry.uploader_url || ""
      },
      views: entry.view_count || 0,
      uploadedAt: uploadedAt
    };
  });
};

// GET popular/trending YouTube videos by category query via yt-dlp
export const getTrendingVideos = async (req, res) => {
  const { category } = req.query;
  const searchKeyword = category ? `${category} popular` : "trending music";

  try {
    const entries = await runYtDlpSearch(searchKeyword, 24);
    const formatted = formatVideoList(entries);
    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching trending videos via yt-dlp:", error.message);
    res.status(500).json({ message: "Failed to fetch trending videos", error: error.message });
  }
};

// GET search results for a YouTube query term via yt-dlp
export const searchVideos = async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: "Search query parameter (q) is required" });
  }

  try {
    const entries = await runYtDlpSearch(q, 24);
    const formatted = formatVideoList(entries);
    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error searching YouTube videos via yt-dlp:", error.message);
    res.status(500).json({ message: "Failed to search YouTube videos", error: error.message });
  }
};
