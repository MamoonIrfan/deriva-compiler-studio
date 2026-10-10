import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripHorizontal, GripVertical } from 'lucide-react';

interface SplitterProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  onReset?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  className?: string;
  tooltip?: string;
  min?: number;
  max?: number;
  currentValue?: number;
  id?: string;
}

export const Splitter: React.FC<SplitterProps> = ({
  direction,
  onResize,
  onReset,
  onDragStart,
  onDragEnd,
  className = '',
  tooltip = 'Drag to resize • Double-click to reset',
  min,
  max,
  currentValue,
  id,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const lastPosRef = useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button (left click) or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    lastPosRef.current = direction === 'vertical' ? e.clientX : e.clientY;
    if (onDragStart) onDragStart();

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const currentPos = direction === 'vertical' ? e.clientX : e.clientY;
      const delta = currentPos - lastPosRef.current;
      if (delta !== 0) {
        onResize(delta);
        lastPosRef.current = currentPos;
      }
    },
    [isDragging, direction, onResize]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.userSelect = '';
        if (onDragEnd) onDragEnd();
      }
    },
    [isDragging, onDragEnd]
  );

  // Attach global pointer listeners to window so dragging NEVER drops
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove, { passive: false });
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);

      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onReset) onReset();
  };

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 5;
    if (direction === 'vertical') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onResize(-step);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onResize(step);
      } else if (e.key === 'Home' && onReset) {
        e.preventDefault();
        onReset();
      }
    } else {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onResize(-step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onResize(step);
      } else if (e.key === 'Home' && onReset) {
        e.preventDefault();
        onReset();
      }
    }
  };

  if (direction === 'vertical') {
    // Vertical divider (drag left-right)
    return (
      <>
        {isDragging && (
          <div
            className="fixed inset-0 z-50 cursor-col-resize select-none"
            style={{ touchAction: 'none' }}
          />
        )}
        <div
          id={id}
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Horizontal area resizer"
          aria-valuenow={currentValue}
          aria-valuemin={min}
          aria-valuemax={max}
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          title={tooltip}
          style={{ touchAction: 'none' }}
          className={`group relative flex items-center justify-center w-2.5 sm:w-2 -mx-0.5 cursor-col-resize select-none shrink-0 z-20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 transition-colors before:content-[''] before:absolute before:inset-y-0 before:-left-2.5 before:-right-2.5 before:z-10 ${
            isDragging ? 'bg-indigo-500/50' : 'hover:bg-indigo-500/30'
          } ${className}`}
        >
          <div
            className={`w-[2px] h-full transition-colors ${
              isDragging ? 'bg-indigo-500' : 'bg-slate-700/60 group-hover:bg-indigo-400'
            }`}
          />
          {/* Grip indicator */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-6 rounded flex items-center justify-center transition-opacity shadow-sm pointer-events-none z-20 ${
              isDragging
                ? 'opacity-100 bg-indigo-600 text-white'
                : 'opacity-0 group-hover:opacity-100 bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            <GripVertical className="w-2.5 h-2.5" />
          </div>
        </div>
      </>
    );
  }

  // Horizontal divider (drag up-down)
  return (
    <>
      {isDragging && (
        <div
          className="fixed inset-0 z-50 cursor-row-resize select-none"
          style={{ touchAction: 'none' }}
        />
      )}
      <div
        id={id}
        role="separator"
        tabIndex={0}
        aria-orientation="horizontal"
        aria-label="Vertical area resizer"
        aria-valuenow={currentValue}
        aria-valuemin={min}
        aria-valuemax={max}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        title={tooltip}
        style={{ touchAction: 'none' }}
        className={`group relative flex items-center justify-center h-2.5 sm:h-2 -my-0.5 cursor-row-resize select-none shrink-0 z-20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 transition-colors before:content-[''] before:absolute before:inset-x-0 before:-top-2.5 before:-bottom-2.5 before:z-10 ${
          isDragging ? 'bg-indigo-500/50' : 'hover:bg-indigo-500/30'
        } ${className}`}
      >
        <div
          className={`h-[2px] w-full transition-colors ${
            isDragging ? 'bg-indigo-500' : 'bg-slate-700/60 group-hover:bg-indigo-400'
          }`}
        />
        {/* Grip indicator */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 h-3.5 w-6 rounded flex items-center justify-center transition-opacity shadow-sm pointer-events-none z-20 ${
            isDragging
              ? 'opacity-100 bg-indigo-600 text-white'
              : 'opacity-0 group-hover:opacity-100 bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          <GripHorizontal className="w-2.5 h-2.5" />
        </div>
      </div>
    </>
  );
};
