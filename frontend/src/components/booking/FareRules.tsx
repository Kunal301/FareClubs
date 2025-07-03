"use client"

import type React from "react"
import { useState, useEffect } from "react"
import axios from "axios"
import { formatFareRules, extractBaggageInfo, extractCancellationPolicy } from "../../utils/formatFareRules"
import { RefreshCw } from "lucide-react"

interface FareRulesProps {
  tokenId: string
  traceId: string
  resultIndex: string
}

const FareRules: React.FC<FareRulesProps> = ({ tokenId, traceId, resultIndex }) => {
  const [fareRules, setFareRules] = useState<string>("")
  const [baggageInfo, setBaggageInfo] = useState<string | null>(null)
  const [cancellationPolicy, setCancellationPolicy] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"full" | "baggage" | "cancellation">("full")
  const [retryCount, setRetryCount] = useState<number>(0)

  // Update the fetchFareRules function to properly handle the response structure
  const fetchFareRules = async () => {
    if (!tokenId || !traceId) {
      setError("Missing required parameters: tokenId or traceId")
      setIsLoading(false)
      return
    }

    if (!resultIndex) {
      setError("Missing flight result index")
      setIsLoading(false)
      return
    }

    // Extract the original traceId if it contains the "-multi-" suffix
    let apiTraceId = traceId
    if (apiTraceId.includes("-multi-")) {
      apiTraceId = apiTraceId.split("-multi-")[0]
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log("Fetching fare rules with params:", { tokenId, traceId: apiTraceId, resultIndex })

      const response = await axios.post(
        "https://fareclubs.onrender.com/api/farerule",
        {
          EndUserIp: "192.168.10.10", // This should be dynamically determined in production
          TokenId: tokenId, // Use the original tokenId
          TraceId: apiTraceId, // Use the corrected traceId
          ResultIndex: resultIndex,
        },
        {
          timeout: 15000, // 15 second timeout
        },
      )

      console.log("Fare rules response:", response.data)

      if (response.data.Response && response.data.Response.Error && response.data.Response.Error.ErrorMessage) {
        // Check if it's an "Invalid Result Index" error and there's a FareRuleDetail message
        if (
          response.data.Response.Error.ErrorCode === 3 &&
          response.data.Response.Error.ErrorMessage === "Invalid Result Index" &&
          response.data.Response.FareRules &&
          response.data.Response.FareRules.FareRuleDetail
        ) {
          // Use the FareRuleDetail message instead of showing an error
          setFareRules(formatFareRules(response.data.Response.FareRules.FareRuleDetail))
          setBaggageInfo(extractBaggageInfo(response.data.Response.FareRules.FareRuleDetail))
          setCancellationPolicy(extractCancellationPolicy(response.data.Response.FareRules.FareRuleDetail))
          setError(null)
          return
        }

        // For other errors, show the error message
        setError(`API Error: ${response.data.Response.Error.ErrorMessage}`)
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
      console.error("Error fetching fare rules:", error)
      if (axios.isAxiosError(error)) {
        if (error.code === "ERR_NETWORK") {
          setError("Network error: Please check if the backend server is running at https://fareclubs.onrender.com")
        } else if (error.response) {
          setError(`Failed to fetch fare rules: ${error.response.data?.Description || error.message}`)
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
  }, [tokenId, traceId, resultIndex, retryCount])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
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

export default FareRules
