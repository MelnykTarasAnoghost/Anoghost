// src/components/MessageInput.jsx
import React, { useState } from 'react';

const MessageInput = ({ onSend }: any) => {
  const [message, setMessage] = useState('');

  const send = () => {
    if (message.trim() && typeof onSend === 'function') {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <div className="flex p-4 border-t bg-white">
      <input
        type="text"
        className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none"
        placeholder="Введите сообщение..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
      />
      <button
        onClick={send}
        className="bg-blue-500 text-white px-4 rounded-r-md hover:bg-blue-600"
      >
        ➤
      </button>
    </div>
  );
};

export default MessageInput;
