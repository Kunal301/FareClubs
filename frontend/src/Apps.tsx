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
  const [loading, setLoading] = useState(true) // <-- Step 1
  const navigate = useNavigate()

  // Step 1: Check for existing session on app load
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

    setLoading(false) // <-- Only allow rendering once check is done
  }, [])

  // Update sessionId state when localStorage changes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "sessionId" || event.key === "tokenId" || event.key === "TokenId") {
        const storedSessionId = localStorage.getItem("sessionId")
        const storedTokenId = localStorage.getItem("tokenId") || localStorage.getItem("TokenId")
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

  const handleLoginSuccess = (tokenId: string, memberInfo: any) => {
    setSessionId(tokenId)
    localStorage.setItem("tokenId", tokenId)
    localStorage.setItem("memberInfo", JSON.stringify(memberInfo))
    navigate("/dashboard")
  }

  const ProtectedRoute = React.memo(({ children }: { children: React.ReactNode }) => {
    if (!sessionId) {
      return <Navigate to="/login" replace />
    }
    return <>{children}</>
  })

  // Step 2: Don't render until session check is done
  if (loading) return null;

  return (
    <SessionTimeoutProvider timeoutMinutes={15}>
      <Routes>
        {/* Step 3: Root route defaults to login if not authenticated */}
        <Route path="/" element={<Navigate to={sessionId ? "/dashboard" : "/login"} replace />} />

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

        {/* Catch-all for 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionTimeoutProvider>
  )
}

export default App
