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

config();

const PORT = process.env.PORT || 5000;


const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Dynamically allow any origin (e.g. youtube.com, localhost) to avoid wildcard + credentials errors
    callback(null, true);
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

Db().then(() => {
  app.listen(PORT, () =>
    console.log("🚀 Server running at http://localhost:" + PORT)
  );
});


