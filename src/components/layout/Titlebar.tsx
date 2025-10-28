/**
 * Custom window titlebar with drag region and window controls
 */

import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Maximize, X } from 'lucide-react';

const appWindow = getCurrentWindow();

export function Titlebar() {
  const handleMinimize = () => {
    void appWindow.minimize();
  };

  const handleMaximize = () => {
    void appWindow.toggleMaximize();
  };

  const handleClose = () => {
    void appWindow.close();
  };

  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 left-0 right-0 h-8 bg-background border-b border-border flex items-center justify-between px-3 select-none z-50"
    >
      {/* Left side - App title with icon */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="text-foreground font-semibold">Kopia UI</span>
      </div>

      {/* Right side - Window controls */}
      <div className="flex items-center">
        <button
          onClick={handleMinimize}
          className="h-8 w-10 inline-flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm"
          title="Minimize"
          aria-label="Minimize window"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-8 w-10 inline-flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm"
          title="Maximize"
          aria-label="Maximize window"
        >
          <Maximize className="h-4 w-4" />
        </button>
        <button
          onClick={handleClose}
          className="h-8 w-10 inline-flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-sm"
          title="Close"
          aria-label="Close window"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
