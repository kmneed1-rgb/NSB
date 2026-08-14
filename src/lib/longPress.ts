import { useRef, useCallback } from 'react';

export function useLongPress(onLongPress: () => void, ms = 500) {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const cancel = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
  }, []);

  const start = useCallback((e: React.SyntheticEvent) => {
    cancel();
    const evt = e.nativeEvent as TouchEvent;
    if (evt.touches && evt.touches[0]) {
      startPos.current = { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
    } else {
      startPos.current = null;
    }
    timeoutId.current = setTimeout(() => {
      onLongPress();
    }, ms);
  }, [onLongPress, ms, cancel]);

  const move = useCallback((e: React.SyntheticEvent) => {
    const evt = e.nativeEvent as TouchEvent;
    if (evt.touches && evt.touches[0] && startPos.current) {
      const dx = evt.touches[0].clientX - startPos.current.x;
      const dy = evt.touches[0].clientY - startPos.current.y;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        cancel();
        startPos.current = null;
      }
    }
  }, [cancel]);

  const clear = useCallback(() => {
    cancel();
    startPos.current = null;
  }, [cancel]);

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: clear,
    onTouchCancel: clear,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      onLongPress();
    }
  };
}