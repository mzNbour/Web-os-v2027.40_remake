import React, { useRef, useEffect, useState } from 'react';
import { WindowInstance } from '../types';
import { Minimize2, Square, Copy, X } from 'lucide-react';
import { AppIcon } from './AppIcon';

interface WindowProps {
  windowState: WindowInstance;
  onUpdate: (id: string, updates: Partial<WindowInstance>) => void;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  children: React.ReactNode;
  isTaskbarHidden?: boolean;
  isToggleTaskbarWithQ?: boolean;
  language?: 'ja' | 'en';
  osTheme?: 'abord2027' | 'winxp' | 'winvista' | 'win7' | 'macos';
}

export const Window: React.FC<WindowProps> = ({
  windowState,
  onUpdate,
  onFocus,
  onClose,
  children,
  isTaskbarHidden = false,
  isToggleTaskbarWithQ = false,
  language = 'ja',
  osTheme = 'abord2027',
}) => {
  const isJa = language === 'ja';
  const { id, title, icon, x, y, width, height, isMaximized, isMinimized, zIndex, minWidth = 300, minHeight = 200 } = windowState;

  const [isInteracting, setIsInteracting] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);

  const dragStart = useRef<{ pointerId: number; target: HTMLElement; mouseX: number; mouseY: number; winX: number; winY: number } | null>(null);
  const resizeStart = useRef<{ pointerId: number; target: HTMLElement; mouseX: number; mouseY: number; winW: number; winH: number; winX: number; winY: number; handle: string } | null>(null);

  // Track dimensions in ref for high-frequency direct DOM styling
  const lastProps = useRef({ x, y, width, height });

  // Sync coordinate prop updates when idle
  useEffect(() => {
    if (!dragStart.current && !resizeStart.current) {
      lastProps.current = { x, y, width, height };
    }
  }, [x, y, width, height]);

  // Start opening animation on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsOpening(false);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(id);
    }, 75);
  };

  // Focus window on click anywhere inside
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onFocus(id);
    const target = e.target as HTMLElement | null;
    if (target && !target.closest('button, input, textarea, select, a, [contenteditable="true"]')) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('webos_window_focus_settled', { detail: { id } }));
      }, 0);
    }
  };

  // Drag Titlebar handlers
  const handleTitleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    onFocus(id);

    setIsInteracting(true);

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("Failed to set pointer capture", err);
    }

    dragStart.current = {
      pointerId: e.pointerId,
      target,
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: lastProps.current.x,
      winY: lastProps.current.y,
    };

    document.addEventListener('pointermove', handleTitleDrag);
    document.addEventListener('pointerup', handleDragEnd);
  };

  const tickingDrag = useRef(false);
  const handleTitleDrag = (e: PointerEvent) => {
    if (!dragStart.current) return;
    if (tickingDrag.current) return;

    tickingDrag.current = true;
    window.requestAnimationFrame(() => {
      if (!dragStart.current) {
        tickingDrag.current = false;
        return;
      }

      const deltaX = e.clientX - dragStart.current.mouseX;
      const deltaY = e.clientY - dragStart.current.mouseY;

      // Bounds checking: prevent window from going completely off-screen
      const newX = Math.max(-lastProps.current.width + 100, Math.min(window.innerWidth - 100, dragStart.current.winX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 80, dragStart.current.winY + deltaY));

      if (windowRef.current) {
        windowRef.current.style.left = `${newX}px`;
        windowRef.current.style.top = `${newY}px`;
      }

      lastProps.current.x = newX;
      lastProps.current.y = newY;

      tickingDrag.current = false;
    });
  };

  // Resize border handlers
  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>, handle: string) => {
    if (isMaximized) return;
    e.stopPropagation();
    e.preventDefault();
    onFocus(id);

    setIsInteracting(true);

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("Failed to set pointer capture", err);
    }

    resizeStart.current = {
      pointerId: e.pointerId,
      target,
      mouseX: e.clientX,
      mouseY: e.clientY,
      winW: lastProps.current.width,
      winH: lastProps.current.height,
      winX: lastProps.current.x,
      winY: lastProps.current.y,
      handle,
    };

    document.addEventListener('pointermove', handleResize);
    document.addEventListener('pointerup', handleDragEnd);
  };

  const tickingResize = useRef(false);
  const handleResize = (e: PointerEvent) => {
    if (!resizeStart.current) return;
    if (tickingResize.current) return;

    tickingResize.current = true;
    window.requestAnimationFrame(() => {
      if (!resizeStart.current) {
        tickingResize.current = false;
        return;
      }

      const deltaX = e.clientX - resizeStart.current.mouseX;
      const deltaY = e.clientY - resizeStart.current.mouseY;
      const { handle, winW, winH, winX, winY } = resizeStart.current;

      let newW = lastProps.current.width;
      let newH = lastProps.current.height;
      let newX = lastProps.current.x;
      let newY = lastProps.current.y;

      if (handle.includes('r')) {
        newW = Math.max(minWidth, winW + deltaX);
      } else if (handle.includes('l')) {
        const calculatedW = winW - deltaX;
        newW = Math.max(minWidth, calculatedW);
        newX = winX + (winW - newW);
      }

      if (handle.includes('b')) {
        newH = Math.max(minHeight, winH + deltaY);
      } else if (handle.includes('t')) {
        const calculatedH = winH - deltaY;
        newH = Math.max(minHeight, calculatedH);
        newY = winY + (winH - newH);
      }

      if (windowRef.current) {
        windowRef.current.style.width = `${newW}px`;
        windowRef.current.style.height = `${newH}px`;
        windowRef.current.style.left = `${newX}px`;
        windowRef.current.style.top = `${newY}px`;
      }

      lastProps.current.width = newW;
      lastProps.current.height = newH;
      lastProps.current.x = newX;
      lastProps.current.y = newY;

      tickingResize.current = false;
    });
  };

  const handleDragEnd = () => {
    let wasInteracting = false;

    if (dragStart.current) {
      wasInteracting = true;
      const { pointerId, target } = dragStart.current;
      try {
        if (target && target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      } catch (err) {
        // Ignore
      }
    }
    if (resizeStart.current) {
      wasInteracting = true;
      const { pointerId, target } = resizeStart.current;
      try {
        if (target && target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      } catch (err) {
        // Ignore
      }
    }

    dragStart.current = null;
    resizeStart.current = null;

    document.removeEventListener('pointermove', handleTitleDrag);
    document.removeEventListener('pointermove', handleResize);
    document.removeEventListener('pointerup', handleDragEnd);

    if (wasInteracting) {
      setIsInteracting(false);
      // Persist the final calculated coordinates to React state
      onUpdate(id, {
        x: lastProps.current.x,
        y: lastProps.current.y,
        width: lastProps.current.width,
        height: lastProps.current.height,
      });
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('webos_window_focus_settled', { detail: { id } }));
      }, 20);
    }
  };

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', handleTitleDrag);
      document.removeEventListener('pointermove', handleResize);
      document.removeEventListener('pointerup', handleDragEnd);
    };
  }, []);

  const toggleMaximize = () => {
    if (isMaximized) {
      // Restore coordinates
      onUpdate(id, {
        isMaximized: false,
        x: windowState.prevX,
        y: windowState.prevY,
        width: windowState.prevWidth,
        height: windowState.prevHeight,
      });
    } else {
      // Save current coordinates and maximize
      onUpdate(id, {
        isMaximized: true,
        prevX: x,
        prevY: y,
        prevWidth: width,
        prevHeight: height,
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: isTaskbarHidden ? window.innerHeight : window.innerHeight - 48, // Taskbar is 48px
      });
    }
  };

  const animationClass = isClosing
    ? 'scale-95 opacity-0 pointer-events-none transition-all duration-75 ease-out'
    : isOpening
      ? 'scale-95 opacity-0 pointer-events-none'
      : isMinimized
        ? 'opacity-0 scale-95 pointer-events-none invisible transition-all duration-75 ease-out'
        : isInteracting
          ? 'scale-100 opacity-100'
          : 'scale-100 opacity-100 transition-all duration-75 ease-out';

  return (
    <div
      ref={windowRef}
      onPointerDown={handlePointerDown}
      onContextMenu={(e) => e.stopPropagation()}
      className={`absolute flex flex-col rounded-t-xl overflow-hidden border select-text shadow-2xl origin-center ${
        id === 'sprout'
          ? 'bg-[#1e1e1e] border-zinc-800'
          : 'bg-white border-gray-200/80'
      } ${
        isMaximized
          ? 'rounded-none border-none'
          : id === 'sprout'
            ? 'ring-1 ring-black/40'
            : 'ring-1 ring-black/5'
      } ${animationClass}`}
      style={{
        left: isMaximized ? 0 : x,
        top: isMaximized ? 0 : y,
        width: isMaximized ? '100vw' : width,
        height: isMaximized ? (isTaskbarHidden ? '100vh' : 'calc(100vh - 48px)') : height,
        zIndex,
        willChange: isInteracting || isOpening || isClosing ? 'top, left, width, height, transform, opacity' : 'auto',
      }}
      id={`window-${id}`}
    >
      {/* Title Bar */}
      <div
        onPointerDown={handleTitleDragStart}
        onDoubleClick={(e) => {
          e.stopPropagation();
          toggleMaximize();
        }}
        className={`h-10 shrink-0 flex items-center justify-between pl-3 pr-3 select-none cursor-move touch-none ${
          osTheme === 'macos'
            ? 'bg-[#e5e5ea]/85 dark:bg-[#1e1e1e]/85 backdrop-blur-xl border-b border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-200'
            : osTheme === 'winxp'
            ? 'bg-gradient-to-r from-[#0058e6] via-[#2879f9] to-[#0051e2] text-white font-bold rounded-t-lg border-b border-[#0038b8]'
            : osTheme === 'winvista'
            ? 'bg-gradient-to-b from-[#1c2432] to-[#0f1520] text-sky-100 border-b border-white/10 font-semibold'
            : osTheme === 'win7'
            ? 'bg-gradient-to-b from-sky-500/80 via-blue-700/80 to-blue-900/80 text-white border-b border-cyan-300/40 shadow-xs font-semibold'
            : id === 'sprout'
            ? 'bg-[#181818] border-b border-[#2d2d2d] text-zinc-300'
            : 'bg-[#f3f4f6]/95 border-b border-gray-200/80 text-gray-800'
        }`}
        id={`window-titlebar-${id}`}
      >
        {osTheme === 'macos' ? (
          <>
            {/* macOS Traffic Light Buttons on Left */}
            <div
              className="flex items-center gap-2 select-none group/mac w-16"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleClose}
                className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-95 active:scale-90 transition-all flex items-center justify-center text-black/70 cursor-pointer shadow-xs"
                title={isJa ? '閉じる (Cmd+W)' : 'Close (Cmd+W)'}
                id={`window-ctrl-close-${id}`}
              >
                <X className="w-2 h-2 opacity-0 group-hover/mac:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={() => onUpdate(id, { isMinimized: true })}
                className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-95 active:scale-90 transition-all flex items-center justify-center text-black/70 cursor-pointer shadow-xs"
                title={isJa ? '最小化 (Cmd+M)' : 'Minimize (Cmd+M)'}
                id={`window-ctrl-min-${id}`}
              >
                <div className="w-1.5 h-0.5 bg-black/70 rounded-full opacity-0 group-hover/mac:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={toggleMaximize}
                className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-95 active:scale-90 transition-all flex items-center justify-center text-black/70 cursor-pointer shadow-xs"
                title={isMaximized ? (isJa ? '元に戻す' : 'Restore') : (isJa ? '最大化' : 'Zoom')}
                id={`window-ctrl-max-${id}`}
              >
                <div className="w-1.5 h-1.5 border-t border-l border-black/70 opacity-0 group-hover/mac:opacity-100 transition-opacity transform rotate-45" />
              </button>
            </div>

            {/* macOS Centered Title */}
            <div className="flex-1 flex items-center justify-center gap-1.5 overflow-hidden px-2">
              {icon === 'browser' && <span className="text-xs shrink-0 select-none">🌐</span>}
              {icon === 'notepad' && <span className="text-xs shrink-0 select-none">📝</span>}
              {icon === 'calculator' && <span className="text-xs shrink-0 select-none">🧮</span>}
              {icon === 'paint' && <span className="text-xs shrink-0 select-none">🎨</span>}
              {icon === 'files' && <span className="text-xs shrink-0 select-none">📁</span>}
              {icon === 'terminal' && <span className="text-xs shrink-0 select-none">⚙️</span>}
              {icon === 'excel' && <span className="text-xs shrink-0 select-none">📊</span>}
              {icon === 'settings' && <span className="text-xs shrink-0 select-none">⚙️</span>}
              {icon === 'word' && <span className="text-xs shrink-0 select-none">📘</span>}
              {icon === 'powerpoint' && <span className="text-xs shrink-0 select-none">🍊</span>}
              {icon === 'sprout' && <span className="text-xs shrink-0 select-none">🌱</span>}
              {icon === 'aboad' && <span className="text-xs shrink-0 select-none">🌐</span>}
              {(icon === 'racing' || icon === 'floppybird' || icon.startsWith('cweb-') || icon.startsWith('custom-app-')) && (
                <AppIcon id={icon} size={15} className="shrink-0" />
              )}
              <span className="text-xs font-medium truncate tracking-tight text-gray-700 dark:text-gray-200">{title}</span>
            </div>

            <div className="w-16 flex justify-end">
              {/* spacer to keep title centered */}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 max-w-[60%]">
              {!(id === 'sprout' && isToggleTaskbarWithQ) && (
                <>
                  {icon === 'browser' && <span className="w-4.5 h-4.5 shrink-0 select-none">🌐</span>}
                  {icon === 'notepad' && <span className="w-4.5 h-4.5 shrink-0 select-none">📝</span>}
                  {icon === 'calculator' && <span className="w-4.5 h-4.5 shrink-0 select-none">🧮</span>}
                  {icon === 'paint' && <span className="w-4.5 h-4.5 shrink-0 select-none">🎨</span>}
                  {icon === 'files' && <span className="w-4.5 h-4.5 shrink-0 select-none">📁</span>}
                  {icon === 'terminal' && <span className="w-4.5 h-4.5 shrink-0 select-none">⚙️</span>}
                  {icon === 'excel' && <span className="w-4.5 h-4.5 shrink-0 select-none">📊</span>}
                  {icon === 'settings' && <span className="w-4.5 h-4.5 shrink-0 select-none">⚙️</span>}
                  {icon === 'word' && <span className="w-4.5 h-4.5 shrink-0 select-none">📘</span>}
                  {icon === 'powerpoint' && <span className="w-4.5 h-4.5 shrink-0 select-none">🍊</span>}
                  {icon === 'sprout' && <span className="w-4.5 h-4.5 shrink-0 select-none">🌱</span>}
                  {icon === 'aboad' && <span className="w-4.5 h-4.5 shrink-0 select-none">🌐</span>}
                  {(icon === 'racing' || icon === 'floppybird' || icon.startsWith('cweb-') || icon.startsWith('custom-app-')) && (
                    <AppIcon id={icon} size={17} className="shrink-0" />
                  )}
                  <span className={`text-xs font-semibold truncate ${id === 'sprout' ? 'text-zinc-300' : 'text-gray-700'}`}>{title}</span>
                </>
              )}
            </div>

            {/* Action Window Controls */}
            <div
              className="flex items-center gap-0.5 select-none"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onUpdate(id, { isMinimized: true })}
                className={`p-1.5 rounded transition-colors ${
                  id === 'sprout'
                    ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                    : 'text-gray-500 hover:bg-gray-200'
                }`}
                title={isJa ? '最小化' : 'Minimize'}
                id={`window-ctrl-min-${id}`}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleMaximize}
                className={`p-1.5 rounded transition-colors ${
                  id === 'sprout'
                    ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                    : 'text-gray-500 hover:bg-gray-200'
                }`}
                title={isMaximized ? (isJa ? '元に戻す' : 'Restore Down') : (isJa ? '最大化' : 'Maximize')}
                id={`window-ctrl-max-${id}`}
              >
                {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleClose}
                className={`p-1.5 rounded transition-colors ${
                  id === 'sprout'
                    ? 'text-zinc-400 hover:bg-red-600 hover:text-white'
                    : 'text-gray-500 hover:bg-red-600 hover:text-white'
                }`}
                title={isJa ? '閉じる' : 'Close'}
                id={`window-ctrl-close-${id}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main Window Frame Contents */}
      <div className="flex-1 overflow-hidden relative min-h-0 min-w-0" id={`window-content-${id}`}>
        {children}
        {isInteracting && (
          <div className="absolute inset-0 z-50 bg-transparent pointer-events-auto" />
        )}
      </div>

      {/* Resize border handles (only show if not maximized) */}
      {!isMaximized && (
        <>
          {/* North (Top border) */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 't')}
            className="absolute top-0 left-0 w-full h-1.5 cursor-n-resize z-20 select-none touch-none"
            id={`window-resize-t-${id}`}
          />
          {/* South (Bottom border) */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'b')}
            className="absolute bottom-0 left-0 w-full h-1.5 cursor-s-resize z-20 select-none touch-none"
            id={`window-resize-b-${id}`}
          />
          {/* East (Right border) */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'r')}
            className="absolute top-0 right-0 w-1.5 h-full cursor-e-resize z-20 select-none touch-none"
            id={`window-resize-r-${id}`}
          />
          {/* West (Left border) */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'l')}
            className="absolute top-0 left-0 w-1.5 h-full cursor-w-resize z-20 select-none touch-none"
            id={`window-resize-l-${id}`}
          />
          {/* Top-Left */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'tl')}
            className="absolute top-0 left-0 w-4.5 h-4.5 cursor-nw-resize z-30 select-none touch-none"
            id={`window-resize-tl-${id}`}
          />
          {/* Top-Right */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'tr')}
            className="absolute top-0 right-0 w-4.5 h-4.5 cursor-ne-resize z-30 select-none touch-none"
            id={`window-resize-tr-${id}`}
          />
          {/* Bottom-Left */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'bl')}
            className="absolute bottom-0 left-0 w-4.5 h-4.5 cursor-sw-resize z-30 select-none touch-none"
            id={`window-resize-bl-${id}`}
          />
          {/* Bottom-Right */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'br')}
            className="absolute bottom-0 right-0 w-4.5 h-4.5 cursor-se-resize z-30 select-none touch-none"
            id={`window-resize-br-${id}`}
          />
        </>
      )}
    </div>
  );
};
