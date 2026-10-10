import React, { useEffect, useRef, useState } from 'react';
import { BytecodeInstruction, CompilationSession } from '../../types';
import { VirtualMachine } from '../../compiler/vm/virtualMachine';
import { ChevronRight, Pause, Play, RotateCcw, StepForward, Terminal } from 'lucide-react';

interface VMVisualizerProps {
  session: CompilationSession;
}

export const VMVisualizer: React.FC<VMVisualizerProps> = ({ session }) => {
  const safeBytecode = Array.isArray(session?.targetCode?.bytecode) ? session.targetCode.bytecode : [];
  const [vm] = useState(() => new VirtualMachine(safeBytecode));
  const [vmState, setVmState] = useState(() => vm.getState());
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(300);
  const playTimerRef = useRef<any>(null);

  // Reload instructions when session updates
  useEffect(() => {
    vm.load(safeBytecode);
    setVmState(vm.getState());
    setIsPlaying(false);
  }, [safeBytecode]);

  const handleStep = () => {
    const nextState = vm.step();
    setVmState({ ...nextState });
    if (nextState.halted) {
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    vm.reset();
    setVmState(vm.getState());
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    } else {
      if (vmState.halted) {
        vm.reset();
        setVmState(vm.getState());
      }
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        const nextState = vm.step();
        setVmState({ ...nextState });
        if (nextState.halted) {
          setIsPlaying(false);
          clearInterval(playTimerRef.current);
        }
      }, speedMs);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, speedMs]);

  const instructions = safeBytecode;
  const safeStack = Array.isArray(vmState?.stack) ? vmState.stack : [];
  const safeCallStack = Array.isArray(vmState?.callStack) ? vmState.callStack : [];
  const safeMemory = vmState?.memory && typeof vmState.memory === 'object' ? vmState.memory : {};
  const safeOutput = Array.isArray(vmState?.output) ? vmState.output : [];

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] text-slate-200 rounded-lg overflow-hidden border border-slate-800">
      {/* VM Controls Toolbar */}
      <div className="min-h-9 py-1 flex items-center justify-between px-2.5 sm:px-3 bg-[#1a1f2b] border-b border-slate-800 text-xs flex-wrap gap-2 select-none shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            onClick={handleTogglePlay}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold text-white transition cursor-pointer text-[11px] shrink-0 whitespace-nowrap ${
              isPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play VM'}</span>
          </button>

          <button
            onClick={handleStep}
            disabled={isPlaying || vmState.halted}
            className="flex items-center gap-1 px-2.5 py-1 rounded font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition cursor-pointer text-[11px] shrink-0 whitespace-nowrap"
          >
            <StepForward className="w-3 h-3" />
            <span>Step</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 rounded font-semibold bg-[#0b0e14] border border-slate-700 hover:bg-slate-800 text-slate-300 transition cursor-pointer text-[11px] shrink-0 whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-slate-400 font-mono text-[10px] flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span>Speed:</span>
            <input
              type="range"
              min="50"
              max="1000"
              step="50"
              value={speedMs}
              onChange={(e) => setSpeedMs(parseInt(e.target.value, 10))}
              className="w-14 sm:w-16 accent-indigo-500"
            />
            <span className="shrink-0">{speedMs}ms</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span>IP: <strong className="text-indigo-400">{vmState.ip}</strong></span>
            <span className="hidden sm:inline">Steps: <strong className="text-emerald-400">{vmState.stepCount}</strong></span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                vmState.halted ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60' : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
              }`}
            >
              {vmState.halted ? 'HALTED' : 'RUNNING'}
            </span>
          </div>
        </div>
      </div>

      {/* VM Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 overflow-auto font-mono text-xs bg-[#0b0e14]">
        {/* Left Column: Bytecode Stream with Current IP */}
        <div className="bg-[#131720] p-3 rounded border border-slate-800 flex flex-col overflow-hidden">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-2">
            Bytecode Instructions Stream
          </h4>
          <div className="flex-1 overflow-auto space-y-1 pr-1">
            {instructions.map((inst, idx) => {
              const isCurrent = vmState.ip === idx;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-1 rounded transition text-[11px] ${
                    isCurrent
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                      : 'hover:bg-slate-900/60 text-slate-400'
                  }`}
                >
                  <span className="w-5 text-right select-none opacity-60">{idx}</span>
                  <span className="w-20 font-bold">{inst.op}</span>
                  <span className="flex-1 text-emerald-300">
                    {inst.operand !== undefined ? String(inst.operand) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle Column: Operand Stack & Call Frames */}
        <div className="flex flex-col gap-3">
          {/* Operand Stack */}
          <div className="bg-[#131720] p-3 rounded border border-slate-800 flex-1 flex flex-col overflow-hidden">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">
              Operand Stack (LIFO)
            </h4>
            <div className="flex-1 overflow-auto flex flex-col-reverse gap-1 p-2 bg-[#0b0e14] rounded border border-slate-800">
              {safeStack.length > 0 ? (
                safeStack.map((val, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 bg-[#131720] rounded border border-indigo-900/60 text-center font-bold text-indigo-300 shadow-sm text-xs"
                  >
                    {String(val)}
                  </div>
                ))
              ) : (
                <div className="text-slate-600 italic text-center py-4">Stack is Empty</div>
              )}
            </div>
          </div>

          {/* Call Stack */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 h-36 flex flex-col overflow-hidden">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
              Call Stack Frames
            </h4>
            <div className="flex-1 overflow-auto space-y-1">
              {safeCallStack.map((frame, idx) => (
                <div key={idx} className="p-1.5 bg-slate-900 rounded border border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-indigo-300 font-bold">{frame.functionName}()</span>
                  <span className="text-slate-500">Return IP: {frame.returnIp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Memory Map & Stdout Console */}
        <div className="flex flex-col gap-4">
          {/* Environment Memory Map */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex-1 flex flex-col overflow-hidden">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
              Runtime Memory Environment
            </h4>
            <div className="flex-1 overflow-auto space-y-1">
              {Object.keys(safeMemory).length > 0 ? (
                Object.entries(safeMemory).map(([k, v]) => (
                  <div key={k} className="p-2 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 font-bold">{k}</span>
                    <span className="text-emerald-400 font-bold">{String(v)}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 italic p-4 text-center">No variables in memory</div>
              )}
            </div>
          </div>

          {/* VM Stdout Console */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 h-40 flex flex-col overflow-hidden">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> VM Output Console (stdout)
            </h4>
            <div className="flex-1 overflow-auto bg-black/40 p-2 rounded font-mono text-emerald-400 text-xs whitespace-pre-wrap select-text">
              {safeOutput.length > 0 ? safeOutput.join('\n') : <span className="text-slate-600 italic">No output yet.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
