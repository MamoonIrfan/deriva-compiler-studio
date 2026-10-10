export type PanelId = 'editor' | 'diagnostics' | 'visualizer' | 'explorer';

export type LayoutPreset =
  | 'vscode-default'   // Left: Editor top + Diagnostics bottom; Right: Visualizer
  | 'bottom-dock'      // Top: Editor left + Visualizer right; Bottom: Full-width Diagnostics
  | 'unity-3col'       // Left: Editor; Center: Diagnostics; Right: Visualizer
  | 'visualizer-left'  // Left: Visualizer; Right: Editor top + Diagnostics bottom
  | 'editor-focused';  // Editor maximized

export interface PanelConfig {
  id: PanelId;
  title: string;
  isMinimized?: boolean;
  isMaximized?: boolean;
  isHidden?: boolean;
}

export interface DockState {
  preset: LayoutPreset;
  leftPanelWidthPercent: number; // For 2-column splits (default ~42%)
  diagnosticsHeightPx: number;   // For vertical split (default ~180px)
  col1WidthPercent?: number;     // For 3-column split (default ~33%)
  col2WidthPercent?: number;     // For 3-column split (default ~33%)
  maximizedPanel: PanelId | null;
  focusedPanel: PanelId | null;
  collapsedPanels: Record<PanelId, boolean>;
  hiddenPanels: Record<PanelId, boolean>;
  // Dynamic slot placement: which panel is in which zone
  // For 2-col standard: leftTop, leftBottom, rightMain
  slots: {
    slotA: PanelId; // Default 'editor'
    slotB: PanelId; // Default 'diagnostics'
    slotC: PanelId; // Default 'visualizer'
  };
}

