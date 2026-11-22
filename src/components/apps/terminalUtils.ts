import { VirtualFile } from '../../types';

export interface TerminalTheme {
  id: string;
  label: string;
  bg: string;
  text: string;
  prompt: string;
  path: string;
  accent: string;
  border: string;
}

export const TERMINAL_THEMES: Record<string, TerminalTheme> = {
  default: {
    id: 'default',
    label: 'Default Dark',
    bg: '#0c0c0c',
    text: '#d4d4d8',
    prompt: '#22d3ee',
    path: '#34d399',
    accent: '#facc15',
    border: '#27272a',
  },
  matrix: {
    id: 'matrix',
    label: 'Matrix Green',
    bg: '#030a04',
    text: '#4ade80',
    prompt: '#22c55e',
    path: '#86efac',
    accent: '#bbf7d0',
    border: '#14532d',
  },
  cyber: {
    id: 'cyber',
    label: 'Cyber Neon',
    bg: '#070816',
    text: '#e0e7ff',
    prompt: '#f472b6',
    path: '#38bdf8',
    accent: '#c084fc',
    border: '#312e81',
  },
  amber: {
    id: 'amber',
    label: 'Retro Amber',
    bg: '#110b03',
    text: '#fbbf24',
    prompt: '#f59e0b',
    path: '#fde68a',
    accent: '#fb923c',
    border: '#451a03',
  },
  ubuntu: {
    id: 'ubuntu',
    label: 'Ubuntu Aubergine',
    bg: '#2c001e',
    text: '#f5f5f5',
    prompt: '#8ae234',
    path: '#729fcf',
    accent: '#e95420',
    border: '#5e2750',
  },
  powershell: {
    id: 'powershell',
    label: 'PowerShell Blue',
    bg: '#012456',
    text: '#eeedf0',
    prompt: '#f9f1a5',
    path: '#61d6d6',
    accent: '#3b78ff',
    border: '#1e3a8a',
  },
};

export const DEFAULT_VFS_DIRS = ['Desktop', 'Documents', 'Pictures', 'Downloads', 'Code'];

export const ALL_TERMINAL_COMMANDS = [
  'help', 'clear', 'cls', 'pwd', 'cd', 'chdir', 'ls', 'dir', 'tree', 'mkdir', 'md', 'rmdir', 'rd',
  'cat', 'type', 'touch', 'write', 'append', 'rm', 'del', 'erase', 'cp', 'copy', 'mv', 'ren', 'rename',
  'grep', 'find', 'findstr', 'head', 'tail', 'wc', 'edit', 'echo', 'date', 'cal', 'whoami', 'user',
  'open', 'start', 'ps', 'tasklist', 'kill', 'taskkill', 'theme', 'lang',
  'wallpaper', 'notify', 'lock', 'reboot', 'neofetch', 'sysinfo', 'color', 'title',
  'alias', 'unalias', 'history', 'sprout', 'bat', 'call', 'mkbat', 'sendbat', 'redirect', 'seturl', 'churl',
  'js', 'eval', 'calc', 'json', 'base64', 'hash', 'uuid', 'genpass', 'ping', 'curl', 'fetch', 'ipconfig',
  'ifconfig', 'weather', 'nmap', 'timer', 'countdown', 'roll', 'banner',
  'matrix', 'fortune', 'ver', 'version', 'os', 'select-os', 'aboad', 'git',
  'msg', 'net', 'broadcast', 'html', 'sudo', 'admin'
];

