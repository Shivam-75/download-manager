import express from "express";
import { config } from "dotenv";
import compression from "compression";
import cookieParser from "cookie-parser";
import Db from "./src/database/Db.js";
import cors from "cors";
import morgan from "morgan";
import cluster from "cluster";
import os from "os";
import downloadRoutes from "./src/routes/downloadRoutes.js";
import youtubeRoutes from "./src/routes/youtubeRoutes.js";
import { initYtDlp, writeCookiesFromEnv } from "./src/utils/ytDlpHelper.js";

config();
writeCookiesFromEnv();

const PORT = process.env.PORT || 5000;


const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://download-manager-two.vercel.app"
];

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowed => origin === allowed || origin === allowed + '/') ||
                      origin.startsWith("chrome-extension://") ||
                      origin.startsWith("file://") ||
                      origin.startsWith("capacitor://") ||
                      origin.startsWith("ionic://") ||
                      /^https?:\/\/localhost(:\d+)?\/?$/.test(origin) ||
                      /https?:\/\/.*\.youtube\.com/.test(origin) ||
                      origin === "https://youtube.com";

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api/downloads", downloadRoutes);
app.use("/api/youtube", youtubeRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to Auto Generated Backend!");
});

Db().then(async () => {
  // Automatically download and initialize the OS-specific yt-dlp binary if missing
  await initYtDlp();

  app.listen(PORT, () =>
    console.log("🚀 Server running at http://localhost:" + PORT)
  );
});


