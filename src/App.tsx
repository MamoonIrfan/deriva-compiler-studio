import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Code2,
  Cpu,
  Eye,
  FileCode,
  FolderOpen,
  Gauge,
  HelpCircle,
  Layers,
  Layout,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { CompilationSession, CompilerDiagnostic, OptimizationLevel, Token } from './types';
import { NovaCompilerDriver } from './compiler/driver';
import { SAMPLE_PROGRAMS } from './data/samplePrograms';
import { Header } from './components/layout/Header';
import { CodeEditor } from './components/editor/CodeEditor';
import { DiagnosticsPanel } from './components/panels/DiagnosticsPanel';
import { ExplorerPanel } from './components/panels/ExplorerPanel';
import { LexerVisualizer } from './components/visualizers/LexerVisualizer';
import { ParserVisualizer } from './components/visualizers/ParserVisualizer';
import { SemanticVisualizer } from './components/visualizers/SemanticVisualizer';
import { IRVisualizer } from './components/visualizers/IRVisualizer';
import { CFGVisualizer } from './components/visualizers/CFGVisualizer';
import { DataFlowVisualizer } from './components/visualizers/DataFlowVisualizer';
import { OptimizerVisualizer } from './components/visualizers/OptimizerVisualizer';
import { CodeGenVisualizer } from './components/visualizers/CodeGenVisualizer';
import { VMVisualizer } from './components/visualizers/VMVisualizer';
import { UserGuideVisualizer } from './components/visualizers/UserGuideVisualizer';
import { UserGuideModal } from './components/modals/UserGuideModal';
import { PanelFrame } from './components/layout/PanelFrame';
import { Splitter } from './components/layout/Splitter';
import { LayoutPreset, PanelId } from './types/docking';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { WorkspaceModals } from './components/modals/WorkspaceModals';

