"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import Login from "./components/login"
import Dashboard from "./components/common/dashboard"
import SearchResults from "./components/SearchResults"
import BookingPage from "./components/booking/BookingPage"
import { SessionTimeoutProvider } from "./context/SessionTimeoutProvider"

const App: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const navigate = useNavigate()

  // Check for existing session on app load
  useEffect(() => {
    const storedSessionId = localStorage.getItem("sessionId")
    const storedTokenId = localStorage.getItem("tokenId") || localStorage.getItem("TokenId")

    // Only set session if both sessionId and tokenId exist
    if (storedSessionId && storedTokenId) {
      setSessionId(storedSessionId)
    } else {
      // Clear any partial session data
      localStorage.removeItem("sessionId")
      localStorage.removeItem("tokenId")
      localStorage.removeItem("TokenId")
      setSessionId(null)
    }
  }, [])

  // Update sessionId state when localStorage changes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Update if sessionId or tokenId changed
      if (event.key === "sessionId" || event.key === "tokenId" || event.key === "TokenId") {
        const storedSessionId = localStorage.getItem("sessionId")
        const storedTokenId = localStorage.getItem("tokenId") || localStorage.getItem("TokenId")

        // Only maintain session if both exist
        if (storedSessionId && storedTokenId) {
          if (storedSessionId !== sessionId) {
            setSessionId(storedSessionId)
          }
        } else {
          setSessionId(null)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [sessionId])

  // Update the handleLoginSuccess function to accept memberInfo
  const handleLoginSuccess = (tokenId: string, memberInfo: any) => {
    setSessionId(tokenId)
    localStorage.setItem("tokenId", tokenId)
    localStorage.setItem("memberInfo", JSON.stringify(memberInfo))
    navigate("/dashboard")
  }

  // Protected route component - memoize to prevent unnecessary re-renders
  const ProtectedRoute = React.memo(({ children }: { children: React.ReactNode }) => {
    if (!sessionId) {
      return <Navigate to="/login" replace />
    }
    return <>{children}</>
  })

  return (
    <SessionTimeoutProvider timeoutMinutes={15}>
      <Routes>
        {/* Redirect root to login or dashboard based on session */}
        <Route path="/" element={sessionId ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />

        {/* Authentication route */}
        <Route
          path="/login"
          element={
            sessionId && (localStorage.getItem("tokenId") || localStorage.getItem("TokenId")) ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard sessionId={sessionId || ""} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/search-results"
          element={
            <ProtectedRoute>
              <SearchResults />
            </ProtectedRoute>
          }
        />

        <Route
          path="/booking"
          element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route for 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionTimeoutProvider>
  )
}

export default App

