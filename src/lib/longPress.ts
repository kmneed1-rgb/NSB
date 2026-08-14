import { useRef, useCallback } from 'react';

export function useLongPress(onLongPress: () => void, ms = 450) {
  const timer = useRef<number | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback((e: React.PointerEvent) => {
    cancel();
    fired.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    timer.current = window.setTimeout(() => {
      fired.current = true;
      onLongPress();
    }, ms);
  }, [onLongPress, ms, cancel]);

  const move = useCallback((e: React.PointerEvent) => {
    if (!fired.current && startPos.current) {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
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
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (!fired.current) {
        fired.current = true;
        onLongPress();
      }
    }
  };
}