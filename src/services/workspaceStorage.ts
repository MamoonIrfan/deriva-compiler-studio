import JSZip from 'jszip';
import { FileNode, FolderNode, Project, Workspace } from '../types/workspace';
import { getLanguageFromFileName, generateUniqueFileName } from '../utils/fileValidation';
import { SAMPLE_PROGRAMS } from '../data/samplePrograms';

const STORAGE_KEY = 'deriva_workspace_v2';
const LEGACY_STORAGE_KEY = 'novacompiler_workspace_v2';

/**
 * Creates the initial default project with rich files and nested folders.
 */
export function createDefaultProject(): Project {
  const projectId = 'proj-derivastarter';
  const now = Date.now();

  const rootFolderId = 'root';

  const folders: Record<string, FolderNode> = {
    'folder-algorithms': {
      id: 'folder-algorithms',
      name: 'algorithms',
      path: '/algorithms',
      parentId: 'root',
      createdAt: now,
      modifiedAt: now,
      isExpanded: true,
    },
    'folder-examples': {
      id: 'folder-examples',
      name: 'examples',
      path: '/examples',
      parentId: 'root',
      createdAt: now,
      modifiedAt: now,
      isExpanded: true,
    },
  };

  const mainDevContent = `// ============================================
// DERIVA Compiler Studio - Main Source Program
// ============================================

// 1. Variable Declarations
var greeting: string = "Welcome to DERIVA Compiler Studio!";
print(greeting);

var base: int = 10;
var multiplier: int = 3;
var initialResult: int = base * multiplier + 5;

// 2. Function Definition
func computePower(baseVal: int, expVal: int): int {
  var result: int = 1;
  var count: int = 0;
  while (count < expVal) {
    result = result * baseVal;
    count = count + 1;
  }
  return result;
}

// 3. Execution & Loop
var exponent: int = 4;
var powerOutput: int = computePower(2, exponent);

print("2 raised to the power of 4:");
print(powerOutput);

if (powerOutput > 10) {
  print("Computation succeeded - output exceeds threshold!");
} else {
  print("Output is small.");
}
`;

  const mathUtilsContent = `// ============================================
// Math Utilities & Helper Functions
// ============================================

func factorial(n: int): int {
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

func absoluteDiff(a: int, b: int): int {
  if (a >= b) {
    return a - b;
  }
  return b - a;
}

var testVal: int = 5;
var factResult: int = factorial(testVal);
print("Factorial of 5 is: ");
print(factResult);
`;

  const readmeContent = `# DERIVA Compiler Studio - Project Workspace

DERIVA Compiler Studio is a full-featured browser-based compiler engineering IDE for **Deriva** (\`.dev\`).

## Workspace Structure
- \`main.dev\` - The primary execution entry point.
- \`math_utils.dev\` - Mathematical helpers and recursive functions.
- \`algorithms/\` - Classic algorithms including Sorting and Fibonacci.
- \`examples/\` - Focused tests for IR, Control Flow, and Optimizations.
- \`config.json\` - Project configuration and compile target settings.

## Features & Shortcuts
- **Create File**: Click the '+' icon in the Project Explorer or right-click any folder.
- **Save Document**: \`Ctrl+S\` or \`Cmd+S\` (indicates clean/dirty state with dot \`•\`).
- **Save All**: \`Ctrl+Alt+S\` or \`Cmd+Alt+S\`.
- **Toggle Explorer**: \`Ctrl+B\` or \`Cmd+B\`.
- **Export to ZIP**: Click the Export icon in Explorer to download a clean \`.zip\` project.
- **Import ZIP / Files**: Click Import or drop files into the Explorer to populate your project.
- **Multi-Document Tabs**: Open multiple files simultaneously, rearrange, close others, or close saved.

## Compiler Pipeline
When you edit any \`.dev\` file, the 9-stage compiler runs automatically:
1. Lexer & Scanner (Tokens & DFA)
2. Parser & AST (CST & Abstract Syntax Trees)
3. Semantic Analysis (Symbol Table & Scope Resolution)
4. Intermediate Representation (Three-Address Code & DAG)
5. Control Flow Graph (Basic Blocks, Dominators, Loops)
6. Data Flow Analysis (Reaching Definitions & Live Variables)
7. Optimizer Passes (Constant Folding, Dead Code, CSE)
8. Target Code Generation (MIPS & x86 Assembly)
9. Stack-Based Virtual Machine (Execution)
`;

  const configJsonContent = `{
  "projectName": "DerivaProject",
  "version": "1.0.0",
  "targetArchitecture": "mips32",
  "optimizationLevel": "O2",
  "registersK": 4,
  "entryFile": "main.dev"
}
`;

  const sortingContent = `// ============================================
// Bubble Sort & Array Bounds Simulation
// ============================================

var n: int = 6;
var i: int = 0;
var j: int = 0;
var passes: int = 0;

while (i < n) {
  j = 0;
  while (j < n - i - 1) {
    // Inner comparison pass
    passes = passes + 1;
    j = j + 1;
  }
  i = i + 1;
}

print("Total comparisons in bubble sort: ");
print(passes);
`;

  const fibonacciContent = SAMPLE_PROGRAMS[2]?.code || `func fib(n: int): int {
  if (n <= 1) {
    return n;
  }
  return fib(n - 1) + fib(n - 2);
}

var result: int = fib(6);
print("Fibonacci(6) = ");
print(result);
`;

  const loopsContent = SAMPLE_PROGRAMS[1]?.code || `var sum: int = 0;
var i: int = 0;
while (i < 10) {
  sum += i * 2;
  i += 1;
}
print(sum);
`;

  const files: Record<string, FileNode> = {
    'file-main': {
      id: 'file-main',
      name: 'main.dev',
      extension: '.dev',
      path: '/main.dev',
      parentId: 'root',
      content: mainDevContent,
      savedContent: mainDevContent,
      language: 'deriva',
      createdAt: now,
      modifiedAt: now,
      isDirty: false,
      origin: 'sample',
    },
    'file-math': {
      id: 'file-math',
      name: 'math_utils.dev',
      extension: '.dev',
      path: '/math_utils.dev',
      parentId: 'root',
      content: mathUtilsContent,
      savedContent: mathUtilsContent,
      language: 'deriva',
      createdAt: now,
      modifiedAt: now,
      isDirty: false,
      origin: 'sample',
    },
    'file-readme': {
      id: 'file-readme',
      name: 'README.md',
      extension: '.md',
      path: '/README.md',
      parentId: 'root',
      content: readmeContent,
      savedContent: readmeContent,
      language: 'markdown',
      createdAt: now,
      modifiedAt: now,
      isDirty: false,
      origin: 'sample',
    },
    'file-config': {
      id: 'file-config',
      name: 'config.json',
      extension: '.json',
      path: '/config.json',
      parentId: 'root',
      content: configJsonContent,
      savedContent: configJsonContent,
      language: 'json',
      createdAt: now,
      modifiedAt: now,
      isDirty: false,
      origin: 'sample',
    },
    'file-sorting': {
      id: 'file-sorting',
      name: 'sorting.dev',
      extension: '.dev',
      path: '/algorithms/sorting.dev',
      parentId: 'folder-algorithms',
      content: sortingContent,
      savedContent: sortingContent,
      language: 'deriva',
      createdAt: now,
      modifiedAt: now,
      isDirty: false,
      origin: 'sample',
    },
    'file-fib': {
      id: 'file-fib',
      name: 'fibonacci.dev',
      extension: '.dev',
      path: '/algorithms/fibonacci.dev',
      parentId: 'folder-algorithms',
      content: fibonacciContent,
      savedContent: fibonacciContent,
      language: 'deriva',
      createdAt: now,
      modifiedAt: now,
      isDirty: false,
      origin: 'sample',
    },
    'file-loops': {
      id: 'file-loops',
      name: 'loops.dev',
      extension: '.dev',
      path: '/examples/loops.dev',
      parentId: 'folder-examples',
      content: loopsContent,
      savedContent: loopsContent,
      language: 'deriva',
      createdAt: now,
      modifiedAt: now,
      isDirty: false,
      origin: 'sample',
    },
  };

  return {
    id: projectId,
    name: 'DerivaProject',
    description: 'Standard starter project with sample algorithms, helpers, and documentation.',
    createdAt: now,
    modifiedAt: now,
    rootFolderId,
    files,
    folders,
  };
}

