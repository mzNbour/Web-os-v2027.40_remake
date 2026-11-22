import React from 'react';
import { WebGameFrameApp } from './WebGameFrameApp';

export const FLOPPY_BIRD_URL = 'https://nebez.github.io/floppybird/';

interface FloppyBirdAppProps {
  windowId?: string;
  isWindowActive?: boolean;
}

export const FloppyBirdApp: React.FC<FloppyBirdAppProps> = ({ windowId, isWindowActive }) => {
  return (
    <WebGameFrameApp
      url={FLOPPY_BIRD_URL}
      title="Floppy Bird"
      accentColor="amber"
      loadingText="Loading Floppy Bird..."
      windowId={windowId}
      isWindowActive={isWindowActive}
    />
  );
};
