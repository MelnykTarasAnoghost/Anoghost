import { Link } from "react-router-dom";

export default function RoomCard({ roomId }) {
  return (
    <Link to={`/chat/${roomId}`} className="block bg-gray-700 p-4 rounded-lg mb-4 text-white hover:bg-gray-600">
      Room: {roomId}
    </Link>
  );
}
