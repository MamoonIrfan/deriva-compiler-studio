import React, { useState } from 'react';
import { CompilationSession } from '../../types';
import { Box, Check, Copy, Cpu, Layers, Share2 } from 'lucide-react';

interface CodeGenVisualizerProps {
  session?: CompilationSession;
  targetCode?: CompilationSession['targetCode'];
  registerAllocation?: CompilationSession['registerAllocations']['graphColoring'];
  registerAllocations?: CompilationSession['registerAllocations'];
}

export const CodeGenVisualizer: React.FC<CodeGenVisualizerProps> = ({
  session,
  targetCode: propTargetCode,
  registerAllocation: propRegisterAllocation,
  registerAllocations: propRegisterAllocations,
}) => {
  const [activeArch, setActiveArch] = useState<'mips' | 'x86_64' | 'wasm' | 'bytecode' | 'regalloc'>('mips');
  const [copied, setCopied] = useState(false);

  // Safely resolve targetCode from props or session
  const targetCode = propTargetCode || session?.targetCode || {
    mips: '',
    x86_64: '',
    wasm: '',
    bytecode: [],
  };

  // Safely resolve register allocation result from various possible props or session paths
  const regAlloc =
    propRegisterAllocation ||
    propRegisterAllocations?.graphColoring ||
    session?.registerAllocations?.graphColoring || {
      assignment: {},
      spilledVariables: [],
      liveRanges: new Map(),
      interferenceGraph: { nodes: [], edges: [] },
    };

  const liveRangesList = React.useMemo(() => {
    if (!regAlloc.liveRanges) return [];
    if (regAlloc.liveRanges instanceof Map || typeof (regAlloc.liveRanges as any).values === 'function') {
      return Array.from((regAlloc.liveRanges as any).values());
    }
    if (Array.isArray(regAlloc.liveRanges)) {
      return regAlloc.liveRanges;
    }
    if (typeof regAlloc.liveRanges === 'object') {
      return Object.values(regAlloc.liveRanges);
    }
    return [];
  }, [regAlloc.liveRanges]);

  const spilledVarsList = Array.isArray(regAlloc.spilledVariables) ? regAlloc.spilledVariables : [];
  const assignmentEntries = regAlloc.assignment ? Object.entries(regAlloc.assignment) : [];

  const getCode = () => {
    switch (activeArch) {
      case 'mips':
        return targetCode.mips || '';
      case 'x86_64':
        return targetCode.x86_64 || '';
      case 'wasm':
        return targetCode.wasm || '';
      case 'bytecode':
        return (targetCode.bytecode || [])
          .map((b, i) => `${i.toString().padStart(3, '0')}: ${b.op} ${b.operand !== undefined ? b.operand : ''}`)
          .join('\n');
      default:
        return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] text-slate-200 rounded-lg overflow-hidden border border-slate-800">
      {/* Sub-tabs header */}
      <div className="min-h-9 py-1 flex items-center justify-between px-2.5 sm:px-3 bg-[#1a1f2b] border-b border-slate-800 text-xs gap-2 select-none shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 py-0.5">
          {[
            { id: 'mips', label: 'MIPS-32' },
            { id: 'x86_64', label: 'x86-64' },
            { id: 'wasm', label: 'WASM' },
            { id: 'bytecode', label: 'Bytecode' },
            { id: 'regalloc', label: 'Register Alloc' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveArch(tab.id as any)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeArch === tab.id
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeArch !== 'regalloc' && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#0b0e14] hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-700 transition cursor-pointer shrink-0 whitespace-nowrap"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        )}
      </div>

      {/* Assembly / Code View */}
      {activeArch !== 'regalloc' ? (
        <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-[#0b0e14]">
          <pre className="bg-[#131720] p-3 rounded border border-slate-800 text-emerald-300 whitespace-pre overflow-auto leading-5 select-text">
            {getCode()}
          </pre>
        </div>
      ) : (
        /* Register Allocation Inspector */
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="text-indigo-400 font-bold">
                Chaitin-Briggs Graph Coloring Allocator
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                Spills: {spilledVarsList.length}
              </span>
            </div>
            <div className="text-slate-400 text-[11px]">
              {liveRangesList.length} variable live ranges
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Color Assignment Cards */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
                Register Assignments (K Colors)
              </h4>
              <div className="space-y-2">
                {assignmentEntries.map(([variable, reg]) => (
                  <div
                    key={variable}
                    className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800"
                  >
                    <span className="text-slate-200 font-bold">{variable}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {reg}
                    </span>
                  </div>
                ))}
                {spilledVarsList.map((spill) => (
                  <div
                    key={spill}
                    className="flex items-center justify-between p-2 bg-rose-950/40 rounded border border-rose-800/60"
                  >
                    <span className="text-slate-200 font-bold">{spill}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      SPILLED TO MEMORY
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Ranges Timeline */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3">
                Live Range Intervals [Start, End]
              </h4>
              <div className="space-y-2 overflow-auto">
                {liveRangesList.map((lr) => (
                  <div key={lr.variable} className="p-2 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                    <span className="text-indigo-300 font-bold">{lr.variable}</span>
                    <span className="text-slate-400 text-[11px]">
                      Lines [{lr.start} → {lr.end}] (Span: {lr.end - lr.start + 1})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
