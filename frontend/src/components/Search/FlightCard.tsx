"use client"

import type React from "react"
import { Luggage, Info } from "lucide-react"
import { format, parseISO, isValid } from "date-fns"
import { useNavigate } from "react-router-dom"
import { useState } from "react" // Ensure useEffect is imported
import axios from "axios"
import { AirlineLogo } from "../common/AirlineLogo"
import { getFareQuote } from "../../services/fareService"
import FareOptionsModal from "../FareModal/FareOptionsModal"

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
  onViewFareRules?: (flightId: string) => void
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
  onViewFareRules,
}) => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [previousFare, setPreviousFare] = useState<number | null>(null)
  const [updatedFare, setUpdatedFare] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<any>(null)
  const [searchParams, setSearchParams] = useState<any>(null)
  const [validationInfo, setValidationInfo] = useState<any>(null)
  const [showFareOptions, setShowFareOptions] = useState(false)
  const [fareOptions, setFareOptions] = useState<any[]>([])
  const [fareQuoteData, setFareQuoteData] = useState<any>(null) // To store the whole FareQuote response
  const [fareQuoteResultIndex, setFareQuoteResultIndex] = useState<string | null>(null)

  const handleBookNow = async () => {
    setIsLoading(true)
    setError("")

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
      // Store the original price for comparison
      const originalPrice = Number.parseFloat(flight.OptionPriceInfo.TotalPrice)
      setPreviousFare(originalPrice)
      setFareQuoteResultIndex(null) // Reset before new quote

      // Make sure we're using the correct ResultIndex
      const originalSearchReultIndex = flight.OptionId?.toString() || flight.SearchSegmentId?.toString() || ""
      console.log("FlightCard: Sending FareQuote request for originalSearchReultIndex:", originalSearchReultIndex)

      // Call the FareQuote API
      const fareQuoteResponse = await getFareQuote(tokenId, traceId, originalSearchReultIndex)

      console.log("FareQuote response:", fareQuoteResponse)

      if (fareQuoteResponse.Response && fareQuoteResponse.Response.Results) {
        const quoteResults = fareQuoteResponse.Response.Results
        setFareQuoteData(quoteResults) // Store full quote data
        setFareQuoteResultIndex(quoteResults.ResultIndex) // <<< STORE FARE QUOTE RESULT INDEX
        console.log("FlightCard: Stored fareQuoteResultIndex:", quoteResults.ResultIndex)

        // Check if price has changed
        const newPrice = quoteResults.Fare.PublishedFare
        const originalPrice = Number.parseFloat(flight.OptionPriceInfo.TotalPrice)
        const priceDifference = Math.abs(newPrice - originalPrice)

        console.log(`Original price: ${originalPrice}, New price: ${newPrice}, Difference: ${priceDifference}`)

        // Extract validation information from quoteResults
        if (quoteResults) {
          setValidationInfo({
            isGSTMandatory: quoteResults.IsGSTMandatory,
            isPanRequiredAtBook: quoteResults.IsPanRequiredAtBook,
            isPanRequiredAtTicket: quoteResults.IsPanRequiredAtTicket,
            isPassportRequiredAtBook: quoteResults.IsPassportRequiredAtBook,
            isPassportRequiredAtTicket: quoteResults.IsPassportRequiredAtTicket,
            isHoldAllowed: quoteResults.IsHoldAllowed, // Assuming IsHoldAllowed is part of quoteResults
            isRefundable: quoteResults.IsRefundable, // Assuming IsRefundable is part of quoteResults
          })
        }

        // Generate fare options based on the base fare
        const baseFare = newPrice || originalPrice

        // Generate fare options that match your design
        const generatedFareOptions = [
          {
            name: "SAVER",
            price: Math.round(baseFare * 0.95), // 5% less than base fare
            description: "Basic fare with limited flexibility",
            baggage: {
              cabinBaggage: "7 Kgs",
              checkInBaggage: "15 Kgs",
            },
            flexibility: {
              cancellationFee: `Cancellation fee starts at ₹ ${Math.round(baseFare * 0.08)} (up to 4 hours before departure)`,
              dateChangeFee: `Date Change fee starts at ₹ ${Math.round(baseFare * 0.05)} up to 4 hrs before departure`,
              isFreeChange: false,
            },
            seats: {
              free: false,
              complimentaryMeals: false,
            },
            benefits: {
              priorityCheckIn: false,
              priorityBoarding: false,
              extraBaggage: "",
              expressCheckIn: false,
            },
            worth: 0,
          },
          {
            name: "FARE BY FARECLUBS",
            price: baseFare,
            description: "Standard fare with some flexibility",
            baggage: {
              cabinBaggage: "7 Kgs",
              checkInBaggage: "15 Kgs",
            },
            flexibility: {
              cancellationFee: `Cancellation fee starts at ₹ ${Math.round(baseFare * 0.06)} (up to 4 hours before departure)`,
              dateChangeFee: "Free Date Change",
              isFreeChange: true,
            },
            seats: {
              free: false,
              complimentaryMeals: false,
            },
            benefits: {
              priorityCheckIn: false,
              priorityBoarding: false,
              extraBaggage: "",
              expressCheckIn: false,
            },
            worth: Math.round(baseFare * 0.04),
          },
          {
            name: "FLEXI PLUS",
            price: Math.round(baseFare * 1.05), // 5% more than base fare
            description: "Flexible fare with added benefits",
            baggage: {
              cabinBaggage: "7 Kgs",
              checkInBaggage: "15 Kgs",
            },
            flexibility: {
              cancellationFee: `Lower Cancellation fee of ₹ ${Math.round(baseFare * 0.05)} (up to 4 hours before departure)`,
              dateChangeFee: `Lower Date Change fee ₹ ${Math.round(baseFare * 0.025)} up to 4 hrs before departure`,
              isFreeChange: false,
            },
            seats: {
              free: true,
              complimentaryMeals: true,
            },
            benefits: {
              priorityCheckIn: false,
              priorityBoarding: false,
              extraBaggage: "",
              expressCheckIn: false,
            },
            worth: 0,
          },
          {
            name: "PREMIUM",
            price: Math.round(baseFare * 1.15), // 15% more than base fare
            description: "Premium fare with maximum flexibility and benefits",
            baggage: {
              cabinBaggage: "7 Kgs",
              checkInBaggage: "20 Kgs",
            },
            flexibility: {
              cancellationFee: `Lower Cancellation fee of ₹ ${Math.round(baseFare * 0.035)} (up to 4 hours before departure)`,
              dateChangeFee: "Free Date Change up to 4 hrs before departure",
              isFreeChange: true,
            },
            seats: {
              free: true,
              complimentaryMeals: true,
            },
            benefits: {
              priorityCheckIn: true,
              priorityBoarding: true,
              extraBaggage: "5 Kgs",
              expressCheckIn: true,
            },
            worth: Math.round(baseFare * 0.06),
          },
        ]

        setFareOptions(generatedFareOptions)

        // Show significant price change popup if needed
        if (priceDifference > 30) {
          console.log(`Significant price change detected: ${originalPrice} -> ${newPrice}`)
          setPreviousFare(originalPrice)
          setUpdatedFare(newPrice)
          setShowPopup(true)
          setIsLoading(false)
          return
        }

        // Show fare options modal
        setShowFareOptions(true)
      } else {
        setError(fareQuoteResponse.Error?.ErrorMessage || "Failed to get fare quote. Please try again.")
      }
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

  const handleSelectFare = (fareOption: any) => {
    setShowFareOptions(false)

    // Get the TokenId and TraceId from localStorage
    const tokenId = localStorage.getItem("tokenId") || localStorage.getItem("TokenId")
    const traceId = localStorage.getItem("traceId")

    const resultIndexForBooking =
      fareQuoteResultIndex || flight.OptionId?.toString() || flight.SearchSegmentId?.toString() || ""
    console.log(
      "FlightCard: Navigating to booking with resultIndexForBooking:",
      resultIndexForBooking,
      "(fareQuoteResultIndex was:",
      fareQuoteResultIndex,
      ")",
    )

    // Create a modified flight object with the selected fare price
    const modifiedFlight = {
      ...flight,
      OptionPriceInfo: {
        ...flight.OptionPriceInfo,
        TotalPrice: fareOption.price.toString(),
        // Adjust base price and tax proportionally
        TotalBasePrice: Math.round(fareOption.price * 0.85).toString(),
        TotalTax: Math.round(fareOption.price * 0.15).toString(),
      },
      // Add selected fare details
      SelectedFare: {
        name: fareOption.name,
        benefits: fareOption.benefits,
        baggage: fareOption.baggage,
        flexibility: fareOption.flexibility,
        seats: fareOption.seats,
      },
    }

    // Get search params to determine trip type
    const storedSearchParams = localStorage.getItem("searchParams")
    const searchParams = storedSearchParams ? JSON.parse(storedSearchParams) : null

    // Explicitly set these based on actual search params, not assumptions
    // For one-way flights, we explicitly set isRoundTrip to false and returnFlight to null
    const isRoundTrip = searchParams?.tripType === "round-trip"
    const isMultiCity = searchParams?.tripType === "multi-city"

    navigate("/booking", {
      state: {
        flight: modifiedFlight,
        searchParams: searchParams,
        tokenId: tokenId,
        traceId: traceId,
        fareQuoteResponse: { Response: { Results: fareQuoteData || { Fare: { PublishedFare: fareOption.price } } } },
        validationInfo: validationInfo,
        resultIndex: resultIndexForBooking,
        selectedFare: fareOption,
        // Explicitly set these based on actual search params, not assumptions
        isRoundTrip: isRoundTrip,
        isMultiCity: isMultiCity,
        // For one-way flights, we explicitly set returnFlight to null
        returnFlight: null,
        multiCityFlights: null,
      },
    })
  }

  const handleContinueBooking = () => {
    setShowPopup(false)
    setShowFareOptions(true)
  }

  const handleGoBack = () => {
    setShowPopup(false)
    // Stay on search results page
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

  const handleViewFareRules = () => {
    if (onViewFareRules) {
      onViewFareRules(OptionId.toString())
    }
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

      {/* Price Change Popup */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center w-96">
            {/* Company Logo */}
            <div className="flex justify-center mb-4">
              <img
                src="/images/logo.png"
                alt="FareClubs Logo"
                className="h-16"
                onError={(e) => {
                  e.currentTarget.src = "/community-travel-deals.png"
                }}
              />
            </div>

            <h2 className="text-xl font-semibold mb-6">Fare Update</h2>

            <div className="flex justify-between items-center p-4 bg-gray-100 rounded mb-6">
              <div className="text-left">
                <p className="text-gray-600 text-sm">Previous Fare:</p>
                <p className="text-lg font-semibold text-red-500">₹{previousFare?.toFixed(2)}</p>
              </div>
              <div className="text-2xl font-bold text-gray-400">→</div>
              <div className="text-right">
                <p className="text-gray-600 text-sm">Updated Fare:</p>
                <p className="text-lg font-semibold text-green-500">₹{updatedFare?.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex justify-between gap-4">
              <button
                onClick={handleContinueBooking}
                className="flex-1 px-4 py-2 bg-[#007AFF] text-white rounded hover:bg-blue-600 transition-colors"
              >
                Continue Booking
              </button>
              <button
                onClick={handleGoBack}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fare Options Modal */}
      <FareOptionsModal
        isOpen={showFareOptions}
        onClose={() => setShowFareOptions(false)}
        flight={flight}
        onSelectFare={handleSelectFare}
        fareOptions={fareOptions}
      />

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
            <div className="mt-4 flex justify-end">
              <button onClick={handleViewFareRules} className="text-[#007aff] hover:text-[#0056b3] text-sm font-medium">
                View Fare Rules
              </button>
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
            <div className="pt-2 flex justify-end">
              <button onClick={handleViewFareRules} className="text-[#007aff] hover:text-[#0056b3] text-sm font-medium">
                View Fare Rules
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FlightCard
