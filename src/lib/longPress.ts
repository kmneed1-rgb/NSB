import { useRef, useCallback } from 'react';

export function useLongPress(onLongPress: () => void, ms = 600) {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback((e: React.SyntheticEvent) => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
    timeoutId.current = setTimeout(() => {
      onLongPress();
    }, ms);
  }, [onLongPress, ms]);

  const clear = useCallback((e: React.SyntheticEvent) => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      onLongPress();
    }
  };
}
