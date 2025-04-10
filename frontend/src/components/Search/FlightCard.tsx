"use client"

import type React from "react"
import { Luggage, Info } from "lucide-react"
import { format, parseISO, isValid } from "date-fns"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import axios from "axios"
import { AirlineLogo } from "../common/AirlineLogo"

interface FlightCardProps {
  flight: {
    OptionId: any
    SearchSegmentId: number
    JourneyTime: number
    OptionSegmentsInfo: {
      DepartureAirport: string
      ArrivalAirport: string
      DepartureTime: string
      ArrivalTime: string
      MarketingAirline: string
      FlightNumber: string
    }[]
    OptionPriceInfo: {
      TotalPrice: string
      TotalBasePrice: string
      TotalTax: string
      PaxPriceDetails: {
        PaxType: string
        BasePrice: string
        FuelSurcharge: string
        AirportTax: string
        UdfCharge: string
        CongestionCharge: string
        SupplierAddCharge: string
      }[]
    }
    IsLCC?: boolean
    ResultFareType?: string
  }
  selectedTab: string | null
  onTabClick: (flightId: number, tabName: string) => void
  getAirlineImage: (airline: string) => string
  isSelected: boolean
  onSelect: () => void
  onBook: (flightId: number) => void
  OptionId: string | number // Updated to accept both string and number
}

// Function to get fare type label
const getFareTypeLabel = (fareType: string | undefined) => {
  switch (fareType) {
    case "2":
      return "Regular Fare"
    case "3":
      return "Student Fare"
    case "4":
      return "Armed Forces"
    case "5":
      return "Senior Citizen"
    default:
      return "Regular Fare"
  }
}

