import React from 'react';
import ChatInterface from '../components/chat/ChatInterface';

const ChatPage: React.FC = () => {
  return (
    <div className="quantum-card overflow-hidden h-[calc(100vh-9rem)]">
      <ChatInterface />
    </div>
  );
};

export default ChatPage;
