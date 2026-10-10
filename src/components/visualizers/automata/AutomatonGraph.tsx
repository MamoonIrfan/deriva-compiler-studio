import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Move, RefreshCw, Eye } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export interface GraphNode {
  id: number;
  label: string;
  sublabel?: string;
  isStart?: boolean;
  isAccept?: boolean;
  reason?: string;
}

export interface GraphEdge {
  from: number;
  to: number;
  label: string;
  isEpsilon?: boolean;
}

interface AutomatonGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  activeStates?: number[];
  visitedStates?: number[];
  activeTransitions?: { from: number; to: number; char?: string }[];
  selectedState?: number | null;
  onSelectState?: (stateId: number) => void;
  title?: string;
  height?: number | string;
  showControls?: boolean;
  simulationStatus?: 'IDLE' | 'SIMULATING' | 'ACCEPTED' | 'REJECTED';
}

interface NodePosition {
  x: number;
  y: number;
}

export const AutomatonGraph: React.FC<AutomatonGraphProps> = ({
  nodes,
  edges,
  activeStates = [],
  visitedStates = [],
  activeTransitions = [],
  selectedState = null,
  onSelectState,
  title,
  height = 420,
  showControls = true,
  simulationStatus,
}) => {
  const { theme } = useTheme();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport transforms (pan and zoom)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreenFocus, setIsFullscreenFocus] = useState<boolean>(false);

  // Multi-touch tracking
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);

  // Node positions
  const [positions, setPositions] = useState<Record<number, NodePosition>>({});
  const [draggingNode, setDraggingNode] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tooltip
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const nodeRadius = 24;

  // Escape key to exit fullscreen focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreenFocus) {
        setIsFullscreenFocus(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenFocus]);

  // ResizeObserver to adapt viewport on layout changes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      // Container dimensions changed; svg updates automatically
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);


  // Group multiple edges between same pair of nodes (e.g. from 0 to 1 on 'a' and 'b' -> 'a, b')
  const groupedEdges = useMemo(() => {
    const map = new Map<string, { from: number; to: number; labels: string[]; isEpsilon: boolean }>();
    for (const edge of edges) {
      const key = `${edge.from}->${edge.to}`;
      if (!map.has(key)) {
        map.set(key, {
          from: edge.from,
          to: edge.to,
          labels: [edge.label],
          isEpsilon: !!edge.isEpsilon || edge.label === 'ε',
        });
      } else {
        const item = map.get(key)!;
        if (!item.labels.includes(edge.label)) {
          item.labels.push(edge.label);
        }
        if (edge.isEpsilon || edge.label === 'ε') {
          item.isEpsilon = true;
        }
      }
    }
    return Array.from(map.values()).map((item) => ({
      from: item.from,
      to: item.to,
      label: item.labels.join(', '),
      isEpsilon: item.isEpsilon,
    }));
  }, [edges]);

  // Compute deterministic topological / layered layout
  const computeInitialLayout = useCallback(() => {
    if (nodes.length === 0) return {};

    const posMap: Record<number, NodePosition> = {};
    const startNode = nodes.find((n) => n.isStart) || nodes[0];

    // BFS to assign layers
    const layers = new Map<number, number>();
    const visited = new Set<number>();
    const queue: { id: number; layer: number }[] = [{ id: startNode.id, layer: 0 }];
    visited.add(startNode.id);
    layers.set(startNode.id, 0);

    while (queue.length > 0) {
      const { id, layer } = queue.shift()!;
      // Find successors
      const successors = edges.filter((e) => e.from === id).map((e) => e.to);
      for (const succ of successors) {
        if (!visited.has(succ)) {
          visited.add(succ);
          layers.set(succ, layer + 1);
          queue.push({ id: succ, layer: layer + 1 });
        }
      }
    }

    // Any unreached nodes get put in higher layers
    let maxLayer = 0;
    layers.forEach((l) => {
      if (l > maxLayer) maxLayer = l;
    });

    nodes.forEach((n) => {
      if (!layers.has(n.id)) {
        maxLayer++;
        layers.set(n.id, maxLayer);
      }
    });

    // Group nodes by layer
    const layerBuckets = new Map<number, number[]>();
    nodes.forEach((n) => {
      const l = layers.get(n.id) || 0;
      if (!layerBuckets.has(l)) layerBuckets.set(l, []);
      layerBuckets.get(l)!.push(n.id);
    });

    const layerSpacingX = 160;
    const nodeSpacingY = 95;
    const startX = 85;
    const startY = 70;

    layerBuckets.forEach((nodeIds, layerIndex) => {
      const totalH = (nodeIds.length - 1) * nodeSpacingY;
      const offsetY = startY + (nodeIds.length > 1 ? 0 : 40);
      nodeIds.forEach((id, index) => {
        posMap[id] = {
          x: startX + layerIndex * layerSpacingX,
          y: offsetY + index * nodeSpacingY,
        };
      });
    });

    return posMap;
  }, [nodes, edges]);

  // Initialize or re-layout when nodes structure changes
  useEffect(() => {
    const layout = computeInitialLayout();
    setPositions(layout);
  }, [computeInitialLayout]);

  // Fit to view
  const fitToView = useCallback(() => {
    if (!containerRef.current || Object.keys(positions).length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xs = (Object.values(positions) as NodePosition[]).map((p) => p.x);
    const ys = (Object.values(positions) as NodePosition[]).map((p) => p.y);

    const minX = Math.min(...xs) - 60;
    const maxX = Math.max(...xs) + 60;
    const minY = Math.min(...ys) - 60;
    const maxY = Math.max(...ys) + 60;

    const graphWidth = Math.max(maxX - minX, 100);
    const graphHeight = Math.max(maxY - minY, 100);

    const scaleX = (rect.width - 40) / graphWidth;
    const scaleY = (rect.height - 40) / graphHeight;
    const newZoom = Math.max(0.4, Math.min(1.4, Math.min(scaleX, scaleY)));

    setZoom(newZoom);
    setPan({
      x: (rect.width - graphWidth * newZoom) / 2 - minX * newZoom,
      y: (rect.height - graphHeight * newZoom) / 2 - minY * newZoom,
    });
  }, [positions]);

  // Initial fit to view once positions are ready
  useEffect(() => {
    if (Object.keys(positions).length > 0) {
      const timer = setTimeout(fitToView, 50);
      return () => clearTimeout(timer);
    }
  }, [positions, fitToView]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.3), 3.0));
  };

  // Canvas pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'graph-bg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggingNode !== null) {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const currentMouseX = (e.clientX - rect.left - pan.x) / zoom;
      const currentMouseY = (e.clientY - rect.top - pan.y) / zoom;

      setPositions((prev) => ({
        ...prev,
        [draggingNode]: {
          x: Math.round(currentMouseX - dragOffset.x),
          y: Math.round(currentMouseY - dragOffset.y),
        },
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
  };

  // Multi-touch gestures: single-finger pan, two-finger pinch-zoom, and double-tap fit-to-view
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        fitToView();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      setIsPanning(true);
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      setPan({ x: touch.clientX - panStart.x, y: touch.clientY - panStart.y });
    } else if (e.touches.length === 1 && draggingNode !== null) {
      if (!svgRef.current) return;
      const touch = e.touches[0];
      const rect = svgRef.current.getBoundingClientRect();
      const currentMouseX = (touch.clientX - rect.left - pan.x) / zoom;
      const currentMouseY = (touch.clientY - rect.top - pan.y) / zoom;

      setPositions((prev) => ({
        ...prev,
        [draggingNode]: {
          x: Math.round(currentMouseX - dragOffset.x),
          y: Math.round(currentMouseY - dragOffset.y),
        },
      }));
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const factor = currentDist / touchStartDistRef.current;
      setZoom(Math.min(Math.max(touchStartZoomRef.current * factor, 0.3), 3.0));
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    setDraggingNode(null);
    touchStartDistRef.current = null;
  };

  // Node drag start
  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    if (onSelectState) onSelectState(node.id);
    const pos = positions[node.id] || { x: 0, y: 0 };
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    setDraggingNode(node.id);
    setDragOffset({
      x: mouseX - pos.x,
      y: mouseY - pos.y,
    });
  };

  const handleNodeTouchStart = (e: React.TouchEvent, node: GraphNode) => {
    e.stopPropagation();
    if (onSelectState) onSelectState(node.id);
    if (e.touches.length !== 1 || !svgRef.current) return;
    const touch = e.touches[0];
    const pos = positions[node.id] || { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = (touch.clientX - rect.left - pan.x) / zoom;
    const mouseY = (touch.clientY - rect.top - pan.y) / zoom;

    setDraggingNode(node.id);
    setDragOffset({
      x: mouseX - pos.x,
      y: mouseY - pos.y,
    });
  };

  // Check if an edge is active
  const isEdgeActive = (from: number, to: number, label: string) => {
    return activeTransitions.some((t) => {
      if (t.from !== from || t.to !== to) return false;
      if (!t.char) return true;
      if (t.char === 'ε' && label.includes('ε')) return true;
      const tokens = label.split(',').map((s) => s.trim());
      if (tokens.includes(t.char)) return true;
      if (t.char.length === 1) {
        if (/[0-9]/.test(t.char) && tokens.includes('digit')) return true;
        if (/[a-zA-Z]/.test(t.char) && tokens.includes('letter')) return true;
      }
      return false;
    });
  };

  // Theme-aware color palette
  const colors = useMemo(() => {
    const isDark = theme !== 'light';
    return {
      bg: isDark ? '#0f172a' : '#f8fafc',
      grid: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      nodeBg: isDark ? '#1e293b' : '#ffffff',
      nodeBorder: isDark ? '#475569' : '#cbd5e1',
      nodeText: isDark ? '#f1f5f9' : '#0f172a',
      nodeSubtext: isDark ? '#94a3b8' : '#64748b',
      startArrow: '#3b82f6',
      acceptRing: isDark ? '#10b981' : '#059669',
      edgeDefault: isDark ? '#64748b' : '#94a3b8',
      edgeLabelBg: isDark ? '#1e293b' : '#f1f5f9',
      edgeLabelText: isDark ? '#cbd5e1' : '#334155',
      edgeEpsilon: isDark ? '#c084fc' : '#9333ea',
      activeNodeGlow: '#06b6d4',
      activeNodeBg: isDark ? '#164e63' : '#cffafe',
      activeNodeBorder: '#0891b2',
      selectedBorder: '#f59e0b',
      visitedBorder: isDark ? '#818cf8' : '#6366f1',
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className={
        isFullscreenFocus
          ? 'fixed inset-0 z-50 p-3 sm:p-6 bg-slate-950/95 backdrop-blur-md flex flex-col overflow-hidden select-none animate-in fade-in duration-200'
          : 'relative w-full rounded-xl border border-slate-700/60 bg-slate-950/80 overflow-hidden select-none shadow-inner'
      }
      style={{ height: isFullscreenFocus ? '100dvh' : height }}
    >
      {/* Top Header & Interactive Toolbar */}
      <div className="absolute top-2 left-2 sm:left-3 right-2 sm:right-3 z-10 flex items-center justify-between pointer-events-none gap-1 sm:gap-2">
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-700/60 shadow-md min-w-0">
          {title && <span className="text-xs font-semibold text-slate-200 tracking-wide truncate">{title}</span>}
          <span className="text-[11px] text-slate-400 font-mono shrink-0">
            <span className="hidden sm:inline">{nodes.length} states, {edges.length} edges</span>
            <span className="sm:hidden">{nodes.length}s, {edges.length}e</span>
          </span>
          {isFullscreenFocus && (
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/60">
              Focus Mode
            </span>
          )}
        </div>

        {showControls && (
          <div className="pointer-events-auto flex items-center gap-0.5 sm:gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-700/60 shadow-md shrink-0">
            <button
              onClick={() => setZoom((z) => Math.min(z * 1.2, 3.0))}
              title="Zoom In"
              aria-label="Zoom In"
              className="p-1.5 hover:bg-slate-800 text-slate-300 rounded text-xs transition touch-manipulation cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z / 1.2, 0.3))}
              title="Zoom Out"
              aria-label="Zoom Out"
              className="p-1.5 hover:bg-slate-800 text-slate-300 rounded text-xs transition touch-manipulation cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={fitToView}
              title="Fit to View (Double-tap canvas)"
              aria-label="Fit to View"
              className="p-1.5 hover:bg-slate-800 text-slate-300 rounded text-xs transition touch-manipulation cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                const layout = computeInitialLayout();
                setPositions(layout);
                setTimeout(fitToView, 30);
              }}
              title="Re-layout Graph"
              aria-label="Re-layout Graph"
              className="p-1.5 hover:bg-slate-800 text-slate-300 rounded text-xs transition touch-manipulation cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Toggle Fullscreen / Focus Mode */}
            <button
              onClick={() => setIsFullscreenFocus((prev) => !prev)}
              title={isFullscreenFocus ? 'Exit Focus View (Esc)' : 'Focus Graph Full Viewport'}
              aria-label={isFullscreenFocus ? 'Exit Focus View' : 'Focus Graph Full Viewport'}
              className={`p-1.5 rounded text-xs transition touch-manipulation cursor-pointer ${
                isFullscreenFocus
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'hover:bg-slate-800 text-indigo-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-700 mx-0.5 hidden sm:block" />
            <span className="text-[10px] text-slate-400 font-mono px-1 hidden sm:inline-block">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Main SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        role="img"
        aria-label="Automaton state transition diagram"
      >
        <defs>
          {/* Subtle background grid pattern */}
          <pattern id="graphGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill={colors.grid} />
          </pattern>

          {/* Standard transition arrowhead */}
          <marker
            id="arrowhead-default"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.edgeDefault} />
          </marker>

          {/* Active transition arrowhead */}
          <marker
            id="arrowhead-active"
            markerWidth="11"
            markerHeight="8"
            refX="10"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 11 4, 0 8" fill="#38bdf8" />
          </marker>

          {/* Epsilon transition arrowhead */}
          <marker
            id="arrowhead-epsilon"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.edgeEpsilon} />
          </marker>

          {/* Start state incoming arrowhead */}
          <marker
            id="arrowhead-start"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.startArrow} />
          </marker>

          {/* Glow filter for active states */}
          <filter id="active-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Glow filter for active transition edges */}
          <filter id="edge-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background rect for panning */}
        <rect id="graph-bg" width="100%" height="100%" fill="url(#graphGrid)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 1. EDGES LAYER */}
          {groupedEdges.map((edge, index) => {
            const fromPos = positions[edge.from];
            const toPos = positions[edge.to];
            if (!fromPos || !toPos) return null;

            const isActive = isEdgeActive(edge.from, edge.to, edge.label);
            const isEps = edge.isEpsilon;

            // Self-loop transition
            if (edge.from === edge.to) {
              const x = fromPos.x;
              const y = fromPos.y;
              // Loop curve above node
              const pathData = `M ${x - 12} ${y - 21} C ${x - 30} ${y - 65}, ${x + 30} ${y - 65}, ${x + 12} ${y - 21}`;
              const labelX = x;
              const labelY = y - 56;

              return (
                <g key={`loop-${edge.from}-${index}`} className="transition-all duration-200">
                  {/* Active background glowing beam */}
                  {isActive && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={5}
                      strokeOpacity={0.4}
                      filter="url(#edge-glow)"
                    />
                  )}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isActive ? '#38bdf8' : isEps ? colors.edgeEpsilon : colors.edgeDefault}
                    strokeWidth={isActive ? 3 : 1.8}
                    strokeDasharray={isEps ? '4,3' : 'none'}
                    markerEnd={`url(#arrowhead-${isActive ? 'active' : isEps ? 'epsilon' : 'default'})`}
                    className={isActive ? 'animate-pulse' : ''}
                  />
                  {/* Animated Traveling Particle along self-loop */}
                  {isActive && (
                    <circle r="4.5" fill="#38bdf8" filter="url(#active-glow)">
                      <animateMotion path={pathData} dur="1.2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Label pill */}
                  <rect
                    x={labelX - 12}
                    y={labelY - 9}
                    width={24}
                    height={16}
                    rx={4}
                    fill={isActive ? '#0c4a6e' : colors.edgeLabelBg}
                    stroke={isActive ? '#38bdf8' : 'rgba(100,116,139,0.3)'}
                    strokeWidth={isActive ? 1.6 : 1}
                  />
                  <text
                    x={labelX}
                    y={labelY + 3}
                    textAnchor="middle"
                    fill={isActive ? '#38bdf8' : isEps ? colors.edgeEpsilon : colors.edgeLabelText}
                    fontSize="10.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {edge.label}
                  </text>
                </g>
              );
            }

            // Normal transition between different nodes
            // Check if opposite edge exists
            const hasOpposite = groupedEdges.some((e) => e.from === edge.to && e.to === edge.from);
            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return null;

            const ux = dx / dist;
            const uy = dy / dist;
            // Perpendicular unit vector
            const px = -uy;
            const py = ux;

            let pathData = '';
            let labelX = 0;
            let labelY = 0;

            if (hasOpposite) {
              // Curve to the right of direction vector to avoid overlapping opposite edge
              const curveOffset = 26;
              const midX = (fromPos.x + toPos.x) / 2 + px * curveOffset;
              const midY = (fromPos.y + toPos.y) / 2 + py * curveOffset;

              // Start and end points on node circle
              const startX = fromPos.x + ux * nodeRadius + px * 6;
              const startY = fromPos.y + uy * nodeRadius + py * 6;
              const endX = toPos.x - ux * (nodeRadius + 6) + px * 6;
              const endY = toPos.y - uy * (nodeRadius + 6) + py * 6;

              pathData = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
              labelX = midX + px * 3;
              labelY = midY + py * 3;
            } else {
              // Straight transition
              const startX = fromPos.x + ux * nodeRadius;
              const startY = fromPos.y + uy * nodeRadius;
              const endX = toPos.x - ux * (nodeRadius + 6);
              const endY = toPos.y - uy * (nodeRadius + 6);

              pathData = `M ${startX} ${startY} L ${endX} ${endY}`;
              labelX = (startX + endX) / 2 + px * 12;
              labelY = (startY + endY) / 2 + py * 12;
            }

            const labelWidth = Math.max(edge.label.length * 7.5 + 10, 20);

            return (
              <g key={`edge-${edge.from}-${edge.to}-${index}`} className="transition-all duration-200">
                {/* Active background glowing beam */}
                {isActive && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={5}
                    strokeOpacity={0.4}
                    filter="url(#edge-glow)"
                  />
                )}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isActive ? '#38bdf8' : isEps ? colors.edgeEpsilon : colors.edgeDefault}
                  strokeWidth={isActive ? 3 : 1.8}
                  strokeDasharray={isEps ? '4,3' : 'none'}
                  markerEnd={`url(#arrowhead-${isActive ? 'active' : isEps ? 'epsilon' : 'default'})`}
                  className={isActive ? 'animate-pulse' : ''}
                />
                {/* Animated Traveling Particle along edge */}
                {isActive && (
                  <circle r="4.5" fill="#38bdf8" filter="url(#active-glow)">
                    <animateMotion path={pathData} dur="1.2s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Edge Label Badge */}
                <rect
                  x={labelX - labelWidth / 2}
                  y={labelY - 9}
                  width={labelWidth}
                  height={17}
                  rx={4}
                  fill={isActive ? '#0c4a6e' : colors.edgeLabelBg}
                  stroke={isActive ? '#38bdf8' : isEps ? colors.edgeEpsilon : 'rgba(100,116,139,0.35)'}
                  strokeWidth={isActive ? 1.6 : 1}
                />
                <text
                  x={labelX}
                  y={labelY + 3.5}
                  textAnchor="middle"
                  fill={isActive ? '#38bdf8' : isEps ? colors.edgeEpsilon : colors.edgeLabelText}
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {/* 2. NODES LAYER */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;

            const isActive = activeStates.includes(node.id);
            const isVisited = visitedStates.includes(node.id);
            const isSelected = selectedState === node.id;

            return (
              <g
                key={`node-${node.id}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer group"
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onTouchStart={(e) => handleNodeTouchStart(e, node)}
                onMouseEnter={(e) => {
                  setHoveredNode(node);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Start State Indicator Arrow */}
                {node.isStart && (
                  <g className="transition-all">
                    <line
                      x1={-nodeRadius - 32}
                      y1={0}
                      x2={-nodeRadius - 4}
                      y2={0}
                      stroke={colors.startArrow}
                      strokeWidth={2.4}
                      markerEnd="url(#arrowhead-start)"
                    />
                    <text
                      x={-nodeRadius - 34}
                      y={-6}
                      textAnchor="end"
                      fill={colors.startArrow}
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      Start
                    </text>
                  </g>
                )}

                {/* Active Glow Halo */}
                {isActive && (
                  <>
                    <circle
                      cx={0}
                      cy={0}
                      r={nodeRadius + 7}
                      fill="none"
                      stroke={colors.activeNodeGlow}
                      strokeWidth={2.5}
                      strokeDasharray="4,2"
                      className="animate-spin"
                      style={{ transformOrigin: '0 0' }}
                    />
                    {/* Floating Status Indicator Badge */}
                    <g transform={`translate(0, ${-nodeRadius - 13})`} className="pointer-events-none select-none">
                      <rect
                        x={simulationStatus === 'ACCEPTED' ? -28 : simulationStatus === 'REJECTED' ? -28 : -26}
                        y={-11}
                        width={simulationStatus === 'ACCEPTED' ? 56 : simulationStatus === 'REJECTED' ? 56 : 52}
                        height={16}
                        rx={4}
                        fill={
                          simulationStatus === 'ACCEPTED'
                            ? '#065f46'
                            : simulationStatus === 'REJECTED'
                            ? '#9f1239'
                            : '#0369a1'
                        }
                        stroke={
                          simulationStatus === 'ACCEPTED'
                            ? '#34d399'
                            : simulationStatus === 'REJECTED'
                            ? '#f43f5e'
                            : '#38bdf8'
                        }
                        strokeWidth={1.2}
                        filter="url(#edge-glow)"
                      />
                      <polygon
                        points="0,5 -3.5,0 3.5,0"
                        fill={
                          simulationStatus === 'ACCEPTED'
                            ? '#065f46'
                            : simulationStatus === 'REJECTED'
                            ? '#9f1239'
                            : '#0369a1'
                        }
                      />
                      <text
                        x={0}
                        y={1}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {simulationStatus === 'ACCEPTED'
                          ? '✓ ACCEPT'
                          : simulationStatus === 'REJECTED'
                          ? '✕ REJECT'
                          : 'CURRENT'}
                      </text>
                    </g>
                  </>
                )}

                {/* Main Outer Circle */}
                <circle
                  cx={0}
                  cy={0}
                  r={nodeRadius}
                  fill={isActive ? colors.activeNodeBg : colors.nodeBg}
                  stroke={
                    isSelected
                      ? colors.selectedBorder
                      : isActive
                      ? colors.activeNodeBorder
                      : node.isAccept
                      ? colors.acceptRing
                      : isVisited
                      ? colors.visitedBorder
                      : colors.nodeBorder
                  }
                  strokeWidth={isSelected ? 3 : node.isAccept || isActive ? 2.5 : 1.8}
                  filter={isActive ? 'url(#active-glow)' : 'none'}
                  className="transition-colors duration-200"
                />

                {/* Double Circle for Accepting / Final States */}
                {node.isAccept && (
                  <circle
                    cx={0}
                    cy={0}
                    r={nodeRadius - 5}
                    fill="none"
                    stroke={isSelected ? colors.selectedBorder : colors.acceptRing}
                    strokeWidth={1.8}
                  />
                )}

                {/* State Label */}
                <text
                  x={0}
                  y={node.sublabel ? -2 : 4.5}
                  textAnchor="middle"
                  fill={isActive ? '#38bdf8' : node.isAccept ? colors.acceptRing : colors.nodeText}
                  fontSize="12.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                  className="pointer-events-none select-none"
                >
                  {node.label}
                </text>

                {/* State Sublabel (e.g. subset {0, 1} or merged) */}
                {node.sublabel && (
                  <text
                    x={0}
                    y={11}
                    textAnchor="middle"
                    fill={colors.nodeSubtext}
                    fontSize="8.5"
                    fontFamily="monospace"
                    className="pointer-events-none select-none"
                  >
                    {node.sublabel.length > 7 ? `${node.sublabel.slice(0, 6)}…` : node.sublabel}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating State Tooltip on Hover */}
      {hoveredNode && (
        <div
          className="absolute z-30 pointer-events-none bg-slate-900/95 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs text-slate-200 max-w-xs backdrop-blur-md"
          style={{
            left: Math.min(Math.max(tooltipPos.x - 60, 16), 400),
            bottom: 16,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold text-cyan-400 font-mono">State {hoveredNode.label}</span>
            <div className="flex items-center gap-1.5">
              {hoveredNode.isStart && (
                <span className="bg-blue-900/70 text-blue-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
                  Start
                </span>
              )}
              {hoveredNode.isAccept && (
                <span className="bg-emerald-900/70 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
                  Accepting
                </span>
              )}
            </div>
          </div>
          {hoveredNode.sublabel && (
            <div className="text-[11px] text-slate-400 font-mono mb-1">
              Represents: <span className="text-slate-200">{hoveredNode.sublabel}</span>
            </div>
          )}
          {hoveredNode.reason && (
            <div className="text-[11px] text-slate-300 leading-tight">
              {hoveredNode.reason}
            </div>
          )}
        </div>
      )}

      {/* Bottom Hint Banner */}
      <div className="absolute bottom-2 right-2 sm:right-3 pointer-events-none flex items-center gap-1.5 text-[10px] text-slate-500 font-mono bg-slate-900/80 px-2 py-1 rounded border border-slate-800 max-w-[calc(100%-16px)] truncate">
        <span className="hidden sm:inline">Drag to rearrange • </span>
        <span className="hidden md:inline">Scroll to zoom • </span>
        <span className="truncate">Double-circle = Accept</span>
      </div>
    </div>
  );
};
