import fs from "fs";
import path from "path";
import https from "https";

/**
 * Dynamically resolves the path to the yt-dlp binary based on the OS.
 * Returns absolute path if local binary exists, otherwise falls back to system PATH.
 */
export const getYtDlpPath = () => {
  // 1. If on Windows, check local bin first
  if (process.platform === "win32") {
    const localWinPath = path.resolve("./bin/yt-dlp.exe");
    if (fs.existsSync(localWinPath)) {
      return localWinPath;
    }
    return "yt-dlp"; // Fallback to system-wide yt-dlp in PATH
  }

  // 2. If on Linux/Unix (like Render), check local linux binary first
  const localLinuxPath = path.resolve("./bin/yt-dlp");
  if (fs.existsSync(localLinuxPath)) {
    // Ensure it has executable permissions on Linux
    try {
      fs.chmodSync(localLinuxPath, "755");
    } catch (e) {
      console.warn("Warning: Failed to set executable permissions on local yt-dlp binary:", e.message);
    }
    return localLinuxPath;
  }

  // 3. Fallback to system-wide command in PATH
  return "yt-dlp";
};

/**
 * Downloads the correct yt-dlp binary (Windows/Linux) if not present locally.
 * This runs on startup and ensures zero-configuration environments (like Render).
 */
export const initYtDlp = () => {
  return new Promise((resolve) => {
    // Ensure bin folder exists
    const binDir = path.resolve("./bin");
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    const platform = process.platform;
    let downloadUrl = "";
    let localPath = "";

    if (platform === "win32") {
      localPath = path.join(binDir, "yt-dlp.exe");
      downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
    } else {
      localPath = path.join(binDir, "yt-dlp");
      downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
    }

    if (fs.existsSync(localPath)) {
      // Already exists, just ensure executable permissions on Linux
      if (platform !== "win32") {
        try {
          fs.chmodSync(localPath, "755");
        } catch (e) {}
      }
      return resolve(localPath);
    }

    console.log(`[yt-dlp init] Binary not found at ${localPath}. Downloading from ${downloadUrl}...`);

    const file = fs.createWriteStream(localPath);
    
    // Function to handle the https request and any potential redirects (GitHub links redirect to AWS S3)
    const download = (url) => {
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          download(response.headers.location);
        } else if (response.statusCode === 200) {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            if (platform !== "win32") {
              try {
                fs.chmodSync(localPath, "755");
              } catch (e) {}
            }
            console.log("[yt-dlp init] Download complete and permissions set!");
            resolve(localPath);
          });
        } else {
          fs.unlink(localPath, () => {});
          console.error(`[yt-dlp init] Failed to download binary: HTTP ${response.statusCode}`);
          resolve(null);
        }
      }).on("error", (err) => {
        fs.unlink(localPath, () => {});
        console.error("[yt-dlp init] Network error downloading yt-dlp:", err.message);
        resolve(null);
      });
    };

    download(downloadUrl);
  });
};
