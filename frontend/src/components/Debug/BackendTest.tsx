"use client"

import type React from "react"
import { useState } from "react"
import axios from "axios"

const BackendTest: React.FC = () => {
  const [status, setStatus] = useState<string>("Not tested")
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const testBackendConnection = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await axios.get("http://localhost:5000/health")
      setStatus(`Connected! Server time: ${response.data.timestamp}`)
    } catch (err) {
      console.error("Backend connection error:", err)
      setError("Failed to connect to backend server. Make sure it is running on port 5000.")
      setStatus("Failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed top-0 right-0 m-4 p-4 bg-white shadow-lg rounded-lg z-50 max-w-md">
      <h3 className="text-lg font-semibold mb-2">Backend Connection Test</h3>
      <div className="mb-2">
        Status:{" "}
        <span
          className={`font-medium ${status === "Failed" ? "text-red-500" : status.includes("Connected") ? "text-green-500" : "text-gray-500"}`}
        >
          {status}
        </span>
      </div>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      <button
        onClick={testBackendConnection}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test Connection"}
      </button>
    </div>
  )
}

export default BackendTest

