import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  X,
  Map as MapIcon,
} from 'lucide-react';
import { CompilerDiagnostic } from '../../types';

export interface CodeMinimapProps {
  code: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  diagnostics?: CompilerDiagnostic[];
  highlightLine?: number;
  onLineClick?: (line: number) => void;
  onClose?: () => void;
  isNovaLang?: boolean;
  className?: string;
}

// NovaLang syntax keywords for syntax-aware minimap rendering
const NOVALANG_KEYWORDS = new Set([
  'var', 'val', 'let', 'func', 'fn', 'function', 'return',
  'if', 'else', 'while', 'for', 'in', 'do', 'break', 'continue',
  'int', 'float', 'string', 'bool', 'void', 'true', 'false',
  'print', 'println', 'input', 'const', 'type', 'struct', 'new'
]);

export const CodeMinimap: React.FC<CodeMinimapProps> = ({
  code = '',
  textareaRef,
  diagnostics = [],
  highlightLine,
  onLineClick,
  onClose,
  isNovaLang = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [scrollMetrics, setScrollMetrics] = useState({
    scrollTop: 0,
    scrollHeight: 1,
    clientHeight: 1,
  });

  const [containerHeight, setContainerHeight] = useState(300);
  const [containerWidth, setContainerWidth] = useState(76);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [hoveredLineInfo, setHoveredLineInfo] = useState<{
    lineNum: number;
    text: string;
    y: number;
    diagnostic?: CompilerDiagnostic;
  } | null>(null);

  // Fit to screen mode: if true, all lines fit in the minimap height; if false, lines use fixed scale
  const [fitToView, setFitToView] = useState(false);

  const safeCode = typeof code === 'string' ? code : '';
  const lines = safeCode.split('\n');
  const totalLines = Math.max(lines.length, 1);
  const safeDiagnostics = Array.isArray(diagnostics) ? diagnostics : [];

  // Group diagnostics by line number
  const diagnosticsByLine = useRef(new Map<number, CompilerDiagnostic[]>());
  useEffect(() => {
    const map = new Map<number, CompilerDiagnostic[]>();
    for (const d of safeDiagnostics) {
      if (d && d.location?.line) {
        const l = d.location.line;
        if (!map.has(l)) map.set(l, []);
        map.get(l)!.push(d);
      }
    }
    diagnosticsByLine.current = map;
  }, [safeDiagnostics]);

  // Sync scroll metrics from textarea
  const updateScrollMetrics = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    setScrollMetrics({
      scrollTop: ta.scrollTop,
      scrollHeight: Math.max(ta.scrollHeight, 1),
      clientHeight: Math.max(ta.clientHeight, 1),
    });
  }, [textareaRef]);

  // Track textarea scroll events
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    updateScrollMetrics();
    const handleScroll = () => {
      requestAnimationFrame(updateScrollMetrics);
    };

    ta.addEventListener('scroll', handleScroll, { passive: true });
    return () => ta.removeEventListener('scroll', handleScroll);
  }, [textareaRef, updateScrollMetrics, code]);

  // Track container dimensions with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        const w = entry.contentRect.width;
        if (h > 0) setContainerHeight(h);
        if (w > 0) setContainerWidth(w);
      }
      updateScrollMetrics();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [updateScrollMetrics]);

  // Calculate layout parameters
  const headerHeight = 24; // Top mini title bar
  const canvasAvailableHeight = Math.max(containerHeight - headerHeight, 50);

  // Line height calculation in minimap pixels
  const baseLineHeight = fitToView
    ? Math.max(1, Math.min(4, canvasAvailableHeight / totalLines))
    : Math.max(2, Math.min(4, canvasAvailableHeight / totalLines));

  const totalMinimapHeight = totalLines * baseLineHeight;
  const isOverflowing = totalMinimapHeight > canvasAvailableHeight;

  // Minimap internal scroll offset (for long files)
  const maxEditorScroll = Math.max(scrollMetrics.scrollHeight - scrollMetrics.clientHeight, 1);
  const scrollRatio = Math.min(1, Math.max(0, scrollMetrics.scrollTop / maxEditorScroll));

  const minimapScrollTop = isOverflowing
    ? scrollRatio * (totalMinimapHeight - canvasAvailableHeight)
    : 0;

  // Viewport slider position & height
  const viewportHeight = Math.max(
    18,
    (scrollMetrics.clientHeight / scrollMetrics.scrollHeight) *
      (isOverflowing ? canvasAvailableHeight : totalMinimapHeight)
  );

  const viewportTop = isOverflowing
    ? scrollRatio * (canvasAvailableHeight - viewportHeight)
    : (scrollMetrics.scrollTop / scrollMetrics.scrollHeight) * totalMinimapHeight;

  // Detect current theme mode for canvas styling
  const getThemeColors = useCallback(() => {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme') || 'dark';
    const isLight = theme === 'light';

    return {
      isLight,
      keyword: isLight ? '#4f46e5' : '#818cf8',
      comment: isLight ? '#94a3b8' : '#64748b',
      number: isLight ? '#059669' : '#34d399',
      string: isLight ? '#d97706' : '#fbbf24',
      identifier: isLight ? '#475569' : '#94a3b8',
      error: '#ef4444',
      warning: '#f59e0b',
      highlight: isLight ? '#6366f1' : '#818cf8',
      sliderBg: isLight ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.18)',
      sliderBorder: isLight ? 'rgba(99, 102, 241, 0.4)' : 'rgba(129, 140, 248, 0.5)',
    };
  }, []);

  // Draw the high-fidelity minimap canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = containerWidth;
    const height = canvasAvailableHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const colors = getThemeColors();
    const tokenHeight = Math.max(1, baseLineHeight - 0.7);

    // Visible index range to render
    const startLineIdx = Math.max(0, Math.floor(minimapScrollTop / baseLineHeight) - 2);
    const endLineIdx = Math.min(
      totalLines,
      Math.ceil((minimapScrollTop + height) / baseLineHeight) + 2
    );

    for (let i = startLineIdx; i < endLineIdx; i++) {
      const lineText = lines[i] || '';
      const lineNum = i + 1;
      const y = i * baseLineHeight - minimapScrollTop;

      const lineDiags = diagnosticsByLine.current.get(lineNum);
      const hasError = isNovaLang && lineDiags?.some((d) => d.severity === 'error');
      const hasWarning = isNovaLang && !hasError && lineDiags?.some((d) => d.severity === 'warning');
      const isHighlighted = highlightLine === lineNum;

      // Draw line background highlights for diagnostics or active line
      if (hasError) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(0, y, width, Math.max(2, baseLineHeight));
        // Error indicator pip on right edge
        ctx.fillStyle = colors.error;
        ctx.fillRect(width - 3, y, 3, Math.max(2, baseLineHeight));
      } else if (hasWarning) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
        ctx.fillRect(0, y, width, Math.max(2, baseLineHeight));
        // Warning indicator pip on right edge
        ctx.fillStyle = colors.warning;
        ctx.fillRect(width - 3, y, 3, Math.max(2, baseLineHeight));
      } else if (isHighlighted) {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.32)';
        ctx.fillRect(0, y, width, Math.max(2, baseLineHeight));
        // Highlight indicator pip on left edge
        ctx.fillStyle = colors.highlight;
        ctx.fillRect(0, y, 2.5, Math.max(2, baseLineHeight));
      }

      // Draw code tokens if line has text
      if (lineText.trim().length === 0) continue;

      // Indentation offset
      const indentMatch = lineText.match(/^\s*/);
      const indentCount = indentMatch ? indentMatch[0].length : 0;
      let currentX = 4 + Math.min(indentCount * 1.5, 24);

      // Check if line is a single-line comment
      const trimmed = lineText.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
        ctx.fillStyle = colors.comment;
        const textLen = Math.min(trimmed.length * 1.6, width - currentX - 8);
        if (textLen > 0) {
          ctx.fillRect(currentX, y + 0.4, textLen, tokenHeight);
        }
        continue;
      }

      // Tokenize line into words and symbols
      const tokens = trimmed.split(/(\s+|[(){}[\];,.:+\-*/%=<>!&|^~"])/);
      for (const token of tokens) {
        if (!token || /^\s+$/.test(token)) {
          currentX += token.length * 1.4;
          if (currentX >= width - 8) break;
          continue;
        }

        // Color determination
        if (NOVALANG_KEYWORDS.has(token)) {
          ctx.fillStyle = colors.keyword;
        } else if (/^\d+(\.\d+)?$/.test(token)) {
          ctx.fillStyle = colors.number;
        } else if (token.startsWith('"') || token.endsWith('"') || token.startsWith("'")) {
          ctx.fillStyle = colors.string;
        } else if (/^[A-Z][a-zA-Z0-9_]*$/.test(token)) {
          ctx.fillStyle = colors.keyword;
        } else {
          ctx.fillStyle = colors.identifier;
        }

        const tokenW = Math.max(1.5, Math.min(token.length * 1.8, width - currentX - 6));
        ctx.fillRect(currentX, y + 0.4, tokenW, tokenHeight);
        currentX += tokenW + 1.2;

        if (currentX >= width - 6) break;
      }
    }
  }, [
    code,
    lines,
    totalLines,
    containerWidth,
    canvasAvailableHeight,
    baseLineHeight,
    minimapScrollTop,
    highlightLine,
    isNovaLang,
    getThemeColors,
  ]);

  // Scroll editor to a specific minimap Y offset
  const scrollToMinimapY = useCallback(
    (clickY: number) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const clampedY = Math.max(0, Math.min(canvasAvailableHeight, clickY));
      let targetRatio = 0;

      if (isOverflowing) {
        targetRatio = clampedY / canvasAvailableHeight;
      } else {
        targetRatio = clampedY / Math.max(totalMinimapHeight, 1);
      }

      const targetScrollTop = targetRatio * (scrollMetrics.scrollHeight - scrollMetrics.clientHeight);
      ta.scrollTop = Math.max(0, Math.min(scrollMetrics.scrollHeight - scrollMetrics.clientHeight, targetScrollTop));

      // Calculate approximate line number and trigger onLineClick
      const targetLine = Math.floor((clickY + minimapScrollTop) / baseLineHeight) + 1;
      const clampedLine = Math.max(1, Math.min(totalLines, targetLine));
      onLineClick?.(clampedLine);
    },
    [
      textareaRef,
      canvasAvailableHeight,
      isOverflowing,
      totalMinimapHeight,
      scrollMetrics,
      minimapScrollTop,
      baseLineHeight,
      totalLines,
      onLineClick,
    ]
  );

  // Handle click on minimap track
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    scrollToMinimapY(clickY);
  };

  // Handle dragging the viewport slider
  const handleSliderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingSlider(true);

    const startY = e.clientY;
    const startScrollTop = textareaRef.current?.scrollTop || 0;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const deltaY = moveEvent.clientY - startY;
      const availableSliderTrack = Math.max(1, canvasAvailableHeight - viewportHeight);
      const editorMaxScroll = Math.max(1, scrollMetrics.scrollHeight - scrollMetrics.clientHeight);

      const scrollDelta = (deltaY / availableSliderTrack) * editorMaxScroll;
      ta.scrollTop = Math.max(0, Math.min(editorMaxScroll, startScrollTop + scrollDelta));
    };

    const handlePointerUp = () => {
      setIsDraggingSlider(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Handle mouse move on canvas for line tooltip preview
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const targetLine = Math.floor((y + minimapScrollTop) / baseLineHeight) + 1;

    if (targetLine >= 1 && targetLine <= totalLines) {
      const lineText = lines[targetLine - 1] || '';
      const lineDiags = diagnosticsByLine.current.get(targetLine);
      const primaryDiag = lineDiags?.[0];

      setHoveredLineInfo({
        lineNum: targetLine,
        text: lineText.trim(),
        y,
        diagnostic: primaryDiag,
      });
    } else {
      setHoveredLineInfo(null);
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredLineInfo(null);
  };

  // Jump to next diagnostic issue
  const jumpToNextDiagnostic = (direction: 'next' | 'prev') => {
    if (safeDiagnostics.length === 0) return;
    const sortedLines = (Array.from(diagnosticsByLine.current.keys()) as number[]).sort(
      (a, b) => a - b
    );
    if (sortedLines.length === 0) return;

    const currentLine = highlightLine || Math.floor(scrollMetrics.scrollTop / 20) + 1;
    let targetLine: number = sortedLines[0];

    if (direction === 'next') {
      const next = sortedLines.find((l: number) => l > currentLine);
      targetLine = next !== undefined ? next : sortedLines[0];
    } else {
      const prev = [...sortedLines].reverse().find((l: number) => l < currentLine);
      targetLine = prev !== undefined ? prev : sortedLines[sortedLines.length - 1];
    }

    if (textareaRef.current) {
      const targetScroll = Math.max(0, (targetLine - 3) * 20);
      textareaRef.current.scrollTop = targetScroll;
    }
    onLineClick?.(targetLine);
  };

  // Count errors and warnings
  const errorCount = safeDiagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = safeDiagnostics.filter((d) => d.severity === 'warning').length;

  return (
    <aside
      ref={containerRef}
      style={{
        backgroundColor: 'var(--bg-canvas)',
        borderLeftColor: 'var(--border-app)',
      }}
      aria-label="Code Editor Minimap"
      className={`relative w-[76px] sm:w-[84px] h-full flex flex-col border-l select-none shrink-0 overflow-hidden z-20 ${className}`}
    >
      {/* Minimap Mini Header Bar */}
      <header
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottomColor: 'var(--border-app)',
        }}
        className="h-6 px-1.5 border-b flex items-center justify-between text-[10px] text-slate-400 shrink-0"
      >
        <div className="flex items-center gap-1 min-w-0">
          <MapIcon className="w-3 h-3 text-indigo-400 shrink-0" />
          <span className="font-mono text-[9px] font-semibold tracking-wider text-slate-300 uppercase truncate">
            Map
          </span>
        </div>

        {/* Diagnostic Navigator or Scale Toggle */}
        <div className="flex items-center gap-0.5">
          {errorCount > 0 ? (
            <button
              onClick={() => jumpToNextDiagnostic('next')}
              className="px-1 py-0.2 rounded bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 font-mono text-[9px] font-bold flex items-center gap-0.5 cursor-pointer transition"
              title={`${errorCount} error(s). Click to jump to next error.`}
            >
              <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
              <span>{errorCount}</span>
            </button>
          ) : warningCount > 0 ? (
            <button
              onClick={() => jumpToNextDiagnostic('next')}
              className="px-1 py-0.2 rounded bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 font-mono text-[9px] font-medium flex items-center gap-0.5 cursor-pointer transition"
              title={`${warningCount} warning(s). Click to jump to next warning.`}
            >
              <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
              <span>{warningCount}</span>
            </button>
          ) : (
            <button
              onClick={() => setFitToView(!fitToView)}
              className="p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              title={fitToView ? 'Mode: Fit to View (Click for zoom mode)' : 'Mode: Proportional (Click to fit all)'}
            >
              {fitToView ? <Minimize2 className="w-2.5 h-2.5" /> : <Maximize2 className="w-2.5 h-2.5" />}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer ml-0.5"
              title="Close Minimap (Ctrl+M)"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </header>

      {/* Minimap Canvas & Viewport Slider Container */}
      <div
        className="relative flex-1 w-full overflow-hidden cursor-pointer"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
      >
        {/* Rendered Canvas */}
        <canvas
          ref={canvasRef}
          style={{ width: `${containerWidth}px`, height: `${canvasAvailableHeight}px` }}
          className="absolute inset-0 block pointer-events-none"
        />

        {/* Viewport Slider Overlay */}
        <div
          onPointerDown={handleSliderPointerDown}
          style={{
            top: `${Math.max(0, Math.min(canvasAvailableHeight - viewportHeight, viewportTop))}px`,
            height: `${viewportHeight}px`,
            backgroundColor: 'var(--editor-active-line, rgba(99, 102, 241, 0.16))',
          }}
          className={`absolute left-0 right-0 border-y border-indigo-500/50 hover:bg-indigo-500/25 transition-colors z-20 ${
            isDraggingSlider ? 'cursor-grabbing bg-indigo-500/30' : 'cursor-grab'
          }`}
          title="Drag to scroll editor viewport"
        >
          {/* Subtle drag handle tick on the right */}
          <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded bg-indigo-400/50" />
        </div>

        {/* Hover Crosshair Line */}
        {hoveredLineInfo && (
          <div
            style={{ top: `${hoveredLineInfo.y}px` }}
            className="absolute left-0 right-0 h-[1px] bg-indigo-400/60 pointer-events-none z-30"
          />
        )}

        {/* Hover Floating Tooltip Preview (Appears to the left of the minimap) */}
        {hoveredLineInfo && (
          <div
            style={{
              top: `${Math.max(4, Math.min(canvasAvailableHeight - 50, hoveredLineInfo.y - 12))}px`,
            }}
            className="absolute right-full mr-2 z-40 w-48 sm:w-56 p-1.5 rounded-md bg-[#0f172a] border border-slate-700 shadow-xl text-[10px] pointer-events-none flex flex-col gap-1 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between text-slate-400 font-mono text-[9px] border-b border-slate-800 pb-0.5">
              <span className="text-indigo-300 font-bold">Line {hoveredLineInfo.lineNum}</span>
              {hoveredLineInfo.diagnostic && (
                <span
                  className={`font-semibold flex items-center gap-0.5 ${
                    hoveredLineInfo.diagnostic.severity === 'error'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {hoveredLineInfo.diagnostic.severity === 'error' ? '● Error' : '▲ Warning'}
                </span>
              )}
            </div>

            {hoveredLineInfo.text ? (
              <span className="font-mono text-slate-200 truncate text-[10px]">
                {hoveredLineInfo.text}
              </span>
            ) : (
              <span className="italic text-slate-500 text-[9px]">Empty line</span>
            )}

            {hoveredLineInfo.diagnostic && (
              <span className="text-[9px] text-rose-300 line-clamp-2 leading-tight">
                {hoveredLineInfo.diagnostic.message}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Minimap Footer - Line Count & Quick Navigation */}
      <footer
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderTopColor: 'var(--border-app)',
        }}
        className="h-5 px-1.5 border-t flex items-center justify-between text-[9px] font-mono text-slate-500 shrink-0"
      >
        <span className="truncate">{totalLines}L</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => jumpToNextDiagnostic('prev')}
            disabled={safeDiagnostics.length === 0}
            className="p-0.5 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-500 cursor-pointer"
            title="Previous Diagnostic Issue"
          >
            <ChevronUp className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => jumpToNextDiagnostic('next')}
            disabled={safeDiagnostics.length === 0}
            className="p-0.5 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-500 cursor-pointer"
            title="Next Diagnostic Issue"
          >
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
        </div>
      </footer>
    </aside>
  );
};
