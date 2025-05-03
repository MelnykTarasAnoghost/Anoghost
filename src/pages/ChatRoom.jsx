import { useParams } from "react-router-dom";

export default function ChatRoom() {
  const { roomId } = useParams();

  return (
    <div className="flex flex-col h-screen bg-gray-800 text-white p-4">
      <h2 className="text-2xl font-semibold mb-4">Room: {roomId}</h2>
      {/* Тут будет чат-компонент */}
    </div>
  );
}
