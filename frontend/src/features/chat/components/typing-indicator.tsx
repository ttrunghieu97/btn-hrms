'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { TypingUser } from '../utils/types';

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

function formatTypingText(users: TypingUser[]): string {
  if (users.length === 0) return '';
  if (users.length === 1) return `${users[0]!.username} is typing...`;
  if (users.length === 2)
    return `${users[0]!.username} and ${users[1]!.username} are typing...`;
  return `${users[0]!.username} and ${users.length - 1} others are typing...`;
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  return (
    <AnimatePresence>
      {typingUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className='text-muted-foreground px-1 text-xs'
        >
          {formatTypingText(typingUsers)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
