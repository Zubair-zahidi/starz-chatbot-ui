// src/components/chat/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Download, MoreVertical, Pause, Trash2 } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../contexts/AuthContext';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import QuickActions from './QuickActions';
import AuthDialog from '../auth/AuthDialog';
import { DEFAULT_MODEL } from '../../utils/constants';

interface ChatInterfaceProps {
  sessionId?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [dbStatus, setDbStatus] = useState<{ readyState: number; state?: string; name?: string | null } | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated } = useAuth();

  const {
    messages,
    activeSession,
    isLoading,
    guestLimitReached,
    sendMessage,
    cancelGeneration,
    deleteMessage,
    clearSession,
    exportSession,
  } = useChat(sessionId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    const loadHealth = async () => {
      try {
        const base = (import.meta as any).env?.VITE_API_URL || '/api';
        const healthUrl = String(base).replace(/\/$/, '') + '/health';
        const res = await fetch(healthUrl);
        const json = await res.json();
        if (cancelled) return;
        setDbStatus(json?.database ?? null);
      } catch {
        if (cancelled) return;
        setDbStatus({ readyState: 0, state: 'disconnected', name: null });
      }
    };

    loadHealth();
    const id = setInterval(loadHealth, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const content = input;
    setInput('');
    setIsTyping(true);

    try {
      await sendMessage(content, { model: selectedModel });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (query: string) => {
    setInput(query);
  };

  return (
    <div className="flex flex-col h-full">
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultMode="login" />

      {/* Chat Header */}
      <div className="flex justify-between items-center p-4 border-b border-stellar-blue/20 bg-gradient-to-r from-cosmic-black via-cosmic-matter/30 to-cosmic-black">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-stellar-blue to-stellar-teal 
                          flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 
                          border-2 border-cosmic-black" />
          </div>
          <div>
            <h2 className="font-orbitron font-semibold">Cosmic Intelligence Core</h2>
            <p className="text-xs text-stellar-silver">Real-time Astronomical Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-cosmic-matter/40 border border-stellar-blue/10">
            <span
              className={[
                'w-2.5 h-2.5 rounded-full',
                (dbStatus?.readyState ?? 0) === 1 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]' : 'bg-rose-400',
              ].join(' ')}
            />
            <span className="text-xs font-semibold tracking-wide text-stellar-silver">
              DB: {(dbStatus?.state ?? 'unknown').toString().toUpperCase()}
            </span>
          </div>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl
                         bg-gradient-to-r from-stellar-blue/80 to-stellar-purple/80
                         hover:from-stellar-blue hover:to-stellar-purple border border-stellar-blue/20
                         font-semibold text-sm transition-colors"
              title="Sign in"
            >
              Sign in
            </button>
          )}
          <button
            onClick={() => activeSession?._id && exportSession(activeSession._id, 'txt')}
            className="p-2 rounded-lg hover:bg-cosmic-matter transition-colors"
            title="Export Chat"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => activeSession?._id && clearSession(activeSession._id)}
            className="p-2 rounded-lg hover:bg-cosmic-matter transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {isLoading && (
            <button
              type="button"
              onClick={cancelGeneration}
              className="p-2 rounded-lg hover:bg-cosmic-matter transition-colors"
              title="Pause generation"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          <button className="p-2 rounded-lg hover:bg-cosmic-matter transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MessageItem
                message={message}
                onDelete={() => deleteMessage(message._id)}
                isOwn={message.role === 'user'}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-stellar-blue to-stellar-teal flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="max-w-[75%] rounded-2xl px-5 py-4 border backdrop-blur-md bg-gradient-to-br from-stellar-blue/10 to-stellar-teal/10 border-stellar-blue/25">
              <div className="flex items-center gap-2">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
                <span className="text-sm text-stellar-silver ml-1">STARZ is typing...</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {guestLimitReached && (
        <div className="p-4 border-t border-stellar-blue/20 bg-cosmic-matter/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="font-semibold">Sign in required</p>
              <p className="text-sm text-stellar-silver">
                You've reached the guest limit (4 messages). Sign in to continue and save your sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-stellar-blue to-stellar-purple font-semibold"
            >
              Sign in to continue
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 py-3 border-t border-stellar-blue/20">
        <QuickActions onAction={handleQuickAction} />
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-stellar-blue/20">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={guestLimitReached || isTyping || isLoading}
          placeholder="Enter quantum query about cosmic phenomena..."
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
