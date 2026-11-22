import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink, Maximize2, Globe, Keyboard } from 'lucide-react';

const MINECRAFT_CLIENT_URL = 'https://moozunobu.github.io/my-minecraft-web-client/';

interface MinecraftAppProps {
  windowId?: string;
  isWindowActive?: boolean;
}

export const MinecraftApp: React.FC<MinecraftAppProps> = ({
  windowId,
  isWindowActive = true,
}) => {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isIframeFocused, setIsIframeFocused] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const focusIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      iframe.focus({ preventScroll: true });
      iframe.contentWindow?.focus();
    } catch {
      // Cross-origin frame
    }
    setIsIframeFocused(document.activeElement === iframe);
  }, []);

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
  }, [isWindowActive, iframeKey, focusIframe]);

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
    setIsLoading(true);
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

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col bg-zinc-950 text-zinc-100 select-none overflow-hidden relative"
      onKeyDown={(e) => {
        // Prevent key events inside Minecraft from bubbling to OS shortcuts
        e.stopPropagation();
      }}
    >
      {/* Top Utility Bar */}
      <div className="h-8 bg-zinc-900 border-b border-zinc-800 px-3 flex items-center justify-between text-xs shrink-0 select-none z-10">
        <div className="flex items-center gap-2 text-zinc-400">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-[11px] text-zinc-300 truncate max-w-[220px] sm:max-w-md">
            {MINECRAFT_CLIENT_URL}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={focusIframe}
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              isIframeFocused
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700'
            }`}
            title="クリックしてキーボード操作をこのアプリにフォーカス"
          >
            <Keyboard className="w-3 h-3" />
            <span className="hidden sm:inline">{isIframeFocused ? 'キー入力有効' : 'キー有効化'}</span>
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleReload}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
            title="再読み込み (Reload)"
            id="minecraft-reload-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleFullscreen}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
            title="フルスクリーン (Fullscreen)"
            id="minecraft-fullscreen-btn"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <a
            href={MINECRAFT_CLIENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors flex items-center justify-center"
            title="新しいタブで開く (Open in New Tab)"
            id="minecraft-open-new-tab-btn"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 top-8 bg-zinc-950/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs text-zinc-400 font-mono">Loading Minecraft Web Client...</div>
        </div>
      )}

      {/* Embedded Web Client iframe */}
      <div
        className="flex-1 w-full h-full relative bg-black"
        onPointerDown={() => {
          setTimeout(focusIframe, 10);
        }}
      >
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={MINECRAFT_CLIENT_URL}
          title="Minecraft Web Client"
          tabIndex={0}
          className="w-full h-full border-none outline-none"
          allow="fullscreen; autoplay; camera; microphone; clipboard-read; clipboard-write; pointer-lock"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-downloads allow-modals"
          referrerPolicy="no-referrer"
          onLoad={() => {
            setIsLoading(false);
            if (isWindowActive) {
              requestAnimationFrame(() => focusIframe());
              setTimeout(focusIframe, 60);
            }
          }}
        />
      </div>
    </div>
  );
};
