import React, { useRef, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Code2,
  FileCode,
  FileCode2,
  FilePlus,
  FolderOpen,
  Info,
} from 'lucide-react';
import { CompilerDiagnostic } from '../../types';
import { EditorTabs } from './EditorTabs';
import { useWorkspace } from '../../context/WorkspaceContext';

interface CodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  diagnostics?: CompilerDiagnostic[];
  highlightLine?: number;
  onLineClick?: (line: number) => void;
  hideHeader?: boolean;
  onNewFileClick?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code = '',
  onChange,
  diagnostics = [],
  highlightLine,
  onLineClick,
  hideHeader = false,
  onNewFileClick,
}) => {
  const { activeFile, activeDocumentId, saveFile, createFile, openDocument, activeProject } =
    useWorkspace();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const safeCode = typeof code === 'string' ? code : '';
  const lines = safeCode.split('\n');
  const safeDiagnostics = Array.isArray(diagnostics) ? diagnostics : [];

  const errorsByLine = new Map<number, CompilerDiagnostic[]>();
  for (const d of safeDiagnostics) {
    if (d && d.location) {
      const l = d.location.line;
      if (!errorsByLine.has(l)) errorsByLine.set(l, []);
      errorsByLine.get(l)!.push(d);
    }
  }

  // Handle Tab and Ctrl+S shortcuts in editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      if (activeDocumentId) {
        saveFile(activeDocumentId);
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const val = e.currentTarget.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      onChange(newVal);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const isNonDeriva = activeFile && activeFile.extension !== '.dev' && activeFile.extension !== '.nova';

  return (
    <div className="flex flex-col h-full w-full bg-[#0b0e14] overflow-hidden select-none">
      {/* Multi-Document Tab Bar */}
      {!hideHeader && (
        <EditorTabs diagnostics={diagnostics} onNewFileClick={onNewFileClick} />
      )}

      {/* Non-Deriva Informative Banner */}
      {isNonDeriva && (
        <div className="h-7 px-3 bg-cyan-950/40 border-b border-cyan-800/40 flex items-center justify-between text-[11px] text-cyan-300 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">
              Editing{' '}
              <strong className="font-mono text-white">
                {activeFile.name} ({activeFile.language.toUpperCase()})
              </strong>
              . Compiler pipeline holds last compiled Deriva program.
            </span>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-700/60 font-mono shrink-0">
            Reference File
          </span>
        </div>
      )}

      {/* Editor Canvas or Empty State */}
      {!activeFile ? (
        <div
          style={{ backgroundColor: 'var(--bg-canvas)' }}
          className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-3 select-none"
        >
          <div className="p-3 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-300">
            <FileCode className="w-8 h-8 opacity-70" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">No Document Open</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Select a file from the Project Explorer or create a new Deriva source file to begin
              compiling.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => {
                const res = createFile('program.dev', 'root', '// New Deriva source file\n', true);
                if (res.success && res.fileId) openDocument(res.fileId);
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>New Deriva File</span>
            </button>
            {Object.keys(activeProject.files).length > 0 && (
              <button
                onClick={() => {
                  const first = Object.keys(activeProject.files)[0];
                  if (first) openDocument(first);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Open First File</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{ backgroundColor: 'var(--bg-canvas)' }}
          className="relative flex-1 flex overflow-hidden font-mono text-xs select-text"
        >
          {/* Line Numbers Gutter */}
          <div
            style={{
              backgroundColor: 'var(--editor-gutter-bg)',
              color: 'var(--editor-gutter-text)',
              borderRightColor: 'var(--border-app)',
            }}
            className="w-10 sm:w-11 select-none py-3 text-right pr-2 shrink-0 border-r flex flex-col font-mono text-[11px]"
          >
            {lines.map((_, idx) => {
              const lineNum = idx + 1;
              const lineDiags = errorsByLine.get(lineNum);
              const hasError = !isNonDeriva && lineDiags?.some((d) => d.severity === 'error');
              const hasWarning = !isNonDeriva && lineDiags?.some((d) => d.severity === 'warning');
              const isHighlight = highlightLine === lineNum;

              return (
                <div
                  key={idx}
                  onClick={() => onLineClick?.(lineNum)}
                  className={`h-5 leading-5 flex items-center justify-end gap-1 cursor-pointer transition ${
                    isHighlight
                      ? 'font-bold border-l-2 border-indigo-500 bg-indigo-500/15 text-indigo-400'
                      : hasError
                      ? 'text-rose-500 font-bold'
                      : hasWarning
                      ? 'text-amber-500 font-medium'
                      : 'hover:opacity-80'
                  }`}
                >
                  {hasError && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                  {hasWarning && !hasError && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  )}
                  <span>{lineNum}</span>
                </div>
              );
            })}
          </div>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            id="deriva-code-editor"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            style={{ color: 'var(--text-main)' }}
            className="flex-1 min-w-0 bg-transparent p-3 outline-none resize-none overflow-auto font-mono text-[12px] sm:text-[13px] leading-5 whitespace-pre z-10 select-text"
            placeholder={
              isNonDeriva
                ? '// Type file contents here...'
                : '// Type Deriva code here...'
            }
          />
        </div>
      )}
    </div>
  );
};
