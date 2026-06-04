import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",

});

// Fetch all logs (includes database completed logs and in-memory active downloads)
export const fetchDownloads = async () => {
    try {
        const response = await API.get("/downloads");
        return response.data;
    } catch (error) {
        console.error("Error fetching downloads:", error);
        throw error;
    }
};

// Start a new background download stream to disk
export const triggerDownload = async (url, downloadPath, resolution, mediaType) => {
  try {
    const response = await API.post("/downloads", { url, downloadPath, resolution, mediaType });
    return response.data;
  } catch (error) {
    console.error("Error starting download:", error);
    throw error;
  }
};

// Delete a download log (and deletes file from local server disk)
export const removeDownload = async (id) => {
    try {
        const response = await API.delete(`/downloads/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting download:", error);
        throw error;
    }
};

// Wipe entire download database history
export const clearAllDownloads = async () => {
    try {
        const response = await API.delete("/downloads");
        return response.data;
    } catch (error) {
        console.error("Error clearing downloads:", error);
        throw error;
    }
};

// Fetch list of active system disks/drives
export const fetchDisks = async () => {
    try {
        const response = await API.get("/downloads/disks");
        return response.data;
    } catch (error) {
        console.error("Error fetching disks:", error);
        throw error;
    }
};

// Fetch subfolders within a specific directory path
export const fetchFolders = async (path) => {
    try {
        const response = await API.get("/downloads/folders", { params: { path } });
        return response.data;
    } catch (error) {
        console.error(`Error fetching folders for path ${path}:`, error);
        throw error;
    }
};

// Fetch physical storage usage metrics for a path
export const fetchStorageStats = async (path) => {
  try {
    const response = await API.get("/downloads/storage", { params: { path } });
    return response.data;
  } catch (error) {
    console.error(`Error fetching storage statistics for path ${path}:`, error);
    throw error;
  }
};

// Open completed download file location in system file explorer
export const openFileInExplorer = async (id) => {
  try {
    const response = await API.post("/downloads/view", { id });
    return response.data;
  } catch (error) {
    console.error("Error opening file in explorer:", error);
    throw error;
  }
};

// Fetch trending YouTube videos by category keyword
export const fetchYoutubeTrending = async (category) => {
  try {
    const response = await API.get("/youtube/trending", { params: { category } });
    return response.data;
  } catch (error) {
    console.error(`Error fetching YouTube trending for category ${category}:`, error);
    throw error;
  }
};

// Search YouTube videos by keyword query
export const searchYoutubeVideos = async (q) => {
  try {
    const response = await API.get("/youtube/search", { params: { q } });
    return response.data;
  } catch (error) {
    console.error(`Error searching YouTube videos for query ${q}:`, error);
    throw error;
  }
};

// Pause a running background download
export const pauseDownload = async (id) => {
  try {
    const response = await API.post(`/downloads/${id}/pause`);
    return response.data;
  } catch (error) {
    console.error("Error pausing download:", error);
    throw error;
  }
};

// Resume a paused background download
export const resumeDownload = async (id) => {
  try {
    const response = await API.post(`/downloads/${id}/resume`);
    return response.data;
  } catch (error) {
    console.error("Error resuming download:", error);
    throw error;
  }
};
