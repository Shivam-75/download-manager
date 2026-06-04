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

export default router;
