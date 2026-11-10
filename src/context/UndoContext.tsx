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
  isUndoing: boolean;
  undoStackLength: number;
}

const UndoContext = createContext<UndoContextType | undefined>(undefined);

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [undoStack, setUndoStack] = useState<UndoItem[]>([]);
  const [currentUndo, setCurrentUndo] = useState<UndoItem | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

    const newUndo: UndoItem = {
      id: Math.random().toString(36).substring(2, 9),
      description: item.description,
      timestamp: Date.now(),
      undo: item.undo,
    };

    setUndoStack((prev) => [newUndo, ...prev].slice(0, 20)); // keep last 20
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
      dismissUndo();
    } catch (err) {
      console.error('Failed to execute undo action:', err);
    } finally {
      setIsUndoing(false);
    }
  }, [undoStack, isUndoing, dismissUndo]);

  // Global keyboard shortcut listener for Cmd+Z / Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Z or Ctrl+Z (without shift)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        // If user is actively typing in a form input, let native text undo handle it
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && (target as HTMLInputElement).value !== undefined) {
          return;
        }

        if (undoStack.length > 0) {
          e.preventDefault();
          triggerUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, triggerUndo]);

  return (
    <UndoContext.Provider
      value={{
        pushUndo,
        triggerUndo,
        dismissUndo,
        currentUndo,
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
