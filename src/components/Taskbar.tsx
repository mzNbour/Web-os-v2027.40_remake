import React, { useState, useEffect } from 'react';
import { AppIcon } from './AppIcon';
import { resolveCustomAppIconId } from './CustomAppIcons';
import { AppID, WindowInstance } from '../types';
import { Wifi, Volume2, Search, Battery, Command, Layers } from 'lucide-react';

interface TaskbarProps {
  openWindows: WindowInstance[];
  activeWindowId: AppID | null;
  onStartClick: () => void;
  isStartOpen: boolean;
  onTaskbarIconClick: (id: AppID) => void;
  isDarkTheme: boolean;
  pinnedAppIds: AppID[];
  onTogglePin: (id: AppID) => void;
  isTaskbarHidden?: boolean;
  isActionCenterOpen?: boolean;
  onToggleActionCenter?: () => void;
  notificationCount?: number;
  taskbarAlignment?: 'left' | 'center';
  taskbarBaseColor?: string;
  taskbarOpacity?: number;
  language?: 'ja' | 'en';
  timezone?: string;
  onTaskViewClick?: () => void;
  isTaskViewOpen?: boolean;
  activeDesktopName?: string;
  osTheme?: 'abord2027' | 'winxp' | 'winvista' | 'win7' | 'macos';
}

export const getTaskbarBgStyle = (
  baseColor: string = 'dark',
  opacity: number = 85,
  isDarkTheme: boolean = true
): React.CSSProperties => {
  const alpha = Math.max(0, Math.min(100, opacity)) / 100;

  if (baseColor === 'clear') {
    return {
      backgroundColor: `rgba(255, 255, 255, ${alpha * 0.18})`,
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderColor: 'rgba(255, 255, 255, 0.15)',
    };
  }

  let rgb = '30, 30, 31';
  switch (baseColor) {
    case 'navy':
      rgb = '15, 23, 42';
      break;
    case 'slate':
      rgb = '30, 41, 59';
      break;
    case 'purple':
      rgb = '46, 16, 101';
      break;
    case 'red':
      rgb = '69, 10, 10';
      break;
    case 'emerald':
      rgb = '6, 78, 59';
      break;
    case 'dark':
    default:
      rgb = isDarkTheme ? '30, 30, 31' : '240, 240, 243';
      break;
  }

  return {
    backgroundColor: `rgba(${rgb}, ${alpha})`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
  };
};

