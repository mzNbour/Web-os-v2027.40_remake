import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Trash2, 
  Globe, 
  Flame, 
  Check, 
  Play, 
  AppWindow, 
  RefreshCw, 
  AlertTriangle, 
  ChevronRight, 
  Info,
  Package,
  Layers,
  Gamepad2,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Bookmark,
  Loader2
} from 'lucide-react';
import { AppIcon } from '../AppIcon';
import { CURATED_URL_TO_ICON_ID, resolveCustomAppIconId } from '../CustomAppIcons';
import { SYSTEM_STORE_APPS, StoreAppInfo, getInstalledSystemAppIds, setInstalledSystemAppIds } from '../../data/storeApps';
import { findAvailableGridSpot } from '../../utils/grid';
import { deriveCustomAppTitleFromUrl, normalizeCustomWebUrl } from '../../utils/customWebUrl';

interface InstalledCustomApp {
  id: string;
  title: string;
  url: string;
  iconChar: string;
  iconId?: string;
  installedAt: string;
}

interface CuratedCustomApp {
  id: string;
  title: string;
  url: string;
  desc: string;
  iconChar: string;
  category: 'Game' | 'Creative' | 'Education' | 'Utilities';
  developer: string;
  appIconId?: string;
  systemAppId?: string;
}

