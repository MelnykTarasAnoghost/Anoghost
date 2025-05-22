"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { validateGhostId } from "../services/socket"
import { Loader2, XCircle, Trash2 } from "lucide-react"

interface GhostIdInputProps {
  value: string
  index: number
  onChange: (value: string) => void
  onRemove: () => void
  showRemoveButton?: boolean
  disabled?: boolean
  error?: string
}

const GhostIdInput: React.FC<GhostIdInputProps> = ({
  value,
  index,
  onChange,
  onRemove,
  showRemoveButton = true,
  disabled = false,
  error,
}) => {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    isValid?: boolean
    error?: string
  } | null>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Reset validation when input changes
    setValidationResult(null)
    onChange(e.target.value)
  }

  const handleBlur = async () => {
    if (!value.trim()) return

    // Clear any existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    setIsValidating(true)
    setValidationResult(null)

    try {
      // Simple direct validation with a timeout safety
      const validationPromise = validateGhostId(value)

      // Set a timeout to prevent infinite loading
      const timeoutPromise = new Promise<{
        success: false
        error: string
      }>((resolve) => {
        validationTimeoutRef.current = setTimeout(() => {
          resolve({
            success: false,
            error: "Validation timed out. Please try again.",
          })
        }, 5000)
      })

      // Race between validation and timeout
      const result = await Promise.race([validationPromise, timeoutPromise])

      // Clear timeout if validation completed
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
        validationTimeoutRef.current = null
      }

      if (result.success) {
        setValidationResult({
          isValid: result.isValid,
          error: result.isValid ? undefined : result.error,
        })
      } else {
        setValidationResult({
          isValid: false,
          error: result.error || "Failed to validate Ghost ID",
        })
      }
    } catch (error) {
      console.error(`Error validating GhostID:`, error)
      setValidationResult({
        isValid: false,
        error: "An unexpected error occurred during validation",
      })
    } finally {
      setIsValidating(false)
    }
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [])

  // Force validation when the component mounts if there's already a value
  useEffect(() => {
    if (value.trim() !== "") {
      handleBlur()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Determine border color based on validation state
  const getBorderColor = () => {
    if (error) return "border-red-500"
    if (validationResult?.isValid) return "border-green-500"
    if (validationResult?.isValid === false) return "border-red-500"
    return "border-[#333333]"
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1 relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Enter GhostID"
          className={`w-full p-1.5 rounded-md bg-black text-white border ${getBorderColor()} focus:outline-none focus:border-[#FF4D00] transition-colors text-xs font-mono`}
          disabled={disabled || isValidating}
        />

        {/* Status indicator */}
        {isValidating && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <Loader2 size={14} className="animate-spin text-gray-400" />
          </div>
        )}

        {/* Error message */}
        {(error || validationResult?.error) && (
          <p className="text-xs text-red-500 mt-0.5">{error || validationResult?.error}</p>
        )}
      </div>

      {showRemoveButton && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          disabled={disabled}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

export default GhostIdInput
