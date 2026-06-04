import axios from "axios";

// Scraping search results directly from YouTube initial data
const runYoutubeSearch = async (query) => {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  const html = response.data;
  const marker = 'var ytInitialData = ';
  const start = html.indexOf(marker);
  if (start === -1) {
    throw new Error('ytInitialData not found in YouTube response');
  }

  const fromMarker = html.substring(start + marker.length);
  const end = fromMarker.indexOf(';</script>');
  if (end === -1) {
    throw new Error('Invalid ytInitialData format in YouTube response');
  }

  const jsonStr = fromMarker.substring(0, end);
  const data = JSON.parse(jsonStr);

  const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
  if (!contents) return [];

  let videoRenderers = [];
  for (const section of contents) {
    if (section.itemSectionRenderer?.contents) {
      for (const item of section.itemSectionRenderer.contents) {
        if (item.videoRenderer) {
          videoRenderers.push(item.videoRenderer);
        }
      }
    }
  }

  return videoRenderers.map(video => {
    const id = video.videoId;
    const title = video.title?.runs?.[0]?.text || 'YouTube Video';
    const duration = video.lengthText?.simpleText || 'N/A';
    
    let thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    if (video.thumbnail?.thumbnails?.length > 0) {
      thumbnail = video.thumbnail.thumbnails[video.thumbnail.thumbnails.length - 1].url;
    }
    
    const uploader = video.ownerText?.runs?.[0]?.text || 'Unknown Channel';
    const uploader_url_path = video.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || '';
    const uploader_url = uploader_url_path ? `https://www.youtube.com${uploader_url_path}` : '';
    
    const viewsText = video.viewCountText?.simpleText || video.viewCountText?.runs?.[0]?.text || '';
    let viewCount = 0;
    if (viewsText) {
      const match = viewsText.replace(/,/g, '').match(/\d+/);
      if (match) {
        viewCount = parseInt(match[0], 10);
      }
    }
    
    const uploadedAt = video.publishedTimeText?.simpleText || 'Recently';
    
    return {
      id,
      url: `https://www.youtube.com/watch?v=${id}`,
      title,
      duration,
      thumbnail,
      channel: {
        name: uploader,
        url: uploader_url
      },
      views: viewCount || viewsText || 0,
      uploadedAt
    };
  });
};

// GET popular/trending YouTube videos by category query via direct parsing
export const getTrendingVideos = async (req, res) => {
  const { category } = req.query;
  const searchKeyword = category ? `${category} popular` : "trending music";

  try {
    const formatted = await runYoutubeSearch(searchKeyword);
    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching trending videos:", error.message);
    res.status(500).json({ message: "Failed to fetch trending videos", error: error.message });
  }
};

// GET search results for a YouTube query term via direct parsing
export const searchVideos = async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: "Search query parameter (q) is required" });
  }

  try {
    const formatted = await runYoutubeSearch(q);
    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error searching YouTube videos:", error.message);
    res.status(500).json({ message: "Failed to search YouTube videos", error: error.message });
  }
};
