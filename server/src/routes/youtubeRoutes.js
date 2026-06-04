import express from "express";
import { getTrendingVideos, searchVideos, getVideoInfo } from "../controller/youtubeController.js";

const router = express.Router();

// GET popular/trending YouTube feed by category
router.get("/trending", getTrendingVideos);

// GET live YouTube search results
router.get("/search", searchVideos);

// GET formats, resolutions, and estimated file sizes for a YouTube video
router.get("/info", getVideoInfo);

export default router;