export const FlightCard: React.FC<FlightCardProps> = ({
  flight,
  selectedTab,
  onTabClick,
  getAirlineImage,
  isSelected,
  onSelect,
  onBook,
  OptionId,
}) => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [previousFare, setPreviousFare] = useState<number | null>(null)
  const [updatedFare, setUpdatedFare] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<any>(null)
  const [searchParams, setSearchParams] = useState<any>(null)

  const handleBookNow = async () => {
    setIsLoading(true)

    try {
      // Get the TokenId from localStorage
      const tokenId = localStorage.getItem("tokenId") || localStorage.getItem("TokenId")

      if (!tokenId) {
        console.error("TokenId not found in localStorage")
        setError("You must be logged in to book a flight")
        setIsLoading(false)
        return
      }

      // Get the TraceId from localStorage
      const traceId = localStorage.getItem("traceId")

      if (!traceId) {
        console.error("TraceId not found in localStorage")
        setError("Invalid search results. Please try searching again.")
        setIsLoading(false)
        return
      }

      // Prepare the FareQuote request
      const fareQuoteRequest = {
        EndUserIp: "192.168.10.10", // This should be dynamically determined in production
        TokenId: tokenId,
        TraceId: traceId,
        ResultIndex: flight.OptionId,
      }

      console.log("Sending FareQuote request:", fareQuoteRequest)

      // Call our backend proxy instead of directly calling the TBO API
      const response = await axios.post("http://localhost:5000/api/farequote", fareQuoteRequest, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })

      console.log("FareQuote response:", response.data)

      // Navigate to booking page with the FareQuote response
      navigate("/booking", {
        state: {
          fareQuoteResponse: response.data,
          searchParams: searchParams,
          flight: flight,
        },
      })
    } catch (error) {
      console.error("FareQuote error:", error)
      if (axios.isAxiosError(error)) {
        if (error.code === "ERR_NETWORK") {
          setError("Network error: Please check if the backend server is running at http://localhost:5000")
        } else {
          setError(`Failed to get fare quote: ${error.message}. Please try again.`)
        }
      } else {
        setError("Failed to get fare quote. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueBooking = () => {
    setShowPopup(false)
    navigate("/booking", {
      state: { flight, previousFare, updatedFare },
    })
  }

  const handleGoBack = () => {
    setShowPopup(false)
    navigate("/search-results")
  }

  const formatDateTime = (dateTimeStr: string) => {
    let date = parseISO(dateTimeStr)
    if (!isValid(date)) {
      const [datePart, timePart] = dateTimeStr.split(", ")
      const [day, month, year] = datePart.split("/")
      const isoString = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart}`
      date = parseISO(isoString)
    }
    return format(date, "HH:mm")
  }

  const calculateDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const isNextDay = (departureTime: string, arrivalTime: string) => {
    const depDate = new Date(departureTime)
    const arrDate = new Date(arrivalTime)
    return arrDate.getDate() > depDate.getDate()
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {/* Use our new AirlineLogo component */}
          <AirlineLogo airline={flight.OptionSegmentsInfo[0].MarketingAirline} size="md" />
          <div>
            <div className="font-medium">{flight.OptionSegmentsInfo[0].MarketingAirline}</div>
            <div className="text-sm text-gray-500">{flight.OptionSegmentsInfo[0].FlightNumber}</div>
            <div className="flex items-center mt-1">
              {flight.IsLCC !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded ${flight.IsLCC ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}
                >
                  {flight.IsLCC ? "LCC" : "GDS"}
                </span>
              )}
              {flight.ResultFareType && (
                <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 ml-2">
                  {getFareTypeLabel(flight.ResultFareType)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 px-8">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-xl font-semibold">{formatDateTime(flight.OptionSegmentsInfo[0].DepartureTime)}</div>
              <div className="text-sm text-gray-500">{flight.OptionSegmentsInfo[0].DepartureAirport}</div>
            </div>

            <div className="flex-1 px-4">
              <div className="text-center text-sm text-gray-500">{calculateDuration(flight.JourneyTime)}</div>
              <div className="relative">
                <div className="border-t-2 border-gray-300 absolute w-full top-1/2"></div>
              </div>
              <div className="text-center text-xs text-gray-500">
                {flight.OptionSegmentsInfo.length > 1 ? `${flight.OptionSegmentsInfo.length - 1} Stop` : "Non-stop"}
              </div>
            </div>

            <div className="text-center">
              <div className="text-xl font-semibold">
                {formatDateTime(flight.OptionSegmentsInfo[flight.OptionSegmentsInfo.length - 1].ArrivalTime)}
              </div>
              <div className="text-sm text-gray-500">
                {flight.OptionSegmentsInfo[flight.OptionSegmentsInfo.length - 1].ArrivalAirport}
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end space-x-2">
            <div className="text-2xl font-bold">₹{flight.OptionPriceInfo.TotalPrice}</div>
            {isNextDay(
              flight.OptionSegmentsInfo[0].DepartureTime,
              flight.OptionSegmentsInfo[flight.OptionSegmentsInfo.length - 1].ArrivalTime,
            ) && <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded">Next Day</span>}
          </div>
          <div className="text-sm text-green-600 font-medium">Zero Fees</div>
          <button
            className="mt-2 px-6 py-2 bg-[#007aff] text-white rounded-md hover:bg-[#007aff] transition-colors"
            onClick={handleBookNow}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Book Now"}
          </button>
        </div>
      </div>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center w-1/3">
            <h2 className="text-xl font-semibold mb-4">⚠️ Fare Update</h2>
            <div className="flex justify-between items-center p-4 bg-gray-100 rounded">
              <div className="text-left">
                <p className="text-gray-600">Previous Fare:</p>
                <p className="text-lg font-semibold text-[#eb0066]">₹{previousFare}</p>
              </div>
              <div className="text-left">
                <p className="text-gray-600">Updated Fare:</p>
                <p className="text-lg font-semibold text-green-500">₹{updatedFare}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={handleContinueBooking}
                className="px-4 py-2 bg-[#007AFF] text-white rounded hover:bg-[#007aff]"
              >
                Continue Booking
              </button>
              <button onClick={handleGoBack} className="px-4 py-2 bg-[#FF214C] text-white rounded hover:bg-red-600">
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="border-t pt-4">
        <div className="flex space-x-4 mb-4">
          <button
            className={`${
              selectedTab === "flightDetails" ? "text-[#007aff] border-b-2 border-[#007aff]" : "text-gray-500"
            } pb-2`}
            onClick={() => onTabClick(flight.SearchSegmentId, "flightDetails")}
          >
            Flight Details
          </button>
          <button
            className={`${
              selectedTab === "fareSummary" ? "text-[#007aff] border-b-2 border-[#007aff]" : "text-gray-500"
            } pb-2`}
            onClick={() => onTabClick(flight.SearchSegmentId, "fareSummary")}
          >
            Fare Summary
          </button>
        </div>

        {selectedTab === "flightDetails" && (
          <div className="bg-gray-50 p-4 rounded-lg">
            {flight.OptionSegmentsInfo.map((segment, index) => (
              <div key={index} className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  {/* Use our new AirlineLogo component */}
                  <AirlineLogo airline={segment.MarketingAirline} size="sm" />
                  <div>
                    <div className="font-medium">
                      {segment.MarketingAirline} {segment.FlightNumber}
                    </div>
                    <div className="text-sm text-gray-500">
                      {segment.DepartureAirport} → {segment.ArrivalAirport}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatDateTime(segment.DepartureTime)} - {formatDateTime(segment.ArrivalTime)}
                  </div>
                  <div className="text-sm text-gray-500">{calculateDuration(flight.JourneyTime)}</div>
                </div>
              </div>
            ))}
            <div className="flex items-center space-x-6 text-sm text-gray-600 mt-4">
              <div className="flex items-center">
                <Luggage className="w-4 h-4 mr-2" />
                <span>Check-in: 15 Kg</span>
              </div>
              <div className="flex items-center">
                <Luggage className="w-4 h-4 mr-2" />
                <span>Cabin: 7 Kg</span>
              </div>
              {flight.IsLCC !== undefined && (
                <div className="flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  <span>{flight.IsLCC ? "Low Cost Carrier" : "Global Distribution System"}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === "fareSummary" && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Fare</span>
              <span>₹{flight.OptionPriceInfo.TotalBasePrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Taxes & Fees</span>
              <span>₹{flight.OptionPriceInfo.TotalTax}</span>
            </div>
            {flight.ResultFareType && (
              <div className="flex justify-between text-purple-600">
                <span>Fare Type</span>
                <span>{getFareTypeLabel(flight.ResultFareType)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Total Amount</span>
              <span>₹{flight.OptionPriceInfo.TotalPrice}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

