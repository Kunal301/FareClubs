"use client"

import type React from "react"
import { useState } from "react"

interface DebugFareRulesProps {
  tokenId: string
  traceId: string
  resultIndex: string
  segmentNumber?: number
}

const DebugFareRules: React.FC<DebugFareRulesProps> = ({ tokenId, traceId, resultIndex, segmentNumber = 1 }) => {
  const [showDebug, setShowDebug] = useState(true)

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">Debug Fare Rules Parameters</h3>

      {showDebug && (
        <div className="bg-gray-100 p-4 rounded mb-4 text-sm font-mono">
          <div className="mb-2">
            <strong>Segment Number:</strong> {segmentNumber}
          </div>
          <div className="mb-2">
            <strong>TokenId:</strong>
            <div className="break-all">{tokenId}</div>
            <div className="text-xs text-gray-600">Length: {tokenId.length}</div>
          </div>
          <div className="mb-2">
            <strong>TraceId:</strong>
            <div className="break-all">{traceId}</div>
            <div className="text-xs text-gray-600">
              Length: {traceId.length} | Is Multi-city: {traceId.includes("-multi-") ? "Yes" : "No"} | Is GUID format:{" "}
              {/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(traceId) ? "Yes" : "No"}
            </div>
          </div>
          <div className="mb-2">
            <strong>ResultIndex:</strong>
            <div className="break-all">{resultIndex}</div>
            <div className="text-xs text-gray-600">
              Length: {resultIndex.length} | Is Scientific:{" "}
              {resultIndex.includes("e+") || resultIndex.includes("E+") ? "Yes" : "No"} | Is Number:{" "}
              {!isNaN(Number(resultIndex)) ? "Yes" : "No"}
            </div>
          </div>
        </div>
      )}

      <div className="text-red-600 p-4 border border-red-300 rounded">
        <h4 className="font-semibold mb-2">❌ Current Issue:</h4>
        <p>The parameters being passed are incorrect for multi-city fare rules:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>
            <strong>ResultIndex</strong> is in scientific notation (e.g., "1.7e+8") but should be an encoded string
          </li>
          <li>
            <strong>TraceId</strong> might be the wrong one for this specific segment
          </li>
          <li>These parameters need to come from the correct flight selection data</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-300 rounded">
        <h4 className="font-semibold mb-2">✅ Expected Format:</h4>
        <div className="text-sm">
          <div className="mb-1">
            <strong>TokenId:</strong> GUID format (looks correct)
          </div>
          <div className="mb-1">
            <strong>TraceId:</strong> Clean GUID without "-multi-" suffix
          </div>
          <div className="mb-1">
            <strong>ResultIndex:</strong> Long encoded string like "OB1[TBO]ur..."
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowDebug(!showDebug)}
        className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        {showDebug ? "Hide" : "Show"} Debug Info
      </button>
    </div>
  )
}

export default DebugFareRules
