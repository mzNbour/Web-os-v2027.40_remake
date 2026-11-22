import React from 'react';
import { WebGameFrameApp } from './WebGameFrameApp';

export const RACING_GAME_URL = 'https://librecorsa.org/';

interface RacingGameAppProps {
  windowId?: string;
  isWindowActive?: boolean;
}

export const RacingGameApp: React.FC<RacingGameAppProps> = ({ windowId, isWindowActive }) => {
  return (
    <WebGameFrameApp
      url={RACING_GAME_URL}
      title="レーシングカーゲーム (LibreCorsa)"
      accentColor="red"
      loadingText="Loading LibreCorsa Racing..."
      windowId={windowId}
      isWindowActive={isWindowActive}
    />
  );
};
