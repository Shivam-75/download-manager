import React from 'react';
import { createRoot } from 'react-dom/client';
import StreamixModal from './components/StreamixModal';
import './content.css';

console.log("🚀 [Streamix Extension] content.js has loaded on YouTube!");

// Extract video title from thumbnail context
function getThumbnailTitle(thumb) {
  let current = thumb;
  for (let i = 0; i < 6; i++) {
    if (!current) break;
    const titleEl = current.querySelector('#video-title, #video-title-link, .ytd-video-renderer #video-title, #video-title-container h3, a.yt-simple-endpoint span, h3, [class*="title"]');
    if (titleEl && titleEl.textContent.trim()) {
      return titleEl.textContent.trim();
    }
    current = current.parentElement;
  }
  
  const anchor = thumb.tagName === 'A' ? thumb : thumb.closest('a[href*="/watch"], a[href*="/shorts"]');
  if (anchor) {
    const titleAttr = anchor.getAttribute('title');
    if (titleAttr && titleAttr.trim()) return titleAttr.trim();
    const labelAttr = anchor.getAttribute('aria-label');
    if (labelAttr && labelAttr.trim()) {
      return labelAttr.trim();
    }
  }
  
  return 'YouTube Stream';
}

// Helper to create the standard Streamix download SVG
function createDownloadSvg(width = '15px', height = '15px') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.style.width = width;
  svg.style.height = height;
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4');
  
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', '7 10 12 15 17 10');
  
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', '12');
  line.setAttribute('y1', '15');
  line.setAttribute('x2', '12');
  line.setAttribute('y2', '3');
  
  svg.appendChild(path);
  svg.appendChild(polyline);
  svg.appendChild(line);
  
  return svg;
}

// Create vanilla DOM download button for thumbnails (Trusted Types compliant)
function createDownloadButton(videoUrl, thumb) {
  const container = document.createElement('div');
  container.className = 'streamix-btn-container';
  
  const button = document.createElement('button');
  button.className = 'streamix-download-btn';
  button.title = 'Download with Streamix';
  button.type = 'button';
  
  const svg = createDownloadSvg('15px', '15px');
  svg.setAttribute('class', 'streamix-icon');
  button.appendChild(svg);
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const title = getThumbnailTitle(thumb);
    console.log(`[Streamix Extension] Thumbnail download clicked. Title: "${title}", URL: ${videoUrl}`);
    window.dispatchEvent(new CustomEvent('streamix-open-modal', {
      detail: { videoUrl, title }
    }));
  });
  
  container.appendChild(button);
  return container;
}

// Find all thumbnails and inject our download button
function injectDownloadButtons() {
  const elements = document.querySelectorAll('ytd-thumbnail, ytd-playlist-thumbnail, a#thumbnail, ytd-moving-thumbnail-renderer, yt-thumbnail-view-model');
  let injectedCount = 0;

  elements.forEach((el) => {
    // Find the enclosing anchor tag
    const anchor = el.tagName === 'A' ? el : el.closest('a[href*="/watch"], a[href*="/shorts"]');
    if (!anchor) return;

    // Avoid double injection on this anchor or any parent/child
    if (anchor.querySelector('.streamix-btn-container') || anchor.closest('[data-streamix-injected]')) {
      return;
    }

    // Get video link
    let videoUrl = '';
    const href = anchor.getAttribute('href');
    if (href) {
      if (href.includes('/watch')) {
        videoUrl = `https://www.youtube.com${href.split('&')[0]}`;
      } else if (href.includes('/shorts/')) {
        const parts = href.split('/shorts/');
        if (parts[1]) {
          const id = parts[1].split('?')[0];
          videoUrl = `https://www.youtube.com/watch?v=${id}`;
        }
      }
    }

    if (!videoUrl) return;

    // Mark as injected
    anchor.setAttribute('data-streamix-injected', 'true');
    
    // Position the anchor relatively so the absolute button aligns correctly
    const style = window.getComputedStyle(anchor);
    if (style.position === 'static') {
      anchor.style.position = 'relative';
    }

    const buttonContainer = createDownloadButton(videoUrl, anchor);
    anchor.appendChild(buttonContainer);
    injectedCount++;
  });

  if (injectedCount > 0) {
    console.log(`[Streamix Extension] Injected download overlay buttons on ${injectedCount} new video links.`);
  }
}

// Create watch page actions bar button (Trusted Types compliant)
function createWatchButton() {
  const container = document.createElement('div');
  container.className = 'streamix-watch-btn-container';
  container.style.display = 'inline-block';
  container.style.verticalAlign = 'middle';
  
  const button = document.createElement('button');
  button.className = 'streamix-watch-download-btn';
  button.type = 'button';
  
  const svg = createDownloadSvg('16px', '16px');
  const textSpan = document.createElement('span');
  textSpan.appendChild(document.createTextNode('Download'));
  
  button.appendChild(svg);
  button.appendChild(textSpan);
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const titleEl = document.querySelector('ytd-watch-metadata h1.ytd-watch-metadata, h1.title.style-scope.ytd-video-primary-info-renderer');
    const title = titleEl ? titleEl.textContent.trim() : document.title.replace(' - YouTube', '');
    const videoUrl = window.location.href;
    console.log(`[Streamix Extension] Watch download clicked. Title: "${title}", URL: ${videoUrl}`);
    window.dispatchEvent(new CustomEvent('streamix-open-modal', {
      detail: { videoUrl, title }
    }));
  });
  
  container.appendChild(button);
  return container;
}

// Inject download button next to subscribe or action controls
function injectWatchPageButton() {
  // If the button is already active in the DOM, do nothing
  if (document.querySelector('.streamix-watch-download-btn')) {
    return;
  }

  const watchPageActions = document.querySelector('ytd-watch-metadata #actions #top-level-buttons-computed, ytd-watch-flexy #top-level-buttons-computed, #owner #subscribe-button');
  
  if (watchPageActions) {
    console.log("[Streamix Extension] Watch page action bar detected. Injecting watch download button.");
    const container = createWatchButton();
    
    if (watchPageActions.tagName === 'YT-SUBSCRIBE-BUTTON-RENDERER' || watchPageActions.id === 'subscribe-button') {
      watchPageActions.insertAdjacentElement('afterend', container);
    } else {
      watchPageActions.appendChild(container);
    }
  }
}

// Inject the single global config modal
function injectGlobalModal() {
  if (document.getElementById('streamix-global-modal-root')) return;
  
  console.log("[Streamix Extension] Injecting single global config modal container to body.");
  const modalRoot = document.createElement('div');
  modalRoot.id = 'streamix-global-modal-root';
  document.body.appendChild(modalRoot);
  const root = createRoot(modalRoot);
  root.render(<StreamixModal />);
}

// Debounce state to cluster mutations and avoid performance degradation
let debounceTimeout = null;
function handleMutations() {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    injectDownloadButtons();
    injectWatchPageButton();
    debounceTimeout = null;
  }, 150);
}

// Initialize observer
const observer = new MutationObserver(handleMutations);
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Run injections on load
injectGlobalModal();
injectDownloadButtons();
injectWatchPageButton();

// Periodic safety sweep (unlikely to be needed but good backup)
setInterval(() => {
  injectDownloadButtons();
  injectWatchPageButton();
}, 3000);