const CURATED_CUSTOM_APPS: CuratedCustomApp[] = [
  {
    id: 'curated-racing',
    title: 'レーシングカーゲーム (LibreCorsa)',
    url: 'https://librecorsa.org/',
    desc: 'ブラウザで本格レースを楽しめるオープンソース・レーシングカーゲーム。',
    iconChar: '🏎️',
    category: 'Game',
    developer: 'LibreCorsa',
    appIconId: 'racing',
    systemAppId: 'racing',
  },
  {
    id: 'curated-flappy',
    title: 'Floppy Bird',
    url: 'https://nebez.github.io/floppybird/',
    desc: 'タイミング良く飛んで緑の土管をすり抜ける中毒性抜群の名作アクション。',
    iconChar: '🐦',
    category: 'Game',
    developer: 'Nebez Briefkani',
    appIconId: 'floppybird',
    systemAppId: 'floppybird',
  },
  {
    id: 'curated-tetris',
    title: 'Tetris Web Classic',
    url: 'https://rawcdn.githack.com/jakesgordon/javascript-tetris/master/index.html',
    desc: 'Pure HTML5/JS で遊べる王道クラシック・テトリス。',
    iconChar: '🧱',
    category: 'Game',
    developer: 'Jake Gordon',
    appIconId: 'cweb-tetris',
  },
  {
    id: 'curated-react-tetris',
    title: 'React Tetris (携帯ゲーム機風)',
    url: 'https://chvin.github.io/react-tetris/',
    desc: '懐かしの携帯LCDゲーム機を再現した高機能テトリス。',
    iconChar: '🕹️',
    category: 'Game',
    developer: 'chvin',
    appIconId: 'cweb-react-tetris',
  },
  {
    id: 'curated-2048',
    title: '2048',
    url: 'https://gabrielecirulli.github.io/2048/',
    desc: '同じ数字タイルを合体させて 2048 を目指す定番スライドパズル。',
    iconChar: '🔢',
    category: 'Game',
    developer: 'Gabriele Cirulli',
    appIconId: 'cweb-2048',
  },
  {
    id: 'curated-2048-cupcakes',
    title: '2048 Cupcakes',
    url: 'https://0x0800.github.io/2048-CUPCAKES/',
    desc: '可愛いスイーツを合体させて豪華なケーキを作る 2048 パズル。',
    iconChar: '🧁',
    category: 'Game',
    developer: '0x0800',
    appIconId: 'cweb-2048-cupcakes',
  },
  {
    id: 'curated-doge2048',
    title: 'Doge 2048',
    url: 'https://doge2048.com/',
    desc: '柴犬ミームのアニメーションタイルで遊ぶユーモア版 2048。',
    iconChar: '🐕',
    category: 'Game',
    developer: 'Doge2048',
    appIconId: 'cweb-doge2048',
  },
  {
    id: 'curated-clumsy-bird',
    title: 'Clumsy Bird',
    url: 'https://ellisonleao.github.io/clumsy-bird/',
    desc: 'HTML5製で軽快に遊べる横スクロール飛行アクションゲーム。',
    iconChar: '🐤',
    category: 'Game',
    developer: 'Ellison Leão',
    appIconId: 'cweb-clumsy-bird',
  },
  {
    id: 'curated-pacman',
    title: 'Google Pac-Man',
    url: 'https://macek.github.io/google_pacman/',
    desc: '迷路のドットを食べながらゴーストから逃げる名作パックマン。',
    iconChar: '👾',
    category: 'Game',
    developer: 'macek / Namco Tribute',
    appIconId: 'cweb-pacman',
  },
  {
    id: 'curated-dino',
    title: 'T-Rex Dino Runner',
    url: 'https://wayou.github.io/t-rex-runner/',
    desc: 'サボテンとプテラノドンを飛び越えて走り続ける恐竜ランナー。',
    iconChar: '🦖',
    category: 'Game',
    developer: 'wayou',
    appIconId: 'cweb-dino',
  },
  {
    id: 'curated-hexgl',
    title: 'HexGL (WebGL 3Dレース)',
    url: 'https://hexgl.bkcore.com/play/',
    desc: '近未来の反重力マシンで疾走する本格 WebGL ハイスピードレース。',
    iconChar: '🚀',
    category: 'Game',
    developer: 'Thibaut Despoulain',
    appIconId: 'cweb-hexgl',
  },
  {
    id: 'curated-outrun-racer',
    title: 'OutRun Retro Racer',
    url: 'https://rawcdn.githack.com/jakesgordon/javascript-racer/master/v4.final.html',
    desc: '疑似3D視点で高速道路を駆け抜けるクラシック・アーケードレース。',
    iconChar: '🏁',
    category: 'Game',
    developer: 'Jake Gordon',
    appIconId: 'cweb-outrun',
  },
  {
    id: 'curated-tower',
    title: 'Tower Building',
    url: 'https://iamkun.github.io/tower_game/',
    desc: 'タイミング良くフロアを落として超高層タワーを積み上げるゲーム。',
    iconChar: '🏗️',
    category: 'Game',
    developer: 'iamkun',
    appIconId: 'cweb-tower',
  },
  {
    id: 'curated-alien-invasion',
    title: 'Alien Invasion',
    url: 'https://cykod.github.io/AlienInvasion/',
    desc: '迫り来るエイリアン編隊を迎え撃つレトロ縦スクロールシューティング。',
    iconChar: '🛸',
    category: 'Game',
    developer: 'cykod',
    appIconId: 'cweb-alien',
  },
  {
    id: 'curated-asteroids',
    title: 'HTML5 Asteroids',
    url: 'https://rawcdn.githack.com/dmcinnes/HTML5-Asteroids/master/index.html',
    desc: 'ベクターグラフィックが美しい全方向宇宙シューティング名作。',
    iconChar: '☄️',
    category: 'Game',
    developer: 'Doug McInnes',
    appIconId: 'cweb-asteroids',
  },
  {
    id: 'curated-space-huggers',
    title: 'Space Huggers',
    url: 'https://killedbyapixel.github.io/SpaceHuggers/',
    desc: '破壊できるドット絵ステージを突き進む爽快ラン＆ガンアクション。',
    iconChar: '💥',
    category: 'Game',
    developer: 'Frank Force',
    appIconId: 'cweb-space-huggers',
  },
  {
    id: 'curated-snakes',
    title: 'JavaScript Snakes',
    url: 'https://rawcdn.githack.com/jakesgordon/javascript-snakes/master/index.html',
    desc: 'フルーツを食べてどんどん長くなる王道スネークゲーム。',
    iconChar: '🐍',
    category: 'Game',
    developer: 'Jake Gordon',
    appIconId: 'cweb-snakes',
  },
  {
    id: 'curated-breakout',
    title: 'Breakout Classic',
    url: 'https://rawcdn.githack.com/jakesgordon/javascript-breakout/master/index.html',
    desc: 'パドルでボールを跳ね返してカラフルなブロックを崩す名作。',
    iconChar: '🏓',
    category: 'Game',
    developer: 'Jake Gordon',
    appIconId: 'cweb-breakout',
  },
  {
    id: 'curated-pong',
    title: 'Pong Retro',
    url: 'https://rawcdn.githack.com/jakesgordon/javascript-pong/master/index.html',
    desc: '1人でも2人でも遊べる、ビデオゲームの原点ピンポン対戦。',
    iconChar: '🎾',
    category: 'Game',
    developer: 'Jake Gordon',
    appIconId: 'cweb-pong',
  },
  {
    id: 'curated-boulderdash',
    title: 'Boulder Dash JS',
    url: 'https://rawcdn.githack.com/jakesgordon/javascript-boulderdash/master/index.html',
    desc: '落石を避けながら地下迷宮のダイヤモンドを集めるパズルアクション。',
    iconChar: '💎',
    category: 'Game',
    developer: 'Jake Gordon',
    appIconId: 'cweb-boulderdash',
  },
  {
    id: 'curated-minesweeper',
    title: 'Minesweeper Classic',
    url: 'https://nickarocho.github.io/minesweeper/',
    desc: '数字をヒントに地雷原をクリアする定番思考ゲーム（マインスイーパー）。',
    iconChar: '💣',
    category: 'Game',
    developer: 'Nick Arocho',
    appIconId: 'cweb-minesweeper',
  },
  {
    id: 'curated-emoji-minesweeper',
    title: 'Emoji Minesweeper',
    url: 'https://muan.github.io/emoji-minesweeper/',
    desc: 'ポップな絵文字アイコンで楽しめる新感覚マインスイーパー。',
    iconChar: '🚩',
    category: 'Game',
    developer: 'Mu-An Chiou',
    appIconId: 'cweb-emoji-minesweeper',
  },
  {
    id: 'curated-solitaire',
    title: 'Solitaire JS (クロンダイク)',
    url: 'https://bfa.github.io/solitaire-js/',
    desc: 'スムーズなドラッグ操作で遊べる定番トランプ・ソリティア。',
    iconChar: '🃏',
    category: 'Game',
    developer: 'bfa',
    appIconId: 'cweb-solitaire',
  },
  {
    id: 'curated-astray',
    title: 'Astray 3D Maze',
    url: 'https://wwwtyro.github.io/Astray/',
    desc: 'WebGL の立体迷宮からゴールを目指して脱出する3Dパズルゲーム。',
    iconChar: '🌀',
    category: 'Game',
    developer: 'Rye Terrell',
    appIconId: 'cweb-astray',
  },
  {
    id: 'curated-celeste',
    title: 'Celeste Classic (PICO-8)',
    url: 'https://celesteclassic.github.io/',
    desc: 'ダッシュ＆壁ジャンプで雪山の頂上を目指す人気高難度プラットフォームゲーム。',
    iconChar: '🏔️',
    category: 'Game',
    developer: 'Maddy Thorson & Noel Berry',
    appIconId: 'cweb-celeste',
  },
  {
    id: 'curated-0hh1',
    title: '0h h1 ロジックパズル',
    url: 'https://0hh1.com/',
    desc: '赤と青の2色タイルをルール通りに埋めるシンプルで美しい論理パズル。',
    iconChar: '🔴',
    category: 'Game',
    developer: 'Q42',
    appIconId: 'cweb-0hh1',
  },
  {
    id: 'curated-0hn0',
    title: '0h n0 ロジックパズル',
    url: 'https://0hn0.com/',
    desc: '中央の数字が見える方向を数えてボードを完成させる数独風パズル。',
    iconChar: '🔵',
    category: 'Game',
    developer: 'Q42',
    appIconId: 'cweb-0hn0',
  },
  {
    id: 'curated-cookie',
    title: 'Cookie Clicker',
    url: 'https://ozh.github.io/cookieclicker/',
    desc: 'クッキーを焼いて工場や魔法で無限に生産量を増やす放置クリッカー。',
    iconChar: '🍪',
    category: 'Game',
    developer: 'Orteil',
    appIconId: 'cweb-cookie',
  },
  {
    id: 'curated-darkroom',
    title: 'A Dark Room',
    url: 'https://adarkroom.doublespeakgames.com/',
    desc: '暗い部屋の焚き火から物語と世界が広がる名作テキストサバイバルRPG。',
    iconChar: '🔥',
    category: 'Game',
    developer: 'Doublespeak Games',
    appIconId: 'cweb-darkroom',
  },
  {
    id: 'curated-wordle',
    title: 'Wordle Classic (Reactle)',
    url: 'https://reactle.vercel.app/',
    desc: '6回以内の推測で5文字の英単語を当てる世界的人気ワードパズル。',
    iconChar: '🔤',
    category: 'Game',
    developer: 'Reactle',
    appIconId: 'cweb-wordle',
  },
  {
    id: 'curated-pixel',
    title: 'Pixel Art Paint',
    url: 'https://pixelcraft.web.app/',
    desc: 'レトロな8-bit風ドット絵を楽しく描けるペイントアプリ。',
    iconChar: '🎨',
    category: 'Creative',
    developer: 'PixelCraft',
    appIconId: 'cweb-pixel',
  },
  {
    id: 'curated-flexbox',
    title: 'Flexbox Froggy',
    url: 'https://flexboxfroggy.com/',
    desc: 'カエルたちを蓮の葉に導きながら CSS Flexbox を学べる学習ゲーム。',
    iconChar: '🐸',
    category: 'Education',
    developer: 'Codepip',
    appIconId: 'cweb-flexbox',
  },
  {
    id: 'curated-emoji',
    title: 'Emoji Finder Studio',
    url: 'https://emojifinder.com/',
    desc: 'Unicode 絵文字を検索・コピーしてすぐに使える便利ツール。',
    iconChar: '🔍',
    category: 'Utilities',
    developer: 'EmojiFinder',
    appIconId: 'cweb-emoji',
  },
];

