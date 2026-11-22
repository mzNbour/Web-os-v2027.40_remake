import React, { useEffect, useState } from 'react';
import { GraphingCalculatorApp } from './GraphingCalculatorApp';
import { X, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface FullscreenBossOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  fullscreenImage?: string;
  language?: 'ja' | 'en';
}

export const FullscreenBossOverlay: React.FC<FullscreenBossOverlayProps> = ({
  isOpen,
  onClose,
  fullscreenImage,
  language = 'ja',
}) => {
  const isJa = language === 'ja';
  const [showExitHint, setShowExitHint] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Show temporary hint for exiting
    setShowExitHint(true);
    const timer = setTimeout(() => setShowExitHint(false), 3000);

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user pressed Escape, always close
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // If user pressed 'c' or 'C'
      if (e.key.toLowerCase() === 'c') {
        const activeEl = document.activeElement;
        if (activeEl) {
          const tagName = activeEl.tagName.toLowerCase();
          const isContentEditable = activeEl.getAttribute('contenteditable') === 'true';
          // If typing inside an input/textarea in the graph calculator, don't close so they can type formulas/variables
          if (
            tagName === 'input' ||
            tagName === 'textarea' ||
            tagName === 'select' ||
            isContentEditable
          ) {
            return;
          }
        }
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Case 1: Image is uploaded/selected in Settings -> Show fullscreen image
  if (fullscreenImage && fullscreenImage.trim()) {
    return (
      <div
        className="fixed inset-0 z-[99999999] bg-black flex items-center justify-center select-none overflow-hidden cursor-default"
        id="fullscreen-boss-image-overlay"
        onClick={() => {
          // Clicking anywhere on image overlay can also close or toggle hint
          setShowExitHint((prev) => !prev);
        }}
      >
        <img
          src={fullscreenImage}
          alt="Fullscreen Display"
          className="w-full h-full object-contain pointer-events-none"
          referrerPolicy="no-referrer"
        />

        {/* Floating Quick Close Controls in Top Corner */}
        <div
          className={`absolute top-4 right-4 z-50 flex items-center gap-2 transition-opacity duration-300 ${
            showExitHint ? 'opacity-100' : 'opacity-20 hover:opacity-100'
          }`}
        >
          <div className="bg-black/70 backdrop-blur-md text-white/90 text-xs px-3 py-1.5 rounded-full border border-white/20 font-mono shadow-xl flex items-center gap-2">
            <span>{isJa ? 'Cキー または Esc で終了' : 'Press C or Esc to exit'}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-white/20 rounded-full transition-colors text-white font-bold"
              title={isJa ? '元の画面に戻る' : 'Return to Desktop'}
              id="boss-image-close-btn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: No image is uploaded -> Show Fullscreen Interactive Graphing Calculator App
  return (
    <div className="fixed inset-0 z-[99999999] bg-zinc-950 overflow-hidden" id="fullscreen-boss-graph-overlay">
      <GraphingCalculatorApp isOverlay={true} onClose={onClose} />
    </div>
  );
};
