export const LEGACY_CUSTOM_URL_MIGRATIONS: Record<string, string> = {
  'https://raw.githack.com/mitchgavan/react-pixel-art/master/index.html': 'https://pixelcraft.web.app/',
  'https://raw.githack.com/nebez/floppybird/master/index.html': 'https://nebez.github.io/floppybird/',
  'https://raw.githack.com/jakesgordon/javascript-tetris/master/index.html':
    'https://rawcdn.githack.com/jakesgordon/javascript-tetris/master/index.html',
  'https://raw.githack.com/jakesgordon/javascript-racer/master/v4.final.html':
    'https://rawcdn.githack.com/jakesgordon/javascript-racer/master/v4.final.html',
  'https://raw.githack.com/dmcinnes/HTML5-Asteroids/master/index.html':
    'https://rawcdn.githack.com/dmcinnes/HTML5-Asteroids/master/index.html',
  'https://raw.githack.com/jakesgordon/javascript-snakes/master/index.html':
    'https://rawcdn.githack.com/jakesgordon/javascript-snakes/master/index.html',
  'https://raw.githack.com/jakesgordon/javascript-breakout/master/index.html':
    'https://rawcdn.githack.com/jakesgordon/javascript-breakout/master/index.html',
  'https://raw.githack.com/jakesgordon/javascript-pong/master/index.html':
    'https://rawcdn.githack.com/jakesgordon/javascript-pong/master/index.html',
  'https://raw.githack.com/jakesgordon/javascript-boulderdash/master/index.html':
    'https://rawcdn.githack.com/jakesgordon/javascript-boulderdash/master/index.html',
};

export function normalizeCustomWebUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed || trimmed === 'about:blank') return trimmed;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  if (LEGACY_CUSTOM_URL_MIGRATIONS[withScheme]) {
    return LEGACY_CUSTOM_URL_MIGRATIONS[withScheme];
  }

  // Convert github.com/<owner>/<repo>/blob/<branch>/<path> to CDN-served HTML
  const ghBlobMatch = withScheme.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i
  );
  if (ghBlobMatch) {
    const [, owner, repo, branch, filePath] = ghBlobMatch;
    return `https://rawcdn.githack.com/${owner}/${repo}/${branch}/${filePath}`;
  }

  // Convert raw.githubusercontent.com/<owner>/<repo>/<branch>/<path> (often served as text/plain)
  const rawGhMatch = withScheme.match(
    /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i
  );
  if (rawGhMatch) {
    const [, owner, repo, branch, filePath] = rawGhMatch;
    return `https://rawcdn.githack.com/${owner}/${repo}/${branch}/${filePath}`;
  }

  return withScheme;
}

export function deriveCustomAppTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0 && !/^index\.html?$/i.test(pathParts[0])) {
      return `${pathParts[0]} (${host})`;
    }
    return host || 'カスタムアプリ';
  } catch {
    return 'カスタムアプリ';
  }
}
