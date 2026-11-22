/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AppID, WindowInstance, SettingsState, WALLPAPERS, VirtualFile, DesktopItem, VirtualDesktop } from './types';
import { Window } from './components/Window';
import { Taskbar } from './components/Taskbar';
import { StartMenu } from './components/StartMenu';
import { DesktopIcon } from './components/DesktopIcon';
import { DesktopWidgets } from './components/DesktopWidgets';
import { FolderViewWindow } from './components/FolderViewWindow';
import { TaskViewModal } from './components/TaskViewModal';
import { findAvailableGridSpot, resolveOverlappingItems } from './utils/grid';
import { FolderPlus, Grid, Settings as SettingsIcon, CloudSun, Clock as ClockIcon, StickyNote as StickyNoteIcon } from 'lucide-react';

// App Components
import { BrowserApp } from './components/apps/BrowserApp';
import { NotepadApp } from './components/apps/NotepadApp';
import { CalculatorApp } from './components/apps/CalculatorApp';
import { PaintApp } from './components/apps/PaintApp';
import { FileManagerApp } from './components/apps/FileManagerApp';
import { TerminalApp } from './components/apps/TerminalApp';
import { ExcelApp } from './components/apps/ExcelApp';
import { SettingsApp } from './components/apps/SettingsApp';
import { WordApp } from './components/apps/WordApp';
import { PowerPointApp } from './components/apps/PowerPointApp';
import { RecycleBinApp } from './components/apps/RecycleBinApp';
import { MinecraftApp } from './components/apps/MinecraftApp';
import { VideoEditorApp } from './components/VideoEditorApp';
import { DotsAndBoxesApp } from './components/apps/DotsAndBoxesApp';
import { BlokusApp } from './components/apps/BlokusApp';
import { TetrisApp } from './components/apps/TetrisApp';
import NmapApp from './components/apps/NmapApp';
import FlightSimulatorApp from './components/apps/FlightSimulatorApp';
import { ChameleonGameApp } from './components/apps/ChameleonGameApp';
import { NoobStoreApp } from './components/apps/NoobStoreApp';
import { SproutApp } from './components/apps/SproutApp';
import { AboadApp } from './components/apps/AboadApp';
import { RacingGameApp } from './components/apps/RacingGameApp';
import { FloppyBirdApp } from './components/apps/FloppyBirdApp';
import { GeoGuessrApp } from './components/apps/GeoGuessrApp';
import { WebGameFrameApp } from './components/apps/WebGameFrameApp';
import { resolveCustomAppIconId } from './components/CustomAppIcons';
import { normalizeCustomWebUrl } from './utils/customWebUrl';
import { CHAT_APP_HTML } from './components/browserConstants';
import { BootScreen } from './components/BootScreen';
import { LockScreen } from './components/LockScreen';
import { OOBESetup } from './components/OOBESetup';
import { FullscreenBossOverlay } from './components/FullscreenBossOverlay';
import { motion, AnimatePresence } from 'motion/react';

const getLocalizedAppTitle = (appId: AppID | string, language: 'ja' | 'en' = 'ja', defaultTitle?: string): string => {
  const isJa = language === 'ja';
  switch (appId) {
    case 'recycle': return isJa ? 'ゴミ箱' : 'Recycle Bin';
    case 'settings': return isJa ? '設定' : 'Settings';
    case 'files': return isJa ? 'ファイル エクスプローラー' : 'File Explorer';
    case 'notepad': return isJa ? 'メモ帳' : 'Notepad';
    case 'calculator': return isJa ? '電卓' : 'Calculator';
    case 'paint': return isJa ? 'ペイント' : 'Paint Tool';
    case 'terminal': return isJa ? 'コマンド プロンプト' : 'Command Prompt';
    case 'excel': return isJa ? 'Excel スプレッドシート' : 'Excel Sheets';
    case 'word': return isJa ? 'Word ドキュメント' : 'Word Document Editor';
    case 'powerpoint': return isJa ? 'PowerPoint プレゼンテーション' : 'PowerPoint Slide Deck';
    case 'minecraft': return isJa ? 'nooncraft' : 'nooncraft';
    case 'videoeditor': return isJa ? 'nooncut ビデオエディター' : 'nooncut Video Editor';
    case 'dotsandboxes': return isJa ? 'ドット＆ボックス' : 'Dots & Boxes';
    case 'blokus': return isJa ? 'ブロックス' : 'Blokus';
    case 'wetalks': return isJa ? 'WeTalks チャット' : 'WeTalks Chat';
    case 'nmap': return isJa ? 'Nmap 演習ターミナル' : 'Nmap Practice Terminal';
    case 'flightsim': return isJa ? '3D フライトシミュレーター' : '3D Flight Simulator';
    case 'chameleon': return isJa ? 'カメレオン かくれんぼ' : 'Chameleon Hide-and-Seek';
    case 'noobstore': return isJa ? 'Abord Store' : 'Abord Store';
    case 'tetris': return isJa ? 'ネオ テトリス' : 'Neo Tetris';
    case 'sprout': return isJa ? 'Sprout Studio (開発環境)' : 'Sprout Studio (IDE)';
    case 'aboad': return 'Aboad';
    case 'racing': return isJa ? 'レーシングカーゲーム' : 'Racing Car Game';
    case 'floppybird': return 'Floppy Bird';
    case 'geoguessr': return 'GeoGuessr';
    default: return defaultTitle || appId;
  }
};

const getDesktopTitle = (item: DesktopItem, isJa: boolean): string => {
  if (item.id === 'recycle') return isJa ? 'ゴミ箱' : 'Recycle Bin';
  if (item.id === 'settings') return isJa ? '設定' : 'Settings';
  if (item.id === 'files') return isJa ? 'ファイル エクスプローラー' : 'File Explorer';
  return item.title;
};