export const Taskbar: React.FC<TaskbarProps> = ({
  openWindows,
  activeWindowId,
  onStartClick,
  isStartOpen,
  onTaskbarIconClick,
  isDarkTheme,
  pinnedAppIds,
  onTogglePin,
  isTaskbarHidden = false,
  isActionCenterOpen = false,
  onToggleActionCenter,
  notificationCount = 0,
  taskbarAlignment = 'left',
  taskbarBaseColor = 'dark',
  taskbarOpacity = 85,
  language = 'ja',
  timezone = 'Asia/Tokyo',
  onTaskViewClick,
  isTaskViewOpen = false,
  activeDesktopName,
  osTheme = 'abord2027',
}) => {
  const [time, setTime] = useState<Date>(new Date());
  const [contextMenu, setContextMenu] = useState<{ appId: AppID; x: number; y: number } | null>(null);
  const touchTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const isJa = language === 'ja';

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeUnpinnedApps = openWindows.filter(
    (w) => w.isOpen && !pinnedAppIds.includes(w.id)
  );

  const taskbarAppIds = [...pinnedAppIds, ...activeUnpinnedApps.map((w) => w.id)];

  // Manage rendering state for unpinned apps to allow unmounting animations
  const [renderedApps, setRenderedApps] = useState<Array<{ id: AppID; isExiting: boolean }>>([]);
  const [mountedAppIds, setMountedAppIds] = useState<AppID[]>([]);

  useEffect(() => {
    setRenderedApps((prev) => {
      const next = [...prev];
      
      // Add pinned apps if not already present
      pinnedAppIds.forEach((id) => {
        if (!next.some((item) => item.id === id)) {
          next.push({ id, isExiting: false });
        }
      });

      // Add unpinned apps
      taskbarAppIds.forEach((id) => {
        const found = next.find((item) => item.id === id);
        if (!found) {
          next.push({ id, isExiting: false });
        } else if (found.isExiting) {
          found.isExiting = false;
        }
      });

      // Mark unpinned apps that were closed/removed as exiting
      next.forEach((item) => {
        if (!taskbarAppIds.includes(item.id) && !item.isExiting) {
          item.isExiting = true;
          setTimeout(() => {
            setRenderedApps((current) => current.filter((x) => x.id !== item.id));
          }, 300);
        }
      });

      return next;
    });
  }, [JSON.stringify(taskbarAppIds)]);

  useEffect(() => {
    const nonPinnedIds = renderedApps
      .filter((x) => !pinnedAppIds.includes(x.id) && !x.isExiting)
      .map((x) => x.id);
    const timer = setTimeout(() => {
      setMountedAppIds(nonPinnedIds);
    }, 30);
    return () => clearTimeout(timer);
  }, [renderedApps]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', closeMenu);
    }
    return () => window.removeEventListener('click', closeMenu);
  }, [contextMenu]);

  const handleIconContextMenu = (e: React.MouseEvent, appId: AppID) => {
    e.preventDefault();
    setContextMenu({ appId, x: e.clientX, y: e.clientY - 45 });
  };

  const handlePointerDown = (e: React.PointerEvent, appId: AppID) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      touchTimerRef.current = setTimeout(() => {
        setContextMenu({ appId, x: e.clientX, y: e.clientY - 45 });
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, 600);
    }
  };

  const handlePointerUpOrLeave = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const appMeta: Partial<Record<AppID, { icon: string; name: string }>> = {
    notepad: { icon: 'notepad', name: isJa ? 'メモ帳' : 'Notepad' },
    calculator: { icon: 'calculator', name: isJa ? '電卓' : 'Calculator' },
    paint: { icon: 'paint', name: isJa ? 'ペイント' : 'Paint' },
    files: { icon: 'files', name: isJa ? 'ファイル エクスプローラー' : 'File Explorer' },
    terminal: { icon: 'terminal', name: isJa ? 'コマンド プロンプト' : 'Command Prompt' },
    excel: { icon: 'excel', name: 'Excel' },
    word: { icon: 'word', name: 'Word' },
    powerpoint: { icon: 'powerpoint', name: 'PowerPoint' },
    settings: { icon: 'settings', name: isJa ? '設定' : 'Settings' },
    recycle: { icon: 'recycle', name: isJa ? 'ゴミ箱' : 'Recycle Bin' },
    minecraft: { icon: 'minecraft', name: 'nooncraft' },
    videoeditor: { icon: 'videoeditor', name: isJa ? 'nooncut ビデオ' : 'nooncut Video' },
    dotsandboxes: { icon: 'dotsandboxes', name: isJa ? 'ドット＆ボックス' : 'Dots & Boxes' },
    blokus: { icon: 'blokus', name: isJa ? 'ブロックス' : 'Blokus' },
    wetalks: { icon: 'wetalks', name: 'WeTalks' },
    nmap: { icon: 'nmap', name: isJa ? 'Nmap 演習' : 'Nmap Practice' },
    flightsim: { icon: 'flightsim', name: isJa ? '3D フライト' : '3D Flight' },
    chameleon: { icon: 'chameleon', name: isJa ? 'かくれんぼ' : 'Chameleon' },
    noobstore: { icon: 'noobstore', name: 'Abord Store' },
    tetris: { icon: 'tetris', name: isJa ? 'テトリス' : 'Tetris' },
    sprout: { icon: 'sprout', name: 'Sprout Studio' },
    aboad: { icon: 'aboad', name: 'Aboad' },
    racing: { icon: 'racing', name: isJa ? 'レーシングカーゲーム' : 'Racing Car Game' },
    floppybird: { icon: 'floppybird', name: 'Floppy Bird' },
  };

  const isLeftAlign = taskbarAlignment === 'left' || osTheme === 'winxp' || osTheme === 'winvista' || osTheme === 'win7';

  // Custom styling for classic OS expansion themes
  let taskbarStyle: React.CSSProperties = getTaskbarBgStyle(taskbarBaseColor, taskbarOpacity, isDarkTheme);
  let taskbarExtraClasses = isDarkTheme ? 'text-gray-200' : 'text-gray-800';

  if (osTheme === 'macos') {
    taskbarStyle = {
      background: isDarkTheme ? 'rgba(28, 28, 32, 0.75)' : 'rgba(255, 255, 255, 0.75)',
      backdropFilter: 'blur(30px) saturate(200%)',
      WebkitBackdropFilter: 'blur(30px) saturate(200%)',
      border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(0, 0, 0, 0.14)',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
    };
    taskbarExtraClasses = isDarkTheme ? 'text-gray-100' : 'text-gray-900';
  } else if (osTheme === 'winxp') {
    taskbarStyle = {
      background: 'linear-gradient(to bottom, #1864e2 0%, #004cd8 50%, #0038b8 100%)',
      borderTop: '2px solid #3c8bf6',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
    };
    taskbarExtraClasses = 'text-white';
  } else if (osTheme === 'winvista') {
    taskbarStyle = {
      background: 'rgba(12, 16, 23, 0.88)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderTop: '1px solid rgba(255, 255, 255, 0.25)',
      boxShadow: '0 -4px 15px rgba(0, 0, 0, 0.5)',
    };
    taskbarExtraClasses = 'text-gray-100';
  } else if (osTheme === 'win7') {
    taskbarStyle = {
      background: 'linear-gradient(to bottom, rgba(30, 75, 120, 0.75) 0%, rgba(12, 35, 65, 0.85) 100%)',
      backdropFilter: 'blur(25px) saturate(200%)',
      WebkitBackdropFilter: 'blur(25px) saturate(200%)',
      borderTop: '1px solid rgba(150, 220, 255, 0.4)',
      boxShadow: '0 -3px 12px rgba(0, 150, 255, 0.25)',
    };
    taskbarExtraClasses = 'text-slate-100';
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 h-12 flex items-center px-3 select-none z-50 transition-all duration-300 ease-in-out ${
        osTheme === 'macos'
          ? 'bottom-2 inset-x-0 mx-auto w-fit max-w-[95vw] rounded-2xl border px-3 h-14'
          : 'border-t'
      } ${taskbarExtraClasses}`}
      style={{
        ...taskbarStyle,
        transform: isTaskbarHidden ? 'translateY(120%)' : 'translateY(0)',
      }}
      id="desktop-taskbar"
    >
      {/* Left aligned vs Center aligned container */}
      <div className={`flex items-center gap-2 flex-1 ${isLeftAlign ? 'justify-start' : 'justify-center relative'}`}>
        
        {/* Start Button according to osTheme */}
        {osTheme === 'macos' ? (
          <div
            onClick={onStartClick}
            className={`p-2 rounded-xl cursor-pointer transition-all duration-150 active:scale-90 shrink-0 flex items-center justify-center ${
              isStartOpen
                ? isDarkTheme ? 'bg-white/20' : 'bg-black/15'
                : isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-black/10'
            }`}
            id="taskbar-btn-start"
            title={isJa ? 'Launchpad / Apple メニュー' : 'Launchpad / Apple Menu'}
          >
            <span className="text-xl select-none leading-none">🍎</span>
          </div>
        ) : osTheme === 'winxp' ? (
          <div
            onClick={onStartClick}
            className="h-9 px-3 rounded-r-lg bg-gradient-to-b from-[#388d38] via-[#287d28] to-[#125812] hover:brightness-110 active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] border-r-2 border-green-400/50 text-white font-bold italic text-sm select-none shrink-0"
            id="taskbar-btn-start"
            title={isJa ? 'スタート' : 'Start'}
          >
            <div className="w-4 h-4 grid grid-cols-2 gap-0.5 transform -rotate-12 shrink-0">
              <div className="bg-[#f25022] rounded-[1px]" />
              <div className="bg-[#7fba00] rounded-[1px]" />
              <div className="bg-[#00a4ef] rounded-[1px]" />
              <div className="bg-[#ffb900] rounded-[1px]" />
            </div>
            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] tracking-wide">start</span>
          </div>
        ) : osTheme === 'winvista' ? (
          <div
            onClick={onStartClick}
            className="w-10 h-10 -my-1 rounded-full bg-gradient-to-b from-[#217bf4] via-[#093c8a] to-[#041d48] border-2 border-sky-300/80 shadow-[0_0_12px_rgba(59,130,246,0.9)] hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shrink-0 relative overflow-hidden transition-transform"
            id="taskbar-btn-start"
            title={isJa ? 'スタート' : 'Start'}
          >
            <div className="absolute top-0 inset-x-0 h-1/2 bg-white/30 rounded-t-full pointer-events-none" />
            <div className="w-5 h-5 grid grid-cols-2 gap-0.5 transform -rotate-12 z-10">
              <div className="bg-[#f25022] rounded-[1px]" />
              <div className="bg-[#7fba00] rounded-[1px]" />
              <div className="bg-[#00a4ef] rounded-[1px]" />
              <div className="bg-[#ffb900] rounded-[1px]" />
            </div>
          </div>
        ) : osTheme === 'win7' ? (
          <div
            onClick={onStartClick}
            className="w-11 h-11 -my-1.5 rounded-full bg-gradient-to-br from-cyan-400 via-blue-600 to-blue-900 border-2 border-cyan-200 shadow-[0_0_15px_rgba(0,200,255,0.8)] hover:shadow-[0_0_22px_rgba(0,230,255,1)] hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shrink-0 relative overflow-hidden transition-all"
            id="taskbar-btn-start"
            title={isJa ? 'スタート' : 'Start'}
          >
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none" />
            <div className="w-5 h-5 grid grid-cols-2 gap-0.5 transform -rotate-12 z-10">
              <div className="bg-[#f25022] rounded-[1px] shadow-xs" />
              <div className="bg-[#7fba00] rounded-[1px] shadow-xs" />
              <div className="bg-[#00a4ef] rounded-[1px] shadow-xs" />
              <div className="bg-[#ffb900] rounded-[1px] shadow-xs" />
            </div>
          </div>
        ) : (
          <div
            onClick={onStartClick}
            className={`p-2 rounded-lg cursor-pointer transition-all duration-150 active:scale-95 shrink-0 ${
              isStartOpen
                ? isDarkTheme ? 'bg-white/10 ring-1 ring-white/5' : 'bg-black/10'
                : isDarkTheme ? 'hover:bg-white/5' : 'hover:bg-black/5'
            }`}
            id="taskbar-btn-start"
            title={isJa ? 'スタート' : 'Start'}
          >
            <AppIcon id="start" size={22} />
          </div>
        )}

        {/* Windows 11 Task View (Virtual Desktop) Button - Name label removed as requested */}
        <div
          onClick={onTaskViewClick}
          className={`p-2 rounded-lg cursor-pointer transition-all duration-150 active:scale-95 shrink-0 flex items-center gap-1.5 ${
            isTaskViewOpen
              ? isDarkTheme ? 'bg-blue-600/30 text-blue-400 ring-1 ring-blue-500/50' : 'bg-blue-500/20 text-blue-600'
              : isDarkTheme ? 'hover:bg-white/5 text-gray-300 hover:text-white' : 'hover:bg-black/5 text-gray-700'
          }`}
          id="taskbar-btn-taskview"
          title={isJa ? 'タスク ビュー (仮想デスクトップ)' : 'Task View (Virtual Desktops)'}
        >
          {/* Windows 11 Task View overlapping squares icon */}
          <div className="relative w-5 h-5 flex items-center justify-center">
            <div className="absolute w-3.5 h-3.5 border-2 border-current rounded-[2px] top-0 left-0 bg-transparent" />
            <div className="absolute w-3.5 h-3.5 border-2 border-current rounded-[2px] bottom-0 right-0 bg-slate-900/40 backdrop-blur-xs" />
          </div>
        </div>

        {/* Search pill */}
        <div
          onClick={onStartClick}
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-colors shrink-0 ${
            isDarkTheme
              ? 'bg-white/5 border-white/5 hover:bg-white/10'
              : 'bg-black/5 border-black/5 hover:bg-black/10'
          }`}
          id="taskbar-btn-search-pill"
        >
          <Search className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-sans text-gray-400">{isJa ? 'ここに入力して検索...' : 'Type here to search...'}</span>
        </div>

        {/* Separator */}
        <div className={`h-6 w-[1px] mx-1 shrink-0 ${isDarkTheme ? 'bg-white/10' : 'bg-black/10'}`} />

        {/* App Icons List */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[calc(100vw-350px)]">
          {renderedApps.map((item) => {
            const appId = item.id;
            const isExiting = item.isExiting;
            const isPinned = pinnedAppIds.includes(appId);
            const isFullyMounted = isPinned || mountedAppIds.includes(appId);

            const win = openWindows.find((w) => w.id === appId);
            let fallbackMeta = { icon: win?.icon || appId, name: win?.title || appId };
            if (!appMeta[appId] && !win && appId.startsWith('custom-app-')) {
              try {
                const stored = localStorage.getItem('noobstore_installed_apps');
                if (stored) {
                  const installed = JSON.parse(stored);
                  const found = installed.find((a: any) => a.id === appId);
                  if (found) {
                    fallbackMeta = {
                      icon: resolveCustomAppIconId(found),
                      name: found.title || appId,
                    };
                  }
                }
              } catch (e) {}
            }
            const meta = appMeta[appId] || fallbackMeta;
            const isOpen = win?.isOpen;
            const isActive = activeWindowId === appId && !win?.isMinimized;

            return (
              <div
                key={appId}
                onClick={() => !isExiting && onTaskbarIconClick(appId)}
                onContextMenu={(e) => !isExiting && handleIconContextMenu(e, appId)}
                onPointerDown={(e) => !isExiting && handlePointerDown(e, appId)}
                onPointerUp={handlePointerUpOrLeave}
                onPointerLeave={handlePointerUpOrLeave}
                className={`transition-all duration-300 ease-out flex items-center justify-center overflow-hidden ${
                  !isPinned
                    ? (!isExiting && isFullyMounted)
                      ? 'max-w-[44px] opacity-100 scale-100'
                      : 'max-w-0 opacity-0 scale-50 pointer-events-none'
                    : 'max-w-[44px] opacity-100 scale-100'
                }`}
              >
                <div
                  className={`relative flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-all duration-150 active:scale-95 group ${
                    isActive
                      ? isDarkTheme ? 'bg-white/10' : 'bg-black/10'
                      : isDarkTheme ? 'hover:bg-white/5' : 'hover:bg-black/5'
                  }`}
                  title={meta.name}
                  id={`taskbar-icon-${appId}`}
                >
                  <AppIcon id={meta.icon} size={24} />

                  {/* Running Indicators (line bar underneath or mac dot) */}
                  {isOpen && (
                    <span
                      className={`absolute bottom-0.5 transition-all duration-200 ${
                        osTheme === 'macos'
                          ? isActive
                            ? 'w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]'
                            : 'w-1 h-1 rounded-full bg-gray-400/80 group-hover:bg-gray-300'
                          : isActive
                          ? 'w-4 h-1 rounded-full bg-blue-500' // Brighter, wider bar for current active window
                          : 'w-1.5 h-1 rounded-full bg-gray-400 group-hover:w-3.5' // Small bar for inactive background windows
                      }`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Taskbar Right: System Tray (Wifi, Volume, Clock) */}
      <div className="flex items-center gap-2 shrink-0 justify-end ml-auto">
        {/* Wifi, Sound & battery indicators */}
        <div className="flex items-center gap-2 hover:bg-white/5 p-1 px-2 rounded-md cursor-pointer text-xs select-none">
          <Wifi className="w-3.5 h-3.5 opacity-80" />
          <Volume2 className="w-3.5 h-3.5 opacity-80" />
          <Battery className="w-3.5 h-3.5 opacity-80" />
        </div>

        {/* Real-time System Clock */}
        <div
          onClick={onToggleActionCenter}
          className={`flex flex-col text-right hover:bg-white/5 p-1 px-2 rounded-md cursor-pointer font-sans leading-tight text-[11px] select-none ${
            isActionCenterOpen ? (isDarkTheme ? 'bg-white/10' : 'bg-black/10') : ''
          }`}
          title={`${time.toLocaleDateString(isJa ? 'ja-JP' : 'en-US', { timeZone: timezone })} - ${isJa ? 'カレンダーを表示' : 'Show Calendar'}`}
          id="taskbar-system-clock"
        >
          <span className="font-semibold tracking-wide">
            {time.toLocaleTimeString(isJa ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit', timeZone: timezone })}
          </span>
          <span className="text-[9px] text-gray-400">
            {time.toLocaleDateString(isJa ? 'ja-JP' : 'en-US', { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: timezone })}
          </span>
        </div>

        {/* Windows 10 Action Center Button */}
        <button
          onClick={onToggleActionCenter}
          className={`p-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer text-inherit flex items-center justify-center relative ${
            isActionCenterOpen ? (isDarkTheme ? 'bg-white/10' : 'bg-black/10') : ''
          }`}
          title={`${isJa ? 'アクション センター' : 'Action Center'}${notificationCount > 0 ? ` (${notificationCount})` : ''}`}
          id="taskbar-btn-action-center"
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-80 hover:opacity-100"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[8px] font-bold h-3.5 min-w-[14px] px-0.5 rounded-full flex items-center justify-center border border-white dark:border-zinc-950 shadow-md">
              {notificationCount}
            </span>
          )}
        </button>
      </div>

      {/* Taskbar Floating Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 99999,
          }}
          className="bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200/50 py-1.5 min-w-[140px] text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const appId = contextMenu.appId;
              setContextMenu(null);
              onTogglePin(appId);
            }}
            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 flex items-center gap-2.5 transition-colors text-gray-700"
          >
            <span className="text-gray-400">{pinnedAppIds.includes(contextMenu.appId) ? '❌' : '📌'}</span>
            <span>
              {pinnedAppIds.includes(contextMenu.appId)
                ? (isJa ? 'ピン留めを外す' : 'Unpin from taskbar')
                : (isJa ? 'タスクバーにピン留めする' : 'Pin to taskbar')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
