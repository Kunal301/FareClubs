"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface ApiDebuggerProps {
  isVisible?: boolean
}

const ApiDebugger: React.FC<ApiDebuggerProps> = ({ isVisible = true }) => {
  const [logs, setLogs] = useState<string[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  // Override console.log to capture API-related logs
  useEffect(() => {
    if (!isVisible) return

    const originalConsoleLog = console.log
    const originalConsoleError = console.error

    console.log = (...args) => {
      originalConsoleLog(...args)
      const message = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(" ")

      if (
        message.includes("API") ||
        message.includes("search") ||
        message.includes("request") ||
        message.includes("response")
      ) {
        setLogs((prev) => [...prev, `LOG: ${message}`].slice(-50))
      }
    }

    console.error = (...args) => {
      originalConsoleError(...args)
      const message = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(" ")

      setLogs((prev) => [...prev, `ERROR: ${message}`].slice(-50))
    }

    return () => {
      console.log = originalConsoleLog
      console.error = originalConsoleError
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      className="fixed bottom-0 right-0 z-50 w-full md:w-1/2 lg:w-1/3 bg-gray-900 text-white opacity-90 transition-all duration-300"
      style={{ height: isExpanded ? "300px" : "30px" }}
    >
      <div
        className="p-2 cursor-pointer flex justify-between items-center bg-gray-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>API Debugger {logs.length > 0 ? `(${logs.length})` : ""}</span>
        <button
          className="text-xs bg-red-600 px-2 py-1 rounded"
          onClick={(e) => {
            e.stopPropagation()
            setLogs([])
          }}
        >
          Clear
        </button>
      </div>

      {isExpanded && (
        <div className="p-2 overflow-auto h-[calc(100%-30px)] text-xs font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic">No API logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`mb-1 whitespace-pre-wrap ${log.startsWith("ERROR") ? "text-red-400" : "text-green-300"}`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default ApiDebugger

