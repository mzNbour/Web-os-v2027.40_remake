import React, { useState, useEffect, useRef } from 'react';
import { AppID, SettingsState, VirtualFile, WALLPAPERS, WindowInstance } from '../../types';
import { OS_VERSIONS, findOSVersion } from '../../config/osVersions';
import { SproutInterpreter } from './SproutInterpreter';
import {
  BatUrlMode,
  executeBatScript,
  injectUrlProgramIntoBat,
} from './batInterpreter';
import {
  ALL_TERMINAL_COMMANDS,
  TERMINAL_THEMES,
  TerminalTheme,
  applyPipeFilter,
  base64ToUtf8,
  evalJsExpression,
  evalMathExpression,
  extractRedirection,
  findVfsFile,
  generateBanner,
  generateCalendarLines,
  getAllDirs,
  getHelpLines,
  loadCustomDirs,
  loadVirtualFiles,
  normalizeDirName,
  resolveAppLaunchTarget,
  saveCustomDirs,
  saveVirtualFiles,
  simulateNmap,
  splitCommandChain,
  splitFolderAndFile,
  splitPipes,
  tokenizeArgs,
  utf8ToBase64,
} from './terminalUtils';

export interface TerminalAppProps {
  openWindows?: WindowInstance[];
  settings?: SettingsState;
  onUpdateSettings?: (newSettings: SettingsState) => void;
  onLaunchApp?: (appId: AppID) => void;
  onCloseWindow?: (appId: string) => void;
  onOpenFile?: (name: string, content: string) => void;
  onOpenRawNotepad?: (name: string, content: string) => void;
  onRestartSystem?: () => void;
  onLockSystem?: () => void;
  onNotify?: (sender: string, text: string) => void;
  pendingBatPayload?: { name: string; content: string; runId: number } | null;
  onBatPayloadConsumed?: () => void;
}

const FORTUNES = [
  '「動くコード」から「読みやすいコード」へ。リファクタリングは未来の自分へのプレゼントです。',
  'まずは小さく動かして、測定してから最適化しよう。(Premature optimization is the root of all evil.)',
  'Ctrl+L で画面クリア、Tab でコマンド・ファイル補完、| で出力フィルタリングができます。',
  '「sprout -e "display(1 + 2)"」でSprout言語をターミナルから即実行できます。',
  '「neofetch」でシステム詳細、「weather Tokyo」でリアルタイム天気を確認できます。',
  'バグの9割は「思い込み」から生まれ、残りの1割はオフバイワンエラーから生まれる。',
  '「color matrix」や「color cyber」でターミナルの配色テーマを切り替えられます。',
];

const WEATHER_CODE_LABELS: Record<number, string> = {
  0: '快晴 ☀️',
  1: '晴れ 🌤️',
  2: '一部曇り ⛅',
  3: '曇り ☁️',
  45: '霧 🌫️',
  48: '霧氷 🌫️',
  51: '小雨 🌦️',
  53: '霧雨 🌦️',
  55: '強い霧雨 🌧️',
  61: '小雨 🌧️',
  63: '雨 🌧️',
  65: '大雨 ⛈️',
  71: '小雪 🌨️',
  73: '雪 ❄️',
  75: '大雪 ❄️',
  80: 'にわか雨 🌦️',
  81: '強いにわか雨 🌧️',
  95: '雷雨 ⛈️',
};

