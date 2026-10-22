import { isCancel } from 'axios';
import { errorMessage } from '../utils/errorMessage';
import { useEffect, useState, useRef } from 'react';
import { chatApi } from '../services/api/chat';
import type { ChatSession, Message } from '../types';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/authState';

export function useChat(sessionId?: string) {
  const { isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [guestLimitReached, setGuestLimitReached] = useState(false);

  const activeSessionId = sessionId || activeSession?._id;
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelGeneration = () => {
    if (!abortControllerRef.current) return;

    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setIsLoading(false);

    // Remove any pending assistant message
    setMessages((prev) => prev.filter((message) => message.role !== 'assistant' || message.content));

    toast.success('Generation stopped. You can now send a new message.');
  };

  const load = async () => {
    setIsLoading(true);
    try {
      setGuestLimitReached(false);

      if (!isAuthenticated) {
        // Guest mode
        let guestSessionId = localStorage.getItem('guest_session_id');
        let session: ChatSession | null = null;

        if (guestSessionId) {
          try {
            session = await chatApi.getGuestSession(guestSessionId);
          } catch {
            guestSessionId = null;
            localStorage.removeItem('guest_session_id');
          }
        }

        if (!session) {
          session = await chatApi.createGuestSession('Guest Session');
          localStorage.setItem('guest_session_id', session._id);
        }

        setActiveSession(session);
        setMessages(session.messages || []);
        setSessions([]);
        return;
      }

      // Auth mode
      const list = await chatApi.getSessions();
      setSessions(list);

      let session = sessionId ? list.find((s) => s._id === sessionId) : list[0];
      if (!session) {
        session = await chatApi.createSession('New Session');
        setSessions((prev) => [session!, ...prev]);
      }

      setActiveSession(session);

      const full = await chatApi.getSession(session._id);
      setMessages(full.messages || []);
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Failed to load chat'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isAuthenticated]);

  const revealAssistantMessage = (messageId: string, fullText: string) => {
    return new Promise<void>((resolve) => {
      const chars = Array.from(fullText);
      let index = 0;
      let current = '';
      if (chars.length === 0) {
        resolve();
        return;
      }

      const interval = window.setInterval(() => {
        current += chars[index] ?? '';
        index += 1;
        setMessages((prev) =>
          prev.map((message) =>
            message._id === messageId ? { ...message, content: current } : message
          )
        );

        if (index >= chars.length) {
          window.clearInterval(interval);
          resolve();
        }
      }, 20);
    });
  };

  const sendMessage = async (content: string, options?: { model?: string; stream?: boolean; images?: string[] }) => {
    if (!activeSessionId) return;

    // If there's an ongoing generation, cancel it first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);

    const userMessageId = `user-temp-${Date.now()}`;
    const assistantMessageId = `assistant-temp-${Date.now()}`;
    const now = new Date().toISOString();

    const tempUserMessage: Message = {
      _id: userMessageId,
      sessionId: activeSessionId,
      content,
      role: 'user',
      timestamp: now,
      isDeleted: false,
    };

    const tempAssistantMessage: Message = {
      _id: assistantMessageId,
      sessionId: activeSessionId,
      content: '',
      role: 'assistant',
      timestamp: now,
      isDeleted: false,
    };

    setMessages((prev) => [...prev, tempUserMessage, tempAssistantMessage]);

    try {
      const result = isAuthenticated
        ? await chatApi.sendMessage(activeSessionId, content, { ...options, signal: controller.signal })
        : await chatApi.sendGuestMessage(activeSessionId, content, { ...options, signal: controller.signal });

      setMessages((prev) =>
        prev.map((message) =>
          message._id === userMessageId ? { ...message, ...result.userMessage } : message
        )
      );

      await revealAssistantMessage(assistantMessageId, result.aiMessage.content || '');

      setMessages((prev) =>
        prev.map((message) =>
          message._id === assistantMessageId
            ? { ...message, ...result.aiMessage, content: result.aiMessage.content || '' }
            : message
        )
      );
    } catch (err: unknown) {
      const canceled = isCancel(err) || controller.signal.aborted;

      if (canceled) {
        // Remove the cancelled assistant message
        setMessages((prev) => prev.filter((message) => message._id !== assistantMessageId));
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          message._id === assistantMessageId
            ? {
                ...message,
                content: 'AI service unavailable. Please try again in a moment.',
                metadata: { responseTime: 0, tokensUsed: 0, confidence: 0 },
              }
            : message
        )
      );

      const msg = errorMessage(err, 'Failed to send message');
      if (String(msg || '').toLowerCase().includes('sign in')) {
        setGuestLimitReached(true);
      }
      toast.error(msg || 'Failed to send message');
      throw err;
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await chatApi.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Failed to delete message'));
    }
  };

  const createSession = async () => {
    if (!isAuthenticated) {
      const session = await chatApi.createGuestSession(`Guest Chat ${new Date().toLocaleString()}`);
      localStorage.setItem('guest_session_id', session._id);
      setActiveSession(session);
      setMessages(session.messages || []);
      return session;
    } else {
      const session = await chatApi.createSession(`Chat ${new Date().toLocaleString()}`);
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
      setMessages([]);
      return session;
    }
  };

  const deleteSession = async (id: string) => {
    if (!isAuthenticated) {
      // Guest sessions are ephemeral from UI perspective
      localStorage.removeItem('guest_session_id');
      setActiveSession(null);
      setMessages([]);
      await load();
      return;
    }

    await chatApi.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s._id !== id));
    if (activeSessionId === id) {
      setActiveSession(null);
      setMessages([]);
      await load();
    }
  };

  const clearSession = async (id: string) => {
    if (!isAuthenticated) {
      await chatApi.clearGuestSession(id);
      setMessages([]);
      const full = await chatApi.getGuestSession(id);
      setMessages(full.messages || []);
      return;
    }

    await chatApi.clearSession(id);
    setMessages([]);
    const full = await chatApi.getSession(id);
    setMessages(full.messages || []);
  };

  const exportSession = async (id: string, format: 'json' | 'csv' | 'txt' = 'json') => {
    const blob = await chatApi.exportSession(id, format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `starz-nexus-session-${id}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    messages,
    sessions,
    activeSession,
    isLoading,
    guestLimitReached,
    sendMessage,
    cancelGeneration,
    deleteMessage,
    createSession,
    deleteSession,
    clearSession,
    exportSession,
  };
}
