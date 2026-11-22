import {
  evalMathExpression,
  findVfsFile,
  getAllDirs,
  loadVirtualFiles,
  normalizeDirName,
  resolveAppLaunchTarget,
  tokenizeArgs,
} from './terminalUtils';

export type BatUrlMode = 'redirect' | 'aboad' | 'browser' | 'both';

export function buildUrlUpdateBatSnippet(rawUrl: string, mode: BatUrlMode = 'both'): string {
  const trimmed = rawUrl.trim();
  const normalizedUrl = trimmed
    ? (trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`)
    : 'https://example.com';

  const lines: string[] = [
    'REM === [AUTO] 新しいURL変更プログラム START ===',
    `SET NEW_URL=${normalizedUrl}`,
    'ECHO [URL-UPDATER] 新しいURL (%NEW_URL%) を適用しています...',
  ];

  if (mode === 'aboad') {
    lines.push(
      'aboad set "%NEW_URL%"',
      'git remote set-url origin "%NEW_URL%"',
      'START aboad',
      'notify URL変更完了 | AboadのURLを %NEW_URL% に更新しました'
    );
  } else if (mode === 'browser') {
    lines.push(
      'START "%NEW_URL%"',
      'notify URL変更完了 | ブラウザで %NEW_URL% を開きました'
    );
  } else if (mode === 'redirect') {
    lines.push(
      'notify URL変更 | WebOSを新しいURL (%NEW_URL%) へ移行します',
      'TIMEOUT /T 1 /NOBREAK',
      'redirect "%NEW_URL%"'
    );
  } else {
    lines.push(
      'aboad set "%NEW_URL%"',
      'git remote set-url origin "%NEW_URL%"',
      'notify URL変更 | Aboad更新完了後、新しいURL (%NEW_URL%) へ移動します',
      'TIMEOUT /T 1 /NOBREAK',
      'redirect "%NEW_URL%"'
    );
  }
  lines.push('REM === [AUTO] 新しいURL変更プログラム END ===');
  return lines.join('\r\n');
}

export function injectUrlProgramIntoBat(existingCode: string, rawUrl: string, mode: BatUrlMode = 'both'): string {
  const snippet = buildUrlUpdateBatSnippet(rawUrl, mode);
  const startMarker = 'REM === [AUTO] 新しいURL変更プログラム START ===';
  const endMarker = 'REM === [AUTO] 新しいURL変更プログラム END ===';

  const normalized = (existingCode || '').replace(/\r\n/g, '\n');
  const startIdx = normalized.indexOf(startMarker);
  const endIdx = normalized.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    const before = normalized.slice(0, startIdx).trimEnd();
    const after = normalized.slice(endIdx + endMarker.length).trimStart();
    const joined = [before, snippet.replace(/\r\n/g, '\n'), after].filter(Boolean).join('\n\n');
    return joined.replace(/\n/g, '\r\n');
  }

  if (!normalized.trim()) {
    return `@echo off\r\n${snippet}\r\n`;
  }

  const lines = normalized.split('\n');
  const hasEchoOff = lines[0].trim().toLowerCase() === '@echo off';
  if (hasEchoOff) {
    const head = lines[0];
    const rest = lines.slice(1).join('\n').trim();
    const body = rest ? `${head}\n${snippet.replace(/\r\n/g, '\n')}\n\n${rest}` : `${head}\n${snippet.replace(/\r\n/g, '\n')}`;
    return body.replace(/\n/g, '\r\n');
  }
  return `@echo off\r\n${snippet}\r\n\r\n${normalized.replace(/\n/g, '\r\n')}`;
}

export interface BatRuntimeContext {
  scriptName: string;
  args: string[];
  username: string;
  getCwd: () => string;
  setCwd: (nextCwd: string) => void;
  onOutput: (lines: string[]) => void;
  onClear: () => void;
  onPrompt: (promptText: string) => Promise<string>;
  onSetTitle?: (title: string) => void;
  onSetColor?: (themeId: string) => void;
  onRunWebOsCommand: (cmdLine: string) => Promise<string[]>;
  isAborted: () => boolean;
}

interface BatCallFrame {
  lines: string[];
  labels: Map<string, number>;
  pc: number;
  args: string[];
  scriptName: string;
}

function splitTopLevelBlockLines(rawLines: string[]): string[] {
  // Normalizes multi-line parenthesized blocks into single logical execution units
  // while keeping line-index jumps clean at top level.
  const out: string[] = [];
  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    const openParens = countUnquotedParens(line);
    if (openParens > 0) {
      let combined = line;
      let balance = openParens;
      while (balance > 0 && i + 1 < rawLines.length) {
        i++;
        const nextLine = rawLines[i].trim();
        if (!nextLine || nextLine.startsWith('::') || /^rem(\s|$)/i.test(nextLine)) continue;
        combined += '\n' + nextLine;
        balance += countUnquotedParens(nextLine);
      }
      // Also attach trailing ELSE (...) on next line if `) ELSE (` pattern spans lines
      while (i + 1 < rawLines.length && /^else\b/i.test(rawLines[i + 1].trim())) {
        i++;
        const elseLine = rawLines[i].trim();
        combined += ' ' + elseLine;
        let b2 = countUnquotedParens(elseLine);
        while (b2 > 0 && i + 1 < rawLines.length) {
          i++;
          const nl = rawLines[i].trim();
          if (!nl || nl.startsWith('::') || /^rem(\s|$)/i.test(nl)) continue;
          combined += '\n' + nl;
          b2 += countUnquotedParens(nl);
        }
      }
      out.push(combined);
    } else {
      out.push(line);
    }
    i++;
  }
  return out;
}

function countUnquotedParens(s: string): number {
  let quote: '"' | null = null;
  let balance = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      quote = quote ? null : '"';
    } else if (!quote) {
      if (ch === '(') balance++;
      else if (ch === ')') balance--;
    }
  }
  return balance;
}

function buildLabelMap(lines: string[]): Map<string, number> {
  const labels = new Map<string, number>();
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith(':') && !trimmed.startsWith('::')) {
      const name = trimmed.slice(1).trim().split(/\s+/)[0].toLowerCase();
      if (name) labels.set(name, idx);
    }
  });
  return labels;
}

function expandVariables(
  raw: string,
  env: Map<string, string>,
  loopVars: Map<string, string>,
  frame: BatCallFrame,
  cwd: string,
  username: string,
  errorLevel: number
): string {
  let out = raw;

  // Loop variables %%i or %i
  loopVars.forEach((val, key) => {
    const k = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`%%${k}\\b`, 'g'), val);
    out = out.replace(new RegExp(`%${k}\\b`, 'g'), val);
  });

  // Positional args %0..%9, %~0, %*
  out = out.replace(/%~/g, '%');
  out = out.replace(/%\*/g, frame.args.join(' '));
  out = out.replace(/%0\b/g, frame.scriptName);
  for (let n = 1; n <= 9; n++) {
    out = out.replace(new RegExp(`%${n}\\b`, 'g'), frame.args[n - 1] ?? '');
  }

  const getBuiltinOrEnv = (name: string): string | undefined => {
    const upper = name.toUpperCase();
    for (const [k, v] of env.entries()) {
      if (k.toUpperCase() === upper) return v;
    }
    const now = new Date();
    switch (upper) {
      case 'CD': return cwd ? `C:\\${cwd.replace(/\//g, '\\')}` : 'C:\\';
      case 'DATE': return now.toLocaleDateString('ja-JP');
      case 'TIME': return now.toLocaleTimeString('ja-JP');
      case 'USERNAME': return username || 'User';
      case 'COMPUTERNAME': return 'ABORD-WEBOS';
      case 'OS': return 'Abord_WebOS';
      case 'RANDOM': return String(Math.floor(Math.random() * 32768));
      case 'ERRORLEVEL': return String(errorLevel);
      case 'ABOAD_URL': return localStorage.getItem('aboad_git_url') || 'https://moozunobu.github.io/Abord-browser-ver2/';
      case 'ORIGIN': return window.location?.origin || '';
      default: return undefined;
    }
  };

  // %VAR:~start,len% and %VAR:old=new% and %VAR%
  out = out.replace(/%([A-Za-z0-9_]+)(?::([^%]+))?%/g, (full, name: string, mod?: string) => {
    const val = getBuiltinOrEnv(name);
    if (val === undefined) return '';
    if (!mod) return val;
    if (mod.startsWith('~')) {
      const [sRaw, lRaw] = mod.slice(1).split(',');
      let start = parseInt(sRaw || '0', 10) || 0;
      if (start < 0) start = Math.max(0, val.length + start);
      if (lRaw === undefined) return val.slice(start);
      const len = parseInt(lRaw, 10) || 0;
      return len < 0 ? val.slice(start, val.length + len) : val.slice(start, start + len);
    }
    const eqIdx = mod.indexOf('=');
    if (eqIdx !== -1) {
      const oldSub = mod.slice(0, eqIdx);
      const newSub = mod.slice(eqIdx + 1);
      if (!oldSub) return val;
      return val.split(oldSub).join(newSub);
    }
    return val;
  });

  // !VAR! delayed expansion
  out = out.replace(/!([A-Za-z0-9_]+)!/g, (_, name: string) => {
    const val = getBuiltinOrEnv(name);
    return val !== undefined ? val : '';
  });

  return out;
}

function evalSetArithmetic(expr: string, env: Map<string, string>): number {
  const replaced = expr.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (word) => {
    for (const [k, v] of env.entries()) {
      if (k.toUpperCase() === word.toUpperCase()) {
        const n = Number(v);
        return Number.isFinite(n) ? String(n) : '0';
      }
    }
    return '0';
  });
  const res = evalMathExpression(replaced);
  return Math.trunc(Number(res) || 0);
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function splitIfElseBlock(body: string): { thenPart: string; elsePart?: string } {
  const t = body.trim();
  if (t.startsWith('(')) {
    let depth = 0;
    let quote: '"' | null = null;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (ch === '"') quote = quote ? null : '"';
      else if (!quote) {
        if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0) {
            const thenPart = t.slice(1, i).trim();
            const rest = t.slice(i + 1).trim();
            if (/^else\b/i.test(rest)) {
              let elseBody = rest.slice(4).trim();
              if (elseBody.startsWith('(') && elseBody.endsWith(')')) {
                elseBody = elseBody.slice(1, -1).trim();
              }
              return { thenPart, elsePart: elseBody };
            }
            return { thenPart };
          }
        }
      }
    }
  }
  // Single-line `stmt ELSE stmt`
  let quote: '"' | null = null;
  for (let i = 0; i < t.length - 5; i++) {
    if (t[i] === '"') quote = quote ? null : '"';
    else if (!quote && /\selse\s/i.test(t.slice(i, i + 6))) {
      const thenPart = t.slice(0, i).trim();
      let elseBody = t.slice(i + 6).trim();
      if (elseBody.startsWith('(') && elseBody.endsWith(')')) {
        elseBody = elseBody.slice(1, -1).trim();
      }
      return { thenPart, elsePart: elseBody };
    }
  }
  return { thenPart: t };
}

