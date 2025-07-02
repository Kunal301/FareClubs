"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { getFareQuote } from "../../services/fareService"

interface FareQuoteInfoProps {
  tokenId: string
  traceId: string
  resultIndex: string
  originalPrice: number
  onPriceChange?: (newPrice: number, isPriceChanged: boolean) => void
  onValidationInfo?: (validationInfo: any) => void
}

const FareQuoteInfo: React.FC<FareQuoteInfoProps> = ({
  tokenId,
  traceId,
  resultIndex,
  originalPrice,
  onPriceChange,
  onValidationInfo,
}) => {
  const [fareQuote, setFareQuote] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isPriceChanged, setIsPriceChanged] = useState<boolean>(false)
  const [newPrice, setNewPrice] = useState<number | null>(null)

  useEffect(() => {
    const fetchFareQuote = async () => {
      if (!tokenId || !traceId || !resultIndex) {
        setError("Missing required parameters")
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await getFareQuote(tokenId, traceId, resultIndex)

        if (response.Response && response.Response.Results) {
          setFareQuote(response.Response.Results)

          // Check if price has changed
          const quotePrice = response.Response.Results.Fare.PublishedFare
          if (quotePrice !== originalPrice) {
            setIsPriceChanged(true)
            setNewPrice(quotePrice)
            onPriceChange?.(quotePrice, true)
          } else {
            onPriceChange?.(quotePrice, false)
          }

          // Extract validation information
          const validationInfo = {
            isGSTMandatory: response.Response.Results.IsGSTMandatory,
            isPanRequiredAtBook: response.Response.Results.IsPanRequiredAtBook,
            isPanRequiredAtTicket: response.Response.Results.IsPanRequiredAtTicket,
            isPassportRequiredAtBook: response.Response.Results.IsPassportRequiredAtBook,
            isPassportRequiredAtTicket: response.Response.Results.IsPassportRequiredAtTicket,
            isHoldAllowed: response.Response.Results.IsHoldAllowed,
            isRefundable: response.Response.Results.IsRefundable,
          }

          onValidationInfo?.(validationInfo)
        } else {
          setError("No fare quote information available.")
        }
      } catch (error) {
        console.error("Error fetching fare quote:", error)
        setError("Failed to fetch fare quote. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchFareQuote()
  }, [tokenId, traceId, resultIndex, originalPrice, onPriceChange, onValidationInfo])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#007aff]"></div>
        <span className="ml-2">Verifying fare...</span>
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>
  }

  if (!fareQuote) {
    return <div className="text-gray-500 p-4">No fare information available.</div>
  }

  if (isPriceChanged && newPrice !== null) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Fare has changed</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                The fare for this flight has changed from ₹{originalPrice.toFixed(2)} to ₹{newPrice.toFixed(2)}.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-green-800">Fare verified</h3>
          <div className="mt-2 text-sm text-green-700">
            <p>The fare for this flight has been verified and is still available at ₹{originalPrice.toFixed(2)}.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FareQuoteInfo