export const NoobStoreApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'apps' | 'games' | 'library' | 'custom'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [installedSystemApps, setInstalledSystemApps] = useState<string[]>([]);
  const [installedCustomApps, setInstalledCustomApps] = useState<InstalledCustomApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<StoreAppInfo | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [customFilter, setCustomFilter] = useState<'all' | 'games' | 'other'>('all');
  const [customNotice, setCustomNotice] = useState<string | null>(null);

  // Download Progress State
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  // Custom App Importer State
  const [urlInput, setUrlInput] = useState('');
  const [searchedUrl, setSearchedUrl] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customIconChar, setCustomIconChar] = useState('🌐');

  // Load installed apps (and migrate any legacy/flaky custom Web URLs automatically)
  const reloadInstalledApps = () => {
    setInstalledSystemApps(getInstalledSystemAppIds());
    try {
      const stored = localStorage.getItem('noobstore_installed_apps');
      if (stored) {
        const parsed = JSON.parse(stored) as InstalledCustomApp[];
        let mutated = false;
        const migrated = parsed.map((app) => {
          const normalized = normalizeCustomWebUrl(app.url);
          if (normalized && normalized !== app.url) {
            mutated = true;
            return { ...app, url: normalized };
          }
          return app;
        });
        if (mutated) {
          localStorage.setItem('noobstore_installed_apps', JSON.stringify(migrated));
        }
        setInstalledCustomApps(migrated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    reloadInstalledApps();
    window.addEventListener('webos_installed_apps_changed', reloadInstalledApps);
    window.addEventListener('webos_desktop_items_changed', reloadInstalledApps);
    return () => {
      window.removeEventListener('webos_installed_apps_changed', reloadInstalledApps);
      window.removeEventListener('webos_desktop_items_changed', reloadInstalledApps);
    };
  }, []);

  // Animated Download & Install
  const startDownloadApp = (app: StoreAppInfo) => {
    if (downloadProgress[app.id] !== undefined) return;

    setDownloadProgress((prev) => ({ ...prev, [app.id]: 5 }));

    let currentProgress = 5;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 20) + 15;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => {
          handleInstallSystemApp(app);
          setDownloadProgress((prev) => {
            const next = { ...prev };
            delete next[app.id];
            return next;
          });
        }, 300);
      } else {
        setDownloadProgress((prev) => ({ ...prev, [app.id]: currentProgress }));
      }
    }, 250);
  };

  // System App Install Handler
  const handleInstallSystemApp = (app: StoreAppInfo) => {
    const current = getInstalledSystemAppIds();
    if (!current.includes(app.id)) {
      const updated = [...current, app.id];
      setInstalledSystemAppIds(updated);
      setInstalledSystemApps(updated);

      // Add shortcut to Desktop if not present
      try {
        const storedItems = localStorage.getItem('webos_desktop_items_v2');
        let desktopItems = storedItems ? JSON.parse(storedItems) : [];
        if (!desktopItems.some((item: any) => item.appId === app.id || item.id === app.id)) {
          const spot = findAvailableGridSpot(desktopItems);
          desktopItems.push({
            id: app.id,
            appId: app.id,
            title: app.titleJa,
            icon: app.icon,
            type: 'app',
            x: spot.x,
            y: spot.y,
          });
          localStorage.setItem('webos_desktop_items_v2', JSON.stringify(desktopItems));
          window.dispatchEvent(new Event('webos_desktop_items_changed'));
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // System App Uninstall Handler
  const handleUninstallSystemApp = (appId: string) => {
    const current = getInstalledSystemAppIds();
    const updated = current.filter((id) => id !== appId);
    setInstalledSystemAppIds(updated);
    setInstalledSystemApps(updated);

    // Remove shortcut from Desktop
    try {
      const storedItems = localStorage.getItem('webos_desktop_items_v2');
      if (storedItems) {
        let desktopItems = JSON.parse(storedItems);
        desktopItems = desktopItems.filter((item: any) => item.appId !== appId && item.id !== appId);
        localStorage.setItem('webos_desktop_items_v2', JSON.stringify(desktopItems));
        window.dispatchEvent(new Event('webos_desktop_items_changed'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Launch App directly in OS
  const handleLaunchApp = (appId: string) => {
    window.dispatchEvent(new CustomEvent('webos_launch_custom_app', {
      detail: { appId }
    }));
  };

  // Custom Web App Install Handler
  const handleInstallCustomWeb = (title: string, url: string, iconChar: string, iconId?: string) => {
    const normalizedUrl = normalizeCustomWebUrl(url);
    if (!title || !normalizedUrl) return;
    let latest: InstalledCustomApp[] = [];
    try {
      const stored = localStorage.getItem('noobstore_installed_apps');
      if (stored) latest = JSON.parse(stored);
    } catch (e) {}

    if (latest.some(a => normalizeCustomWebUrl(a.url) === normalizedUrl)) {
      setCustomNotice('このURLのアプリは既にインストールされています。');
      setTimeout(() => setCustomNotice(null), 3000);
      return;
    }

    const resolvedIconId = iconId || CURATED_URL_TO_ICON_ID[normalizedUrl] || CURATED_URL_TO_ICON_ID[url.trim()];
    const newId = 'custom-app-' + Date.now();
    const newApp: InstalledCustomApp = {
      id: newId,
      title: title.trim(),
      url: normalizedUrl,
      iconChar,
      ...(resolvedIconId ? { iconId: resolvedIconId } : {}),
      installedAt: new Date().toISOString(),
    };

    const updated = [...latest, newApp];
    localStorage.setItem('noobstore_installed_apps', JSON.stringify(updated));

    // Desktop shortcut
    try {
      const storedDesktop = localStorage.getItem('webos_desktop_items_v2');
      let items = storedDesktop ? JSON.parse(storedDesktop) : [];
      const spot = findAvailableGridSpot(items);
      items.push({
        id: newId,
        appId: newId,
        title: title.trim(),
        icon: resolvedIconId || (iconChar ? `custom-app-${iconChar}` : 'browser'),
        type: 'app',
        x: spot.x,
        y: spot.y,
      });
      localStorage.setItem('webos_desktop_items_v2', JSON.stringify(items));
      window.dispatchEvent(new Event('webos_desktop_items_changed'));
    } catch (e) {}

    window.dispatchEvent(new Event('webos_installed_apps_changed'));
    setInstalledCustomApps(updated);
    setUrlInput('');
    setSearchedUrl(null);
  };

  const handleUninstallCustomWeb = (id: string) => {
    const updated = installedCustomApps.filter(a => a.id !== id);
    localStorage.setItem('noobstore_installed_apps', JSON.stringify(updated));

    try {
      const storedDesktop = localStorage.getItem('webos_desktop_items_v2');
      if (storedDesktop) {
        let items = JSON.parse(storedDesktop);
        items = items.filter((item: any) => item.id !== id && item.appId !== id);
        localStorage.setItem('webos_desktop_items_v2', JSON.stringify(items));
        window.dispatchEvent(new Event('webos_desktop_items_changed'));
      }
    } catch (e) {}

    window.dispatchEvent(new Event('webos_installed_apps_changed'));
    setInstalledCustomApps(updated);
  };

  // Filter apps based on search and tab
  const featuredAppsList = SYSTEM_STORE_APPS.filter(a => ['racing', 'floppybird', 'minecraft', 'word', 'tetris'].includes(a.id));

  const curatedGamesCount = CURATED_CUSTOM_APPS.filter(item => item.category === 'Game').length;
  const visibleCuratedApps = CURATED_CUSTOM_APPS.filter(item => {
    if (customFilter === 'games') return item.category === 'Game';
    if (customFilter === 'other') return item.category !== 'Game';
    return true;
  });

  const filteredApps = SYSTEM_STORE_APPS.filter(app => {
    const matchesSearch = app.titleJa.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          app.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          app.descriptionJa.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'apps') return ['productivity', 'utilities', 'creativity', 'devtools', 'social'].includes(app.category);
    if (activeTab === 'games') return app.category === 'games';
    return true;
  });

  const featuredApp = featuredAppsList[featuredIndex] || featuredAppsList[0];

  return (
    <div className="w-full h-full bg-[#0f1117] text-zinc-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Top Aboard Store Header Navigation */}
      <div className="h-14 bg-[#181a20]/90 border-b border-zinc-800/80 px-6 flex items-center justify-between shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-6">
          {/* Aboard Store Brand Header */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-1 shadow-md shadow-blue-900/30">
              <AppIcon id="noobstore" size={20} />
            </div>
            <span className="font-bold text-sm tracking-tight text-white font-sans">
              Aboard Store
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setActiveTab('home'); setSearchQuery(''); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                activeTab === 'home'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              ホーム
            </button>
            <button
              onClick={() => { setActiveTab('apps'); setSearchQuery(''); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                activeTab === 'apps'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              アプリ
            </button>
            <button
              onClick={() => { setActiveTab('games'); setSearchQuery(''); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                activeTab === 'games'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              ゲーム
            </button>
            <button
              onClick={() => { setActiveTab('library'); setSearchQuery(''); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                activeTab === 'library'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              ライブラリ ({installedSystemApps.length + installedCustomApps.length})
            </button>
            <button
              onClick={() => { setActiveTab('custom'); setSearchQuery(''); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                activeTab === 'custom'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              カスタム Web
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="アプリやゲームを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/90 border border-zinc-700/60 rounded-full pl-8 pr-4 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Search Filter Mode Active */}
        {searchQuery ? (
          <div>
            <h2 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" />
              「{searchQuery}」の検索結果 ({filteredApps.length} 件)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApps.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  isInstalled={installedSystemApps.includes(app.id)}
                  downloadProgress={downloadProgress[app.id]}
                  onInstall={() => startDownloadApp(app)}
                  onUninstall={() => handleUninstallSystemApp(app.id)}
                  onLaunch={() => handleLaunchApp(app.id)}
                  onClick={() => setSelectedApp(app)}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* HOME TAB CONTENT */}
            {activeTab === 'home' && (
              <>
                {/* Hero Featured Carousel Banner */}
                {featuredApp && (
                  <div className={`relative w-full rounded-2xl overflow-hidden p-8 border border-zinc-700/50 bg-gradient-to-r ${featuredApp.bannerGradient} flex flex-col justify-between shadow-2xl min-h-[220px]`}>
                    <div className="flex items-start justify-between">
                      <div className="max-w-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold tracking-widest uppercase bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                            注目のアプリケーション
                          </span>
                          <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            検証済み安全
                          </span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">
                          {featuredApp.titleJa}
                        </h1>
                        <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                          {featuredApp.descriptionJa}
                        </p>
                      </div>

                      <div className="w-20 h-20 rounded-2xl bg-zinc-900/80 border border-white/10 p-3 shadow-xl shrink-0 flex items-center justify-center">
                        <AppIcon id={featuredApp.icon} size={56} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-6">
                      <div className="flex items-center gap-4">
                        {installedSystemApps.includes(featuredApp.id) ? (
                          <button
                            onClick={() => handleLaunchApp(featuredApp.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-lg transition-all active:scale-95"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            開く
                          </button>
                        ) : downloadProgress[featuredApp.id] !== undefined ? (
                          <div className="relative overflow-hidden bg-blue-950 border border-blue-500/50 rounded-lg px-6 py-2.5 text-xs font-bold text-blue-200 flex items-center gap-2 shadow-lg min-w-[150px] justify-center">
                            <div 
                              className="absolute left-0 top-0 bottom-0 bg-blue-600/60 transition-all duration-300"
                              style={{ width: `${downloadProgress[featuredApp.id]}%` }}
                            />
                            <Loader2 className="w-4 h-4 animate-spin relative z-10 text-blue-300" />
                            <span className="relative z-10">ダウンロード中... {downloadProgress[featuredApp.id]}%</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => startDownloadApp(featuredApp)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-lg transition-all active:scale-95"
                          >
                            <Download className="w-4 h-4" />
                            入手 (無料)
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedApp(featuredApp)}
                          className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all border border-zinc-700"
                        >
                          詳細を見る
                        </button>
                      </div>

                      {/* Carousel Indicator Dots */}
                      <div className="flex items-center gap-1.5">
                        {featuredAppsList.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setFeaturedIndex(idx)}
                            className={`h-2 rounded-full transition-all ${
                              idx === featuredIndex ? 'w-6 bg-blue-500' : 'w-2 bg-zinc-700 hover:bg-zinc-500'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section: Popular Apps */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-400" />
                      人気のおすすめアプリ
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SYSTEM_STORE_APPS.slice(0, 6).map((app) => (
                      <AppCard
                        key={app.id}
                        app={app}
                        isInstalled={installedSystemApps.includes(app.id)}
                        downloadProgress={downloadProgress[app.id]}
                        onInstall={() => startDownloadApp(app)}
                        onUninstall={() => handleUninstallSystemApp(app.id)}
                        onLaunch={() => handleLaunchApp(app.id)}
                        onClick={() => setSelectedApp(app)}
                      />
                    ))}
                  </div>
                </div>

                {/* Section: Featured Games */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-purple-400" />
                      人気のゲームコレクション
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SYSTEM_STORE_APPS.filter(a => a.category === 'games').slice(0, 6).map((app) => (
                      <AppCard
                        key={app.id}
                        app={app}
                        isInstalled={installedSystemApps.includes(app.id)}
                        downloadProgress={downloadProgress[app.id]}
                        onInstall={() => startDownloadApp(app)}
                        onUninstall={() => handleUninstallSystemApp(app.id)}
                        onLaunch={() => handleLaunchApp(app.id)}
                        onClick={() => setSelectedApp(app)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* APPS TAB */}
            {activeTab === 'apps' && (
              <div className="space-y-4">
                <h2 className="text-lg font-extrabold text-zinc-100 tracking-tight">生産性・ツール アプリケーション</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SYSTEM_STORE_APPS.filter(a => a.category !== 'games').map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      isInstalled={installedSystemApps.includes(app.id)}
                      downloadProgress={downloadProgress[app.id]}
                      onInstall={() => startDownloadApp(app)}
                      onUninstall={() => handleUninstallSystemApp(app.id)}
                      onLaunch={() => handleLaunchApp(app.id)}
                      onClick={() => setSelectedApp(app)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* GAMES TAB */}
            {activeTab === 'games' && (
              <div className="space-y-4">
                <h2 className="text-lg font-extrabold text-zinc-100 tracking-tight">エンターテインメント & ゲーム</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SYSTEM_STORE_APPS.filter(a => a.category === 'games').map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      isInstalled={installedSystemApps.includes(app.id)}
                      downloadProgress={downloadProgress[app.id]}
                      onInstall={() => startDownloadApp(app)}
                      onUninstall={() => handleUninstallSystemApp(app.id)}
                      onLaunch={() => handleLaunchApp(app.id)}
                      onClick={() => setSelectedApp(app)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* LIBRARY (INSTALLED) TAB */}
            {activeTab === 'library' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-zinc-100">インストール済みライブラリ</h2>
                    <p className="text-xs text-zinc-400 mt-1">Abord OS に追加されたすべてのアプリ一覧です。</p>
                  </div>
                  <span className="text-xs font-semibold bg-zinc-800 px-3 py-1 rounded-full text-zinc-300">
                    計 {installedSystemApps.length + installedCustomApps.length} 個のアプリ
                  </span>
                </div>

                {installedSystemApps.length === 0 && installedCustomApps.length === 0 ? (
                  <div className="text-center py-20 text-zinc-500 space-y-3">
                    <Package className="w-12 h-12 mx-auto stroke-1 opacity-40" />
                    <p className="text-sm font-medium">インストール済みのアプリはありません。</p>
                    <button
                      onClick={() => setActiveTab('home')}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg"
                    >
                      ストアでアプリを探す
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* System Apps */}
                    {SYSTEM_STORE_APPS.filter(a => installedSystemApps.includes(a.id)).map((app) => (
                      <div
                        key={app.id}
                        className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-4 flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-zinc-950 p-2 border border-zinc-800 flex items-center justify-center">
                            <AppIcon id={app.icon} size={32} />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-zinc-100">{app.titleJa}</h3>
                            <p className="text-xs text-zinc-400">{app.categoryLabelJa} • {app.developer}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleLaunchApp(app.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            起動
                          </button>
                          <button
                            onClick={() => handleUninstallSystemApp(app.id)}
                            className="bg-zinc-800 hover:bg-red-900/50 hover:text-red-300 text-zinc-400 text-xs font-medium px-3 py-2 rounded-lg transition-all border border-zinc-700/60"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Custom Web Apps */}
                    {installedCustomApps.map((app) => (
                      <div
                        key={app.id}
                        className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-4 flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center text-xl border border-zinc-800 p-1.5">
                            <AppIcon id={resolveCustomAppIconId(app)} size={36} />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-zinc-100">{app.title}</h3>
                            <p className="text-xs text-zinc-400 truncate max-w-xs">{app.url}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleLaunchApp(app.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            起動
                          </button>
                          <button
                            onClick={() => handleUninstallCustomWeb(app.id)}
                            className="bg-zinc-800 hover:bg-red-900/50 hover:text-red-300 text-zinc-400 text-xs font-medium px-3 py-2 rounded-lg transition-all border border-zinc-700/60"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CUSTOM WEB APPS TAB */}
            {activeTab === 'custom' && (
              <div className="space-y-6 max-w-4xl">
                <div>
                  <h2 className="text-lg font-extrabold text-zinc-100">カスタム Web アプリ インポーター</h2>
                  <p className="text-xs text-zinc-400 mt-1">任意の Web URL や GitHub HTML ページを Abord OS デスクトップアプリとして追加できます。</p>
                </div>

                {/* URL Input Form */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">Web アプリの URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://example.com や GitHub URL (自動でCDN変換されます)..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && urlInput.trim()) {
                            const normalized = normalizeCustomWebUrl(urlInput);
                            if (normalized) {
                              setSearchedUrl(normalized);
                              setCustomTitle(deriveCustomAppTitleFromUrl(normalized));
                            }
                          }
                        }}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          if (!urlInput.trim()) return;
                          const normalized = normalizeCustomWebUrl(urlInput);
                          if (!normalized) {
                            setCustomNotice('有効な Web アプリ URL を入力してください。');
                            setTimeout(() => setCustomNotice(null), 3000);
                            return;
                          }
                          setSearchedUrl(normalized);
                          setCustomTitle(deriveCustomAppTitleFromUrl(normalized));
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded-xl whitespace-nowrap"
                      >
                        読み込み
                      </button>
                    </div>
                  </div>

                  {searchedUrl && (
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-zinc-400 font-medium">アプリ名</label>
                          <input
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-zinc-400 font-medium">アイコン絵文字</label>
                          <input
                            type="text"
                            value={customIconChar}
                            onChange={(e) => setCustomIconChar(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none mt-1"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleInstallCustomWeb(customTitle, searchedUrl, customIconChar)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg transition-all"
                      >
                        このアプリをデスクトップに追加
                      </button>
                    </div>
                  )}
                </div>

                {customNotice && (
                  <div className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-medium">
                    {customNotice}
                  </div>
                )}

                {/* Curated Recommendations */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-bold text-zinc-200">おすすめの Web アプリ カタログ</h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        ゲーム {curatedGamesCount} 本収録
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCustomFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          customFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-zinc-800'
                        }`}
                      >
                        すべて ({CURATED_CUSTOM_APPS.length})
                      </button>
                      <button
                        onClick={() => setCustomFilter('games')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          customFilter === 'games'
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-zinc-800'
                        }`}
                      >
                        ゲーム ({curatedGamesCount})
                      </button>
                      <button
                        onClick={() => setCustomFilter('other')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          customFilter === 'other'
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-zinc-800'
                        }`}
                      >
                        ツール・学習 ({CURATED_CUSTOM_APPS.length - curatedGamesCount})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleCuratedApps.map((item) => {
                      const linkedSysApp = item.systemAppId
                        ? SYSTEM_STORE_APPS.find(a => a.id === item.systemAppId)
                        : undefined;
                      const installedCustomMatch = installedCustomApps.find(
                        a => normalizeCustomWebUrl(a.url) === normalizeCustomWebUrl(item.url)
                      );
                      const isInst =
                        (item.systemAppId ? installedSystemApps.includes(item.systemAppId) : false) ||
                        Boolean(installedCustomMatch);

                      return (
                        <div
                          key={item.id}
                          className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-4 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shrink-0 p-1.5">
                              <AppIcon id={item.appIconId || `custom-app-${item.iconChar}`} size={36} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-xs text-white truncate">{item.title}</h4>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                                  {item.category === 'Game' ? 'ゲーム' : item.developer}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 leading-snug mt-0.5 line-clamp-2">{item.desc}</p>
                            </div>
                          </div>

                          {isInst ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.systemAppId && installedSystemApps.includes(item.systemAppId) ? (
                                <button
                                  onClick={() => handleLaunchApp(item.systemAppId!)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  起動
                                </button>
                              ) : installedCustomMatch ? (
                                <button
                                  onClick={() => handleLaunchApp(installedCustomMatch.id)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  起動
                                </button>
                              ) : (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md font-bold">
                                  追加済み
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (linkedSysApp) {
                                  handleInstallSystemApp(linkedSysApp);
                                } else {
                                  handleInstallCustomWeb(item.title, item.url, item.iconChar, item.appIconId);
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg shrink-0"
                            >
                              追加
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* APP DETAILS MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181a20] border border-zinc-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
            {/* Modal Header Banner */}
            <div className={`p-6 bg-gradient-to-r ${selectedApp.bannerGradient} flex items-start justify-between border-b border-zinc-800`}>
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-zinc-950/90 border border-white/10 p-2.5 shadow-xl flex items-center justify-center">
                  <AppIcon id={selectedApp.icon} size={56} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white">{selectedApp.titleJa}</h2>
                  <p className="text-xs text-zinc-300 font-medium">{selectedApp.developer} • {selectedApp.categoryLabelJa}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-zinc-400 font-medium">{selectedApp.size}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {/* Action Bar */}
              <div className="flex items-center justify-between bg-zinc-900/90 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-zinc-200">Abord OS 安全検証済み</p>
                    <p className="text-[10px] text-zinc-400">悪意のあるコードは検出されませんでした。</p>
                  </div>
                </div>

                {installedSystemApps.includes(selectedApp.id) ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { handleLaunchApp(selectedApp.id); setSelectedApp(null); }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-lg"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      開く
                    </button>
                    <button
                      onClick={() => handleUninstallSystemApp(selectedApp.id)}
                      className="bg-zinc-800 hover:bg-red-900/50 hover:text-red-300 text-zinc-300 font-semibold text-xs px-3.5 py-2.5 rounded-lg border border-zinc-700"
                    >
                      アンインストール
                    </button>
                  </div>
                ) : downloadProgress[selectedApp.id] !== undefined ? (
                  <div className="relative overflow-hidden bg-blue-950 border border-blue-500/50 rounded-lg px-6 py-2.5 text-xs font-bold text-blue-200 flex items-center gap-2 shadow-lg min-w-[150px] justify-center">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-blue-600/60 transition-all duration-300"
                      style={{ width: `${downloadProgress[selectedApp.id]}%` }}
                    />
                    <Loader2 className="w-4 h-4 animate-spin relative z-10 text-blue-300" />
                    <span className="relative z-10">ダウンロード中... {downloadProgress[selectedApp.id]}%</span>
                  </div>
                ) : (
                  <button
                    onClick={() => startDownloadApp(selectedApp)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    入手 (無料)
                  </button>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">アプリの概要</h3>
                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/60">
                  {selectedApp.descriptionJa}
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">主な機能</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedApp.featuresJa.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable App Card Component
const AppCard: React.FC<{
  app: StoreAppInfo;
  isInstalled: boolean;
  downloadProgress?: number;
  onInstall: () => void;
  onUninstall: () => void;
  onLaunch: () => void;
  onClick: () => void;
}> = ({ app, isInstalled, downloadProgress, onInstall, onUninstall, onLaunch, onClick }) => {
  return (
    <div className="bg-zinc-900/70 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-4 transition-all duration-200 flex flex-col justify-between group shadow-md hover:shadow-xl">
      <div className="flex items-start gap-3.5 cursor-pointer" onClick={onClick}>
        <div className="w-12 h-12 rounded-xl bg-zinc-950 p-2 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <AppIcon id={app.icon} size={32} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-bold text-xs text-zinc-100 truncate group-hover:text-blue-400 transition-colors">
              {app.titleJa}
            </h3>
            {app.badge && (
              <span className="text-[9px] font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30 shrink-0">
                {app.badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400">{app.categoryLabelJa}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 font-medium">{app.size}</span>
        {isInstalled ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onLaunch(); }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
            >
              <Play className="w-3 h-3 fill-current" />
              開く
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onUninstall(); }}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-900/50 hover:text-red-300 text-zinc-400 text-xs transition-colors"
              title="アンインストール"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : downloadProgress !== undefined ? (
          <div className="relative overflow-hidden bg-blue-950 border border-blue-500/40 rounded-lg px-3 py-1.5 text-[10px] font-bold text-blue-200 flex items-center gap-1.5 min-w-[100px] justify-center">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-blue-600/60 transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
            <Loader2 className="w-3 h-3 animate-spin relative z-10 text-blue-300" />
            <span className="relative z-10">{downloadProgress}%</span>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onInstall(); }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] px-4 py-1.5 rounded-lg flex items-center gap-1 shadow-md transition-all active:scale-95"
          >
            <Download className="w-3 h-3" />
            入手
          </button>
        )}
      </div>
    </div>
  );
};