function mapBatColorCode(hexCode: string): string | null {
  const c = hexCode.trim().toUpperCase().slice(-1);
  switch (c) {
    case 'A':
    case '2':
      return 'matrix';
    case 'B':
    case '3':
    case '9':
      return 'cyber';
    case 'E':
    case '6':
      return 'amber';
    case '1':
    case 'F':
      return 'powershell';
    case '5':
    case 'D':
      return 'ubuntu';
    case '7':
    case '0':
    default:
      return 'default';
  }
}

export async function executeBatScript(code: string, ctx: BatRuntimeContext): Promise<number> {
  const cleanCode = code.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const rootLines = splitTopLevelBlockLines(cleanCode.split('\n'));
  const rootFrame: BatCallFrame = {
    lines: rootLines,
    labels: buildLabelMap(rootLines),
    pc: 0,
    args: ctx.args,
    scriptName: ctx.scriptName,
  };

  const callStack: BatCallFrame[] = [rootFrame];
  const env = new Map<string, string>();
  const loopVars = new Map<string, string>();
  let echoOn = true;
  let errorLevel = 0;
  let aborted = false;
  let steps = 0;
  const MAX_STEPS = 5000;

  const execStatement = async (rawStmt: string): Promise<'next' | 'exit_frame' | 'exit_all' | 'jumped'> => {
    if (ctx.isAborted() || aborted) return 'exit_all';
    if (++steps > MAX_STEPS) {
      ctx.onOutput(['Error: 実行ステップ上限 (5000) を超えました (無限ループ防止)。']);
      return 'exit_all';
    }
    if (steps % 40 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }

    const frame = callStack[callStack.length - 1];
    let stmt = rawStmt.trim();
    if (!stmt) return 'next';

    // Handle multi-statement parenthesized block passed from IF/ELSE/FOR
    if (stmt.startsWith('(') && stmt.endsWith(')') && countUnquotedParens(stmt) === 0) {
      const innerLines = splitTopLevelBlockLines(stmt.slice(1, -1).split('\n'));
      for (const inner of innerLines) {
        const signal = await execStatement(inner);
        if (signal === 'exit_all' || signal === 'exit_frame' || signal === 'jumped') {
          return signal;
        }
      }
      return 'next';
    }
    if (stmt.includes('\n')) {
      const subLines = splitTopLevelBlockLines(stmt.split('\n'));
      if (subLines.length > 1 || (subLines.length === 1 && subLines[0] !== stmt)) {
        for (const sl of subLines) {
          const signal = await execStatement(sl);
          if (signal === 'exit_all' || signal === 'exit_frame' || signal === 'jumped') {
            return signal;
          }
        }
        return 'next';
      }
    }

    // Comments & Labels
    if (stmt.startsWith('::') || /^rem(\s|$)/i.test(stmt)) return 'next';
    if (stmt.startsWith(':')) return 'next';

    let suppressEcho = false;
    if (stmt.startsWith('@')) {
      suppressEcho = true;
      stmt = stmt.slice(1).trim();
    }
    if (!stmt) return 'next';

    // Handle FOR before global variable expansion so loop body variables (%VAR% / !VAR!) expand per-iteration
    if (/^for(?=\s|\/)/i.test(stmt)) {
      if (echoOn && !suppressEcho) {
        const cwd = ctx.getCwd();
        const pfx = cwd ? `C:\\${cwd.replace(/\//g, '\\')}>` : 'C:\\>';
        ctx.onOutput([`${pfx}${stmt}`]);
      }
      const forRawRest = stmt.slice(3).trim();
      const forL = forRawRest.match(/^\/l\s+%%?([A-Za-z])\s+in\s*\(([^)]+)\)\s+do\s+([\s\S]+)$/i);
      if (forL) {
        const varKey = forL[1];
        const expandedRange = expandVariables(forL[2], env, loopVars, frame, ctx.getCwd(), ctx.username, errorLevel);
        const parts = expandedRange.split(/[,\s]+/).map(x => Number(x.trim()));
        const body = forL[3].trim();
        const [start = 1, step = 1, end = 1] = parts;
        if (step !== 0) {
          for (let v = start; step > 0 ? v <= end : v >= end; v += step) {
            if (ctx.isAborted() || aborted) return 'exit_all';
            loopVars.set(varKey, String(v));
            const sig = await execStatement(body);
            if (sig === 'exit_all' || sig === 'exit_frame' || sig === 'jumped') {
              loopVars.delete(varKey);
              return sig;
            }
          }
          loopVars.delete(varKey);
        }
        return 'next';
      }

      const forStd = forRawRest.match(/^%%?([A-Za-z])\s+in\s*\(([^)]*)\)\s+do\s+([\s\S]+)$/i);
      if (forStd) {
        const varKey = forStd[1];
        const expandedSet = expandVariables(forStd[2], env, loopVars, frame, ctx.getCwd(), ctx.username, errorLevel);
        const items = tokenizeArgs(expandedSet.replace(/,/g, ' '));
        const body = forStd[3].trim();
        for (const item of items) {
          if (ctx.isAborted() || aborted) return 'exit_all';
          loopVars.set(varKey, item);
          const sig = await execStatement(body);
          if (sig === 'exit_all' || sig === 'exit_frame' || sig === 'jumped') {
            loopVars.delete(varKey);
            return sig;
          }
        }
        loopVars.delete(varKey);
        return 'next';
      }
    }

    const expanded = expandVariables(stmt, env, loopVars, frame, ctx.getCwd(), ctx.username, errorLevel);

    // Check echo on/off special cases before printing command echo
    const lowerExp = expanded.trim().toLowerCase();
    if (lowerExp === 'echo off' || lowerExp === 'echo on') {
      echoOn = lowerExp === 'echo on';
      return 'next';
    }

    if (echoOn && !suppressEcho) {
      const cwd = ctx.getCwd();
      const pfx = cwd ? `C:\\${cwd.replace(/\//g, '\\')}>` : 'C:\\>';
      ctx.onOutput([`${pfx}${expanded}`]);
    }

    // Check inline IF / commands
    const firstWordMatch = expanded.match(/^([^\s.:/]+)(.*)$/s);
    const cmdRaw = firstWordMatch ? firstWordMatch[1].toLowerCase() : expanded.toLowerCase();
    const restRaw = firstWordMatch ? firstWordMatch[2].trim() : '';

    // Handle `echo.` or `echo:`
    if (/^echo[.:]$/i.test(expanded.trim())) {
      ctx.onOutput(['']);
      return 'next';
    }
    if (/^echo[.:]\s*(.*)$/i.test(expanded.trim())) {
      const m = expanded.trim().match(/^echo[.:]\s*(.*)$/i);
      ctx.onOutput([m ? m[1] : '']);
      return 'next';
    }

    // IF statement (parse condition on expanded string, execute raw unexpanded body so delayed vars work!)
    if (cmdRaw === 'if') {
      let cursor = restRaw;
      let caseInsensitive = false;
      let negate = false;
      if (/^\/i\s+/i.test(cursor)) {
        caseInsensitive = true;
        cursor = cursor.replace(/^\/i\s+/i, '').trim();
      }
      if (/^not\s+/i.test(cursor)) {
        negate = true;
        cursor = cursor.replace(/^not\s+/i, '').trim();
      }

      let cond = false;
      let remainder = '';

      if (/^exist\s+/i.test(cursor)) {
        const afterExist = cursor.replace(/^exist\s+/i, '').trim();
        const m = afterExist.match(/^("[^"]+"|\S+)\s+([\s\S]+)$/);
        if (m) {
          const targetSpec = stripQuotes(m[1]);
          remainder = m[2].trim();
          const files = loadVirtualFiles();
          const dirs = getAllDirs(files);
          const f = findVfsFile(files, ctx.getCwd(), targetSpec);
          const d = normalizeDirName(ctx.getCwd(), targetSpec, dirs);
          cond = Boolean(f || (d !== null && d !== ''));
        }
      } else if (/^defined\s+/i.test(cursor)) {
        const m = cursor.replace(/^defined\s+/i, '').trim().match(/^(\S+)\s+([\s\S]+)$/);
        if (m) {
          const varName = m[1].toUpperCase();
          remainder = m[2].trim();
          for (const k of env.keys()) {
            if (k.toUpperCase() === varName && (env.get(k) ?? '') !== '') {
              cond = true;
              break;
            }
          }
        }
      } else if (/^errorlevel\s+/i.test(cursor)) {
        const m = cursor.replace(/^errorlevel\s+/i, '').trim().match(/^(-?\d+)\s+([\s\S]+)$/);
        if (m) {
          const threshold = parseInt(m[1], 10);
          remainder = m[2].trim();
          cond = errorLevel >= threshold;
        }
      } else {
        // lhs == rhs OR lhs OP rhs
        const eqMatch = cursor.match(/^("[^"]*"|\S+)\s*==\s*("[^"]*"|\S+)\s+([\s\S]+)$/);
        const opMatch = cursor.match(/^("[^"]*"|\S+)\s+(EQU|NEQ|LSS|LEQ|GTR|GEQ)\s+("[^"]*"|\S+)\s+([\s\S]+)$/i);
        if (eqMatch) {
          let lhs = stripQuotes(eqMatch[1]);
          let rhs = stripQuotes(eqMatch[2]);
          remainder = eqMatch[3].trim();
          if (caseInsensitive) {
            lhs = lhs.toLowerCase();
            rhs = rhs.toLowerCase();
          }
          cond = lhs === rhs;
        } else if (opMatch) {
          const lhsRaw = stripQuotes(opMatch[1]);
          const op = opMatch[2].toUpperCase();
          const rhsRaw = stripQuotes(opMatch[3]);
          remainder = opMatch[4].trim();
          const lhsNum = Number(lhsRaw);
          const rhsNum = Number(rhsRaw);
          const bothNum = lhsRaw !== '' && rhsRaw !== '' && Number.isFinite(lhsNum) && Number.isFinite(rhsNum);
          const a = bothNum ? lhsNum : (caseInsensitive ? lhsRaw.toLowerCase() : lhsRaw);
          const b = bothNum ? rhsNum : (caseInsensitive ? rhsRaw.toLowerCase() : rhsRaw);
          if (op === 'EQU') cond = a === b;
          else if (op === 'NEQ') cond = a !== b;
          else if (op === 'LSS') cond = a < b;
          else if (op === 'LEQ') cond = a <= b;
          else if (op === 'GTR') cond = a > b;
          else if (op === 'GEQ') cond = a >= b;
        }
      }

      if (negate) cond = !cond;
      if (!remainder) return 'next';
      const { thenPart, elsePart } = splitIfElseBlock(remainder);
      if (cond) {
        return execStatement(thenPart);
      } else if (elsePart) {
        return execStatement(elsePart);
      }
      return 'next';
    }

    // Control flow
    if (cmdRaw === 'goto') {
      const target = restRaw.replace(/^:/, '').trim().split(/\s+/)[0].toLowerCase();
      if (!target || target === 'eof') return 'exit_frame';
      const idx = frame.labels.get(target);
      if (idx === undefined) {
        ctx.onOutput([`Error: ラベル ":${target}" が見つかりません。`]);
        errorLevel = 1;
        return 'exit_all';
      }
      frame.pc = idx;
      return 'jumped';
    }

    if (cmdRaw === 'exit') {
      const tokens = tokenizeArgs(restRaw);
      const isSubReturn = tokens.some(t => t.toLowerCase() === '/b');
      const codeTok = tokens.find(t => /^-?\d+$/.test(t));
      if (codeTok) errorLevel = parseInt(codeTok, 10);
      return isSubReturn ? 'exit_frame' : 'exit_all';
    }

    if (cmdRaw === 'call') {
      const tokens = tokenizeArgs(restRaw);
      const target = tokens[0] || '';
      const subArgs = tokens.slice(1);
      if (target.startsWith(':')) {
        const label = target.slice(1).toLowerCase();
        const idx = frame.labels.get(label);
        if (idx === undefined) {
          ctx.onOutput([`Error: サブルーチン ":${label}" が見つかりません。`]);
          errorLevel = 1;
          return 'next';
        }
        callStack.push({
          lines: frame.lines,
          labels: frame.labels,
          pc: idx,
          args: subArgs,
          scriptName: frame.scriptName,
        });
        return 'next';
      }
      // Call external .bat file from VFS
      const extFile = findVfsFile(loadVirtualFiles(), ctx.getCwd(), target);
      if (extFile) {
        const subLines = splitTopLevelBlockLines(extFile.content.replace(/\r\n/g, '\n').split('\n'));
        callStack.push({
          lines: subLines,
          labels: buildLabelMap(subLines),
          pc: 0,
          args: subArgs,
          scriptName: extFile.name,
        });
        return 'next';
      }
      ctx.onOutput([`Error: バッチファイルが見つかりません: "${target}"`]);
      errorLevel = 1;
      return 'next';
    }

    // SET / SETLOCAL / ENDLOCAL
    if (cmdRaw === 'setlocal' || cmdRaw === 'endlocal') {
      return 'next';
    }
    if (cmdRaw === 'set') {
      if (!restRaw) {
        if (env.size === 0) ctx.onOutput(['(環境変数は設定されていません)']);
        else env.forEach((v, k) => ctx.onOutput([`${k}=${v}`]));
        return 'next';
      }
      if (/^\/a\s+/i.test(restRaw)) {
        const exprPart = restRaw.replace(/^\/a\s+/i, '').trim();
        const eqIdx = exprPart.indexOf('=');
        if (eqIdx > 0) {
          const k = exprPart.slice(0, eqIdx).trim();
          const expr = exprPart.slice(eqIdx + 1).trim();
          try {
            const val = evalSetArithmetic(expr, env);
            env.set(k, String(val));
            errorLevel = 0;
          } catch {
            ctx.onOutput([`Error: 算術式エラー (${expr})`]);
            errorLevel = 1;
          }
        }
        return 'next';
      }
      if (/^\/p\s+/i.test(restRaw)) {
        const promptPart = restRaw.replace(/^\/p\s+/i, '').trim();
        const eqIdx = promptPart.indexOf('=');
        if (eqIdx > 0) {
          const k = promptPart.slice(0, eqIdx).trim();
          const promptText = promptPart.slice(eqIdx + 1);
          const answer = await ctx.onPrompt(promptText || `${k}:`);
          if (ctx.isAborted()) return 'exit_all';
          env.set(k, answer);
        }
        return 'next';
      }
      const eqIdx = restRaw.indexOf('=');
      if (eqIdx > 0) {
        const k = restRaw.slice(0, eqIdx).trim();
        const v = restRaw.slice(eqIdx + 1);
        if (v === '') env.delete(k);
        else env.set(k, v);
      } else {
        const prefix = restRaw.toLowerCase();
        env.forEach((v, k) => {
          if (k.toLowerCase().startsWith(prefix)) ctx.onOutput([`${k}=${v}`]);
        });
      }
      return 'next';
    }

    // Interactive / timing / console commands
    if (cmdRaw === 'pause') {
      await ctx.onPrompt('続行するには Enter キーを押してください . . .');
      return ctx.isAborted() ? 'exit_all' : 'next';
    }

    if (cmdRaw === 'choice') {
      const tokens = tokenizeArgs(restRaw);
      let keys = 'YN';
      let msg = '選択してください';
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.toLowerCase() === '/c' && tokens[i + 1]) {
          keys = tokens[i + 1].toUpperCase();
          i++;
        } else if (t.toLowerCase() === '/m' && tokens[i + 1]) {
          msg = tokens[i + 1];
          i++;
        }
      }
      const ans = (await ctx.onPrompt(`${msg} [${keys.split('').join(',')}]:`)).trim().toUpperCase();
      if (ctx.isAborted()) return 'exit_all';
      const idx = ans ? keys.indexOf(ans[0]) : -1;
      errorLevel = idx >= 0 ? idx + 1 : 0;
      return 'next';
    }

    if (cmdRaw === 'timeout' || cmdRaw === 'sleep') {
      const tokens = tokenizeArgs(restRaw);
      const secTok = tokens.find(t => /^\d+$/.test(t));
      const sec = Math.max(0, Math.min(60, parseInt(secTok || '1', 10)));
      if (sec > 0) {
        ctx.onOutput([`${sec} 秒待機しています...`]);
        for (let i = 0; i < sec * 4; i++) {
          if (ctx.isAborted() || aborted) return 'exit_all';
          await new Promise(r => setTimeout(r, 250));
        }
      }
      return 'next';
    }

    if (cmdRaw === 'cls') {
      ctx.onClear();
      return 'next';
    }

    if (cmdRaw === 'title') {
      if (ctx.onSetTitle && restRaw) ctx.onSetTitle(restRaw);
      return 'next';
    }

    if (cmdRaw === 'color') {
      const mapped = mapBatColorCode(restRaw);
      if (mapped && ctx.onSetColor) ctx.onSetColor(mapped);
      return 'next';
    }

    // Windows file aliases mapped cleanly to WebOS virtual filesystem / terminal runner
    if (cmdRaw === 'md') {
      const out = await ctx.onRunWebOsCommand(`mkdir ${restRaw}`);
      if (out.length) ctx.onOutput(out);
      return 'next';
    }
    if (cmdRaw === 'rd') {
      const out = await ctx.onRunWebOsCommand(`rmdir ${restRaw}`);
      if (out.length) ctx.onOutput(out);
      return 'next';
    }
    if (cmdRaw === 'copy') {
      const out = await ctx.onRunWebOsCommand(`cp ${restRaw}`);
      if (out.length) ctx.onOutput(out);
      return 'next';
    }
    if (cmdRaw === 'ren' || cmdRaw === 'rename') {
      const out = await ctx.onRunWebOsCommand(`mv ${restRaw}`);
      if (out.length) ctx.onOutput(out);
      return 'next';
    }
    if (cmdRaw === 'erase') {
      const out = await ctx.onRunWebOsCommand(`rm ${restRaw}`);
      if (out.length) ctx.onOutput(out);
      return 'next';
    }
    if (cmdRaw === 'chdir') {
      const out = await ctx.onRunWebOsCommand(`cd ${restRaw}`);
      if (out.length) ctx.onOutput(out);
      return 'next';
    }
    if (cmdRaw === 'find' || cmdRaw === 'findstr') {
      const out = await ctx.onRunWebOsCommand(`grep ${restRaw}`);
      if (out.length) ctx.onOutput(out);
      return 'next';
    }

    if (cmdRaw === 'start') {
      const tokens = tokenizeArgs(restRaw).filter(t => !t.startsWith('/'));
      const target = tokens[0] || '';
      if (!target) return 'next';
      if (/^https?:\/\//i.test(target)) {
        try {
          localStorage.setItem('webos_browser_pending_url', target);
          window.dispatchEvent(new CustomEvent('webos_browser_open_url', { detail: { url: target } }));
        } catch {}
        const out = await ctx.onRunWebOsCommand('open browser');
        ctx.onOutput([`ブラウザで開きました: ${target}`, ...out.filter(Boolean)]);
        return 'next';
      }
      const resolvedApp = resolveAppLaunchTarget(target);
      if (resolvedApp) {
        const out = await ctx.onRunWebOsCommand(`open ${resolvedApp.id}`);
        if (out.length) ctx.onOutput(out);
        return 'next';
      }
      const vfsFile = findVfsFile(loadVirtualFiles(), ctx.getCwd(), target);
      if (vfsFile) {
        if (vfsFile.name.toLowerCase().endsWith('.bat') || vfsFile.name.toLowerCase().endsWith('.cmd')) {
          const subLines = splitTopLevelBlockLines(vfsFile.content.replace(/\r\n/g, '\n').split('\n'));
          callStack.push({
            lines: subLines,
            labels: buildLabelMap(subLines),
            pc: 0,
            args: tokens.slice(1),
            scriptName: vfsFile.name,
          });
          return 'next';
        }
        const out = await ctx.onRunWebOsCommand(`open ${vfsFile.name}`);
        if (out.length) ctx.onOutput(out);
        return 'next';
      }
      ctx.onOutput([`Error: 起動対象が見つかりません: "${target}"`]);
      errorLevel = 1;
      return 'next';
    }

    // Fallback: execute through WebOS terminal engine (supports aboad, git, redirect, echo >, cp, mv, open, notify, calc, sprout, etc.)
    const resultLines = await ctx.onRunWebOsCommand(expanded);
    if (resultLines.length > 0) {
      ctx.onOutput(resultLines);
      if (resultLines.some(l => l.startsWith('Error:'))) errorLevel = 1;
      else errorLevel = 0;
    }
    return 'next';
  };

  while (callStack.length > 0 && !ctx.isAborted() && !aborted) {
    const frame = callStack[callStack.length - 1];
    if (frame.pc >= frame.lines.length) {
      callStack.pop();
      continue;
    }
    const line = frame.lines[frame.pc];
    const sig = await execStatement(line);
    if (sig === 'exit_all') break;
    if (sig === 'exit_frame') {
      callStack.pop();
      continue;
    }
    if (sig === 'jumped') {
      // frame.pc now points to :label line; advance 1 past label
      frame.pc++;
      continue;
    }
    // Only advance PC of the frame that was active when execStatement started
    // (if `CALL` pushed a new frame, new frame starts at its `pc` without skipping line 0!)
    if (callStack[callStack.length - 1] === frame) {
      frame.pc++;
    } else {
      // Caller frame should advance past the CALL line once callee returns
      frame.pc++;
    }
  }

  return errorLevel;
}
