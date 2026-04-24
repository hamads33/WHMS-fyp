'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

export const DROP_ANIMATION = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.5' } },
  }),
};

export function useDragDrop({ blocks, addBlock, reorderBlocks, setSelectedId }) {
  const [activeItem, setActiveItem] = useState(null); // { type: 'sidebar'|'canvas', blockType?, block? }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // require small movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.origin === 'sidebar') {
      setActiveItem({ type: 'sidebar', blockType: data.blockType, label: data.label });
    } else {
      const block = blocks.find(b => b.id === active.id);
      setActiveItem({ type: 'canvas', block });
    }
  }, [blocks]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const data = active.data.current;
    const isSidebarDrag = data?.origin === 'sidebar';

    if (isSidebarDrag) {
      // Determine insert index — over a block? insert before it. Over canvas? append.
      const overIsBlock = blocks.some(b => b.id === over.id);
      const insertIndex = overIsBlock
        ? blocks.findIndex(b => b.id === over.id)
        : null; // append
      addBlock(data.blockType, insertIndex);
    } else {
      // Reorder canvas blocks
      if (active.id !== over.id) {
        reorderBlocks(active.id, over.id);
      }
      // Re-select the dragged block — the drag pointerup can bubble to the canvas
      // container's onClick which clears selection, making the toolbar disappear.
      setSelectedId?.(active.id);
    }
  }, [blocks, addBlock, reorderBlocks, setSelectedId]);

  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
  }, []);

  return {
    sensors,
    activeItem,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    DndContext,
    DragOverlay,
  };
}
