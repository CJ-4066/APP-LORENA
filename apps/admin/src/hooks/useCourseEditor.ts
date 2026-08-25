// @ts-nocheck
import { useState, useEffect, useRef } from 'react';

export function useAutosave(value, delay, onSave) {
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const prevValueRef = useRef(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // skip initial mount
    if (JSON.stringify(prevValueRef.current) === JSON.stringify(value)) {
      return;
    }

    prevValueRef.current = value;
    setSaveStatus('saving');

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        await onSave();
        setSaveStatus('saved');
        // Clear saved status after a bit
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        setSaveStatus('error');
      }
    }, delay);

    return () => clearTimeout(timeoutRef.current);
  }, [value, delay, onSave]);

  return { saveStatus, setSaveStatus };
}
