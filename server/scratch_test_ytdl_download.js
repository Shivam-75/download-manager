import ytdl from '@distube/ytdl-core';
import fs from 'fs';

async function testDownload() {
  const url = 'https://www.youtube.com/watch?v=shqwsE3b0c8';
  console.log('Starting ytdl-core download test for:', url);
  try {
    const stream = ytdl(url, { filter: 'audioandvideo', quality: 'highest' });
    const writer = fs.createWriteStream('test_video.mp4');

    stream.on('progress', (chunk, downloaded, total) => {
      console.log(`Progress: ${downloaded} / ${total} bytes (${Math.round((downloaded/total)*100)}%)`);
    });

    stream.on('error', (err) => {
      console.error('STREAM ERROR:', err.message);
    });

    writer.on('finish', () => {
      console.log('DOWNLOAD COMPLETE!');
    });

    writer.on('error', (err) => {
      console.error('WRITER ERROR:', err.message);
    });

    stream.pipe(writer);
  } catch (err) {
    console.error('CATCH ERROR:', err.message);
  }
}

testDownload();
