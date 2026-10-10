import { FileNode, FolderNode, ValidationResult } from '../types/workspace';

// Reserved Windows & POSIX filesystem filenames
const RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

// Characters forbidden in filenames across common OS/ZIP
const INVALID_CHARS_REGEX = /[\\/:*?"<>|\x00-\x1F]/;

/**
 * Validates a proposed file or folder name.
 */
export function validateNodeName(
  rawName: string,
  parentId: string,
  existingFiles: Record<string, FileNode>,
  existingFolders: Record<string, FolderNode>,
  isFolder: boolean = false,
  excludeNodeId?: string
): ValidationResult {
  if (!rawName || typeof rawName !== 'string') {
    return { isValid: false, error: 'Name cannot be empty.' };
  }

  const trimmed = rawName.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Name cannot be blank or contain only whitespace.' };
  }

  if (trimmed.length > 255) {
    return { isValid: false, error: 'Name exceeds maximum length of 255 characters.' };
  }

  // Trailing dot check (can cause issues on Windows/ZIP)
  if (trimmed.endsWith('.') && !trimmed.startsWith('.')) {
    return { isValid: false, error: 'Name cannot end with a trailing dot.' };
  }

  // Path traversal check
  if (trimmed === '.' || trimmed === '..' || trimmed.startsWith('../') || trimmed.startsWith('..\\')) {
    return { isValid: false, error: 'Name cannot be a relative traversal indicator ("." or "..").' };
  }

  // Invalid characters check
  if (INVALID_CHARS_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Name contains invalid characters. Avoid: \\ / : * ? " < > | and control characters.',
    };
  }

  // Reserved names check (base name before extension)
  const baseNameWithoutExt = trimmed.split('.')[0].toLowerCase();
  if (RESERVED_NAMES.has(baseNameWithoutExt)) {
    return {
      isValid: false,
      error: `"${trimmed}" is a reserved system name and cannot be used.`,
    };
  }

  // Sibling collision check
  const lowerTrimmed = trimmed.toLowerCase();

  // Check against sibling files
  for (const file of Object.values(existingFiles)) {
    if (file.id === excludeNodeId) continue;
    if (file.parentId === parentId && file.name.toLowerCase() === lowerTrimmed) {
      return {
        isValid: false,
        error: `A file named "${file.name}" already exists in this folder.`,
      };
    }
  }

  // Check against sibling folders
  for (const folder of Object.values(existingFolders)) {
    if (folder.id === excludeNodeId) continue;
    if (folder.parentId === parentId && folder.name.toLowerCase() === lowerTrimmed) {
      return {
        isValid: false,
        error: `A folder named "${folder.name}" already exists in this folder.`,
      };
    }
  }

  return { isValid: true, sanitizedName: trimmed };
}

/**
 * Smart file extension helper:
 * If user creates a file and isDerivaDefault is true, append .dev if user didn't specify an extension.
 */
export function resolveFileName(name: string, isDerivaDefault: boolean = false): string {
  let trimmed = name.trim();
  if (isDerivaDefault && !trimmed.includes('.')) {
    trimmed = `${trimmed}.dev`;
  }
  return trimmed;
}

/**
 * Determines file language from filename extension.
 */
export function getLanguageFromFileName(fileName: string): FileLanguage {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.dev') || lower.endsWith('.nova')) return 'deriva';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.txt') || lower.endsWith('.log')) return 'text';
  return 'unknown';
}

/**
 * Generates a safe unique name for duplicate or imported files: e.g. "main (1).dev", "main (2).dev".
 */
export function generateUniqueFileName(
  desiredName: string,
  parentId: string,
  existingFiles: Record<string, FileNode>,
  existingFolders: Record<string, FolderNode>
): string {
  const dotIndex = desiredName.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? desiredName.substring(0, dotIndex) : desiredName;
  const ext = dotIndex !== -1 ? desiredName.substring(dotIndex) : '';

  let candidate = desiredName;
  let counter = 1;

  const isCollision = (name: string) => {
    const lower = name.toLowerCase();
    const fileConflict = Object.values(existingFiles).some(
      (f) => f.parentId === parentId && f.name.toLowerCase() === lower
    );
    const folderConflict = Object.values(existingFolders).some(
      (f) => f.parentId === parentId && f.name.toLowerCase() === lower
    );
    return fileConflict || folderConflict;
  };

  while (isCollision(candidate)) {
    candidate = `${baseName} (${counter})${ext}`;
    counter++;
  }

  return candidate;
}

/**
 * Generates a safe unique folder name: e.g. "algorithms (1)".
 */
export function generateUniqueFolderName(
  desiredName: string,
  parentId: string,
  existingFolders: Record<string, FolderNode>
): string {
  let candidate = desiredName;
  let counter = 1;

  const isCollision = (name: string) => {
    const lower = name.toLowerCase();
    return Object.values(existingFolders).some(
      (f) => f.parentId === parentId && f.name.toLowerCase() === lower
    );
  };

  while (isCollision(candidate)) {
    candidate = `${desiredName} (${counter})`;
    counter++;
  }

  return candidate;
}

/**
 * Checks whether moving a folder into targetFolderId would cause an illegal cycle
 * (e.g. moving a folder into itself or into one of its descendants).
 */
export function isMoveIllegal(
  nodeId: string,
  isFolder: boolean,
  targetFolderId: string,
  folders: Record<string, FolderNode>
): boolean {
  if (!isFolder) return false;
  if (nodeId === targetFolderId) return true;

  // Walk up from targetFolderId to see if we ever reach nodeId
  let currentId: string | undefined = targetFolderId;
  const visited = new Set<string>();

  while (currentId && currentId !== 'root' && !visited.has(currentId)) {
    visited.add(currentId);
    if (currentId === nodeId) {
      return true; // Target is a descendant of nodeId!
    }
    const parentFolder = folders[currentId];
    currentId = parentFolder ? parentFolder.parentId : undefined;
  }

  return false;
}
