'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { parseCommand } from '@/lib/assistant-commands';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

const TESTING_ENTER_RE =
  /^(start testing|begin testing|testing mode|activate testing|enter testing)$/i;
const TESTING_EXIT_RE = /^(end testing|stop testing|done testing|exit testing)$/i;

export function ChatAssistant() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'bot',
      text: "Hi! I'm your Tipper assistant. Type 'help' to see what I can do.",
    },
  ]);
  const [input, setInput] = useState('');
  const [testingMode, setTestingMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Don't render for guests or unauthenticated users
  if (!user || user.role === 'guest') return null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (role: 'user' | 'bot', text: string) => {
    setMessages((prev) => [...prev, { id: Date.now().toString(), role, text }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    addMessage('user', trimmed);
    setInput('');

    // Check testing mode entry/exit
    if (TESTING_ENTER_RE.test(trimmed)) {
      setTestingMode(true);
      addMessage(
        'bot',
        'Testing mode activated. You can now report bugs or enhancements.\n\nExamples:\n• Bug: the tip page won\'t load\n• Enhancement: add dark mode support\n\nType "done testing" to exit.',
      );
      return;
    }

    if (TESTING_EXIT_RE.test(trimmed)) {
      setTestingMode(false);
      addMessage('bot', 'Testing mode deactivated. Back to normal mode.');
      return;
    }

    // Testing mode logic
    if (testingMode) {
      const lowerMsg = trimmed.toLowerCase();
      const isBug = lowerMsg.startsWith('bug:') || lowerMsg.startsWith('bug ');
      const isEnhancement =
        lowerMsg.startsWith('enhancement:') || lowerMsg.startsWith('enhancement ');

      if (!isBug && !isEnhancement) {
        addMessage(
          'bot',
          "In testing mode, please report bugs or enhancements only.\n\nExamples:\n• Bug: the tip page won't load\n• Enhancement: add dark mode support",
        );
        return;
      }

      const type = isBug ? 'bug' : 'enhancement';
      const prefixLen = isBug
        ? trimmed.toLowerCase().startsWith('bug:')
          ? 4
          : 4
        : trimmed.toLowerCase().startsWith('enhancement:')
          ? 12
          : 12;
      const description = trimmed.slice(prefixLen).trim();

      if (!description) {
        addMessage(
          'bot',
          `Please provide a description after "${type}:". Example: ${type}: the page crashes on mobile`,
        );
        return;
      }

      const subject = description.length > 60 ? description.substring(0, 60) + '...' : description;

      try {
        const res = await api.post('/feedback', {
          type,
          subject,
          description,
          priority: 'medium',
        });

        if (res.success) {
          addMessage(
            'bot',
            `${type === 'bug' ? 'Bug' : 'Enhancement'} report submitted successfully! Thank you for your feedback.`,
          );
        } else {
          addMessage(
            'bot',
            'Sorry, there was an error submitting your feedback. Please try again.',
          );
        }
      } catch {
        addMessage('bot', 'Sorry, there was an error submitting your feedback. Please try again.');
      }
      return;
    }

    // Normal mode: parse command
    const result = parseCommand(trimmed, user.role);
    addMessage('bot', result.response);

    if (result.action.type === 'navigate') {
      const { path } = result.action;
      setTimeout(() => router.push(path), 500);
    }
  };

  return (
    <>
      {/* Toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
          aria-label="Open assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 flex w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-primary/20 bg-background/80 shadow-2xl backdrop-blur-xl md:h-[50vh] md:w-[340px]"
          style={{ maxHeight: 'calc(100vh - 6rem)', minHeight: '360px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-primary to-primary/80 px-4 py-3">
            <span className="font-semibold text-primary-foreground">Assistant</span>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/20 hover:text-primary-foreground"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Testing mode banner */}
          {testingMode && (
            <div className="bg-amber-500/90 px-4 py-2 text-center text-xs font-semibold text-white">
              TESTING MODE — Bugs &amp; Enhancements only
            </div>
          )}

          {/* Messages */}
          <ScrollableMessages messages={messages} messagesEndRef={messagesEndRef} />

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border/50 p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={testingMode ? 'Bug: ... or Enhancement: ...' : 'Type a command...'}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function ScrollableMessages({
  messages,
  messagesEndRef,
}: {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
