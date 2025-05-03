export default function ChatMessage({ message }) {
    return (
      <div className="p-4 bg-gray-700 rounded-lg text-white max-w-xs mb-2">
        {message}
      </div>
    );
  }
  