export default function App() {
  // 1. Core noob os State Defaults
  const getInitialWindows = (): WindowInstance[] => {
    return [
      {
        id: 'aboad',
        title: 'Aboad',
        icon: 'aboad',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 120,
        y: 60,
        width: 860,
        height: 580,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 420,
        minHeight: 320,
      },
      {
        id: 'notepad',
        title: 'Notepad',
        icon: 'notepad',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 140,
        y: 80,
        width: 580,
        height: 440,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 350,
        minHeight: 250,
      },
      {
        id: 'calculator',
        title: 'Calculator',
        icon: 'calculator',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 220,
        y: 100,
        width: 300,
        height: 440,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 260,
        minHeight: 380,
      },
      {
        id: 'paint',
        title: 'Paint Tool',
        icon: 'paint',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 160,
        y: 60,
        width: 700,
        height: 490,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 500,
        minHeight: 380,
      },
      {
        id: 'files',
        title: 'File Explorer',
        icon: 'files',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 180,
        y: 110,
        width: 720,
        height: 460,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 450,
        minHeight: 300,
      },
      {
        id: 'terminal',
        title: 'Command Prompt',
        icon: 'terminal',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 200,
        y: 130,
        width: 620,
        height: 400,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 400,
        minHeight: 250,
      },
      {
        id: 'excel',
        title: 'Excel Sheets',
        icon: 'excel',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 120,
        y: 120,
        width: 760,
        height: 480,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 500,
        minHeight: 300,
      },
      {
        id: 'settings',
        title: 'Settings',
        icon: 'settings',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 240,
        y: 90,
        width: 580,
        height: 450,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 400,
        minHeight: 300,
      },
      {
        id: 'word',
        title: 'Word Document Editor',
        icon: 'word',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 150,
        y: 70,
        width: 740,
        height: 520,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 400,
        minHeight: 300,
      },
      {
        id: 'powerpoint',
        title: 'PowerPoint Slide Deck',
        icon: 'powerpoint',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 170,
        y: 100,
        width: 760,
        height: 520,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 500,
        minHeight: 380,
      },
      {
        id: 'recycle',
        title: 'Recycle Bin',
        icon: 'recycle',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 190,
        y: 120,
        width: 600,
        height: 440,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 400,
        minHeight: 300,
      },
      {
        id: 'minecraft',
        title: 'Minecraft (Web Client)',
        icon: 'minecraft',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 80,
        y: 40,
        width: 820,
        height: 560,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 450,
        minHeight: 350,
      },
      {
        id: 'videoeditor',
        title: 'nooncut Video Editor',
        icon: 'videoeditor',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 60,
        y: 40,
        width: 960,
        height: 600,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 700,
        minHeight: 500,
      },
      {
        id: 'dotsandboxes',
        title: 'Dots & Boxes',
        icon: 'dotsandboxes',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 140,
        y: 80,
        width: 480,
        height: 580,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 440,
        minHeight: 560,
      },
      {
        id: 'blokus',
        title: 'Blokus',
        icon: 'blokus',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 160,
        y: 60,
        width: 820,
        height: 650,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 640,
        minHeight: 580,
      },
      {
        id: 'wetalks',
        title: 'We talks Chat',
        icon: 'wetalks',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 180,
        y: 80,
        width: 460,
        height: 650,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 360,
        minHeight: 500,
      },
      {
        id: 'nmap',
        title: 'Nmap Practice Terminal',
        icon: 'nmap',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 90,
        y: 50,
        width: 900,
        height: 580,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 600,
        minHeight: 400,
      },
      {
        id: 'flightsim',
        title: '3D Flight Simulator',
        icon: 'flightsim',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 60,
        y: 40,
        width: 1000,
        height: 640,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 800,
        minHeight: 500,
      },
      {
        id: 'chameleon',
        title: 'Chameleon Hide-and-Seek',
        icon: 'chameleon',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 80,
        y: 60,
        width: 900,
        height: 600,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 700,
        minHeight: 500,
      },
      {
        id: 'noobstore',
        title: 'Abord Store',
        icon: 'noobstore',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 140,
        y: 60,
        width: 850,
        height: 580,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 640,
        minHeight: 480,
      },
      {
        id: 'tetris',
        title: 'Neo Tetris',
        icon: 'tetris',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 150,
        y: 50,
        width: 800,
        height: 600,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 400,
        minHeight: 500,
      },
      {
        id: 'sprout',
        title: 'Sprout Studio (IDE & Interpreter)',
        icon: 'sprout',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 120,
        y: 60,
        width: 850,
        height: 620,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 500,
        minHeight: 400,
      },
      {
        id: 'racing',
        title: 'Racing Car Game',
        icon: 'racing',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 90,
        y: 45,
        width: 960,
        height: 620,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 520,
        minHeight: 400,
      },
      {
        id: 'floppybird',
        title: 'Floppy Bird',
        icon: 'floppybird',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 180,
        y: 50,
        width: 520,
        height: 640,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 380,
        minHeight: 480,
      },
      {
        id: 'geoguessr',
        title: 'GeoGuessr',
        icon: 'geoguessr',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 70,
        y: 35,
        width: 1040,
        height: 680,
        prevX: 0,
        prevY: 0,
        prevWidth: 0,
        prevHeight: 0,
        zIndex: 10,
        minWidth: 640,
        minHeight: 460,
      },
    ];
  };

  const HIDDEN_APP_IDS = new Set([
    'browser',
    'notepad',
    'calculator',
    'paint',
    'word',
    'powerpoint',
    'minecraft',
    'videoeditor',
    'dotsandboxes',
    'blokus',
    'wetalks',
    'tetris',
    'sprout',
    'chameleon',
    'flightsim',
    'nmap',
    'terminal',
    'excel',
    'aboad',
    'floppybird',
    'geoguessr'
  ]);

  const [openWindows, setOpenWindows] = useState<WindowInstance[]>(getInitialWindows);

  // ─── Virtual Desktops State ───
  const [desktops, setDesktops] = useState<VirtualDesktop[]>(() => {
    try {
      const saved = localStorage.getItem('webos_virtual_desktops');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'desktop-1', name: 'デスクトップ 1' },
      { id: 'desktop-2', name: 'デスクトップ 2' },
    ];
  });

  const [activeDesktopId, setActiveDesktopId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('webos_active_desktop_id');
      if (saved) return saved;
    } catch (e) {}
    return 'desktop-1';
  });

  const [isTaskViewOpen, setIsTaskViewOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('webos_virtual_desktops', JSON.stringify(desktops));
    } catch (e) {}
  }, [desktops]);

  useEffect(() => {
    try {
      localStorage.setItem('webos_active_desktop_id', activeDesktopId);
    } catch (e) {}
  }, [activeDesktopId]);

  const handleSelectDesktop = (id: string) => {
    setActiveDesktopId(id);
  };

  const handleCreateDesktop = () => {
    const newId = 'desktop-' + Date.now();
    const newNum = desktops.length + 1;
    const newDesktop: VirtualDesktop = {
      id: newId,
      name: `デスクトップ ${newNum}`,
    };
    setDesktops((prev) => [...prev, newDesktop]);
    setActiveDesktopId(newId);
  };

  const handleRemoveDesktop = (id: string) => {
    if (desktops.length <= 1) return;

    const remaining = desktops.filter((d) => d.id !== id);
    const fallbackId = remaining[0].id;

    // Move windows from deleted desktop to fallback desktop
    setOpenWindows((prev) =>
      prev.map((w) => (w.desktopId === id ? { ...w, desktopId: fallbackId } : w))
    );

    setDesktops(remaining);
    if (activeDesktopId === id) {
      setActiveDesktopId(fallbackId);
    }
  };

  const handleRenameDesktop = (id: string, newName: string) => {
    setDesktops((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name: newName } : d))
    );
  };

  const handleMoveWindowToDesktop = (windowId: AppID, targetDesktopId: string) => {
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === windowId ? { ...w, desktopId: targetDesktopId } : w))
    );
  };
  const [pinnedAppIds, setPinnedAppIds] = useState<AppID[]>(() => {
    try {
      const saved = localStorage.getItem('webos_pinned_apps');
      if (saved) {
        const parsed = JSON.parse(saved) as AppID[];
        return parsed.length > 0 ? parsed : ['files', 'settings', 'noobstore'];
      }
      return ['files', 'settings', 'noobstore'];
    } catch {
      return ['files', 'settings', 'noobstore'];
    }
  });

  const handleTogglePin = (appId: AppID) => {
    setPinnedAppIds((prev) => {
      const isPinned = prev.includes(appId);
      const next = isPinned ? prev.filter((id) => id !== appId) : [...prev, appId];
      try {
        localStorage.setItem('webos_pinned_apps', JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const [activeWindowId, setActiveWindowId] = useState<AppID | null>(null);
  const [isStartOpen, setIsStartOpen] = useState(false);

  const openWindowsRef = useRef(openWindows);
  const activeWindowIdRef = useRef(activeWindowId);
  const wetalksIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    openWindowsRef.current = openWindows;
  }, [openWindows]);

  useEffect(() => {
    activeWindowIdRef.current = activeWindowId;
  }, [activeWindowId]);

  // Desktop Items (with Drag & Drop, deletion, recycle bin status)
  const getDefaultDesktopItems = (): DesktopItem[] => {
    return [
      { id: 'recycle', appId: 'recycle', title: 'Recycle Bin', icon: 'recycle', type: 'recycle', x: 24, y: 24 },
      { id: 'settings', appId: 'settings', title: 'Settings', icon: 'settings', type: 'app', x: 24, y: 124 },
      { id: 'files', appId: 'files', title: 'File Explorer', icon: 'files', type: 'app', x: 24, y: 224 },
      { id: 'noobstore', appId: 'noobstore', title: 'Aboard Store', icon: 'noobstore', type: 'app', x: 24, y: 324 },
    ];
  };

  const [desktopItems, setDesktopItems] = useState<DesktopItem[]>([]);
  const [activeFolder, setActiveFolder] = useState<DesktopItem | null>(null);
  const [fileManagerFolderTarget, setFileManagerFolderTarget] = useState<string | null>(null);
  const [desktopContextMenu, setDesktopContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('webos_app_origin', window.location.origin);
    } catch(e) {}

    const loadItems = () => {
      try {
        let installedSysApps: string[] = [];
        try {
          const sysSaved = localStorage.getItem('webos_installed_system_apps');
          if (sysSaved) installedSysApps = JSON.parse(sysSaved);
        } catch (e) {}

        // One-time seed so the newly requested Racing Car Game app is immediately available on Desktop, Start Menu & Store
        const isRacingSeeded = localStorage.getItem('webos_seeded_racing_v1') === '1';
        if (!isRacingSeeded) {
          if (!installedSysApps.includes('racing')) {
            installedSysApps = [...installedSysApps, 'racing'];
            localStorage.setItem('webos_installed_system_apps', JSON.stringify(installedSysApps));
            window.dispatchEvent(new Event('webos_installed_apps_changed'));
          }
          localStorage.setItem('webos_seeded_racing_v1', '1');
        }

        // One-time seed so GeoGuessr is immediately available on Desktop, Start Menu & Store
        const isGeoSeeded = localStorage.getItem('webos_seeded_geoguessr_v1') === '1';
        if (!isGeoSeeded) {
          if (!installedSysApps.includes('geoguessr')) {
            installedSysApps = [...installedSysApps, 'geoguessr'];
            localStorage.setItem('webos_installed_system_apps', JSON.stringify(installedSysApps));
            window.dispatchEvent(new Event('webos_installed_apps_changed'));
          }
          localStorage.setItem('webos_seeded_geoguessr_v1', '1');
        }

        // Clean up removed Battle Royale app from existing browser caches
        try {
          localStorage.removeItem('webos_seeded_battleroyale_v1');
        } catch (e) {}
        if (installedSysApps.includes('battleroyale')) {
          installedSysApps = installedSysApps.filter((id) => id !== 'battleroyale');
          localStorage.setItem('webos_installed_system_apps', JSON.stringify(installedSysApps));
          window.dispatchEvent(new Event('webos_installed_apps_changed'));
        }

        const stored = localStorage.getItem('webos_desktop_items_v2');
        if (stored) {
          let parsed = JSON.parse(stored) as DesktopItem[];
          let changed = false;

          const originalLen = parsed.length;
          parsed = parsed.filter((item) => {
            const appId = item.appId || item.id;
            if (appId === 'battleroyale' || item.id === 'battleroyale' || item.icon === 'battleroyale') return false;
            if (HIDDEN_APP_IDS.has(appId) && !installedSysApps.includes(appId)) return false;
            if (item.id === 'welcome-shortcut' || item.fileName === 'welcome.txt') return false;
            return true;
          });

          if (parsed.length !== originalLen) {
            changed = true;
          }

          // Ensure standard items exist
          const hasRecycle = parsed.some((item) => item.id === 'recycle');
          const hasSettings = parsed.some((item) => item.id === 'settings');
          const hasFiles = parsed.some((item) => item.id === 'files');
          const hasStore = parsed.some((item) => item.id === 'noobstore' || item.appId === 'noobstore');
          const hasRacing = parsed.some((item) => item.id === 'racing' || item.appId === 'racing');
          const hasGeo = parsed.some((item) => item.id === 'geoguessr' || item.appId === 'geoguessr');

          if (!hasRecycle) {
            parsed.push({ id: 'recycle', appId: 'recycle', title: 'Recycle Bin', icon: 'recycle', type: 'recycle', x: 24, y: 24 });
            changed = true;
          }
          if (!hasSettings) {
            parsed.push({ id: 'settings', appId: 'settings', title: 'Settings', icon: 'settings', type: 'app', x: 24, y: 124 });
            changed = true;
          }
          if (!hasFiles) {
            parsed.push({ id: 'files', appId: 'files', title: 'File Explorer', icon: 'files', type: 'app', x: 24, y: 224 });
            changed = true;
          }
          if (!hasStore) {
            parsed.push({ id: 'noobstore', appId: 'noobstore', title: 'Aboard Store', icon: 'noobstore', type: 'app', x: 24, y: 324 });
            changed = true;
          }
          if (!isRacingSeeded && !hasRacing) {
            const racingSpot = findAvailableGridSpot(parsed);
            parsed.push({ id: 'racing', appId: 'racing', title: 'レーシングカーゲーム (LibreCorsa)', icon: 'racing', type: 'app', x: racingSpot.x, y: racingSpot.y });
            changed = true;
          }
          if (!isGeoSeeded && !hasGeo) {
            const geoSpot = findAvailableGridSpot(parsed);
            parsed.push({ id: 'geoguessr', appId: 'geoguessr', title: 'GeoGuessr', icon: 'geoguessr', type: 'app', x: geoSpot.x, y: geoSpot.y });
            changed = true;
          }

          let customInstalled: Array<{ id: string; url?: string; iconChar?: string; iconId?: string }> = [];
          try {
            const customRaw = localStorage.getItem('noobstore_installed_apps');
            if (customRaw) {
              const parsedCustom = JSON.parse(customRaw) as Array<{ id: string; url?: string; iconChar?: string; iconId?: string }>;
              let customMigrated = false;
              const filteredCustom = parsedCustom.filter((c) => {
                if (c.id === 'battleroyale' || c.id === 'curated-battleroyale' || (c.url && c.url.includes('wildfire-ops.internal'))) {
                  customMigrated = true;
                  return false;
                }
                return true;
              });
              customInstalled = filteredCustom.map((c) => {
                if (c.url) {
                  const norm = normalizeCustomWebUrl(c.url);
                  if (norm && norm !== c.url) {
                    customMigrated = true;
                    return { ...c, url: norm };
                  }
                }
                return c;
              });
              if (customMigrated) {
                localStorage.setItem('noobstore_installed_apps', JSON.stringify(customInstalled));
              }
            }
          } catch (e) {}

          parsed = parsed.map((item) => {
            if (item.id === 'recycle') return { ...item, x: 24, y: 24 };
            if (item.id === 'settings') return { ...item, x: 24, y: 124 };
            if (item.id === 'files') return { ...item, x: 24, y: 224 };
            if ((item.appId || item.id).startsWith('custom-app-')) {
              const matched = customInstalled.find((c) => c.id === (item.appId || item.id));
              if (matched) {
                const resolvedIcon = resolveCustomAppIconId(matched);
                if (item.icon !== resolvedIcon) {
                  changed = true;
                  return { ...item, icon: resolvedIcon };
                }
              }
            }
            return item;
          });

          // Automatically resolve overlapping icons on desktop
          const { items: resolved, changed: overlapChanged } = resolveOverlappingItems(parsed);
          parsed = resolved;
          if (overlapChanged) changed = true;

          const orderMap: Record<string, number> = { recycle: 0, settings: 1, files: 2 };
          parsed.sort((a, b) => (orderMap[a.id] ?? 99) - (orderMap[b.id] ?? 99));

          localStorage.setItem('webos_desktop_items_v2', JSON.stringify(parsed));
          setDesktopItems(parsed);
        } else {
          const defaults = getDefaultDesktopItems();
          const racingSpot = findAvailableGridSpot(defaults);
          defaults.push({ id: 'racing', appId: 'racing', title: 'レーシングカーゲーム (LibreCorsa)', icon: 'racing', type: 'app', x: racingSpot.x, y: racingSpot.y });
          const geoSpot = findAvailableGridSpot(defaults);
          defaults.push({ id: 'geoguessr', appId: 'geoguessr', title: 'GeoGuessr', icon: 'geoguessr', type: 'app', x: geoSpot.x, y: geoSpot.y });
          localStorage.setItem('webos_desktop_items_v2', JSON.stringify(defaults));
          setDesktopItems(defaults);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const handleLaunchCustom = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.appId) {
        handleLaunchAppRef.current(customEvent.detail.appId);
      }
    };

    loadItems();
    const handleDesktopChange = () => {
      setTimeout(loadItems, 0);
    };
    window.addEventListener('webos_desktop_items_changed', handleDesktopChange);
    window.addEventListener('webos_launch_custom_app', handleLaunchCustom);
    return () => {
      window.removeEventListener('webos_desktop_items_changed', handleDesktopChange);
      window.removeEventListener('webos_launch_custom_app', handleLaunchCustom);
    };
  }, []);

  const handleDragStop = (id: string, newX: number, newY: number) => {
    setDesktopItems((prev) => {
      const itemToMove = prev.find((i) => i.id === id);
      // Check if dropped onto an existing folder icon
      const targetFolder = prev.find(
        (folder) =>
          folder.type === 'folder' &&
          folder.id !== id &&
          !folder.isDeleted &&
          !folder.folderId &&
          Math.abs(folder.x - newX) < 55 &&
          Math.abs(folder.y - newY) < 55
      );

      let updated: DesktopItem[];
      if (targetFolder && itemToMove && itemToMove.type !== 'folder') {
        // Move item inside folder
        updated = prev.map((item) =>
          item.id === id ? { ...item, folderId: targetFolder.id } : item
        );
      } else {
        updated = prev.map((item) =>
          item.id === id ? { ...item, x: newX, y: newY } : item
        );
      }

      try {
        localStorage.setItem('webos_desktop_items_v2', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    window.dispatchEvent(new Event('webos_desktop_items_changed'));
  };

  const handleMoveToFolder = (itemId: string, folderId: string) => {
    setDesktopItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId ? { ...item, folderId } : item
      );
      try {
        localStorage.setItem('webos_desktop_items_v2', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    window.dispatchEvent(new Event('webos_desktop_items_changed'));
  };

  const handleCreateFolder = () => {
    const spot = findAvailableGridSpot(desktopItems);
    const newFolder: DesktopItem = {
      id: 'folder-' + Date.now(),
      title: settings.language === 'ja' ? '新しいフォルダ' : 'New Folder',
      icon: 'folder',
      type: 'folder',
      x: spot.x,
      y: spot.y,
    };

    setDesktopItems((prev) => {
      const updated = [...prev, newFolder];
      try {
        localStorage.setItem('webos_desktop_items_v2', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    window.dispatchEvent(new Event('webos_desktop_items_changed'));
  };

  const handleRenameItem = (id: string, newTitle: string) => {
    setDesktopItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, title: newTitle } : item
      );
      try {
        localStorage.setItem('webos_desktop_items_v2', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    window.dispatchEvent(new Event('webos_desktop_items_changed'));
  };

  const handleDeleteItem = (id: string) => {
    setDesktopItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, isDeleted: true } : item
      );
      try {
        localStorage.setItem('webos_desktop_items_v2', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    window.dispatchEvent(new Event('webos_desktop_items_changed'));
  };

  const handleOpenItem = (item: DesktopItem) => {
    if (item.type === 'folder') {
      setFileManagerFolderTarget(item.id);
      handleLaunchApp('files');
    } else if (item.type === 'recycle') {
      handleLaunchApp('recycle');
    } else if (item.type === 'app' && item.appId) {
      handleLaunchApp(item.appId);
    } else if (item.type === 'file') {
      if (item.fileName === 'welcome.txt') {
        handleOpenFileInNotepad(
          'welcome.txt',
          'Welcome to Abord OS!\n\nDouble click on Notepad, Paint, or any desktop icons to get started.\n\nAll your work is automatically saved to LocalStorage so you can close this browser tab and return anytime.'
        );
      } else {
        try {
          const stored = localStorage.getItem('webos_files');
          if (stored) {
            const files: VirtualFile[] = JSON.parse(stored);
            const found = files.find(f => f.name === item.title || f.name === item.fileName);
            if (found) {
              handleOpenFileInNotepad(found.name, found.content);
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
        handleOpenFileInNotepad(item.title, '');
      }
    }
  };

  const isTrashFull = desktopItems.some(item => item.isDeleted === true);

  // 2. Settings State & Persistence
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem('webos_settings_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          wallpaper: parsed.wallpaper || WALLPAPERS[0].url,
          isDarkTheme: parsed.isDarkTheme ?? true,
          isToggleTaskbarWithQ: parsed.isToggleTaskbarWithQ ?? true,
          taskbarAlignment: parsed.taskbarAlignment || 'left',
          taskbarBaseColor: parsed.taskbarBaseColor || 'dark',
          taskbarOpacity: parsed.taskbarOpacity !== undefined ? parsed.taskbarOpacity : 85,
          language: parsed.language || 'ja',
          timezone: parsed.timezone || 'Asia/Tokyo',
          region: parsed.region || 'Japan',
          username: parsed.username || 'User',
          usePassword: parsed.usePassword ?? false,
          password: parsed.password || '',
          wallpaperImageHeight: parsed.wallpaperImageHeight || 'low',
          showWeatherWidget: parsed.showWeatherWidget ?? true,
          showClockWidget: parsed.showClockWidget ?? true,
          showQuickNotesWidget: parsed.showQuickNotesWidget ?? true,
          weatherCity: parsed.weatherCity || 'Tokyo',
          clockWidgetType: parsed.clockWidgetType || 'digital',
          showDesktopWeatherWidget: parsed.showDesktopWeatherWidget ?? false,
          showDesktopClockWidget: parsed.showDesktopClockWidget ?? false,
          showDesktopNotesWidget: parsed.showDesktopNotesWidget ?? false,
          desktopWidgetPositions: parsed.desktopWidgetPositions,
          fullscreenImage: parsed.fullscreenImage,
        };
      }
      // Migrate legacy keys if present
      let wall = localStorage.getItem('webos_wallpaper') || WALLPAPERS[0].url;
      const theme = localStorage.getItem('webos_theme_dark');
      const qToggle = localStorage.getItem('webos_q_taskbar_toggle') !== 'false';
      return {
        wallpaper: wall,
        isDarkTheme: theme === 'true',
        isToggleTaskbarWithQ: qToggle,
        taskbarAlignment: 'left',
        taskbarBaseColor: 'dark',
        taskbarOpacity: 85,
        language: 'ja',
        timezone: 'Asia/Tokyo',
        region: 'Japan',
        username: 'User',
        usePassword: false,
        password: '',
        wallpaperImageHeight: 'low',
        showWeatherWidget: true,
        showClockWidget: true,
        showQuickNotesWidget: true,
        weatherCity: 'Tokyo',
        clockWidgetType: 'digital',
        showDesktopWeatherWidget: false,
        showDesktopClockWidget: false,
        showDesktopNotesWidget: false,
      };
    } catch {
      return {
        wallpaper: WALLPAPERS[0].url,
        isDarkTheme: true,
        isToggleTaskbarWithQ: true,
        taskbarAlignment: 'left',
        taskbarBaseColor: 'dark',
        taskbarOpacity: 85,
        language: 'ja',
        timezone: 'Asia/Tokyo',
        region: 'Japan',
        username: 'User',
        usePassword: false,
        password: '',
        wallpaperImageHeight: 'low',
        showWeatherWidget: true,
        showClockWidget: true,
        showQuickNotesWidget: true,
        weatherCity: 'Tokyo',
        clockWidgetType: 'digital',
        showDesktopWeatherWidget: false,
        showDesktopClockWidget: false,
        showDesktopNotesWidget: false,
      };
    }
  });

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isOOBECompleted, setIsOOBECompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('webos_oobe_completed') === 'true';
    } catch {
      return false;
    }
  });

  const handleCompleteOOBE = (configuredSettings: SettingsState) => {
    handleUpdateSettings(configuredSettings);
    try {
      localStorage.setItem('webos_oobe_completed', 'true');
    } catch (e) {
      console.error(e);
    }
    setIsOOBECompleted(true);
    setIsBooting(true);
  };

  const handleUpdateSettings = (newSettings: SettingsState) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('webos_settings_v3', JSON.stringify(newSettings));
      localStorage.setItem('webos_wallpaper', newSettings.wallpaper);
      localStorage.setItem('webos_theme_dark', newSettings.isDarkTheme ? 'true' : 'false');
      localStorage.setItem('webos_q_taskbar_toggle', newSettings.isToggleTaskbarWithQ ? 'true' : 'false');
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const reloadSettings = () => {
      try {
        const stored = localStorage.getItem('webos_settings_v3');
        if (stored) {
          setSettings(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('webos_settings_changed', reloadSettings);
    return () => window.removeEventListener('webos_settings_changed', reloadSettings);
  }, []);

  // ─── Notification Center State & Logic ───
  interface WebOSNotification {
    id: string;
    sender: string;
    text: string;
    timestamp: Date;
    isClosing?: boolean;
    appToLaunch?: string;
    payloadContent?: string;
    payloadTitle?: string;
    roomId?: string;
    roomName?: string;
  }

  const [notifications, setNotifications] = useState<WebOSNotification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<WebOSNotification[]>([]);
  const [isActionCenterOpen, setIsActionCenterOpen] = useState(false);
  const [isTaskbarHidden, setIsTaskbarHidden] = useState(false);

  const notifAudioCtxRef = useRef<AudioContext | null>(null);

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!notifAudioCtxRef.current || notifAudioCtxRef.current.state === 'closed') {
        notifAudioCtxRef.current = new AudioContextClass();
      }
      const ctx = notifAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      const playNote = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playNote(783.99, now, 0.4); // G5
      playNote(1046.50, now + 0.08, 0.6); // C6
    } catch (e) {
      console.warn("AudioContext error:", e);
    }
  };

  const handleCloseNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isClosing: true } : n))
    );
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 300);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setNotificationHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllHistory = () => {
    setNotificationHistory([]);
  };

  const recentNotifMsgIdsRef = useRef<Set<string>>(new Set());

  const triggerWebOSNotification = (
    sender: string,
    text: string,
    meta?: { id?: string; roomId?: string; roomName?: string }
  ) => {
    if (meta?.id) {
      if (recentNotifMsgIdsRef.current.has(meta.id)) return;
      recentNotifMsgIdsRef.current.add(meta.id);
      if (recentNotifMsgIdsRef.current.size > 400) {
        const first = recentNotifMsgIdsRef.current.values().next().value;
        if (first) recentNotifMsgIdsRef.current.delete(first);
      }
    }

    const id = Math.random().toString(36).substring(2, 9);
    const newNotif: WebOSNotification = {
      id,
      sender,
      text,
      timestamp: new Date(),
      roomId: meta?.roomId,
      roomName: meta?.roomName,
    };
    
    setNotifications((prev) => [...prev, newNotif]);
    setNotificationHistory((prev) => [newNotif, ...prev]);
    playNotificationSound();
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      handleCloseNotification(id);
    }, 5000);
  };

  // Global key listener for toggling taskbar with Q key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!settings.isToggleTaskbarWithQ) return;
      if (e.key.toLowerCase() === 'q') {
        const activeEl = document.activeElement;
        if (activeEl) {
          const tagName = activeEl.tagName.toLowerCase();
          const isContentEditable = activeEl.getAttribute('contenteditable') === 'true';
          if (
            tagName === 'input' ||
            tagName === 'textarea' ||
            tagName === 'select' ||
            tagName === 'iframe' ||
            isContentEditable
          ) {
            return;
          }
        }
        setIsTaskbarHidden((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.isToggleTaskbarWithQ]);

  // ─── C-Key Panic / Fullscreen Boss Overlay (画像全画面 or 関数グラフ電卓) ───
  const [isBossOverlayOpen, setIsBossOverlayOpen] = useState(false);

  useEffect(() => {
    const handleCKeyDown = (e: KeyboardEvent) => {
      // Toggle overlay on 'c' or 'C'
      if (e.key === 'c' || e.key === 'C') {
        const activeEl = document.activeElement;
        if (activeEl) {
          const tagName = activeEl.tagName.toLowerCase();
          const isContentEditable = activeEl.getAttribute('contenteditable') === 'true';
          // Don't trigger if user is actively writing in a form/text field or focused inside a web app iframe
          if (
            tagName === 'input' ||
            tagName === 'textarea' ||
            tagName === 'select' ||
            tagName === 'iframe' ||
            isContentEditable
          ) {
            return;
          }
        }
        e.preventDefault();
        setIsBossOverlayOpen((prev) => !prev);
      }
    };

    const handleCustomTrigger = () => {
      setIsBossOverlayOpen(true);
    };

    window.addEventListener('keydown', handleCKeyDown);
    window.addEventListener('webos_toggle_fullscreen_panic', handleCustomTrigger);
    return () => {
      window.removeEventListener('keydown', handleCKeyDown);
      window.removeEventListener('webos_toggle_fullscreen_panic', handleCustomTrigger);
    };
  }, []);

  useEffect(() => {
    const handleIframeMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'WETALKS_NEW_MESSAGE' && e.data.payload) {
        const { id, sender, text, roomId, roomName } = e.data.payload;
        const wetalksWin = openWindowsRef.current.find((w) => w.id === 'wetalks');
        const isViewingSameRoom =
          Boolean(wetalksWin && wetalksWin.isOpen && !wetalksWin.isMinimized) &&
          activeWindowIdRef.current === 'wetalks' &&
          Boolean(roomId) &&
          localStorage.getItem('wetalks_active_viewing_room') === String(roomId);
        if (isViewingSameRoom) return;
        triggerWebOSNotification(sender, text, { id, roomId, roomName });
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);

  // Notify WeTalks iframe when its OS window is active & unminimized so read receipts only fire when visible
  useEffect(() => {
    const wetalksWin = openWindows.find((w) => w.id === 'wetalks');
    const isWeTalksActive =
      Boolean(wetalksWin && wetalksWin.isOpen && !wetalksWin.isMinimized) &&
      activeWindowId === 'wetalks';
    try {
      wetalksIframeRef.current?.contentWindow?.postMessage(
        { type: 'WETALKS_WINDOW_ACTIVE', active: isWeTalksActive },
        '*'
      );
    } catch {}
  }, [openWindows, activeWindowId]);

  // Background WeTalks desktop notification service: instant WS push + fast parallel summary polling
  useEffect(() => {
    const NOTIFIED_IDS_KEY = 'wetalks_notified_msg_ids_v1';
    const seededRooms = new Set<string>();
    let lastUser = '';
    let isPolling = false;
    let disposed = false;
    let ws: WebSocket | null = null;
    let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let subscribedUser = '';

    const getNotifiedSet = (): Set<string> => {
      try {
        const raw = localStorage.getItem(NOTIFIED_IDS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return new Set(parsed.map(String));
        }
      } catch {}
      return new Set();
    };

    const addNotifiedIds = (ids: string[]) => {
      if (ids.length === 0) return;
      try {
        const set = getNotifiedSet();
        let changed = false;
        for (const id of ids) {
          if (id && !set.has(id)) {
            set.add(id);
            changed = true;
          }
        }
        if (changed) {
          const arr = Array.from(set);
          const trimmed = arr.length > 400 ? arr.slice(arr.length - 400) : arr;
          localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(trimmed));
        }
      } catch {}
    };

    const formatRoomDisplayName = (rawName: string, roomType: string | undefined, loggedUser: string, roomId?: string): string => {
      let name = rawName || '';
      if (!name && roomId) {
        try {
          const dbRaw = localStorage.getItem('wetalks_local_db_v3');
          if (dbRaw) {
            const parsed = JSON.parse(dbRaw);
            const found = Array.isArray(parsed?.rooms) ? parsed.rooms.find((r: any) => r && r.id === roomId) : null;
            if (found && found.name) {
              name = String(found.name);
              roomType = found.type || roomType;
            }
          }
        } catch {}
      }
      if ((roomType === 'direct' || (!roomType && name.includes(' & '))) && name) {
        const parts = name.replace(/@/g, '').split(' & ');
        if (parts.length === 2) {
          return parts[0] === loggedUser ? parts[1] : parts[0];
        }
      }
      return name;
    };

    const resolveApiBase = (): string => {
      const backend =
        localStorage.getItem('wetalks_backend_type_v2') ||
        localStorage.getItem('wetalks_backend_type') ||
        'cloudflare';
      if (backend === 'cloudflare') {
        const defaultCf = 'https://wetalks-backend.mozunbu0123.workers.dev';
        let cf = (localStorage.getItem('wetalks_cloudflare_url') || defaultCf).trim();
        if (!cf || cf === 'null' || cf === 'undefined') return defaultCf;
        if (!/^https?:\/\//i.test(cf)) {
          cf = 'https://' + cf.replace(/^\/+/, '');
        }
        cf = cf.replace(/\/api\/wetalks.*$/i, '').replace(/\/+$/, '');
        try {
          const u = new URL(cf);
          return u.origin + (u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/+$/, '') : '');
        } catch {
          return defaultCf;
        }
      }
      if (backend === 'internal') {
        return window.location.origin;
      }
      return '';
    };

    const fetchJsonReadOnly = async (url: string, token: string) => {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(url, {
          method: 'GET',
          headers,
          signal: controller?.signal,
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    const syncWsSubscription = () => {
      const loggedUser = localStorage.getItem('wetalks_logged_in_user') || '';
      const validUser = loggedUser && loggedUser !== 'ゲスト' ? loggedUser : '';
      if (ws && ws.readyState === WebSocket.OPEN && validUser !== subscribedUser) {
        try {
          ws.send(JSON.stringify({ type: 'wetalks_subscribe', username: validUser }));
          subscribedUser = validUser;
        } catch {}
      }
    };

    const pollWeTalksBackground = async () => {
      if (isPolling || disposed) return;
      isPolling = true;
      try {
        const loggedUser = localStorage.getItem('wetalks_logged_in_user') || '';
        if (!loggedUser || loggedUser === 'ゲスト') {
          seededRooms.clear();
          lastUser = '';
          syncWsSubscription();
          return;
        }
        if (loggedUser !== lastUser) {
          seededRooms.clear();
          lastUser = loggedUser;
        }
        syncWsSubscription();

        const base = resolveApiBase();
        if (!base) return;

        const token = localStorage.getItem('wetalks_auth_token') || '';
        const roomsData = await fetchJsonReadOnly(`${base}/api/wetalks/rooms`, token);
        const rawRooms: Array<{ id?: string; name?: string; type?: string; members?: string[] }> = Array.isArray(roomsData)
          ? roomsData
          : roomsData && Array.isArray(roomsData.rooms)
            ? roomsData.rooms
            : [];
        if (rawRooms.length === 0) return;

        let deletedIds: string[] = [];
        try {
          const dRaw = localStorage.getItem('wetalks_deleted_rooms_v1');
          if (dRaw) deletedIds = JSON.parse(dRaw);
        } catch {}

        const localMembersMap = new Map<string, string[]>();
        try {
          const dbRaw = localStorage.getItem('wetalks_local_db_v3');
          if (dbRaw) {
            const parsedDb = JSON.parse(dbRaw);
            if (parsedDb && Array.isArray(parsedDb.rooms)) {
              for (const lr of parsedDb.rooms) {
                if (lr && lr.id && Array.isArray(lr.members)) {
                  localMembersMap.set(String(lr.id), lr.members);
                }
              }
            }
          }
        } catch {}

        const eligibleRooms = rawRooms.filter((r) => {
          if (!r || !r.id || deletedIds.includes(r.id)) return false;
          const members = Array.isArray(r.members) ? r.members : localMembersMap.get(String(r.id));
          if (Array.isArray(members)) {
            return members.includes(loggedUser);
          }
          if (r.type === 'direct' && r.name) {
            const parts = r.name.replace(/@/g, '').split(' & ');
            return parts.length === 2 && (parts[0] === loggedUser || parts[1] === loggedUser);
          }
          return false;
        }).slice(0, 12);

        const wetalksWin = openWindowsRef.current.find((w) => w.id === 'wetalks');
        const activeViewingRoom = localStorage.getItem('wetalks_active_viewing_room') || '';
        const isWeTalksFocused =
          Boolean(wetalksWin && wetalksWin.isOpen && !wetalksWin.isMinimized) &&
          activeWindowIdRef.current === 'wetalks';

        await Promise.allSettled(
          eligibleRooms.map(async (room) => {
            const roomId = String(room.id);
            const msgsData = await fetchJsonReadOnly(
              `${base}/api/wetalks/messages/${encodeURIComponent(roomId)}?summary=1`,
              token
            );
            const msgs: Array<{ id?: string; sender?: string; text?: string; image_base64?: string; has_image?: boolean }> =
              Array.isArray(msgsData)
                ? msgsData
                : msgsData && Array.isArray(msgsData.messages)
                  ? msgsData.messages
                  : [];

            const seedKey = `${loggedUser}:${roomId}`;
            const isSeedPass = !seededRooms.has(seedKey);
            seededRooms.add(seedKey);

            const notifiedSet = getNotifiedSet();
            const newIds: string[] = [];
            const roomDisplayName = formatRoomDisplayName(room.name || '', room.type, loggedUser, roomId);

            for (const msg of msgs) {
              if (!msg || !msg.id) continue;
              const msgId = String(msg.id);
              if (notifiedSet.has(msgId)) continue;
              newIds.push(msgId);
              if (isSeedPass) continue;
              if (msg.sender && msg.sender !== loggedUser) {
                if (isWeTalksFocused && activeViewingRoom === roomId) {
                  continue;
                }
                triggerWebOSNotification(
                  msg.sender,
                  msg.text || ((msg.image_base64 || msg.has_image) ? '📷 画像を送信しました' : ''),
                  { id: msgId, roomId, roomName: roomDisplayName }
                );
              }
            }

            addNotifiedIds(newIds);
          })
        );
      } catch {
        // Silent background poll failure tolerance
      } finally {
        isPolling = false;
      }
    };

    const connectOsWetalksWs = () => {
      if (disposed) return;
      if (window.location?.hostname?.endsWith('github.io')) return;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
      try {
        const wsOrigin = window.location.origin.replace(/^http/i, 'ws');
        if (!wsOrigin.startsWith('ws')) return;
        ws = new WebSocket(`${wsOrigin}/ws`);
        ws.onopen = () => {
          subscribedUser = '';
          syncWsSubscription();
        };
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(String(ev.data || ''));
            if (data && data.type === 'admin_broadcast' && data.broadcast) {
              processIncomingBroadcastRef.current(data.broadcast, false);
              return;
            }
            if (!data || data.type !== 'wetalks_event' || data.event !== 'message') return;
            const loggedUser = localStorage.getItem('wetalks_logged_in_user') || '';
            if (!loggedUser || loggedUser === 'ゲスト') return;

            const roomId = String(data.roomId || '');
            if (!roomId) return;

            const wetalksWin = openWindowsRef.current.find((w) => w.id === 'wetalks');
            const activeViewingRoom = localStorage.getItem('wetalks_active_viewing_room') || '';
            const isWeTalksFocused =
              Boolean(wetalksWin && wetalksWin.isOpen && !wetalksWin.isMinimized) &&
              activeWindowIdRef.current === 'wetalks';

            const msg = data.message;
            if (msg && msg.id && msg.sender) {
              const msgId = String(msg.id);
              const sender = String(msg.sender);
              if (Array.isArray(data.members) && !data.members.includes(loggedUser)) {
                return;
              }
              if (sender !== loggedUser) {
                const notifiedSet = getNotifiedSet();
                if (!notifiedSet.has(msgId)) {
                  addNotifiedIds([msgId]);
                  if (!(isWeTalksFocused && activeViewingRoom === roomId)) {
                    const roomDisplayName = formatRoomDisplayName(String(data.roomName || ''), undefined, loggedUser, roomId);
                    triggerWebOSNotification(
                      sender,
                      String(msg.text || '') || (msg.has_image ? '📷 画像を送信しました' : ''),
                      { id: msgId, roomId, roomName: roomDisplayName }
                    );
                  }
                }
              }
              return;
            }
            // Fallback: wake up background poll immediately when event omits preview metadata
            pollWeTalksBackground();
          } catch {}
        };
        ws.onclose = () => {
          ws = null;
          subscribedUser = '';
          if (!disposed) {
            wsReconnectTimer = setTimeout(connectOsWetalksWs, 2500);
          }
        };
        ws.onerror = () => {
          try { ws?.close(); } catch {}
        };
      } catch {}
    };

    const handleStorageOrFocus = () => {
      syncWsSubscription();
      pollWeTalksBackground();
    };

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'wetalks_logged_in_user' || e.key === 'wetalks_backend_type_v2') {
        handleStorageOrFocus();
      }
    };

    const initialTimer = setTimeout(pollWeTalksBackground, 200);
    const pollInterval = setInterval(pollWeTalksBackground, 1500);
    connectOsWetalksWs();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleStorageOrFocus);
    window.addEventListener('online', handleStorageOrFocus);
    document.addEventListener('visibilitychange', handleStorageOrFocus);

    return () => {
      disposed = true;
      clearTimeout(initialTimer);
      clearInterval(pollInterval);
      if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleStorageOrFocus);
      window.removeEventListener('online', handleStorageOrFocus);
      document.removeEventListener('visibilitychange', handleStorageOrFocus);
      try { ws?.close(); } catch {}
    };
  }, []);

  // State to inject files loaded from explorer into notepad app directly
  const [notepadFilePayload, setNotepadFilePayload] = useState<{ name: string; content: string } | null>(null);
  const [wordFilePayload, setWordFilePayload] = useState<{ name: string; content: string } | null>(null);
  const [sproutFilePayload, setSproutFilePayload] = useState<{ name: string; content: string } | null>(null);
  const [terminalBatPayload, setTerminalBatPayload] = useState<{ name: string; content: string; runId: number } | null>(null);

  // Startup, Reboot, and Shutdown states
  const [isBooting, setIsBooting] = useState<boolean>(false);
  const [isReboot, setIsReboot] = useState<boolean>(false);
  const [isShutDown, setIsShutDown] = useState<boolean>(false);

  const handleSoftReboot = () => {
    setIsReboot(true);
    setIsBooting(true);
    // Close all open windows
    setOpenWindows((prev) =>
      prev.map((win) => ({
        ...win,
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
      }))
    );
  };

  const handleShutdown = () => {
    setIsShutDown(true);
    // Close all open windows
    setOpenWindows((prev) =>
      prev.map((win) => ({
        ...win,
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
      }))
    );
  };

  // Listen for administrator broadcasts
  useEffect(() => {
    const handleAdminBroadcast = (e: Event) => {
      const customEvent = e as CustomEvent<{ sender: string; title: string; text: string }>;
      if (customEvent.detail) {
        const { sender, title, text } = customEvent.detail;
        
        // Trigger notification with Word app metadata
        const id = Math.random().toString(36).substring(2, 9);
        const newNotif: WebOSNotification = {
          id,
          sender: sender || '管理者 (Admin)',
          text: `管理者から重要連絡：「${title}」があります。ここをクリックしてWordで開いて確認してください。`,
          timestamp: new Date(),
          appToLaunch: 'word',
          payloadContent: text,
          payloadTitle: title,
        };
        
        setNotifications((prev) => [...prev, newNotif]);
        setNotificationHistory((prev) => [newNotif, ...prev]);
        playNotificationSound();
        
        // Auto-close after 15 seconds to ensure visibility
        setTimeout(() => {
          handleCloseNotification(id);
        }, 15000);
      }
    };
    window.addEventListener('WEBOS_BROADCAST_NOTIFICATION', handleAdminBroadcast);
    return () => window.removeEventListener('WEBOS_BROADCAST_NOTIFICATION', handleAdminBroadcast);
  }, []);

  const getOrCreateClientId = (): string => {
    try {
      let cid = localStorage.getItem('webos_client_id');
      if (!cid) {
        cid = 'client-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem('webos_client_id', cid);
      }
      return cid;
    } catch {
      return 'client-anon';
    }
  };

  const processIncomingBroadcast = (bc: any, isSilentSeed: boolean) => {
    if (!bc || !bc.id) return;
    const myCid = getOrCreateClientId();
    if (bc.senderClientId && bc.senderClientId === myCid) {
      return;
    }
    try {
      const seenRaw = localStorage.getItem('webos_seen_broadcasts');
      const seen: string[] = seenRaw ? JSON.parse(seenRaw) : [];
      if (seen.includes(bc.id)) return;
      seen.push(bc.id);
      localStorage.setItem('webos_seen_broadcasts', JSON.stringify(seen.slice(-200)));
    } catch {}

    if (isSilentSeed) return;

    const targetUser = typeof bc.targetUser === 'string' ? bc.targetUser.trim() : '*';
    if (targetUser && targetUser !== '*') {
      const osUser = (settings.username || '').trim().toLowerCase();
      const chatUser = (localStorage.getItem('wetalks_logged_in_user') || '').trim().toLowerCase();
      const targetLower = targetUser.toLowerCase();
      if (targetLower !== osUser && targetLower !== chatUser) {
        return;
      }
    }

    if (bc.kind === 'bat') {
      const batName = String(bc.batFilename || bc.title || 'script.bat');
      const batCode = String(bc.batCode || bc.text || '');
      if (!batCode) return;

      // Save received .bat into Downloads in virtual C: drive
      try {
        const rawFiles = localStorage.getItem('webos_files');
        const files: VirtualFile[] = rawFiles ? JSON.parse(rawFiles) : [];
        const filtered = files.filter(
          (f) => !(f.path.toLowerCase() === 'downloads' && f.name.toLowerCase() === batName.toLowerCase())
        );
        filtered.push({
          name: batName,
          path: 'Downloads',
          content: batCode,
          type: 'txt',
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('webos_files', JSON.stringify(filtered));
        window.dispatchEvent(new Event('webos_files_changed'));
      } catch (e) {
        console.error(e);
      }

      const notifId = bc.id;
      const newNotif: WebOSNotification = {
        id: notifId,
        sender: bc.sender || 'システム管理者 (sudo)',
        text: bc.autoRun
          ? `📜 バッチファイル「${batName}」を受信・自動実行しました (Downloadsに保存)`
          : `📜 バッチファイル「${batName}」を受信しました。クリックしてターミナルで実行できます。`,
        timestamp: new Date(),
        appToLaunch: 'terminal',
        payloadContent: batCode,
        payloadTitle: batName,
      };
      setNotifications((prev) => [...prev, newNotif]);
      setNotificationHistory((prev) => [newNotif, ...prev]);
      playNotificationSound();
      setTimeout(() => {
        handleCloseNotification(notifId);
      }, 15000);

      if (bc.autoRun) {
        setTerminalBatPayload({ name: batName, content: batCode, runId: Date.now() });
        handleLaunchAppRef.current('terminal');
      }
      return;
    }

    const notifId = bc.id;
    const newNotif: WebOSNotification = {
      id: notifId,
      sender: bc.sender || '管理者 (Admin)',
      text: `管理者から重要連絡：「${bc.title}」があります。ここをクリックしてWordで開いて確認してください。`,
      timestamp: new Date(),
      appToLaunch: 'word',
      payloadContent: bc.text,
      payloadTitle: bc.title,
    };

    setNotifications((prev) => [...prev, newNotif]);
    setNotificationHistory((prev) => [newNotif, ...prev]);
    playNotificationSound();

    setTimeout(() => {
      handleCloseNotification(notifId);
    }, 15000);
  };

  const processIncomingBroadcastRef = useRef(processIncomingBroadcast);
  processIncomingBroadcastRef.current = processIncomingBroadcast;

  // Poll online administrator broadcasts from shared server database
  useEffect(() => {
    const getSafeAbsoluteUrl = (path: string): string => {
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
      }
      const cleanPath = path.startsWith('/') ? path : '/' + path;
      try {
        if (window.location && window.location.origin && window.location.origin !== 'null') {
          return window.location.origin + cleanPath;
        }
      } catch (e) {}
      try {
        if (window.location && window.location.href && window.location.href.startsWith('http')) {
          const parsed = new URL(window.location.href);
          return parsed.protocol + '//' + parsed.host + cleanPath;
        }
      } catch (e) {}
      return cleanPath;
    };

    let isFirstRun = true;

    const pollBroadcasts = async () => {
      try {
        const url = getSafeAbsoluteUrl('/api/admin/broadcasts');
        const res = await fetch(url);
        if (!res.ok) return;
        const broadcasts = await res.json();
        if (Array.isArray(broadcasts)) {
          broadcasts.forEach((bc: any) => {
            processIncomingBroadcastRef.current(bc, isFirstRun);
          });
        }
        isFirstRun = false;
      } catch (err) {
        console.error('Error polling broadcasts:', err);
      }
    };

    pollBroadcasts();
    const interval = setInterval(pollBroadcasts, 3000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize wallpaper changes on custom event updates
  useEffect(() => {
    const handleWpChange = () => {
      try {
        const wall = localStorage.getItem('webos_wallpaper');
        if (wall) {
          setSettings((prev) => ({ ...prev, wallpaper: wall }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('webos_wallpaper_changed', handleWpChange);
    return () => window.removeEventListener('webos_wallpaper_changed', handleWpChange);
  }, []);

  // 3. Focus Manager: Increment Z-Index
  const handleFocusWindow = (id: string) => {
    setActiveWindowId(id as AppID);
    setOpenWindows((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.zIndex), 10);
      return prev.map((w) => (w.id === id ? { ...w, zIndex: maxZ + 1, isMinimized: false } : w));
    });
  };

  // 4. Update Window positions
  const handleUpdateWindow = (id: string, updates: Partial<WindowInstance>) => {
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  };

  // 5. Open/Launch Application
  const handleLaunchApp = (appId: AppID) => {
    setOpenWindows((prev) => {
      const exists = prev.some((w) => w.id === appId);
      if (!exists) {
        let title = getLocalizedAppTitle(appId, settings.language, appId);
        let iconName = appId;
        if (appId.startsWith('custom-app-')) {
          title = 'Web App';
          iconName = 'custom-app-🌐';
          try {
            const stored = localStorage.getItem('noobstore_installed_apps');
            if (stored) {
              const installed = JSON.parse(stored);
              const found = installed.find((a: any) => a.id === appId);
              if (found) {
                title = found.title;
                iconName = resolveCustomAppIconId(found);
              }
            }
          } catch (e) {
            console.error(e);
          }
        }

        const maxZ = Math.max(...prev.map((w) => w.zIndex), 10);
        const activeCount = prev.filter((w) => w.isOpen).length;
        const staggerX = (activeCount * 28) % 150;
        const staggerY = (activeCount * 28) % 150;

        const newWin: WindowInstance = {
          id: appId,
          title: title,
          icon: iconName,
          isOpen: true,
          isMinimized: false,
          isMaximized: false,
          x: 100 + staggerX,
          y: 50 + staggerY,
          width: 860,
          height: 580,
          prevX: 0,
          prevY: 0,
          prevWidth: 0,
          prevHeight: 0,
          zIndex: maxZ + 1,
          minWidth: 400,
          minHeight: 300,
          desktopId: activeDesktopId,
        };
        return [...prev, newWin];
      }

      // Calculate stagger offset
      const activeCount = prev.filter((w) => w.isOpen).length;
      const staggerX = (activeCount * 28) % 150;
      const staggerY = (activeCount * 28) % 150;

      return prev.map((w) => {
        if (w.id === appId) {
          // If window belongs to a different desktop, bring it to current active desktop
          return {
            ...w,
            isOpen: true,
            isMinimized: false,
            desktopId: activeDesktopId,
            x: w.isOpen ? w.x : 100 + staggerX,
            y: w.isOpen ? w.y : 50 + staggerY,
          };
        }
        return w;
      });
    });
    handleFocusWindow(appId);
    setIsStartOpen(false);
  };
  const handleLaunchAppRef = useRef(handleLaunchApp);
  handleLaunchAppRef.current = handleLaunchApp;

  // ─── Keyboard Shortcuts for macOS & Windows/Linux (Virtual Desktops, App Management) ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing in input, textarea or contenteditable element
      const target = e.target as HTMLElement;
      const targetTag = target?.tagName?.toLowerCase();
      if (
        targetTag === 'input' ||
        targetTag === 'textarea' ||
        targetTag === 'select' ||
        target?.isContentEditable
      ) {
        return;
      }

      const keyLower = e.key.toLowerCase();
      const isMacUser = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent);
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // 1. macOS Spotlight / Start Menu toggle (Cmd + Space)
      if (e.metaKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        setIsStartOpen((prev) => !prev);
        return;
      }

      // 2. macOS Window Close (Cmd + W)
      if (e.metaKey && (keyLower === 'w')) {
        if (activeWindowId) {
          e.preventDefault();
          handleCloseWindow(activeWindowId);
          return;
        }
      }

      // 3. macOS Window Minimize (Cmd + M)
      if (e.metaKey && (keyLower === 'm')) {
        if (activeWindowId) {
          e.preventDefault();
          handleUpdateWindow(activeWindowId, { isMinimized: true });
          setActiveWindowId(null);
          return;
        }
      }

      // 4. macOS Open Preferences / Settings (Cmd + ,)
      if (e.metaKey && e.key === ',') {
        e.preventDefault();
        handleLaunchApp('settings');
        return;
      }

      // 5. Win + Tab (or Alt + Tab or Ctrl + Up / Cmd + Tab) -> Toggle Task View (Mission Control)
      if ((e.key === 'Tab' && (e.metaKey || e.altKey)) || (e.ctrlKey && e.key === 'ArrowUp')) {
        e.preventDefault();
        setIsTaskViewOpen((prev) => !prev);
        return;
      }

      // 6. Virtual Desktop switching
      // Supports:
      // - macOS Mission control swipe key: Ctrl + ArrowLeft/Right or Cmd + Option + ArrowLeft/Right
      // - Windows: Ctrl + Win + ArrowLeft/Right or Ctrl + Alt + ArrowLeft/Right
      const isMacDesktopSwitch = isMacUser && (e.ctrlKey || (e.metaKey && e.altKey));
      const hasSystemModifier = isMacDesktopSwitch || (e.ctrlKey && e.metaKey) || (e.ctrlKey && e.altKey) || (e.altKey && e.metaKey);

      if (hasSystemModifier) {
        if (e.key === 'ArrowLeft' || keyLower === 'arrowleft') {
          e.preventDefault();
          const currentIndex = desktops.findIndex((d) => d.id === activeDesktopId);
          if (currentIndex > 0) {
            setActiveDesktopId(desktops[currentIndex - 1].id);
          } else if (desktops.length > 1) {
            // Wrap around to last desktop
            setActiveDesktopId(desktops[desktops.length - 1].id);
          }
          return;
        }

        if (e.key === 'ArrowRight' || keyLower === 'arrowright') {
          e.preventDefault();
          const currentIndex = desktops.findIndex((d) => d.id === activeDesktopId);
          if (currentIndex < desktops.length - 1) {
            setActiveDesktopId(desktops[currentIndex + 1].id);
          } else if (desktops.length > 1) {
            // Wrap around to first desktop
            setActiveDesktopId(desktops[0].id);
          }
          return;
        }

        // Ctrl + Win + D (or Cmd + Option + D) -> Create new virtual desktop
        if (keyLower === 'd') {
          e.preventDefault();
          handleCreateDesktop();
          setIsTaskViewOpen(true);
          return;
        }

        // Ctrl + Win + F4 -> Close current desktop
        if (e.key === 'F4') {
          e.preventDefault();
          if (desktops.length > 1) {
            handleRemoveDesktop(activeDesktopId);
          }
          return;
        }
      }

      // Close Task View with Escape
      if (e.key === 'Escape' && isTaskViewOpen) {
        setIsTaskViewOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [desktops, activeDesktopId, isTaskViewOpen, activeWindowId, openWindows]);

  // 6. Close Window
  const handleCloseWindow = (id: string) => {
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isOpen: false, isMinimized: false } : w))
    );
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  // 7. Click Taskbar Icons (Toggle minimize/restore)
  const handleTaskbarIconClick = (appId: AppID) => {
    const win = openWindows.find((w) => w.id === appId);
    if (!win) return;

    if (!win.isOpen) {
      handleLaunchApp(appId);
    } else if (win.isMinimized) {
      handleFocusWindow(appId);
    } else if (activeWindowId === appId) {
      // Toggle minimize if already focused
      handleUpdateWindow(appId, { isMinimized: true });
      setActiveWindowId(null);
    } else {
      handleFocusWindow(appId);
    }
  };

  // 8. Open text files from explorer directly into Notepad
  const handleOpenFileInSprout = (name: string, content: string) => {
    setSproutFilePayload({ name, content });
    handleLaunchApp('sprout');
  };

  const handleOpenFileInNotepad = (name: string, content: string) => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.sp')) {
      handleOpenFileInSprout(name, content);
    } else if (lower.endsWith('.bat') || lower.endsWith('.cmd')) {
      setTerminalBatPayload({ name, content, runId: Date.now() });
      handleLaunchApp('terminal');
    } else {
      setNotepadFilePayload({ name, content });
      handleLaunchApp('notepad');
    }
  };

  // 9. Reset and format entire WebOS localStorage values
  const handleResetSystem = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const openNotificationTarget = (notif: WebOSNotification) => {
    if (notif.appToLaunch === 'word') {
      setWordFilePayload({
        name: notif.payloadTitle || 'Admin Message.docx',
        content: notif.payloadContent || notif.text,
      });
      handleLaunchApp('word');
      handleFocusWindow('word');
      return;
    }
    if (notif.appToLaunch === 'terminal' && notif.payloadContent) {
      setTerminalBatPayload({
        name: notif.payloadTitle || 'script.bat',
        content: notif.payloadContent,
        runId: Date.now(),
      });
      handleLaunchApp('terminal');
      handleFocusWindow('terminal');
      return;
    }
    const targetApp = notif.appToLaunch || 'wetalks';
    if (targetApp === 'wetalks' && notif.roomId) {
      try {
        localStorage.setItem('wetalks_pending_open_room', notif.roomId);
      } catch {}
    }
    handleLaunchApp(targetApp);
    handleFocusWindow(targetApp);
    if (targetApp === 'wetalks' && notif.roomId) {
      setTimeout(() => {
        try {
          wetalksIframeRef.current?.contentWindow?.postMessage(
            { type: 'WETALKS_OPEN_ROOM', roomId: notif.roomId },
            '*'
          );
        } catch {}
      }, 60);
    }
  };

  const getCustomAppUrl = (appId: string): string => {
    try {
      const stored = localStorage.getItem('noobstore_installed_apps');
      if (stored) {
        const installed = JSON.parse(stored);
        const found = installed.find((a: any) => a.id === appId);
        if (found && found.url) return normalizeCustomWebUrl(found.url) || found.url;
      }
    } catch (e) {
      console.error(e);
    }
    return 'about:blank';
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#010103] select-none font-sans"
      id="desktop-canvas-container"
    >
      <motion.div
        initial={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
        animate={!isBooting ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 1.05, filter: "blur(10px)" }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 overflow-hidden"
        id="desktop-interactive-layer"
      >
        {/* Animated Wallpaper Layer with Smooth Crossfade */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={settings.wallpaper}
            initial={{ opacity: 0, scale: 1.04, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${settings.wallpaper})`,
            }}
          />
        </AnimatePresence>

        {/* Dark tint overlay */}
        <div className="absolute inset-0 bg-black/15 pointer-events-none z-0" />

        {/* Dynamic Desktop Icons (Draggable, Context Menu, Rename/Delete) */}
        <div 
          className={`absolute inset-0 pointer-events-none select-none z-10 transition-all duration-300 ease-in-out ${isTaskbarHidden ? 'pb-0' : 'pb-12'}`} 
          id="desktop-icons-area"
          onContextMenu={(e) => {
            e.preventDefault();
            setDesktopContextMenu({ x: e.clientX, y: e.clientY });
          }}
          onClick={() => {
            if (desktopContextMenu) setDesktopContextMenu(null);
          }}
        >
          {/* Desktop Floating Widgets Layer */}
          <DesktopWidgets
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            language={settings.language}
          />

          <div className="relative w-full h-full pointer-events-auto">
            {desktopItems
              .filter((item) => !item.isDeleted && !item.folderId)
              .map((item) => {
                const availableFolders = desktopItems
                  .filter((f) => f.type === 'folder' && !f.isDeleted && !f.folderId && f.id !== item.id)
                  .map((f) => ({ id: f.id, title: f.title }));

                return (
                  <DesktopIcon
                    key={item.id}
                    id={item.id}
                    title={getDesktopTitle(item, settings.language === 'ja')}
                    icon={item.type === 'recycle' ? (isTrashFull ? 'recycle-full' : 'recycle') : item.icon}
                    type={item.type}
                    x={item.x}
                    y={item.y}
                    onOpen={() => handleOpenItem(item)}
                    onDragStop={handleDragStop}
                    onRename={handleRenameItem}
                    onDelete={handleDeleteItem}
                    isPinned={pinnedAppIds.includes(item.id as AppID)}
                    onTogglePin={(id) => handleTogglePin(id as AppID)}
                    language={settings.language}
                    folders={availableFolders}
                    onMoveToFolder={handleMoveToFolder}
                  />
                );
              })}
          </div>
        </div>

        {/* Desktop Background Context Menu */}
        {desktopContextMenu && (
          <div
            style={{
              position: 'fixed',
              left: `${desktopContextMenu.x}px`,
              top: `${desktopContextMenu.y}px`,
              zIndex: 99999,
            }}
            className="bg-slate-900/95 backdrop-blur-md text-slate-100 rounded-xl shadow-2xl border border-slate-700 py-2 min-w-[210px] text-xs font-semibold animate-in fade-in zoom-in-95 duration-100 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setDesktopContextMenu(null);
                handleCreateFolder();
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-white"
            >
              <FolderPlus className="w-4 h-4 text-amber-400" />
              <span>{settings.language === 'ja' ? '新規フォルダを作成' : 'Create New Folder'}</span>
            </button>

            <button
              onClick={() => {
                setDesktopContextMenu(null);
                const { items: rearranged } = resolveOverlappingItems(desktopItems);
                setDesktopItems(rearranged);
                localStorage.setItem('webos_desktop_items_v2', JSON.stringify(rearranged));
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-slate-200"
            >
              <Grid className="w-4 h-4 text-blue-400" />
              <span>{settings.language === 'ja' ? 'アイコン位置を整理' : 'Arrange Desktop Icons'}</span>
            </button>

            <div className="h-[1px] bg-slate-800 my-1" />

            {/* Quick Desktop Widget Toggle Buttons */}
            <button
              onClick={() => {
                handleUpdateSettings({ ...settings, showDesktopWeatherWidget: !settings.showDesktopWeatherWidget });
                setDesktopContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors text-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <CloudSun className="w-4 h-4 text-sky-400" />
                <span>{settings.language === 'ja' ? '天気ウィジェット' : 'Weather Widget'}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${settings.showDesktopWeatherWidget ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                {settings.showDesktopWeatherWidget ? (settings.language === 'ja' ? '表示中' : 'ON') : (settings.language === 'ja' ? '非表示' : 'OFF')}
              </span>
            </button>

            <button
              onClick={() => {
                handleUpdateSettings({ ...settings, showDesktopClockWidget: !settings.showDesktopClockWidget });
                setDesktopContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors text-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <ClockIcon className="w-4 h-4 text-purple-400" />
                <span>{settings.language === 'ja' ? '時計ウィジェット' : 'Clock Widget'}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${settings.showDesktopClockWidget ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                {settings.showDesktopClockWidget ? (settings.language === 'ja' ? '表示中' : 'ON') : (settings.language === 'ja' ? '非表示' : 'OFF')}
              </span>
            </button>

            <button
              onClick={() => {
                handleUpdateSettings({ ...settings, showDesktopNotesWidget: !settings.showDesktopNotesWidget });
                setDesktopContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors text-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <StickyNoteIcon className="w-4 h-4 text-amber-400" />
                <span>{settings.language === 'ja' ? 'クイックメモ' : 'Sticky Notes'}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${settings.showDesktopNotesWidget ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                {settings.showDesktopNotesWidget ? (settings.language === 'ja' ? '表示中' : 'ON') : (settings.language === 'ja' ? '非表示' : 'OFF')}
              </span>
            </button>

            <div className="h-[1px] bg-slate-800 my-1" />

            <button
              onClick={() => {
                setDesktopContextMenu(null);
                handleLaunchApp('settings');
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-slate-200"
            >
              <SettingsIcon className="w-4 h-4 text-slate-400" />
              <span>{settings.language === 'ja' ? 'システム設定' : 'System Settings'}</span>
            </button>
          </div>
        )}

        {/* Folder View Modal */}
        {activeFolder && (
          <FolderViewWindow
            folder={activeFolder}
            allItems={desktopItems}
            onUpdateItems={(newItems) => {
              setDesktopItems(newItems);
              try {
                localStorage.setItem('webos_desktop_items_v2', JSON.stringify(newItems));
              } catch (e) {
                console.error(e);
              }
              window.dispatchEvent(new Event('webos_desktop_items_changed'));
            }}
            onLaunchApp={(appId) => {
              handleLaunchApp(appId as AppID);
            }}
            onClose={() => setActiveFolder(null)}
            language={settings.language}
          />
        )}

      {/* Floating Windows Stack */}
      <div 
        className={`absolute inset-0 overflow-hidden pointer-events-none transition-all duration-300 ease-in-out ${isTaskbarHidden ? 'pb-0' : 'pb-12'}`} 
        id="desktop-windows-canvas"
      >
        <div className="w-full h-full relative pointer-events-auto">
          {openWindows.map((win) => {
            const isVisibleOnCurrentDesktop =
              win.desktopId === activeDesktopId ||
              (!win.desktopId && activeDesktopId === desktops[0]?.id) ||
              win.desktopId === 'all';

            if (!win.isOpen || !isVisibleOnCurrentDesktop) return null;

            const localizedWin = {
              ...win,
              title: getLocalizedAppTitle(win.id, settings.language, win.title),
            };

            return (
              <Window
                key={win.id}
                windowState={localizedWin}
                onUpdate={handleUpdateWindow}
                onFocus={handleFocusWindow}
                onClose={handleCloseWindow}
                isTaskbarHidden={isTaskbarHidden}
                isToggleTaskbarWithQ={settings.isToggleTaskbarWithQ}
                language={settings.language}
                osTheme={settings.osTheme}
              >
                {/* Lazy/Dynamic render corresponding applications */}
                {win.id === 'browser' && (
                  <BrowserApp onOpenNotepadWithFile={handleOpenFileInNotepad} />
                )}
                {win.id === 'notepad' && (
                  <NotepadApp
                    initialFileContent={notepadFilePayload?.content}
                    initialFileName={notepadFilePayload?.name}
                    onFileSaved={() => setNotepadFilePayload(null)}
                  />
                )}
                {win.id === 'calculator' && <CalculatorApp />}
                {win.id === 'paint' && <PaintApp />}
                {win.id === 'files' && (
                  <FileManagerApp 
                    onOpenFileInNotepad={handleOpenFileInNotepad}
                    targetFolderId={fileManagerFolderTarget}
                    onClearTargetFolder={() => setFileManagerFolderTarget(null)}
                    onLaunchApp={(appId) => handleLaunchApp(appId as AppID)}
                    language={settings.language}
                  />
                )}
                {win.id === 'terminal' && (
                  <TerminalApp
                    openWindows={openWindows}
                    settings={settings}
                    onUpdateSettings={handleUpdateSettings}
                    onLaunchApp={(appId) => handleLaunchApp(appId as AppID)}
                    onCloseWindow={handleCloseWindow}
                    onOpenFile={handleOpenFileInNotepad}
                    onOpenRawNotepad={(name, content) => {
                      setNotepadFilePayload({ name, content });
                      handleLaunchApp('notepad');
                    }}
                    onRestartSystem={handleSoftReboot}
                    onLockSystem={() => setIsLocked(true)}
                    onNotify={(sender, text) => triggerWebOSNotification(sender, text)}
                    pendingBatPayload={terminalBatPayload}
                    onBatPayloadConsumed={() => setTerminalBatPayload(null)}
                  />
                )}
                {win.id === 'excel' && <ExcelApp />}
                {win.id === 'settings' && (
                  <SettingsApp
                    settings={settings}
                    onUpdateSettings={handleUpdateSettings}
                    onResetSystem={handleResetSystem}
                    onRestartSystem={handleSoftReboot}
                    onReRunOOBE={() => setIsOOBECompleted(false)}
                  />
                )}
                {win.id === 'word' && (
                  <WordApp
                    initialFileContent={wordFilePayload?.content}
                    initialFileName={wordFilePayload?.name}
                    onFileSaved={() => setWordFilePayload(null)}
                  />
                )}
                {win.id === 'powerpoint' && <PowerPointApp />}
                {win.id === 'recycle' && <RecycleBinApp />}
                {win.id === 'minecraft' && (
                  <MinecraftApp
                    windowId={win.id}
                    isWindowActive={activeWindowId === win.id && !win.isMinimized}
                  />
                )}
                {win.id === 'videoeditor' && <VideoEditorApp />}
                {win.id === 'dotsandboxes' && <DotsAndBoxesApp />}
                {win.id === 'blokus' && <BlokusApp />}
                {win.id === 'nmap' && (
                  <NmapApp onClose={() => handleCloseWindow('nmap')} />
                )}
                {win.id === 'flightsim' && (
                  <FlightSimulatorApp onClose={() => handleCloseWindow('flightsim')} />
                )}
                {win.id === 'chameleon' && (
                  <ChameleonGameApp />
                )}
                {win.id === 'wetalks' && (
                  <iframe
                    ref={wetalksIframeRef}
                    srcDoc={CHAT_APP_HTML}
                    title="We talks Chat"
                    allow="camera; microphone; autoplay; display-capture"
                    tabIndex={0}
                    onLoad={() => {
                      const isActive = !win.isMinimized && activeWindowId === 'wetalks';
                      try {
                        wetalksIframeRef.current?.contentWindow?.postMessage(
                          { type: 'WETALKS_WINDOW_ACTIVE', active: isActive },
                          '*'
                        );
                      } catch {}
                    }}
                    className="w-full h-full border-none bg-zinc-950"
                  />
                )}
                {win.id === 'noobstore' && <NoobStoreApp />}
                {win.id === 'tetris' && <TetrisApp />}
                {win.id === 'sprout' && (
                  <SproutApp
                    initialFileContent={sproutFilePayload?.content}
                    initialFileName={sproutFilePayload?.name}
                    onFileSaved={() => setSproutFilePayload(null)}
                  />
                )}
                {win.id === 'aboad' && <AboadApp />}
                {win.id === 'racing' && (
                  <RacingGameApp
                    windowId={win.id}
                    isWindowActive={activeWindowId === win.id && !win.isMinimized}
                  />
                )}
                {win.id === 'floppybird' && (
                  <FloppyBirdApp
                    windowId={win.id}
                    isWindowActive={activeWindowId === win.id && !win.isMinimized}
                  />
                )}
                {win.id === 'geoguessr' && (
                  <GeoGuessrApp
                    username={settings.username}
                    language={settings.language}
                  />
                )}
                {win.id.startsWith('custom-app-') && (
                  <WebGameFrameApp
                    url={getCustomAppUrl(win.id)}
                    title={win.title}
                    accentColor="sky"
                    loadingText="Loading Web App..."
                    windowId={win.id}
                    isWindowActive={activeWindowId === win.id && !win.isMinimized}
                  />
                )}
              </Window>
            );
          })}
        </div>
      </div>

      {/* Centered Taskbar Panel */}
      <Taskbar
        openWindows={openWindows}
        activeWindowId={activeWindowId}
        onStartClick={() => setIsStartOpen(!isStartOpen)}
        isStartOpen={isStartOpen}
        onTaskbarIconClick={handleTaskbarIconClick}
        isDarkTheme={settings.isDarkTheme}
        pinnedAppIds={pinnedAppIds}
        onTogglePin={handleTogglePin}
        isTaskbarHidden={isTaskbarHidden}
        isActionCenterOpen={isActionCenterOpen}
        onToggleActionCenter={() => setIsActionCenterOpen(!isActionCenterOpen)}
        notificationCount={notificationHistory.length}
        taskbarAlignment={settings.taskbarAlignment}
        taskbarBaseColor={settings.taskbarBaseColor}
        taskbarOpacity={settings.taskbarOpacity}
        language={settings.language}
        timezone={settings.timezone}
        onTaskViewClick={() => setIsTaskViewOpen(!isTaskViewOpen)}
        isTaskViewOpen={isTaskViewOpen}
        activeDesktopName={desktops.find((d) => d.id === activeDesktopId)?.name}
        osTheme={settings.osTheme}
      />

      {/* Windows 11 Task View Modal Overlay */}
      <TaskViewModal
        isOpen={isTaskViewOpen}
        onClose={() => setIsTaskViewOpen(false)}
        desktops={desktops}
        activeDesktopId={activeDesktopId}
        onSelectDesktop={handleSelectDesktop}
        onCreateDesktop={handleCreateDesktop}
        onRemoveDesktop={handleRemoveDesktop}
        onRenameDesktop={handleRenameDesktop}
        windows={openWindows}
        onFocusWindow={handleFocusWindow}
        onCloseWindow={handleCloseWindow}
        onMoveWindowToDesktop={handleMoveWindowToDesktop}
        isDarkTheme={settings.isDarkTheme}
        language={settings.language}
      />

      {/* Windows 10 Action Center Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[360px] shadow-2xl transition-all duration-300 ease-in-out z-[55] flex flex-col border-l select-none ${
          settings.isDarkTheme
            ? 'glass-dark border-white/5 text-gray-200 bg-zinc-950/95'
            : 'glass border-gray-200/50 text-gray-800 bg-white/95'
        } ${
          isActionCenterOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        id="windows10-action-center"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 dark:border-white/10 light:border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{settings.language === 'ja' ? '通知とアクション' : 'Notifications & Actions'}</span>
            {notificationHistory.length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {notificationHistory.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {notificationHistory.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="text-xs text-blue-500 hover:underline hover:text-blue-400 font-semibold"
                id="action-center-clear-all"
              >
                {settings.language === 'ja' ? 'すべてクリア' : 'Clear All'}
              </button>
            )}
            <button
              onClick={() => setIsActionCenterOpen(false)}
              className="text-xs font-bold opacity-60 hover:opacity-100 p-1 font-mono"
              id="action-center-close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Action Center Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
          {/* Section: Notifications */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase opacity-50 mb-1">{settings.language === 'ja' ? '通知' : 'Notifications'}</span>
            {notificationHistory.length === 0 ? (
              <div className="text-center py-8 text-xs opacity-50 italic">
                {settings.language === 'ja' ? '新しい通知はありません' : 'No new notifications'}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {notificationHistory.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      setIsActionCenterOpen(false);
                      openNotificationTarget(notif);
                    }}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.01] ${
                      settings.isDarkTheme
                        ? 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-200'
                        : 'bg-black/5 border-black/5 hover:bg-black/10 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold flex items-center gap-1">
                        {notif.appToLaunch === 'word'
                          ? `📝 Word (${notif.sender})`
                          : `💬 We talks${notif.roomName ? ` · ${notif.roomName}` : ''} (${notif.sender})`}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistoryItem(notif.id);
                        }}
                        className="text-[11px] font-bold opacity-50 hover:opacity-100 p-0.5 font-mono"
                      >
                        &times;
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-80 break-words line-clamp-3">
                      {notif.text}
                    </p>
                    <span className="text-[9px] opacity-40 block text-right mt-1.5">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-white/10 w-full shrink-0 my-1" />

          {/* Section: Calendar */}
          <div className="flex flex-col gap-2 shrink-0">
            <span className="text-[11px] font-bold tracking-wider uppercase opacity-50 mb-1">{settings.language === 'ja' ? 'カレンダー' : 'Calendar'}</span>
            <ActionCenterCalendar isDarkTheme={settings.isDarkTheme} language={settings.language} />
          </div>
        </div>
      </div>

      {/* Action Center overlay backdrop */}
      {isActionCenterOpen && (
        <div
          onClick={() => setIsActionCenterOpen(false)}
          className="fixed inset-0 bg-transparent z-[50]"
        />
      )}

      {/* Start Menu Overlay */}
      <StartMenu
        isOpen={isStartOpen}
        onClose={() => setIsStartOpen(false)}
        isDarkTheme={settings.isDarkTheme}
        onLaunchApp={handleLaunchApp}
        onResetSystem={handleResetSystem}
        onRestartSystem={handleSoftReboot}
        onShutdownSystem={() => setIsLocked(true)}
        username={settings.username}
        language={settings.language}
        taskbarAlignment={settings.taskbarAlignment}
        taskbarBaseColor={settings.taskbarBaseColor}
        taskbarOpacity={settings.taskbarOpacity}
        showWeatherWidget={settings.showWeatherWidget}
        showClockWidget={settings.showClockWidget}
        showQuickNotesWidget={settings.showQuickNotesWidget}
        weatherCity={settings.weatherCity}
        clockWidgetType={settings.clockWidgetType}
        osTheme={settings.osTheme}
      />

      {/* Lock Screen Overlay */}
      <AnimatePresence>
        {isLocked && (
          <LockScreen
            username={settings.username}
            password={settings.password}
            wallpaper={settings.wallpaper}
            language={settings.language}
            timezone={settings.timezone}
            onUnlock={() => setIsLocked(false)}
          />
        )}
      </AnimatePresence>

      {/* Fluent Toast Notification Center */}
      <div 
        className="fixed bottom-16 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none"
        id="webos-toast-container"
      >
        {notifications.map((notif) => {
          const isClosing = notif.isClosing;
          return (
            <div
              key={notif.id}
              className={`w-80 backdrop-blur-md border rounded-xl shadow-2xl p-4 flex flex-col gap-2 transition-all duration-300 ease-out pointer-events-auto transform ${
                settings.isDarkTheme
                  ? 'bg-zinc-900/85 text-zinc-100 border-zinc-800/80'
                  : 'bg-white/85 text-gray-800 border-gray-200/80'
              } ${
                isClosing
                  ? 'translate-x-[110%] opacity-0 scale-95'
                  : 'translate-x-0 opacity-100 scale-100'
              }`}
              id={`toast-${notif.id}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between w-full border-b border-gray-100/10 pb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">
                    {notif.appToLaunch === 'word' ? '📝' : '💬'}
                  </span>
                  <span className="text-[11px] font-bold tracking-tight uppercase opacity-75 truncate">
                    {notif.appToLaunch === 'word'
                      ? 'Microsoft Word'
                      : notif.roomName
                        ? `We talks · ${notif.roomName}`
                        : 'We talks'}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseNotification(notif.id);
                  }}
                  className="text-xs font-bold opacity-60 hover:opacity-100 transition-opacity p-0.5 font-mono"
                  title="Close Notification"
                  id={`toast-close-btn-${notif.id}`}
                >
                  &times;
                </button>
              </div>

              {/* Body */}
              <div 
                onClick={() => {
                  handleCloseNotification(notif.id);
                  openNotificationTarget(notif);
                }}
                className="flex flex-col gap-0.5 cursor-pointer hover:opacity-90"
              >
                <span className="text-xs font-bold truncate">
                  {notif.appToLaunch === 'word' ? '管理者からの重要連絡' : `${notif.sender} からの新着メッセージ`}
                </span>
                <p className="text-[11px] opacity-80 line-clamp-2 italic leading-relaxed">
                  {notif.appToLaunch === 'word' ? `「${notif.payloadTitle}」が届きました。` : `"${notif.text}"`}
                </p>
              </div>

              {/* Action Button */}
              <div className="flex justify-end mt-1">
                <button
                  onClick={() => {
                    handleCloseNotification(notif.id);
                    openNotificationTarget(notif);
                  }}
                  className="text-[10px] font-bold text-blue-500 dark:text-blue-400 hover:underline flex items-center gap-1"
                  id={`toast-action-btn-${notif.id}`}
                >
                  {notif.appToLaunch === 'word' ? 'Wordで確認する \u2192' : 'トークを開く \u2192'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>

    {/* Boot Screen Overlay */}
    <AnimatePresence mode="wait">
      {isBooting && (
        <BootScreen
          isReboot={isReboot}
          onComplete={() => {
            setIsBooting(false);
            setIsReboot(false);
          }}
        />
      )}
    </AnimatePresence>

    {/* OOBE Initial Setup Overlay */}
    <AnimatePresence>
      {!isOOBECompleted && !isBooting && !isShutDown && (
        <OOBESetup
          initialSettings={settings}
          onComplete={handleCompleteOOBE}
        />
      )}
    </AnimatePresence>

    {/* Simulated Shutdown Screen Overlay */}
    {isShutDown && (
      <div 
        onClick={() => {
          setIsShutDown(false);
          setIsReboot(false);
          setIsBooting(true); // Trigger startup on power on
        }}
        className="fixed inset-0 bg-[#020203] z-[9999999] flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden"
        id="webos-shutdown-screen"
      >
        {/* Subtle star particle fields */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_50%)] pointer-events-none" />

        <div className="flex flex-col items-center gap-6 animate-pulse" style={{ animationDuration: '4s' }}>
          {/* Glowing Power Button */}
          <div className="w-20 h-20 rounded-full border-2 border-zinc-850 flex items-center justify-center hover:border-zinc-500 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.01)] hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] bg-zinc-950">
            <svg 
              className="w-8 h-8 text-zinc-600 hover:text-blue-500 transition-colors"
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </div>
          
          <div className="text-center flex flex-col gap-1.5 font-sans">
            <p className="text-sm font-light tracking-[0.2em] text-zinc-400 uppercase">
              System Powered Off
            </p>
            <p className="text-[11px] text-zinc-600 tracking-wide font-sans">
              画面をクリックするか、電源ボタンを押して起動してください
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Fullscreen Boss / Disguise / Graphing Calculator Overlay */}
    <FullscreenBossOverlay
      isOpen={isBossOverlayOpen}
      onClose={() => setIsBossOverlayOpen(false)}
      fullscreenImage={settings.fullscreenImage}
      language={settings.language}
    />
  </div>
  );
}

// ==========================================
// Windows 10 Action Center Calendar Component
// ==========================================
interface ActionCenterCalendarProps {
  isDarkTheme: boolean;
  language?: 'ja' | 'en';
}

const ActionCenterCalendar: React.FC<ActionCenterCalendarProps> = ({ isDarkTheme, language = 'ja' }) => {
  const isJa = language === 'ja';
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = isJa
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  const days = [];

  // Previous Month Padding Days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      day: prevTotalDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevTotalDays - i)
    });
  }

  // Current Month Days
  const today = new Date();
  for (let i = 1; i <= totalDays; i++) {
    const isToday =
      today.getDate() === i &&
      today.getMonth() === month &&
      today.getFullYear() === year;
    days.push({
      day: i,
      isCurrentMonth: true,
      isToday,
      date: new Date(year, month, i)
    });
  }

  // Next Month Padding Days
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  const weekDays = isJa
    ? ['日', '月', '火', '水', '木', '金', '土']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-colors ${
      isDarkTheme 
        ? 'bg-black/30 border-white/5 text-gray-200' 
        : 'bg-white/50 border-gray-200/50 text-gray-800 shadow-sm'
    }`}>
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold tracking-tight">
          {isJa ? `${year}年 ${monthNames[month]}` : `${monthNames[month]} ${year}`}
        </span>
        <div className="flex gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 px-1.5 text-[10px] font-bold rounded hover:bg-white/10 dark:hover:bg-black/10 transition-colors text-inherit"
          >
            &larr;
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 px-1.5 text-[10px] font-bold rounded hover:bg-white/10 dark:hover:bg-black/10 transition-colors text-inherit"
          >
            &rarr;
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-bold opacity-60">
        {weekDays.map((wd, idx) => (
          <div key={idx} className={idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : ''}>
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
        {days.map((item, idx) => (
          <div
            key={idx}
            className={`p-1 rounded flex items-center justify-center font-semibold h-6.5 w-full transition-all ${
              item.isToday
                ? 'bg-blue-600 text-white font-bold shadow-md ring-1 ring-blue-400'
                : item.isCurrentMonth
                ? 'opacity-100 hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer'
                : 'opacity-30 hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer text-gray-400 dark:text-gray-500'
            }`}
          >
            {item.day}
          </div>
        ))}
      </div>
    </div>
  );
};
