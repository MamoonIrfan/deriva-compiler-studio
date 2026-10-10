import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  Archive,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  Download,
  Edit2,
  Eye,
  File,
  FileCode,
  FileJson,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Gauge,
  HelpCircle,
  Layers,
  ListTree,
  MoreVertical,
  Move,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Scissors,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { SampleProgram, SAMPLE_PROGRAMS } from '../../data/samplePrograms';
import { CompilationSession, SymbolEntry } from '../../types';
import { useWorkspace } from '../../context/WorkspaceContext';
import { FileNode, FolderNode } from '../../types/workspace';

interface ExplorerPanelProps {
  currentCode: string;
  onSelectSample: (code: string) => void;
  session: CompilationSession;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLineClick?: (line: number) => void;
  onResetCode?: () => void;
  onOpenDocs?: () => void;
}

export const ExplorerPanel: React.FC<ExplorerPanelProps> = ({
  currentCode,
  onSelectSample,
  session,
  activeTab,
  setActiveTab,
  onLineClick,
  onResetCode,
  onOpenDocs,
}) => {
  const {
    workspace,
    activeProject,
    activeFile,
    activeDocumentId,
    selectedNodeId,
    setSelectedNodeId,
    searchQuery,
    setSearchQuery,
    clipboard,
    openDocument,
    createFile,
    createFolder,
    renameNode,
    requestDeleteNode,
    duplicateNode,
    moveNode,
    cutNode,
    copyNode,
    pasteClipboard,
    toggleFolder,
    collapseAllFolders,
    expandAllFolders,
    exportProjectZip,
    exportSingleFile,
    exportWorkspaceJson,
    importWorkspaceJson,
    importFiles,
    importZipArchive,
    switchProject,
    createProject,
    resetToDefaultWorkspace,
    loadSampleIntoProject,
  } = useWorkspace();

  // Collapsible accordion sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    project: true,
    samples: false,
    pipeline: false,
    outline: false,
    docs: false,
  });

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    Basics: true,
    'Control Flow': true,
    Functions: true,
    Algorithms: true,
    'Grammar Studies': true,
  });

  // Creation State (Inline input)
  const [creationMode, setCreationMode] = useState<{
    type: 'file' | 'folder';
    parentId: string;
  } | null>(null);
  const [creationName, setCreationName] = useState('');
  const [creationError, setCreationError] = useState<string | null>(null);

  // Rename State (Inline input)
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const [renamingError, setRenamingError] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    isFolder: boolean;
    x: number;
    y: number;
  } | null>(null);

  // Drag and Drop State in Tree
  const [draggedNode, setDraggedNode] = useState<{ id: string; isFolder: boolean } | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);

  // Hidden File Inputs for Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Project Switcher Dropdown
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleClose = () => {
      setContextMenu(null);
      setShowProjectDropdown(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setCreationMode(null);
        setRenamingNodeId(null);
        setShowProjectDropdown(false);
      }
    };
    window.addEventListener('click', handleClose);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Helper to determine parent folder for new item creation
  const getTargetFolderId = (): string => {
    if (!selectedNodeId) return 'root';
    if (activeProject.folders[selectedNodeId]) return selectedNodeId;
    if (activeProject.files[selectedNodeId]) return activeProject.files[selectedNodeId].parentId;
    return 'root';
  };

  // Trigger File Creation
  const handleStartCreateFile = (targetFolderId?: string) => {
    const parentId = targetFolderId || getTargetFolderId();
    setCreationMode({ type: 'file', parentId });
    setCreationName('');
    setCreationError(null);
    setRenamingNodeId(null);
  };

  // Trigger Folder Creation
  const handleStartCreateFolder = (targetFolderId?: string) => {
    const parentId = targetFolderId || getTargetFolderId();
    setCreationMode({ type: 'folder', parentId });
    setCreationName('');
    setCreationError(null);
    setRenamingNodeId(null);
  };

  // Submit Creation
  const handleConfirmCreate = () => {
    if (!creationMode) return;
    if (!creationName.trim()) {
      setCreationError('Name cannot be empty.');
      return;
    }

    if (creationMode.type === 'file') {
      const res = createFile(creationName, creationMode.parentId, '', true);
      if (!res.success) {
        setCreationError(res.error || 'Failed to create file.');
        return;
      }
    } else {
      const res = createFolder(creationName, creationMode.parentId);
      if (!res.success) {
        setCreationError(res.error || 'Failed to create folder.');
        return;
      }
    }

    setCreationMode(null);
    setCreationName('');
    setCreationError(null);
  };

  // Trigger Inline Rename
  const handleStartRename = (nodeId: string) => {
    const file = activeProject.files[nodeId];
    const folder = activeProject.folders[nodeId];
    const currentName = file ? file.name : folder ? folder.name : '';

    setRenamingNodeId(nodeId);
    setRenamingName(currentName);
    setRenamingError(null);
    setCreationMode(null);
  };

  // Submit Rename
  const handleConfirmRename = () => {
    if (!renamingNodeId) return;
    if (!renamingName.trim()) {
      setRenamingError('Name cannot be empty.');
      return;
    }

    const res = renameNode(renamingNodeId, renamingName);
    if (!res.success) {
      setRenamingError(res.error || 'Failed to rename.');
      return;
    }

    setRenamingNodeId(null);
    setRenamingName('');
    setRenamingError(null);
  };

  // Tree Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string, isFolder: boolean) => {
    e.stopPropagation();
    setDraggedNode({ id, isFolder });
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedNode) return;
    if (dragOverTargetId !== targetFolderId) {
      setDragOverTargetId(targetFolderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    // Check if dragging OS files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      importFiles(e.dataTransfer.files, targetFolderId);
      return;
    }

    if (draggedNode) {
      moveNode(draggedNode.id, targetFolderId);
      setDraggedNode(null);
    }
  };

  // Tree Context Menu
  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string, isFolder: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setContextMenu({
      nodeId,
      isFolder,
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 300),
    });
  };

  // Outline symbols extracted from compilation session
  const outlineItems = useMemo(() => {
    const items: { name: string; kind: 'var' | 'func'; line: number; typeStr?: string }[] = [];
    if (session?.symbolTable) {
      const symList: SymbolEntry[] =
        session.symbolTable instanceof Map
          ? Array.from(session.symbolTable.values())
          : (session.symbolTable as any).symbols instanceof Map
          ? Array.from((session.symbolTable as any).symbols.values())
          : Array.isArray((session.symbolTable as any).symbols)
          ? (session.symbolTable as any).symbols
          : Array.isArray(session.symbolTable)
          ? (session.symbolTable as any)
          : typeof session.symbolTable === 'object'
          ? Object.values(session.symbolTable)
          : [];

      symList.forEach((sym) => {
        if (sym && sym.name) {
          items.push({
            name: sym.name,
            kind: sym.kind === 'function' ? 'func' : 'var',
            line: sym.declaredLine || 1,
            typeStr: typeof sym.dataType === 'string' ? sym.dataType : (sym.dataType as any)?.kind,
          });
        }
      });
    }
    return items;
  }, [session?.symbolTable]);

  const pipelineStages = [
    { id: 'editor', name: '1. Lexer & Scanner', icon: Code2, badge: `${session?.tokens?.length ?? 0} toks` },
    { id: 'parser', name: '2. Parser & AST', icon: Layers, badge: session?.ast ? 'Tree OK' : 'Pending' },
    { id: 'semantic', name: '3. Semantic Analysis', icon: Sparkles, badge: `${outlineItems.length} syms` },
    { id: 'ir', name: '4. IR / TAC / DAG', icon: FileCode, badge: `${session?.tac?.length ?? 0} insts` },
    { id: 'cfg', name: '5. Control Flow Graph', icon: Activity, badge: `${session?.cfg?.blocks?.length ?? 0} blks` },
    { id: 'dataflow', name: '6. Data Flow', icon: Eye, badge: 'Active' },
    {
      id: 'optimizer',
      name: '7. Optimizer Passes',
      icon: Zap,
      badge: `${(session as any)?.optimizerPipeline?.passes?.length ?? session?.optimizationPasses?.length ?? 0} passes`,
    },
    {
      id: 'codegen',
      name: '8. Target Codegen',
      icon: Cpu,
      badge: `${typeof session?.targetCode?.mips === 'string' ? session.targetCode.mips.split('\n').length : 0} lines`,
    },
    { id: 'vm', name: '9. Virtual Machine', icon: Gauge, badge: 'Ready' },
  ];

  // File Icon selector
  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.dev') || lower.endsWith('.nova')) {
      return <Code2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    }
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
      return <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    }
    if (lower.endsWith('.json')) {
      return <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  };

  // Recursive Tree Rendering
  const renderTreeFolder = (folderId: string, depth: number = 0) => {
    const folder = activeProject.folders[folderId];
    if (!folder) return null;

    const childFolders = (Object.values(activeProject.folders) as FolderNode[])
      .filter((f) => f.parentId === folderId)
      .sort((a, b) => a.name.localeCompare(b.name));

    const childFiles = (Object.values(activeProject.files) as FileNode[])
      .filter((f) => f.parentId === folderId)
      .filter((f) => {
        if (!searchQuery.trim()) return true;
        return (
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.path.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const isExpanded = folder.isExpanded ?? true;
    const isSelected = selectedNodeId === folderId;
    const isDragTarget = dragOverTargetId === folderId;
    const isRenaming = renamingNodeId === folderId;

    return (
      <div key={folderId} className="flex flex-col">
        {/* Folder Header Row */}
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, folderId, true)}
          onDragOver={(e) => handleDragOver(e, folderId)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folderId)}
          onClick={() => {
            setSelectedNodeId(folderId);
            toggleFolder(folderId);
          }}
          onContextMenu={(e) => handleNodeContextMenu(e, folderId, true)}
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
          className={`group flex items-center justify-between py-1 pr-1.5 rounded cursor-pointer transition text-[11px] select-none ${
            isDragTarget
              ? 'bg-indigo-600/30 border border-dashed border-indigo-400 text-white font-medium'
              : isSelected
              ? 'bg-slate-800 text-indigo-300 font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="p-0.5 text-slate-400">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-400" />
              )}
            </span>

            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}

            {isRenaming ? (
              <div
                className="flex items-center gap-1 flex-1 min-w-0"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={renamingName}
                  autoFocus
                  onChange={(e) => {
                    setRenamingName(e.target.value);
                    setRenamingError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmRename();
                    if (e.key === 'Escape') setRenamingNodeId(null);
                  }}
                  className="bg-slate-900 border border-indigo-500 text-white px-1.5 py-0.5 rounded text-[11px] font-mono outline-none flex-1 min-w-0"
                />
                <button
                  onClick={handleConfirmRename}
                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setRenamingNodeId(null)}
                  className="p-1 rounded bg-slate-700 text-slate-300 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="truncate">{folder.name}</span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartCreateFile(folderId);
              }}
              className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
              title="New file in this folder"
            >
              <FilePlus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartCreateFolder(folderId);
              }}
              className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
              title="New subfolder in this folder"
            >
              <FolderPlus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Rename Error Banner */}
        {isRenaming && renamingError && (
          <div className="ml-6 px-2 py-0.5 text-[10px] text-rose-400 bg-rose-950/60 border border-rose-800/80 rounded my-0.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{renamingError}</span>
          </div>
        )}

        {/* Folder Children (when expanded) */}
        {isExpanded && (
          <div className="flex flex-col">
            {/* Inline Creation inside this folder */}
            {creationMode && creationMode.parentId === folderId && (
              <div
                style={{ paddingLeft: `${(depth + 1) * 12 + 6}px` }}
                className="py-1 pr-1.5 flex flex-col gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1">
                  {creationMode.type === 'file' ? (
                    <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <input
                    type="text"
                    value={creationName}
                    autoFocus
                    placeholder={creationMode.type === 'file' ? 'name.dev' : 'folder_name'}
                    onChange={(e) => {
                      setCreationName(e.target.value);
                      setCreationError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmCreate();
                      if (e.key === 'Escape') setCreationMode(null);
                    }}
                    className="bg-slate-900 border border-indigo-500 text-white px-1.5 py-0.5 rounded text-[11px] font-mono outline-none flex-1 min-w-0"
                  />
                  <button
                    onClick={handleConfirmCreate}
                    className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setCreationMode(null)}
                    className="p-1 rounded bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {creationError && (
                  <div className="text-[10px] text-rose-400 bg-rose-950/60 border border-rose-800/80 rounded px-1.5 py-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{creationError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Subfolders */}
            {childFolders.map((subF) => renderTreeFolder(subF.id, depth + 1))}

            {/* Files */}
            {childFiles.map((file) => renderTreeFile(file, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render a Single File in Tree
  const renderTreeFile = (file: FileNode, depth: number = 0) => {
    const isActive = activeDocumentId === file.id;
    const isSelected = selectedNodeId === file.id;
    const isRenaming = renamingNodeId === file.id;

    return (
      <div key={file.id} className="flex flex-col">
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, file.id, false)}
          onClick={() => {
            setSelectedNodeId(file.id);
            openDocument(file.id);
          }}
          onContextMenu={(e) => handleNodeContextMenu(e, file.id, false)}
          style={{ paddingLeft: `${depth * 12 + 18}px` }}
          className={`group flex items-center justify-between py-1 pr-1.5 rounded cursor-pointer transition text-[11px] font-mono select-none ${
            isActive
              ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500'
              : isSelected
              ? 'bg-slate-800 text-slate-200'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
          title={`${file.path}${file.isDirty ? ' • Modified' : ''}`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {getFileIcon(file.name)}

            {isRenaming ? (
              <div
                className="flex items-center gap-1 flex-1 min-w-0 font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={renamingName}
                  autoFocus
                  onChange={(e) => {
                    setRenamingName(e.target.value);
                    setRenamingError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmRename();
                    if (e.key === 'Escape') setRenamingNodeId(null);
                  }}
                  className="bg-slate-900 border border-indigo-500 text-white px-1.5 py-0.5 rounded text-[11px] font-mono outline-none flex-1 min-w-0"
                />
                <button
                  onClick={handleConfirmRename}
                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setRenamingNodeId(null)}
                  className="p-1 rounded bg-slate-700 text-slate-300 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="truncate">{file.name}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 font-sans">
            {file.isDirty && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                title="Unsaved changes"
              />
            )}
            {isActive && (
              <span className="text-[9px] px-1 rounded bg-indigo-500/25 text-indigo-300 font-normal shrink-0">
                active
              </span>
            )}
          </div>
        </div>

        {/* Rename Error Banner */}
        {isRenaming && renamingError && (
          <div className="ml-6 px-2 py-0.5 text-[10px] text-rose-400 bg-rose-950/60 border border-rose-800/80 rounded my-0.5 flex items-center gap-1 font-sans">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{renamingError}</span>
          </div>
        )}
      </div>
    );
  };

  // Top-level root items
  const rootFolders = (Object.values(activeProject.folders) as FolderNode[])
    .filter((f) => f.parentId === 'root')
    .sort((a, b) => a.name.localeCompare(b.name));

  const rootFiles = (Object.values(activeProject.files) as FileNode[])
    .filter((f) => f.parentId === 'root')
    .filter((f) => {
      if (!searchQuery.trim()) return true;
      return (
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.path.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-app)' }}
      className="flex flex-col h-full w-full min-h-0 min-w-0 font-sans text-xs overflow-hidden select-none"
    >
      {/* Hidden File Upload Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dev,.nova,.txt,.md,.json"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) importFiles(e.target.files, getTargetFolderId());
          e.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) importFiles(e.target.files, getTargetFolderId());
          e.target.value = '';
        }}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) importZipArchive(e.target.files[0], getTargetFolderId());
          e.target.value = '';
        }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              if (typeof evt.target?.result === 'string') {
                importWorkspaceJson(evt.target.result);
              }
            };
            reader.readAsText(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* Top Project Bar & Quick Actions Toolbar */}
      <div
        style={{ backgroundColor: 'var(--bg-card)', borderBottomColor: 'var(--border-app)' }}
        className="px-2 py-1.5 border-b flex flex-col gap-1.5 shrink-0"
      >
        {/* Project Selector & Dropdown */}
        <div className="flex items-center justify-between relative">
          <button
            onClick={() => setShowProjectDropdown((prev) => !prev)}
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-slate-800/80 text-left min-w-0 flex-1 transition cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-semibold text-slate-200 truncate text-[11px]">
              {activeProject.name}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {/* Action Toolbar Icons */}
          <div className="flex items-center gap-0.5 shrink-0 text-slate-400">
            <button
              onClick={() => handleStartCreateFile()}
              className="p-1 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer"
              title="New File"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleStartCreateFolder()}
              className="p-1 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer"
              title="New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={collapseAllFolders}
              className="p-1 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer"
              title="Collapse All Folders"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={exportProjectZip}
              className="p-1 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer"
              title="Export Project as ZIP"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer"
              title="Import Files"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Project Switcher Menu Dropdown */}
          {showProjectDropdown && (
            <div
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-app)' }}
              className="absolute top-7 left-0 z-50 w-52 max-w-[calc(100vw-24px)] border rounded-lg shadow-2xl p-1 text-xs divide-y divide-slate-800 select-none animate-in fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Projects ({workspace.projects.length})
                </div>
                {workspace.projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      switchProject(p.id);
                      setShowProjectDropdown(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded flex items-center justify-between transition cursor-pointer ${
                      p.id === activeProject.id
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {p.id === activeProject.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}
              </div>

              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    setShowProjectDropdown(false);
                    setNewProjectModalOpen(true);
                  }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-slate-800 text-indigo-400 font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Project</span>
                </button>
                <button
                  onClick={() => {
                    zipInputRef.current?.click();
                    setShowProjectDropdown(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-400" />
                  <span>Import Project ZIP</span>
                </button>
                <button
                  onClick={() => {
                    exportWorkspaceJson();
                    setShowProjectDropdown(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export JSON Backup</span>
                </button>
                <button
                  onClick={() => {
                    jsonInputRef.current?.click();
                    setShowProjectDropdown(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span>Restore JSON Backup</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm('Reset workspace to initial default project state?')) {
                      resetToDefaultWorkspace();
                    }
                    setShowProjectDropdown(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-rose-950 text-rose-400 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search / Filter in Project */}
        <div className="relative flex items-center">
          <Search className="w-3 h-3 text-slate-500 absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files (e.g. .dev)..."
            className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 placeholder-slate-500 rounded pl-6 pr-6 py-0.5 text-[11px] outline-none focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 p-0.5 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Tree & Accordion Sections */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 divide-y divide-slate-800/40">
        {/* SECTION 1: PROJECT FILE TREE */}
        <div
          onDragOver={(e) => handleDragOver(e, 'root')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'root')}
          className={`flex flex-col ${dragOverTargetId === 'root' ? 'bg-indigo-600/10' : ''}`}
        >
          <button
            onClick={() => toggleSection('project')}
            style={{ backgroundColor: 'var(--bg-card)' }}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition cursor-pointer gap-1.5"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {openSections.project ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className="truncate">Files & Folders</span>
            </div>
            <span className="text-slate-500 text-[9px] font-mono lowercase shrink-0">
              {Object.keys(activeProject.files).length} files
            </span>
          </button>

          {openSections.project && (
            <div className="py-1 px-1.5 space-y-0.5">
              {/* Inline Creation at Root */}
              {creationMode && creationMode.parentId === 'root' && (
                <div
                  className="py-1 px-2 flex flex-col gap-1 rounded bg-slate-800/50 border border-slate-700/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1">
                    {creationMode.type === 'file' ? (
                      <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <input
                      type="text"
                      value={creationName}
                      autoFocus
                      placeholder={creationMode.type === 'file' ? 'main.dev' : 'folder_name'}
                      onChange={(e) => {
                        setCreationName(e.target.value);
                        setCreationError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmCreate();
                        if (e.key === 'Escape') setCreationMode(null);
                      }}
                      className="bg-slate-900 border border-indigo-500 text-white px-1.5 py-0.5 rounded text-[11px] font-mono outline-none flex-1 min-w-0"
                    />
                    <button
                      onClick={handleConfirmCreate}
                      className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setCreationMode(null)}
                      className="p-1 rounded bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {creationError && (
                    <div className="text-[10px] text-rose-400 bg-rose-950/60 border border-rose-800/80 rounded px-1.5 py-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{creationError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Root Folders */}
              {rootFolders.map((folder) => renderTreeFolder(folder.id, 0))}

              {/* Root Files */}
              {rootFiles.map((file) => renderTreeFile(file, 0))}

              {rootFolders.length === 0 && rootFiles.length === 0 && !creationMode && (
                <div className="py-4 text-center text-slate-500 text-[11px] italic">
                  Folder is empty. Click '+' above to create a file.
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: SAMPLE PROGRAMS PRESETS */}
        <div>
          <button
            onClick={() => toggleSection('samples')}
            style={{ backgroundColor: 'var(--bg-card)' }}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition cursor-pointer gap-1.5"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {openSections.samples ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className="truncate">Sample Programs Library</span>
            </div>
            <span className="text-slate-500 text-[9px] font-mono lowercase shrink-0">
              {SAMPLE_PROGRAMS.length} samples
            </span>
          </button>

          {openSections.samples && (
            <div className="py-1 px-1.5 space-y-1">
              {(['Basics', 'Control Flow', 'Functions', 'Algorithms', 'Grammar Studies'] as const).map(
                (cat) => {
                  const catSamples = SAMPLE_PROGRAMS.filter((s) => s.category === cat);
                  const isCatOpen = openCategories[cat];

                  return (
                    <div key={cat} className="space-y-0.5">
                      <button
                        onClick={() => toggleCategory(cat)}
                        className="w-full px-1.5 py-1 rounded flex items-center justify-between text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 text-[11px] font-medium transition cursor-pointer gap-1.5"
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                          {isCatOpen ? (
                            <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                          <span className="truncate">{cat}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono shrink-0">
                          {catSamples.length}
                        </span>
                      </button>

                      {isCatOpen && (
                        <div className="pl-4 space-y-0.5 border-l border-slate-800/60 ml-2">
                          {catSamples.map((sample) => (
                            <div
                              key={sample.id}
                              className="group flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800/40 text-[11px] text-slate-400 hover:text-slate-200 transition"
                            >
                              <div
                                onClick={() => loadSampleIntoProject(sample.name, sample.code)}
                                className="flex items-center gap-1.5 truncate min-w-0 flex-1 cursor-pointer"
                                title={sample.description}
                              >
                                <FileCode className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate">{sample.name}</span>
                              </div>
                              <button
                                onClick={() => loadSampleIntoProject(sample.name, sample.code)}
                                className="opacity-0 group-hover:opacity-100 text-[10px] px-1 py-0.2 rounded bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                                title="Add to project workspace"
                              >
                                Load
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* SECTION 3: COMPILER PIPELINE STAGES */}
        <div>
          <button
            onClick={() => toggleSection('pipeline')}
            style={{ backgroundColor: 'var(--bg-card)' }}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition cursor-pointer gap-1.5"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {openSections.pipeline ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className="truncate">Compiler Pipeline Stages</span>
            </div>
            <span className="text-slate-500 text-[9px] font-mono shrink-0">9 stages</span>
          </button>

          {openSections.pipeline && (
            <div className="py-1 px-1.5 space-y-0.5">
              {pipelineStages.map((stage) => {
                const Icon = stage.icon;
                const isActive = activeTab === stage.id;

                return (
                  <button
                    key={stage.id}
                    onClick={() => setActiveTab(stage.id)}
                    className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between transition cursor-pointer gap-1.5 ${
                      isActive
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{stage.name}</span>
                    </div>
                    <span
                      className={`text-[9px] px-1 rounded font-mono shrink-0 whitespace-nowrap ${
                        isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800/60 text-slate-400'
                      }`}
                    >
                      {stage.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 4: SYMBOL & SCOPE OUTLINE */}
        <div>
          <button
            onClick={() => toggleSection('outline')}
            style={{ backgroundColor: 'var(--bg-card)' }}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition cursor-pointer gap-1.5"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {openSections.outline ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className="truncate">Symbol & Scope Outline</span>
            </div>
            <span className="text-slate-500 text-[9px] font-mono shrink-0">
              {outlineItems.length} items
            </span>
          </button>

          {openSections.outline && (
            <div className="py-1 px-1.5 space-y-0.5">
              {outlineItems.length === 0 ? (
                <div className="px-2 py-2 text-slate-500 italic text-[10px]">
                  No declared symbols in active source file.
                </div>
              ) : (
                outlineItems.map((item, idx) => (
                  <button
                    key={`${item.name}-${idx}`}
                    onClick={() => onLineClick && onLineClick(item.line)}
                    className="w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-800/40 transition cursor-pointer font-mono gap-1.5"
                  >
                    <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.kind === 'func' ? 'bg-purple-400' : 'bg-cyan-400'
                        }`}
                      />
                      <span className="truncate font-semibold">{item.name}</span>
                      {item.typeStr && (
                        <span className="text-[10px] text-slate-500 font-sans truncate">
                          :{item.typeStr}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-500 font-sans shrink-0 whitespace-nowrap">
                      Ln {item.line}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* SECTION 0: DOCUMENTATION & USER GUIDE */}
        <div>
          <button
            onClick={() => toggleSection('docs')}
            style={{ backgroundColor: 'var(--bg-card)' }}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition cursor-pointer gap-1.5"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {openSections.docs ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className="text-indigo-400 font-semibold truncate">User Guide & Reference</span>
            </div>
            <span className="text-indigo-400 text-[9px] font-mono lowercase shrink-0">Manual</span>
          </button>

          {openSections.docs && (
            <div className="py-1 px-1.5 space-y-1">
              {onOpenDocs && (
                <button
                  onClick={onOpenDocs}
                  className="w-full px-2 py-1.5 rounded bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 hover:text-white flex items-center justify-between text-[11px] font-semibold transition cursor-pointer gap-1.5"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">Open User Guide</span>
                  </div>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-900/50 text-indigo-200 shrink-0">
                    F1
                  </span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('docs')}
                className={`w-full px-2 py-1 rounded flex items-center justify-between text-[11px] transition cursor-pointer gap-1.5 ${
                  activeTab === 'docs'
                    ? 'bg-slate-800 text-indigo-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <ListTree className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">View Guide in Visualizer</span>
                </div>
                <span className="text-[9px] text-slate-500 font-mono shrink-0">Dock</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Node Context Menu */}
      {contextMenu && (
        <div
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-app)',
          }}
          className="fixed z-50 w-48 border rounded-lg shadow-2xl py-1 text-xs text-slate-200 divide-y divide-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-0.5">
            {!contextMenu.isFolder && (
              <button
                onClick={() => {
                  openDocument(contextMenu.nodeId);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition flex items-center gap-2"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Open File</span>
              </button>
            )}

            {contextMenu.isFolder && (
              <>
                <button
                  onClick={() => {
                    handleStartCreateFile(contextMenu.nodeId);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition flex items-center gap-2"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>New File Here</span>
                </button>
                <button
                  onClick={() => {
                    handleStartCreateFolder(contextMenu.nodeId);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition flex items-center gap-2"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>New Folder Here</span>
                </button>
              </>
            )}
          </div>

          <div className="py-0.5">
            <button
              onClick={() => {
                cutNode(contextMenu.nodeId, contextMenu.isFolder);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5" />
                <span>Cut</span>
              </div>
              <span className="text-[10px] text-slate-400">Ctrl+X</span>
            </button>
            <button
              onClick={() => {
                copyNode(contextMenu.nodeId, contextMenu.isFolder);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </div>
              <span className="text-[10px] text-slate-400">Ctrl+C</span>
            </button>
            {clipboard && (
              <button
                onClick={() => {
                  const targetFolder = contextMenu.isFolder
                    ? contextMenu.nodeId
                    : activeProject.files[contextMenu.nodeId]?.parentId || 'root';
                  pasteClipboard(targetFolder);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Move className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </div>
                <span className="text-[10px] text-slate-400">Ctrl+V</span>
              </button>
            )}
          </div>

          <div className="py-0.5">
            <button
              onClick={() => {
                handleStartRename(contextMenu.nodeId);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Edit2 className="w-3.5 h-3.5" />
                <span>Rename</span>
              </div>
              <span className="text-[10px] text-slate-400">F2</span>
            </button>
            <button
              onClick={() => {
                duplicateNode(contextMenu.nodeId);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition flex items-center gap-2"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
            {!contextMenu.isFolder && (
              <button
                onClick={() => {
                  exportSingleFile(contextMenu.nodeId);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            )}
          </div>

          <div className="py-0.5">
            <button
              onClick={() => {
                requestDeleteNode(contextMenu.nodeId);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left text-rose-400 hover:bg-rose-900/60 hover:text-rose-200 transition flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {newProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
          <div
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-app)' }}
            className="w-full max-w-sm border rounded-xl shadow-2xl p-5 overflow-hidden flex flex-col gap-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-200">Create New Project</span>
              <button
                onClick={() => setNewProjectModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 font-medium">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                autoFocus
                placeholder="DerivaProject"
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProjectName.trim()) {
                    createProject(newProjectName.trim());
                    setNewProjectModalOpen(false);
                    setNewProjectName('');
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded-lg text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setNewProjectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={!newProjectName.trim()}
                onClick={() => {
                  if (newProjectName.trim()) {
                    createProject(newProjectName.trim());
                    setNewProjectModalOpen(false);
                    setNewProjectName('');
                  }
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
