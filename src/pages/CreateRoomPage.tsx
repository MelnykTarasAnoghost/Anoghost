"use client"

import { useNavigate } from "react-router-dom"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react"

import { useChatRoom } from "../contexts/ChatRoomContext"
import { useGhostId } from "../contexts/GhostIdContext"
import ChatRoomForm from "../components/ChatRoomForm"
import { useEffect } from "react"

const CreateRoomPage = () => {
  const navigate = useNavigate()
  const { connected } = useWallet()
  const { isRegistered } = useGhostId()
  const { roomData, handleCreateRoom, isLoading, mintingStatus, error, goBack } = useChatRoom()

  // MODIFIED: Create a new submit handler
  const handleSubmit = async (formData: {
    roomName: string
    nickname: string
    isPrivate: boolean
    ghostIds: string[]
  }) => {
    const newRoomData = await handleCreateRoom(formData)
    if (newRoomData) {
      // On success, navigate to the room page with the new data in state
      navigate(`/r`, { state: { roomData: newRoomData } })
    }
  }

  useEffect(() => {
    console.log(roomData)
  }, [roomData])

  const renderLoadingState = () => (
    <div className="p-6 text-center bg-black border border-[#222222] rounded-md animate-fadeIn">
      <div className="mb-6">
        <div className="h-16 w-16 mx-auto rounded-full border border-[#FF4D00] flex items-center justify-center animate-pulse">
          <Loader2 size={24} className="text-[#FF4D00] animate-spin" />
        </div>
      </div>
      <h3 className="text-lg font-medium mb-3 animate-slideIn">Creating Your Chat Room</h3>
      <p className="mb-2 text-gray-400 max-w-md mx-auto transition-all duration-300 ease-in-out">
        {mintingStatus || "Processing your request..."}
      </p>
      <div className="w-full max-w-xs mx-auto bg-[#111111] rounded-full h-1.5 mt-3 mb-4 overflow-hidden">
        <div className="bg-gradient-to-r from-[#FF4D00] to-[#FF6B35] h-1.5 rounded-full animate-pulse transform transition-all duration-500 ease-in-out"></div>
      </div>
      <p className="text-xs text-gray-500 animate-fadeIn animation-delay-300">
        This may take a moment. Please don't close this window.
      </p>
    </div>
  )

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white flex items-center justify-center transition-all duration-300 ease-in-out">
      <div className="w-full max-w-md h-auto max-h-screen p-4 animate-slideIn">
        {error && (
          <div className="mb-4 p-3 bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-md text-[#FF4D00] text-sm flex items-start animate-fadeIn transform transition-all duration-300 ease-in-out hover:bg-[#FF4D00]/15">
            <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0 animate-pulse" />
            <p className="transition-all duration-200">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="relative transform transition-all duration-500 ease-in-out">
            <button
              onClick={goBack}
              className="absolute top-3 left-3 p-2 text-gray-400 hover:text-[#FF4D00] transition-all duration-200 ease-in-out z-10 rounded-full hover:bg-[#FF4D00]/10 transform"
            >
              <ArrowLeft size={18} />
            </button>
            {renderLoadingState()}
          </div>
        ) : (
          <div className="bg-black border border-[#222222] rounded-md relative transform transition-all duration-500 ease-in-out animate-slideIn hover:border-[#333333]">
            <button
              onClick={goBack}
              className="absolute top-3 left-3 p-2 text-gray-400 hover:text-[#FF4D00] transition-all duration-200 ease-in-out z-10 rounded-full hover:bg-[#FF4D00]/10 transform"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="text-center p-4 pt-10 pb-2 animate-fadeIn">
              <h2 className="text-xl font-bold mb-1 transition-all duration-300 ease-in-out">
                Create a new <span className="text-[#FF4D00] animate-pulse">crypto</span> chat
              </h2>
              <p className="text-gray-400 text-xs max-w-lg mx-auto transition-all duration-300 ease-in-out hover:text-gray-300">
                Create a new anonymous chat room with end-to-end encryption.
              </p>
            </div>

            <div className="p-4 transition-all duration-300 ease-in-out">
              {!connected ? (
                <div className="mb-4 text-center animate-fadeIn transform transition-all duration-500 ease-in-out">
                  <p className="text-gray-400 mb-4 text-sm max-w-md mx-auto transition-all duration-300 ease-in-out">
                    Connect your Solana wallet to create a new chat room.
                  </p>
                  <div className="flex justify-center transform transition-all duration-300 ease-in-out">
                    <WalletMultiButton className="!bg-[#FF4D00] !text-black !font-medium !py-2 !px-6 !rounded-md !transition-all !duration-300 !border-none !text-sm !transform !hover:bg-[#FF6B35] !hover:shadow-lg !hover:shadow-[#FF4D00]/25" />
                  </div>
                </div>
              ) : isRegistered ? (
                <div className="animate-slideIn transform transition-all duration-500 ease-in-out">
                  <ChatRoomForm
                    onSubmit={handleSubmit}
                    buttonText="Create Room & Mint NFTs"
                    isLoading={isLoading}
                    showPrivateOption={true}
                  />
                </div>
              ) : (
                <p className="text-center text-gray-400 animate-pulse transition-all duration-300 ease-in-out">
                  Please wait while your anonymous identity is being registered...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateRoomPage
