import React, { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Code2,
  File,
  FileCode,
  FileJson,
  FileText,
  Plus,
  Save,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CompilerDiagnostic } from '../../types';

interface EditorTabsProps {
  diagnostics?: CompilerDiagnostic[];
  onNewFileClick?: () => void;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  diagnostics = [],
  onNewFileClick,
}) => {
  const {
    activeProject,
    openDocuments,
    activeDocumentId,
    openDocument,
    closeDocument,
    closeOtherDocuments,
    closeAllDocuments,
    closeSavedDocuments,
    saveFile,
    exportSingleFile,
    setSelectedNodeId,
  } = useWorkspace();

  const [contextMenu, setContextMenu] = useState<{
    fileId: string;
    x: number;
    y: number;
  } | null>(null);

  const tabsScrollRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      setContextMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const handleTabContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      fileId,
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 200),
    });
  };

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

  const activeFile = activeDocumentId ? activeProject.files[activeDocumentId] : null;
  const isDerivaLang = activeFile?.extension === '.dev' || activeFile?.extension === '.nova';
  const lineCount = activeFile?.content ? activeFile.content.split('\n').length : 0;

  const safeDiags = Array.isArray(diagnostics) ? diagnostics : [];
  const hasErrors = isDerivaLang && safeDiags.some((d) => d.severity === 'error');
  const hasWarnings = isDerivaLang && !hasErrors && safeDiags.some((d) => d.severity === 'warning');

  return (
    <div
      style={{ backgroundColor: 'var(--bg-card)', borderBottomColor: 'var(--border-app)' }}
      className="h-9 w-full flex items-center justify-between border-b select-none shrink-0 overflow-hidden text-xs"
    >
      {/* Scrollable Tabs List */}
      <div
        ref={tabsScrollRef}
        className="flex items-center h-full overflow-x-auto overflow-y-hidden scrollbar-none flex-1 min-w-0"
      >
        {openDocuments.map((doc) => {
          const file = activeProject.files[doc.fileId];
          if (!file) return null;

          const isActive = doc.fileId === activeDocumentId;
          const isDirty = file.isDirty;

          return (
            <div
              key={doc.fileId}
              onClick={() => openDocument(doc.fileId)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  // Middle click closes tab
                  e.preventDefault();
                  closeDocument(doc.fileId);
                }
              }}
              onContextMenu={(e) => handleTabContextMenu(e, doc.fileId)}
              style={{
                backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                borderColor: 'var(--border-app)',
              }}
              className={`group relative h-full flex items-center gap-1.5 px-3 border-r cursor-pointer transition min-w-[100px] max-w-[180px] shrink-0 ${
                isActive
                  ? 'text-indigo-300 font-semibold border-t-2 border-t-indigo-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-t-2 border-t-transparent'
              }`}
              title={`${file.path}${isDirty ? ' (Unsaved changes)' : ''}`}
            >
              {getFileIcon(file.name)}
              <span className="truncate text-[11px] font-mono flex-1">{file.name}</span>

              {/* Dirty indicator or close button */}
              <div className="flex items-center shrink-0 w-4 h-4 justify-center">
                {isDirty ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDocument(doc.fileId);
                    }}
                    title="Unsaved changes. Click to close."
                    className="w-2 h-2 rounded-full bg-amber-400 group-hover:hidden transition-transform"
                  />
                ) : null}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDocument(doc.fileId);
                  }}
                  className={`p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/80 transition ${
                    isDirty ? 'hidden group-hover:flex' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Close (Ctrl+W)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Plus Button to Quick Create File */}
        {onNewFileClick && (
          <button
            onClick={onNewFileClick}
            className="p-1.5 ml-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition cursor-pointer shrink-0"
            title="New File"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right-Hand Document Info & Status */}
      {activeFile && (
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 shrink-0 text-[11px] text-slate-400 border-l border-slate-800/60 max-w-[50%] overflow-hidden">
          {/* Quick Save button if dirty */}
          {activeFile.isDirty && (
            <button
              onClick={() => saveFile(activeFile.id)}
              className="px-1.5 sm:px-2 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
              title="Save changes (Ctrl+S)"
            >
              <Save className="w-3 h-3 shrink-0" />
              <span className="hidden min-[400px]:inline">Save</span>
            </button>
          )}

          {/* Language tag */}
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono hidden min-[540px]:inline shrink-0">
            {activeFile.extension === '.dev' || activeFile.extension === '.nova'
              ? 'Deriva'
              : activeFile.extension === '.md'
              ? 'Markdown'
              : activeFile.extension === '.json'
              ? 'JSON'
              : 'Text'}
          </span>

          <span className="font-mono text-[10px] text-slate-500 hidden min-[600px]:inline shrink-0">
            {lineCount} lines
          </span>

          {/* Compiler Status for Active File */}
          {isDerivaLang ? (
            hasErrors ? (
              <span className="text-rose-400 flex items-center gap-1 font-semibold text-[10px] shrink-0" title="Compiler Errors detected">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span className="hidden min-[380px]:inline">Errors</span>
              </span>
            ) : hasWarnings ? (
              <span className="text-amber-400 flex items-center gap-1 font-semibold text-[10px] shrink-0" title="Compiler Warnings detected">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span className="hidden min-[380px]:inline">Warnings</span>
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[10px] shrink-0" title="Clean Compilation">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="hidden min-[380px]:inline">OK</span>
              </span>
            )
          ) : (
            <span className="text-cyan-400 text-[10px] font-mono hidden min-[480px]:inline shrink-0">
              Doc Mode
            </span>
          )}
        </div>
      )}

      {/* Tab Context Menu */}
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
            <button
              onClick={() => {
                closeDocument(contextMenu.fileId);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition flex items-center justify-between"
            >
              <span>Close Tab</span>
              <span className="text-[10px] text-slate-400">Ctrl+W</span>
            </button>
            <button
              onClick={() => {
                closeOtherDocuments(contextMenu.fileId);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition"
            >
              Close Others
            </button>
            <button
              onClick={() => {
                closeSavedDocuments();
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition"
            >
              Close Saved
            </button>
            <button
              onClick={() => {
                closeAllDocuments();
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition"
            >
              Close All
            </button>
          </div>

          <div className="py-0.5">
            <button
              onClick={() => {
                saveFile(contextMenu.fileId);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition flex items-center justify-between"
            >
              <span>Save</span>
              <span className="text-[10px] text-slate-400">Ctrl+S</span>
            </button>
            <button
              onClick={() => {
                setSelectedNodeId(contextMenu.fileId);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition"
            >
              Reveal in Explorer
            </button>
            <button
              onClick={() => {
                exportSingleFile(contextMenu.fileId);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white transition"
            >
              Download File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
