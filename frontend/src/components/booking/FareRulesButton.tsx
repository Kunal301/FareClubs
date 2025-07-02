"use client"

import type React from "react"
import { useState } from "react"
import FareRules from "./FareRules"
import MultiCityFareRules from "./MultiCityFareRules"
import DebugFareRules from "./DebugFareRules"
import { X } from "lucide-react"

interface FareRulesButtonProps {
  tokenId: string
  traceId: string
  resultIndex: string
  isMultiCity?: boolean
  segmentNumber?: number
  buttonText?: string
  className?: string
  debugMode?: boolean
}

const FareRulesButton: React.FC<FareRulesButtonProps> = ({
  tokenId,
  traceId,
  resultIndex,
  isMultiCity = false,
  segmentNumber = 1,
  buttonText = "Fare Rules",
  className = "",
  debugMode = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  const modalTitle = isMultiCity ? `Fare Rules - Segment ${segmentNumber}` : "Fare Rules"

  // Log the parameters for debugging
  console.log("FareRulesButton parameters:", {
    tokenId: tokenId.substring(0, 10) + "...",
    traceId,
    resultIndex: resultIndex.substring(0, 20) + "...",
    isMultiCity,
    segmentNumber,
    debugMode,
  })

  return (
    <>
      <button onClick={openModal} className={`text-[#007aff] hover:text-blue-700 underline text-sm ${className}`}>
        {buttonText} {debugMode && "(DEBUG)"}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">{modalTitle}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {debugMode ? (
                <DebugFareRules
                  tokenId={tokenId}
                  traceId={traceId}
                  resultIndex={resultIndex}
                  segmentNumber={segmentNumber}
                />
              ) : isMultiCity ? (
                <MultiCityFareRules
                  tokenId={tokenId}
                  traceId={traceId}
                  resultIndex={resultIndex}
                  segmentNumber={segmentNumber}
                />
              ) : (
                <FareRules tokenId={tokenId} traceId={traceId} resultIndex={resultIndex} />
              )}
            </div>

            <div className="p-4 border-t flex justify-end">
              <button onClick={closeModal} className="px-4 py-2 bg-[#007aff] text-white rounded-md hover:bg-blue-600">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default FareRulesButton
