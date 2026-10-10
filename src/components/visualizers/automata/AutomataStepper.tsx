import React, { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, Gauge } from 'lucide-react';

interface AutomataStepperProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number; // in ms per step e.g. 1000
  onStepChange: (step: number) => void;
  onPlayToggle: () => void;
  onSpeedChange: (speed: number) => void;
  explanation?: string;
  stepTitle?: string;
  badge?: string;
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'purple' | 'cyan';
}

export const AutomataStepper: React.FC<AutomataStepperProps> = ({
  currentStep,
  totalSteps,
  isPlaying,
  speed,
  onStepChange,
  onPlayToggle,
  onSpeedChange,
  explanation,
  stepTitle,
  badge,
  badgeColor = 'cyan',
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        if (currentStep < totalSteps - 1) {
          onStepChange(currentStep + 1);
        } else {
          onPlayToggle(); // Pause at end
        }
      }, speed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentStep, totalSteps, speed, onStepChange, onPlayToggle]);

  const handlePrev = () => {
    if (currentStep > 0) onStepChange(currentStep - 1);
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) onStepChange(currentStep + 1);
  };

  const handleReset = () => {
    if (isPlaying) onPlayToggle();
    onStepChange(0);
  };

  const handleFinish = () => {
    if (isPlaying) onPlayToggle();
    onStepChange(Math.max(0, totalSteps - 1));
  };

  const badgeColorClasses = {
    blue: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
    emerald: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
    amber: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
    purple: 'bg-purple-900/60 text-purple-300 border-purple-700/50',
    cyan: 'bg-cyan-900/60 text-cyan-300 border-cyan-700/50',
  }[badgeColor];

  const progressPercent = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 100;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-700/70 rounded-xl p-3.5 shadow-lg backdrop-blur-md">
      {/* Progress Track */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Step Indicator & Title */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700 shrink-0 whitespace-nowrap">
            <span className="text-slate-400">Step</span>
            <span className="font-bold text-cyan-400">{totalSteps > 0 ? currentStep + 1 : 0}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{totalSteps}</span>
          </div>

          {badge && (
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border shrink-0 whitespace-nowrap ${badgeColorClasses}`}>
              {badge}
            </span>
          )}

          {stepTitle && <span className="text-xs font-semibold text-slate-200 truncate min-w-0 max-w-[260px]">{stepTitle}</span>}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            onClick={handleReset}
            disabled={currentStep === 0}
            title="Reset to Beginning (Step 1)"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            title="Previous Step"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayToggle}
            title={isPlaying ? 'Pause' : 'Play Animation'}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={currentStep >= totalSteps - 1}
            title="Next Step"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleFinish}
            disabled={currentStep >= totalSteps - 1}
            title="Skip to End"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-700/80 shrink-0">
            <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="bg-slate-800 text-slate-300 text-xs rounded px-1.5 py-1 border border-slate-700 outline-none cursor-pointer"
            >
              <option value={1500}>0.5×</option>
              <option value={900}>1.0×</option>
              <option value={500}>1.5×</option>
              <option value={250}>2.0×</option>
            </select>
          </div>
        </div>
      </div>

      {/* Educational Explanation Box */}
      {explanation && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-300 leading-relaxed font-sans">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
          <div className="flex-1 min-w-0 font-mono text-[11.5px] text-slate-200 break-words">{explanation}</div>
        </div>
      )}
    </div>
  );
};
