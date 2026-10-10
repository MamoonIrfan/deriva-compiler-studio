export type FileOrigin = 'user' | 'sample' | 'imported';

export type FileLanguage = 'deriva' | 'novalang' | 'markdown' | 'json' | 'text' | 'unknown';

export interface FileNode {
  id: string;
  name: string;
  extension: string;
  path: string;
  parentId: string;
  content: string;
  savedContent: string;
  language: FileLanguage;
  createdAt: number;
  modifiedAt: number;
  isDirty: boolean;
  isReadOnly?: boolean;
  origin: FileOrigin;
}

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  parentId: string;
  createdAt: number;
  modifiedAt: number;
  isExpanded?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  modifiedAt: number;
  rootFolderId: string;
  files: Record<string, FileNode>;
  folders: Record<string, FolderNode>;
}

export interface OpenDocument {
  id: string; // matches fileId
  fileId: string;
  scrollLine?: number;
}

export interface Workspace {
  id: string;
  name: string;
  activeProjectId: string;
  projects: Project[];
  openDocuments: OpenDocument[];
  activeDocumentId: string | null; // fileId
  recentProjects?: { id: string; name: string; lastOpened: number }[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedName?: string;
}

export type FileConflictChoice = 'replace' | 'keep_both' | 'skip' | 'cancel';

export interface FileConflictInfo {
  existingFile: FileNode;
  newContent: string;
  newFileName: string;
  targetFolderId: string;
}
