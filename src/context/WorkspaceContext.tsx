import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  FileConflictChoice,
  FileConflictInfo,
  FileNode,
  FolderNode,
  OpenDocument,
  Project,
  ValidationResult,
  Workspace,
} from '../types/workspace';
import {
  createDefaultWorkspace,
  exportProjectToZip,
  exportSingleFileToDisk,
  extractZipArchive,
  loadWorkspaceFromStorage,
  migrateWorkspaceToDeriva,
  resolveNodePath,
  saveWorkspaceToStorage,
} from '../services/workspaceStorage';
import {
  generateUniqueFileName,
  generateUniqueFolderName,
  getLanguageFromFileName,
  isMoveIllegal,
  resolveFileName,
  validateNodeName,
} from '../utils/fileValidation';

interface ClipboardState {
  nodeId: string;
  isFolder: boolean;
  isCut: boolean;
}

interface DeleteModalState {
  isOpen: boolean;
  node: FileNode | FolderNode | null;
  isFolder: boolean;
  fileCount: number;
  subfolderCount: number;
  hasDirtyFiles: boolean;
}

interface UnsavedModalState {
  isOpen: boolean;
  fileId: string | null;
  fileName: string;
}

interface ConflictModalState {
  isOpen: boolean;
  conflictInfo: FileConflictInfo | null;
  onResolve?: (choice: FileConflictChoice) => void;
}

interface WorkspaceContextType {
  workspace: Workspace;
  activeProject: Project;
  activeFile: FileNode | null;
  openDocuments: OpenDocument[];
  activeDocumentId: string | null;
  selectedNodeId: string | null;
  searchQuery: string;
  clipboard: ClipboardState | null;

  // Modals
  deleteModal: DeleteModalState;
  unsavedModal: UnsavedModalState;
  conflictModal: ConflictModalState;
  closeDeleteModal: () => void;
  confirmDeleteNode: () => void;
  closeUnsavedModal: () => void;
  resolveUnsavedModal: (action: 'save' | 'discard') => void;
  closeConflictModal: () => void;
  resolveConflictModal: (choice: FileConflictChoice) => void;