export const TerminalApp: React.FC<TerminalAppProps> = ({
  openWindows = [],
  settings,
  onUpdateSettings,
  onLaunchApp,
  onCloseWindow,
  onOpenFile,
  onOpenRawNotepad,
  onRestartSystem,
  onLockSystem,
  onNotify,
  pendingBatPayload,
  onBatPayloadConsumed,
}) => {
  const [history, setHistory] = useState<string[]>([
    'Abord OS PowerShell / CLI [Version 2.0.0]',
    '(c) Abord Corporation. All rights reserved.',
    '',
    'Type "help" to list commands (e.g. help bat, help files, help os, help net, help dev).',
    'Tips: Tab=補完 | ↑↓=履歴 | >=保存 | |=パイプ | .bat=Windowsバッチ実行',
    '',
  ]);
  const [inputValue, setInputValue] = useState('');
  const [cwd, setCwd] = useState<string>(''); // '' = C:\, 'Documents' = C:\Documents
  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('webos_terminal_cmd_history');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.slice(-100) : [];
    } catch {
      return [];
    }
  });
  const [historyPointer, setHistoryPointer] = useState(-1);
  const [aliases, setAliases] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('webos_terminal_aliases');
      return saved ? JSON.parse(saved) : { ll: 'ls -l', cls: 'clear' };
    } catch {
      return { ll: 'ls -l', cls: 'clear' };
    }
  });
  const [themeId, setThemeId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('webos_terminal_theme');
      return saved && TERMINAL_THEMES[saved] ? saved : 'default';
    } catch {
      return 'default';
    }
  });

  // Interactive Modes
  const [adminState, setAdminState] = useState<'none' | 'password_prompt' | 'authorized'>('none');
  const [osPromptState, setOsPromptState] = useState<boolean>(false);
  const [sproutPromptLabel, setSproutPromptLabel] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [matrixMode, setMatrixMode] = useState<boolean>(false);
  const [activeTimerLabel, setActiveTimerLabel] = useState<string | null>(null);
  const [windowTitle, setWindowTitle] = useState<string | null>(null);

  // Admin Console Form State
  const [adminTab, setAdminTab] = useState<'docx' | 'bat'>('bat');
  const [adminTitle, setAdminTitle] = useState('緊急メンテナンスのお知らせ');
  const [adminSender, setAdminSender] = useState('システム管理者');
  const [adminBody, setAdminBody] = useState(
    `<h1 style="color: #185abd; font-family: sans-serif; border-bottom: 2px solid #185abd; padding-bottom: 8px;">管理者からの重要指示書</h1>
<p style="font-family: sans-serif; font-size: 14px; color: #333333; margin-top: 15px; line-height: 1.6;">
  本状はシステム管理者によってすべての一般端末へ向けて配信された公式文書です。
</p>
<p style="font-family: sans-serif; font-size: 14px; color: #333333; line-height: 1.6; background-color: #f3f6fc; padding: 12px; border-left: 4px solid #185abd; margin: 15px 0;">
  <strong>【連絡内容】</strong><br />
  基幹データベースサーバーの移行作業のため、本日18:00より全システムへのアクセスが一時的に制限されます。<br />
  作成中のファイルがある場合は、必ず速やかにローカルまたはクラウドへ保存を完了させてください。
</p>
<p style="font-family: sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
  ご不便をおかけいたしますが、システムの安定稼働のためご協力をお願い申し上げます。
</p>
<p style="font-family: sans-serif; font-size: 12px; color: #666666; margin-top: 30px; text-align: right; border-top: 1px dashed #dddddd; padding-top: 10px;">
  配信日時: ${new Date().toLocaleString()}<br />
  署名: セキュリティ統括本部 システム運用管理部門
</p>`
  );
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  // Admin .bat Broadcast + Auto URL-Injector State
  const [batFilename, setBatFilename] = useState('update_url.bat');
  const [batTargetUser, setBatTargetUser] = useState('*');
  const [batNewUrl, setBatNewUrl] = useState('https://moozunobu.github.io/Abord-browser-ver2/');
  const [batUrlMode, setBatUrlMode] = useState<BatUrlMode>('both');
  const [batAutoInjectUrl, setBatAutoInjectUrl] = useState(true);
  const [batAutoRun, setBatAutoRun] = useState(true);
  const [batCode, setBatCode] = useState(
    `@echo off\r\nTITLE WebOS System Updater\r\nECHO 管理者バッチを受信しました (%USERNAME%)\r\nECHO 現在のAboad URL: %ABOAD_URL%\r\n`
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sproutRef = useRef<SproutInterpreter | null>(null);
  const sproutInputResolveRef = useRef<((val: string) => void) | null>(null);
  const batAbortRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cwdRef = useRef<string>(cwd);
  cwdRef.current = cwd;

  const theme: TerminalTheme = TERMINAL_THEMES[themeId] || TERMINAL_THEMES.default;
  const promptPrefix = cwd ? `C:\\Users\\WebOS\\${cwd.replace(/\//g, '\\')}>` : 'C:\\Users\\WebOS>';

  useEffect(() => {
    setHistoryPointer(commandHistory.length);
    try {
      localStorage.setItem('webos_terminal_cmd_history', JSON.stringify(commandHistory.slice(-100)));
    } catch {}
  }, [commandHistory]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history, sproutPromptLabel, isBusy]);

  useEffect(() => {
    return () => {
      batAbortRef.current = true;
      if (abortRef.current) abortRef.current.abort();
      if (sproutRef.current) sproutRef.current.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Matrix Digital Rain Animation Loop
  useEffect(() => {
    if (!matrixMode) return;
    const canvas = matrixCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();

    const fontSize = 14;
    let cols = Math.max(1, Math.floor(canvas.width / fontSize));
    let drops = new Array(cols).fill(1).map(() => Math.floor(Math.random() * 20));
    const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFZ';

    const interval = setInterval(() => {
      if (cols !== Math.max(1, Math.floor(canvas.width / fontSize))) {
        cols = Math.max(1, Math.floor(canvas.width / fontSize));
        drops = new Array(cols).fill(1);
      }
      ctx.fillStyle = 'rgba(0, 8, 2, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#22c55e';
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = Math.random() > 0.94 ? '#bbf7d0' : '#22c55e';
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }, 45);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'q' || (e.ctrlKey && e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        setMatrixMode(false);
        setTimeout(() => inputRef.current?.focus(), 40);
      }
    };
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
    };
  }, [matrixMode]);

  const appendLines = (lines: string[]) => {
    setHistory(prev => [...prev, ...lines]);
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const cancelRunningTask = () => {
    if (matrixMode) {
      setMatrixMode(false);
      return;
    }
    batAbortRef.current = true;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (sproutRef.current) {
      sproutRef.current.stop();
      sproutRef.current = null;
    }
    if (sproutInputResolveRef.current) {
      sproutInputResolveRef.current('');
      sproutInputResolveRef.current = null;
    }
    setSproutPromptLabel(null);
    setIsBusy(false);
    setOsPromptState(false);
    setAdminState('none');
    appendLines(['^C (実行を中断しました)', '']);
  };

  const playBeep = () => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  const getClientId = () => {
    try {
      let id = localStorage.getItem('webos_client_id');
      if (!id) {
        id = `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem('webos_client_id', id);
      }
      return id;
    } catch {
      return '';
    }
  };

  const executeOsRedirect = (targetUrl: string) => {
    setTimeout(() => {
      try {
        window.location.href = targetUrl;
      } catch {
        window.open(targetUrl, '_self');
      }
    }, 600);
  };

  const sendAdminBroadcastApi = async (
    sender: string,
    title: string,
    bodyText: string,
    options?: {
      kind?: 'docx' | 'bat';
      batFilename?: string;
      batCode?: string;
      autoRun?: boolean;
      targetUser?: string;
    }
  ) => {
    try {
      const cleanPath = '/api/admin/broadcasts';
      const url = window.location?.origin && window.location.origin !== 'null'
        ? window.location.origin + cleanPath
        : cleanPath;
      const payload = {
        sender: sender || '管理者 (Admin)',
        title,
        text: bodyText,
        kind: options?.kind || 'docx',
        batFilename: options?.batFilename,
        batCode: options?.batCode,
        autoRun: options?.autoRun,
        targetUser: options?.targetUser,
        senderClientId: getClientId(),
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.broadcast) {
          try {
            const seenRaw = localStorage.getItem('webos_seen_broadcasts');
            const seen = seenRaw ? JSON.parse(seenRaw) : [];
            if (!seen.includes(data.broadcast.id)) {
              seen.push(data.broadcast.id);
              localStorage.setItem('webos_seen_broadcasts', JSON.stringify(seen));
            }
          } catch {}
        }
        return true;
      }
    } catch (e) {
      console.error('Error broadcasting message:', e);
    }
    return false;
  };

  const writeFileContent = (spec: string, content: string, mode: 'write' | 'append'): { ok: boolean; message: string } => {
    const files = loadVirtualFiles();
    const activeCwd = cwdRef.current;
    const existing = findVfsFile(files, activeCwd, spec);
    if (existing) {
      const updatedContent = mode === 'append'
        ? (existing.content ? existing.content + '\n' + content : content)
        : content;
      const updated = files.map(f =>
        f.name === existing.name && f.path === existing.path
          ? { ...f, content: updatedContent }
          : f
      );
      saveVirtualFiles(updated);
      return { ok: true, message: `${mode === 'append' ? '追記' : '保存'}しました: ${existing.path}\\${existing.name} (${updatedContent.length} chars)` };
    }
    const { folder, name } = splitFolderAndFile(activeCwd, spec);
    if (!name) return { ok: false, message: 'Error: ファイル名が指定されていません。' };
    const customDirs = loadCustomDirs();
    if (!customDirs.some(d => d.toLowerCase() === folder.toLowerCase())) {
      customDirs.push(folder);
      saveCustomDirs(customDirs);
    }
    const newFile: VirtualFile = {
      name,
      path: folder,
      content,
      type: 'txt',
      createdAt: new Date().toISOString(),
    };
    saveVirtualFiles([...files, newFile]);
    return { ok: true, message: `新規作成しました: ${folder}\\${name} (${content.length} chars)` };
  };

  const runSproutProgram = async (code: string, label: string) => {
    setIsBusy(true);
    appendLines([`[Sprout] 実行中: ${label} ...`]);
    const interp = new SproutInterpreter({
      onOutput: (text) => {
        appendLines(String(text).split('\n'));
      },
      onInputPrompt: (promptText) => {
        return new Promise<string>((resolve) => {
          setSproutPromptLabel(promptText || 'input:');
          sproutInputResolveRef.current = resolve;
          setTimeout(() => inputRef.current?.focus(), 20);
        });
      },
      onReadFile: (filename) => {
        const found = findVfsFile(loadVirtualFiles(), cwdRef.current, filename);
        return found?.content;
      },
      onComplete: () => {
        setIsBusy(false);
        setSproutPromptLabel(null);
        sproutRef.current = null;
        appendLines(['[Sprout] 実行完了', '']);
      },
      onError: (errMsg, lineNo) => {
        setIsBusy(false);
        setSproutPromptLabel(null);
        sproutRef.current = null;
        appendLines([`Error: [Sprout Line ${lineNo}] ${errMsg}`, '']);
      },
    });
    sproutRef.current = interp;
    await interp.execute(code);
  };

  const runCommandLineCapture = async (cmdLine: string): Promise<string[]> => {
    const out: string[] = [];
    const chain = splitCommandChain(cmdLine);
    for (const chainedCmd of chain) {
      const { cleanCmd, redirect } = extractRedirection(chainedCmd);
      const pipeSegments = splitPipes(cleanCmd);
      if (pipeSegments.length === 0) continue;

      const firstRes = await runSingleSegment(pipeSegments[0]);
      if (firstRes.clearScreen) {
        setHistory([]);
        continue;
      }
      if (firstRes.enterPanel) {
        out.push(...firstRes.lines);
        setAdminState('authorized');
        continue;
      }
      if (firstRes.startAsync) {
        if (firstRes.lines.length > 0) out.push(...firstRes.lines);
        await firstRes.startAsync();
        continue;
      }

      let currentLines = firstRes.lines;
      for (let p = 1; p < pipeSegments.length; p++) {
        currentLines = applyPipeFilter(currentLines, pipeSegments[p]);
      }

      if (redirect) {
        const res = writeFileContent(redirect.file, currentLines.join('\n'), redirect.mode);
        out.push(res.message);
      } else if (currentLines.length > 0) {
        out.push(...currentLines);
      }
    }
    return out;
  };

  const runBatProgram = async (code: string, scriptName: string, args: string[] = []) => {
    batAbortRef.current = false;
    setIsBusy(true);
    appendLines([`[Batch] 実行開始: ${scriptName}`]);
    try {
      const exitCode = await executeBatScript(code, {
        scriptName,
        args,
        username: settings?.username || 'User',
        getCwd: () => cwdRef.current,
        setCwd: (next) => {
          setCwd(next);
          cwdRef.current = next;
        },
        onOutput: (lines) => appendLines(lines),
        onClear: () => setHistory([]),
        onPrompt: (promptText) =>
          new Promise<string>((resolve) => {
            setSproutPromptLabel(promptText || '');
            sproutInputResolveRef.current = resolve;
            setTimeout(() => inputRef.current?.focus(), 20);
          }),
        onSetTitle: (t) => setWindowTitle(t),
        onSetColor: (mappedTheme) => {
          if (TERMINAL_THEMES[mappedTheme]) {
            setThemeId(mappedTheme);
            try { localStorage.setItem('webos_terminal_theme', mappedTheme); } catch {}
          }
        },
        onRunWebOsCommand: (cmdLine) => runCommandLineCapture(cmdLine),
        isAborted: () => batAbortRef.current,
      });
      if (!batAbortRef.current) {
        appendLines([`[Batch] 終了: ${scriptName} (ERRORLEVEL=${exitCode})`, '']);
      }
    } catch (err: unknown) {
      appendLines([`Error: [Batch] ${err instanceof Error ? err.message : '実行エラー'}`, '']);
    } finally {
      setIsBusy(false);
      setSproutPromptLabel(null);
      sproutInputResolveRef.current = null;
    }
  };

  useEffect(() => {
    if (!pendingBatPayload) return;
    const { name, content } = pendingBatPayload;
    onBatPayloadConsumed?.();
    runBatProgram(content, name, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBatPayload?.runId]);

  const runSingleSegment = async (rawSegment: string): Promise<{ lines: string[]; clearScreen?: boolean; enterPanel?: boolean; startAsync?: () => Promise<void> }> => {
    const trimmed = rawSegment.trim();
    if (!trimmed) return { lines: [] };

    const rawTokens = tokenizeArgs(trimmed);
    const firstWord = (rawTokens[0] || '').toLowerCase();

    // Alias expansion (skip if alias / unalias command itself)
    let expanded = trimmed;
    if (firstWord !== 'alias' && firstWord !== 'unalias' && aliases[firstWord]) {
      const rest = trimmed.slice(rawTokens[0].length).trim();
      expanded = aliases[firstWord] + (rest ? ' ' + rest : '');
    }

    const tokens = tokenizeArgs(expanded);
    const command = (tokens[0] || '').toLowerCase();
    const argTokens = tokens.slice(1);
    const args = expanded.slice((tokens[0] || '').length).trim();
    const activeCwd = cwdRef.current;

    // Admin / sudo shortcuts
    if (command === 'sudo' || command === 'admin' || command === 'runas' || command === 'su' || command === 'administrator') {
      if (args === 'mozunbu1203') {
        return {
          lines: [
            'Authenticating administrative session...',
            'Status: Privilege Level 0 granted.',
            'Initializing Admin Broadcast Console...',
          ],
          enterPanel: true,
        };
      }
      if (argTokens[1]?.toLowerCase() === 'sendbat' || argTokens[1]?.toLowerCase() === 'mkbat') {
        const subCmd = argTokens[1].toLowerCase();
        const forwarded = `${subCmd} ${args.slice(argTokens[1].length).trim()}`.trim();
        return runSingleSegment(forwarded);
      }
      if (args && (args.toLowerCase().startsWith('msg ') || args.toLowerCase().startsWith('broadcast ') || args.toLowerCase().startsWith('net send ') || args.toLowerCase().startsWith('wall ') || args.toLowerCase().startsWith('html '))) {
        let subMsg = args.trim();
        if (subMsg.toLowerCase().startsWith('msg ')) subMsg = subMsg.substring(4).trim();
        else if (subMsg.toLowerCase().startsWith('broadcast ')) subMsg = subMsg.substring(10).trim();
        else if (subMsg.toLowerCase().startsWith('wall ')) subMsg = subMsg.substring(5).trim();
        else if (subMsg.toLowerCase().startsWith('net send ')) subMsg = subMsg.substring(9).trim();
        else if (subMsg.toLowerCase().startsWith('html ')) subMsg = subMsg.substring(5).trim();
        if (subMsg.startsWith('*')) subMsg = subMsg.substring(1).trim();

        const timeStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        const title = `緊急管理者通知 (${timeStr})`;
        const isRawHtml = /<[a-z][\s\S]*>/i.test(subMsg);
        const renderedMessage = isRawHtml
          ? subMsg
          : subMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />');
        const htmlBody = `<h1 style="color: #185abd; font-family: sans-serif; border-bottom: 2px solid #185abd; padding-bottom: 8px;">管理者メッセージ (Command Prompt)</h1>
<p style="font-family: sans-serif; font-size: 14px; color: #333333; margin-top: 15px; line-height: 1.6;">
  管理者（Root / sudo）よりコマンドプロンプト経由で全端末へ向けて緊急メッセージが配信されました。
</p>
<div style="font-family: sans-serif; font-size: 14px; color: #333333; line-height: 1.6; background-color: #f3f6fc; padding: 12px; border-left: 4px solid #185abd; margin: 15px 0;">
  <strong>【全端末配信メッセージ】</strong><br />
  ${renderedMessage}
</div>
<p style="font-family: sans-serif; font-size: 12px; color: #666666; margin-top: 25px; text-align: right; border-top: 1px dashed #dddddd; padding-top: 10px;">
  配信日時: ${new Date().toLocaleString('ja-JP')}<br />
  署名: システム管理者 (Sudo/CLI)
</p>`;
        sendAdminBroadcastApi('システム管理者 (sudo)', title, htmlBody);
        return {
          lines: [
            '[管理者メッセージ一斉配信完了]',
            `  メッセージ (HTML適用): "${subMsg.substring(0, 80)}${subMsg.length > 80 ? '...' : ''}"`,
            '  配信対象: ネットワーク上のすべての端末ユーザー (*)',
            '  ステータス: 配信成功 (200 OK)',
          ],
        };
      }
      if (args) {
        return { lines: ['Access Denied: Incorrect administrator password.'] };
      }
      setAdminState('password_prompt');
      return { lines: ['Enter Administrator Password:'] };
    }

    switch (command) {
      case 'help':
      case '?':
        return { lines: getHelpLines(argTokens[0]) };

      case 'clear':
      case 'cls':
        return { lines: [], clearScreen: true };

      case 'pwd':
        return { lines: [activeCwd ? `C:\\${activeCwd.replace(/\//g, '\\')}` : 'C:\\'] };

      case 'cd':
      case 'chdir': {
        const files = loadVirtualFiles();
        const dirs = getAllDirs(files);
        if (!args) {
          return { lines: [activeCwd ? `C:\\${activeCwd.replace(/\//g, '\\')}` : 'C:\\'] };
        }
        const resolved = normalizeDirName(activeCwd, argTokens[0] || '', dirs);
        if (resolved === null) {
          return { lines: [`Error: ディレクトリが見つかりません: "${argTokens[0]}" (ヒント: mkdir ${argTokens[0]} で作成できます)`] };
        }
        setCwd(resolved);
        cwdRef.current = resolved;
        return { lines: [] };
      }

      case 'ls':
      case 'dir': {
        const files = loadVirtualFiles();
        const dirs = getAllDirs(files);
        const showAll = argTokens.includes('-a') || argTokens.includes('-la') || argTokens.includes('-al');
        const longFmt = argTokens.includes('-l') || argTokens.includes('-la') || argTokens.includes('-al');
        const pathArg = argTokens.find(t => !t.startsWith('-'));
        let targetDir = activeCwd;
        if (pathArg) {
          const resolved = normalizeDirName(activeCwd, pathArg, dirs);
          if (resolved === null) return { lines: [`Error: パスが見つかりません: "${pathArg}"`] };
          targetDir = resolved;
        }

        const out: string[] = [];
        if (showAll || (!targetDir && files.length > 0 && longFmt)) {
          out.push(`Directory of C:\\${targetDir ? targetDir.replace(/\//g, '\\') : ''} (${showAll ? 'All files' : 'Root'})`);
        } else {
          out.push(`Directory of C:\\${targetDir ? targetDir.replace(/\//g, '\\') : ''}`);
        }

        if (!targetDir && !showAll) {
          const topDirs = Array.from(new Set(dirs.map(d => d.split('/')[0]))).sort();
          topDirs.forEach(d => {
            const count = files.filter(f => f.path === d || f.path.startsWith(d + '/')).length;
            out.push(`  <DIR>         ${d.padEnd(20)} (${count} files)`);
          });
          const rootFiles = files.filter(f => !f.path || f.path === 'Root' || f.path === '/');
          rootFiles.forEach(f => {
            out.push(`  ${f.type.toUpperCase().padEnd(12)}  ${f.name.padEnd(20)} ${String(f.content.length).padStart(6)} chars`);
          });
          if (topDirs.length === 0 && rootFiles.length === 0) out.push('  (empty)');
          return { lines: out };
        }

        const matchedFiles = showAll
          ? files
          : files.filter(f => f.path.toLowerCase() === targetDir.toLowerCase());

        if (!showAll) {
          const subDirs = dirs.filter(d => d.toLowerCase().startsWith(targetDir.toLowerCase() + '/'));
          subDirs.forEach(sd => {
            out.push(`  <DIR>         ${sd.slice(targetDir.length + 1)}`);
          });
        }

        if (matchedFiles.length === 0) {
          out.push('  (ファイルはありません — "ls -a" で全フォルダのファイルを表示できます)');
        } else {
          matchedFiles.forEach(f => {
            if (longFmt) {
              const dt = f.createdAt ? new Date(f.createdAt).toLocaleString('ja-JP') : '-';
              out.push(`  [${f.path.padEnd(10)}] ${f.type.toUpperCase().padEnd(5)} ${String(f.content.length).padStart(6)}B  ${dt.padEnd(19)}  ${f.name}`);
            } else {
              out.push(`  ${f.path.padEnd(12)}  ${f.name.padEnd(22)} (${f.type.toUpperCase()}) - ${f.content.length} chars`);
            }
          });
        }
        return { lines: out };
      }

      case 'tree': {
        const files = loadVirtualFiles();
        const dirs = getAllDirs(files);
        const out = ['C:\\'];
        dirs.forEach((d, idx) => {
          const isLastDir = idx === dirs.length - 1;
          const dirPrefix = isLastDir ? '└── ' : '├── ';
          const childPrefix = isLastDir ? '    ' : '│   ';
          out.push(`${dirPrefix}${d}/`);
          const children = files.filter(f => f.path.toLowerCase() === d.toLowerCase());
          children.forEach((f, fIdx) => {
            const fPrefix = fIdx === children.length - 1 ? '└── ' : '├── ';
            out.push(`${childPrefix}${fPrefix}${f.name} (${f.content.length}B)`);
          });
        });
        return { lines: out };
      }

      case 'mkdir':
      case 'md': {
        if (!argTokens[0]) return { lines: [`Usage: ${command} <directory_name>`] };
        const clean = argTokens[0].replace(/^C:[\\/]?/i, '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        const newDir = activeCwd ? `${activeCwd}/${clean}` : clean;
        const dirs = loadCustomDirs();
        if (dirs.some(d => d.toLowerCase() === newDir.toLowerCase())) {
          return { lines: [`Directory already exists: ${newDir}`] };
        }
        dirs.push(newDir);
        saveCustomDirs(dirs);
        return { lines: [`ディレクトリを作成しました: C:\\${newDir.replace(/\//g, '\\')}`] };
      }

      case 'rmdir':
      case 'rd': {
        if (!argTokens[0]) return { lines: ['Usage: rmdir <directory_name>'] };
        const clean = argTokens[0].replace(/^C:[\\/]?/i, '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        const target = activeCwd ? `${activeCwd}/${clean}` : clean;
        const files = loadVirtualFiles();
        if (files.some(f => f.path.toLowerCase() === target.toLowerCase())) {
          return { lines: [`Error: ディレクトリが空ではありません (${target})`] };
        }
        const dirs = loadCustomDirs();
        const filtered = dirs.filter(d => d.toLowerCase() !== target.toLowerCase());
        if (filtered.length === dirs.length) {
          return { lines: [`Error: ディレクトリが見つかりません: ${target}`] };
        }
        saveCustomDirs(filtered);
        return { lines: [`ディレクトリを削除しました: ${target}`] };
      }

      case 'cat':
      case 'type': {
        if (!argTokens[0]) return { lines: ['Usage: cat <filename>'] };
        const target = findVfsFile(loadVirtualFiles(), activeCwd, argTokens[0]);
        if (!target) return { lines: [`Error: File not found: "${argTokens[0]}"`] };
        if (target.type === 'image') {
          return { lines: [`[Image File: ${target.path}\\${target.name}] (${target.content.length} bytes data URL)`] };
        }
        return { lines: target.content ? target.content.split('\n') : ['(empty file)'] };
      }

      case 'head': {
        if (!argTokens[0]) return { lines: ['Usage: head <filename> [lines]'] };
        const target = findVfsFile(loadVirtualFiles(), activeCwd, argTokens[0]);
        if (!target) return { lines: [`Error: File not found: "${argTokens[0]}"`] };
        const n = Math.max(1, parseInt(argTokens[1] || '10', 10) || 10);
        return { lines: target.content.split('\n').slice(0, n) };
      }

      case 'tail': {
        if (!argTokens[0]) return { lines: ['Usage: tail <filename> [lines]'] };
        const target = findVfsFile(loadVirtualFiles(), activeCwd, argTokens[0]);
        if (!target) return { lines: [`Error: File not found: "${argTokens[0]}"`] };
        const n = Math.max(1, parseInt(argTokens[1] || '10', 10) || 10);
        return { lines: target.content.split('\n').slice(-n) };
      }

      case 'wc': {
        if (!argTokens[0]) return { lines: ['Usage: wc <filename>'] };
        const target = findVfsFile(loadVirtualFiles(), activeCwd, argTokens[0]);
        if (!target) return { lines: [`Error: File not found: "${argTokens[0]}"`] };
        const linesCount = target.content ? target.content.split('\n').length : 0;
        const wordsCount = target.content.trim() ? target.content.trim().split(/\s+/).length : 0;
        return { lines: [`  ${linesCount} lines   ${wordsCount} words   ${target.content.length} chars   ${target.path}\\${target.name}`] };
      }

      case 'touch':
      case 'write': {
        if (!argTokens[0]) return { lines: [`Usage: ${command} <filename> [initial content...]`] };
        const fileSpec = argTokens[0];
        const body = argTokens.slice(1).join(' ');
        if (command === 'touch' && !body) {
          const existing = findVfsFile(loadVirtualFiles(), activeCwd, fileSpec);
          if (existing) return { lines: [`Updated timestamp: ${existing.path}\\${existing.name}`] };
        }
        const res = writeFileContent(fileSpec, body, 'write');
        return { lines: [res.message] };
      }

      case 'append': {
        if (argTokens.length < 2) return { lines: ['Usage: append <filename> <text to append>'] };
        const res = writeFileContent(argTokens[0], argTokens.slice(1).join(' '), 'append');
        return { lines: [res.message] };
      }

      case 'cp':
      case 'copy': {
        if (argTokens.length < 2) return { lines: [`Usage: ${command} <source_file> <dest_file_or_folder>`] };
        const files = loadVirtualFiles();
        const src = findVfsFile(files, activeCwd, argTokens[0]);
        if (!src) return { lines: [`Error: File not found: "${argTokens[0]}"`] };
        const dirs = getAllDirs(files);
        const destArg = argTokens[1];
        const isFolder = dirs.find(d => d.toLowerCase() === destArg.toLowerCase());
        const { folder, name } = isFolder ? { folder: isFolder, name: src.name } : splitFolderAndFile(activeCwd, destArg);
        const filtered = files.filter(f => !(f.path.toLowerCase() === folder.toLowerCase() && f.name.toLowerCase() === name.toLowerCase()));
        filtered.push({ ...src, path: folder, name, createdAt: new Date().toISOString() });
        saveVirtualFiles(filtered);
        return { lines: [`コピーしました: ${src.path}\\${src.name} -> ${folder}\\${name}`] };
      }

      case 'mv':
      case 'ren':
      case 'rename': {
        if (argTokens.length < 2) return { lines: [`Usage: ${command} <source_file> <dest_file_or_folder>`] };
        const files = loadVirtualFiles();
        const src = findVfsFile(files, activeCwd, argTokens[0]);
        if (!src) return { lines: [`Error: File not found: "${argTokens[0]}"`] };
        const dirs = getAllDirs(files);
        const destArg = argTokens[1];
        const isFolder = dirs.find(d => d.toLowerCase() === destArg.toLowerCase());
        const { folder, name } = isFolder ? { folder: isFolder, name: src.name } : splitFolderAndFile(activeCwd, destArg);
        const updated = files
          .filter(f => !(f.path.toLowerCase() === folder.toLowerCase() && f.name.toLowerCase() === name.toLowerCase() && !(f.path === src.path && f.name === src.name)))
          .map(f => (f.path === src.path && f.name === src.name ? { ...f, path: folder, name } : f));
        saveVirtualFiles(updated);
        return { lines: [`移動/リネームしました: ${src.path}\\${src.name} -> ${folder}\\${name}`] };
      }

      case 'rm':
      case 'del':
      case 'erase': {
        if (!argTokens[0]) return { lines: [`Usage: ${command} <filename>`] };
        const files = loadVirtualFiles();
        const target = findVfsFile(files, activeCwd, argTokens[0]);
        if (!target) return { lines: [`Error: File not found: "${argTokens[0]}"`] };
        const next = files.filter(f => !(f.path === target.path && f.name === target.name));
        saveVirtualFiles(next);
        return { lines: [`削除しました: ${target.path}\\${target.name}`] };
      }

      case 'grep':
      case 'find':
      case 'findstr': {
        if (!argTokens[0]) return { lines: [`Usage: ${command} <keyword> [filename]`] };
        const pattern = argTokens[0].toLowerCase();
        const files = loadVirtualFiles();
        const scopedFiles = argTokens[1]
          ? (() => {
              const f = findVfsFile(files, activeCwd, argTokens[1]);
              return f ? [f] : [];
            })()
          : (activeCwd ? files.filter(f => f.path.toLowerCase() === activeCwd.toLowerCase()) : files);
        if (scopedFiles.length === 0) return { lines: ['検索対象のファイルが見つかりません。'] };
        const hits: string[] = [];
        scopedFiles.forEach(f => {
          if (f.type === 'image') return;
          const lines = f.content.split('\n');
          lines.forEach((line, idx) => {
            if (line.toLowerCase().includes(pattern)) {
              hits.push(`${f.path}\\${f.name}:${idx + 1}: ${line}`);
            }
          });
        });
        return { lines: hits.length > 0 ? hits : [`"${argTokens[0]}" に一致する行は見つかりませんでした。`] };
      }

      case 'edit': {
        if (!argTokens[0]) return { lines: ['Usage: edit <filename>'] };
        const target = findVfsFile(loadVirtualFiles(), activeCwd, argTokens[0]);
        const name = target ? target.name : argTokens[0];
        const content = target ? target.content : '';
        if (!target) writeFileContent(argTokens[0], '', 'write');
        const openEditor = onOpenRawNotepad || onOpenFile;
        if (openEditor) {
          openEditor(name, content);
          return { lines: [`エディタで開きました: ${name}`] };
        }
        return { lines: ['Error: エディタ連携が利用できません。'] };
      }

      case 'open':
      case 'start': {
        if (!argTokens[0]) return { lines: ['Usage: open <app_name | filename | https://...>'] };
        if (/^https?:\/\//i.test(argTokens[0])) {
          try {
            localStorage.setItem('webos_browser_pending_url', argTokens[0]);
            window.dispatchEvent(new CustomEvent('webos_browser_open_url', { detail: { url: argTokens[0] } }));
          } catch {}
          if (onLaunchApp) onLaunchApp('browser');
          return { lines: [`ブラウザで開きました: ${argTokens[0]}`] };
        }
        const appTarget = resolveAppLaunchTarget(args);
        if (appTarget && onLaunchApp) {
          onLaunchApp(appTarget.id as AppID);
          return { lines: [`起動しました: ${appTarget.label} (${appTarget.id})`] };
        }
        const fileTarget = findVfsFile(loadVirtualFiles(), activeCwd, argTokens[0]);
        if (fileTarget && (fileTarget.name.toLowerCase().endsWith('.bat') || fileTarget.name.toLowerCase().endsWith('.cmd'))) {
          return {
            lines: [],
            startAsync: async () => runBatProgram(fileTarget.content, fileTarget.name, argTokens.slice(1)),
          };
        }
        if (fileTarget && onOpenFile) {
          onOpenFile(fileTarget.name, fileTarget.content);
          return { lines: [`ファイルを開きました: ${fileTarget.path}\\${fileTarget.name}`] };
        }
        return { lines: [`Error: アプリまたはファイルが見つかりません: "${args}"`] };
      }

      case 'title':
        setWindowTitle(args || null);
        return { lines: args ? [`タイトルを設定しました: ${args}`] : ['タイトルをクリアしました。'] };

      case 'ps':
      case 'tasklist': {
        const running = openWindows.filter(w => w.isOpen);
        if (running.length === 0) return { lines: ['起動中のウィンドウはありません。'] };
        const out = [
          'PID   APP_ID            STATE        SIZE         TITLE',
          '----  ----------------  -----------  -----------  ------------------------',
        ];
        running.forEach((w, idx) => {
          const state = w.isMinimized ? 'Minimized' : w.isMaximized ? 'Maximized' : 'Running';
          const size = `${Math.round(w.width)}x${Math.round(w.height)}`;
          out.push(`${String(idx + 1).padEnd(4)}  ${w.id.padEnd(16)}  ${state.padEnd(11)}  ${size.padEnd(11)}  ${w.title}`);
        });
        return { lines: out };
      }

      case 'kill':
      case 'taskkill': {
        if (!argTokens[0]) return { lines: ['Usage: kill <app_id | pid> (例: kill notepad, kill 1)'] };
        const running = openWindows.filter(w => w.isOpen);
        const query = argTokens[0].toLowerCase();
        const byIdx = /^\d+$/.test(query) ? running[parseInt(query, 10) - 1] : undefined;
        const resolved = resolveAppLaunchTarget(query);
        const target = byIdx || running.find(w => w.id.toLowerCase() === query || (resolved && w.id === resolved.id));
        if (!target) return { lines: [`Error: 起動中のウィンドウが見つかりません: "${argTokens[0]}"`] };
        if (onCloseWindow) {
          onCloseWindow(target.id);
          return { lines: [`終了しました: ${target.title} (${target.id})`] };
        }
        return { lines: ['Error: ウィンドウ終了APIが利用できません。'] };
      }

      case 'whoami':
        return {
          lines: [
            `User      : ${settings?.username || 'User'}`,
            `Privilege : ${adminState === 'authorized' ? 'Administrator (Level 0)' : 'Standard User'}`,
            `Language  : ${settings?.language || 'ja'}`,
            `Timezone  : ${settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}`,
            `Terminal  : Abord CLI v2.0 (Theme: ${theme.id})`,
          ],
        };

      case 'user': {
        if (!args) return { lines: [`Current user: ${settings?.username || 'User'}`, 'Usage: user <new_username>'] };
        if (settings && onUpdateSettings) {
          onUpdateSettings({ ...settings, username: args });
          return { lines: [`ユーザー名を変更しました: ${args}`] };
        }
        return { lines: ['Error: システム設定を変更できません。'] };
      }

      case 'theme': {
        const mode = (argTokens[0] || '').toLowerCase();
        if (!mode) {
          return { lines: [`Current OS Theme: ${settings?.isDarkTheme ? 'dark' : 'light'}`, 'Usage: theme <dark|light>'] };
        }
        if ((mode === 'dark' || mode === 'light') && settings && onUpdateSettings) {
          onUpdateSettings({ ...settings, isDarkTheme: mode === 'dark' });
          return { lines: [`OSテーマを ${mode.toUpperCase()} モードに変更しました。`] };
        }
        return { lines: ['Usage: theme <dark|light>'] };
      }

      case 'lang': {
        const l = (argTokens[0] || '').toLowerCase();
        if ((l === 'ja' || l === 'en') && settings && onUpdateSettings) {
          onUpdateSettings({ ...settings, language: l });
          return { lines: [`OS表示言語を "${l === 'ja' ? '日本語' : 'English'}" に変更しました。`] };
        }
        return { lines: [`Current Language: ${settings?.language || 'ja'}`, 'Usage: lang <ja|en>'] };
      }

      case 'wallpaper': {
        if (!argTokens[0] || argTokens[0].toLowerCase() === 'list') {
          const list = WALLPAPERS.map((w, i) => `  ${String(i + 1).padStart(2, ' ')}. [${w.id.padEnd(16)}] ${w.name}`);
          return { lines: ['利用可能な壁紙 (変更: wallpaper <番号|ID|URL>):', ...list] };
        }
        const q = argTokens[0];
        let targetUrl = '';
        let label = q;
        if (/^\d+$/.test(q)) {
          const wp = WALLPAPERS[parseInt(q, 10) - 1];
          if (wp) { targetUrl = wp.url; label = wp.name; }
        } else {
          const wp = WALLPAPERS.find(w => w.id.toLowerCase() === q.toLowerCase());
          if (wp) { targetUrl = wp.url; label = wp.name; }
          else if (q.startsWith('http://') || q.startsWith('https://')) targetUrl = q;
        }
        if (!targetUrl) return { lines: [`Error: 壁紙が見つかりません: "${q}" ("wallpaper list" で確認)`] };
        if (settings && onUpdateSettings) {
          onUpdateSettings({ ...settings, wallpaper: targetUrl });
          return { lines: [`壁紙を変更しました: ${label}`] };
        }
        return { lines: ['Error: 設定を更新できません。'] };
      }

      case 'notify': {
        if (!args) return { lines: ['Usage: notify <message> または notify <タイトル> | <本文>'] };
        const splitIdx = args.indexOf('|');
        const sender = splitIdx !== -1 ? args.slice(0, splitIdx).trim() : `Terminal (${settings?.username || 'User'})`;
        const msg = splitIdx !== -1 ? args.slice(splitIdx + 1).trim() : args;
        if (onNotify) {
          onNotify(sender, msg);
          return { lines: [`デスクトップ通知を送信しました: [${sender}] ${msg}`] };
        }
        return { lines: ['Error: 通知システムが利用できません。'] };
      }

      case 'lock':
        if (onLockSystem) {
          onLockSystem();
          return { lines: ['システムをロックしました。'] };
        }
        return { lines: ['Error: ロック機能が利用できません。'] };

      case 'reboot':
      case 'restart':
        if (onRestartSystem) {
          setTimeout(() => onRestartSystem(), 600);
          return { lines: ['Abord OS を再起動しています...'] };
        }
        return { lines: ['Error: 再起動機能が利用できません。'] };

      case 'color': {
        const name = (argTokens[0] || '').toLowerCase();
        if (!name || name === 'list') {
          return {
            lines: [
              `Current Terminal Theme: ${themeId}`,
              'Available Themes:',
              ...Object.values(TERMINAL_THEMES).map(t => `  - ${t.id.padEnd(12)} (${t.label})`),
              'Usage: color <theme_name>',
            ],
          };
        }
        if (!TERMINAL_THEMES[name]) {
          return { lines: [`Error: 未知のテーマ "${name}"。("color list" で一覧表示)`] };
        }
        setThemeId(name);
        try { localStorage.setItem('webos_terminal_theme', name); } catch {}
        return { lines: [`ターミナル配色を変更しました: ${TERMINAL_THEMES[name].label}`] };
      }

      case 'alias': {
        if (!args) {
          const entries = Object.entries(aliases);
          if (entries.length === 0) return { lines: ['登録されているエイリアスはありません。'] };
          return { lines: ['Aliases:', ...entries.map(([k, v]) => `  ${k}='${v}'`), 'Usage: alias <name>=<command>'] };
        }
        const eqIdx = args.indexOf('=');
        if (eqIdx <= 0) return { lines: ['Usage: alias <name>=<command> (例: alias ll=ls -l)'] };
        const key = args.slice(0, eqIdx).trim().toLowerCase();
        const val = args.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        const next = { ...aliases, [key]: val };
        setAliases(next);
        try { localStorage.setItem('webos_terminal_aliases', JSON.stringify(next)); } catch {}
        return { lines: [`エイリアスを登録しました: ${key}='${val}'`] };
      }

      case 'unalias': {
        if (!argTokens[0]) return { lines: ['Usage: unalias <name>'] };
        const key = argTokens[0].toLowerCase();
        if (!aliases[key]) return { lines: [`Error: エイリアス "${key}" は存在しません。`] };
        const next = { ...aliases };
        delete next[key];
        setAliases(next);
        try { localStorage.setItem('webos_terminal_aliases', JSON.stringify(next)); } catch {}
        return { lines: [`エイリアスを削除しました: ${key}`] };
      }

      case 'history': {
        if (argTokens[0]?.toLowerCase() === 'clear') {
          setCommandHistory([]);
          try { localStorage.removeItem('webos_terminal_cmd_history'); } catch {}
          return { lines: ['コマンド履歴を消去しました。'] };
        }
        if (commandHistory.length === 0) return { lines: ['(履歴はありません)'] };
        return {
          lines: commandHistory.map((c, idx) => `  ${String(idx + 1).padStart(3, ' ')}  ${c}`),
        };
      }

      case 'calc': {
        if (!args) return { lines: ['Usage: calc <expression> (例: calc (2^10 + sqrt(144)) * pi)'] };
        try {
          return { lines: [`= ${evalMathExpression(args)}`] };
        } catch (err: unknown) {
          return { lines: [`Error: ${err instanceof Error ? err.message : '計算できませんでした。'}`] };
        }
      }

      case 'js':
      case 'eval': {
        if (!args) return { lines: ['Usage: js <JavaScript expression> (例: js [1,2,3].map(x => x * x))'] };
        try {
          return { lines: evalJsExpression(args).split('\n') };
        } catch (err: unknown) {
          return { lines: [`Error: ${err instanceof Error ? err.message : '評価エラー'}`] };
        }
      }

      case 'json': {
        if (!args) return { lines: ['Usage: json <filename.json | JSON文字列>'] };
        try {
          const f = findVfsFile(loadVirtualFiles(), activeCwd, argTokens[0]);
          const raw = f ? f.content : args;
          const parsed = JSON.parse(raw);
          return { lines: JSON.stringify(parsed, null, 2).split('\n') };
        } catch (err: unknown) {
          return { lines: [`Error: Invalid JSON (${err instanceof Error ? err.message : ''})`] };
        }
      }

      case 'base64': {
        const sub = (argTokens[0] || '').toLowerCase();
        const payload = args.slice((argTokens[0] || '').length).trim();
        if (!payload || (sub !== 'enc' && sub !== 'encode' && sub !== 'dec' && sub !== 'decode')) {
          return { lines: ['Usage: base64 <enc|dec> <text>'] };
        }
        try {
          return {
            lines: [sub.startsWith('enc') ? utf8ToBase64(payload) : base64ToUtf8(payload)],
          };
        } catch {
          return { lines: ['Error: Base64 変換に失敗しました。'] };
        }
      }

      case 'hash': {
        if (!args) return { lines: ['Usage: hash <text>'] };
        return {
          lines: [],
          startAsync: async () => {
            try {
              const data = new TextEncoder().encode(args);
              const digest = await crypto.subtle.digest('SHA-256', data);
              const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
              appendLines([`SHA-256: ${hex}`, '']);
            } catch {
              appendLines(['Error: ハッシュ計算に失敗しました (HTTPS環境が必要です)。', '']);
            }
          },
        };
      }

      case 'uuid': {
        const id = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
              const r = (Math.random() * 16) | 0;
              return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
            });
        return { lines: [id] };
      }

      case 'genpass': {
        const len = Math.max(6, Math.min(64, parseInt(argTokens[0] || '16', 10) || 16));
        const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*-_';
        const rnd = new Uint32Array(len);
        crypto.getRandomValues(rnd);
        let pass = '';
        for (let i = 0; i < len; i++) pass += charset[rnd[i] % charset.length];
        return { lines: [`Generated (${len} chars): ${pass}`] };
      }

      case 'sprout': {
        if (!args) return { lines: ['Usage: sprout <file.sp> または sprout -e "<Sprout code>"'] };
        if (argTokens[0] === '-e') {
          const inline = args.slice(2).trim().replace(/^['"]|['"]$/g, '');
          if (!inline) return { lines: ['Usage: sprout -e "display(123)"'] };
          return {
            lines: [],
            startAsync: async () => runSproutProgram(inline.replace(/\\n/g, '\n'), 'inline'),
          };
        }
        const target = findVfsFile(loadVirtualFiles(), activeCwd, argTokens[0]);
        if (!target) return { lines: [`Error: Sproutファイルが見つかりません: "${argTokens[0]}"`] };
        return {
          lines: [],
          startAsync: async () => runSproutProgram(target.content, target.name),
        };
      }

      case 'cal': {
        const now = new Date();
        const y = argTokens[0] ? parseInt(argTokens[0], 10) : now.getFullYear();
        const m = argTokens[1] ? parseInt(argTokens[1], 10) : now.getMonth() + 1;
        if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
          return { lines: ['Usage: cal [year] [month(1-12)]'] };
        }
        return { lines: generateCalendarLines(y, m) };
      }

      case 'neofetch':
      case 'sysinfo': {
        const files = loadVirtualFiles();
        const totalChars = files.reduce((acc, f) => acc + (f.content?.length || 0), 0);
        const openCount = openWindows.filter(w => w.isOpen).length;
        const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || '?' : '?';
        const mem = typeof navigator !== 'undefined' && (navigator as unknown as { deviceMemory?: number }).deviceMemory
          ? `${(navigator as unknown as { deviceMemory?: number }).deviceMemory} GB`
          : 'N/A';
        const res = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A';
        return {
          lines: [
            '      █████╗ ██████╗  ██████╗ ██████╗ ██████╗     OS      : Abord OS 2027.2 WebOS',
            `     ██╔══██╗██╔══██╗██╔═══██╗██╔══██╗██╔══██╗    User    : ${settings?.username || 'User'}`,
            `     ███████║██████╔╝██║   ██║██████╔╝██║  ██║    Theme   : ${settings?.isDarkTheme ? 'Dark' : 'Light'} / CLI:${theme.id}`,
            `     ██╔══██║██╔══██╗██║   ██║██╔══██╗██╔══██╗    Windows : ${openCount} open`,
            `     ██║  ██║██████╔╝╚██████╔╝██║  ██║██████╔╝    CPU/Mem : ${cores} Threads / ${mem}`,
            `     ╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═════╝     Display : ${res}`,
            `                                                  Storage : ${files.length} files (${totalChars} chars)`,
          ],
        };
      }

      case 'ipconfig':
      case 'ifconfig': {
        const navConn = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; rtt?: number } }).connection;
        return {
          lines: [
            'Abord OS Network Configuration:',
            `  Online Status   : ${navigator.onLine ? 'Connected (Online)' : 'Offline'}`,
            `  Origin          : ${window.location.origin}`,
            `  WebSocket API   : ${window.location.protocol === 'https:' ? 'wss://' : 'ws://'}${window.location.host}/ws`,
            `  Connection Type : ${navConn?.effectiveType || 'unknown'}${navConn?.downlink ? ` (~${navConn.downlink} Mbps)` : ''}`,
            `  Estimated RTT   : ${navConn?.rtt !== undefined ? `${navConn.rtt} ms` : 'N/A'}`,
            `  User Agent      : ${navigator.userAgent.slice(0, 72)}...`,
          ],
        };
      }

      case 'ping': {
        const target = argTokens[0] || 'localhost';
        return {
          lines: [`PING ${target} — 4回計測を開始します...`],
          startAsync: async () => {
            const ctrl = new AbortController();
            abortRef.current = ctrl;
            setIsBusy(true);
            const isLocal = target === 'localhost' || target === '127.0.0.1' || target === 'server' || target.startsWith('/');
            const url = isLocal
              ? `${window.location.origin}/api/wetalks/rooms`
              : (target.startsWith('http://') || target.startsWith('https://') ? target : `https://${target}`);
            const times: number[] = [];
            let failed = 0;
            for (let i = 1; i <= 4; i++) {
              if (ctrl.signal.aborted) break;
              const t0 = performance.now();
              try {
                await fetch(url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
                  method: 'GET',
                  mode: isLocal ? 'cors' : 'no-cors',
                  cache: 'no-store',
                  signal: ctrl.signal,
                });
                const rtt = Math.max(1, Math.round(performance.now() - t0));
                times.push(rtt);
                appendLines([`  [${i}/4] Reply from ${target}: time=${rtt}ms`]);
              } catch (e: unknown) {
                if ((e as { name?: string })?.name === 'AbortError') break;
                failed++;
                appendLines([`  [${i}/4] Request timed out / unreachable (${target})`]);
              }
              if (i < 4 && !ctrl.signal.aborted) await new Promise(r => setTimeout(r, 250));
            }
            if (!ctrl.signal.aborted) {
              if (times.length > 0) {
                const min = Math.min(...times);
                const max = Math.max(...times);
                const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
                appendLines([`Ping statistics: Sent=4, Received=${times.length}, Lost=${failed} | min=${min}ms, avg=${avg}ms, max=${max}ms`, '']);
              } else {
                appendLines([`Ping failed: 応答がありませんでした。`, '']);
              }
            }
            setIsBusy(false);
            abortRef.current = null;
          },
        };
      }

      case 'curl':
      case 'fetch': {
        const showHeaders = argTokens.includes('-i');
        const target = argTokens.find(a => !a.startsWith('-'));
        if (!target) return { lines: [`Usage: ${command} [-i] <url | /api/...> (例: curl /api/custom-webs)`] };
        return {
          lines: [`Fetching ${target} ...`],
          startAsync: async () => {
            const ctrl = new AbortController();
            abortRef.current = ctrl;
            setIsBusy(true);
            const url = target.startsWith('/')
              ? window.location.origin + target
              : (target.startsWith('http://') || target.startsWith('https://') ? target : 'https://' + target);
            const t0 = performance.now();
            try {
              const res = await fetch(url, { signal: ctrl.signal });
              const elapsed = Math.round(performance.now() - t0);
              const out: string[] = [`HTTP ${res.status} ${res.statusText} (${elapsed}ms)`];
              if (showHeaders) {
                res.headers.forEach((v, k) => out.push(`  ${k}: ${v}`));
                out.push('');
              }
              const txt = await res.text();
              try {
                const pretty = JSON.stringify(JSON.parse(txt), null, 2);
                out.push(...pretty.split('\n').slice(0, 60));
                if (pretty.split('\n').length > 60) out.push('... (truncated)');
              } catch {
                out.push(...txt.split('\n').slice(0, 40));
              }
              appendLines([...out, '']);
            } catch (err: unknown) {
              if ((err as { name?: string })?.name !== 'AbortError') {
                appendLines([`Error: Fetch failed (${err instanceof Error ? err.message : 'CORSまたはネットワークエラー'})`, '']);
              }
            } finally {
              setIsBusy(false);
              abortRef.current = null;
            }
          },
        };
      }

      case 'weather': {
        const city = args || settings?.weatherCity || 'Tokyo';
        return {
          lines: [`天気情報を取得中: ${city} ...`],
          startAsync: async () => {
            const ctrl = new AbortController();
            abortRef.current = ctrl;
            setIsBusy(true);
            try {
              const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ja`,
                { signal: ctrl.signal }
              );
              const geo = await geoRes.json();
              const place = geo?.results?.[0];
              if (!place) {
                appendLines([`Error: 都市が見つかりません: "${city}"`, '']);
                return;
              }
              const wRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
                { signal: ctrl.signal }
              );
              const wData = await wRes.json();
              const cw = wData.current_weather;
              const label = WEATHER_CODE_LABELS[cw?.weathercode] || `天気コード ${cw?.weathercode}`;
              const maxT = wData?.daily?.temperature_2m_max?.[0];
              const minT = wData?.daily?.temperature_2m_min?.[0];
              appendLines([
                `📍 ${place.name}${place.country ? ` (${place.country})` : ''}`,
                `  天気     : ${label}`,
                `  現在気温 : ${cw?.temperature}°C   風速: ${cw?.windspeed} km/h`,
                maxT !== undefined && minT !== undefined ? `  最高/最低: ${maxT}°C / ${minT}°C` : '',
                '',
              ].filter(Boolean));
            } catch (err: unknown) {
              if ((err as { name?: string })?.name !== 'AbortError') {
                appendLines(['Error: 天気情報の取得に失敗しました。', '']);
              }
            } finally {
              setIsBusy(false);
              abortRef.current = null;
            }
          },
        };
      }

      case 'nmap':
        return { lines: simulateNmap(args) };

      case 'timer':
      case 'countdown': {
        const sec = parseInt(argTokens[0] || '', 10);
        if (!Number.isFinite(sec) || sec <= 0 || sec > 3600) {
          return { lines: ['Usage: timer <秒数(1〜3600)> [ラベル]'] };
        }
        const label = argTokens.slice(1).join(' ') || `${sec}秒タイマー`;
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        let remaining = sec;
        setActiveTimerLabel(`${label}: ${remaining}s`);
        timerIntervalRef.current = setInterval(() => {
          remaining--;
          if (remaining <= 0) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            setActiveTimerLabel(null);
            playBeep();
            if (onNotify) onNotify('ターミナル タイマー', `⏰ 「${label}」が完了しました！`);
            appendLines([`⏰ [Timer 完了] ${label} (${sec}秒)`, '']);
          } else {
            setActiveTimerLabel(`${label}: ${remaining}s`);
          }
        }, 1000);
        return { lines: [`⏱️ タイマー開始: "${label}" (${sec}秒後に通知します)`] };
      }

      case 'roll': {
        const spec = (argTokens[0] || '1d6').toLowerCase();
        const m = spec.match(/^(\d*)d(\d+)$/);
        if (!m) return { lines: ['Usage: roll [NdM] (例: roll 2d6, roll d20)'] };
        const count = Math.max(1, Math.min(50, parseInt(m[1] || '1', 10)));
        const sides = Math.max(2, Math.min(1000, parseInt(m[2], 10)));
        const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
        const total = rolls.reduce((a, b) => a + b, 0);
        return { lines: [`🎲 ${count}d${sides}: [${rolls.join(', ')}]  => 合計: ${total}`] };
      }

      case 'banner':
        return { lines: generateBanner(args || 'ABORD OS') };

      case 'matrix':
      case 'cmatrix':
        setMatrixMode(true);
        return { lines: ['Matrixモードを起動しました (Esc / Ctrl+C / クリックで終了)'] };

      case 'fortune':
        return { lines: [`💡 ${FORTUNES[Math.floor(Math.random() * FORTUNES.length)]}`] };

      case 'html':
      case 'msg':
      case 'net':
      case 'broadcast':
      case 'wall':
      case 'netsend': {
        let messageContent = args.trim();
        if (command === 'html') {
          if (messageContent.startsWith('*')) messageContent = messageContent.substring(1).trim();
        } else if (command === 'msg') {
          if (messageContent.startsWith('*')) messageContent = messageContent.substring(1).trim();
          else if (messageContent.toLowerCase().startsWith('/all')) messageContent = messageContent.substring(4).trim();
          else if (messageContent.toLowerCase().startsWith('/server:*')) messageContent = messageContent.substring(9).trim();
        } else if (command === 'net') {
          if (messageContent.toLowerCase().startsWith('send')) {
            messageContent = messageContent.substring(4).trim();
            if (messageContent.startsWith('*')) messageContent = messageContent.substring(1).trim();
          }
        }
        if (!messageContent) {
          return { lines: getHelpLines('admin') };
        }
        const timeStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        const title = `緊急管理者通知 (${timeStr})`;
        const isRawHtml = /<[a-z][\s\S]*>/i.test(messageContent) || command === 'html';
        const renderedContent = isRawHtml
          ? messageContent
          : messageContent.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />');
        const htmlBody = `<h1 style="color: #185abd; font-family: sans-serif; border-bottom: 2px solid #185abd; padding-bottom: 8px;">管理者メッセージ (コマンドプロンプト発信)</h1>
<p style="font-family: sans-serif; font-size: 14px; color: #333333; margin-top: 15px; line-height: 1.6;">
  本メッセージはシステム管理者より、コマンドプロンプト (CLI) 経由で全端末のユーザーへ向けて一斉配信された緊急通知です。
</p>
<div style="font-family: sans-serif; font-size: 14px; color: #333333; line-height: 1.6; background-color: #f3f6fc; padding: 12px; border-left: 4px solid #185abd; margin: 15px 0;">
  <strong>【送信メッセージ内容】</strong><br />
  ${renderedContent}
</div>
<p style="font-family: sans-serif; font-size: 12px; color: #666666; margin-top: 25px; text-align: right; border-top: 1px dashed #dddddd; padding-top: 10px;">
  配信日時: ${new Date().toLocaleString('ja-JP')}<br />
  発信源: システム管理者 Command Prompt CLI
</p>`;
        sendAdminBroadcastApi('システム管理者 (CLI)', title, htmlBody);
        return {
          lines: [
            '[管理者メッセージ一斉配信完了]',
            `  メッセージ (HTML適用): "${messageContent.substring(0, 80)}${messageContent.length > 80 ? '...' : ''}"`,
            '  配信対象: ネットワーク上のすべての端末ユーザー (*)',
            '  ステータス: 配信成功 (200 OK)',
          ],
        };
      }

      case 'aboad':
      case 'aboad-url':
      case 'set-aboad-url': {
        const currentAboadUrl = localStorage.getItem('aboad_git_url') || 'https://moozunobu.github.io/Abord-browser-ver2/';
        if (!args) {
          return {
            lines: [
              'Aboad Web App Git Configuration:',
              `  Current URL : ${currentAboadUrl}`,
              'Usage: aboad <url> | aboad set <url> | aboad reset',
            ],
          };
        }
        if (args.toLowerCase() === 'reset') {
          localStorage.removeItem('aboad_git_url');
          window.dispatchEvent(new Event('aboad_url_updated'));
          return { lines: ['Aboad App URL reset to default:', '  URL: https://moozunobu.github.io/Abord-browser-ver2/'] };
        }
        let target = args;
        if (target.toLowerCase().startsWith('set ')) target = target.slice(4).trim();
        else if (target.toLowerCase().startsWith('git ')) target = target.slice(4).trim();
        if (!target.startsWith('http://') && !target.startsWith('https://')) target = 'https://' + target;
        localStorage.setItem('aboad_git_url', target);
        window.dispatchEvent(new Event('aboad_url_updated'));
        return { lines: ['Successfully updated Aboad Web App URL!', `  New URL: ${target}`] };
      }

      case 'git': {
        const currentAboadUrl = localStorage.getItem('aboad_git_url') || 'https://moozunobu.github.io/Abord-browser-ver2/';
        const subCmd = argTokens[0]?.toLowerCase();
        const setGitUrl = (rawUrl: string) => {
          let target = rawUrl.trim();
          if (!target.startsWith('http://') && !target.startsWith('https://')) target = 'https://' + target;
          localStorage.setItem('aboad_git_url', target);
          window.dispatchEvent(new Event('aboad_url_updated'));
          return target;
        };
        if (!args) {
          return { lines: ['git version 2.41.0.windows.1', 'usage: git remote set-url origin <url> | git clone <url>'] };
        }
        if (subCmd === 'remote') {
          if (args.includes('-v')) {
            return { lines: [`origin  ${currentAboadUrl} (fetch)`, `origin  ${currentAboadUrl} (push)`] };
          }
          if (args.toLowerCase().includes('set-url')) {
            const urlMatch = argTokens[argTokens.length - 1];
            if (urlMatch && urlMatch.toLowerCase() !== 'set-url' && urlMatch.toLowerCase() !== 'origin') {
              const updated = setGitUrl(urlMatch);
              return { lines: [`Updated remote 'origin' URL to: ${updated}`, 'Aboad Web App target re-linked successfully.'] };
            }
            return { lines: ['Usage: git remote set-url origin <url>'] };
          }
          return { lines: [`origin  ${currentAboadUrl}`] };
        }
        if (subCmd === 'clone') {
          const cloneUrl = argTokens[1];
          if (!cloneUrl) return { lines: ['Usage: git clone <url>'] };
          const updated = setGitUrl(cloneUrl);
          return {
            lines: [
              `Cloning into 'Aboad'...`,
              `remote: Enumerating objects: 100%, done.`,
              `Receiving objects: 100% (142/142), done.`,
              `Aboad repository set to: ${updated}`,
            ],
          };
        }
        if (subCmd === 'config') {
          const configUrl = argTokens[argTokens.length - 1];
          if (configUrl && configUrl.toLowerCase() !== 'config') {
            const updated = setGitUrl(configUrl);
            return { lines: [`git config aboad.url set to: ${updated}`] };
          }
          return { lines: [`aboad.url=${currentAboadUrl}`] };
        }
        return { lines: [`git: '${subCmd}' is not a recognized git command.`, 'Try: git remote set-url origin <url>'] };
      }

      case 'ver':
      case 'version':
      case 'winver':
        return {
          lines: [
            'Abord2027.2 Web OS [Version 2027.01.29]',
            'Copyright (C) 2027 Abord Corporation. All rights reserved.',
          ],
        };

      case 'os':
      case 'select-os':
      case 'os-select':
      case 'os_version':
      case 'os-version': {
        const found = args ? findOSVersion(args) : undefined;
        if (found) {
          executeOsRedirect(found.url);
          return { lines: [`Selected ${found.name}.`, `Redirecting to ${found.url} ...`] };
        }
        setOsPromptState(true);
        return { lines: OS_VERSIONS.map((o, idx) => `${idx + 1}. ${o.name}`) };
      }

      case 'date':
        return { lines: [new Date().toLocaleString('ja-JP') + ' (' + new Date().toISOString() + ')'] };

      case 'echo':
        return { lines: [args || ''] };

      case 'redirect':
      case 'seturl':
      case 'churl': {
        if (!argTokens[0]) return { lines: [`Usage: ${command} <https://new-url>`] };
        const rawTarget = argTokens[0].trim();
        const url = /^https?:\/\//i.test(rawTarget) ? rawTarget : `https://${rawTarget}`;
        executeOsRedirect(url);
        return { lines: [`WebOSのURLを変更しています: ${url}`, '移動中...'] };
      }

      case 'bat':
      case 'call': {
        if (!argTokens[0]) return { lines: [`Usage: ${command} <script.bat> [args...]`] };
        const target = findVfsFile(loadVirtualFiles(), activeCwd, argTokens[0]);
        if (!target) return { lines: [`Error: バッチファイルが見つかりません: "${argTokens[0]}"`] };
        const passArgs = argTokens.slice(1);
        return {
          lines: [],
          startAsync: async () => runBatProgram(target.content, target.name, passArgs),
        };
      }

      case 'mkbat': {
        if (argTokens.length < 2) {
          return { lines: ['Usage: mkbat <file.bat> <url> [both|redirect|aboad|browser]'] };
        }
        let fname = argTokens[0];
        if (!/\.(bat|cmd)$/i.test(fname)) fname += '.bat';
        const urlArg = argTokens[1];
        const modeArg = (argTokens[2] || 'both').toLowerCase() as BatUrlMode;
        const mode: BatUrlMode = ['redirect', 'aboad', 'browser', 'both'].includes(modeArg) ? modeArg : 'both';
        const existing = findVfsFile(loadVirtualFiles(), activeCwd, fname);
        const generated = injectUrlProgramIntoBat(existing?.content || '', urlArg, mode);
        const saved = writeFileContent(fname, generated, 'write');
        return {
          lines: [
            `[URL変更プログラム付き .bat 生成完了]`,
            `  ファイル : ${fname}`,
            `  モード   : ${mode} (${urlArg})`,
            `  結果     : ${saved.message}`,
            `  実行方法 : ${fname}  または  sudo sendbat ${fname}`,
          ],
        };
      }

      case 'sendbat': {
        if (!argTokens[0]) {
          return {
            lines: [
              'Usage: sudo sendbat <file.bat> [--url <new_url>] [--mode <both|redirect|aboad|browser>] [--autorun] [--to <username>]',
              '例: sudo sendbat update.bat --url https://example.com --mode both --autorun',
            ],
          };
        }
        const fileSpec = argTokens[0];
        let injectUrl = '';
        let mode: BatUrlMode = 'both';
        let autoRunFlag = false;
        let targetUser = '*';

        for (let i = 1; i < argTokens.length; i++) {
          const tok = argTokens[i];
          const low = tok.toLowerCase();
          if (low === '--url' && argTokens[i + 1]) {
            injectUrl = argTokens[++i];
          } else if (low === '--mode' && argTokens[i + 1]) {
            const m = argTokens[++i].toLowerCase() as BatUrlMode;
            if (['redirect', 'aboad', 'browser', 'both'].includes(m)) mode = m;
          } else if (low === '--autorun') {
            autoRunFlag = true;
          } else if (low === '--to' && argTokens[i + 1]) {
            targetUser = argTokens[++i];
          }
        }

        const existing = findVfsFile(loadVirtualFiles(), activeCwd, fileSpec);
        let codeToSend = existing?.content || '';
        const cleanName = existing?.name || (/\.(bat|cmd)$/i.test(fileSpec) ? fileSpec : `${fileSpec}.bat`);

        if (!existing && !injectUrl) {
          return { lines: [`Error: ファイルが見つかりません: "${fileSpec}" (--url を指定すると新規生成して送信できます)`] };
        }
        if (injectUrl) {
          codeToSend = injectUrlProgramIntoBat(codeToSend, injectUrl, mode);
        }

        return {
          lines: [`[Admin] .bat スクリプトを送信しています: ${cleanName} ...`],
          startAsync: async () => {
            const ok = await sendAdminBroadcastApi(
              settings?.username ? `管理者 (${settings.username})` : 'システム管理者 (sudo)',
              cleanName,
              injectUrl ? `URL変更プログラム自動挿入済み (${injectUrl})` : '管理者から .bat スクリプトが送信されました',
              {
                kind: 'bat',
                batFilename: cleanName,
                batCode: codeToSend,
                autoRun: autoRunFlag,
                targetUser,
              }
            );
            if (ok) {
              appendLines([
                '[.bat ファイル配信成功]',
                `  ファイル名   : ${cleanName}`,
                `  配信先       : ${targetUser === '*' ? 'すべての他ユーザー (*)' : targetUser}`,
                `  URL変更自動挿入 : ${injectUrl ? `あり (${injectUrl} / ${mode})` : 'なし'}`,
                `  自動実行     : ${autoRunFlag ? 'ON' : 'OFF'}`,
                '',
              ]);
            } else {
              appendLines(['Error: .bat ファイルの配信に失敗しました。', '']);
            }
          },
        };
      }

      default: {
        // Direct execution of .bat / .cmd files by filename (e.g. `test.bat arg1` or `Downloads\update.bat`)
        if (command.endsWith('.bat') || command.endsWith('.cmd') || /^[a-z0-9_\\/-]+\.(bat|cmd)$/i.test(tokens[0] || '')) {
          const vfsBat = findVfsFile(loadVirtualFiles(), activeCwd, tokens[0]);
          if (vfsBat) {
            return {
              lines: [],
              startAsync: async () => runBatProgram(vfsBat.content, vfsBat.name, argTokens),
            };
          }
        }
        const directMatch = findOSVersion(command);
        if (directMatch) {
          executeOsRedirect(directMatch.url);
          return { lines: [`Selected ${directMatch.name}.`, `Redirecting to ${directMatch.url} ...`] };
        }
        return {
          lines: [
            `Error: '${command}' is not recognized as an internal or external command.`,
            'Type "help" to see available commands.',
          ],
        };
      }
    }
  };

  const handleCommand = async (rawCmdStr: string) => {
    let trimmed = rawCmdStr.trim();
    if (!trimmed) {
      appendLines([promptPrefix]);
      return;
    }

    // History expansion (!n or !!)
    if (trimmed === '!!' && commandHistory.length > 0) {
      trimmed = commandHistory[commandHistory.length - 1];
    } else if (/^!\d+$/.test(trimmed)) {
      const idx = parseInt(trimmed.slice(1), 10) - 1;
      if (commandHistory[idx]) {
        trimmed = commandHistory[idx];
      } else {
        appendLines([`${promptPrefix}${trimmed}`, `Error: 履歴 #${idx + 1} が見つかりません。`, '']);
        setInputValue('');
        return;
      }
    }

    const nextHist = [...commandHistory, trimmed];
    setCommandHistory(nextHist);
    setHistoryPointer(nextHist.length);
    setInputValue('');

    appendLines([`${promptPrefix}${trimmed}`]);

    const chain = splitCommandChain(trimmed);
    const asyncTasks: Array<() => Promise<void>> = [];

    for (const chainedCmd of chain) {
      const { cleanCmd, redirect } = extractRedirection(chainedCmd);
      const pipeSegments = splitPipes(cleanCmd);
      if (pipeSegments.length === 0) continue;

      const firstRes = await runSingleSegment(pipeSegments[0]);
      if (firstRes.clearScreen) {
        setHistory([]);
        continue;
      }
      if (firstRes.enterPanel) {
        appendLines([...firstRes.lines, '']);
        setAdminState('authorized');
        return;
      }
      if (firstRes.startAsync) {
        if (firstRes.lines.length > 0) appendLines(firstRes.lines);
        asyncTasks.push(firstRes.startAsync);
        continue;
      }

      let currentLines = firstRes.lines;
      for (let p = 1; p < pipeSegments.length; p++) {
        currentLines = applyPipeFilter(currentLines, pipeSegments[p]);
      }

      if (redirect) {
        const res = writeFileContent(redirect.file, currentLines.join('\n'), redirect.mode);
        appendLines([res.message]);
      } else if (currentLines.length > 0) {
        appendLines(currentLines);
      }
    }

    if (asyncTasks.length > 0) {
      for (const task of asyncTasks) {
        await task();
      }
    } else {
      appendLines(['']);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (sproutPromptLabel !== null && sproutInputResolveRef.current) {
      const val = inputValue;
      appendLines([`${sproutPromptLabel} ${val}`]);
      setInputValue('');
      const resolve = sproutInputResolveRef.current;
      sproutInputResolveRef.current = null;
      setSproutPromptLabel(null);
      resolve(val);
      return;
    }

    if (adminState === 'password_prompt') {
      const passwordInput = inputValue.trim().replace(/\s+/g, ' ');
      if (passwordInput === 'mozunbu1203' || passwordInput === 'sudo mozunbu1203') {
        setAdminState('authorized');
        appendLines([
          '******',
          'Authenticating administrative session...',
          'Status: Privilege Level 0 granted.',
          'Initializing Admin Broadcast Console...',
          '',
        ]);
      } else {
        setAdminState('none');
        appendLines(['******', 'Access Denied: Incorrect administrator password.', '']);
      }
      setInputValue('');
      return;
    }

    if (osPromptState) {
      const match = findOSVersion(inputValue);
      setOsPromptState(false);
      if (match) {
        appendLines([`select os version : ${inputValue}`, `Selected ${match.name}. Redirecting to ${match.url} ...`, '']);
        executeOsRedirect(match.url);
      } else {
        appendLines([`select os version : ${inputValue}`, 'Invalid selection. Cancelled OS version selection.', '']);
      }
      setInputValue('');
      return;
    }

    if (isBusy) return;
    handleCommand(inputValue);
  };

  const handleTabComplete = () => {
    const val = inputValue;
    const parts = val.split(/\s+/);
    if (parts.length <= 1) {
      const prefix = (parts[0] || '').toLowerCase();
      const candidates = Array.from(new Set([...ALL_TERMINAL_COMMANDS, ...Object.keys(aliases)]))
        .filter(c => c.startsWith(prefix))
        .sort();
      if (candidates.length === 1) {
        setInputValue(candidates[0] + ' ');
      } else if (candidates.length > 1) {
        appendLines([`${promptPrefix}${val}`, candidates.slice(0, 24).join('   '), '']);
      }
      return;
    }

    const lastPart = parts[parts.length - 1];
    const lowerLast = lastPart.toLowerCase();
    const files = loadVirtualFiles();
    const dirs = getAllDirs(files);
    const localFiles = cwd
      ? files.filter(f => f.path.toLowerCase() === cwd.toLowerCase()).map(f => f.name)
      : files.map(f => f.name);
    const pool = Array.from(new Set([...dirs, ...localFiles]));
    const matches = pool.filter(name => name.toLowerCase().startsWith(lowerLast)).sort();
    if (matches.length === 1) {
      parts[parts.length - 1] = matches[0];
      setInputValue(parts.join(' '));
    } else if (matches.length > 1) {
      appendLines([`${promptPrefix}${val}`, matches.slice(0, 20).join('   '), '']);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      setHistory([]);
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      cancelRunningTask();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabComplete();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyPointer > 0) {
        const nextPointer = historyPointer - 1;
        setHistoryPointer(nextPointer);
        setInputValue(commandHistory[nextPointer]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyPointer < commandHistory.length - 1) {
        const nextPointer = historyPointer + 1;
        setHistoryPointer(nextPointer);
        setInputValue(commandHistory[nextPointer]);
      } else {
        setHistoryPointer(commandHistory.length);
        setInputValue('');
      }
    }
  };

  // Render Admin Broadcast Panel when authorized
  if (adminState === 'authorized') {
    const savedBatFiles = loadVirtualFiles().filter(f => /\.(bat|cmd)$/i.test(f.name));
    return (
      <div
        className="flex flex-col h-full bg-[#070b12] text-zinc-200 font-sans p-4 sm:p-5 overflow-y-auto select-none"
        id="admin-broadcast-panel"
      >
        <div className="border-b border-zinc-800 pb-3 mb-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                WebOS Admin Broadcast Console (sudo)
              </h2>
              <p className="text-[10px] text-zinc-400 font-mono">
                Domain Admin Session (Privilege Level: 0)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-900 border border-zinc-800 rounded p-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setAdminTab('bat')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  adminTab === 'bat' ? 'bg-amber-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                .bat 配信 &amp; URL変更挿入
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('docx')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  adminTab === 'docx' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Word通知 (.docx)
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setAdminState('none');
                appendLines(['Returned to standard shell session.', '']);
              }}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 rounded font-mono transition-colors border border-zinc-700 cursor-pointer"
            >
              EXIT ADMIN
            </button>
          </div>
        </div>

        {adminTab === 'bat' ? (
          <div className="bg-zinc-950/50 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">
                  保存済み .bat を読み込む
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    const f = savedBatFiles.find(x => `${x.path}\\${x.name}` === e.target.value);
                    if (f) {
                      setBatFilename(f.name);
                      setBatCode(f.content);
                    }
                  }}
                  className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- 既存 .bat から選択 ({savedBatFiles.length}) --</option>
                  {savedBatFiles.map(f => (
                    <option key={`${f.path}\\${f.name}`} value={`${f.path}\\${f.name}`}>
                      {f.path}\{f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">
                  配信ファイル名 (.bat)
                </label>
                <input
                  type="text"
                  value={batFilename}
                  onChange={(e) => setBatFilename(e.target.value)}
                  placeholder="update_url.bat"
                  className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">
                  宛先ユーザー (* = 全員)
                </label>
                <input
                  type="text"
                  value={batTargetUser}
                  onChange={(e) => setBatTargetUser(e.target.value)}
                  placeholder="* または ユーザー名"
                  className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Auto URL-Change Program Injection Box */}
            <div className="bg-amber-950/20 border border-amber-700/40 rounded-lg p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-amber-300 font-mono">
                  URL変更プログラム自動挿入 (sudo URL-Injector)
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batAutoInjectUrl}
                    onChange={(e) => setBatAutoInjectUrl(e.target.checked)}
                    className="accent-amber-500"
                  />
                  送信時に新しいURL変更プログラムを自動挿入
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={batNewUrl}
                  onChange={(e) => setBatNewUrl(e.target.value)}
                  placeholder="https://new-site-url.example.com"
                  className="sm:col-span-2 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:outline-none focus:border-amber-500"
                />
                <select
                  value={batUrlMode}
                  onChange={(e) => setBatUrlMode(e.target.value as BatUrlMode)}
                  className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                >
                  <option value="both">Aboad変更 + WebOSリダイレクト</option>
                  <option value="redirect">WebOS自体を新URLへリダイレクト</option>
                  <option value="aboad">Aboad WebアプリのURLを変更</option>
                  <option value="browser">ブラウザタブで新URLを開く</option>
                </select>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batAutoRun}
                    onChange={(e) => setBatAutoRun(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  受信ユーザーの端末で即座に自動実行 (Auto-Run)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!batNewUrl.trim()) return;
                    setBatCode(prev => injectUrlProgramIntoBat(prev, batNewUrl, batUrlMode));
                  }}
                  className="px-3 py-1 bg-amber-600/80 hover:bg-amber-500 text-white rounded text-[11px] font-mono font-bold transition-colors cursor-pointer"
                >
                  今すぐコードに挿入プレビュー
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono flex items-center justify-between">
                <span>Windows Batch Script (.bat)</span>
                <span className="text-[9px] font-normal text-zinc-500">
                  @echo off / SET / IF / FOR / GOTO / CALL / START / redirect / aboad 対応
                </span>
              </label>
              <textarea
                value={batCode}
                onChange={(e) => setBatCode(e.target.value)}
                rows={9}
                spellCheck={false}
                className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
              />
            </div>

            {broadcastSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-800/80 text-emerald-400 px-3 py-2 rounded text-xs">
                {broadcastSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  const cleanName = /\.(bat|cmd)$/i.test(batFilename.trim()) ? batFilename.trim() : `${batFilename.trim() || 'script'}.bat`;
                  const finalCode = batAutoInjectUrl && batNewUrl.trim()
                    ? injectUrlProgramIntoBat(batCode, batNewUrl, batUrlMode)
                    : batCode;
                  setBatCode(finalCode);
                  const res = writeFileContent(cleanName, finalCode, 'write');
                  setBroadcastSuccess(res.message);
                  setTimeout(() => setBroadcastSuccess(null), 4000);
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold py-2.5 px-3 rounded border border-zinc-700 cursor-pointer"
              >
                ローカルに保存 (.bat)
              </button>
              <button
                type="button"
                onClick={() => {
                  const cleanName = /\.(bat|cmd)$/i.test(batFilename.trim()) ? batFilename.trim() : `${batFilename.trim() || 'script'}.bat`;
                  const finalCode = batAutoInjectUrl && batNewUrl.trim()
                    ? injectUrlProgramIntoBat(batCode, batNewUrl, batUrlMode)
                    : batCode;
                  setAdminState('none');
                  runBatProgram(finalCode, cleanName, []);
                }}
                className="bg-blue-700 hover:bg-blue-600 text-white font-mono text-xs font-bold py-2.5 px-3 rounded cursor-pointer"
              >
                この端末でテスト実行
              </button>
              <button
                type="button"
                onClick={async () => {
                  const cleanName = /\.(bat|cmd)$/i.test(batFilename.trim()) ? batFilename.trim() : `${batFilename.trim() || 'update_url'}.bat`;
                  const finalCode = batAutoInjectUrl && batNewUrl.trim()
                    ? injectUrlProgramIntoBat(batCode, batNewUrl, batUrlMode)
                    : batCode;
                  setBatCode(finalCode);
                  const ok = await sendAdminBroadcastApi(
                    adminSender || 'システム管理者',
                    cleanName,
                    batAutoInjectUrl && batNewUrl.trim()
                      ? `URL変更プログラム自動挿入済み (${batNewUrl.trim()})`
                      : '管理者から .bat ファイルが送信されました',
                    {
                      kind: 'bat',
                      batFilename: cleanName,
                      batCode: finalCode,
                      autoRun: batAutoRun,
                      targetUser: batTargetUser.trim() || '*',
                    }
                  );
                  if (ok) {
                    setBroadcastSuccess(
                      `配信成功: ${cleanName} を ${batTargetUser.trim() || '*'} へ送信しました` +
                      (batAutoInjectUrl && batNewUrl.trim() ? ` (URL自動挿入: ${batNewUrl.trim()})` : '')
                    );
                    setTimeout(() => setBroadcastSuccess(null), 5000);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold py-2.5 px-3 rounded cursor-pointer shadow-md"
              >
                他ユーザーへ .bat を送信
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-950/40 border border-zinc-800 p-4 rounded-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">
                  Document Title (docx title)
                </label>
                <input
                  type="text"
                  value={adminTitle}
                  onChange={(e) => setAdminTitle(e.target.value)}
                  placeholder="e.g. 重要指示事項"
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">
                  Sender Signature (差出人)
                </label>
                <input
                  type="text"
                  value={adminSender}
                  onChange={(e) => setAdminSender(e.target.value)}
                  placeholder="e.g. システム管理者"
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono flex items-center justify-between">
                <span>Message Body (HTML format for Microsoft Word Editor)</span>
                <span className="text-[9px] lowercase font-normal opacity-40">renders inside WordApp view</span>
              </label>
              <textarea
                value={adminBody}
                onChange={(e) => setAdminBody(e.target.value)}
                rows={9}
                className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono resize-none leading-relaxed"
              />
            </div>

            {broadcastSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-800/80 text-emerald-400 px-4 py-2.5 rounded text-xs">
                {broadcastSuccess}
              </div>
            )}

            <button
              type="button"
              onClick={async () => {
                const ok = await sendAdminBroadcastApi(adminSender, adminTitle + '.docx', adminBody, { kind: 'docx' });
                if (ok) {
                  setBroadcastSuccess('ブロードキャスト成功! 全ユーザーへWordメッセージ通知を送信しました。');
                  setTimeout(() => setBroadcastSuccess(null), 4000);
                }
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-mono text-xs font-bold py-2.5 px-4 rounded transition-all duration-150 uppercase tracking-wider mt-1 shadow-md cursor-pointer"
            >
              Broadcast Message (Deliver as Word docx)
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={focusInput}
      className="relative flex flex-col h-full font-mono text-xs sm:text-sm overflow-hidden select-all"
      style={{ backgroundColor: theme.bg, color: theme.text }}
      id="terminal-app"
    >
      {/* Compact Header Toolbar */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-1.5 border-b text-[11px] shrink-0 select-none"
        style={{ borderColor: theme.border, backgroundColor: 'rgba(0,0,0,0.28)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold truncate" style={{ color: theme.path }}>
            {cwd ? `C:\\${cwd.replace(/\//g, '\\')}` : 'C:\\'}
          </span>
          {windowTitle && (
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-200 text-[10px] truncate max-w-[160px]">
              {windowTitle}
            </span>
          )}
          {activeTimerLabel && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
              ⏱ {activeTimerLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isBusy && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); cancelRunningTask(); }}
              className="px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-500 text-white text-[10px] font-sans font-semibold cursor-pointer"
            >
              中断 (Ctrl+C)
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleCommand('help'); }}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[10px] font-sans cursor-pointer"
          >
            help
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleCommand('neofetch'); }}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[10px] font-sans cursor-pointer"
          >
            neofetch
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setHistory([]); focusInput(); }}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[10px] font-sans cursor-pointer"
          >
            clear
          </button>
        </div>
      </div>

      {/* Matrix Mode Overlay */}
      {matrixMode && (
        <div
          className="absolute inset-0 z-20 cursor-pointer flex flex-col items-end p-3"
          onClick={() => { setMatrixMode(false); setTimeout(focusInput, 40); }}
        >
          <canvas ref={matrixCanvasRef} className="absolute inset-0 w-full h-full" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMatrixMode(false); setTimeout(focusInput, 40); }}
            className="relative z-30 px-2.5 py-1 rounded bg-black/70 border border-emerald-500/60 text-emerald-300 text-[11px] font-sans hover:bg-emerald-950/80"
          >
            終了 (Esc / Ctrl+C / Click)
          </button>
        </div>
      )}

      {/* Output Console Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-0.5 p-3 sm:p-4 pr-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {history.map((line, i) => {
          const isPromptLine = line.startsWith('C:\\Users\\WebOS');
          const gtIdx = isPromptLine ? line.indexOf('>') : -1;
          return (
            <div key={i} className="whitespace-pre-wrap leading-relaxed min-h-[1.2rem]">
              {isPromptLine && gtIdx !== -1 ? (
                <span>
                  <span style={{ color: theme.prompt }}>{line.slice(0, gtIdx + 1)}</span>
                  {line.slice(gtIdx + 1)}
                </span>
              ) : line.startsWith('Error:') || line.includes('Access Denied:') ? (
                <span className="text-red-400">{line}</span>
              ) : line.startsWith('[') || line.startsWith('Supported CLI') ? (
                <span style={{ color: theme.accent }}>{line}</span>
              ) : line.includes('成功') || line.includes('granted.') || line.includes('完了') || line.includes('起動しました') ? (
                <span className="text-emerald-400">{line}</span>
              ) : (
                line
              )}
            </div>
          );
        })}

        {/* Active Prompt Input Line */}
        <div className="flex items-center min-h-[1.35rem] pt-0.5">
          <span className="mr-1.5 shrink-0" style={{ color: theme.prompt }}>
            {sproutPromptLabel !== null
              ? `${sproutPromptLabel} `
              : adminState === 'password_prompt'
              ? 'Enter Password: '
              : osPromptState
              ? 'select os version : '
              : promptPrefix}
          </span>
          <form onSubmit={handleSubmit} className="flex-1 flex items-center">
            <input
              ref={inputRef}
              type={adminState === 'password_prompt' ? 'password' : 'text'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isBusy && sproutPromptLabel === null}
              placeholder={isBusy && sproutPromptLabel === null ? '実行中... (Ctrl+C で中断)' : ''}
              className="flex-1 bg-transparent border-none outline-none p-0 font-mono text-xs sm:text-sm select-all"
              style={{ color: theme.text }}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              id="terminal-cli-input"
            />
            <button
              type="submit"
              className="ml-2 px-2.5 py-0.5 bg-white/10 hover:bg-white/20 text-[10px] font-sans font-semibold rounded border border-white/15 transition cursor-pointer shrink-0"
              style={{ color: theme.prompt }}
              title="実行"
            >
              実行
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
