import React from 'react';
import { normalizeCustomWebUrl } from '../utils/customWebUrl';

export const CURATED_URL_TO_ICON_ID: Record<string, string> = {
  'https://librecorsa.org/': 'racing',
  'https://nebez.github.io/floppybird/': 'floppybird',
  'https://raw.githack.com/nebez/floppybird/master/index.html': 'floppybird',
  'https://rawcdn.githack.com/jakesgordon/javascript-tetris/master/index.html': 'cweb-tetris',
  'https://raw.githack.com/jakesgordon/javascript-tetris/master/index.html': 'cweb-tetris',
  'https://chvin.github.io/react-tetris/': 'cweb-react-tetris',
  'https://gabrielecirulli.github.io/2048/': 'cweb-2048',
  'https://0x0800.github.io/2048-CUPCAKES/': 'cweb-2048-cupcakes',
  'https://doge2048.com/': 'cweb-doge2048',
  'https://ellisonleao.github.io/clumsy-bird/': 'cweb-clumsy-bird',
  'https://macek.github.io/google_pacman/': 'cweb-pacman',
  'https://wayou.github.io/t-rex-runner/': 'cweb-dino',
  'https://hexgl.bkcore.com/play/': 'cweb-hexgl',
  'https://rawcdn.githack.com/jakesgordon/javascript-racer/master/v4.final.html': 'cweb-outrun',
  'https://raw.githack.com/jakesgordon/javascript-racer/master/v4.final.html': 'cweb-outrun',
  'https://iamkun.github.io/tower_game/': 'cweb-tower',
  'https://cykod.github.io/AlienInvasion/': 'cweb-alien',
  'https://rawcdn.githack.com/dmcinnes/HTML5-Asteroids/master/index.html': 'cweb-asteroids',
  'https://raw.githack.com/dmcinnes/HTML5-Asteroids/master/index.html': 'cweb-asteroids',
  'https://killedbyapixel.github.io/SpaceHuggers/': 'cweb-space-huggers',
  'https://rawcdn.githack.com/jakesgordon/javascript-snakes/master/index.html': 'cweb-snakes',
  'https://raw.githack.com/jakesgordon/javascript-snakes/master/index.html': 'cweb-snakes',
  'https://rawcdn.githack.com/jakesgordon/javascript-breakout/master/index.html': 'cweb-breakout',
  'https://raw.githack.com/jakesgordon/javascript-breakout/master/index.html': 'cweb-breakout',
  'https://rawcdn.githack.com/jakesgordon/javascript-pong/master/index.html': 'cweb-pong',
  'https://raw.githack.com/jakesgordon/javascript-pong/master/index.html': 'cweb-pong',
  'https://rawcdn.githack.com/jakesgordon/javascript-boulderdash/master/index.html': 'cweb-boulderdash',
  'https://raw.githack.com/jakesgordon/javascript-boulderdash/master/index.html': 'cweb-boulderdash',
  'https://nickarocho.github.io/minesweeper/': 'cweb-minesweeper',
  'https://muan.github.io/emoji-minesweeper/': 'cweb-emoji-minesweeper',
  'https://bfa.github.io/solitaire-js/': 'cweb-solitaire',
  'https://wwwtyro.github.io/Astray/': 'cweb-astray',
  'https://celesteclassic.github.io/': 'cweb-celeste',
  'https://0hh1.com/': 'cweb-0hh1',
  'https://0hn0.com/': 'cweb-0hn0',
  'https://ozh.github.io/cookieclicker/': 'cweb-cookie',
  'https://adarkroom.doublespeakgames.com/': 'cweb-darkroom',
  'https://reactle.vercel.app/': 'cweb-wordle',
  'https://pixelcraft.web.app/': 'cweb-pixel',
  'https://raw.githack.com/mitchgavan/react-pixel-art/master/index.html': 'cweb-pixel',
  'https://flexboxfroggy.com/': 'cweb-flexbox',
  'https://emojifinder.com/': 'cweb-emoji',
};

export const resolveCustomAppIconId = (app: { url?: string; iconId?: string; iconChar?: string }): string => {
  if (app.iconId) return app.iconId;
  if (app.url) {
    const normalized = normalizeCustomWebUrl(app.url);
    if (CURATED_URL_TO_ICON_ID[app.url]) return CURATED_URL_TO_ICON_ID[app.url];
    if (CURATED_URL_TO_ICON_ID[normalized]) return CURATED_URL_TO_ICON_ID[normalized];
  }
  return `custom-app-${app.iconChar || '🌐'}`;
};

