"use client"

import { useLocation } from "react-router-dom" // Import the useLocation hook
import { ChatRoomProvider } from "../contexts/ChatRoomContext"
import CreateRoomPage from "../pages/CreateRoomPage"

const CreateRoomWrapper = () => {
  const location = useLocation() // Get the location object

  return (
    <ChatRoomProvider locationState={location.state}> {/* Pass location.state as a prop */}
      <CreateRoomPage />
    </ChatRoomProvider>
  )
}

export default CreateRoomWrapper