/**
 * Creates the default workspace containing the default project.
 */
export function createDefaultWorkspace(): Workspace {
  const defaultProj = createDefaultProject();
  return {
    id: 'ws-default',
    name: 'Workspace',
    activeProjectId: defaultProj.id,
    projects: [defaultProj],
    openDocuments: [
      { id: 'file-main', fileId: 'file-main' },
      { id: 'file-readme', fileId: 'file-readme' },
    ],
    activeDocumentId: 'file-main',
    recentProjects: [{ id: defaultProj.id, name: defaultProj.name, lastOpened: Date.now() }],
  };
}

/**
 * Safe, idempotent migration for workspaces:
 * - Migrates .nova files to .dev
 * - Safely handles collisions if a sibling .dev already exists (generates unique candidate)
 * - Preserves file ID, content, dirty state, open tabs, active document, folder locations
 * - Migrates project name from NovaProject to DerivaProject
 * - Idempotent: Never re-migrates .dev files or produces .dev.dev
 */
export function migrateWorkspaceToDeriva(workspace: Workspace): Workspace {
  if (!workspace || !Array.isArray(workspace.projects)) {
    return workspace;
  }

  for (const project of workspace.projects) {
    if (project.name === 'NovaProject') {
      project.name = 'DerivaProject';
    }

    if (!project.files) continue;

    for (const [fileId, file] of Object.entries(project.files)) {
      if (!file) continue;

      // Migrate file language
      if ((file.language as any) === 'novalang') {
        file.language = 'deriva';
      }

      // Check if file is a legacy .nova file
      if (file.name && file.name.toLowerCase().endsWith('.nova')) {
        const baseName = file.name.substring(0, file.name.length - 5);
        const targetName = `${baseName}.dev`;

        // Check if another file already has targetName in the same parent folder
        const hasCollision = Object.values(project.files).some(
          (other) =>
            other.id !== file.id &&
            other.parentId === file.parentId &&
            other.name.toLowerCase() === targetName.toLowerCase()
        );

        let finalName = targetName;
        if (hasCollision) {
          finalName = generateUniqueFileName(
            targetName,
            file.parentId,
            project.files,
            project.folders
          );
        }

        file.name = finalName;
        file.extension = '.dev';
        file.language = 'deriva';
        file.path = resolveNodePath(file.parentId, finalName, project.folders);
      } else if (file.name && file.name.toLowerCase().endsWith('.dev')) {
        file.language = 'deriva';
        file.extension = '.dev';
      }
    }
  }

  return workspace;
}

