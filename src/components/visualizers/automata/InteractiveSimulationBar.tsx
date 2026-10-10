import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Terminal,
} from 'lucide-react';
import { SimulationStringProgress } from './SimulationStringProgress';
import { SimulationStatus } from './useAutomataSimulation';

interface InteractiveSimulationBarProps {
  inputString: string;
  onInputChange: (newStr: string) => void;
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number;
  onPlayToggle: () => void;
  onReset: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  onSpeedChange: (speed: number) => void;
  onStepChange?: (stepIndex: number) => void;
  simulationStatus: SimulationStatus;
  stepTitle?: string;
  explanation?: string;
  reason?: string;
  machineType: 'NFA' | 'DFA' | 'MIN_DFA';
  onMachineTypeChange?: (machineType: 'NFA' | 'DFA' | 'MIN_DFA') => void;
  hasMinDFA?: boolean;
  presets?: string[];
}

export const InteractiveSimulationBar: React.FC<InteractiveSimulationBarProps> = ({
  inputString,
  onInputChange,
  currentStepIndex,
  totalSteps,
  isPlaying,
  speed,
  onPlayToggle,
  onReset,
  onPrev,
  onNext,
  onFinish,
  onSpeedChange,
  onStepChange,
  simulationStatus,
  stepTitle,
  explanation,
  reason,
  machineType,
  onMachineTypeChange,
  hasMinDFA = false,
  presets = ['a', 'ab', 'abb', 'abcb', '101'],
}) => {
  const progressPercent = totalSteps > 1 ? (currentStepIndex / (totalSteps - 1)) * 100 : 100;

  const handleCanonicalPlay = () => {
    if (isPlaying) {
      onPlayToggle();
    } else {
      if (currentStepIndex >= totalSteps - 1) {
        onReset();
        setTimeout(() => onPlayToggle(), 50);
      } else {
        onPlayToggle();
      }
    }
  };

  return (
    <div className="bg-[#111622] border border-slate-800/90 rounded-xl shadow-lg p-3 space-y-2.5 w-full">
      {/* Top Meta Bar: Target Machine Selection & Sample Strings */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Machine Mode */}
        {onMachineTypeChange && (
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 font-semibold">Machine:</span>
            <button
              onClick={() => onMachineTypeChange('DFA')}
              className={`px-2.5 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${
                machineType === 'DFA'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              DFA
            </button>
            {hasMinDFA && (
              <button
                onClick={() => onMachineTypeChange('MIN_DFA')}
                className={`px-2.5 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${
                  machineType === 'MIN_DFA'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Min DFA
              </button>
            )}
            <button
              onClick={() => onMachineTypeChange('NFA')}
              className={`px-2.5 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${
                machineType === 'NFA'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              NFA
            </button>
          </div>
        )}

        {/* Quick Samples */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-slate-500">Test Samples:</span>
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => onInputChange(preset)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition cursor-pointer ${
                inputString === preset
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* SINGLE AUTHORITATIVE SIMULATION CONTROLLER ROW */}
      <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2.5 shadow-inner">
        {/* String Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[140px] sm:min-w-[180px]">
          <span className="text-xs font-semibold text-slate-300 font-mono flex items-center gap-1.5 shrink-0">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>String:</span>
          </span>
          <input
            type="text"
            value={inputString}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCanonicalPlay();
            }}
            placeholder="e.g. abcb"
            className="bg-[#0b0e14] text-slate-100 font-mono text-xs px-3 py-1.5 rounded-md border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 outline-none w-full max-w-[220px] transition"
          />
        </div>

        {/* Consolidated Playback Controls (Play, Pause, Simulate, Steppers, Speed) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Step Counter */}
          <div className="flex items-center gap-1 font-mono text-xs text-slate-300 bg-[#0b0e14] px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md border border-slate-800 shrink-0 whitespace-nowrap">
            <span className="text-slate-400">Step</span>
            <span className="font-bold text-cyan-400">{totalSteps > 0 ? currentStepIndex + 1 : 0}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{totalSteps}</span>
          </div>

          {/* Stepper Navigation: Reset & Prev */}
          <div className="flex items-center bg-[#0b0e14] p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={onReset}
              disabled={currentStepIndex === 0}
              title="Reset to Start"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onPrev}
              disabled={currentStepIndex === 0}
              title="Previous Step"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SINGLE AUTHORITATIVE PLAY / PAUSE / SIMULATE BUTTON */}
          <button
            onClick={handleCanonicalPlay}
            title={
              isPlaying
                ? 'Pause Simulation'
                : currentStepIndex >= totalSteps - 1
                ? 'Replay Simulation'
                : currentStepIndex === 0
                ? 'Simulate String on Automaton'
                : 'Resume Simulation'
            }
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-white font-semibold text-xs shadow-md transition cursor-pointer shrink-0 whitespace-nowrap ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 ring-1 ring-amber-400/50'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 ring-1 ring-cyan-400/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : currentStepIndex >= totalSteps - 1 ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{currentStepIndex === 0 ? 'Simulate' : 'Resume'}</span>
              </>
            )}
          </button>

          {/* Stepper Navigation: Next & Finish */}
          <div className="flex items-center bg-[#0b0e14] p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={onNext}
              disabled={currentStepIndex >= totalSteps - 1}
              title="Next Step"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onFinish}
              disabled={currentStepIndex >= totalSteps - 1}
              title="Skip to End (Finish)"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-[#0b0e14] px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border border-slate-800 shrink-0">
            <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="bg-transparent text-slate-300 text-xs font-mono outline-none cursor-pointer"
            >
              <option value={1500} className="bg-slate-900">0.5×</option>
              <option value={900} className="bg-slate-900">1.0×</option>
              <option value={500} className="bg-slate-900">1.5×</option>
              <option value={250} className="bg-slate-900">2.0×</option>
            </select>
          </div>

          {/* Status Pill */}
          <span
            className={`text-[10.5px] font-mono px-2 py-1 rounded-md font-bold border shrink-0 whitespace-nowrap ${
              simulationStatus === 'ACCEPTED'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                : simulationStatus === 'REJECTED'
                ? 'bg-rose-950/90 text-rose-300 border-rose-700'
                : 'bg-cyan-950/90 text-cyan-300 border-cyan-700 animate-pulse'
            }`}
          >
            {simulationStatus}
          </span>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800/50">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            simulationStatus === 'ACCEPTED'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
              : simulationStatus === 'REJECTED'
              ? 'bg-gradient-to-r from-rose-500 to-amber-500'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 2. Visual String Character Stream Progress */}
      <SimulationStringProgress
        inputString={inputString}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        status={simulationStatus}
        reason={currentStepIndex >= totalSteps - 1 || simulationStatus === 'REJECTED' ? reason : undefined}
        machineType={machineType}
        onSelectStep={onStepChange}
      />

      {/* 3. Educational Step Explanation */}
      {(explanation || stepTitle) && (
        <div className="pt-2 border-t border-slate-800/80 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
            <div className="font-mono text-[11.5px] text-slate-200 leading-relaxed break-words min-w-0">
              {explanation || stepTitle}
            </div>
          </div>
          {stepTitle && (
            <span className="text-[11px] font-mono text-slate-400 shrink-0 hidden md:inline truncate max-w-[200px]">
              {stepTitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
