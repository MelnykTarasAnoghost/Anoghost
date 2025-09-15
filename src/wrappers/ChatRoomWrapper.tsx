"use client"

import { useLocation } from "react-router-dom" // Import the useLocation hook
import { ChatRoomProvider } from "../contexts/ChatRoomContext"
import ChatRoomPage from "../pages/ChatRoomPage"

const ChatRoomWrapper = () => {
  const location = useLocation() // Get the location object

  return (
    <ChatRoomProvider locationState={location.state}> {/* Pass location.state as a prop */}
      <ChatRoomPage />
    </ChatRoomProvider>
  )
}

export default ChatRoomWrapper