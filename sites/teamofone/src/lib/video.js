// Turns a video link (YouTube, Vimeo, Bunny, or a direct file) into a player. Unknown links are ignored.
import { esc } from './sb.js';
export function player(url, title) {
  if (!url) return '';
  let m;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/))) return `<iframe src="https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1" title="${esc(title)}" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/))) return `<iframe src="https://player.vimeo.com/video/${m[1]}${m[2] ? '?h=' + m[2] : ''}" title="${esc(title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  if (/^https:\/\/(iframe|player)\.mediadelivery\.net\//.test(url)) return `<iframe src="${esc(url)}" title="${esc(title)}" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  if (/^https:\/\/.+\.(mp4|webm)(\?.*)?$/i.test(url)) return `<video src="${esc(url)}" controls playsinline preload="metadata"></video>`;
  return '';
}