export function loadVirtualFiles(): VirtualFile[] {
  try {
    const raw = localStorage.getItem('webos_files');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveVirtualFiles(files: VirtualFile[]) {
  try {
    localStorage.setItem('webos_files', JSON.stringify(files));
    window.dispatchEvent(new Event('webos_files_changed'));
  } catch {}
}

export function loadCustomDirs(): string[] {
  try {
    const raw = localStorage.getItem('webos_terminal_dirs');
    const parsed = raw ? JSON.parse(raw) : [];
    const set = new Set([...DEFAULT_VFS_DIRS, ...(Array.isArray(parsed) ? parsed : [])]);
    return Array.from(set);
  } catch {
    return [...DEFAULT_VFS_DIRS];
  }
}

export function saveCustomDirs(dirs: string[]) {
  try {
    localStorage.setItem('webos_terminal_dirs', JSON.stringify(dirs));
  } catch {}
}

export function getAllDirs(files: VirtualFile[]): string[] {
  const set = new Set<string>(loadCustomDirs());
  for (const f of files) {
    if (f.path && f.path !== 'Root' && f.path !== '/' && f.path !== 'C:\\') {
      set.add(f.path);
    }
  }
  return Array.from(set).sort();
}

export function normalizeDirName(cwd: string, target: string, validDirs: string[]): string | null {
  const raw = target.trim().replace(/^C:[\\/]?/i, '').replace(/^[\\/]+|[\\/]+$/g, '');
  if (!target.trim() || target.trim() === '~' || target.trim() === '/' || target.trim() === '\\' || target.trim().toLowerCase() === 'c:\\' || target.trim().toLowerCase() === 'c:') {
    return '';
  }
  if (raw === '.') return cwd;
  if (raw === '..') {
    if (!cwd) return '';
    const parts = cwd.split('/').filter(Boolean);
    parts.pop();
    return parts.join('/');
  }
  const candidate = cwd ? `${cwd}/${raw}` : raw;
  const exact = validDirs.find(d => d.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const exactNested = validDirs.find(d => d.toLowerCase() === candidate.toLowerCase());
  if (exactNested) return exactNested;
  return null;
}

export function splitFolderAndFile(cwd: string, spec: string): { folder: string; name: string } {
  const cleaned = spec.trim().replace(/^C:[\\/]?/i, '').replace(/\\/g, '/');
  const slashIdx = cleaned.lastIndexOf('/');
  if (slashIdx !== -1) {
    const folderPart = cleaned.slice(0, slashIdx).replace(/^\/+|\/+$/g, '');
    const filePart = cleaned.slice(slashIdx + 1);
    return { folder: folderPart || 'Documents', name: filePart };
  }
  return { folder: cwd || 'Documents', name: cleaned };
}

export function findVfsFile(files: VirtualFile[], cwd: string, spec: string): VirtualFile | undefined {
  const cleaned = spec.trim().replace(/^C:[\\/]?/i, '').replace(/\\/g, '/');
  if (cleaned.includes('/')) {
    const { folder, name } = splitFolderAndFile(cwd, cleaned);
    return files.find(f => f.path.toLowerCase() === folder.toLowerCase() && f.name.toLowerCase() === name.toLowerCase());
  }
  if (cwd) {
    const inCwd = files.find(f => f.path.toLowerCase() === cwd.toLowerCase() && f.name.toLowerCase() === cleaned.toLowerCase());
    if (inCwd) return inCwd;
  }
  return files.find(f => f.name.toLowerCase() === cleaned.toLowerCase());
}

export function tokenizeArgs(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === '\\' && i + 1 < input.length && input[i + 1] === quote) {
        current += quote;
        i++;
      } else if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

export function splitCommandChain(line: string): string[] {
  const cmds: string[] = [];
  let buf = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      buf += ch;
      if (ch === quote && line[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === ';') {
      if (buf.trim()) cmds.push(buf.trim());
      buf = '';
      continue;
    }
    if (ch === '&' && line[i + 1] === '&') {
      if (buf.trim()) cmds.push(buf.trim());
      buf = '';
      i++;
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) cmds.push(buf.trim());
  return cmds;
}

export function splitPipes(cmd: string): string[] {
  const segs: string[] = [];
  let buf = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (quote) {
      buf += ch;
      if (ch === quote && cmd[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === '|') {
      if (buf.trim()) segs.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) segs.push(buf.trim());
  return segs;
}

export function extractRedirection(cmd: string): { cleanCmd: string; redirect?: { mode: 'write' | 'append'; file: string } } {
  let quote: '"' | "'" | null = null;
  let foundIdx = -1;
  let mode: 'write' | 'append' = 'write';
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (quote) {
      if (ch === quote && cmd[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '>') {
      foundIdx = i;
      mode = cmd[i + 1] === '>' ? 'append' : 'write';
      break;
    }
  }
  if (foundIdx === -1) return { cleanCmd: cmd };
  const left = cmd.slice(0, foundIdx).trim();
  const rawRight = cmd.slice(foundIdx + (mode === 'append' ? 2 : 1)).trim();
  const target = tokenizeArgs(rawRight)[0] || '';
  if (!target) return { cleanCmd: cmd };
  return { cleanCmd: left, redirect: { mode, file: target } };
}

export function applyPipeFilter(lines: string[], pipeSeg: string): string[] {
  const tokens = tokenizeArgs(pipeSeg);
  if (tokens.length === 0) return lines;
  const op = tokens[0].toLowerCase();
  const args = tokens.slice(1);

  if (op === 'grep' || op === 'findstr') {
    let invert = false;
    let ignoreCase = false;
    let showNum = false;
    const pats: string[] = [];
    for (const a of args) {
      if (a.startsWith('-')) {
        if (a.includes('v')) invert = true;
        if (a.includes('i')) ignoreCase = true;
        if (a.includes('n')) showNum = true;
      } else {
        pats.push(a);
      }
    }
    const pattern = pats.join(' ');
    if (!pattern) return lines;
    const needle = ignoreCase ? pattern.toLowerCase() : pattern;
    const out: string[] = [];
    lines.forEach((line, idx) => {
      const hay = ignoreCase ? line.toLowerCase() : line;
      const matched = hay.includes(needle);
      if (invert ? !matched : matched) {
        out.push(showNum ? `${idx + 1}: ${line}` : line);
      }
    });
    return out.length > 0 ? out : ['(no matching lines)'];
  }

  if (op === 'head') {
    const n = Math.max(1, parseInt(args[0]?.replace(/^-/, '') || '10', 10) || 10);
    return lines.slice(0, n);
  }

  if (op === 'tail') {
    const n = Math.max(1, parseInt(args[0]?.replace(/^-/, '') || '10', 10) || 10);
    return lines.slice(-n);
  }

  if (op === 'wc') {
    const text = lines.join('\n');
    const lineCount = lines.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    if (args.includes('-l')) return [String(lineCount)];
    if (args.includes('-w')) return [String(words)];
    if (args.includes('-c')) return [String(chars)];
    return [`  Lines: ${lineCount}   Words: ${words}   Chars: ${chars}`];
  }

  if (op === 'sort') {
    const copy = [...lines].sort((a, b) => a.localeCompare(b));
    return args.includes('-r') ? copy.reverse() : copy;
  }

  if (op === 'uniq') {
    return lines.filter((line, idx) => idx === 0 || line !== lines[idx - 1]);
  }

  if (op === 'nl') {
    return lines.map((line, i) => `${String(i + 1).padStart(4, ' ')}  ${line}`);
  }

  if (op === 'upper') {
    return lines.map(l => l.toUpperCase());
  }

  if (op === 'lower') {
    return lines.map(l => l.toLowerCase());
  }

  return [`Error: Unknown pipe command '${op}'`];
}

export function evalMathExpression(expr: string): string {
  const cleaned = expr.trim()
    .replace(/\^/g, '**')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/\b(sin|cos|tan|asin|acos|atan|sqrt|cbrt|abs|log10|log2|log|exp|round|floor|ceil|min|max|pow|random)\b/gi, (m) => `Math.${m.toLowerCase()}`);

  if (!/^[0-9+\-*/%().,\sMathPIEpie_a-zA-Z]+$/.test(cleaned)) {
    throw new Error('Invalid characters in math expression');
  }
  const fn = new Function('Math', `"use strict"; return (${cleaned});`);
  const result = fn(Math);
  if (typeof result === 'number') {
    if (!Number.isFinite(result)) return String(result);
    return Number.isInteger(result) ? String(result) : String(Number(result.toPrecision(12)));
  }
  return String(result);
}

export function evalJsExpression(expr: string): string {
  const fn = new Function(
    'Math', 'Date', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean',
    `"use strict"; return (${expr});`
  );
  const res = fn(Math, Date, JSON, Array, Object, String, Number, Boolean);
  if (res === undefined) return 'undefined';
  if (typeof res === 'object') return JSON.stringify(res, null, 2);
  return String(res);
}

export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function base64ToUtf8(b64: string): string {
  const bin = atob(b64.trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function generateCalendarLines(year: number, month1Based: number): string[] {
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month1Based;
  const todayDate = now.getDate();
  const firstDay = new Date(year, month1Based - 1, 1).getDay();
  const daysInMonth = new Date(year, month1Based, 0).getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const header = `${year}年 ${month1Based}月 (${monthNames[month1Based - 1]})`;
  const pad = Math.max(0, Math.floor((27 - header.length) / 2));
  const lines = [
    ' '.repeat(pad) + header,
    ' Su  Mo  Tu  We  Th  Fr  Sa',
  ];
  let row = ' '.repeat(firstDay * 4);
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = isCurrentMonth && d === todayDate
      ? `[${String(d).padStart(2, '0')}]`
      : ` ${String(d).padStart(2, ' ')} `;
    row += cell;
    if ((firstDay + d) % 7 === 0 || d === daysInMonth) {
      lines.push(row.trimEnd());
      row = '';
    }
  }
  return lines;
}

const BLOCK_FONT: Record<string, string[]> = {
  A: [' ███ ', '█   █', '█████', '█   █', '█   █'],
  B: ['████ ', '█   █', '████ ', '█   █', '████ '],
  C: [' ████', '█    ', '█    ', '█    ', ' ████'],
  D: ['████ ', '█   █', '█   █', '█   █', '████ '],
  E: ['█████', '█    ', '████ ', '█    ', '█████'],
  F: ['█████', '█    ', '████ ', '█    ', '█    '],
  G: [' ████', '█    ', '█  ██', '█   █', ' ████'],
  H: ['█   █', '█   █', '█████', '█   █', '█   █'],
  I: ['█████', '  █  ', '  █  ', '  █  ', '█████'],
  J: ['  ███', '    █', '    █', '█   █', ' ███ '],
  K: ['█   █', '█  █ ', '███  ', '█  █ ', '█   █'],
  L: ['█    ', '█    ', '█    ', '█    ', '█████'],
  M: ['█   █', '██ ██', '█ █ █', '█   █', '█   █'],
  N: ['█   █', '██  █', '█ █ █', '█  ██', '█   █'],
  O: [' ███ ', '█   █', '█   █', '█   █', ' ███ '],
  P: ['████ ', '█   █', '████ ', '█    ', '█    '],
  Q: [' ███ ', '█   █', '█ █ █', '█  ██', ' ████'],
  R: ['████ ', '█   █', '████ ', '█  █ ', '█   █'],
  S: [' ████', '█    ', ' ███ ', '    █', '████ '],
  T: ['█████', '  █  ', '  █  ', '  █  ', '  █  '],
  U: ['█   █', '█   █', '█   █', '█   █', ' ███ '],
  V: ['█   █', '█   █', '█   █', ' █ █ ', '  █  '],
  W: ['█   █', '█   █', '█ █ █', '██ ██', '█   █'],
  X: ['█   █', ' █ █ ', '  █  ', ' █ █ ', '█   █'],
  Y: ['█   █', ' █ █ ', '  █  ', '  █  ', '  █  '],
  Z: ['█████', '   █ ', '  █  ', ' █   ', '█████'],
  '0': [' ███ ', '█  ██', '█ █ █', '██  █', ' ███ '],
  '1': ['  █  ', ' ██  ', '  █  ', '  █  ', '█████'],
  '2': ['████ ', '    █', ' ███ ', '█    ', '█████'],
  '3': ['████ ', '    █', ' ███ ', '    █', '████ '],
  '4': ['█   █', '█   █', '█████', '    █', '    █'],
  '5': ['█████', '█    ', '████ ', '    █', '████ '],
  '6': [' ████', '█    ', '████ ', '█   █', ' ███ '],
  '7': ['█████', '   █ ', '  █  ', ' █   ', ' █   '],
  '8': [' ███ ', '█   █', ' ███ ', '█   █', ' ███ '],
  '9': [' ███ ', '█   █', ' ████', '    █', '████ '],
  '!': ['  █  ', '  █  ', '  █  ', '     ', '  █  '],
  '?': [' ███ ', '█   █', '  ██ ', '     ', '  █  '],
  '-': ['     ', '     ', '█████', '     ', '     '],
  ' ': ['   ', '   ', '   ', '   ', '   '],
};

export function generateBanner(text: string): string[] {
  const trimmed = text.trim() || 'ABORD OS';
  const upper = trimmed.toUpperCase();
  const isAllAscii = Array.from(upper).every(ch => Boolean(BLOCK_FONT[ch]));
  if (isAllAscii && upper.length <= 16) {
    const rows = ['', '', '', '', ''];
    for (const ch of upper) {
      const glyph = BLOCK_FONT[ch] || BLOCK_FONT[' '];
      for (let r = 0; r < 5; r++) rows[r] += glyph[r] + ' ';
    }
    return rows;
  }
  const padWidth = Math.max(24, trimmed.length * 2 + 4);
  const border = '═'.repeat(padWidth);
  return [
    `╔${border}╗`,
    `║  ${trimmed}`,
    `╚${border}╝`,
  ];
}

export function resolveAppLaunchTarget(query: string): { id: string; label: string } | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const aliases: Record<string, { id: string; label: string }> = {
    browser: { id: 'browser', label: 'Web Browser' },
    chrome: { id: 'browser', label: 'Web Browser' },
    edge: { id: 'browser', label: 'Web Browser' },
    notepad: { id: 'notepad', label: 'Notepad' },
    memo: { id: 'notepad', label: 'Notepad' },
    calc: { id: 'calculator', label: 'Calculator' },
    calculator: { id: 'calculator', label: 'Calculator' },
    paint: { id: 'paint', label: 'Paint Tool' },
    files: { id: 'files', label: 'File Explorer' },
    explorer: { id: 'files', label: 'File Explorer' },
    terminal: { id: 'terminal', label: 'Terminal' },
    cmd: { id: 'terminal', label: 'Terminal' },
    excel: { id: 'excel', label: 'Excel Sheets' },
    word: { id: 'word', label: 'Word Document' },
    ppt: { id: 'powerpoint', label: 'PowerPoint' },
    powerpoint: { id: 'powerpoint', label: 'PowerPoint' },
    wetalks: { id: 'wetalks', label: 'WeTalks Chat' },
    chat: { id: 'wetalks', label: 'WeTalks Chat' },
    sprout: { id: 'sprout', label: 'Sprout Studio' },
    ide: { id: 'sprout', label: 'Sprout Studio' },
    minecraft: { id: 'minecraft', label: 'nooncraft' },
    nooncraft: { id: 'minecraft', label: 'nooncraft' },
    tetris: { id: 'tetris', label: 'Neo Tetris' },
    racing: { id: 'racing', label: 'Racing Car Game' },
    geoguessr: { id: 'geoguessr', label: 'GeoGuessr' },
    nmap: { id: 'nmap', label: 'Nmap Practice' },
    flightsim: { id: 'flightsim', label: '3D Flight Simulator' },
    flight: { id: 'flightsim', label: '3D Flight Simulator' },
    settings: { id: 'settings', label: 'System Settings' },
    store: { id: 'noobstore', label: 'Abord Store' },
    noobstore: { id: 'noobstore', label: 'Abord Store' },
    aboad: { id: 'aboad', label: 'Aboad' },
    videoeditor: { id: 'videoeditor', label: 'nooncut Video Editor' },
    video: { id: 'videoeditor', label: 'nooncut Video Editor' },
    chameleon: { id: 'chameleon', label: 'Chameleon Hide-and-Seek' },
    blokus: { id: 'blokus', label: 'Blokus' },
    dots: { id: 'dotsandboxes', label: 'Dots & Boxes' },
    dotsandboxes: { id: 'dotsandboxes', label: 'Dots & Boxes' },
    floppybird: { id: 'floppybird', label: 'Floppy Bird' },
    flappy: { id: 'floppybird', label: 'Floppy Bird' },
    recycle: { id: 'recycle', label: 'Recycle Bin' },
    trash: { id: 'recycle', label: 'Recycle Bin' },
  };
  if (aliases[q]) return aliases[q];
  try {
    const raw = localStorage.getItem('noobstore_installed_apps');
    if (raw) {
      const installed = JSON.parse(raw);
      if (Array.isArray(installed)) {
        const match = installed.find((a: any) =>
          String(a.id || '').toLowerCase() === q ||
          String(a.title || '').toLowerCase().includes(q)
        );
        if (match) return { id: match.id, label: match.title || match.id };
      }
    }
  } catch {}
  return null;
}

export function simulateNmap(args: string): string[] {
  const lower = args.toLowerCase();
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  if (!args.trim()) {
    return [
      'Nmap 7.94 ( https://nmap.org ) - Abord OS Integrated Scanner',
      'Usage: nmap [Scan Type(s)] [Options] {target specification}',
      'Examples:',
      '  nmap -sn 192.168.1.0/24',
      '  nmap -sS 192.168.1.45',
      '  nmap -sV -p 80 192.168.1.45',
      '  nmap -O 192.168.1.45',
      '  nmap -A -p 1337 192.168.1.45',
      '  nmap --script vuln -p 80 192.168.1.45',
    ];
  }
  if (lower.includes('192.168.1.0/24') && lower.includes('-sn')) {
    return [
      `Starting Nmap 7.94 at ${stamp}`,
      'Nmap scan report for 192.168.1.1 (Gateway)',
      'Host is up (0.0012s latency).',
      'Nmap scan report for 192.168.1.45',
      'Host is up (0.0038s latency).',
      'Nmap done: 256 IP addresses (2 hosts up) scanned in 1.42 seconds',
    ];
  }
  if (lower.includes('192.168.1.45')) {
    if (lower.includes('--script') && lower.includes('vuln')) {
      return [
        `Starting Nmap 7.94 at ${stamp}`,
        'Nmap scan report for 192.168.1.45',
        'PORT   STATE SERVICE',
        '80/tcp open  http',
        '| http-vuln-cve2021-41773:',
        '|   VULNERABLE: Apache HTTP Server 2.4.49/2.4.50 Path Traversal & RCE',
        '|     State: VULNERABLE',
        '|     IDs:  CVE:CVE-2021-41773',
        '|     Risk factor: High',
        'Nmap done: 1 IP address (1 host up) scanned in 2.15 seconds',
      ];
    }
    if (lower.includes('-a') && lower.includes('1337')) {
      return [
        `Starting Nmap 7.94 at ${stamp}`,
        'Nmap scan report for 192.168.1.45',
        'PORT     STATE SERVICE  VERSION',
        '1337/tcp open  backdoor Abord Hidden Shell 1.0',
        'Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel',
        'TRACEROUTE: 1 hop 192.168.1.45 (3.42 ms)',
        'Nmap done: 1 IP address (1 host up) scanned in 1.88 seconds',
      ];
    }
    if (lower.includes('-p-')) {
      return [
        `Starting Nmap 7.94 at ${stamp}`,
        'Nmap scan report for 192.168.1.45',
        'Not shown: 65532 closed tcp ports',
        'PORT     STATE SERVICE',
        '22/tcp   open  ssh',
        '80/tcp   open  http',
        '1337/tcp open  waste',
        'Nmap done: 1 IP address (1 host up) scanned in 4.10 seconds',
      ];
    }
    if (lower.includes('-o')) {
      return [
        `Starting Nmap 7.94 at ${stamp}`,
        'Nmap scan report for 192.168.1.45',
        'PORT   STATE SERVICE',
        '22/tcp open  ssh',
        '80/tcp open  http',
        'Device type: general purpose',
        'Running: Linux 5.X',
        'OS details: Linux 5.4 - 5.15 (Ubuntu)',
        'Nmap done: 1 IP address (1 host up) scanned in 1.31 seconds',
      ];
    }
    if (lower.includes('-sv')) {
      return [
        `Starting Nmap 7.94 at ${stamp}`,
        'Nmap scan report for 192.168.1.45',
        'PORT   STATE SERVICE VERSION',
        '80/tcp open  http    Apache/2.4.41 ((Ubuntu))',
        'Nmap done: 1 IP address (1 host up) scanned in 1.18 seconds',
      ];
    }
    return [
      `Starting Nmap 7.94 at ${stamp}`,
      'Nmap scan report for 192.168.1.45',
      'Not shown: 998 closed tcp ports',
      'PORT   STATE SERVICE',
      '22/tcp open  ssh',
      '80/tcp open  http',
      'Nmap done: 1 IP address (1 host up) scanned in 0.48 seconds',
    ];
  }
  if (lower.includes('10.0.8.20')) {
    if (lower.includes('-f') && (lower.includes('-g 53') || lower.includes('-g53'))) {
      return [
        `Starting Nmap 7.94 at ${stamp}`,
        'Nmap scan report for 10.0.8.20 (Firewall bypassed)',
        'PORT   STATE SERVICE',
        '22/tcp open  ssh',
        'Nmap done: 1 IP address (1 host up) scanned in 0.92 seconds',
      ];
    }
    return [
      `Starting Nmap 7.94 at ${stamp}`,
      'Nmap scan report for 10.0.8.20',
      'All 1000 scanned ports on 10.0.8.20 are filtered (firewall active).',
      'Tip: Try packet fragmentation (-f) and source port spoofing (-g 53).',
    ];
  }
  if (lower.includes('10.0.8.35')) {
    if (lower.includes('-d')) {
      return [
        `Starting Nmap 7.94 at ${stamp}`,
        'Using decoy sources to mask scan...',
        'Nmap scan report for 10.0.8.35',
        'PORT     STATE SERVICE',
        '3306/tcp open  mysql',
        'Nmap done: 1 IP address (1 host up) scanned in 1.24 seconds',
      ];
    }
    return [
      `Starting Nmap 7.94 at ${stamp}`,
      'Nmap scan report for 10.0.8.35',
      'Warning: Intrusion Detection System active. Use decoy scan (-D RND:5).',
    ];
  }
  const target = args.trim().split(/\s+/).pop() || '127.0.0.1';
  return [
    `Starting Nmap 7.94 at ${stamp}`,
    `Nmap scan report for ${target}`,
    'Host is up (0.0021s latency).',
    'PORT     STATE SERVICE',
    '80/tcp   open  http',
    '443/tcp  open  https',
    '3000/tcp open  abord-webos',
    `Nmap done: 1 IP address (1 host up) scanned in 0.54 seconds`,
  ];
}

export function getHelpLines(topic?: string): string[] {
  const t = (topic || '').trim().toLowerCase();
  if (t === 'files' || t === 'file' || t === 'fs') {
    return [
      '[ファイル & ディレクトリ操作]',
      '  pwd / cd <dir>            - 作業ディレクトリの確認・移動 (cd .. / cd /)',
      '  ls [-l|-a] / dir          - フォルダ・ファイル一覧表示',
      '  tree                      - ディレクトリ構造をツリー表示',
      '  mkdir <dir> / rmdir <dir> - フォルダの作成・削除',
      '  cat / type <file>         - ファイル内容を表示',
      '  touch / write <f> <text>  - ファイル新規作成・上書き保存',
      '  append <file> <text>      - ファイル末尾に追記 (または > / >> リダイレクト)',
      '  cp <src> <dst>            - ファイルのコピー',
      '  mv <src> <dst>            - ファイルの移動・名前変更',
      '  rm / del <file>           - ファイル削除',
      '  head / tail <file> [n]    - 先頭 / 末尾 n 行を表示',
      '  grep <pattern> [file]     - 文字列検索 (全ファイルまたは指定ファイル)',
      '  wc <file>                 - 行数・単語数・文字数をカウント',
      '  edit <file>               - メモ帳または Sprout Studio で開く',
    ];
  }
  if (t === 'os' || t === 'sys' || t === 'system') {
    return [
      '[Abord OS 制御・アプリ操作]',
      '  open / start <app|file>   - アプリ起動 (browser, notepad, wetalks, sprout 等) やファイルを開く',
      '  ps / tasklist             - 起動中のウィンドウ一覧を表示',
      '  kill / taskkill <id|pid>  - 起動中のアプリウィンドウを閉じる',
      '  neofetch / sysinfo        - システム情報・ストレージ使用量を表示',
      '  whoami / user <name>      - ユーザー情報表示 / ユーザー名変更',
      '  theme [dark|light]        - OSテーマを即時切り替え',
      '  lang [ja|en]              - OS表示言語を切り替え',
      '  wallpaper [list|番号|URL] - 壁紙一覧表示・壁紙変更',
      '  notify <msg>              - デスクトップ通知を送信 (タイトル | 本文 も可)',
      '  lock / reboot             - ロック画面へ移行 / OS再起動',
      '  ver / os [version]        - OSバージョン確認・OSエディション切替',
    ];
  }
  if (t === 'net' || t === 'network') {
    return [
      '[ネットワーク & 外部API]',
      '  ping <host|url>           - サーバー・指定URLへのリアルタイム応答速度計測',
      '  curl / fetch <url>        - HTTP GETリクエストを実行して結果表示 (-i でヘッダー表示)',
      '  ipconfig / ifconfig       - ネットワーク状態・回線情報・オリジン確認',
      '  weather [city]            - 指定都市のリアルタイム天気・気温を取得 (例: weather Tokyo)',
      '  nmap <options> <target>   - セキュリティスキャン演習を実行',
    ];
  }
  if (t === 'dev' || t === 'code') {
    return [
      '[開発・スクリプト・暗号ツール]',
      '  sprout <file.sp | -e code>- Sproutプログラムをターミナル上で実行 (input対応)',
      '  js / eval <expression>    - JavaScript式を評価して結果を表示',
      '  calc <math>               - 関数電卓 (例: calc (2^10 + sqrt(144)) * pi)',
      '  json <file | text>        - JSONの構文チェック＆整形表示',
      '  base64 <enc|dec> <text>   - Base64エンコード / デコード (日本語UTF-8対応)',
      '  hash <text>               - SHA-256 ハッシュ値を計算',
      '  uuid / genpass [len]      - UUID v4生成 / 安全なランダムパスワード生成',
      '  aboad / git <subcmd>      - Aboad Web App / Git URL 設定',
    ];
  }
  if (t === 'fun' || t === 'shell') {
    return [
      '[シェル拡張・カスタマイズ・便利機能]',
      '  color [theme]             - 配色変更 (default, matrix, cyber, amber, ubuntu, powershell)',
      '  alias [name=cmd]          - コマンドエイリアス登録・一覧 (unalias で削除)',
      '  history [clear] / !<番号> - コマンド履歴表示・番号指定で再実行',
      '  cal [年] [月]             - カレンダー表示',
      '  timer <秒> [メモ]         - カウントダウンタイマー (完了時にOS通知)',
      '  roll [NdM]                - サイコロを振る (例: roll 2d6)',
      '  banner <text>             - ASCIIバナー生成',
      '  matrix / fortune          - Matrixデジタルレインアニメーション / 今日の格言',
      '  パイプ・連結・リダイレクト - | (grep, head, tail, wc, sort, uniq) / && / ; / > / >>',
      '  ショートカット             - Tab: 補完 | ↑↓: 履歴 | Ctrl+L: 消去 | Ctrl+C: 中断',
    ];
  }
  if (t === 'bat' || t === 'batch') {
    return [
      '[Windows .bat バッチ実行 & 他ユーザー送信 (sudo)]',
      '  <file.bat> [引数...]      - .batファイルを実行 (または bat <file.bat> [引数])',
      '  mkbat <file.bat> <URL>    - 新しいURL変更プログラム入りの .bat を自動生成',
      '  sendbat <file.bat> [opts] - 他のユーザーへ .bat ファイルを配信 (要sudo権限)',
      '    例: sendbat update.bat --url https://new-url.example --mode both --autorun',
      '  redirect / seturl <URL>   - WebOS本体のURLを新しいURLへ変更(移動)',
      '  sudo                      - 管理者コンソールを開く (.bat配信＆URL変更プログラム自動挿入UI)',
      '',
      '  [対応Windows .bat文法]',
      '    @echo off/on, REM, ::, SET / SET /A / SET /P, %VAR%, %1..%9, !VAR!',
      '    IF [NOT] EXIST / DEFINED / ERRORLEVEL / == / EQU / NEQ / LSS / GTR ... ELSE (...)',
      '    FOR %%i IN (...) DO ... / FOR /L %%i IN (start,step,end) DO ...',
      '    :label, GOTO, CALL :label / other.bat, EXIT [/B], PAUSE, CHOICE, TIMEOUT',
      '    START <app|URL|file>, MD, RD, COPY, MOVE, DEL, REN, TYPE, CLS, TITLE, COLOR',
    ];
  }
  if (t === 'admin') {
    return [
      '[管理者・ブロードキャスト]',
      '  sudo                      - 管理者コンソールを開く (Word配信 / .bat配信 & URL変更自動挿入)',
      '  sendbat <file.bat> [opts] - sudo権限で .bat スクリプトを全ユーザーへ送信',
      '  msg * <message>           - 全端末のユーザーへ管理者メッセージを配信',
      '  net send * <message>      - NET SEND 形式で全端末へ配信',
      '  broadcast <message>       - 全端末へ緊急ブロードキャスト',
      '  html * <HTMLコード>       - 全端末へHTMLメッセージを配信',
    ];
  }
  if (t === 'all') {
    return [
      ...getHelpLines('bat'),
      '',
      ...getHelpLines('files'),
      '',
      ...getHelpLines('os'),
      '',
      ...getHelpLines('net'),
      '',
      ...getHelpLines('dev'),
      '',
      ...getHelpLines('fun'),
      '',
      ...getHelpLines('admin'),
    ];
  }
  return [
    'Supported CLI Commands (カテゴリ別ヘルプ: "help bat", "help files", "help os", "help net", "help dev", "help fun", "help admin", "help all"):',
    '',
    '  [バッチ]     <file.bat>, bat <file.bat>, mkbat <file> <url>, sendbat <file>, redirect <url>',
    '  [ファイル]   pwd, cd, ls, dir, tree, mkdir, rmdir, cat, touch, write, append, cp, mv, rm, grep, head, tail, wc, edit',
    '  [OS操作]     open <app>, ps, kill <app>, neofetch, whoami, user, theme, lang, wallpaper, notify, lock, reboot, ver, os',
    '  [ネット]     ping <host>, curl <url>, ipconfig, weather [city], nmap <args>',
    '  [開発・計算] sprout <file|-e>, js <expr>, calc <expr>, json, base64, hash, uuid, genpass, aboad, git',
    '  [便利・演出] color, alias, history, cal, timer <s>, roll, banner, matrix, fortune, date, echo, clear',
    '  [管理者]     sudo (.bat配信/URL自動挿入コンソール), msg *, net send *, broadcast, html *',
    '',
    '  Tips: パイプ (ls -a | grep .txt)、連続実行 (cmd1 && cmd2)、ファイル書出 (echo hi > a.txt)、Tab補完、↑↓履歴が使えます。',
  ];
}