export function renderCustomWebAppIcon(id: string): React.ReactNode | null {
  switch (id) {
    case 'cweb-tetris':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-tetris-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-tetris-bg)" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.4" />
          <g stroke="#0f172a" strokeWidth="1.5">
            {/* Cyan I-bar */}
            <rect x="22" y="22" width="14" height="14" rx="2.5" fill="#06b6d4" />
            <rect x="22" y="36" width="14" height="14" rx="2.5" fill="#06b6d4" />
            <rect x="22" y="50" width="14" height="14" rx="2.5" fill="#06b6d4" />
            <rect x="22" y="64" width="14" height="14" rx="2.5" fill="#06b6d4" />
            {/* Yellow O-square */}
            <rect x="50" y="24" width="14" height="14" rx="2.5" fill="#facc15" />
            <rect x="64" y="24" width="14" height="14" rx="2.5" fill="#facc15" />
            <rect x="50" y="38" width="14" height="14" rx="2.5" fill="#facc15" />
            <rect x="64" y="38" width="14" height="14" rx="2.5" fill="#facc15" />
            {/* Red Z-block */}
            <rect x="36" y="64" width="14" height="14" rx="2.5" fill="#ef4444" />
            <rect x="50" y="64" width="14" height="14" rx="2.5" fill="#ef4444" />
            <rect x="50" y="50" width="14" height="14" rx="2.5" fill="#ef4444" />
            <rect x="64" y="64" width="14" height="14" rx="2.5" fill="#22c55e" />
          </g>
        </svg>
      );

    case 'cweb-react-tetris':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-gb-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-gb-body)" stroke="#fef3c7" strokeWidth="1.5" strokeOpacity="0.4" />
          {/* Handheld Console Shell */}
          <rect x="24" y="16" width="52" height="68" rx="8" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
          {/* LCD Screen */}
          <rect x="30" y="22" width="40" height="28" rx="3" fill="#84a955" stroke="#334155" strokeWidth="2" />
          <rect x="36" y="30" width="6" height="6" fill="#1e293b" />
          <rect x="42" y="30" width="6" height="6" fill="#1e293b" />
          <rect x="42" y="36" width="6" height="6" fill="#1e293b" />
          <rect x="54" y="38" width="6" height="6" fill="#1e293b" />
          <rect x="60" y="38" width="6" height="6" fill="#1e293b" />
          {/* D-pad */}
          <path d="M 34 58 h 5 v 5 h 5 v 5 h -5 v 5 h -5 v -5 h -5 v -5 h 5 z" fill="#1e293b" />
          {/* A/B Buttons */}
          <circle cx="64" cy="63" r="4" fill="#dc2626" />
          <circle cx="55" cy="70" r="4" fill="#dc2626" />
        </svg>
      );

    case 'cweb-2048':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-2048-tile" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#bbada0" />
          <rect x="17" y="17" width="30" height="30" rx="6" fill="#f67c5f" />
          <text x="32" y="37" fontSize="14" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">64</text>
          <rect x="53" y="17" width="30" height="30" rx="6" fill="#edc53f" />
          <text x="68" y="36" fontSize="12" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">512</text>
          <rect x="17" y="53" width="66" height="30" rx="6" fill="url(#cw-2048-tile)" />
          <text x="50" y="74" fontSize="20" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">2048</text>
        </svg>
      );

    case 'cweb-2048-cupcakes':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-cupcake-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fdf2f8" />
              <stop offset="100%" stopColor="#fbcfe8" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-cupcake-bg)" stroke="#f472b6" strokeWidth="2" />
          {/* Cupcake Wrapper */}
          <path d="M 32 54 L 68 54 L 62 78 L 38 78 Z" fill="#ec4899" stroke="#9d174d" strokeWidth="1.5" />
          <line x1="42" y1="54" x2="44" y2="78" stroke="#fbcfe8" strokeWidth="1.5" opacity="0.6" />
          <line x1="50" y1="54" x2="50" y2="78" stroke="#fbcfe8" strokeWidth="1.5" opacity="0.6" />
          <line x1="58" y1="54" x2="56" y2="78" stroke="#fbcfe8" strokeWidth="1.5" opacity="0.6" />
          {/* Frosting Swirl */}
          <path d="M 28 54 Q 25 40 38 38 Q 42 26 54 29 Q 68 30 70 43 Q 75 49 68 54 Z" fill="#ffffff" stroke="#f472b6" strokeWidth="1.8" />
          {/* Sprinkles */}
          <rect x="39" y="42" width="5" height="2" rx="1" fill="#38bdf8" transform="rotate(20 39 42)" />
          <rect x="55" y="44" width="5" height="2" rx="1" fill="#facc15" transform="rotate(-25 55 44)" />
          {/* Cherry */}
          <circle cx="50" cy="24" r="5.5" fill="#ef4444" stroke="#991b1b" strokeWidth="1.2" />
          <circle cx="48.5" cy="22.5" r="1.5" fill="#ffffff" opacity="0.8" />
        </svg>
      );

    case 'cweb-doge2048':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-doge-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-doge-bg)" stroke="#b45309" strokeWidth="1.5" />
          {/* Shiba Ears */}
          <path d="M 27 42 L 24 22 L 42 32 Z" fill="#d97706" stroke="#78350f" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M 73 42 L 76 22 L 58 32 Z" fill="#d97706" stroke="#78350f" strokeWidth="1.5" strokeLinejoin="round" />
          {/* Shiba Head */}
          <ellipse cx="50" cy="54" rx="25" ry="22" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
          {/* Cream Cheeks */}
          <ellipse cx="50" cy="60" rx="20" ry="14" fill="#fef3c7" />
          <circle cx="40" cy="48" r="3" fill="#1c1917" />
          <circle cx="60" cy="48" r="3" fill="#1c1917" />
          <circle cx="39" cy="47" r="1" fill="#ffffff" />
          <circle cx="59" cy="47" r="1" fill="#ffffff" />
          {/* Nose & Smile */}
          <ellipse cx="50" cy="56" rx="4.5" ry="3.2" fill="#1c1917" />
          <path d="M 44 62 Q 50 66 56 62" fill="none" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" />
          {/* Cheek blush */}
          <ellipse cx="34" cy="57" rx="3.5" ry="2" fill="#fb7185" opacity="0.55" />
          <ellipse cx="66" cy="57" rx="3.5" ry="2" fill="#fb7185" opacity="0.55" />
        </svg>
      );

    case 'cweb-clumsy-bird':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-clumsy-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-clumsy-bg)" stroke="#c2410c" strokeWidth="1.5" />
          <rect x="66" y="58" width="14" height="32" fill="#16a34a" stroke="#14532d" strokeWidth="1.5" />
          <rect x="63" y="53" width="20" height="7" rx="2" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
          {/* Plump Teal Bird */}
          <circle cx="43" cy="49" r="17" fill="#0ea5e9" stroke="#0c4a6e" strokeWidth="2" />
          <ellipse cx="34" cy="52" rx="8" ry="5.5" fill="#bae6fd" stroke="#0c4a6e" strokeWidth="1.8" transform="rotate(-15 34 52)" />
          <circle cx="51" cy="44" r="5.5" fill="#ffffff" stroke="#0c4a6e" strokeWidth="1.6" />
          <circle cx="52.5" cy="44" r="2.2" fill="#09090b" />
          <path d="M 56 49 L 70 51 L 56 56 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );

    case 'cweb-pacman':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#09090b" stroke="#2563eb" strokeWidth="2.5" />
          {/* Maze Rails */}
          <path d="M 18 24 H 82 M 18 76 H 82" stroke="#1d4ed8" strokeWidth="3.5" strokeLinecap="round" />
          {/* Pac-Man */}
          <path d="M 44 50 L 63 36 A 22 22 0 1 0 63 64 Z" fill="#facc15" />
          <circle cx="45" cy="39" r="2.5" fill="#09090b" />
          {/* Pellets */}
          <circle cx="66" cy="50" r="3" fill="#fde68a" />
          <circle cx="77" cy="50" r="3" fill="#fde68a" />
          {/* Red Ghost Peek */}
          <path d="M 65 25 A 8 8 0 0 1 81 25 V 36 L 77 33 L 73 36 L 69 33 L 65 36 Z" fill="#ef4444" opacity="0.95" />
          <circle cx="70" cy="24" r="2" fill="#ffffff" />
          <circle cx="76" cy="24" r="2" fill="#ffffff" />
        </svg>
      );

    case 'cweb-dino':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-dino-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-dino-bg)" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Horizon */}
          <line x1="18" y1="74" x2="82" y2="74" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
          {/* Pixel T-Rex Silhouette */}
          <path
            d="M 42 26 H 58 V 36 H 50 V 38 H 56 V 42 H 48 V 48 H 53 V 52 H 46 V 58 H 40 V 66 H 36 V 58 H 30 V 66 H 26 V 54 H 20 V 44 H 24 V 50 H 28 V 44 H 34 V 38 H 38 V 28 H 42 Z"
            fill="#334155"
          />
          <rect x="45" y="29" width="3" height="3" fill="#f8fafc" />
          {/* Cactus */}
          <path d="M 70 50 V 74 M 64 56 V 63 H 70 M 76 54 V 61 H 70" stroke="#16a34a" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );

    case 'cweb-hexgl':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-hexgl-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <linearGradient id="cw-hexgl-ship" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-hexgl-bg)" stroke="#06b6d4" strokeWidth="1.8" />
          {/* Neon Grid Floor */}
          <path d="M 16 80 L 42 48 M 84 80 L 58 48 M 24 68 H 76" stroke="#22d3ee" strokeWidth="1.5" opacity="0.35" />
          {/* Thruster Glow */}
          <ellipse cx="42" cy="70" rx="5" ry="8" fill="#f97316" opacity="0.85" />
          <ellipse cx="58" cy="70" rx="5" ry="8" fill="#f97316" opacity="0.85" />
          {/* Wipeout Craft */}
          <path d="M 50 22 L 75 68 L 58 62 L 50 70 L 42 62 L 25 68 Z" fill="url(#cw-hexgl-ship)" stroke="#e0f2fe" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M 50 32 L 56 54 L 44 54 Z" fill="#0f172a" />
        </svg>
      );

    case 'cweb-outrun':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-outrun-sky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="55%" stopColor="#db2777" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-outrun-sky)" />
          {/* Synthwave Sun */}
          <circle cx="50" cy="40" r="16" fill="#fde047" />
          <rect x="30" y="42" width="40" height="2.5" fill="#db2777" />
          <rect x="30" y="47" width="40" height="2.5" fill="#db2777" />
          {/* Road */}
          <path d="M 12 88 L 42 54 H 58 L 88 88 Z" fill="#1e293b" />
          <line x1="50" y1="56" x2="50" y2="85" stroke="#fde047" strokeWidth="2.5" strokeDasharray="5 4" />
          {/* Retro Sports Car Rear */}
          <rect x="31" y="65" width="38" height="14" rx="4" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.5" />
          <rect x="37" y="58" width="26" height="8" rx="3" fill="#fca5a5" />
          <rect x="34" y="70" width="8" height="4" rx="1" fill="#fef08a" />
          <rect x="58" y="70" width="8" height="4" rx="1" fill="#fef08a" />
        </svg>
      );

    case 'cweb-tower':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-tower-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-tower-bg)" />
          {/* Crane Cable */}
          <line x1="50" y1="10" x2="50" y2="28" stroke="#fef08a" strokeWidth="2.5" />
          <path d="M 44 28 H 56 L 50 34 Z" fill="#facc15" />
          {/* Falling Floor */}
          <rect x="36" y="34" width="28" height="13" rx="2" fill="#f97316" stroke="#ffffff" strokeWidth="1.2" />
          {/* Stacked Floors */}
          <rect x="34" y="52" width="32" height="13" rx="2" fill="#ec4899" stroke="#ffffff" strokeWidth="1.2" />
          <rect x="34" y="66" width="32" height="15" rx="2" fill="#8b5cf6" stroke="#ffffff" strokeWidth="1.2" />
          {/* Windows */}
          <rect x="39" y="56" width="4" height="5" fill="#fef9c3" />
          <rect x="48" y="56" width="4" height="5" fill="#fef9c3" />
          <rect x="57" y="56" width="4" height="5" fill="#fef9c3" />
          <rect x="39" y="71" width="4" height="5" fill="#fef9c3" />
          <rect x="48" y="71" width="4" height="5" fill="#fef9c3" />
          <rect x="57" y="71" width="4" height="5" fill="#fef9c3" />
        </svg>
      );

    case 'cweb-alien':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#09090b" stroke="#4ade80" strokeWidth="1.5" strokeOpacity="0.6" />
          {/* Stars */}
          <circle cx="24" cy="24" r="1.5" fill="#ffffff" opacity="0.7" />
          <circle cx="76" cy="26" r="1.5" fill="#ffffff" opacity="0.7" />
          <circle cx="28" cy="70" r="1.5" fill="#ffffff" opacity="0.5" />
          {/* Pixel Alien Invader */}
          <g fill="#4ade80">
            <rect x="38" y="25" width="4" height="4" />
            <rect x="58" y="25" width="4" height="4" />
            <rect x="42" y="29" width="16" height="4" />
            <rect x="34" y="33" width="32" height="6" />
            <rect x="30" y="39" width="40" height="6" />
            <rect x="34" y="45" width="8" height="4" />
            <rect x="58" y="45" width="8" height="4" />
          </g>
          <rect x="38" y="35" width="5" height="4" fill="#09090b" />
          <rect x="57" y="35" width="5" height="4" fill="#09090b" />
          {/* Laser & Defender Ship */}
          <rect x="48.5" y="52" width="3" height="10" rx="1.5" fill="#facc15" />
          <path d="M 50 64 L 62 78 H 38 Z" fill="#38bdf8" />
        </svg>
      );

    case 'cweb-asteroids':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#030712" stroke="#38bdf8" strokeWidth="1.8" />
          {/* Wireframe Asteroids */}
          <polygon points="24,26 36,20 44,30 34,42 22,36" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinejoin="round" />
          <polygon points="64,54 78,50 82,66 70,76 58,66" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Laser Shots */}
          <line x1="56" y1="42" x2="66" y2="30" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="72" cy="24" r="2.2" fill="#facc15" />
          {/* Vector Ship */}
          <polygon points="54,44 38,68 48,63 58,68" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      );

    case 'cweb-space-huggers':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-sh-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#581c87" />
              <stop offset="100%" stopColor="#be185d" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-sh-bg)" stroke="#f472b6" strokeWidth="1.5" />
          {/* Space Helmet */}
          <rect x="28" y="28" width="32" height="30" rx="8" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
          <rect x="38" y="34" width="20" height="14" rx="4" fill="#06b6d4" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="42" y="37" width="6" height="3" rx="1" fill="#ffffff" opacity="0.8" />
          {/* Body & Blaster */}
          <rect x="33" y="58" width="22" height="16" rx="4" fill="#ef4444" stroke="#1e293b" strokeWidth="2" />
          <rect x="52" y="56" width="16" height="7" rx="2" fill="#475569" />
          {/* Plasma Blast */}
          <circle cx="74" cy="59" r="5" fill="#fde047" />
          <circle cx="82" cy="59" r="3" fill="#ffffff" />
        </svg>
      );

    case 'cweb-snakes':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#052e16" stroke="#22c55e" strokeWidth="1.5" />
          {/* Snake Path */}
          <path d="M 24 68 H 50 V 46 H 30 V 30 H 56" fill="none" stroke="#22c55e" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
          {/* Snake Eyes */}
          <circle cx="57" cy="27" r="2" fill="#052e16" />
          <circle cx="57" cy="33" r="2" fill="#052e16" />
          {/* Tongue */}
          <path d="M 62 30 H 68" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          {/* Apple */}
          <circle cx="72" cy="64" r="9" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.5" />
          <path d="M 72 55 Q 76 49 80 52" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'cweb-breakout':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#0f172a" stroke="#6366f1" strokeWidth="1.5" />
          {/* Rainbow Bricks */}
          <rect x="20" y="22" width="18" height="8" rx="2" fill="#ef4444" />
          <rect x="41" y="22" width="18" height="8" rx="2" fill="#f97316" />
          <rect x="62" y="22" width="18" height="8" rx="2" fill="#eab308" />
          <rect x="20" y="33" width="18" height="8" rx="2" fill="#22c55e" />
          <rect x="41" y="33" width="18" height="8" rx="2" fill="#06b6d4" />
          <rect x="62" y="33" width="18" height="8" rx="2" fill="#8b5cf6" />
          {/* Bouncing Ball */}
          <circle cx="56" cy="54" r="5.5" fill="#ffffff" />
          {/* Paddle */}
          <rect x="30" y="73" width="40" height="8" rx="4" fill="#38bdf8" />
        </svg>
      );

    case 'cweb-pong':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#18181b" stroke="#a1a1aa" strokeWidth="1.5" />
          {/* Center Dashed Line */}
          <line x1="50" y1="18" x2="50" y2="82" stroke="#52525b" strokeWidth="3" strokeDasharray="6 6" />
          {/* Left & Right Paddles */}
          <rect x="22" y="28" width="7" height="26" rx="2" fill="#ffffff" />
          <rect x="71" y="48" width="7" height="26" rx="2" fill="#ffffff" />
          {/* Square Ball */}
          <rect x="54" y="42" width="9" height="9" rx="1.5" fill="#38bdf8" />
        </svg>
      );

    case 'cweb-boulderdash':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#451a03" stroke="#d97706" strokeWidth="1.8" />
          {/* Underground Dirt Blocks */}
          <rect x="18" y="20" width="64" height="60" rx="8" fill="#78350f" opacity="0.7" />
          {/* Boulders */}
          <circle cx="34" cy="36" r="11" fill="#9ca3af" stroke="#374151" strokeWidth="2" />
          <path d="M 29 31 Q 34 28 38 33" fill="none" stroke="#e5e7eb" strokeWidth="2" strokeLinecap="round" />
          {/* Sparkling Diamond */}
          <polygon points="62,40 76,54 62,74 48,54" fill="#22d3ee" stroke="#ffffff" strokeWidth="1.5" />
          <polygon points="62,40 70,54 62,74 54,54" fill="#67e8f9" opacity="0.6" />
          <circle cx="32" cy="66" r="6" fill="#facc15" />
        </svg>
      );

    case 'cweb-minesweeper':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
          {/* Classic 2x2 Grid */}
          <rect x="18" y="18" width="30" height="30" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
          <text x="33" y="40" fontSize="20" fontWeight="900" fill="#2563eb" textAnchor="middle" fontFamily="monospace">1</text>
          <rect x="52" y="18" width="30" height="30" rx="4" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Flag */}
          <line x1="63" y1="24" x2="63" y2="42" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
          <polygon points="63,24 76,29 63,34" fill="#ef4444" />
          <rect x="18" y="52" width="30" height="30" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
          <text x="33" y="74" fontSize="20" fontWeight="900" fill="#16a34a" textAnchor="middle" fontFamily="monospace">2</text>
          {/* Mine Tile */}
          <rect x="52" y="52" width="30" height="30" rx="4" fill="#fecaca" stroke="#ef4444" strokeWidth="1.5" />
          <circle cx="67" cy="67" r="7.5" fill="#18181b" />
          <line x1="57" y1="67" x2="77" y2="67" stroke="#18181b" strokeWidth="2.5" />
          <line x1="67" y1="57" x2="67" y2="77" stroke="#18181b" strokeWidth="2.5" />
          <circle cx="64.5" cy="64.5" r="2" fill="#ffffff" />
        </svg>
      );

    case 'cweb-emoji-minesweeper':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-emine-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-emine-bg)" />
          <rect x="20" y="20" width="27" height="27" rx="5" fill="#d1fae5" />
          <rect x="53" y="20" width="27" height="27" rx="5" fill="#fef3c7" />
          <rect x="20" y="53" width="27" height="27" rx="5" fill="#a7f3d0" />
          <rect x="53" y="53" width="27" height="27" rx="5" fill="#d1fae5" />
          {/* Flag */}
          <line x1="29" y1="25" x2="29" y2="42" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
          <polygon points="29,25 42,30 29,35" fill="#ef4444" />
          {/* Smiley */}
          <circle cx="66.5" cy="33.5" r="8" fill="#facc15" stroke="#a16207" strokeWidth="1.2" />
          <circle cx="64" cy="32" r="1.2" fill="#1c1917" />
          <circle cx="69" cy="32" r="1.2" fill="#1c1917" />
          <path d="M 63.5 35.5 Q 66.5 38 69.5 35.5" fill="none" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round" />
          {/* Bomb */}
          <circle cx="66.5" cy="67" r="7" fill="#18181b" />
          <path d="M 70 61 L 75 56" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
          <text x="33.5" y="73" fontSize="18" fontWeight="900" fill="#047857" textAnchor="middle" fontFamily="sans-serif">1</text>
        </svg>
      );

    case 'cweb-solitaire':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-felt-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-felt-bg)" stroke="#4ade80" strokeWidth="1.5" strokeOpacity="0.4" />
          {/* Back Card */}
          <rect x="24" y="24" width="34" height="48" rx="5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" transform="rotate(-10 41 48)" />
          {/* Front Card */}
          <rect x="42" y="26" width="34" height="48" rx="5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" transform="rotate(8 59 50)" />
          {/* Red Heart on Front Card */}
          <path d="M 59 44 C 55 39, 48 41, 49 47 C 50 52, 59 58, 59 58 C 59 58, 68 52, 69 47 C 70 41, 63 39, 59 44 Z" fill="#ef4444" transform="rotate(8 59 50)" />
          <text x="32" y="40" fontSize="11" fontWeight="900" fill="#0f172a" fontFamily="sans-serif" transform="rotate(-10 32 40)">A</text>
        </svg>
      );

    case 'cweb-astray':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-astray-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-astray-bg)" stroke="#38bdf8" strokeWidth="1.5" />
          {/* Isometric 3D Maze Walls */}
          <path d="M 50 20 L 78 35 L 78 65 L 50 80 L 22 65 L 22 35 Z" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M 50 20 V 50 L 78 65 M 50 50 L 22 65" fill="none" stroke="#818cf8" strokeWidth="2" />
          <path d="M 36 28 L 64 43 V 58" fill="none" stroke="#22d3ee" strokeWidth="2.2" />
          {/* Glowing Golden Sphere */}
          <circle cx="50" cy="48" r="8" fill="#facc15" stroke="#fef08a" strokeWidth="1.5" />
        </svg>
      );

    case 'cweb-celeste':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-celeste-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-celeste-bg)" stroke="#93c5fd" strokeWidth="1.5" />
          {/* Mountain Peak */}
          <path d="M 16 82 L 46 34 L 62 56 L 72 44 L 86 82 Z" fill="#334155" />
          <path d="M 46 34 L 55 48 L 48 45 L 43 50 L 38 46 Z" fill="#ffffff" />
          {/* Winged Strawberry Emblem */}
          <path d="M 24 38 Q 30 30 37 37" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 63 37 Q 70 30 76 38" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="50" cy="52" rx="9" ry="11" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.5" />
          <path d="M 44 41 L 50 45 L 56 41 Z" fill="#22c55e" />
        </svg>
      );

    case 'cweb-0hh1':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          <rect x="20" y="20" width="27" height="27" rx="7" fill="#f43f5e" />
          <rect x="53" y="20" width="27" height="27" rx="7" fill="#38bdf8" />
          <rect x="20" y="53" width="27" height="27" rx="7" fill="#38bdf8" />
          <rect x="53" y="53" width="27" height="27" rx="7" fill="#f43f5e" />
        </svg>
      );

    case 'cweb-0hn0':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="34" cy="34" r="12" fill="#0284c7" />
          <text x="34" y="39" fontSize="14" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">3</text>
          <circle cx="66" cy="34" r="12" fill="#38bdf8" />
          <circle cx="34" cy="66" r="12" fill="#38bdf8" />
          <circle cx="66" cy="66" r="12" fill="#f43f5e" />
        </svg>
      );

    case 'cweb-cookie':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-cookie-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-cookie-bg)" stroke="#60a5fa" strokeWidth="1.5" />
          {/* Cookie */}
          <circle cx="50" cy="50" r="27" fill="#d97706" stroke="#78350f" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="23" fill="#f59e0b" />
          {/* Chocolate Chips */}
          <circle cx="39" cy="40" r="4" fill="#451a03" />
          <circle cx="58" cy="38" r="3.5" fill="#451a03" />
          <circle cx="48" cy="52" r="4.5" fill="#451a03" />
          <circle cx="38" cy="60" r="3.2" fill="#451a03" />
          <circle cx="61" cy="58" r="4" fill="#451a03" />
          <circle cx="51" cy="66" r="2.8" fill="#451a03" />
        </svg>
      );

    case 'cweb-darkroom':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#09090b" stroke="#ea580c" strokeWidth="1.5" strokeOpacity="0.6" />
          {/* Warm Glow */}
          <circle cx="50" cy="54" r="26" fill="#f97316" opacity="0.18" />
          {/* Campfire Logs */}
          <line x1="30" y1="74" x2="70" y2="66" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
          <line x1="30" y1="66" x2="70" y2="74" stroke="#92400e" strokeWidth="6" strokeLinecap="round" />
          {/* Flame */}
          <path d="M 50 22 C 64 38, 66 56, 50 66 C 34 56, 36 38, 50 22 Z" fill="#f97316" />
          <path d="M 50 36 C 58 46, 58 58, 50 64 C 42 58, 42 46, 50 36 Z" fill="#fde047" />
        </svg>
      );

    case 'cweb-wordle':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
          {/* Top Row */}
          <rect x="20" y="26" width="18" height="20" rx="3" fill="#22c55e" />
          <rect x="41" y="26" width="18" height="20" rx="3" fill="#eab308" />
          <rect x="62" y="26" width="18" height="20" rx="3" fill="#52525b" />
          <text x="29" y="41" fontSize="13" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">W</text>
          <text x="50" y="41" fontSize="13" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">O</text>
          <text x="71" y="41" fontSize="13" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">R</text>
          {/* Bottom Row */}
          <rect x="20" y="52" width="18" height="20" rx="3" fill="#22c55e" />
          <rect x="41" y="52" width="18" height="20" rx="3" fill="#22c55e" />
          <rect x="62" y="52" width="18" height="20" rx="3" fill="#22c55e" />
          <text x="29" y="67" fontSize="13" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">A</text>
          <text x="50" y="67" fontSize="13" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">P</text>
          <text x="71" y="67" fontSize="13" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">P</text>
        </svg>
      );

    case 'cweb-pixel':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="#1e293b" stroke="#f472b6" strokeWidth="1.5" />
          {/* 3x3 Pixel Art Palette */}
          <rect x="22" y="24" width="16" height="16" rx="2" fill="#ef4444" />
          <rect x="42" y="24" width="16" height="16" rx="2" fill="#f97316" />
          <rect x="62" y="24" width="16" height="16" rx="2" fill="#facc15" />
          <rect x="22" y="44" width="16" height="16" rx="2" fill="#22c55e" />
          <rect x="42" y="44" width="16" height="16" rx="2" fill="#38bdf8" />
          <rect x="62" y="44" width="16" height="16" rx="2" fill="#a855f7" />
          {/* Brush Handle */}
          <path d="M 28 74 L 48 64 L 68 74" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'cweb-flexbox':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-pond-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-pond-bg)" />
          {/* Lily Pad */}
          <path d="M 50 64 L 74 58 A 26 16 0 1 1 68 50 Z" fill="#4ade80" stroke="#15803d" strokeWidth="1.5" />
          {/* Cute Frog */}
          <ellipse cx="48" cy="52" rx="16" ry="12" fill="#22c55e" stroke="#14532d" strokeWidth="1.8" />
          <circle cx="40" cy="41" r="6" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
          <circle cx="56" cy="41" r="6" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
          <circle cx="40" cy="41" r="3" fill="#ffffff" />
          <circle cx="56" cy="41" r="3" fill="#ffffff" />
          <circle cx="40" cy="41" r="1.5" fill="#09090b" />
          <circle cx="56" cy="41" r="1.5" fill="#09090b" />
          <path d="M 42 54 Q 48 58 54 54" fill="none" stroke="#14532d" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'cweb-emoji':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="cw-emojifinder-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#cw-emojifinder-bg)" />
          {/* Magnifier Lens */}
          <circle cx="45" cy="45" r="20" fill="#fef08a" stroke="#ffffff" strokeWidth="4" />
          <line x1="60" y1="60" x2="77" y2="77" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
          {/* Smile Inside Lens */}
          <circle cx="39" cy="41" r="2.5" fill="#1e293b" />
          <circle cx="51" cy="41" r="2.5" fill="#1e293b" />
          <path d="M 38 49 Q 45 55 52 49" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    default:
      return null;
  }
}
