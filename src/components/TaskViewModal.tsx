import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VirtualDesktop, WindowInstance, AppID } from '../types';
import { Plus, X, Monitor, Check, ArrowRightLeft, Layers, Edit2 } from 'lucide-react';
import { AppIcon } from './AppIcon';

interface TaskViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  desktops: VirtualDesktop[];
  activeDesktopId: string;
  onSelectDesktop: (id: string) => void;
  onCreateDesktop: () => void;
  onRemoveDesktop: (id: string) => void;
  onRenameDesktop: (id: string, newName: string) => void;
  windows: WindowInstance[];
  onFocusWindow: (id: AppID) => void;
  onCloseWindow: (id: AppID) => void;
  onMoveWindowToDesktop: (windowId: AppID, targetDesktopId: string) => void;
  isDarkTheme?: boolean;
  language?: 'ja' | 'en';
}

export const TaskViewModal: React.FC<TaskViewModalProps> = ({
  isOpen,
  onClose,
  desktops,
  activeDesktopId,
  onSelectDesktop,
  onCreateDesktop,
  onRemoveDesktop,
  onRenameDesktop,
  windows,
  onFocusWindow,
  onCloseWindow,
  onMoveWindowToDesktop,
  isDarkTheme = true,
  language = 'ja',
}) => {
  const [editingDesktopId, setEditingDesktopId] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [moveMenuWindowId, setMoveMenuWindowId] = useState<AppID | null>(null);

  const isJa = language === 'ja';

  if (!isOpen) return null;

  // Active desktop's open windows
  const currentDesktopWindows = windows.filter(
    (w) => w.isOpen && (w.desktopId === activeDesktopId || (!w.desktopId && activeDesktopId === desktops[0]?.id) || w.desktopId === 'all')
  );

  const handleStartRename = (desktop: VirtualDesktop, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDesktopId(desktop.id);
    setEditNameInput(desktop.name);
  };

  const handleSaveRename = (id: string) => {
    if (editNameInput.trim()) {
      onRenameDesktop(id, editNameInput.trim());
    }
    setEditingDesktopId(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[99990] bg-black/70 backdrop-blur-2xl text-white flex flex-col justify-between p-6 select-none font-sans overflow-hidden"
        onClick={() => {
          setMoveMenuWindowId(null);
          onClose();
        }}
      >
        {/* Top Header */}
        <div
          className="flex items-center justify-between w-full max-w-7xl mx-auto pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-wide">
                {isJa ? 'タスク ビュー & 仮想デスクトップ' : 'Task View & Virtual Desktops'}
              </h1>
              <p className="text-xs text-gray-300 font-normal">
                {isJa ? '作業スペースの管理・ウィンドウの切り替え' : 'Manage your workspaces & active application windows'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/10 cursor-pointer"
            title={isJa ? '閉じる (Esc)' : 'Close (Esc)'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Window Previews Area for Current Active Desktop */}
        <div
          className="flex-1 my-6 w-full max-w-7xl mx-auto overflow-y-auto custom-scrollbar flex flex-col justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {currentDesktopWindows.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md max-w-md mx-auto my-auto">
              <Monitor className="w-12 h-12 text-gray-400 mb-3 opacity-60" />
              <p className="text-sm font-medium text-gray-200">
                {isJa ? 'このデスクトップで開いているウィンドウはありません' : 'No open windows on this desktop'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isJa ? 'タスクバーやスタートメニューからアプリを起動できます' : 'Launch apps from the taskbar or start menu'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 my-auto py-4">
              {currentDesktopWindows.map((win) => {
                const isMoveOpen = moveMenuWindowId === win.id;
                return (
                  <motion.div
                    key={win.id}
                    layout
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative group bg-slate-900/80 hover:bg-slate-800/90 border border-white/15 hover:border-blue-400/80 rounded-xl p-3 flex flex-col gap-2.5 shadow-2xl transition-all cursor-pointer backdrop-blur-xl overflow-visible"
                    onClick={() => {
                      onFocusWindow(win.id);
                      onClose();
                    }}
                  >
                    {/* Window Title Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <AppIcon id={win.icon || win.id} size={18} />
                        <span className="text-xs font-medium truncate text-gray-100">{win.title}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Move Desktop Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoveMenuWindowId(isMoveOpen ? null : win.id);
                          }}
                          className={`p-1 rounded hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer ${
                            isMoveOpen ? 'bg-blue-600 text-white' : ''
                          }`}
                          title={isJa ? '他のデスクトップに移動' : 'Move to another desktop'}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Close Window Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloseWindow(win.id);
                          }}
                          className="p-1 rounded hover:bg-red-500/80 text-gray-300 hover:text-white transition-colors cursor-pointer"
                          title={isJa ? 'ウィンドウを閉じる' : 'Close window'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Window Preview Card Box */}
                    <div className="w-full h-36 bg-black/40 rounded-lg border border-white/5 flex flex-col items-center justify-center p-3 relative overflow-hidden group-hover:scale-[1.01] transition-transform">
                      <AppIcon id={win.icon || win.id} size={48} className="opacity-40 mb-1" />
                      <span className="text-[11px] text-gray-400 font-sans tracking-wide truncate max-w-[90%]">
                        {win.title}
                      </span>
                      {win.isMinimized && (
                        <span className="absolute bottom-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-amber-300 border border-amber-500/30">
                          {isJa ? '最小化中' : 'Minimized'}
                        </span>
                      )}
                    </div>

                    {/* Move Desktop Dropdown Menu */}
                    {isMoveOpen && (
                      <div
                        className="absolute right-3 top-10 z-50 bg-slate-900 border border-white/20 rounded-xl shadow-2xl p-1.5 w-48 text-xs animate-in fade-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-2 py-1 text-[10px] uppercase font-semibold text-gray-400 border-b border-white/10 mb-1">
                          {isJa ? '移動先のデスクトップ' : 'Move to Desktop'}
                        </div>
                        {desktops.map((d) => {
                          const isCurrent = (win.desktopId || desktops[0]?.id) === d.id;
                          return (
                            <button
                              key={d.id}
                              disabled={isCurrent}
                              onClick={() => {
                                onMoveWindowToDesktop(win.id, d.id);
                                setMoveMenuWindowId(null);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                                isCurrent
                                  ? 'text-gray-500 cursor-default bg-white/5'
                                  : 'hover:bg-blue-600 text-gray-200 hover:text-white cursor-pointer'
                              }`}
                            >
                              <span className="truncate">{d.name}</span>
                              {isCurrent && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                            </button>
                          );
                        })}
                        <div className="border-t border-white/10 my-1" />
                        <button
                          onClick={() => {
                            onMoveWindowToDesktop(win.id, 'all');
                            setMoveMenuWindowId(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                            win.desktopId === 'all'
                              ? 'text-gray-500 cursor-default bg-white/5'
                              : 'hover:bg-blue-600 text-gray-200 hover:text-white cursor-pointer'
                          }`}
                        >
                          <span>{isJa ? 'すべてのデスクトップに表示' : 'Show on all desktops'}</span>
                          {win.desktopId === 'all' && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Area: Virtual Desktops Bar (Windows 11 Style) */}
        <div
          className="w-full max-w-7xl mx-auto pt-4 border-t border-white/15 flex flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300 tracking-wider uppercase">
              {isJa ? 'デスクトップ 一覧' : 'Desktops'}
            </span>
            <span className="text-[11px] text-gray-400">
              {isJa ? '切り替え: [A] キー / ← (前へ) | [Z] キー / → (次へ)' : 'Switch: [A] / Left Arrow (Prev) | [Z] / Right Arrow (Next)'}
            </span>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-2 custom-scrollbar">
            {desktops.map((desktop, idx) => {
              const isActive = desktop.id === activeDesktopId;
              const isEditing = editingDesktopId === desktop.id;
              // Window count for this desktop
              const count = windows.filter(
                (w) => w.isOpen && (w.desktopId === desktop.id || (!w.desktopId && desktop.id === desktops[0]?.id) || w.desktopId === 'all')
              ).length;

              return (
                <div
                  key={desktop.id}
                  onClick={() => onSelectDesktop(desktop.id)}
                  className={`relative group flex flex-col items-center gap-2 p-2 rounded-xl transition-all cursor-pointer shrink-0 w-44 ${
                    isActive
                      ? 'bg-white/15 border-2 border-blue-400 shadow-lg scale-105'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {/* Delete Desktop Button (Only if more than 1 desktop exists) */}
                  {desktops.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveDesktop(desktop.id);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-red-600 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                      title={isJa ? 'デスクトップを削除' : 'Remove desktop'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {/* Thumbnail Card Preview Box */}
                  <div className="w-full h-24 bg-slate-900/90 rounded-lg border border-white/10 flex flex-col items-center justify-center relative overflow-hidden">
                    <Monitor className={`w-8 h-8 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                    <span className="text-[10px] text-gray-400 mt-1 font-sans">
                      {count > 0 ? (isJa ? `${count} 個のアプリ` : `${count} apps`) : (isJa ? '空の作業区' : 'Empty')}
                    </span>

                    {/* Windows 11 Active Desktop Bar Indicator */}
                    {isActive && (
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    )}
                  </div>

                  {/* Desktop Name Label & Editable Field */}
                  <div className="w-full flex items-center justify-between px-1 gap-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editNameInput}
                        onChange={(e) => setEditNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(desktop.id);
                          if (e.key === 'Escape') setEditingDesktopId(null);
                        }}
                        onBlur={() => handleSaveRename(desktop.id)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-black/60 border border-blue-400 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                      />
                    ) : (
                      <>
                        <span
                          onDoubleClick={(e) => handleStartRename(desktop, e)}
                          className="text-xs font-medium truncate text-gray-200 hover:text-white"
                          title={isJa ? 'ダブルクリックで名前を変更' : 'Double click to rename'}
                        >
                          {desktop.name}
                        </span>
                        <button
                          onClick={(e) => handleStartRename(desktop, e)}
                          className="p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title={isJa ? '名前を変更' : 'Rename'}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add New Desktop Button */}
            <button
              onClick={onCreateDesktop}
              className="flex flex-col items-center justify-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-dashed border-white/20 hover:border-blue-400/80 transition-all cursor-pointer shrink-0 w-44 h-[134px] group"
              title={isJa ? '新しいデスクトップを追加 (Ctrl + Win + D)' : 'Add new desktop (Ctrl + Win + D)'}
            >
              <div className="p-3 rounded-full bg-white/10 group-hover:bg-blue-600 transition-colors text-white">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-300 group-hover:text-white">
                {isJa ? '新しいデスクトップ' : 'New Desktop'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
