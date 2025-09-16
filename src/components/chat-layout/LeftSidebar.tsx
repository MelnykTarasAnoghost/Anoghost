"use client";

import type React from "react";
import { X, MessageSquarePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Define the shape of a single room in the list
interface UserRoom {
  roomId: string;
  roomName: string;
  participantCount: number;
}

interface LeftSidebarProps {
  usersRooms: UserRoom[];
  activeRoomId: string | null;
  nickname: string;
  onSelectRoom: (roomId: string) => void;
  onClose: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  usersRooms,
  activeRoomId,
  nickname,
  onSelectRoom,
  onClose,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center flex-shrink-0">
        <h2 className="font-medium text-white">Chat Rooms</h2>
        <button
          onClick={onClose}
          className="md:hidden text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-[#1a1a1a] flex-shrink-0">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF7E45] flex items-center justify-center text-black font-medium mr-3">
            {nickname?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{nickname}</p>
            <span className="text-xs text-gray-400">Encrypted Identity</span>
          </div>
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto p-2">
        {usersRooms.map((room) => (
          <button
            key={room.roomId}
            onClick={() => onSelectRoom(room.roomId)}
            className={`w-full text-left p-3 rounded-lg mb-2 flex items-center transition-colors ${
              room.roomId === activeRoomId
                ? "bg-[#1a1a1a]"
                : "hover:bg-[#1a1a1a]/50"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[#222222] flex items-center justify-center font-medium mr-3 flex-shrink-0">
              {room.roomName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{room.roomName}</p>
              <span className="text-xs text-gray-400">
                {room.participantCount} participants
              </span>
            </div>
            {room.roomId === activeRoomId && (
               <div className="w-2 h-2 rounded-full bg-[#FF4D00] ml-2 flex-shrink-0"></div>
            )}
          </button>
        ))}
      </div>

      {/* Footer / Actions */}
      <div className="p-4 py-[23.3px] border-t border-[#1a1a1a] flex-shrink-0">
         <button 
           onClick={() => navigate('/c')}
           className="w-full h-10 px-4 rounded-md text-sm bg-[#111111] text-gray-300 flex items-center justify-center hover:bg-[#222222] transition-colors font-medium"
         >
           <MessageSquarePlus size={16} className="mr-2"/>
           Create New Room
         </button>
      </div>
    </div>
  );
};

export default LeftSidebar;