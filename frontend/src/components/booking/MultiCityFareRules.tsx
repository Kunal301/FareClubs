"use client"

import type React from "react"
import { useState, useEffect } from "react"
import axios from "axios"
import { formatFareRules, extractBaggageInfo, extractCancellationPolicy } from "../../utils/formatFareRules"
import { RefreshCw } from "lucide-react"

interface MultiCityFareRulesProps {
  tokenId: string
  traceId: string
  resultIndex: string
  segmentNumber?: number
}

const MultiCityFareRules: React.FC<MultiCityFareRulesProps> = ({
  tokenId,
  traceId,
  resultIndex,
  segmentNumber = 1,
}) => {
  const [fareRules, setFareRules] = useState<string>("")
  const [baggageInfo, setBaggageInfo] = useState<string | null>(null)
  const [cancellationPolicy, setCancellationPolicy] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"full" | "baggage" | "cancellation">("full")
  const [retryCount, setRetryCount] = useState<number>(0)

  // Fetch fare rules specifically for multi-city bookings
  const fetchFareRules = async () => {
    if (!tokenId || !tokenId.trim()) {
      setError("Missing required parameter: tokenId")
      setIsLoading(false)
      return
    }

    if (!traceId || !traceId.trim()) {
      setError("Missing required parameter: traceId")
      setIsLoading(false)
      return
    }

    if (!resultIndex || resultIndex.trim() === "") {
      setError("Missing required parameter: resultIndex")
      setIsLoading(false)
      return
    }

    // Extract the clean GUID part from multi-city traceId
    let cleanTraceId = traceId
    if (traceId.includes("-multi-")) {
      // Split by "-multi-" and take the first part
      const parts = traceId.split("-multi-")
      cleanTraceId = parts[0]
      console.log("Multi-city traceId detected:", {
        original: traceId,
        cleaned: cleanTraceId,
        isValidGuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanTraceId),
      })
    } else {
      console.log("Regular traceId format:", traceId)
    }

    // Validate the cleaned traceId is a proper GUID
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!guidPattern.test(cleanTraceId)) {
      setError("Invalid TraceID format after cleaning. Please refresh the page and search again.")
      setIsLoading(false)
      return
    }

    // Handle resultIndex - convert from scientific notation if needed
    let cleanResultIndex = resultIndex
    if (resultIndex.includes("e+") || resultIndex.includes("E+")) {
      try {
        // Try to convert scientific notation to regular number, then to string
        const numValue = Number.parseFloat(resultIndex)
        if (!isNaN(numValue)) {
          cleanResultIndex = Math.floor(numValue).toString()
          console.log("Converted resultIndex from scientific notation:", {
            original: resultIndex,
            converted: cleanResultIndex,
          })
        } else {
          setError("Invalid ResultIndex format: Cannot convert from scientific notation.")
          setIsLoading(false)
          return
        }
      } catch (error) {
        setError("Invalid ResultIndex format: Failed to process scientific notation.")
        setIsLoading(false)
        return
      }
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log("Fetching multi-city fare rules with params:", {
        tokenId: tokenId.substring(0, 10) + "...",
        originalTraceId: traceId,
        cleanTraceId: cleanTraceId,
        originalResultIndex: resultIndex.substring(0, 20) + "...",
        cleanResultIndex: cleanResultIndex.substring(0, 20) + "...",
        segmentNumber,
      })

      // Use API_BASE_URL environment variable if available, otherwise fallback to localhost
      const apiBaseUrl = process.env.API_BASE_URL || "https://fareclubs.onrender.com"

      const response = await axios.post(
        `${apiBaseUrl}/api/farerule`,
        {
          EndUserIp: "192.168.10.10",
          TokenId: tokenId,
          TraceId: cleanTraceId, // Use the cleaned and validated traceId
          ResultIndex: cleanResultIndex, // Use the cleaned resultIndex
        },
        {
          timeout: 20000,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      console.log("Multi-city fare rules response:", response.data)

      if (response.data.Response && response.data.Response.Error && response.data.Response.Error.ErrorMessage) {
        // Check for specific error codes and messages
        const errorCode = response.data.Response.Error.ErrorCode
        const errorMessage = response.data.Response.Error.ErrorMessage

        if (errorCode === 5 && errorMessage === "TraceID is not in correct Format") {
          setError("Session expired or invalid TraceID. Please refresh the page and search again.")
          setFareRules("No fare rules available for this flight.")
          return
        }

        if (errorCode === 3 && errorMessage === "Invalid Result Index") {
          // Check if there's still fare rule detail available
          if (response.data.Response.FareRules && response.data.Response.FareRules.FareRuleDetail) {
            setFareRules(formatFareRules(response.data.Response.FareRules.FareRuleDetail))
            setBaggageInfo(extractBaggageInfo(response.data.Response.FareRules.FareRuleDetail))
            setCancellationPolicy(extractCancellationPolicy(response.data.Response.FareRules.FareRuleDetail))
            setError(null)
            return
          }
          setError("Invalid flight selection. Please try selecting the flight again.")
          setFareRules("No fare rules available for this flight.")
          return
        }

        // For other errors, show the error message
        setError(`API Error: ${errorMessage}`)
        setFareRules("No fare rules available for this flight.")
        return
      }

      // Check if FareRules exists and is an array
      if (
        response.data.Response &&
        response.data.Response.FareRules &&
        Array.isArray(response.data.Response.FareRules)
      ) {
        // Extract fare rules from the first item in the array
        const fareRulesItem = response.data.Response.FareRules[0]

        if (fareRulesItem) {
          // Check for FareRuleDetail property first
          if (fareRulesItem.FareRuleDetail && fareRulesItem.FareRuleDetail.trim() !== "") {
            setFareRules(formatFareRules(fareRulesItem.FareRuleDetail))
            setBaggageInfo(extractBaggageInfo(fareRulesItem.FareRuleDetail))
            setCancellationPolicy(extractCancellationPolicy(fareRulesItem.FareRuleDetail))
          }
          // If no FareRuleDetail, try to construct from other properties
          else {
            // Construct a readable fare rule from available properties
            let constructedRules = ""

            if (fareRulesItem.Airline) {
              constructedRules += `AIRLINE: ${fareRulesItem.Airline}\n\n`
            }

            if (fareRulesItem.FareBasisCode) {
              constructedRules += `FARE BASIS CODE: ${fareRulesItem.FareBasisCode}\n\n`
            }

            if (fareRulesItem.Origin && fareRulesItem.Destination) {
              constructedRules += `ROUTE: ${fareRulesItem.Origin} - ${fareRulesItem.Destination}\n\n`
            }

            // Add baggage information if available
            if (fareRulesItem.FareInclusions && fareRulesItem.FareInclusions.length > 0) {
              constructedRules += "BAGGAGE ALLOWANCE:\n"
              fareRulesItem.FareInclusions.forEach((inclusion: { Description?: string }) => {
                if (inclusion.Description) {
                  constructedRules += `${inclusion.Description}\n`
                }
              })
              constructedRules += "\n"
            }

            // Add cancellation information if available
            if (fareRulesItem.IsRefundable !== undefined) {
              constructedRules += `CANCELLATION POLICY:\n`
              constructedRules += fareRulesItem.IsRefundable
                ? "This fare is refundable, subject to airline cancellation fees.\n\n"
                : "This fare is non-refundable.\n\n"
            }

            if (constructedRules) {
              setFareRules(formatFareRules(constructedRules))
              setBaggageInfo(extractBaggageInfo(constructedRules))
              setCancellationPolicy(extractCancellationPolicy(constructedRules))
            } else {
              setFareRules(
                "No detailed fare rules available for this flight. Please check the airline's website for more information.",
              )
            }
          }
        } else {
          setFareRules("No fare rules available for this flight.")
        }
      } else if (
        response.data.Response &&
        response.data.Response.FareRules &&
        response.data.Response.FareRules.FareRuleDetail
      ) {
        // Handle the original expected structure as a fallback
        const ruleText = response.data.Response.FareRules.FareRuleDetail || ""
        if (ruleText && ruleText.trim() !== "") {
          setFareRules(formatFareRules(ruleText))
          setBaggageInfo(extractBaggageInfo(ruleText))
          setCancellationPolicy(extractCancellationPolicy(ruleText))
        } else {
          setFareRules("No fare rules available for this flight.")
        }
      } else {
        setFareRules("No fare rules available for this flight.")
      }
    } catch (error) {
      console.error("Error fetching multi-city fare rules:", error)

      // Handle retry logic
      if (retryCount < 3) {
        console.log(`Retry attempt ${retryCount + 1} of 3`)
        setRetryCount((prev) => prev + 1)
        return
      }

      if (axios.isAxiosError(error)) {
        if (error.code === "ERR_NETWORK") {
          const apiBaseUrl = process.env.API_BASE_URL || "https://fareclubs.onrender.com"
          setError(`Network error: Please check if the backend server is running at ${apiBaseUrl}`)
        } else if (error.response) {
          const errorMessage = error.response.data?.Description || error.message
          if (errorMessage.includes("TraceID") || errorMessage.includes("TraceId")) {
            setError("Session expired or invalid TraceID. Please refresh the page and search again.")
          } else if (errorMessage.includes("TokenId") || errorMessage.includes("Token")) {
            setError("Session expired or invalid token. Please refresh the page and search again.")
          } else if (errorMessage.includes("ResultIndex")) {
            setError("Invalid flight selection. Please try selecting the flight again.")
          } else {
            setError(`Failed to fetch fare rules: ${errorMessage}`)
          }
        } else if (error.request) {
          setError("No response received from server. Please check your internet connection.")
        } else {
          setError(`Failed to fetch fare rules: ${error.message}`)
        }
      } else {
        setError("Failed to fetch fare rules. Please try again.")
      }
      setFareRules("No fare rules available for this flight.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFareRules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId, traceId, resultIndex, retryCount])

  const handleRetry = () => {
    setRetryCount(0) // Reset retry count to start fresh
    fetchFareRules()
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="mb-4 border-b">
        <div className="flex space-x-4">
          <button
            className={`pb-2 px-1 ${activeTab === "full" ? "text-[#007aff] border-b-2 border-[#007aff]" : "text-gray-500"}`}
            onClick={() => setActiveTab("full")}
          >
            Full Fare Rules
          </button>
          <button
            className={`pb-2 px-1 ${activeTab === "baggage" ? "text-[#007aff] border-b-2 border-[#007aff]" : "text-gray-500"}`}
            onClick={() => setActiveTab("baggage")}
          >
            Baggage
          </button>
          <button
            className={`pb-2 px-1 ${activeTab === "cancellation" ? "text-[#007aff] border-b-2 border-[#007aff]" : "text-gray-500"}`}
            onClick={() => setActiveTab("cancellation")}
          >
            Cancellation Policy
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#007aff]"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 text-center">
          <p className="mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="flex items-center justify-center mx-auto px-4 py-2 bg-[#007aff] text-white rounded-md hover:bg-blue-600"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </button>
        </div>
      ) : (
        <div className="fare-rules-content max-h-96 overflow-y-auto p-2">
          {activeTab === "full" && <div dangerouslySetInnerHTML={{ __html: fareRules }} />}
          {activeTab === "baggage" && (
            <div>
              {baggageInfo ? (
                <div dangerouslySetInnerHTML={{ __html: baggageInfo }} />
              ) : (
                <p className="text-gray-500">No specific baggage information found in fare rules.</p>
              )}
            </div>
          )}
          {activeTab === "cancellation" && (
            <div>
              {cancellationPolicy ? (
                <div dangerouslySetInnerHTML={{ __html: cancellationPolicy }} />
              ) : (
                <p className="text-gray-500">No specific cancellation policy found in fare rules.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>
          Note: The fare rules are provided by the airline and are subject to change. Please check the airline's website
          for the most up-to-date information.
        </p>
      </div>
    </div>
  )
}

export default MultiCityFareRules
