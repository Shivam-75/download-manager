import mongoose from "mongoose";

const downloadSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["image", "video", "audio"],
    },
    format: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      required: true,
      enum: ["completed", "failed"],
    },
    speed: {
      type: String,
      default: "0 B/s",
    },
    url: {
      type: String,
      required: true,
    },
    resolution: {
      type: String,
      default: "N/A",
    },
    duration: {
      type: String,
      default: "N/A",
    },
    thumbnail: {
      type: String,
      default: "",
    },
    path: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Download = mongoose.model("Download", downloadSchema);

export default Download;
