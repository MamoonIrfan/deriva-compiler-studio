import React from 'react';
import { Bot, Maximize2, Minimize2, X, Sparkles } from 'lucide-react';
import { GeminiChat } from '../chat/GeminiChat';
import { CompilerDiagnostic } from '../../types';

interface GeminiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics?: CompilerDiagnostic[];
  currentCode?: string;
  currentFileName?: string;
  onInsertCode?: (code: string) => void;
}

export const GeminiChatModal: React.FC<GeminiChatModalProps> = ({
  isOpen,
  onClose,
  diagnostics = [],
  currentCode = '',
  currentFileName = 'main.nova',
  onInsertCode,
}) => {
  const [isMaximized, setIsMaximized] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-app)',
        }}
        className={`flex flex-col rounded-xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isMaximized
            ? 'w-full h-full'
            : 'w-full max-w-4xl h-[85vh] max-h-[850px]'
        }`}
      >
        {/* Modal Header */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderBottomColor: 'var(--border-app)',
          }}
          className="px-4 py-2.5 border-b flex items-center justify-between shrink-0 select-none"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Gemini AI Compiler Copilot</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                    Multi-Turn
                  </span>
                </h2>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Interactive compiler engineering assistant with role personas & multi-model support
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title={isMaximized ? 'Restore size' : 'Maximize window'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <GeminiChat
            diagnostics={diagnostics}
            currentCode={currentCode}
            currentFileName={currentFileName}
            onInsertCode={onInsertCode}
          />
        </div>
      </div>
    </div>
  );
};
