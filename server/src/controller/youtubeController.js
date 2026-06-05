import axios from "axios";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { getYtDlpPath } from "../utils/ytDlpHelper.js";

// Scraping search results directly from YouTube initial data
const runYoutubeSearch = async (query) => {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  const html = response.data;
  const marker = 'var ytInitialData = ';
  const start = html.indexOf(marker);
  if (start === -1) {
    throw new Error('ytInitialData not found in YouTube response');
  }

  const fromMarker = html.substring(start + marker.length);
  const end = fromMarker.indexOf(';</script>');
  if (end === -1) {
    throw new Error('Invalid ytInitialData format in YouTube response');
  }

  const jsonStr = fromMarker.substring(0, end);
  const data = JSON.parse(jsonStr);

  const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
  if (!contents) return [];

  let videoRenderers = [];
  for (const section of contents) {
    if (section.itemSectionRenderer?.contents) {
      for (const item of section.itemSectionRenderer.contents) {
        if (item.videoRenderer) {
          videoRenderers.push(item.videoRenderer);
        }
      }
    }
  }

  return videoRenderers.map(video => {
    const id = video.videoId;
    const title = video.title?.runs?.[0]?.text || 'YouTube Video';
    const duration = video.lengthText?.simpleText || 'N/A';

    let thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    if (video.thumbnail?.thumbnails?.length > 0) {
      thumbnail = video.thumbnail.thumbnails[video.thumbnail.thumbnails.length - 1].url;
    }

    const uploader = video.ownerText?.runs?.[0]?.text || 'Unknown Channel';
    const uploader_url_path = video.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || '';
    const uploader_url = uploader_url_path ? `https://www.youtube.com${uploader_url_path}` : '';

    const viewsText = video.viewCountText?.simpleText || video.viewCountText?.runs?.[0]?.text || '';
    let viewCount = 0;
    if (viewsText) {
      const match = viewsText.replace(/,/g, '').match(/\d+/);
      if (match) {
        viewCount = parseInt(match[0], 10);
      }
    }

    const uploadedAt = video.publishedTimeText?.simpleText || 'Recently';

    return {
      id,
      url: `https://www.youtube.com/watch?v=${id}`,
      title,
      duration,
      thumbnail,
      channel: {
        name: uploader,
        url: uploader_url
      },
      views: viewCount || viewsText || 0,
      uploadedAt
    };
  });
};

// GET popular/trending YouTube videos by category query via direct parsing
export const getTrendingVideos = async (req, res) => {
  const { category } = req.query;
  const searchKeyword = category ? `${category} popular` : "trending music";

  try {
    const formatted = await runYoutubeSearch(searchKeyword);
    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching trending videos:", error.message);
    res.status(500).json({ message: "Failed to fetch trending videos", error: error.message });
  }
};

// GET search results for a YouTube query term via direct parsing
export const searchVideos = async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: "Search query parameter (q) is required" });
  }

  try {
    const formatted = await runYoutubeSearch(q);
    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error searching YouTube videos:", error.message);
    res.status(500).json({ message: "Failed to search YouTube videos", error: error.message });
  }
};

// GET formats, resolutions, and estimated file sizes for a YouTube video
export const getVideoInfo = async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ message: "URL parameter (url) is required" });
  }

  const ytdlpPath = getYtDlpPath();
  const cookiesPath = path.resolve("./cookies.txt");
  const cookiesArg = fs.existsSync(cookiesPath) ? `--cookies "${cookiesPath}"` : "";
  const command = ytdlpPath === "yt-dlp"
    ? `yt-dlp --dump-json --extractor-args "youtube:player-client=ios" ${cookiesArg} "${url}"`
    : `"${ytdlpPath}" --dump-json --extractor-args "youtube:player-client=ios" ${cookiesArg} "${url}"`;
  exec(command, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
    if (err) {
      console.error("Error fetching video info via yt-dlp:", err.message);
      const cookiesExist = fs.existsSync(cookiesPath);
      const cookiesSize = cookiesExist ? fs.statSync(cookiesPath).size : 0;
      return res.status(500).json({ 
        message: "Failed to fetch video info", 
        error: err.message,
        diagnostics: {
          cookiesExist,
          cookiesSize,
          cookiesPath
        }
      });
    }
    try {
      const info = JSON.parse(stdout);
      const formats = info.formats || [];
      
      // Calculate sizes
      const audioFormats = formats.filter(f => f.vcodec === "none" && f.acodec !== "none");
      audioFormats.sort((a, b) => (b.filesize || b.filesize_approx || 0) - (a.filesize || a.filesize_approx || 0));
      const bestAudioSize = audioFormats[0] ? (audioFormats[0].filesize || audioFormats[0].filesize_approx || 0) : 0;
      
      const getResSize = (height) => {
        const resFormats = formats.filter(f => f.vcodec !== "none" && f.height === height);
        if (resFormats.length === 0) return 0;
        resFormats.sort((a, b) => (b.filesize || b.filesize_approx || 0) - (a.filesize || a.filesize_approx || 0));
        const bestResSize = resFormats[0].filesize || resFormats[0].filesize_approx || 0;
        return bestResSize + bestAudioSize;
      };

      const allVideoFormats = formats.filter(f => f.vcodec !== "none");
      allVideoFormats.sort((a, b) => (b.filesize || b.filesize_approx || 0) - (a.filesize || a.filesize_approx || 0));
      const bestVideoSize = allVideoFormats[0] ? (allVideoFormats[0].filesize || allVideoFormats[0].filesize_approx || 0) : 0;
      const originalSize = bestVideoSize + bestAudioSize;

      const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return null;
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
      };

      const sizes = {
        "1080p": formatBytes(getResSize(1080)),
        "720p": formatBytes(getResSize(720)),
        "480p": formatBytes(getResSize(480)),
        "360p": formatBytes(getResSize(360)),
        "Original": formatBytes(originalSize),
        "audio": formatBytes(bestAudioSize)
      };

      res.status(200).json({
        title: info.title,
        duration: info.duration,
        thumbnail: info.thumbnail,
        sizes
      });
    } catch (e) {
      console.error("Failed to parse yt-dlp json output:", e.message);
      res.status(500).json({ message: "Failed to parse video info", error: e.message });
    }
  });
};
