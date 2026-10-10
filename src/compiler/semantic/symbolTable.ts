import { DataType, ScopeInfo, SourceLocation, SymbolEntry, SymbolKind } from '../../types';

export class SymbolTableManager {
  private scopes: ScopeInfo[] = [];
  private currentScopeId: number = 0;
  private scopeCounter: number = 0;
  private symbolCounter: number = 0;

  constructor() {
    this.reset();
  }

  public reset() {
    this.scopes = [];
    this.currentScopeId = 0;
    this.scopeCounter = 0;
    this.symbolCounter = 0;

    // Create Root Global Scope (Scope 0)
    const globalScope: ScopeInfo = {
      id: this.scopeCounter++,
      parentId: null,
      name: 'global',
      level: 0,
      symbols: new Map(),
    };
    this.scopes.push(globalScope);
  }

  public enterScope(name: string): ScopeInfo {
    const newScope: ScopeInfo = {
      id: this.scopeCounter++,
      parentId: this.currentScopeId,
      name,
      level: this.getCurrentScope().level + 1,
      symbols: new Map(),
    };
    this.scopes.push(newScope);
    this.currentScopeId = newScope.id;
    return newScope;
  }

  public exitScope(): ScopeInfo | null {
    const curr = this.getCurrentScope();
    if (curr.parentId !== null) {
      this.currentScopeId = curr.parentId;
      return this.getCurrentScope();
    }
    return null;
  }

  public getCurrentScope(): ScopeInfo {
    return this.scopes.find((s) => s.id === this.currentScopeId) || this.scopes[0];
  }

  public getScopes(): ScopeInfo[] {
    return this.scopes;
  }

  public getAllSymbols(): SymbolEntry[] {
    const list: SymbolEntry[] = [];
    for (const s of this.scopes) {
      for (const sym of s.symbols.values()) {
        list.push(sym);
      }
    }
    return list;
  }

  public declareSymbol(
    name: string,
    kind: SymbolKind,
    dataType: DataType,
    location: SourceLocation,
    options?: {
      initialized?: boolean;
      value?: any;
      params?: { name: string; type: DataType }[];
      returnType?: DataType;
    }
  ): { symbol: SymbolEntry | null; error?: string; warning?: string } {
    const currentScope = this.getCurrentScope();

    // Check duplicate in same scope
    if (currentScope.symbols.has(name)) {
      return {
        symbol: null,
        error: `Duplicate identifier '${name}' in current scope '${currentScope.name}'`,
      };
    }

    let warning: string | undefined;
    // Check if shadowing an outer scope identifier
    const outer = this.lookupSymbol(name);
    if (outer && outer.scopeId !== currentScope.id) {
      warning = `Identifier '${name}' shadows an outer declaration in scope '${outer.scopeName}'`;
    }

    const entry: SymbolEntry = {
      id: `sym_${this.symbolCounter++}_${name}`,
      name,
      kind,
      dataType,
      scopeId: currentScope.id,
      scopeName: currentScope.name,
      declaredLine: location.line,
      declaredColumn: location.column,
      initialized: options?.initialized ?? false,
      value: options?.value,
      references: [],
      params: options?.params,
      returnType: options?.returnType,
    };

    currentScope.symbols.set(name, entry);
    return { symbol: entry, warning };
  }

  public lookupSymbol(name: string): SymbolEntry | null {
    let scopeId: number | null = this.currentScopeId;

    while (scopeId !== null) {
      const scope = this.scopes.find((s) => s.id === scopeId);
      if (!scope) break;

      if (scope.symbols.has(name)) {
        return scope.symbols.get(name)!;
      }
      scopeId = scope.parentId;
    }

    return null;
  }

  public recordReference(name: string, location: SourceLocation): boolean {
    const sym = this.lookupSymbol(name);
    if (sym) {
      sym.references.push(location);
      return true;
    }
    return false;
  }

  public getUnusedVariables(): SymbolEntry[] {
    const unused: SymbolEntry[] = [];
    for (const scope of this.scopes) {
      for (const sym of scope.symbols.values()) {
        if (sym.kind === 'variable' && sym.references.length === 0 && !sym.name.startsWith('_')) {
          unused.push(sym);
        }
      }
    }
    return unused;
  }
}