  // Actions
  setSelectedNodeId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  createFile: (
    name: string,
    parentFolderId?: string,
    content?: string,
    isDerivaDefault?: boolean
  ) => { success: boolean; fileId?: string; error?: string };
  createFolder: (
    name: string,
    parentFolderId?: string
  ) => { success: boolean; folderId?: string; error?: string };
  renameNode: (nodeId: string, newName: string) => { success: boolean; error?: string };
  requestDeleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => { success: boolean; newNodeId?: string; error?: string };
  moveNode: (nodeId: string, targetFolderId: string) => { success: boolean; error?: string };
  cutNode: (nodeId: string, isFolder: boolean) => void;
  copyNode: (nodeId: string, isFolder: boolean) => void;
  pasteClipboard: (targetFolderId: string) => { success: boolean; error?: string };
  openDocument: (fileId: string) => void;
  closeDocument: (fileId: string, force?: boolean) => void;
  closeOtherDocuments: (fileId: string) => void;
  closeAllDocuments: () => void;
  closeSavedDocuments: () => void;
  updateFileContent: (fileId: string, content: string) => void;
  saveFile: (fileId: string) => void;
  saveAllFiles: () => void;
  revertFile: (fileId: string) => void;
  toggleFolder: (folderId: string) => void;
  collapseAllFolders: () => void;
  expandAllFolders: () => void;
  exportProjectZip: () => Promise<void>;
  exportSingleFile: (fileId: string) => void;
  exportWorkspaceJson: () => void;
  importWorkspaceJson: (jsonStr: string) => boolean;
  importFiles: (
    fileList: FileList | File[],
    targetFolderId?: string
  ) => Promise<{ imported: number; skipped: number }>;
  importZipArchive: (
    zipFile: File,
    targetFolderId?: string
  ) => Promise<{ imported: number; errors: string[] }>;
  createProject: (name: string) => void;
  switchProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  resetToDefaultWorkspace: () => void;
  loadSampleIntoProject: (sampleName: string, code: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspaceFromStorage());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);

  // Dialogs
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    node: null,
    isFolder: false,
    fileCount: 0,
    subfolderCount: 0,
    hasDirtyFiles: false,
  });

  const [unsavedModal, setUnsavedModal] = useState<UnsavedModalState>({
    isOpen: false,
    fileId: null,
    fileName: '',
  });

  const [conflictModal, setConflictModal] = useState<ConflictModalState>({
    isOpen: false,
    conflictInfo: null,
  });

  // Current active project
  const activeProject = useMemo(() => {
    return (
      workspace.projects.find((p) => p.id === workspace.activeProjectId) ||
      workspace.projects[0] ||
      createDefaultWorkspace().projects[0]
    );
  }, [workspace]);

  // Current active file
  const activeFile = useMemo(() => {
    if (!workspace.activeDocumentId) return null;
    return activeProject.files[workspace.activeDocumentId] || null;
  }, [activeProject, workspace.activeDocumentId]);

  // Save workspace whenever modified
  useEffect(() => {
    saveWorkspaceToStorage(workspace);
  }, [workspace]);

  // Helper to update current project immutably
  const updateActiveProject = useCallback(
    (updater: (project: Project) => Project) => {
      setWorkspace((prev) => {
        const updatedProjects = prev.projects.map((p) => {
          if (p.id === prev.activeProjectId) {
            return updater(p);
          }
          return p;
        });
        return {
          ...prev,
          projects: updatedProjects,
        };
      });
    },
    []
  );

  // Open a document
  const openDocument = useCallback((fileId: string) => {
    setWorkspace((prev) => {
      const activeProj = prev.projects.find((p) => p.id === prev.activeProjectId);
      if (!activeProj || !activeProj.files[fileId]) return prev;

      const alreadyOpen = prev.openDocuments.some((doc) => doc.fileId === fileId);
      const newDocs = alreadyOpen ? prev.openDocuments : [...prev.openDocuments, { id: fileId, fileId }];

      return {
        ...prev,
        openDocuments: newDocs,
        activeDocumentId: fileId,
      };
    });
    setSelectedNodeId(fileId);
  }, []);

  // Request close document (prompts if dirty)
  const closeDocument = useCallback(
    (fileId: string, force: boolean = false) => {
      const file = activeProject.files[fileId];
      if (!force && file && file.isDirty) {
        setUnsavedModal({
          isOpen: true,
          fileId,
          fileName: file.name,
        });
        return;
      }

      setWorkspace((prev) => {
        const nextDocs = prev.openDocuments.filter((doc) => doc.fileId !== fileId);
        let nextActiveId = prev.activeDocumentId;

        if (prev.activeDocumentId === fileId) {
          if (nextDocs.length > 0) {
            nextActiveId = nextDocs[nextDocs.length - 1].fileId;
          } else {
            nextActiveId = null;
          }
        }

        return {
          ...prev,
          openDocuments: nextDocs,
          activeDocumentId: nextActiveId,
        };
      });
    },
    [activeProject]
  );

  const closeUnsavedModal = useCallback(() => {
    setUnsavedModal({ isOpen: false, fileId: null, fileName: '' });
  }, []);

  // Resolve unsaved changes prompt
  const resolveUnsavedModal = useCallback(
    (action: 'save' | 'discard') => {
      if (!unsavedModal.fileId) {
        closeUnsavedModal();
        return;
      }
      const targetId = unsavedModal.fileId;

      if (action === 'save') {
        // Save then close
        updateActiveProject((proj) => {
          const file = proj.files[targetId];
          if (!file) return proj;
          return {
            ...proj,
            files: {
              ...proj.files,
              [targetId]: {
                ...file,
                savedContent: file.content,
                isDirty: false,
                modifiedAt: Date.now(),
              },
            },
          };
        });
      } else {
        // Discard changes
        updateActiveProject((proj) => {
          const file = proj.files[targetId];
          if (!file) return proj;
          return {
            ...proj,
            files: {
              ...proj.files,
              [targetId]: {
                ...file,
                content: file.savedContent,
                isDirty: false,
              },
            },
          };
        });
      }

      // Close the document
      closeDocument(targetId, true);
      closeUnsavedModal();
    },
    [unsavedModal.fileId, updateActiveProject, closeDocument, closeUnsavedModal]
  );

  // Close other documents
  const closeOtherDocuments = useCallback((fileId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      openDocuments: prev.openDocuments.filter((d) => d.fileId === fileId),
      activeDocumentId: fileId,
    }));
  }, []);

  // Close all documents
  const closeAllDocuments = useCallback(() => {
    setWorkspace((prev) => ({
      ...prev,
      openDocuments: [],
      activeDocumentId: null,
    }));
  }, []);

  // Close saved documents
  const closeSavedDocuments = useCallback(() => {
    setWorkspace((prev) => {
      const activeProj = prev.projects.find((p) => p.id === prev.activeProjectId);
      if (!activeProj) return prev;

      const remainingDocs = prev.openDocuments.filter((doc) => {
        const file = activeProj.files[doc.fileId];
        return file && file.isDirty;
      });

      let nextActive = prev.activeDocumentId;
      if (nextActive && !remainingDocs.some((d) => d.fileId === nextActive)) {
        nextActive = remainingDocs[0]?.fileId || null;
      }

      return {
        ...prev,
        openDocuments: remainingDocs,
        activeDocumentId: nextActive,
      };
    });
  }, []);

  // Update file content
  const updateFileContent = useCallback(
    (fileId: string, content: string) => {
      updateActiveProject((proj) => {
        const file = proj.files[fileId];
        if (!file) return proj;

        const isDirty = content !== file.savedContent;
        return {
          ...proj,
          modifiedAt: Date.now(),
          files: {
            ...proj.files,
            [fileId]: {
              ...file,
              content,
              isDirty,
              modifiedAt: Date.now(),
            },
          },
        };
      });
    },
    [updateActiveProject]
  );

  // Save single file
  const saveFile = useCallback(
    (fileId: string) => {
      updateActiveProject((proj) => {
        const file = proj.files[fileId];
        if (!file) return proj;

        return {
          ...proj,
          modifiedAt: Date.now(),
          files: {
            ...proj.files,
            [fileId]: {
              ...file,
              savedContent: file.content,
              isDirty: false,
              modifiedAt: Date.now(),
            },
          },
        };
      });
    },
    [updateActiveProject]
  );

  // Save all files
  const saveAllFiles = useCallback(() => {
    updateActiveProject((proj) => {
      const updatedFiles = { ...proj.files };
      let anyChanged = false;

      Object.keys(updatedFiles).forEach((fId) => {
        const file = updatedFiles[fId];
        if (file.isDirty) {
          anyChanged = true;
          updatedFiles[fId] = {
            ...file,
            savedContent: file.content,
            isDirty: false,
            modifiedAt: Date.now(),
          };
        }
      });

      if (!anyChanged) return proj;

      return {
        ...proj,
        modifiedAt: Date.now(),
        files: updatedFiles,
      };
    });
  }, [updateActiveProject]);

  // Revert file to saved state
  const revertFile = useCallback(
    (fileId: string) => {
      updateActiveProject((proj) => {
        const file = proj.files[fileId];
        if (!file || !file.isDirty) return proj;

        return {
          ...proj,
          files: {
            ...proj.files,
            [fileId]: {
              ...file,
              content: file.savedContent,
              isDirty: false,
            },
          },
        };
      });
    },
    [updateActiveProject]
  );

  // Create file
  const createFile = useCallback(
    (
      rawName: string,
      parentFolderId: string = 'root',
      content: string = '',
      isDerivaDefault: boolean = true
    ): { success: boolean; fileId?: string; error?: string } => {
      const resolvedName = resolveFileName(rawName, isDerivaDefault);
      const validation = validateNodeName(
        resolvedName,
        parentFolderId,
        activeProject.files,
        activeProject.folders,
        false
      );

      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const dotIndex = resolvedName.lastIndexOf('.');
      const extension = dotIndex !== -1 ? resolvedName.substring(dotIndex) : '';
      const language = getLanguageFromFileName(resolvedName);
      const path = resolveNodePath(parentFolderId, resolvedName, activeProject.folders);
      const now = Date.now();

      const newFile: FileNode = {
        id: fileId,
        name: resolvedName,
        extension,
        path,
        parentId: parentFolderId,
        content,
        savedContent: content,
        language,
        createdAt: now,
        modifiedAt: now,
        isDirty: false,
        origin: 'user',
      };

      updateActiveProject((proj) => {
        const nextFolders = { ...proj.folders };
        if (parentFolderId !== 'root' && nextFolders[parentFolderId]) {
          nextFolders[parentFolderId] = {
            ...nextFolders[parentFolderId],
            isExpanded: true,
          };
        }

        return {
          ...proj,
          modifiedAt: now,
          folders: nextFolders,
          files: {
            ...proj.files,
            [fileId]: newFile,
          },
        };
      });

      // Automatically open the created file
      openDocument(fileId);

      return { success: true, fileId };
    },
    [activeProject, updateActiveProject, openDocument]
  );

  // Create folder
  const createFolder = useCallback(
    (
      rawName: string,
      parentFolderId: string = 'root'
    ): { success: boolean; folderId?: string; error?: string } => {
      const trimmed = rawName.trim();
      const validation = validateNodeName(
        trimmed,
        parentFolderId,
        activeProject.files,
        activeProject.folders,
        true
      );

      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const folderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const path = resolveNodePath(parentFolderId, trimmed, activeProject.folders);
      const now = Date.now();

      const newFolder: FolderNode = {
        id: folderId,
        name: trimmed,
        path,
        parentId: parentFolderId,
        createdAt: now,
        modifiedAt: now,
        isExpanded: true,
      };

      updateActiveProject((proj) => {
        const nextFolders = { ...proj.folders };
        if (parentFolderId !== 'root' && nextFolders[parentFolderId]) {
          nextFolders[parentFolderId] = {
            ...nextFolders[parentFolderId],
            isExpanded: true,
          };
        }

        return {
          ...proj,
          modifiedAt: now,
          folders: {
            ...nextFolders,
            [folderId]: newFolder,
          },
        };
      });

      setSelectedNodeId(folderId);
      return { success: true, folderId };
    },
    [activeProject, updateActiveProject]
  );

  // Rename node (file or folder)
  const renameNode = useCallback(
    (nodeId: string, newName: string): { success: boolean; error?: string } => {
      const isFolder = !!activeProject.folders[nodeId];
      const isFile = !!activeProject.files[nodeId];

      if (!isFolder && !isFile) {
        return { success: false, error: 'Target item does not exist.' };
      }

      const parentId = isFolder
        ? activeProject.folders[nodeId].parentId
        : activeProject.files[nodeId].parentId;

      const validation = validateNodeName(
        newName,
        parentId,
        activeProject.files,
        activeProject.folders,
        isFolder,
        nodeId
      );

      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const cleanName = validation.sanitizedName || newName.trim();

      updateActiveProject((proj) => {
        const now = Date.now();

        if (isFile) {
          const file = proj.files[nodeId];
          const dotIdx = cleanName.lastIndexOf('.');
          const extension = dotIdx !== -1 ? cleanName.substring(dotIdx) : '';
          const language = getLanguageFromFileName(cleanName);
          const newPath = resolveNodePath(file.parentId, cleanName, proj.folders);

          return {
            ...proj,
            modifiedAt: now,
            files: {
              ...proj.files,
              [nodeId]: {
                ...file,
                name: cleanName,
                extension,
                language,
                path: newPath,
                modifiedAt: now,
              },
            },
          };
        }

        if (isFolder) {
          const folder = proj.folders[nodeId];
          const newFolderPath = resolveNodePath(folder.parentId, cleanName, proj.folders);

          // Update folder
          const updatedFolders = {
            ...proj.folders,
            [nodeId]: {
              ...folder,
              name: cleanName,
              path: newFolderPath,
              modifiedAt: now,
            },
          };

          // Update all descendant folder and file paths
          const recomputePaths = (fId: string, currentPath: string) => {
            // Recompute descendant folders
            (Object.values(updatedFolders) as FolderNode[]).forEach((f) => {
              if (f.parentId === fId) {
                const subPath = `${currentPath}/${f.name}`;
                updatedFolders[f.id] = { ...f, path: subPath };
                recomputePaths(f.id, subPath);
              }
            });
          };
          recomputePaths(nodeId, newFolderPath);

          // Recompute descendant files
          const updatedFiles = { ...proj.files };
          (Object.values(updatedFiles) as FileNode[]).forEach((f) => {
            const fParent = updatedFolders[f.parentId];
            if (fParent) {
              updatedFiles[f.id] = { ...f, path: `${fParent.path}/${f.name}` };
            }
          });

          return {
            ...proj,
            modifiedAt: now,
            folders: updatedFolders,
            files: updatedFiles,
          };
        }

        return proj;
      });

      return { success: true };
    },
    [activeProject, updateActiveProject]
  );

  // Request delete (opens confirmation modal)
  const requestDeleteNode = useCallback(
    (nodeId: string) => {
      const folder = activeProject.folders[nodeId];
      const file = activeProject.files[nodeId];

      if (!folder && !file) return;

      if (file) {
        setDeleteModal({
          isOpen: true,
          node: file,
          isFolder: false,
          fileCount: 1,
          subfolderCount: 0,
          hasDirtyFiles: file.isDirty,
        });
        return;
      }

      if (folder) {
        // Collect all descendant files and subfolders
        const findDescendants = (fId: string) => {
          let fCount = 0;
          let subCount = 0;
          let dirty = false;

          (Object.values(activeProject.folders) as FolderNode[]).forEach((f) => {
            if (f.parentId === fId) {
              subCount++;
              const nested = findDescendants(f.id);
              fCount += nested.fCount;
              subCount += nested.subCount;
              if (nested.dirty) dirty = true;
            }
          });

          (Object.values(activeProject.files) as FileNode[]).forEach((f) => {
            if (f.parentId === fId) {
              fCount++;
              if (f.isDirty) dirty = true;
            }
          });

          return { fCount, subCount, dirty };
        };

        const stats = findDescendants(nodeId);

        setDeleteModal({
          isOpen: true,
          node: folder,
          isFolder: true,
          fileCount: stats.fCount,
          subfolderCount: stats.subCount,
          hasDirtyFiles: stats.dirty,
        });
      }
    },
    [activeProject]
  );

  const closeDeleteModal = useCallback(() => {
    setDeleteModal({
      isOpen: false,
      node: null,
      isFolder: false,
      fileCount: 0,
      subfolderCount: 0,
      hasDirtyFiles: false,
    });
  }, []);

  // Confirm delete node
  const confirmDeleteNode = useCallback(() => {
    if (!deleteModal.node) return;
    const targetId = deleteModal.node.id;
    const isFolder = deleteModal.isFolder;

    updateActiveProject((proj) => {
      const nextFiles = { ...proj.files };
      const nextFolders = { ...proj.folders };
      const deletedFileIds = new Set<string>();

      if (!isFolder) {
        deletedFileIds.add(targetId);
        delete nextFiles[targetId];
      } else {
        const collectDeletions = (fId: string) => {
          (Object.values(nextFolders) as FolderNode[]).forEach((f) => {
            if (f.parentId === fId) {
              collectDeletions(f.id);
              delete nextFolders[f.id];
            }
          });
          (Object.values(nextFiles) as FileNode[]).forEach((f) => {
            if (f.parentId === fId) {
              deletedFileIds.add(f.id);
              delete nextFiles[f.id];
            }
          });
        };

        collectDeletions(targetId);
        delete nextFolders[targetId];
      }

      // Close open documents for deleted files
      setWorkspace((w) => {
        const remainingDocs = w.openDocuments.filter((d) => !deletedFileIds.has(d.fileId));
        let nextActive = w.activeDocumentId;
        if (nextActive && deletedFileIds.has(nextActive)) {
          nextActive = remainingDocs[0]?.fileId || Object.keys(nextFiles)[0] || null;
        }
        return {
          ...w,
          openDocuments: remainingDocs,
          activeDocumentId: nextActive,
        };
      });

      return {
        ...proj,
        modifiedAt: Date.now(),
        files: nextFiles,
        folders: nextFolders,
      };
    });

    closeDeleteModal();
  }, [deleteModal, updateActiveProject, closeDeleteModal]);

  // Duplicate file or folder
  const duplicateNode = useCallback(
    (nodeId: string): { success: boolean; newNodeId?: string; error?: string } => {
      const file = activeProject.files[nodeId];
      const folder = activeProject.folders[nodeId];

      if (!file && !folder) return { success: false, error: 'Item not found.' };

      if (file) {
        const uniqueName = generateUniqueFileName(
          file.name,
          file.parentId,
          activeProject.files,
          activeProject.folders
        );
        const res = createFile(uniqueName, file.parentId, file.content, false);
        return { success: res.success, newNodeId: res.fileId, error: res.error };
      }

      if (folder) {
        const uniqueName = generateUniqueFolderName(
          folder.name,
          folder.parentId,
          activeProject.folders
        );
        const res = createFolder(uniqueName, folder.parentId);
        if (!res.success || !res.folderId) return res;

        // Recursively clone folder children
        const cloneChildren = (srcFolderId: string, destFolderId: string) => {
          (Object.values(activeProject.files) as FileNode[]).forEach((f) => {
            if (f.parentId === srcFolderId) {
              createFile(f.name, destFolderId, f.content, false);
            }
          });
          (Object.values(activeProject.folders) as FolderNode[]).forEach((f) => {
            if (f.parentId === srcFolderId) {
              const subRes = createFolder(f.name, destFolderId);
              if (subRes.success && subRes.folderId) {
                cloneChildren(f.id, subRes.folderId);
              }
            }
          });
        };

        cloneChildren(folder.id, res.folderId);
        return { success: true, newNodeId: res.folderId };
      }

      return { success: false, error: 'Unknown item.' };
    },
    [activeProject, createFile, createFolder]
  );

  // Move node (file or folder) to a target folder
  const moveNode = useCallback(
    (nodeId: string, targetFolderId: string): { success: boolean; error?: string } => {
      const file = activeProject.files[nodeId];
      const folder = activeProject.folders[nodeId];

      if (!file && !folder) return { success: false, error: 'Item not found.' };

      const isFolder = !!folder;
      const currentParent = isFolder ? folder.parentId : file.parentId;

      if (currentParent === targetFolderId) {
        return { success: true }; // Already there
      }

      // Check for illegal cycle
      if (isMoveIllegal(nodeId, isFolder, targetFolderId, activeProject.folders)) {
        return {
          success: false,
          error: 'Cannot move a folder into itself or into one of its subfolders.',
        };
      }

      const nodeName = isFolder ? folder.name : file.name;
      const validation = validateNodeName(
        nodeName,
        targetFolderId,
        activeProject.files,
        activeProject.folders,
        isFolder,
        nodeId
      );

      if (!validation.isValid) {
        return {
          success: false,
          error: `Cannot move item: ${validation.error}`,
        };
      }

      updateActiveProject((proj) => {
        const now = Date.now();
        const nextFolders = { ...proj.folders };
        const nextFiles = { ...proj.files };

        // Ensure target folder is expanded
        if (targetFolderId !== 'root' && nextFolders[targetFolderId]) {
          nextFolders[targetFolderId] = {
            ...nextFolders[targetFolderId],
            isExpanded: true,
          };
        }

        if (!isFolder) {
          const newPath = resolveNodePath(targetFolderId, file.name, nextFolders);
          nextFiles[nodeId] = {
            ...file,
            parentId: targetFolderId,
            path: newPath,
            modifiedAt: now,
          };
        } else {
          const newFolderPath = resolveNodePath(targetFolderId, folder.name, nextFolders);
          nextFolders[nodeId] = {
            ...folder,
            parentId: targetFolderId,
            path: newFolderPath,
            modifiedAt: now,
          };

          // Recompute children paths
          const recompute = (fId: string, currentPath: string) => {
            (Object.values(nextFolders) as FolderNode[]).forEach((f) => {
              if (f.parentId === fId) {
                const subP = `${currentPath}/${f.name}`;
                nextFolders[f.id] = { ...f, path: subP };
                recompute(f.id, subP);
              }
            });
            (Object.values(nextFiles) as FileNode[]).forEach((f) => {
              if (f.parentId === fId) {
                nextFiles[f.id] = { ...f, path: `${currentPath}/${f.name}` };
              }
            });
          };

          recompute(nodeId, newFolderPath);
        }

        return {
          ...proj,
          modifiedAt: now,
          files: nextFiles,
          folders: nextFolders,
        };
      });

      return { success: true };
    },
    [activeProject, updateActiveProject]
  );

  // Cut & Copy
  const cutNode = useCallback((nodeId: string, isFolder: boolean) => {
    setClipboard({ nodeId, isFolder, isCut: true });
  }, []);

  const copyNode = useCallback((nodeId: string, isFolder: boolean) => {
    setClipboard({ nodeId, isFolder, isCut: false });
  }, []);

  // Paste from clipboard
  const pasteClipboard = useCallback(
    (targetFolderId: string): { success: boolean; error?: string } => {
      if (!clipboard) return { success: false, error: 'Clipboard is empty.' };

      if (clipboard.isCut) {
        const res = moveNode(clipboard.nodeId, targetFolderId);
        if (res.success) {
          setClipboard(null); // Clear cut clipboard after paste
        }
        return res;
      } else {
        // Copy operation
        const res = duplicateNode(clipboard.nodeId);
        if (res.success && res.newNodeId) {
          // Move duplicated item to target folder if needed
          moveNode(res.newNodeId, targetFolderId);
        }
        return res;
      }
    },
    [clipboard, moveNode, duplicateNode]
  );

  // Folder accordion toggles
  const toggleFolder = useCallback(
    (folderId: string) => {
      updateActiveProject((proj) => {
        const folder = proj.folders[folderId];
        if (!folder) return proj;

        return {
          ...proj,
          folders: {
            ...proj.folders,
            [folderId]: {
              ...folder,
              isExpanded: !folder.isExpanded,
            },
          },
        };
      });
    },
    [updateActiveProject]
  );

  const collapseAllFolders = useCallback(() => {
    updateActiveProject((proj) => {
      const nextFolders = { ...proj.folders };
      Object.keys(nextFolders).forEach((k) => {
        nextFolders[k] = { ...nextFolders[k], isExpanded: false };
      });
      return { ...proj, folders: nextFolders };
    });
  }, [updateActiveProject]);

  const expandAllFolders = useCallback(() => {
    updateActiveProject((proj) => {
      const nextFolders = { ...proj.folders };
      Object.keys(nextFolders).forEach((k) => {
        nextFolders[k] = { ...nextFolders[k], isExpanded: true };
      });
      return { ...proj, folders: nextFolders };
    });
  }, [updateActiveProject]);

  // Export ZIP
  const exportProjectZip = useCallback(async () => {
    await exportProjectToZip(activeProject);
  }, [activeProject]);

  // Export single file
  const exportSingleFile = useCallback(
    (fileId: string) => {
      const file = activeProject.files[fileId];
      if (file) {
        exportSingleFileToDisk(file);
      }
    },
    [activeProject]
  );

  // Export workspace JSON
  const exportWorkspaceJson = useCallback(() => {
    const jsonStr = JSON.stringify(workspace, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.name || 'DerivaWorkspace'}-backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [workspace, activeProject]);

  // Import workspace JSON
  const importWorkspaceJson = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
        migrateWorkspaceToDeriva(parsed);
        setWorkspace(parsed);
        return true;
      }
    } catch (err) {
      console.error('Failed to parse workspace JSON:', err);
    }
    return false;
  }, []);

  // Import raw files
  const importFiles = useCallback(
    async (
      fileList: FileList | File[],
      targetFolderId: string = 'root'
    ): Promise<{ imported: number; skipped: number }> => {
      let importedCount = 0;
      let skippedCount = 0;

      const filesArr = Array.from(fileList);

      for (const file of filesArr) {
        try {
          const content = await file.text();
          let finalName = file.name;

          // Check collision
          const validation = validateNodeName(
            finalName,
            targetFolderId,
            activeProject.files,
            activeProject.folders,
            false
          );

          if (!validation.isValid) {
            finalName = generateUniqueFileName(
              finalName,
              targetFolderId,
              activeProject.files,
              activeProject.folders
            );
          }

          createFile(finalName, targetFolderId, content, false);
          importedCount++;
        } catch {
          skippedCount++;
        }
      }

      return { imported: importedCount, skipped: skippedCount };
    },
    [activeProject, createFile]
  );

  // Import ZIP archive
  const importZipArchive = useCallback(
    async (
      zipFile: File,
      targetFolderId: string = 'root'
    ): Promise<{ imported: number; errors: string[] }> => {
      const errors: string[] = [];
      let imported = 0;

      try {
        const { files: zipFiles, folders: zipDirs } = await extractZipArchive(zipFile);

        // Map relative folder paths to newly created folder IDs
        const folderPathMap = new Map<string, string>();
        folderPathMap.set('', targetFolderId);

        // Sort folders by depth so parents are created first
        const sortedDirs = [...zipDirs].sort((a, b) => a.split('/').length - b.split('/').length);

        for (const dirPath of sortedDirs) {
          const parts = dirPath.split('/');
          const dirName = parts[parts.length - 1];
          const parentDirPath = parts.slice(0, -1).join('/');
          const parentId = folderPathMap.get(parentDirPath) || targetFolderId;

          let finalDirName = dirName;
          const validation = validateNodeName(
            finalDirName,
            parentId,
            activeProject.files,
            activeProject.folders,
            true
          );

          if (!validation.isValid) {
            finalDirName = generateUniqueFolderName(finalDirName, parentId, activeProject.folders);
          }

          const res = createFolder(finalDirName, parentId);
          if (res.success && res.folderId) {
            folderPathMap.set(dirPath, res.folderId);
          }
        }

        // Add files
        for (const f of zipFiles) {
          const parts = f.path.split('/');
          const fName = parts[parts.length - 1];
          const fDir = parts.slice(0, -1).join('/');
          const parentId = folderPathMap.get(fDir) || targetFolderId;

          let finalFileName = fName;
          const val = validateNodeName(
            finalFileName,
            parentId,
            activeProject.files,
            activeProject.folders,
            false
          );

          if (!val.isValid) {
            finalFileName = generateUniqueFileName(
              finalFileName,
              parentId,
              activeProject.files,
              activeProject.folders
            );
          }

          const res = createFile(finalFileName, parentId, f.content, false);
          if (res.success) {
            imported++;
          } else {
            errors.push(`Failed to import ${f.name}: ${res.error}`);
          }
        }
      } catch (err: any) {
        errors.push(`ZIP extraction error: ${err.message || String(err)}`);
      }

      return { imported, errors };
    },
    [activeProject, createFolder, createFile]
  );

  // Switch project
  const switchProject = useCallback((projectId: string) => {
    setWorkspace((prev) => {
      const proj = prev.projects.find((p) => p.id === projectId);
      if (!proj) return prev;

      const firstFileId = Object.keys(proj.files)[0] || null;
      return {
        ...prev,
        activeProjectId: projectId,
        openDocuments: firstFileId ? [{ id: firstFileId, fileId: firstFileId }] : [],
        activeDocumentId: firstFileId,
      };
    });
  }, []);

  // Create new project
  const createProject = useCallback((name: string) => {
    const trimmed = name.trim() || 'New Project';
    const now = Date.now();
    const projectId = `proj-${now}-${Math.random().toString(36).substring(2, 6)}`;

    const newProject: Project = {
      id: projectId,
      name: trimmed,
      createdAt: now,
      modifiedAt: now,
      rootFolderId: 'root',
      files: {},
      folders: {},
    };

    setWorkspace((prev) => ({
      ...prev,
      activeProjectId: projectId,
      projects: [...prev.projects, newProject],
      openDocuments: [],
      activeDocumentId: null,
    }));
  }, []);

  // Delete project
  const deleteProject = useCallback((projectId: string) => {
    setWorkspace((prev) => {
      if (prev.projects.length <= 1) return prev; // Cannot delete last project
      const nextProjects = prev.projects.filter((p) => p.id !== projectId);
      const nextActive = nextProjects[0];
      const firstFileId = Object.keys(nextActive.files)[0] || null;

      return {
        ...prev,
        projects: nextProjects,
        activeProjectId: nextActive.id,
        openDocuments: firstFileId ? [{ id: firstFileId, fileId: firstFileId }] : [],
        activeDocumentId: firstFileId,
      };
    });
  }, []);

  // Reset to default workspace
  const resetToDefaultWorkspace = useCallback(() => {
    const fresh = createDefaultWorkspace();
    setWorkspace(fresh);
  }, []);

  // Load sample program into project
  const loadSampleIntoProject = useCallback(
    (sampleName: string, code: string) => {
      // Look for examples folder
      let examplesFolderId = Object.keys(activeProject.folders).find(
        (id) => activeProject.folders[id].name.toLowerCase() === 'examples'
      );

      if (!examplesFolderId) {
        const res = createFolder('examples', 'root');
        if (res.success && res.folderId) {
          examplesFolderId = res.folderId;
        } else {
          examplesFolderId = 'root';
        }
      }

      let sanitizedName = sampleName
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      if (!sanitizedName.endsWith('.dev')) {
        sanitizedName += '.dev';
      }

      // If exists, overwrite or unique
      const existingFile = (Object.values(activeProject.files) as FileNode[]).find(
        (f) => f.parentId === examplesFolderId && f.name.toLowerCase() === sanitizedName.toLowerCase()
      );

      if (existingFile) {
        updateFileContent(existingFile.id, code);
        saveFile(existingFile.id);
        openDocument(existingFile.id);
      } else {
        createFile(sanitizedName, examplesFolderId, code, true);
      }
    },
    [activeProject, createFolder, updateFileContent, saveFile, openDocument, createFile]
  );

  const closeConflictModal = useCallback(() => {
    setConflictModal({ isOpen: false, conflictInfo: null });
  }, []);

  const resolveConflictModal = useCallback(
    (choice: FileConflictChoice) => {
      if (conflictModal.onResolve) {
        conflictModal.onResolve(choice);
      }
      closeConflictModal();
    },
    [conflictModal, closeConflictModal]
  );

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        activeProject,
        activeFile,
        openDocuments: workspace.openDocuments,
        activeDocumentId: workspace.activeDocumentId,
        selectedNodeId,
        searchQuery,
        clipboard,
        deleteModal,
        unsavedModal,
        conflictModal,
        closeDeleteModal,
        confirmDeleteNode,
        closeUnsavedModal,
        resolveUnsavedModal,
        closeConflictModal,
        resolveConflictModal,
        setSelectedNodeId,
        setSearchQuery,
        createFile,
        createFolder,
        renameNode,
        requestDeleteNode,
        duplicateNode,
        moveNode,
        cutNode,
        copyNode,
        pasteClipboard,
        openDocument,
        closeDocument,
        closeOtherDocuments,
        closeAllDocuments,
        closeSavedDocuments,
        updateFileContent,
        saveFile,
        saveAllFiles,
        revertFile,
        toggleFolder,
        collapseAllFolders,
        expandAllFolders,
        exportProjectZip,
        exportSingleFile,
        exportWorkspaceJson,
        importWorkspaceJson,
        importFiles,
        importZipArchive,
        createProject,
        switchProject,
        deleteProject,
        resetToDefaultWorkspace,
        loadSampleIntoProject,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
