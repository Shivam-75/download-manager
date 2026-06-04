import fs from "fs";
import path from "path";

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