/**
 * Loads workspace from localStorage or creates a fresh default workspace.
 */
export function loadWorkspaceFromStorage(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed: Workspace = JSON.parse(raw);
      if (parsed && parsed.projects && parsed.projects.length > 0) {
        // Run backward-compatibility migration
        migrateWorkspaceToDeriva(parsed);

        // Validate active project exists
        const activeProj = parsed.projects.find((p) => p.id === parsed.activeProjectId) || parsed.projects[0];
        parsed.activeProjectId = activeProj.id;

        // Ensure active document exists in active project
        if (parsed.activeDocumentId && !activeProj.files[parsed.activeDocumentId]) {
          const firstFileId = Object.keys(activeProj.files)[0] || null;
          parsed.activeDocumentId = firstFileId;
        }

        // Clean up openDocuments that no longer exist
        parsed.openDocuments = (parsed.openDocuments || []).filter((doc) => !!activeProj.files[doc.fileId]);
        if (parsed.openDocuments.length === 0 && parsed.activeDocumentId) {
          parsed.openDocuments.push({ id: parsed.activeDocumentId, fileId: parsed.activeDocumentId });
        }

        // Resave to new storage key
        saveWorkspaceToStorage(parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load workspace from localStorage, creating default:', err);
  }

  const fresh = createDefaultWorkspace();
  saveWorkspaceToStorage(fresh);
  return fresh;
}

/**
 * Saves workspace to localStorage.
 */
export function saveWorkspaceToStorage(workspace: Workspace): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    return true;
  } catch (err) {
    console.warn('Failed to save workspace to localStorage (quota or storage disabled):', err);
    return false;
  }
}

/**
 * Resolves full path of a folder or file recursively.
 */
export function resolveNodePath(
  parentId: string,
  nodeName: string,
  folders: Record<string, FolderNode>
): string {
  if (!parentId || parentId === 'root') {
    return `/${nodeName}`;
  }
  const parentFolder = folders[parentId];
  if (!parentFolder) {
    return `/${nodeName}`;
  }
  const parentPath = resolveNodePath(parentFolder.parentId, parentFolder.name, folders);
  return parentPath === '/' ? `/${nodeName}` : `${parentPath}/${nodeName}`;
}

/**
 * Exports project as a ZIP file download.
 */
export async function exportProjectToZip(project: Project): Promise<void> {
  const zip = new JSZip();

  // Helper to build recursive folder hierarchy in zip
  const getFolderPath = (folderId: string): string => {
    if (folderId === 'root') return '';
    const folder = project.folders[folderId];
    if (!folder) return '';
    const parentPath = getFolderPath(folder.parentId);
    return parentPath ? `${parentPath}/${folder.name}` : folder.name;
  };

  // Add empty folder structures
  Object.values(project.folders).forEach((folder) => {
    const fPath = getFolderPath(folder.id);
    if (fPath) {
      zip.folder(fPath);
    }
  });

  // Add all files
  Object.values(project.files).forEach((file) => {
    const fPath = getFolderPath(file.parentId);
    const fullPath = fPath ? `${fPath}/${file.name}` : file.name;
    zip.file(fullPath, file.content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name || 'DerivaProject'}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports a single file as a direct browser download.
 */
export function exportSingleFileToDisk(file: FileNode): void {
  const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads a ZIP archive and extracts files and folders into an imported format.
 */
export async function extractZipArchive(
  file: File
): Promise<{ files: { path: string; name: string; content: string }[]; folders: string[] }> {
  const zip = new JSZip();
  const loaded = await zip.loadAsync(file);

  const files: { path: string; name: string; content: string }[] = [];
  const folders: string[] = [];

  const promises: Promise<void>[] = [];

  loaded.forEach((relativePath, zipEntry) => {
    // Skip OS metadata
    if (relativePath.startsWith('__MACOSX/') || relativePath.includes('/.DS_Store') || relativePath.includes('Thumbs.db')) {
      return;
    }

    if (zipEntry.dir) {
      const cleanDir = relativePath.replace(/\/+$/, '');
      if (cleanDir) folders.push(cleanDir);
    } else {
      const parts = relativePath.split('/');
      const fileName = parts[parts.length - 1];
      if (fileName) {
        const p = zipEntry.async('string').then((content) => {
          files.push({
            path: relativePath,
            name: fileName,
            content,
          });
        });
        promises.push(p);
      }
    }
  });

  await Promise.all(promises);
  return { files, folders };
}
