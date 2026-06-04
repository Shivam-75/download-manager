import express from "express";
import { getTrendingVideos, searchVideos } from "../controller/youtubeController.js";

const router = express.Router();

// GET popular/trending YouTube feed by category
router.get("/trending", getTrendingVideos);

// GET live YouTube search results
router.get("/search", searchVideos);

export default router;
