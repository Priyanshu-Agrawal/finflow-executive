'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface UndoItem {
  id: string;
  description: string;
  timestamp: number;
  undo: () => Promise<void>;
}

interface UndoContextType {
  pushUndo: (item: { description: string; undo: () => Promise<void> }) => void;
  triggerUndo: () => Promise<void>;
  dismissUndo: () => void;
  currentUndo: UndoItem | null;
  undoneNotice: string | null;
  isUndoing: boolean;
  undoStackLength: number;
}

const UndoContext = createContext<UndoContextType | undefined>(undefined);

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [undoStack, setUndoStack] = useState<UndoItem[]>([]);
  const [currentUndo, setCurrentUndo] = useState<UndoItem | null>(null);
  const [undoneNotice, setUndoneNotice] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const dismissUndo = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCurrentUndo(null);
  }, []);

  const pushUndo = useCallback((item: { description: string; undo: () => Promise<void> }) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      setUndoneNotice(null);
    }

    const newUndo: UndoItem = {
      id: Math.random().toString(36).substring(2, 9),
      description: item.description,
      timestamp: Date.now(),
      undo: item.undo,
    };

    setUndoStack((prev) => [newUndo, ...prev].slice(0, 30)); // keep last 30 actions
    setCurrentUndo(newUndo);

    // Auto-dismiss current toast after 9 seconds, but stack remains for keyboard shortcuts
    timerRef.current = setTimeout(() => {
      setCurrentUndo(null);
    }, 9000);
  }, []);

  const triggerUndo = useCallback(async () => {
    if (undoStack.length === 0 || isUndoing) return;

    const [topItem, ...remainingStack] = undoStack;
    setIsUndoing(true);

    try {
      await topItem.undo();
      setUndoStack(remainingStack);

      // Show notice of what was undone
      setUndoneNotice(`Undone: ${topItem.description}`);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => {
        setUndoneNotice(null);
      }, 4000);

      // If more actions remain, surface the next one in line
      if (remainingStack.length > 0) {
        setCurrentUndo(remainingStack[0]);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setCurrentUndo(null);
        }, 9000);
      } else {
        dismissUndo();
      }
    } catch (err) {
      console.error('Failed to execute undo action:', err);
    } finally {
      setIsUndoing(false);
    }
  }, [undoStack, isUndoing, dismissUndo]);

  // Global keyboard shortcut listener for Cmd+Z / Ctrl+Z (Capture phase so no element intercepts it)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Z or Ctrl+Z (without shift)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        const isModalForm = target && target.closest('[data-modal-form="true"]');

        // Only let native text undo handle if actively typing in a standard modal form field
        if (isModalForm) {
          return;
        }

        if (undoStack.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          triggerUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [undoStack, triggerUndo]);

  return (
    <UndoContext.Provider
      value={{
        pushUndo,
        triggerUndo,
        dismissUndo,
        currentUndo,
        undoneNotice,
        isUndoing,
        undoStackLength: undoStack.length,
      }}
    >
      {children}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
}
