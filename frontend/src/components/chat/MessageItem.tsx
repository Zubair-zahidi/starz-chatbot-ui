import React from 'react';
import { Trash2, Bot, User } from 'lucide-react';
import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  onDelete?: () => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isOwn, onDelete }) => {
  return (
    <div className={['flex items-end gap-3', isOwn ? 'justify-end' : 'justify-start'].join(' ')}>
      {!isOwn && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-stellar-blue to-stellar-teal flex items-center justify-center">
          <Bot className="w-5 h-5" />
        </div>
      )}

      <div
        className={[
          'max-w-[75%] rounded-2xl px-5 py-4 border backdrop-blur-md',
          isOwn
            ? 'bg-gradient-to-br from-stellar-pink/10 to-stellar-orange/10 border-stellar-pink/25'
            : 'bg-gradient-to-br from-stellar-blue/10 to-stellar-teal/10 border-stellar-blue/25',
        ].join(' ')}
      >
        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
        <div className="mt-2 flex items-center justify-between gap-4">
          <span className="text-xs text-stellar-silver">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {onDelete && isOwn && (
            <button
              onClick={onDelete}
              className="text-stellar-silver hover:text-red-300 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isOwn && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-stellar-pink to-stellar-orange flex items-center justify-center">
          <User className="w-5 h-5" />
        </div>
      )}
    </div>
  );
};

export default MessageItem;
