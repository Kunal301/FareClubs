"use client"

import type React from "react"
import { useEffect } from "react"
import "./SessionTimeout.css"

interface SessionTimeoutModalProps {
  onSignInAgain: () => void
}

const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({ onSignInAgain }) => {
  // Calculate the inactive time (15 minutes)
  const inactiveTime = 15

  // Add class to body to prevent scrolling and interaction
  useEffect(() => {
    document.body.classList.add("session-expired")

    return () => {
      document.body.classList.remove("session-expired")
    }
  }, [])

  const handleSignInClick = (e: React.MouseEvent) => {
    e.preventDefault()
    console.log("Sign In Again button clicked")
    onSignInAgain()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        {/* Company Logo */}
        <div className="flex justify-center mb-6">
          <img src="/images/fareclubs.jpg" alt="FareClubs Logo" className="h-16 object-contain" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Session Expired</h2>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          You were inactive for {inactiveTime} minutes. For security reasons, your session has expired. Please sign in
          again to continue.
        </p>

        {/* Button */}
        <button
          onClick={handleSignInClick}
          className="w-full py-3 px-4 bg-[#007aff] hover:bg-[#0056b3] text-white font-medium rounded-md transition-colors"
        >
          Sign In Again
        </button>
      </div>
    </div>
  )
}

export default SessionTimeoutModal

