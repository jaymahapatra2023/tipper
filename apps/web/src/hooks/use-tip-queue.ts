'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useOnlineStatus } from './use-online-status';
import { api } from '@/lib/api';

const QUEUE_KEY = 'tipper_tip_queue';
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface QueuedTip {
  id: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

function getQueue(): QueuedTip[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const items: QueuedTip[] = JSON.parse(raw);
    // Filter expired entries
    const now = Date.now();
    return items.filter((item) => now - item.timestamp < EXPIRY_MS);
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedTip[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage full
  }
}

export function useTipQueue(onSuccess?: (id: string) => void) {
  const { isOnline } = useOnlineStatus();
  const prevOnline = useRef(isOnline);

  const queueTip = useCallback((payload: Record<string, unknown>) => {
    const queue = getQueue();
    const entry: QueuedTip = {
      id: `tip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      payload,
      timestamp: Date.now(),
    };
    queue.push(entry);
    saveQueue(queue);
    return entry.id;
  }, []);

  const processQueue = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;

    const remaining: QueuedTip[] = [];
    for (const item of queue) {
      try {
        const res = await api.post('/tips', item.payload);
        if (res.success) {
          onSuccess?.(item.id);
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }
    saveQueue(remaining);
  }, [onSuccess]);

  const removeQueuedTip = useCallback((id: string) => {
    const queue = getQueue();
    saveQueue(queue.filter((item) => item.id !== id));
  }, []);

  const getQueuedTips = useCallback(() => getQueue(), []);

  // Auto-process when transitioning from offline to online
  useEffect(() => {
    if (isOnline && !prevOnline.current) {
      processQueue();
    }
    prevOnline.current = isOnline;
  }, [isOnline, processQueue]);

  return {
    queueTip,
    processQueue,
    removeQueuedTip,
    getQueuedTips,
    hasQueued: getQueue().length > 0,
  };
}