function AppContent() {
  const {
    activeFile,
    activeDocumentId,
    updateFileContent,
    saveFile,
    saveAllFiles,
    closeDocument,
    loadSampleIntoProject,
    createFile,
    openDocument,
  } = useWorkspace();

  const isCompilableSource = (ext?: string): boolean => ext === '.dev' || ext === '.nova';
  const isDerivaLang = isCompilableSource(activeFile?.extension);

  const [activeCode, setActiveCode] = useState<string>(activeFile?.content || SAMPLE_PROGRAMS[0].code);
  const [lastCompiledSourceCode, setLastCompiledSourceCode] = useState<string>(
    isCompilableSource(activeFile?.extension) ? activeFile!.content : SAMPLE_PROGRAMS[0].code
  );

  // Synchronize activeCode with workspace activeFile
  useEffect(() => {
    if (activeFile) {
      setActiveCode(activeFile.content);
      if (isCompilableSource(activeFile.extension)) {
        setLastCompiledSourceCode(activeFile.content);
      }
    } else {
      setActiveCode('');
    }
  }, [activeFile?.id, activeFile?.content, activeFile?.extension]);

  const [activeTab, setActiveTab] = useState<string>('editor');
  const [optimizationLevel, setOptimizationLevel] = useState<OptimizationLevel>('O2');
  const [kRegisters, setKRegisters] = useState<number>(4);
  const [highlightLine, setHighlightLine] = useState<number | undefined>(undefined);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);

  // Dragging / Resizing Active State (disables transitions during drag for 60fps tracking)
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Storage key helpers with backwards-compatible fallback
  const getStoredItem = (key: string) => {
    try {
      return localStorage.getItem(`deriva_${key}`) ?? localStorage.getItem(`novacompiler_${key}`);
    } catch {
      return null;
    }
  };
  const setStoredItem = (key: string, value: string) => {
    try {
      localStorage.setItem(`deriva_${key}`, value);
    } catch {}
  };
  const removeStoredItem = (key: string) => {
    try {
      localStorage.removeItem(`deriva_${key}`);
      localStorage.removeItem(`novacompiler_${key}`);
    } catch {}
  };

  // Left Explorer Panel State
  const [isExplorerOpen, setIsExplorerOpen] = useState<boolean>(() => {
    try {
      const saved = getStoredItem('explorer_open');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });

  const [explorerWidth, setExplorerWidth] = useState<number>(() => {
    try {
      const saved = getStoredItem('explorer_width');
      if (saved) return Number(saved);
    } catch {}
    return 220;
  });

  // Layout & Docking State with LocalStorage Persistence
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>(() => {
    try {
      const saved = getStoredItem('layout_preset');
      if (saved) return saved as LayoutPreset;
    } catch {}
    return 'vscode-default';
  });

  const [leftSplitWidth, setLeftSplitWidth] = useState<number>(() => {
    try {
      const saved = getStoredItem('left_split');
      if (saved) return Number(saved);
    } catch {}
    return 44;
  });

  const [diagnosticsHeight, setDiagnosticsHeight] = useState<number>(() => {
    try {
      const saved = getStoredItem('diagnostics_height');
      if (saved) return Number(saved);
    } catch {}
    return 190;
  });

  const [bottomDockHeight, setBottomDockHeight] = useState<number>(() => {
    try {
      const saved = getStoredItem('bottom_dock_height');
      if (saved) return Number(saved);
    } catch {}
    return 210;
  });

  const [col1Width, setCol1Width] = useState<number>(() => {
    try {
      const saved = getStoredItem('col1_width');
      if (saved) return Number(saved);
    } catch {}
    return 33;
  });

  const [col2Width, setCol2Width] = useState<number>(() => {
    try {
      const saved = getStoredItem('col2_width');
      if (saved) return Number(saved);
    } catch {}
    return 33;
  });

  const [maximizedPanel, setMaximizedPanel] = useState<PanelId | null>(null);
  const [focusedPanel, setFocusedPanel] = useState<PanelId | null>(null);

  const [hiddenPanels, setHiddenPanels] = useState<Record<PanelId, boolean>>(() => {
    try {
      const saved = getStoredItem('hidden_panels');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      editor: false,
      diagnostics: false,
      visualizer: false,
      explorer: false,
    };
  });

  const [collapsedPanels, setCollapsedPanels] = useState<Record<PanelId, boolean>>(() => {
    try {
      const saved = getStoredItem('collapsed');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      editor: false,
      diagnostics: false,
      visualizer: false,
      explorer: false,
    };
  });

  // Responsive mobile state
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [mobileActivePanel, setMobileActivePanel] = useState<PanelId>('editor');
  const [mobileViewMode, setMobileViewMode] = useState<'focus' | 'stack'>('focus');

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsExplorerOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save workspace changes to localStorage
  useEffect(() => {
    setStoredItem('layout_preset', layoutPreset);
    setStoredItem('left_split', leftSplitWidth.toString());
    setStoredItem('diagnostics_height', diagnosticsHeight.toString());
    setStoredItem('bottom_dock_height', bottomDockHeight.toString());
    setStoredItem('col1_width', col1Width.toString());
    setStoredItem('col2_width', col2Width.toString());
    setStoredItem('collapsed', JSON.stringify(collapsedPanels));
    setStoredItem('hidden_panels', JSON.stringify(hiddenPanels));
    setStoredItem('explorer_open', JSON.stringify(isExplorerOpen));
    setStoredItem('explorer_width', explorerWidth.toString());
  }, [
    layoutPreset,
    leftSplitWidth,
    diagnosticsHeight,
    bottomDockHeight,
    col1Width,
    col2Width,
    collapsedPanels,
    hiddenPanels,
    isExplorerOpen,
    explorerWidth,
  ]);

  // Keyboard shortcut: Ctrl+B / Cmd+B to toggle Explorer, Esc to exit Focus / Maximize
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsExplorerOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (focusedPanel) {
          e.preventDefault();
          setFocusedPanel(null);
        } else if (maximizedPanel) {
          e.preventDefault();
          setMaximizedPanel(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maximizedPanel, focusedPanel]);

  // Dynamic slot arrangement (which panel is in which position)
  const [slots, setSlots] = useState<{
    slotA: PanelId;
    slotB: PanelId;
    slotC: PanelId;
  }>(() => {
    try {
      const saved = getStoredItem('slots');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      slotA: 'editor',
      slotB: 'diagnostics',
      slotC: 'visualizer',
    };
  });

  useEffect(() => {
    setStoredItem('slots', JSON.stringify(slots));
  }, [slots]);

  // Drag and drop tracking
  const [draggedPanel, setDraggedPanel] = useState<PanelId | null>(null);
  const [dragOverPanel, setDragOverPanel] = useState<PanelId | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Compile session state
  const [session, setSession] = useState<CompilationSession>(() => {
    return NovaCompilerDriver.compile(SAMPLE_PROGRAMS[0].code, {
      optimizationLevel: 'O2',
      registersK: 4,
    });
  });

  // Recompile automatically when compilable source code, optimization level, or registers change
  useEffect(() => {
    if (!lastCompiledSourceCode) return;
    const timer = setTimeout(() => {
      const result = NovaCompilerDriver.compile(lastCompiledSourceCode, {
        optimizationLevel,
        registersK: kRegisters,
      });
      setSession(result);
    }, 200);

    return () => clearTimeout(timer);
  }, [lastCompiledSourceCode, optimizationLevel, kRegisters]);

  const handleManualCompile = () => {
    if (!lastCompiledSourceCode) return;
    const result = NovaCompilerDriver.compile(lastCompiledSourceCode, {
      optimizationLevel,
      registersK: kRegisters,
    });
    setSession(result);
  };

  const handleCodeChange = (newCode: string) => {
    setActiveCode(newCode);
    if (activeFile) {
      updateFileContent(activeFile.id, newCode);
      if (isCompilableSource(activeFile.extension)) {
        setLastCompiledSourceCode(newCode);
      }
    }
  };

  const handleSelectSample = (code: string) => {
    if (activeFile && isCompilableSource(activeFile.extension)) {
      handleCodeChange(code);
    } else {
      loadSampleIntoProject('sample_program', code);
    }
    setHighlightLine(undefined);
  };

  const handleDiagnosticClick = (diagnostic: CompilerDiagnostic) => {
    if (diagnostic.location) {
      setHighlightLine(diagnostic.location.line);
    }
  };

  // Drag and Drop between panels (VS Code & Unity style)
  const handleDragStart = (e: React.DragEvent, panelId: PanelId) => {
    setDraggedPanel(panelId);
    e.dataTransfer.setData('application/deriva-panel', panelId);
    e.dataTransfer.setData('application/novacompiler-panel', panelId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetPanelId: PanelId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedPanel && draggedPanel !== targetPanelId) {
      setDragOverPanel(targetPanelId);
    }
  };

  const handleDragLeave = () => {
    setDragOverPanel(null);
  };

  const handleDrop = (e: React.DragEvent, targetPanelId: PanelId) => {
    e.preventDefault();
    const sourceId =
      (e.dataTransfer.getData('application/deriva-panel') as PanelId) ||
      (e.dataTransfer.getData('application/novacompiler-panel') as PanelId) ||
      draggedPanel;
    if (sourceId && sourceId !== targetPanelId) {
      swapPanels(sourceId, targetPanelId);
    }
    setDraggedPanel(null);
    setDragOverPanel(null);
  };

  const swapPanels = (source: PanelId, target: PanelId) => {
    setSlots((prev) => {
      const newSlots = { ...prev };
      let keySource: 'slotA' | 'slotB' | 'slotC' | null = null;
      let keyTarget: 'slotA' | 'slotB' | 'slotC' | null = null;

      if (newSlots.slotA === source) keySource = 'slotA';
      if (newSlots.slotB === source) keySource = 'slotB';
      if (newSlots.slotC === source) keySource = 'slotC';

      if (newSlots.slotA === target) keyTarget = 'slotA';
      if (newSlots.slotB === target) keyTarget = 'slotB';
      if (newSlots.slotC === target) keyTarget = 'slotC';

      if (keySource && keyTarget) {
        newSlots[keySource] = target;
        newSlots[keyTarget] = source;
      }
      return newSlots;
    });
  };

  // Resizing Handlers with instant boundary checks
  const handleExplorerResize = (deltaX: number) => {
    setExplorerWidth((prev) => Math.min(380, Math.max(160, prev + deltaX)));
  };

  const handleHorizontalSplitResize = (deltaX: number) => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    if (containerWidth <= 0) return;
    const deltaPercent = (deltaX / containerWidth) * 100;
    setLeftSplitWidth((prev) => Math.min(78, Math.max(20, prev + deltaPercent)));
  };

  const handleVerticalDiagnosticsResize = (deltaY: number) => {
    // If Diagnostics was collapsed, automatically uncollapse it
    if (collapsedPanels[slots.slotB]) {
      setCollapsedPanels((prev) => ({ ...prev, [slots.slotB]: false }));
    }
    // Dragging down (positive delta) makes diagnostics shorter
    // Dragging up (negative delta) makes diagnostics taller
    const maxHeight = containerRef.current ? Math.max(containerRef.current.clientHeight - 100, 300) : 600;
    setDiagnosticsHeight((prev) => Math.min(maxHeight, Math.max(50, prev - deltaY)));
  };

  const handleBottomDockResize = (deltaY: number) => {
    if (collapsedPanels[slots.slotB]) {
      setCollapsedPanels((prev) => ({ ...prev, [slots.slotB]: false }));
    }
    const maxHeight = containerRef.current ? Math.max(containerRef.current.clientHeight - 120, 350) : 550;
    setBottomDockHeight((prev) => Math.min(maxHeight, Math.max(60, prev - deltaY)));
  };

  const handleCol1Resize = (deltaX: number) => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    if (containerWidth <= 0) return;
    const deltaPercent = (deltaX / containerWidth) * 100;
    setCol1Width((prev) => Math.min(50, Math.max(15, prev + deltaPercent)));
  };

  const handleCol2Resize = (deltaX: number) => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    if (containerWidth <= 0) return;
    const deltaPercent = (deltaX / containerWidth) * 100;
    setCol2Width((prev) => Math.min(50, Math.max(15, prev + deltaPercent)));
  };

  const handleResetLayout = () => {
    setLeftSplitWidth(44);
    setDiagnosticsHeight(190);
    setBottomDockHeight(210);
    setCol1Width(33);
    setCol2Width(33);
    setExplorerWidth(220);
    setIsExplorerOpen(!isMobile);
    setMaximizedPanel(null);
    setFocusedPanel(null);
    setHiddenPanels({ editor: false, diagnostics: false, visualizer: false, explorer: false });
    setCollapsedPanels({ editor: false, diagnostics: false, visualizer: false, explorer: false });
    setSlots({ slotA: 'editor', slotB: 'diagnostics', slotC: 'visualizer' });
    setLayoutPreset('vscode-default');

    removeStoredItem('layout_preset');
    removeStoredItem('slots');
    removeStoredItem('left_split');
    removeStoredItem('diagnostics_height');
    removeStoredItem('bottom_dock_height');
    removeStoredItem('col1_width');
    removeStoredItem('col2_width');
    removeStoredItem('collapsed');
    removeStoredItem('hidden_panels');
    removeStoredItem('explorer_open');
    removeStoredItem('explorer_width');
  };

  const toggleMaximize = (panelId: PanelId) => {
    setMaximizedPanel((prev) => (prev === panelId ? null : panelId));
  };

  const toggleFocus = (panelId: PanelId) => {
    setFocusedPanel((prev) => (prev === panelId ? null : panelId));
  };

  const handleClosePanel = (panelId: PanelId) => {
    setHiddenPanels((prev) => ({ ...prev, [panelId]: true }));
    if (focusedPanel === panelId) setFocusedPanel(null);
    if (maximizedPanel === panelId) setMaximizedPanel(null);
  };

  const handleReopenPanel = (panelId: PanelId) => {
    setHiddenPanels((prev) => ({ ...prev, [panelId]: false }));
  };

  const toggleCollapse = (panelId: PanelId) => {
    setCollapsedPanels((prev) => ({
      ...prev,
      [panelId]: !prev[panelId],
    }));
  };

  // Stage Visualizer metadata for Panel Header
  const activeTabMeta = useMemo(() => {
    switch (activeTab) {
      case 'editor':
        return {
          title: '1. Lexer Visualizer',
          subtitle: 'Tokens & Scanner',
          icon: <Code2 className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'parser':
        return {
          title: '2. Parser Visualizer',
          subtitle: 'AST & CST Grammar Trees',
          icon: <Layers className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'semantic':
        return {
          title: '3. Semantic Analysis',
          subtitle: 'Symbol Table & SDD',
          icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'ir':
        return {
          title: '4. Intermediate Representation',
          subtitle: 'TAC, Quadruples, Triples & DAG',
          icon: <FileCode className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'cfg':
        return {
          title: '5. Control Flow Graph',
          subtitle: 'Basic Blocks & Dominators',
          icon: <Activity className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'dataflow':
        return {
          title: '6. Data Flow Analysis',
          subtitle: 'Liveness, Reaching Defs, UD/DU',
          icon: <Eye className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'optimizer':
        return {
          title: '7. Compiler Optimizer',
          subtitle: 'Pass Pipeline & Metrics',
          icon: <Zap className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'codegen':
        return {
          title: '8. Target Code Generator',
          subtitle: 'MIPS, x86-64, Bytecode & Regs',
          icon: <Cpu className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'vm':
        return {
          title: '9. Virtual Machine',
          subtitle: 'Stack-Based Runtime & Execution',
          icon: <Gauge className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'docs':
        return {
          title: 'Language Documentation & User Guide',
          subtitle: 'Deriva Syntax, Grammar & Pipeline Manual',
          icon: <BookOpen className="w-3.5 h-3.5 text-indigo-400" />,
        };
      default:
        return {
          title: 'Compiler Visualizer',
          subtitle: 'Pipeline View',
          icon: <Layers className="w-3.5 h-3.5 text-indigo-400" />,
        };
    }
  }, [activeTab]);

  // Global Keyboard Shortcuts (F1 for User Guide, Ctrl+B for Explorer, Ctrl+S for Save, Ctrl+W for Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsDocsModalOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setIsExplorerOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (e.altKey) {
          saveAllFiles();
        } else if (activeDocumentId) {
          saveFile(activeDocumentId);
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
        const target = e.target as HTMLElement | null;
        if (target && target.tagName === 'INPUT') return;
        if (activeDocumentId) {
          e.preventDefault();
          closeDocument(activeDocumentId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDocumentId, saveFile, saveAllFiles, closeDocument]);

  // Render Panel Contents based on Panel ID
  const renderPanel = (panelId: PanelId) => {
    if (hiddenPanels[panelId] && !focusedPanel && !maximizedPanel) {
      return (
        <div
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-app)' }}
          className="flex-1 h-full w-full min-h-[70px] border border-dashed rounded-lg flex items-center justify-center p-3 text-xs text-slate-400 gap-2.5 select-none"
        >
          <span className="capitalize font-medium text-slate-400">{panelId} panel is closed</span>
          <button
            onClick={() => handleReopenPanel(panelId)}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold transition cursor-pointer shadow-sm"
          >
            Reopen
          </button>
        </div>
      );
    }

    const isMaximized = maximizedPanel === panelId;
    const isCollapsed = collapsedPanels[panelId];
    const isDragOver = dragOverPanel === panelId;

    if (panelId === 'explorer') {
      return (
        <PanelFrame
          key="panel-explorer"
          panelId="explorer"
          title="Explorer"
          subtitle="Project Files & Samples"
          icon={<FolderOpen className="w-3.5 h-3.5 text-indigo-400" />}
          badge={
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0b0e14] text-slate-400 border border-slate-700 font-mono">
              Files
            </span>
          }
          isMaximized={isMaximized}
          isFocused={focusedPanel === 'explorer'}
          isCollapsed={isCollapsed}
          onToggleMaximize={() => toggleMaximize('explorer')}
          onToggleFocus={() => toggleFocus('explorer')}
          onClose={() => handleClosePanel('explorer')}
          onToggleCollapse={() => toggleCollapse('explorer')}
        >
          <ExplorerPanel
            currentCode={activeCode}
            onSelectSample={handleSelectSample}
            session={session}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLineClick={(ln) => setHighlightLine(ln)}
            onOpenDocs={() => setIsDocsModalOpen(true)}
          />
        </PanelFrame>
      );
    }

    if (panelId === 'editor') {
      const lineCount = activeCode ? activeCode.split('\n').length : 0;
      const subtitle = activeFile ? activeFile.name : 'No file open';
      return (
        <PanelFrame
          key="panel-editor"
          panelId="editor"
          title="Code Editor"
          subtitle={subtitle}
          icon={<FileCode className="w-3.5 h-3.5 text-indigo-400" />}
          badge={
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0b0e14] text-slate-400 border border-slate-700 font-mono">
              {lineCount} lines
            </span>
          }
          isMaximized={isMaximized}
          isFocused={focusedPanel === 'editor'}
          isCollapsed={isCollapsed}
          onToggleMaximize={() => toggleMaximize('editor')}
          onToggleFocus={() => toggleFocus('editor')}
          onClose={() => handleClosePanel('editor')}
          onToggleCollapse={() => toggleCollapse('editor')}
          onSwapWith={(target) => swapPanels('editor', target)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          isDragOver={isDragOver}
        >
          <CodeEditor
            code={activeCode}
            onChange={handleCodeChange}
            diagnostics={isDerivaLang ? session.diagnostics : []}
            highlightLine={highlightLine}
            onLineClick={(ln) => setHighlightLine(ln)}
            onNewFileClick={() => {
              const res = createFile('untitled.dev', 'root', '// New Deriva source file\n', true);
              if (res.success && res.fileId) openDocument(res.fileId);
            }}
          />
        </PanelFrame>
      );
    }

    if (panelId === 'diagnostics') {
      const safeDiags = Array.isArray(session?.diagnostics) ? session.diagnostics : [];
      const errCount = safeDiags.filter((d) => d.severity === 'error').length;

      return (
        <PanelFrame
          key="panel-diagnostics"
          panelId="diagnostics"
          title="Compiler Diagnostics & Problems"
          subtitle={`${safeDiags.length} issues`}
          icon={<AlertCircle className="w-3.5 h-3.5 text-indigo-400" />}
          badge={
            safeDiags.length > 0 ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                {errCount} Errors
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                Clean
              </span>
            )
          }
          isMaximized={isMaximized}
          isFocused={focusedPanel === 'diagnostics'}
          isCollapsed={isCollapsed}
          onToggleMaximize={() => toggleMaximize('diagnostics')}
          onToggleFocus={() => toggleFocus('diagnostics')}
          onClose={() => handleClosePanel('diagnostics')}
          onToggleCollapse={() => toggleCollapse('diagnostics')}
          onSwapWith={(target) => swapPanels('diagnostics', target)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          isDragOver={isDragOver}
        >
          <DiagnosticsPanel
            diagnostics={safeDiags}
            onDiagnosticClick={handleDiagnosticClick}
          />
        </PanelFrame>
      );
    }

    if (panelId === 'visualizer') {
      return (
        <PanelFrame
          key="panel-visualizer"
          panelId="visualizer"
          title={activeTabMeta.title}
          subtitle={activeTabMeta.subtitle}
          icon={activeTabMeta.icon}
          badge={
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0b0e14] text-indigo-300 border border-indigo-900 font-mono">
              Stage {activeTab.toUpperCase()}
            </span>
          }
          isMaximized={isMaximized}
          isFocused={focusedPanel === 'visualizer'}
          isCollapsed={isCollapsed}
          onToggleMaximize={() => toggleMaximize('visualizer')}
          onToggleFocus={() => toggleFocus('visualizer')}
          onClose={() => handleClosePanel('visualizer')}
          onToggleCollapse={() => toggleCollapse('visualizer')}
          onSwapWith={(target) => swapPanels('visualizer', target)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          isDragOver={isDragOver}
        >
          <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
            {activeTab === 'editor' && <LexerVisualizer tokens={session.tokens} />}
            {activeTab === 'parser' && (
              <ParserVisualizer ast={session.ast} parseTree={session.parseTree} />
            )}
            {activeTab === 'semantic' && (
              <SemanticVisualizer
                symbolTable={session.symbolTable}
                scopes={session.scopes}
                parseTree={session.parseTree}
                sddDependencyGraph={session.sddDependencyGraph}
              />
            )}
            {activeTab === 'ir' && (
              <IRVisualizer
                tac={session.tac}
                quadruples={session.quadruples}
                triples={session.triples}
                indirectTriples={session.indirectTriples}
                dag={session.dag}
              />
            )}
            {activeTab === 'cfg' && (
              <CFGVisualizer
                cfg={session.cfg}
                dominatorTree={session.dominatorTree}
                postDominatorTree={session.postDominatorTree}
                naturalLoops={session.naturalLoops}
              />
            )}
            {activeTab === 'dataflow' && (
              <DataFlowVisualizer session={session} />
            )}
            {activeTab === 'optimizer' && (
              <OptimizerVisualizer session={session} />
            )}
            {activeTab === 'codegen' && (
              <CodeGenVisualizer
                session={session}
                targetCode={session.targetCode}
                registerAllocation={session.registerAllocations?.graphColoring}
                registerAllocations={session.registerAllocations}
              />
            )}
            {activeTab === 'vm' && <VMVisualizer session={session} />}
            {activeTab === 'docs' && (
              <UserGuideVisualizer
                onLoadCode={handleSelectSample}
                onOpenFullModal={() => setIsDocsModalOpen(true)}
              />
            )}
          </div>
        </PanelFrame>
      );
    }

    return null;
  };

  const allDiagnostics = Array.isArray(session?.diagnostics) ? session.diagnostics : [];
  const hasErrors = allDiagnostics.some((d) => d.severity === 'error');
  const errorCount = allDiagnostics.filter((d) => d.severity === 'error').length;

  return (
    <div
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
      className="flex flex-col h-screen w-screen overflow-hidden text-slate-100 font-sans select-none"
    >
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        optimizationLevel={optimizationLevel}
        setOptimizationLevel={setOptimizationLevel}
        kRegisters={kRegisters}
        setKRegisters={setKRegisters}
        onCompile={handleManualCompile}
        onSelectSample={handleSelectSample}
        compilationTimeMs={session?.compilationTimeMs ?? 0}
        hasErrors={hasErrors}
        layoutPreset={layoutPreset}
        setLayoutPreset={setLayoutPreset}
        onResetLayout={handleResetLayout}
        isExplorerOpen={isExplorerOpen}
        onToggleExplorer={() => setIsExplorerOpen((prev) => !prev)}
        maximizedPanel={maximizedPanel}
        onSetMaximizedPanel={setMaximizedPanel}
        onOpenDocs={() => setIsDocsModalOpen(true)}
      />

      {/* Main Workspace Body */}
      <div ref={containerRef} className="flex-1 flex flex-row min-h-0 min-w-0 overflow-hidden relative p-1.5 gap-0">
        {/* Activity Bar (Icons on far left) */}
        <aside
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-app)' }}
          className="w-10 border rounded-lg flex flex-col items-center py-2 shrink-0 z-10 mr-1.5 hidden sm:flex justify-between"
        >
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsExplorerOpen((prev) => !prev)}
              className={`p-2 rounded-md transition cursor-pointer ${
                isExplorerOpen
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Explorer (Ctrl+B)"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (maximizedPanel === 'editor') setMaximizedPanel(null);
                else setMaximizedPanel('editor');
              }}
              className={`p-2 rounded-md transition cursor-pointer ${
                maximizedPanel === 'editor'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Focus Editor"
            >
              <Code2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (maximizedPanel === 'diagnostics') setMaximizedPanel(null);
                else setMaximizedPanel('diagnostics');
              }}
              className={`p-2 rounded-md transition cursor-pointer relative ${
                maximizedPanel === 'diagnostics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Focus Diagnostics"
            >
              <AlertCircle className="w-4 h-4" />
              {allDiagnostics.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>
            <button
              onClick={() => {
                if (maximizedPanel === 'visualizer') setMaximizedPanel(null);
                else setMaximizedPanel('visualizer');
              }}
              className={`p-2 rounded-md transition cursor-pointer ${
                maximizedPanel === 'visualizer'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Focus Visualizer"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDocsModalOpen(true)}
              className="p-2 rounded-md text-indigo-400 hover:text-white hover:bg-indigo-600/30 transition cursor-pointer"
              title="User Guide & Deriva Language Documentation (F1)"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleResetLayout}
              className="p-2 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
              title="Reset Layout & Panels"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Collapsible Left Explorer Panel */}
        {isExplorerOpen && !maximizedPanel && (
          <>
            <div
              style={{
                width: isMobile ? '100%' : `${explorerWidth}px`,
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-app)',
              }}
              className={`h-full shrink-0 min-h-0 min-w-0 border rounded-lg overflow-hidden flex flex-col z-10 ${
                isResizing ? 'transition-none' : 'transition-[width] duration-150'
              }`}
            >
              <div
                style={{ backgroundColor: 'var(--bg-card)', borderBottomColor: 'var(--border-app)' }}
                className="h-8 px-2.5 border-b flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-slate-300 select-none shrink-0"
              >
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Explorer</span>
                </div>
                <button
                  onClick={() => setIsExplorerOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Close Explorer (Ctrl+B)"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
              <ExplorerPanel
                currentCode={activeCode}
                onSelectSample={handleSelectSample}
                session={session}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onLineClick={(ln) => setHighlightLine(ln)}
                onOpenDocs={() => setIsDocsModalOpen(true)}
              />
            </div>

            {!isMobile && (
              <Splitter
                direction="vertical"
                onDragStart={() => setIsResizing(true)}
                onDragEnd={() => setIsResizing(false)}
                onResize={handleExplorerResize}
                onReset={() => setExplorerWidth(220)}
                currentValue={explorerWidth}
                min={160}
                max={380}
              />
            )}
          </>
        )}

        {/* Workspace Central Area */}
        <main className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden relative">
          {/* Mobile Dock Navigation Bar */}
          {isMobile && !maximizedPanel && !focusedPanel && (
            <div
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-app)' }}
              className="flex items-center justify-between px-2 py-1.5 mb-1.5 rounded-lg border text-xs"
            >
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {(['editor', 'diagnostics', 'visualizer', 'explorer'] as PanelId[]).map((pId) => {
                  const isActive = mobileActivePanel === pId;
                  return (
                    <button
                      key={pId}
                      onClick={() => setMobileActivePanel(pId)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      {pId === 'editor' ? 'Editor' : pId === 'diagnostics' ? 'Problems' : pId === 'explorer' ? 'Explorer' : 'Analysis'}
                    </button>
                  );
                })}
              </div>

              <div style={{ borderLeftColor: 'var(--border-app)' }} className="flex items-center ml-1 border-l pl-1">
                <button
                  onClick={() => setMobileViewMode((prev) => (prev === 'focus' ? 'stack' : 'focus'))}
                  className="px-2 py-1 rounded text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 uppercase font-bold cursor-pointer whitespace-nowrap"
                >
                  {mobileViewMode === 'focus' ? 'Stack' : 'Focus'}
                </button>
              </div>
            </div>
          )}

          {/* Focused Panel Banner */}
          {focusedPanel && (
            <div
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-app)' }}
              className="mb-1.5 px-3 py-1.5 rounded-lg border flex items-center justify-between text-xs font-medium text-slate-300 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Focus Mode: <strong className="text-white capitalize">{focusedPanel}</strong>
                </span>
              </div>
              <button
                onClick={() => setFocusedPanel(null)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Restore Workspace (Esc)</span>
              </button>
            </div>
          )}

          {/* Maximized Banner (if any panel is maximized) */}
          {maximizedPanel && !focusedPanel && (
            <div
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-app)' }}
              className="mb-1.5 px-3 py-1.5 rounded-lg border flex items-center justify-between text-xs font-medium text-slate-300"
            >
              <div className="flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Maximized: <strong className="text-white capitalize">{maximizedPanel}</strong>
                </span>
              </div>
              <button
                onClick={() => setMaximizedPanel(null)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition cursor-pointer"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Restore Workspace (Esc)</span>
              </button>
            </div>
          )}

          {/* Hidden Panels Restoration Strip */}
          {!focusedPanel && !maximizedPanel && Object.entries(hiddenPanels).some(([id, isHidden]) => isHidden && id !== 'explorer') && (
            <div
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-app)' }}
              className="mb-1.5 px-3 py-1 rounded-lg border flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-300">Closed Panels:</span>
                {(['editor', 'diagnostics', 'visualizer'] as PanelId[])
                  .filter((p) => hiddenPanels[p])
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => handleReopenPanel(p)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition cursor-pointer capitalize"
                    >
                      + Reopen {p}
                    </button>
                  ))}
              </div>
              <button
                onClick={() => setHiddenPanels({ editor: false, diagnostics: false, visualizer: false, explorer: false })}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Restore All Panels
              </button>
            </div>
          )}

          {/* Render Active Layout Structure */}
          {focusedPanel ? (
            <div className="flex-1 h-full w-full min-h-0 min-w-0 flex flex-col">
              {renderPanel(focusedPanel)}
            </div>
          ) : maximizedPanel ? (
            <div className="flex-1 h-full w-full min-h-0 min-w-0 flex flex-col">
              {renderPanel(maximizedPanel)}
            </div>
          ) : isMobile ? (
            mobileViewMode === 'focus' ? (
              <div className="flex-1 h-full w-full min-h-0 min-w-0 flex flex-col">
                {renderPanel(mobileActivePanel)}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
                <div className="h-72 min-h-[260px] flex flex-col">{renderPanel('editor')}</div>
                <div className="h-56 min-h-[200px] flex flex-col">{renderPanel('diagnostics')}</div>
                <div className="h-[520px] min-h-[440px] flex flex-col">{renderPanel('visualizer')}</div>
              </div>
            )
          ) : layoutPreset === 'bottom-dock' ? (
            /* Layout 2: Bottom Dock (Editor + Visualizer on Top, Full-Width Diagnostics on Bottom) */
            <div className="flex-1 flex flex-col h-full min-h-0 min-w-0">
              <div className="flex-1 flex flex-row min-h-0 min-w-0 overflow-hidden">
                <div style={{ width: `${leftSplitWidth}%` }} className="h-full min-h-0 min-w-0 flex flex-col">
                  {renderPanel(slots.slotA)}
                </div>

                <Splitter
                  direction="vertical"
                  onDragStart={() => setIsResizing(true)}
                  onDragEnd={() => setIsResizing(false)}
                  onResize={handleHorizontalSplitResize}
                  onReset={() => setLeftSplitWidth(44)}
                />

                <div className="flex-1 h-full min-h-0 min-w-0 flex flex-col">
                  {renderPanel(slots.slotC)}
                </div>
              </div>

              {/* Vertical Splitter above full-width Diagnostics */}
              <Splitter
                direction="horizontal"
                onDragStart={() => setIsResizing(true)}
                onDragEnd={() => setIsResizing(false)}
                onResize={handleBottomDockResize}
                onReset={() => setBottomDockHeight(210)}
                currentValue={bottomDockHeight}
              />

              <div
                style={{
                  height: collapsedPanels[slots.slotB] ? '34px' : `${bottomDockHeight}px`,
                }}
                className={`w-full shrink-0 min-h-0 overflow-hidden ${
                  isResizing ? 'transition-none' : 'transition-[height] duration-150'
                }`}
              >
                {renderPanel(slots.slotB)}
              </div>
            </div>
          ) : layoutPreset === 'unity-3col' ? (
            /* Layout 3: Unity 3-Column Layout */
            <div className="flex-1 flex flex-row h-full min-h-0 min-w-0 overflow-hidden">
              <div style={{ width: `${col1Width}%` }} className="h-full min-h-0 min-w-0 flex flex-col">
                {renderPanel(slots.slotA)}
              </div>

              <Splitter
                direction="vertical"
                onDragStart={() => setIsResizing(true)}
                onDragEnd={() => setIsResizing(false)}
                onResize={handleCol1Resize}
                onReset={() => setCol1Width(33)}
              />

              <div style={{ width: `${col2Width}%` }} className="h-full min-h-0 min-w-0 flex flex-col">
                {renderPanel(slots.slotB)}
              </div>

              <Splitter
                direction="vertical"
                onDragStart={() => setIsResizing(true)}
                onDragEnd={() => setIsResizing(false)}
                onResize={handleCol2Resize}
                onReset={() => setCol2Width(33)}
              />

              <div className="flex-1 h-full min-h-0 min-w-0 flex flex-col">
                {renderPanel(slots.slotC)}
              </div>
            </div>
          ) : layoutPreset === 'visualizer-left' ? (
            /* Layout 4: Visualizer First */
            <div className="flex-1 flex flex-row h-full min-h-0 min-w-0 overflow-hidden">
              <div
                style={{ width: `${100 - leftSplitWidth}%` }}
                className="h-full min-h-0 min-w-0 flex flex-col"
              >
                {renderPanel(slots.slotC)}
              </div>

              <Splitter
                direction="vertical"
                onDragStart={() => setIsResizing(true)}
                onDragEnd={() => setIsResizing(false)}
                onResize={(delta) => handleHorizontalSplitResize(-delta)}
                onReset={() => setLeftSplitWidth(44)}
              />

              <div className="flex-1 h-full min-h-0 min-w-0 flex flex-col gap-0">
                <div className="flex-1 min-h-0 min-w-0 flex flex-col">
                  {renderPanel(slots.slotA)}
                </div>

                <Splitter
                  direction="horizontal"
                  onDragStart={() => setIsResizing(true)}
                  onDragEnd={() => setIsResizing(false)}
                  onResize={handleVerticalDiagnosticsResize}
                  onReset={() => setDiagnosticsHeight(190)}
                  currentValue={diagnosticsHeight}
                />

                <div
                  style={{
                    height: collapsedPanels[slots.slotB] ? '34px' : `${diagnosticsHeight}px`,
                  }}
                  className={`shrink-0 min-h-0 overflow-hidden ${
                    isResizing ? 'transition-none' : 'transition-[height] duration-150'
                  }`}
                >
                  {renderPanel(slots.slotB)}
                </div>
              </div>
            </div>
          ) : (
            /* Layout 1: VS Code Default (Editor Top, Diagnostics Bottom, Visualizer Right) */
            <div className="flex-1 flex flex-col md:flex-row h-full min-h-0 min-w-0 overflow-hidden">
              {/* Left Column */}
              <div
                style={{ width: `${leftSplitWidth}%` }}
                className="h-full min-h-0 min-w-0 flex flex-col shrink-0"
              >
                {/* Top Panel (Slot A: Editor) */}
                <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
                  {renderPanel(slots.slotA)}
                </div>

                {/* Vertical Splitter between Editor and Diagnostics */}
                <Splitter
                  direction="horizontal"
                  onDragStart={() => setIsResizing(true)}
                  onDragEnd={() => setIsResizing(false)}
                  onResize={handleVerticalDiagnosticsResize}
                  onReset={() => setDiagnosticsHeight(190)}
                  currentValue={diagnosticsHeight}
                  id="splitter-editor-diagnostics"
                />

                {/* Bottom Panel (Slot B: Diagnostics) */}
                <div
                  style={{
                    height: collapsedPanels[slots.slotB] ? '34px' : `${diagnosticsHeight}px`,
                  }}
                  className={`shrink-0 min-h-0 min-w-0 overflow-hidden ${
                    isResizing ? 'transition-none' : 'transition-[height] duration-150'
                  }`}
                >
                  {renderPanel(slots.slotB)}
                </div>
              </div>

              {/* Horizontal Splitter between Left Column and Right Column */}
              <Splitter
                direction="vertical"
                onDragStart={() => setIsResizing(true)}
                onDragEnd={() => setIsResizing(false)}
                onResize={handleHorizontalSplitResize}
                onReset={() => setLeftSplitWidth(44)}
                currentValue={leftSplitWidth}
                id="splitter-left-right"
              />

              {/* Right Column (Slot C: Visualizer) */}
              <div className="flex-1 h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
                {renderPanel(slots.slotC)}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Professional Status Bar Footer */}
      <footer
        style={{ backgroundColor: 'var(--bg-surface)', borderTopColor: 'var(--border-app)' }}
        className="h-6 border-t px-3 flex items-center justify-between text-[10px] text-slate-400 font-medium shrink-0 select-none"
      >
        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
          <span className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Ln {highlightLine || 1}, Col 1</span>
          </span>
          <span className="text-slate-600 hidden xs:inline">|</span>
          <span className="text-slate-400 hidden xs:inline font-mono">UTF-8</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-indigo-400 font-semibold hidden sm:inline font-mono">
            Deriva v1.0
          </span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="text-slate-400 hidden md:inline">
            Preset: <span className="text-slate-200 capitalize font-medium">{layoutPreset.replace('-', ' ')}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            onClick={() => {
              if (maximizedPanel === 'diagnostics') setMaximizedPanel(null);
              else setMaximizedPanel('diagnostics');
            }}
            className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasErrors
                  ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                  : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
              }`}
            />
            <span
              className={`font-bold uppercase tracking-wider text-[9px] ${
                hasErrors ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {hasErrors ? `${errorCount} Errors` : 'Ready'}
            </span>
          </button>

          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 font-mono hidden sm:inline">
            {session?.metrics?.tokenCount ?? 0} Tokens • {session?.metrics?.tacInstructionCount ?? 0} TAC
          </span>
        </div>
      </footer>

      {/* Interactive User Guide & Deriva Language Documentation Modal */}
      <UserGuideModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        onLoadCode={(code) => {
          handleSelectSample(code);
        }}
      />

      {/* Global Workspace Dialogs (Delete confirmation, Unsaved changes, File conflicts) */}
      <WorkspaceModals />
    </div>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <AppContent />
    </WorkspaceProvider>
  );
}
