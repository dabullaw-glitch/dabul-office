// Turns a video link (YouTube, Vimeo, Bunny, or a direct file) into a player. Unknown links are ignored.
import { sb, esc } from './sb.js';
// Lesson videos kept in the private members bucket 'too' are saved as video_url "too:<path>" (e.g. too:videos/l01/lesson.mp4).
// videoSrc signs such a path for 2 hours. The storage rule too_files_read signs it only for a logged-in member with access
// (or the admin); for anyone else it returns '' and the page shows the join message instead of the video.
export const isPrivateVideo = (url) => /^too:[\w./-]+\.(mp4|webm)$/i.test(url || '');
export async function videoSrc(url) {
  if (!isPrivateVideo(url)) return url || '';
  const { data, error } = await sb.storage.from('too').createSignedUrl(url.slice(4), 7200);
  return error || !data?.signedUrl ? '' : data.signedUrl;
}
export function player(url, title) {
  if (!url) return '';
  let m;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/))) return `<iframe src="https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1" title="${esc(title)}" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/))) return `<iframe src="https://player.vimeo.com/video/${m[1]}${m[2] ? '?h=' + m[2] : ''}" title="${esc(title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  if (/^https:\/\/(iframe|player)\.mediadelivery\.net\//.test(url)) return `<iframe src="${esc(url)}" title="${esc(title)}" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  if (/^https:\/\/.+\.(mp4|webm)(\?.*)?$/i.test(url)) return `<video src="${esc(url)}" controls playsinline preload="metadata" controlslist="nodownload" oncontextmenu="return false"></video>`;
  return '';
}
// A signed link ends after 2 hours: if a long-open page loses the video, sign again once and continue from the same second.
export function keepSigned(root, url) {
  const v = root.querySelector('video');
  if (!v || !isPrivateVideo(url)) return;
  v.addEventListener('error', async () => {
    if (v.dataset.re) return; v.dataset.re = '1';
    const t = v.currentTime, s = await videoSrc(url);
    if (!s) return;
    v.addEventListener('loadedmetadata', () => { v.currentTime = t; }, { once: true });
    v.src = s;
  });
}
