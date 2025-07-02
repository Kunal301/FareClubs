"use client"

import type React from "react"
import { useState, useEffect } from "react"
import axios from "axios"

interface LoginProps {
  onLoginSuccess: (tokenId: string, memberInfo: any) => void
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Check if we already have a valid token
  // useEffect(() => {
  //   const storedToken = localStorage.getItem("tokenId")
  //   const tokenTimestamp = localStorage.getItem("tokenTimestamp")

  //   if (storedToken && tokenTimestamp) {
  //     const tokenDate = new Date(Number.parseInt(tokenTimestamp))
  //     const currentDate = new Date()

  //     // Check if token is from today (same day)
  //     if (
  //       tokenDate.getDate() === currentDate.getDate() &&
  //       tokenDate.getMonth() === currentDate.getMonth() &&
  //       tokenDate.getFullYear() === currentDate.getFullYear()
  //     ) {
  //       // Token is still valid, we can use it
  //       const memberInfo = JSON.parse(localStorage.getItem("memberInfo") || "{}")
  //       onLoginSuccess(storedToken, memberInfo)
  //     }
  //   }
  // }, [onLoginSuccess])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Get the user's IP address (in a real app, you might want to use a service for this)
      // For now, we'll use a placeholder IP
      const endUserIp = "192.168.1.1" // This should be the actual user's IP in production

      const response = await axios.post(
        "http://Sharedapi.tektravels.com/SharedData.svc/rest/Authenticate",
        {
          ClientId: "ApiIntegrationNew",
          UserName: username,
          Password: password,
          EndUserIp: endUserIp,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      )

      console.log("API Response:", response.data)

      if (response.data.Status === 1) {
        // 1 means Successful
        // Store token and timestamp consistently as "tokenId" (lowercase)
        localStorage.setItem("tokenId", response.data.TokenId)
        localStorage.setItem("sessionId", response.data.TokenId) // Also set sessionId
        localStorage.setItem("tokenTimestamp", Date.now().toString())
        localStorage.setItem("memberInfo", JSON.stringify(response.data.Member))

        // This will trigger navigation to /dashboard in App.tsx
        onLoginSuccess(response.data.TokenId, response.data.Member)
      } else {
        // Handle different error statuses
        let errorMessage = "Authentication failed"
        switch (response.data.Status) {
          case 2: // Failed
            errorMessage = "Authentication failed"
            break
          case 3: // InCorrectUserName
            errorMessage = "Incorrect username"
            break
          case 4: // InCorrectPassword
            errorMessage = "Incorrect password"
            break
          case 5: // PasswordExpired
            errorMessage = "Password has expired"
            break
          default:
            errorMessage = response.data.Error?.ErrorMessage || "Authentication failed"
        }
        setError(errorMessage)
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("Axios error:", err.message)
        console.error("Error response:", err.response?.data)
        setError(
          err.response?.data?.Error?.ErrorMessage ||
            "Authentication failed. Please check your network connection and try again.",
        )
      } else {
        console.error("Unexpected error:", err)
        setError("An unexpected error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login

