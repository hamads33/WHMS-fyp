'use client';

import { useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { createBlock } from '../utils/blockDefaults';
import { generateHtml } from '../utils/generateHtml';

export function useEmailBuilder(initialBlocks = []) {
  const [blocks, setBlocks]           = useState(initialBlocks);
  const [selectedId, setSelectedId]   = useState(null);
  const [previewMode, setPreviewMode] = useState(null); // null | 'desktop' | 'mobile'
  const [isDirty, setIsDirty]         = useState(false);
  const [history, setHistory]         = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null;

  // ── History helpers ──────────────────────────────────────────────
  const pushHistory = useCallback((newBlocks) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newBlocks].slice(-30); // keep last 30 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    setBlocks(prev);
    setHistoryIndex(i => i - 1);
    setIsDirty(true);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setBlocks(next);
    setHistoryIndex(i => i + 1);
    setIsDirty(true);
  }, [history, historyIndex]);

  // ── Block operations ─────────────────────────────────────────────
  const addBlock = useCallback((type, atIndex = null) => {
    const block = createBlock(type);
    setBlocks(prev => {
      const next = atIndex !== null && atIndex >= 0
        ? [...prev.slice(0, atIndex), block, ...prev.slice(atIndex)]
        : [...prev, block];
      pushHistory(next);
      return next;
    });
    setSelectedId(block.id);
    setIsDirty(true);
    return block.id;
  }, [pushHistory]);

  const removeBlock = useCallback((id) => {
    setBlocks(prev => {
      const next = prev.filter(b => b.id !== id);
      pushHistory(next);
      return next;
    });
    setSelectedId(curr => (curr === id ? null : curr));
    setIsDirty(true);
  }, [pushHistory]);

  const duplicateBlock = useCallback((id) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      const original = prev[idx];
      const copy = {
        ...JSON.parse(JSON.stringify(original)),
        id: `${original.type}-${Date.now().toString(36)}`,
      };
      const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      pushHistory(next);
      setSelectedId(copy.id);
      return next;
    });
    setIsDirty(true);
  }, [pushHistory]);

  const updateBlock = useCallback((id, props) => {
    setBlocks(prev =>
      prev.map(b => b.id === id ? { ...b, props: { ...b.props, ...props } } : b)
    );
    setIsDirty(true);
  }, []);

  const reorderBlocks = useCallback((activeId, overId) => {
    setBlocks(prev => {
      const oldIdx = prev.findIndex(b => b.id === activeId);
      const newIdx = prev.findIndex(b => b.id === overId);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = arrayMove(prev, oldIdx, newIdx);
      pushHistory(next);
      return next;
    });
    setIsDirty(true);
  }, [pushHistory]);

  const moveBlock = useCallback((id, direction) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = arrayMove(prev, idx, newIdx);
      pushHistory(next);
      return next;
    });
    setIsDirty(true);
  }, [pushHistory]);

  // ── Load / reset ─────────────────────────────────────────────────
  const loadBlocks = useCallback((newBlocks) => {
    setBlocks(newBlocks);
    setSelectedId(null);
    setIsDirty(false);
    setHistory([newBlocks]);
    setHistoryIndex(0);
  }, []);

  const loadPreset = useCallback((preset) => {
    loadBlocks(preset.blocks);
  }, [loadBlocks]);

  // ── Export ───────────────────────────────────────────────────────
  const getHtml    = useCallback(() => generateHtml(blocks), [blocks]);
  const getJson    = useCallback(() => JSON.stringify(blocks, null, 2), [blocks]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    blocks,
    selectedId,
    selectedBlock,
    previewMode,
    isDirty,
    canUndo,
    canRedo,
    setSelectedId,
    setPreviewMode,
    addBlock,
    removeBlock,
    duplicateBlock,
    updateBlock,
    reorderBlocks,
    moveBlock,
    loadBlocks,
    loadPreset,
    getHtml,
    getJson,
    setIsDirty,
    undo,
    redo,
  };
}
