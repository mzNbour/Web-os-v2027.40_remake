import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, ExternalLink, Maximize2, Globe, Keyboard, AlertTriangle } from 'lucide-react';
import { normalizeCustomWebUrl } from '../../utils/customWebUrl';

interface WebGameFrameAppProps {
  url: string;
  title: string;
  accentColor?: 'red' | 'amber' | 'sky' | 'emerald';
  loadingText?: string;
  windowId?: string;
  isWindowActive?: boolean;
}

export const WebGameFrameApp: React.FC<WebGameFrameAppProps> = ({
  url,
  title,
  accentColor = 'sky',
  loadingText = 'Loading app...',
  windowId,
  isWindowActive = true,
}) => {
  const normalizedUrl = useMemo(() => normalizeCustomWebUrl(url), [url]);
  const isInvalidUrl = !normalizedUrl || normalizedUrl === 'about:blank' || !/^https?:\/\//i.test(normalizedUrl);

  const [iframeKey, setIframeKey] = useState<number>(0);
  const [reloadNonce, setReloadNonce] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(!isInvalidUrl);
  const [loadTimedOut, setLoadTimedOut] = useState<boolean>(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(
    isInvalidUrl ? 'アプリURLが見つからないか無効です。Aboard Store から再追加してください。' : null
  );
  const [forceEmbed, setForceEmbed] = useState<boolean>(false);
  const [isIframeFocused, setIsIframeFocused] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const effectiveSrc = useMemo(() => {
    if (isInvalidUrl) return 'about:blank';
    if (reloadNonce === 0) return normalizedUrl;
    const sep = normalizedUrl.includes('?') ? '&' : '?';
    return `${normalizedUrl}${sep}_abord_reload=${reloadNonce}`;
  }, [isInvalidUrl, normalizedUrl, reloadNonce]);

  const focusIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      iframe.focus({ preventScroll: true });
      iframe.contentWindow?.focus();
    } catch {
      // Cross-origin frame may reject contentWindow.focus; element focus still routes key events
    }
    setIsIframeFocused(document.activeElement === iframe);
  }, []);

  useEffect(() => {
    if (isInvalidUrl) {
      setIsLoading(false);
      setLoadTimedOut(false);
      setBlockedReason('アプリURLが見つからないか無効です。Aboard Store から再追加してください。');
      return;
    }

    setIsLoading(true);
    setLoadTimedOut(false);
    setBlockedReason(null);
    setForceEmbed(false);

    const isStaticHost =
      typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io');

    const controller = new AbortController();
    if (!isStaticHost && typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
      fetch(`/api/custom-web/check?url=${encodeURIComponent(normalizedUrl)}`, {
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.blocked && data.reason) {
            setBlockedReason(data.reason);
            setIsLoading(false);
          }
        })
        .catch(() => {
          // Ignore preflight network errors so offline / static hosts keep working
        });
    }

    const fallbackTimer = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) setLoadTimedOut(true);
        return false;
      });
    }, 6500);

    return () => {
      controller.abort();
      clearTimeout(fallbackTimer);
    };
  }, [iframeKey, normalizedUrl, isInvalidUrl]);

  useEffect(() => {
    if (!isWindowActive) {
      setIsIframeFocused(false);
      return;
    }
    const raf = requestAnimationFrame(() => focusIframe());
    const t = setTimeout(() => focusIframe(), 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [isWindowActive, iframeKey, normalizedUrl, focusIframe]);

  useEffect(() => {
    const syncFocusState = () => {
      setIsIframeFocused(Boolean(iframeRef.current && document.activeElement === iframeRef.current));
    };
    const handleSettled = (e: Event) => {
      const ce = e as CustomEvent<{ id?: string }>;
      if (!windowId || ce.detail?.id === windowId) {
        setTimeout(focusIframe, 20);
      }
    };
    const handleParentFocus = () => {
      if (isWindowActive) {
        setTimeout(focusIframe, 20);
      }
    };
    document.addEventListener('focusin', syncFocusState);
    window.addEventListener('webos_window_focus_settled', handleSettled);
    window.addEventListener('focus', handleParentFocus);
    window.addEventListener('blur', syncFocusState);
    return () => {
      document.removeEventListener('focusin', syncFocusState);
      window.removeEventListener('webos_window_focus_settled', handleSettled);
      window.removeEventListener('focus', handleParentFocus);
      window.removeEventListener('blur', syncFocusState);
    };
  }, [windowId, isWindowActive, focusIframe]);

  const handleReload = () => {
    if (isInvalidUrl) return;
    setBlockedReason(null);
    setForceEmbed(false);
    setLoadTimedOut(false);
    setIsLoading(true);
    setReloadNonce((n) => n + 1);
    setIframeKey((prev) => prev + 1);
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else {
        containerRef.current.requestFullscreen?.().then(() => {
          setTimeout(focusIframe, 50);
        }).catch(() => {});
      }
    }
  };

  const accentClasses = {
    red: {
      icon: 'text-rose-400',
      spinner: 'border-rose-500',
    },
    amber: {
      icon: 'text-amber-400',
      spinner: 'border-amber-500',
    },
    sky: {
      icon: 'text-sky-400',
      spinner: 'border-sky-500',
    },
    emerald: {
      icon: 'text-emerald-400',
      spinner: 'border-emerald-500',
    },
  }[accentColor];

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col bg-zinc-950 text-zinc-100 select-none overflow-hidden relative"
      onKeyDown={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Top Utility Bar */}
      <div className="h-8 bg-zinc-900 border-b border-zinc-800 px-3 flex items-center justify-between text-xs shrink-0 select-none z-10">
        <div className="flex items-center gap-2 text-zinc-400 min-w-0">
          <Globe className={`w-3.5 h-3.5 shrink-0 ${accentClasses.icon}`} />
          <span className="font-mono text-[11px] text-zinc-300 truncate max-w-[220px] sm:max-w-md">
            {normalizedUrl || 'about:blank'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={focusIframe}
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
              isIframeFocused
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700'
            }`}
            title="クリックしてキーボード操作をこのアプリにフォーカス (Focus Keyboard)"
          >
            <Keyboard className="w-3 h-3" />
            <span className="hidden sm:inline">{isIframeFocused ? 'キー入力有効' : 'キー有効化'}</span>
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleReload}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title="再読み込み (Reload)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleFullscreen}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title="フルスクリーン (Fullscreen)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {!isInvalidUrl && (
            <a
              href={normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors flex items-center justify-center"
              title="新しいタブで開く (Open in New Tab)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 top-8 bg-zinc-950/90 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className={`w-8 h-8 border-2 ${accentClasses.spinner} border-t-transparent rounded-full animate-spin`} />
          <div className="text-xs text-zinc-400 font-mono">{loadingText}</div>
        </div>
      )}

      {/* Blocked / Error Recovery Overlay */}
      {(blockedReason && !forceEmbed) ? (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-950 gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-sm font-bold text-white">{title} を読み込めませんでした</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{blockedReason}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {!isInvalidUrl && (
              <>
                <button
                  type="button"
                  onClick={handleReload}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  再読み込み
                </button>
                <a
                  href={normalizedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  新しいタブで開く
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setForceEmbed(true);
                    setIsLoading(true);
                  }}
                  className="px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs font-medium cursor-pointer whitespace-nowrap"
                >
                  このまま表示を試す
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Embedded Web App iframe */
        <div
          className="flex-1 w-full h-full relative bg-black"
          onPointerDown={() => {
            setTimeout(focusIframe, 10);
          }}
        >
          {loadTimedOut && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/95 border border-zinc-700 rounded-xl px-3.5 py-2 flex items-center gap-3 text-xs shadow-xl">
              <span className="text-zinc-300 whitespace-nowrap">読み込みに時間がかかっていますか？</span>
              <button
                type="button"
                onClick={handleReload}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] whitespace-nowrap cursor-pointer"
              >
                再読み込み
              </button>
              <a
                href={normalizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[11px] whitespace-nowrap"
              >
                別タブで開く
              </a>
              <button
                type="button"
                onClick={() => setLoadTimedOut(false)}
                className="text-zinc-400 hover:text-white px-1 cursor-pointer"
                title="閉じる"
              >
                ×
              </button>
            </div>
          )}
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={effectiveSrc}
            title={title}
            tabIndex={0}
            className="w-full h-full border-none outline-none"
            allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write; pointer-lock; accelerometer; gyroscope"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => {
              setIsLoading(false);
              setLoadTimedOut(false);
              if (isWindowActive) {
                requestAnimationFrame(() => focusIframe());
                setTimeout(focusIframe, 60);
              }
            }}
            onError={() => {
              setIsLoading(false);
              setBlockedReason('外部サイトの読み込み中にエラーが発生しました。');
            }}
          />
        </div>
      )}
    </div>
  );
};
