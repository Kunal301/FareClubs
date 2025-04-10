"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import SessionTimeoutModal from "../components/SessionTimeoutModal"
import axios from "axios"
import { useRef } from "react"

// At the top of your component


interface SessionTimeoutContextType {
  isSessionExpired: boolean
  resetSession: () => void
  logoutUser: () => void
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined)

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext)
  if (!context) {
    throw new Error("useSessionTimeout must be used within a SessionTimeoutProvider")
  }
  return context
}

interface SessionTimeoutProviderProps {
  children: React.ReactNode
  timeoutMinutes?: number
}

export const SessionTimeoutProvider: React.FC<SessionTimeoutProviderProps> = ({ children, timeoutMinutes = 15 }) => {
  const [isSessionExpired, setIsSessionExpired] = useState(false)
  const [lastActivity, setLastActivity] = useState(Date.now())
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const navigate = useNavigate()

  // Calculate timeout in milliseconds
  const timeoutDuration = timeoutMinutes * 60 * 1000

  // Function to reset the session timeout
  const resetSession = useCallback(() => {
    setLastActivity(Date.now())
    setIsSessionExpired(false)
  }, [])

  // Function to handle user logout
  const logoutUser = useCallback(async () => {
    console.log("Logging out user and redirecting to login page...")

    try {
      // Get required data from localStorage
      const tokenId = localStorage.getItem("tokenId")
      const memberInfoStr = localStorage.getItem("memberInfo")

      if (tokenId && memberInfoStr) {
        const memberInfo = JSON.parse(memberInfoStr)

        // Call logout API
        const response = await axios.post(
          "http://Sharedapi.tektravels.com/SharedData.svc/rest/Logout",
          {
            ClientId: "ApiIntegrationNew",
            EndUserIp: "192.168.1.1", // This should be the actual user's IP in production
            TokenAgencyId: memberInfo.AgencyId,
            TokenMemberId: memberInfo.MemberId,
            TokenId: tokenId,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          },
        )

        console.log("Logout API Response:", response.data)
      }
    } catch (error) {
      console.error("Error during logout:", error)
    } finally {
      // Clear all session data
      localStorage.removeItem("tokenId")
      localStorage.removeItem("tokenTimestamp")
      localStorage.removeItem("memberInfo")
      localStorage.removeItem("searchParams")
      localStorage.removeItem("searchResults")
      localStorage.removeItem("selectedFlight")
      localStorage.removeItem("searchFormData")

      // Reset session state
      setIsSessionExpired(false)

      // Force a hard redirect to the login page
      window.location.href = "/login"
    }
  }, [])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Check for session timeout
  useEffect(() => {
    const tokenId = localStorage.getItem("tokenId")
    if (!tokenId) return
  
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  
    const id = setTimeout(() => {
      const now = Date.now()
      const timeSinceLastActivity = now - lastActivity
  
      if (timeSinceLastActivity >= timeoutDuration) {
        setIsSessionExpired(true)
      }
    }, timeoutDuration)
  
    timeoutRef.current = id
  
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [lastActivity, timeoutDuration])

  // Track user activity
  useEffect(() => {
    // Only track activity if user is logged in and session is not expired
    const tokenId = localStorage.getItem("tokenId")
    if (!tokenId || isSessionExpired) return

    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click", "keypress"]

    const handleUserActivity = () => {
      if (!isSessionExpired) {
        resetSession()
      }
    }

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity)
    })

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity)
      })
    }
  }, [isSessionExpired, resetSession])

  return (
    <SessionTimeoutContext.Provider value={{ isSessionExpired, resetSession, logoutUser }}>
      {children}
      {isSessionExpired && <SessionTimeoutModal onSignInAgain={logoutUser} />}
    </SessionTimeoutContext.Provider>
  )
}

