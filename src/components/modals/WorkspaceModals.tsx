import React from 'react';
import { AlertCircle, AlertTriangle, FileCode, Folder, Trash2, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const WorkspaceModals: React.FC = () => {
  const {
    deleteModal,
    closeDeleteModal,
    confirmDeleteNode,
    unsavedModal,
    closeUnsavedModal,
    resolveUnsavedModal,
    conflictModal,
    closeConflictModal,
    resolveConflictModal,
  } = useWorkspace();

  return (
    <>
      {/* 1. Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.node && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
          <div
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-app)' }}
            className="w-full max-w-md border rounded-xl shadow-2xl p-5 overflow-hidden flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-400 font-semibold text-sm">
                <Trash2 className="w-5 h-5 shrink-0" />
                <span>Confirm Deletion</span>
              </div>
              <button
                onClick={closeDeleteModal}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2.5">
              <p>
                Are you sure you want to delete{' '}
                <strong className="text-white font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                  {deleteModal.node.name}
                </strong>
                ?
              </p>

              {deleteModal.isFolder && (
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <Folder className="w-3.5 h-3.5" />
                    <span>This folder contains:</span>
                  </div>
                  <div className="flex items-center gap-3 pl-5 text-slate-300 font-mono">
                    <span>
                      {deleteModal.fileCount} {deleteModal.fileCount === 1 ? 'file' : 'files'}
                    </span>
                    <span>•</span>
                    <span>
                      {deleteModal.subfolderCount}{' '}
                      {deleteModal.subfolderCount === 1 ? 'subfolder' : 'subfolders'}
                    </span>
                  </div>
                </div>
              )}

              {deleteModal.hasDirtyFiles && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-[11px] text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>
                    Warning: Contains unsaved changes! Permanently deleting will discard all unsaved
                    modifications.
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
              <button
                onClick={closeDeleteModal}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteNode}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Unsaved Changes Confirmation Modal */}
      {unsavedModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
          <div
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-app)' }}
            className="w-full max-w-md border rounded-xl shadow-2xl p-5 overflow-hidden flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>Unsaved Changes</span>
              </div>
              <button
                onClick={closeUnsavedModal}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                Do you want to save the changes you made to{' '}
                <strong className="text-white font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                  {unsavedModal.fileName}
                </strong>
                ?
              </p>
              <p className="text-slate-400 text-[11px]">
                Your changes will be lost if you close this document without saving.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
              <button
                onClick={closeUnsavedModal}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveUnsavedModal('discard')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-rose-900/60 text-rose-300 border border-slate-700 hover:border-rose-700 transition cursor-pointer"
              >
                Don't Save
              </button>
              <button
                onClick={() => resolveUnsavedModal('save')}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Conflict Resolution Modal */}
      {conflictModal.isOpen && conflictModal.conflictInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
          <div
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-app)' }}
            className="w-full max-w-md border rounded-xl shadow-2xl p-5 overflow-hidden flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm">
                <FileCode className="w-5 h-5 shrink-0" />
                <span>File Name Conflict</span>
              </div>
              <button
                onClick={closeConflictModal}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                A file named{' '}
                <strong className="text-white font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                  {conflictModal.conflictInfo.newFileName}
                </strong>{' '}
                already exists in this directory.
              </p>
              <p className="text-slate-400 text-[11px]">
                Please choose how you would like to resolve this conflict:
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
              <button
                onClick={() => resolveConflictModal('skip')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
              >
                Skip
              </button>
              <button
                onClick={() => resolveConflictModal('keep_both')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              >
                Keep Both
              </button>
              <button
                onClick={() => resolveConflictModal('replace')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition cursor-pointer"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
