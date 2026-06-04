import express from "express";
import {
  getDownloads,
  startDownload,
  deleteDownload,
  clearAllDownloads,
  getDisks,
  getFolders,
  getStorageStats,
  viewFileInExplorer,
  pauseDownload,
  resumeDownload,
  streamMediaDirect,
  downloadCompletedFile
} from "../controller/downloadController.js";

const router = express.Router();

// GET stream/download media directly to client device
router.get("/stream", streamMediaDirect);

// GET completed file download from server disk
router.get("/file/:id", downloadCompletedFile);

// GET list of active system disks/drives
router.get("/disks", getDisks);

// GET list of subfolders within a path
router.get("/folders", getFolders);

// GET physical drive storage usage metrics
router.get("/storage", getStorageStats);

// GET all downloads (completed logs + active streams)
router.get("/", getDownloads);

// POST initialize a local download
router.post("/", startDownload);

// POST open local file in system explorer
router.post("/view", viewFileInExplorer);

// POST pause an active download
router.post("/:id/pause", pauseDownload);

// POST resume a paused download
router.post("/:id/resume", resumeDownload);

// DELETE remove download log and file
router.delete("/:id", deleteDownload);

// DELETE clear all history logs
router.delete("/", clearAllDownloads);

// GET environment diagnostics check
router.get("/diagnostics", async (req, res) => {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const { exec } = await import("child_process");
    const { getYtDlpPath } = await import("../utils/ytDlpHelper.js");

    const resolvedPath = getYtDlpPath();
    const results = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cwd: process.cwd(),
      binFolderExists: fs.existsSync(path.resolve("./bin")),
      ytDlpPathResolved: resolvedPath,
      ytDlpFileExists: resolvedPath !== "yt-dlp" ? fs.existsSync(resolvedPath) : false,
    };

    if (results.ytDlpFileExists) {
      const stats = fs.statSync(resolvedPath);
      results.ytDlpStats = {
        size: stats.size,
        mode: stats.mode,
      };
    }

    const runCmd = (cmd) => {
      return new Promise((resolve) => {
        exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
          resolve({
            success: !err,
            error: err ? err.message : null,
            stdout: stdout.toString().trim().substring(0, 500),
            stderr: stderr.toString().trim().substring(0, 500),
          });
        });
      });
    };

    const runCommand = resolvedPath === "yt-dlp" ? "yt-dlp --version" : `"${resolvedPath}" --version`;
    results.ytDlpVersionRun = await runCmd(runCommand);
    results.pythonVersionRun = await runCmd("python3 --version || python --version");
    results.ffmpegVersionRun = await runCmd("ffmpeg -version");

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
