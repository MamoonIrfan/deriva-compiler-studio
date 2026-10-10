import React, { useState } from 'react';
import {
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Expand,
  GripVertical,
  Maximize2,
  Minimize2,
  Move,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Shrink,
  X,
} from 'lucide-react';
import { PanelId } from '../../types/docking';

interface PanelFrameProps {
  panelId: PanelId;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  isMaximized?: boolean;
  isFocused?: boolean;
  isCollapsed?: boolean;
  onToggleMaximize?: () => void;
  onToggleFocus?: () => void;
  onToggleCollapse?: () => void;
  onClose?: () => void;
  onSwapWith?: (targetPanelId: PanelId) => void;
  onDragStart?: (e: React.DragEvent, panelId: PanelId) => void;
  onDragOver?: (e: React.DragEvent, panelId: PanelId) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetPanelId: PanelId) => void;
  isDragOver?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const PanelFrame: React.FC<PanelFrameProps> = ({
  panelId,
  title,
  subtitle,
  icon,
  badge,
  actions,
  isMaximized = false,
  isFocused = false,
  isCollapsed = false,
  onToggleMaximize,
  onToggleFocus,
  onToggleCollapse,
  onClose,
  onSwapWith,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver = false,
  children,
  className = '',
}) => {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const handleDragStartInternal = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/deriva-panel', panelId);
    e.dataTransfer.setData('application/novacompiler-panel', panelId);
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStart) onDragStart(e, panelId);
  };

  const otherPanels: { id: PanelId; label: string }[] = [
    { id: 'editor', label: 'Code Editor' },
    { id: 'diagnostics', label: 'Diagnostics Panel' },
    { id: 'visualizer', label: 'Stage Visualizer' },
  ].filter((p) => p.id !== panelId) as any;

  return (
    <div
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-app)' }}
      className={`relative flex flex-col h-full min-h-0 min-w-0 rounded-lg overflow-hidden border transition-all ${
        isDragOver ? 'border-indigo-500 ring-2 ring-indigo-500/50' : ''
      } ${isFocused ? 'ring-2 ring-indigo-400/80 shadow-2xl z-30' : ''} ${className}`}
      onDragOver={(e) => onDragOver && onDragOver(e, panelId)}
      onDragLeave={(e) => onDragLeave && onDragLeave(e)}
      onDrop={(e) => onDrop && onDrop(e, panelId)}
    >
      {/* Panel Top Title Bar (Draggable & Clickable) */}
      <div
        draggable={!isCollapsed}
        onDragStart={handleDragStartInternal}
        onDoubleClick={onToggleMaximize}
        onClick={isCollapsed && onToggleCollapse ? onToggleCollapse : undefined}
        style={{ backgroundColor: 'var(--bg-surface)', borderBottomColor: 'var(--border-app)' }}
        className={`h-8 px-2 sm:px-2.5 border-b flex items-center justify-between select-none text-xs shrink-0 group transition-colors ${
          isCollapsed ? 'cursor-pointer hover:bg-slate-800/60' : 'cursor-grab active:cursor-grabbing'
        }`}
        title={isCollapsed ? 'Click to expand panel' : 'Click and drag to dock/swap • Double-click to toggle maximize'}
      >
        {/* Left: Grip + Title + Subtitle */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1.5">
          {!isCollapsed && (
            <div
              className="p-1 rounded text-slate-500 group-hover:text-indigo-400 hover:bg-slate-800 transition shrink-0"
              title="Drag to dock/swap panel"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}

          {icon && <span className="text-slate-400 shrink-0">{icon}</span>}

          <span 
            style={{ color: 'var(--text-main)' }}
            className="font-semibold text-[11px] truncate tracking-wide min-w-0"
          >
            {title}
          </span>

          {subtitle && (
            <span className="text-slate-500 text-[10px] truncate max-w-[140px] shrink min-w-0">
              ({subtitle})
            </span>
          )}

          {badge && <div className="ml-1 shrink-0">{badge}</div>}
        </div>

        {/* Right: Actions + Window Controls */}
        <div
          className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-1"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {actions}

          {/* Move / Swap quick menu */}
          {onSwapWith && !isCollapsed && (
            <div className="relative">
              <button
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                className="p-1.5 sm:p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition touch-manipulation cursor-pointer"
                title="Swap panel position"
                aria-label="Swap panel position"
              >
                <Move className="w-3 h-3" />
              </button>

              {showMoveMenu && (
                <div
                  className="absolute right-0 mt-1 w-44 bg-[#1a1f2b] border border-slate-700 rounded-md shadow-2xl py-1 z-50 text-[11px]"
                  onMouseLeave={() => setShowMoveMenu(false)}
                >
                  <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                    Swap Position With:
                  </div>
                  {otherPanels.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSwapWith(p.id);
                        setShowMoveMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-1.5 transition text-slate-300 cursor-pointer"
                    >
                      <GripVertical className="w-3 h-3 text-slate-400" />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fullscreen / Focus Mode Toggle */}
          {onToggleFocus && !isCollapsed && (
            <button
              onClick={onToggleFocus}
              className={`p-1.5 sm:p-1 rounded transition touch-manipulation cursor-pointer ${
                isFocused ? 'text-indigo-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={isFocused ? 'Exit focus mode' : 'Focus full viewport'}
              aria-label={isFocused ? 'Exit focus mode' : 'Focus full viewport'}
            >
              {isFocused ? <Shrink className="w-3 h-3" /> : <Expand className="w-3 h-3" />}
            </button>
          )}

          {/* Maximize / Restore Toggle */}
          {onToggleMaximize && !isCollapsed && (
            <button
              onClick={onToggleMaximize}
              className={`p-1.5 sm:p-1 rounded transition touch-manipulation cursor-pointer ${
                isMaximized ? 'text-indigo-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={isMaximized ? 'Restore normal view' : 'Maximize panel'}
              aria-label={isMaximized ? 'Restore normal view' : 'Maximize panel'}
            >
              {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          )}

          {/* Collapse / Expand Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 sm:p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition touch-manipulation cursor-pointer"
              title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
              aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          )}

          {/* Close Panel Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 sm:p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition touch-manipulation cursor-pointer"
              title="Close panel (can be reopened from View menu or Activity Bar)"
              aria-label="Close panel"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Drag Over Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-indigo-950/40 border-2 border-dashed border-indigo-400 z-50 flex items-center justify-center pointer-events-none rounded-lg backdrop-blur-[1px]">
          <div className="px-3 py-1.5 rounded bg-[#131720] border border-indigo-500/80 text-indigo-300 text-xs font-semibold shadow-xl flex items-center gap-2">
            <Move className="w-4 h-4 text-indigo-400" />
            <span>Drop to dock & swap with {title}</span>
          </div>
        </div>
      )}

      {/* Panel Content */}
      <div className={`flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden ${isCollapsed ? 'hidden' : ''}`}>
        {children}
      </div>
    </div>
  );
};

