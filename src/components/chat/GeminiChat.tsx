import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Download,
  Trash2,
  Code2,
  FileCode,
  AlertTriangle,
  Zap,
  Cpu,
  ChevronDown,
  FilePlus,
  ArrowDown,
  Info,
  Layers,
  Terminal,
} from 'lucide-react';
import { ChatMessage, CHAT_MODELS, CHAT_ROLES, ChatRole, ModelOption } from '../../types/chat';
import { GeminiChatService } from '../../services/geminiChatService';
import { CompilerDiagnostic } from '../../types';
import { useWorkspace } from '../../context/WorkspaceContext';

interface GeminiChatProps {
  diagnostics?: CompilerDiagnostic[];
  currentCode?: string;
  currentFileName?: string;
  onInsertCode?: (code: string) => void;
  className?: string;
}

export const GeminiChat: React.FC<GeminiChatProps> = ({
  diagnostics = [],
  currentCode = '',
  currentFileName = 'main.nova',
  onInsertCode,
  className = '',
}) => {
  const { createFile, openDocument } = useWorkspace();

  // State
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = GeminiChatService.loadHistory();
    if (saved && saved.length > 0) return saved;

    return [
      {
        id: 'msg-welcome',
        role: 'model',
        text: `### Welcome to NovaCompiler AI Studio Chat! 🚀\n\nI am your **AI Compiler Engineering Assistant**, powered by **Google Gemini**. I can help you with:\n\n- **NovaLang Source Code**: Writing algorithms, functions, control loops, and data structures.\n- **Compiler Construction Pipeline**: Lexing, CFGs, AST/CST trees, Symbol Tables, and SDD translation.\n- **Diagnostics & Debugging**: Pinpointing grammar conflicts, type errors, and uninitialized variables.\n- **Optimization Passes**: Constant folding, dead code elimination, DAGs, and graph coloring register allocation.\n\n*Choose a specific role or model above, or attach your current active document below to begin!*`,
        timestamp: Date.now(),
        model: 'gemini-3.5-flash',
        roleId: 'compiler_architect',
      },
    ];
  });

  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-3.5-flash');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('compiler_architect');
  const [customSystemInstruction, setCustomSystemInstruction] = useState<string>('');
  const [showRoleMenu, setShowRoleMenu] = useState<boolean>(false);
  const [showModelMenu, setShowModelMenu] = useState<boolean>(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [includeActiveCode, setIncludeActiveCode] = useState<boolean>(false);
  const [includeDiagnostics, setIncludeDiagnostics] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Selected role & model objects
  const selectedRole = useMemo(() => {
    return CHAT_ROLES.find((r) => r.id === selectedRoleId) || CHAT_ROLES[0];
  }, [selectedRoleId]);

  const selectedModel = useMemo(() => {
    return CHAT_MODELS.find((m) => m.id === selectedModelId) || CHAT_MODELS[0];
  }, [selectedModelId]);

  // Persist history changes
  useEffect(() => {
    GeminiChatService.saveHistory(messages);
  }, [messages]);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isLoading]);

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : input;
    const trimmed = rawText.trim();
    if (!trimmed || isLoading) return;

    // Build context-enhanced prompt if context toggles are enabled
    let fullPrompt = trimmed;
    const contextPrefixes: string[] = [];

    if (includeActiveCode && currentCode) {
      contextPrefixes.push(
        `[Attached Active Document: ${currentFileName}]\n\`\`\`nova\n${currentCode}\n\`\`\``
      );
    }

    if (includeDiagnostics && diagnostics.length > 0) {
      const diagSummaries = diagnostics
        .map(
          (d) =>
            `- [${d.severity.toUpperCase()}] Line ${d.location?.line || '?'}: ${d.message} (${d.stage})`
        )
        .join('\n');
      contextPrefixes.push(`[Current Compiler Diagnostics]\n${diagSummaries}`);
    }

    if (contextPrefixes.length > 0) {
      fullPrompt = `${contextPrefixes.join('\n\n')}\n\nUser Question:\n${trimmed}`;
    }

    const userMessageId = `user-${Date.now()}`;
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Reset one-time context attachments
    setIncludeActiveCode(false);
    setIncludeDiagnostics(false);

    // Determine system instruction
    const systemInstruction = customSystemInstruction.trim()
      ? customSystemInstruction.trim()
      : selectedRole.systemInstruction;

    try {
      const result = await GeminiChatService.sendMessage({
        message: fullPrompt,
        history: newMessages,
        model: selectedModel.id,
        systemInstruction,
      });

      const assistantMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: result.text,
        timestamp: Date.now(),
        model: result.model,
        roleId: selectedRole.id,
        status: 'success',
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `**Error generating response:**\n${err?.message || 'Failed to communicate with Gemini API'}\n\n*Please ensure your server is running and a valid GEMINI_API_KEY is configured in Settings > Secrets.*`,
        timestamp: Date.now(),
        model: selectedModel.id,
        roleId: selectedRole.id,
        status: 'error',
        error: err?.message,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all conversation messages?')) {
      GeminiChatService.clearHistory();
      setMessages([]);
    }
  };

  const handleExportMarkdown = () => {
    const md = GeminiChatService.exportToMarkdown(messages);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NovaCompiler_Gemini_Chat_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCreateNewFileFromCode = (codeText: string, extension: string = '.nova') => {
    const filename = `snippet_${Date.now().toString().slice(-4)}${extension}`;
    const result = createFile(filename, 'root', codeText, true);
    if (result.success && result.fileId) {
      openDocument(result.fileId);
    }
  };

  // Quick suggestion prompts
  const suggestionPrompts = [
    {
      title: 'Analyze & Debug Code',
      prompt: 'Please analyze my current NovaLang source program for any logical bugs, semantic inconsistencies, or optimization opportunities.',
      needsCode: true,
    },
    {
      title: 'Explain Compiler Pipeline',
      prompt: 'Explain how NovaLang compiles source code step-by-step: from Lexer tokens, to AST, TAC Intermediate Representation, and Stack VM bytecode.',
      needsCode: false,
    },
    {
      title: 'Write a NovaLang Algorithm',
      prompt: 'Write a complete, compilable NovaLang program implementing an iterative Fibonacci and prime number sieve algorithm with print statements.',
      needsCode: false,
    },
    {
      title: 'Graph Coloring Register Allocation',
      prompt: 'How does Chaitin-Briggs Graph Coloring Register Allocation work with Kempe heuristics? Explain interference graphs and register spilling.',
      needsCode: false,
    },
  ];

  // Render Markdown with rich code block support
  const renderMessageContent = (text: string, msgId: string) => {
    // Split by code fences: ```lang\ncode\n```
    const parts = text.split(/(```[\w-]*\n[\s\S]*?\n```)/g);

    return (
      <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed break-words">
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const firstLineEnd = part.indexOf('\n');
            const lang = part.slice(3, firstLineEnd).trim() || 'nova';
            const codeContent = part.slice(firstLineEnd + 1, -3);
            const blockId = `${msgId}-code-${index}`;
            const isCopied = copiedCodeId === blockId;

            return (
              <div
                key={blockId}
                className="my-3 rounded-lg overflow-hidden border border-slate-700/80 bg-[#0b0e14] shadow-md"
              >
                {/* Code Block Header */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#141822] border-b border-slate-700/80 text-[11px] font-mono text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold uppercase tracking-wider text-indigo-300">
                      {lang}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyCode(codeContent, blockId)}
                      className="px-2 py-0.5 rounded hover:bg-slate-700/70 text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                      title="Copy code to clipboard"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {onInsertCode && (
                      <button
                        onClick={() => onInsertCode(codeContent)}
                        className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition flex items-center gap-1 cursor-pointer"
                        title="Insert into active editor"
                      >
                        <FileCode className="w-3 h-3" />
                        <span>Insert to Editor</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleCreateNewFileFromCode(codeContent, lang === 'nova' ? '.nova' : `.${lang}`)}
                      className="px-2 py-0.5 rounded hover:bg-slate-700/70 text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                      title="Save snippet as new workspace file"
                    >
                      <FilePlus className="w-3 h-3" />
                      <span>New File</span>
                    </button>
                  </div>
                </div>

                {/* Code Content */}
                <pre className="p-3 overflow-x-auto text-[11.5px] font-mono leading-relaxed text-slate-200">
                  <code>{codeContent}</code>
                </pre>
              </div>
            );
          }

          // Plain text & markdown formatting
          const paragraphs = part.split(/\n\n+/);
          return (
            <div key={`part-${index}`} className="space-y-2">
              {paragraphs.map((para, pIdx) => {
                if (!para.trim()) return null;

                // Handle Headers
                if (para.startsWith('### ')) {
                  return (
                    <h3 key={pIdx} className="text-sm sm:text-base font-bold text-slate-100 mt-2 mb-1">
                      {para.replace('### ', '')}
                    </h3>
                  );
                }
                if (para.startsWith('## ')) {
                  return (
                    <h2 key={pIdx} className="text-base sm:text-lg font-bold text-indigo-200 mt-2.5 mb-1.5">
                      {para.replace('## ', '')}
                    </h2>
                  );
                }

                // Handle Bullet Lists
                if (para.includes('\n- ') || para.startsWith('- ')) {
                  const listItems = para.split('\n- ').map((item) => item.replace(/^- /, ''));
                  return (
                    <ul key={pIdx} className="list-disc list-inside space-y-1 my-1 text-slate-300 pl-1">
                      {listItems.map((li, liIdx) => (
                        <li key={liIdx} className="leading-snug">
                          {renderInlineMarkdown(li)}
                        </li>
                      ))}
                    </ul>
                  );
                }

                return (
                  <p key={pIdx} className="leading-relaxed text-slate-300">
                    {renderInlineMarkdown(para)}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // Helper for inline markdown: bold, italics, inline code
  const renderInlineMarkdown = (text: string) => {
    const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return tokens.map((token, i) => {
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-[#0b0e14] text-indigo-300 border border-slate-700 mx-0.5"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      if (token.startsWith('**') && token.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-100">
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('*') && token.endsWith('*')) {
        return (
          <em key={i} className="italic text-slate-200">
            {token.slice(1, -1)}
          </em>
        );
      }
      return token;
    });
  };

  return (
    <div
      style={{ backgroundColor: 'var(--bg-canvas)' }}
      className={`flex flex-col h-full w-full overflow-hidden select-text text-slate-200 ${className}`}
    >
      {/* Top Configuration Toolbar */}
      <div
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-app)' }}
        className="px-3 py-2 border-b flex items-center justify-between gap-2 flex-wrap shrink-0 shadow-sm"
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowRoleMenu(!showRoleMenu);
                setShowModelMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131722] hover:bg-slate-800 text-xs font-medium border border-slate-700/80 transition cursor-pointer text-slate-200 shadow-sm"
              title="Change Chatbot Specialist Role"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold">{selectedRole.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/80 font-mono">
                {selectedRole.badge}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {showRoleMenu && (
              <div
                className="absolute left-0 mt-1.5 w-72 max-w-[calc(100vw-32px)] bg-[#131722] border border-slate-700 rounded-lg shadow-2xl py-1.5 z-50 text-xs"
                onMouseLeave={() => setShowRoleMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                  <span>Chatbot Specialist Role</span>
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                </div>
                {CHAT_ROLES.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => {
                      setSelectedRoleId(role.id);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex flex-col transition cursor-pointer border-b border-slate-800/40 last:border-0 ${
                      selectedRoleId === role.id
                        ? 'bg-indigo-600/20 text-indigo-200 font-semibold border-l-2 border-indigo-500'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{role.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {role.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5">{role.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Model Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowModelMenu(!showModelMenu);
                setShowRoleMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131722] hover:bg-slate-800 text-xs font-medium border border-slate-700/80 transition cursor-pointer text-slate-200 shadow-sm"
              title="Change Gemini Model"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>{selectedModel.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${selectedModel.tagColor}`}>
                {selectedModel.badge}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {showModelMenu && (
              <div
                className="absolute left-0 mt-1.5 w-76 max-w-[calc(100vw-32px)] bg-[#131722] border border-slate-700 rounded-lg shadow-2xl py-1.5 z-50 text-xs"
                onMouseLeave={() => setShowModelMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                  <span>Gemini Model Selection</span>
                  <Zap className="w-3 h-3 text-emerald-400" />
                </div>
                {CHAT_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModelId(model.id);
                      setShowModelMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex flex-col transition cursor-pointer border-b border-slate-800/40 last:border-0 ${
                      selectedModelId === model.id
                        ? 'bg-emerald-600/20 text-emerald-200 font-semibold border-l-2 border-emerald-500'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{model.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${model.tagColor}`}>
                        {model.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5">{model.description}</span>
                    <span className="text-[10px] text-indigo-400 mt-0.5 italic">
                      Recommended for: {model.recommendedFor}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportMarkdown}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="Export conversation transcript as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition cursor-pointer"
            title="Clear chat history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Thread (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-700/50 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-200 text-sm mb-1">How can I assist your compiler development?</h3>
            <p className="text-xs text-slate-400 max-w-md">
              Ask about NovaLang syntax, compiler phases (Lexer, Parser, AST, CFG, Optimization), or debug your code.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isError = msg.status === 'error';

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-900 to-indigo-600 border border-indigo-500/50 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-xl px-3.5 py-3 shadow-sm ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : isError
                      ? 'bg-rose-950/40 border border-rose-800 text-rose-200 rounded-tl-none'
                      : 'bg-[#141824] border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {/* Meta Bar */}
                  <div
                    className={`flex items-center gap-2 mb-1.5 text-[10px] font-mono ${
                      isUser ? 'text-indigo-200 justify-end' : 'text-slate-400'
                    }`}
                  >
                    <span className="font-semibold">{isUser ? 'You' : 'Gemini Assistant'}</span>
                    {!isUser && msg.model && (
                      <span className="px-1.5 py-0.2 rounded bg-[#0b0e14] text-indigo-300 border border-slate-700">
                        {msg.model}
                      </span>
                    )}
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {/* Body Content */}
                  {renderMessageContent(msg.text, msg.id)}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 shrink-0 mt-0.5 shadow-sm text-xs font-bold">
                    U
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading / Typing Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 sm:gap-3 justify-start items-center">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-900 to-indigo-600 border border-indigo-500/50 flex items-center justify-center text-white shrink-0 shadow-md animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-xl px-4 py-2.5 bg-[#141824] border border-slate-800 text-slate-300 rounded-tl-none flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span className="text-slate-400 font-medium">
                Gemini is reasoning and compiling response...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Context Attachment Chips & Quick Prompts Bar */}
      <div
        style={{ borderColor: 'var(--border-app)' }}
        className="px-3 py-1.5 border-t bg-[#0f131c] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-xs"
      >
        <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0 flex items-center gap-1">
          <Terminal className="w-3 h-3 text-indigo-400" />
          <span>Context:</span>
        </span>

        {/* Attach Active Code Button */}
        {currentCode && (
          <button
            onClick={() => setIncludeActiveCode(!includeActiveCode)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 border transition cursor-pointer shrink-0 ${
              includeActiveCode
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500 font-semibold'
                : 'bg-[#181d2a] text-slate-400 hover:text-slate-200 border-slate-700/70 hover:bg-slate-800'
            }`}
            title="Attach currently active document code as context to your question"
          >
            <FileCode className="w-3 h-3" />
            <span>{currentFileName}</span>
            {includeActiveCode && <Check className="w-2.5 h-2.5 text-indigo-400" />}
          </button>
        )}

        {/* Attach Diagnostics Button */}
        {diagnostics.length > 0 && (
          <button
            onClick={() => setIncludeDiagnostics(!includeDiagnostics)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 border transition cursor-pointer shrink-0 ${
              includeDiagnostics
                ? 'bg-rose-950/60 text-rose-300 border-rose-700 font-semibold'
                : 'bg-[#181d2a] text-rose-400/80 hover:text-rose-300 border-rose-900/50 hover:bg-slate-800'
            }`}
            title="Attach current compiler diagnostic errors to your question"
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>{diagnostics.length} Errors</span>
            {includeDiagnostics && <Check className="w-2.5 h-2.5 text-rose-400" />}
          </button>
        )}

        {/* Quick starter chips */}
        <div className="h-4 w-[1px] bg-slate-800 shrink-0 mx-1" />

        {suggestionPrompts.map((sug, i) => (
          <button
            key={i}
            onClick={() => {
              if (sug.needsCode) setIncludeActiveCode(true);
              handleSendMessage(sug.prompt);
            }}
            disabled={isLoading}
            className="px-2 py-0.5 rounded bg-[#181d2a] hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-200 border border-slate-800 hover:border-indigo-800/60 transition text-[11px] shrink-0 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {sug.title}
          </button>
        ))}
      </div>

      {/* Input Form Area */}
      <div
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-app)' }}
        className="p-3 border-t shrink-0"
      >
        <div className="relative flex items-end gap-2 bg-[#0b0e14] border border-slate-700 rounded-xl p-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition shadow-inner">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${selectedRole.name} about NovaLang, CFGs, TAC, or optimizations... (Shift+Enter for newline)`}
            rows={2}
            className="flex-1 bg-transparent text-slate-100 text-xs sm:text-sm resize-none focus:outline-none placeholder:text-slate-500 leading-relaxed min-h-[44px] max-h-36 overflow-y-auto"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-lg transition cursor-pointer disabled:cursor-not-allowed shadow-md shrink-0 flex items-center justify-center"
            title="Send message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
          <span>
            Model: <strong className="text-slate-300">{selectedModel.name}</strong> • Role:{' '}
            <strong className="text-slate-300">{selectedRole.name}</strong>
          </span>
          <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
};
