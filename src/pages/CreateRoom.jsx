import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';

export default function CreateRoom() {
  const [roomName, setRoomName] = useState("");
  const navigate = useNavigate();

  function handleCreateRoom() {
    const roomId = uuidv4();
    navigate(`/chat/${roomId}`);
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <input
        type="text"
        placeholder="Room Name (optional)"
        className="p-3 mb-6 bg-gray-700 rounded-lg w-72"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
      />
      <button
        onClick={handleCreateRoom}
        className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-xl"
      >
        Create Room
      </button>
    </div>
  );
}
