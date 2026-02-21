'use client';

import { useAuth } from '@/hooks/use-auth';
import { ChatAssistant } from './chat-assistant';

export function AssistantWrapper() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user || user.role === 'guest') return null;

  return <ChatAssistant />;
}
