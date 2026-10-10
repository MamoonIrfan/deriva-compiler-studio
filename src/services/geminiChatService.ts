import { ChatMessage, CHAT_MODELS } from '../types/chat';

export interface SendChatParams {
  message: string;
  history: ChatMessage[];
  model?: string;
  systemInstruction?: string;
}

export interface SendChatResult {
  text: string;
  model: string;
}

export class GeminiChatService {
  private static STORAGE_KEY = 'novacompiler_gemini_chat_history_v1';

  /**
   * Sends a user message along with conversation history to the backend Gemini proxy endpoint.
   */
  public static async sendMessage(params: SendChatParams): Promise<SendChatResult> {
    const { message, history, model = 'gemini-3.5-flash', systemInstruction } = params;

    // Filter successful messages to avoid polluting context with failed/incomplete turns
    const validHistory = history
      .filter((m) => m.status !== 'error' && m.text.trim().length > 0)
      .map((m) => ({
        role: m.role,
        text: m.text,
      }));

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history: validHistory,
        model,
        systemInstruction,
      }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        // use default error message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      text: data.text || '',
      model: data.model || model,
    };
  }

  /**
   * Persists chat history to localStorage
   */
  public static saveHistory(messages: ChatMessage[]): void {
    try {
      // Keep up to 50 most recent messages to prevent storage bloat
      const trimmed = messages.slice(-50);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to save chat history to localStorage:', e);
    }
  }

  /**
   * Loads saved chat history from localStorage
   */
  public static loadHistory(): ChatMessage[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load chat history from localStorage:', e);
    }
    return [];
  }

  /**
   * Clears saved chat history
   */
  public static clearHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {}
  }

  /**
   * Formats chat conversation to a markdown string for export
   */
  public static exportToMarkdown(messages: ChatMessage[]): string {
    const lines: string[] = [
      '# NovaCompiler Studio — Gemini AI Conversation Transcript',
      `*Generated on: ${new Date().toLocaleString()}*`,
      '',
      '---',
      '',
    ];

    messages.forEach((msg) => {
      const sender = msg.role === 'user' ? '👤 User' : `🤖 Gemini Assistant (${msg.model || 'Gemini'})`;
      const time = new Date(msg.timestamp).toLocaleTimeString();
      lines.push(`### ${sender}  *[${time}]*`);
      lines.push('');
      lines.push(msg.text);
      lines.push('');
      lines.push('---');
      lines.push('');
    });

    return lines.join('\n');
  }
}
