import React from 'react';
import { Send, ChevronDown } from 'lucide-react';
import { AVAILABLE_MODELS, DEFAULT_MODEL } from '../../utils/constants';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  value, 
  onChange, 
  onSend, 
  disabled, 
  placeholder,
  selectedModel = DEFAULT_MODEL,
  onModelChange
}) => {
  return (
    <div className="flex gap-3 items-center">
      {onModelChange && (
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-cosmic-matter border border-stellar-blue/20
                       outline-none text-white text-sm focus:border-stellar-teal
                       focus:ring-1 focus:ring-stellar-teal/30 transition appearance-none pr-8"
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stellar-silver pointer-events-none" />
        </div>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 px-5 py-3 rounded-full bg-cosmic-matter border border-stellar-blue/20
                   outline-none text-white placeholder-stellar-silver focus:border-stellar-teal
                   focus:ring-1 focus:ring-stellar-teal/30 transition"
      />
      <button
        disabled={disabled || !value.trim()}
        onClick={onSend}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-stellar-blue to-stellar-purple
                   flex items-center justify-center hover:opacity-95 transition-opacity disabled:opacity-60"
        title="Send"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ChatInput;
