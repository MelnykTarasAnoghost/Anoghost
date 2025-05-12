"use client"

import type React from "react"
import { forwardRef, useRef, useState } from "react"
import { Paperclip, File, ImageIcon, FileText, Film, Music, X } from "lucide-react"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(({ onFileSelect, disabled = false }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showOptions, setShowOptions] = useState(false)

  // Use the forwarded ref or the local ref
  const fileInputRef = (ref as React.RefObject<HTMLInputElement>) || inputRef

  const handleClick = () => {
    setShowOptions(!showOptions)
  }

  const handleFileClick = (type: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type
      fileInputRef.current.click()
    }
    setShowOptions(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(files[0])
    }
  }

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case "image/*":
        return <ImageIcon size={14} />
      case "video/*":
        return <Film size={14} />
      case "audio/*":
        return <Music size={14} />
      case "text/*":
        return <FileText size={14} />
      default:
        return <File size={14} />
    }
  }

  const fileTypes = [
    { type: "image/*", label: "Image" },
    { type: "video/*", label: "Video" },
    { type: "audio/*", label: "Audio" },
    { type: "text/*", label: "Document" },
    { type: "*/*", label: "Any File" },
  ]

  return (
    <div className="relative">
      <input type="file" ref={fileInputRef} onChange={handleChange} className="hidden" disabled={disabled} />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="text-gray-400 hover:text-[#FF4D00] transition-colors"
      >
        <Paperclip size={18} />
      </button>

      {showOptions && (
        <div className="absolute bottom-full right-0 mb-2 p-2 bg-[#1a1a1a] rounded-lg border border-[#333333] text-xs w-40 z-10">
          <div className="flex justify-between items-center mb-2 px-2">
            <span className="text-gray-300 font-medium tracking-tight">File Types</span>
            <button
              onClick={() => setShowOptions(false)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-white border border-[#333333]"
            >
              <X size={12} />
            </button>
          </div>
          <div className="space-y-1">
            {fileTypes.map((fileType) => (
              <button
                key={fileType.type}
                onClick={() => handleFileClick(fileType.type)}
                className="w-full text-left px-3 py-2 rounded flex items-center hover:bg-[#333333] text-gray-300 hover:text-white transition-colors font-light"
              >
                <span className="mr-2">{getFileTypeIcon(fileType.type)}</span>
                <span>{fileType.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

FileUpload.displayName = "FileUpload"
