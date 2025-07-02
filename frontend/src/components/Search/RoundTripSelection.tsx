"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { format, parseISO, isValid } from "date-fns"
import { AirlineLogo } from "../common/AirlineLogo"
import { Check, Filter, ChevronDown, ChevronUp } from "lucide-react"

interface FlightOption {
  ResultIndex: string
  AirlineCode: string
  AirlineName: string
  FlightNumber: string
  DepartureTime: string
  ArrivalTime: string
  DepartureAirport: string
  ArrivalAirport: string
  Duration: number
  Price: number
  IsNonStop: boolean
  Segments?: any[][] // Add this property to store the original segments data
}

interface RoundTripSelectionViewProps {
  outboundFlights: any[]
  returnFlights: any[]
  searchParams: any
  onBookFlight: (outboundId: string, returnId: string) => void
}

// Update the formatTime function to handle undefined or null values
const formatTime = (dateTimeStr: string | undefined | null) => {
  try {
    if (!dateTimeStr) {
      console.warn("Empty date string provided to formatTime")
      return "N/A"
    }

    const date = parseISO(dateTimeStr)
    if (!isValid(date)) {
      console.warn(`Invalid date format: ${dateTimeStr}`)
      return "N/A"
    }

    return format(date, "HH:mm")
  } catch (error) {
    console.error("Error formatting date:", error, "for date string:", dateTimeStr)
    return "N/A"
  }
}

// Update formatDuration to handle invalid inputs
const formatDuration = (minutes: number | undefined | null) => {
  if (minutes === undefined || minutes === null || isNaN(minutes)) {
    return "N/A"
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours} h ${mins} m`
}

const RoundTripSelectionView: React.FC<RoundTripSelectionViewProps> = ({
  outboundFlights,
  returnFlights,
  searchParams,
  onBookFlight,
}) => {
  const [selectedOutbound, setSelectedOutbound] = useState<string | null>(null)
  const [selectedReturn, setSelectedReturn] = useState<string | null>(null)
  const [showFlightDetails, setShowFlightDetails] = useState(false)
  const [adaptedOutboundFlights, setAdaptedOutboundFlights] = useState<FlightOption[]>([])
  const [adaptedReturnFlights, setAdaptedReturnFlights] = useState<FlightOption[]>([])

  // Add these new state variables inside the RoundTripSelectionView component
  const [outboundPriceRange, setOutboundPriceRange] = useState<number[]>([0, 100000])
  const [returnPriceRange, setReturnPriceRange] = useState<number[]>([0, 100000])
  const [outboundSelectedStops, setOutboundSelectedStops] = useState<number[]>([])
  const [returnSelectedStops, setReturnSelectedStops] = useState<number[]>([])
  const [outboundSelectedAirlines, setOutboundSelectedAirlines] = useState<string[]>([])
  const [returnSelectedAirlines, setReturnSelectedAirlines] = useState<string[]>([])
  const [outboundSelectedDepartureTimes, setOutboundSelectedDepartureTimes] = useState<string[]>([])
  const [returnSelectedDepartureTimes, setReturnSelectedDepartureTimes] = useState<string[]>([])
  const [showOutboundFilters, setShowOutboundFilters] = useState(false)
  const [showReturnFilters, setShowReturnFilters] = useState(false)
  const [filteredOutboundFlights, setFilteredOutboundFlights] = useState<FlightOption[]>([])
  const [filteredReturnFlights, setFilteredReturnFlights] = useState<FlightOption[]>([])

  // Find the selected flight objects
  const selectedOutboundFlight = outboundFlights.find((flight) => flight.ResultIndex === selectedOutbound)
  const selectedReturnFlight = returnFlights.find((flight) => flight.ResultIndex === selectedReturn)

  // Calculate total price
  const totalPrice =
    (selectedOutboundFlight ? selectedOutboundFlight.Fare.PublishedFare : 0) +
    (selectedReturnFlight ? selectedReturnFlight.Fare.PublishedFare : 0)

  // Adapter function to convert API flight data to a simpler format
  const adaptFlight = (flight: any): FlightOption => {
    try {
      if (!flight || !flight.Segments || !flight.Segments[0] || !flight.Segments[0][0]) {
        console.warn("Invalid flight data structure:", flight)
        return {
          ResultIndex: flight?.ResultIndex || "unknown",
          AirlineCode: flight?.AirlineCode || "unknown",
          AirlineName: "Unknown Airline",
          FlightNumber: "N/A",
          DepartureTime: "",
          ArrivalTime: "",
          DepartureAirport: flight?.Segments?.[0]?.[0]?.Origin?.Airport?.AirportCode || "N/A",
          ArrivalAirport: flight?.Segments?.[0]?.[0]?.Destination?.Airport?.AirportCode || "N/A",
          Duration: 0,
          Price: flight?.Fare?.PublishedFare || 0,
          IsNonStop: false,
          Segments: flight?.Segments,
        }
      }

      const segment = flight.Segments[0][0]
      return {
        ResultIndex: flight.ResultIndex,
        AirlineCode: flight.AirlineCode,
        AirlineName: segment.Airline.AirlineName,
        FlightNumber: segment.Airline.FlightNumber,
        DepartureTime: segment.Origin.DepTime,
        ArrivalTime: segment.Destination.ArrTime,
        DepartureAirport: segment.Origin.Airport.AirportCode,
        ArrivalAirport: segment.Destination.Airport.AirportCode,
        Duration: segment.Duration,
        Price: flight.Fare.PublishedFare,
        IsNonStop: flight.Segments[0].length === 1,
        Segments: flight.Segments, // Store the original segments data
      }
    } catch (error) {
      console.error("Error adapting flight:", error, flight)
      return {
        ResultIndex: flight?.ResultIndex || "unknown",
        AirlineCode: flight?.AirlineCode || "unknown",
        AirlineName: "Unknown Airline",
        FlightNumber: "N/A",
        DepartureTime: "",
        ArrivalTime: "",
        DepartureAirport: "N/A",
        ArrivalAirport: "N/A",
        Duration: 0,
        Price: flight?.Fare?.PublishedFare || 0,
        IsNonStop: false,
      }
    }
  }

  // Process flights when component mounts or when flight data changes
  useEffect(() => {
    try {
      const outbound = outboundFlights.map(adaptFlight)
      const returnFlightsList = returnFlights.map(adaptFlight)

      setAdaptedOutboundFlights(outbound)
      setAdaptedReturnFlights(returnFlightsList)
    } catch (error) {
      console.error("Error processing flights:", error)
    }
  }, [outboundFlights, returnFlights])

  // Add these computed values for min/max prices
  const outboundMinPrice = Math.min(...adaptedOutboundFlights.map((f) => f.Price), 100000)
  const outboundMaxPrice = Math.max(...adaptedOutboundFlights.map((f) => f.Price), 0)
  const returnMinPrice = Math.min(...adaptedReturnFlights.map((f) => f.Price), 100000)
  const returnMaxPrice = Math.max(...adaptedReturnFlights.map((f) => f.Price), 0)

  // Add this useEffect to initialize price ranges when flights are loaded
  useEffect(() => {
    if (adaptedOutboundFlights.length > 0) {
      setOutboundPriceRange([outboundMinPrice, outboundMaxPrice])
    }
    if (adaptedReturnFlights.length > 0) {
      setReturnPriceRange([returnMinPrice, returnMaxPrice])
    }
  }, [adaptedOutboundFlights, adaptedReturnFlights, outboundMinPrice, outboundMaxPrice, returnMinPrice, returnMaxPrice])

  // Add this useEffect to filter flights when filter criteria change
  useEffect(() => {
    // Filter outbound flights
    const filteredOutbound = adaptedOutboundFlights.filter((flight) => {
      // Price filter
      if (flight.Price < outboundPriceRange[0] || flight.Price > outboundPriceRange[1]) {
        return false
      }

      // Stops filter
      const stops = flight.IsNonStop ? 0 : flight.Segments?.[0]?.length ? flight.Segments[0].length - 1 : 0
      if (outboundSelectedStops.length > 0 && !outboundSelectedStops.includes(stops)) {
        return false
      }

      // Airline filter
      if (outboundSelectedAirlines.length > 0 && !outboundSelectedAirlines.includes(flight.AirlineCode)) {
        return false
      }

      // Departure time filter
      if (outboundSelectedDepartureTimes.length > 0) {
        try {
          const departureTime = flight.DepartureTime ? new Date(flight.DepartureTime) : null
          if (!departureTime) return false

          const hours = departureTime.getHours()
          const minutes = departureTime.getMinutes()
          const totalMinutes = hours * 60 + minutes

          const isInSelectedTimeRange = outboundSelectedDepartureTimes.some((timeRange) => {
            const [startTime, endTime] = timeRange.split(" - ")
            const [startHour, startMinute = "00"] = startTime.split(":")
            const [endHour, endMinute = "00"] = endTime.split(":")

            const rangeStart = Number.parseInt(startHour) * 60 + Number.parseInt(startMinute)
            const rangeEnd = Number.parseInt(endHour) * 60 + Number.parseInt(endMinute)

            return totalMinutes >= rangeStart && totalMinutes < rangeEnd
          })

          if (!isInSelectedTimeRange) return false
        } catch (error) {
          console.error("Error filtering by departure time:", error)
        }
      }

      return true
    })

    // Filter return flights
    const filteredReturn = adaptedReturnFlights.filter((flight) => {
      // Price filter
      if (flight.Price < returnPriceRange[0] || flight.Price > returnPriceRange[1]) {
        return false
      }

      // Stops filter
      const stops = flight.IsNonStop ? 0 : flight.Segments?.[0]?.length ? flight.Segments[0].length - 1 : 0
      if (returnSelectedStops.length > 0 && !returnSelectedStops.includes(stops)) {
        return false
      }

      // Airline filter
      if (returnSelectedAirlines.length > 0 && !returnSelectedAirlines.includes(flight.AirlineCode)) {
        return false
      }

      // Departure time filter
      if (returnSelectedDepartureTimes.length > 0) {
        try {
          const departureTime = flight.DepartureTime ? new Date(flight.DepartureTime) : null
          if (!departureTime) return false

          const hours = departureTime.getHours()
          const minutes = departureTime.getMinutes()
          const totalMinutes = hours * 60 + minutes

          const isInSelectedTimeRange = returnSelectedDepartureTimes.some((timeRange) => {
            const [startTime, endTime] = timeRange.split(" - ")
            const [startHour, startMinute = "00"] = startTime.split(":")
            const [endHour, endMinute = "00"] = endTime.split(":")

            const rangeStart = Number.parseInt(startHour) * 60 + Number.parseInt(startMinute)
            const rangeEnd = Number.parseInt(endHour) * 60 + Number.parseInt(endMinute)

            return totalMinutes >= rangeStart && totalMinutes < rangeEnd
          })

          if (!isInSelectedTimeRange) return false
        } catch (error) {
          console.error("Error filtering by departure time:", error)
        }
      }

      return true
    })

    setFilteredOutboundFlights(filteredOutbound)
    setFilteredReturnFlights(filteredReturn)
  }, [
    adaptedOutboundFlights,
    adaptedReturnFlights,
    outboundPriceRange,
    returnPriceRange,
    outboundSelectedStops,
    returnSelectedStops,
    outboundSelectedAirlines,
    returnSelectedAirlines,
    outboundSelectedDepartureTimes,
    returnSelectedDepartureTimes,
  ])

  // Add these helper functions for filter operations
  const resetOutboundFilters = () => {
    setOutboundPriceRange([outboundMinPrice, outboundMaxPrice])
    setOutboundSelectedStops([])
    setOutboundSelectedAirlines([])
    setOutboundSelectedDepartureTimes([])
  }

  const resetReturnFilters = () => {
    setReturnPriceRange([returnMinPrice, returnMaxPrice])
    setReturnSelectedStops([])
    setReturnSelectedAirlines([])
    setReturnSelectedDepartureTimes([])
  }

  const handleOutboundDepartureTimeChange = (timeRange: string) => {
    setOutboundSelectedDepartureTimes((prev) => {
      if (prev.includes(timeRange)) {
        return prev.filter((t) => t !== timeRange)
      }
      return [...prev, timeRange]
    })
  }

  const handleReturnDepartureTimeChange = (timeRange: string) => {
    setReturnSelectedDepartureTimes((prev) => {
      if (prev.includes(timeRange)) {
        return prev.filter((t) => t !== timeRange)
      }
      return [...prev, timeRange]
    })
  }

  const handleBookNow = () => {
    if (selectedOutbound && selectedReturn) {
      onBookFlight(selectedOutbound, selectedReturn)
    }
  }

  const renderFlightCard = (flight: FlightOption, isSelected: boolean, onSelect: () => void, isOutbound: boolean) => {
    return (
      <div
        key={flight.ResultIndex}
        className={`border rounded-lg p-4 mb-3 transition-all ${
          isSelected ? "border-[#007aff] bg-blue-50" : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={onSelect}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full border ${isSelected ? "bg-[#007aff] border-[#007aff]" : "border-gray-300"} flex items-center justify-center`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
            <AirlineLogo airline={flight.AirlineCode} size="sm" />
            <div>
              <div className="font-medium">{flight.AirlineName}</div>
              <div className="text-xs text-gray-500">{flight.FlightNumber}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">₹{flight.Price.toLocaleString()}</div>
            <div className="text-xs text-gray-500">per adult</div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-center">
            <div className="text-xl font-semibold">{formatTime(flight.DepartureTime)}</div>
            <div className="text-sm text-gray-600">{flight.DepartureAirport}</div>
          </div>

          <div className="flex-1 px-4">
            <div className="text-center text-xs text-gray-500">{formatDuration(flight.Duration)}</div>
            <div className="relative">
              <div className="border-t border-gray-300 absolute w-full top-1/2"></div>
            </div>
            <div className="text-center text-xs text-gray-500">
              {flight.IsNonStop
                ? "Non stop"
                : `${flight.Segments?.[0]?.length ? flight.Segments[0].length - 1 : 0} Stop${flight.Segments?.[0]?.length && flight.Segments[0].length > 2 ? "s" : ""}`}
            </div>
          </div>

          <div className="text-center">
            <div className="text-xl font-semibold">{formatTime(flight.ArrivalTime)}</div>
            <div className="text-sm text-gray-600">{flight.ArrivalAirport}</div>
          </div>
        </div>

        {flight.IsNonStop && (
          <div className="mt-2">
            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Free Meal</span>
          </div>
        )}
      </div>
    )
  }

  // Add these filter UI components
  const renderFilterSection = (
    isOutbound: boolean,
    showFilters: boolean,
    setShowFilters: React.Dispatch<React.SetStateAction<boolean>>,
    priceRange: number[],
    setPriceRange: React.Dispatch<React.SetStateAction<number[]>>,
    selectedStops: number[],
    setSelectedStops: React.Dispatch<React.SetStateAction<number[]>>,
    selectedAirlines: string[],
    setSelectedAirlines: React.Dispatch<React.SetStateAction<string[]>>,
    selectedDepartureTimes: string[],
    handleDepartureTimeChange: (timeRange: string) => void,
    resetFilters: () => void,
    minPrice: number,
    maxPrice: number,
    airlines: { code: string; name: string }[],
  ) => {
    return (
      <div className="mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-[#007aff] hover:text-[#0056b3] mb-2"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">{showFilters ? "Hide Filters" : "Show Filters"}</span>
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-4">
              <h3 className="text-sm font-medium">Filters</h3>
              <button onClick={resetFilters} className="text-sm text-[#007aff] hover:text-[#0056b3]">
                Reset All
              </button>
            </div>

            {/* Price Range */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Price Range</h4>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={minPrice}
                  max={maxPrice}
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                  className="w-full"
                />
                <span className="text-sm">₹{priceRange[0]}</span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={minPrice}
                  max={maxPrice}
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  className="w-full"
                />
                <span className="text-sm">₹{priceRange[1]}</span>
              </div>
            </div>

            {/* Stops */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Stops</h4>
              <div className="space-y-2">
                {[0, 1, 2].map((stop) => (
                  <label key={stop} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStops.includes(stop)}
                      onChange={() => {
                        setSelectedStops((prev) => {
                          if (prev.includes(stop)) {
                            return prev.filter((s) => s !== stop)
                          }
                          return [...prev, stop]
                        })
                      }}
                      className="w-4 h-4 accent-[#007aff]"
                    />
                    <span className="text-sm">{stop === 0 ? "Non-stop" : stop === 1 ? "1 Stop" : `${stop} Stops`}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Airlines */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Airlines</h4>
              <div className="space-y-2">
                {airlines.map((airline) => (
                  <label key={airline.code} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAirlines.includes(airline.code)}
                      onChange={() => {
                        setSelectedAirlines((prev) => {
                          if (prev.includes(airline.code)) {
                            return prev.filter((a) => a !== airline.code)
                          }
                          return [...prev, airline.code]
                        })
                      }}
                      className="w-4 h-4 accent-[#007aff]"
                    />
                    <span className="text-sm">{airline.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Departure Times */}
            <div>
              <h4 className="text-sm font-medium mb-2">Departure Time</h4>
              <div className="space-y-2">
                {["00:00 - 06:00", "06:00 - 12:00", "12:00 - 18:00", "18:00 - 24:00"].map((timeRange) => (
                  <label key={timeRange} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDepartureTimes.includes(timeRange)}
                      onChange={() => handleDepartureTimeChange(timeRange)}
                      className="w-4 h-4 accent-[#007aff]"
                    />
                    <span className="text-sm">{timeRange}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Outbound Flights Column */}
        <div>
          <div className="bg-gray-100 p-4 mb-4 rounded-lg">
            <h2 className="text-lg font-bold">
              {searchParams.from} → {searchParams.to}
              <span className="ml-2 text-sm font-normal text-gray-600">
                {searchParams.date && format(new Date(searchParams.date), "EEE, dd MMM")}
              </span>
            </h2>
          </div>

          {/* Outbound Filters */}
          {renderFilterSection(
            true,
            showOutboundFilters,
            setShowOutboundFilters,
            outboundPriceRange,
            setOutboundPriceRange,
            outboundSelectedStops,
            setOutboundSelectedStops,
            outboundSelectedAirlines,
            setOutboundSelectedAirlines,
            outboundSelectedDepartureTimes,
            handleOutboundDepartureTimeChange,
            resetOutboundFilters,
            outboundMinPrice,
            outboundMaxPrice,
            Array.from(new Set(adaptedOutboundFlights.map((f) => f.AirlineCode))).map((code) => ({
              code,
              name: adaptedOutboundFlights.find((f) => f.AirlineCode === code)?.AirlineName || code,
            })),
          )}

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {(filteredOutboundFlights.length > 0 ? filteredOutboundFlights : adaptedOutboundFlights).map((flight) =>
              renderFlightCard(
                flight,
                selectedOutbound === flight.ResultIndex,
                () => setSelectedOutbound(flight.ResultIndex),
                true,
              ),
            )}

            {filteredOutboundFlights.length === 0 && adaptedOutboundFlights.length > 0 && (
              <div className="p-4 text-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">No flights match your filter criteria</p>
                <button onClick={resetOutboundFilters} className="mt-2 text-[#007aff] hover:text-[#0056b3] text-sm">
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Return Flights Column */}
        <div>
          <div className="bg-gray-100 p-4 mb-4 rounded-lg">
            <h2 className="text-lg font-bold">
              {searchParams.to} → {searchParams.from}
              <span className="ml-2 text-sm font-normal text-gray-600">
                {searchParams.returnDate && format(new Date(searchParams.returnDate), "EEE, dd MMM")}
              </span>
            </h2>
          </div>

          {/* Return Filters */}
          {renderFilterSection(
            false,
            showReturnFilters,
            setShowReturnFilters,
            returnPriceRange,
            setReturnPriceRange,
            returnSelectedStops,
            setReturnSelectedStops,
            returnSelectedAirlines,
            setReturnSelectedAirlines,
            returnSelectedDepartureTimes,
            handleReturnDepartureTimeChange,
            resetReturnFilters,
            returnMinPrice,
            returnMaxPrice,
            Array.from(new Set(adaptedReturnFlights.map((f) => f.AirlineCode))).map((code) => ({
              code,
              name: adaptedReturnFlights.find((f) => f.AirlineCode === code)?.AirlineName || code,
            })),
          )}

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {(filteredReturnFlights.length > 0 ? filteredReturnFlights : adaptedReturnFlights).map((flight) =>
              renderFlightCard(
                flight,
                selectedReturn === flight.ResultIndex,
                () => setSelectedReturn(flight.ResultIndex),
                false,
              ),
            )}

            {filteredReturnFlights.length === 0 && adaptedReturnFlights.length > 0 && (
              <div className="p-4 text-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">No flights match your filter criteria</p>
                <button onClick={resetReturnFilters} className="mt-2 text-[#007aff] hover:text-[#0056b3] text-sm">
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      {(selectedOutbound || selectedReturn) && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a2158] text-white p-4 shadow-lg">
          <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
              {selectedOutboundFlight && (
                <div className="flex items-center gap-2">
                  <div className="font-medium">Departure</div>
                  <div className="text-gray-300">•</div>
                  <AirlineLogo airline={selectedOutboundFlight.AirlineCode} size="sm" />
                  <div>
                    {formatTime(selectedOutboundFlight.Segments?.[0]?.[0]?.Origin?.DepTime)} →{" "}
                    {formatTime(selectedOutboundFlight.Segments?.[0]?.[0]?.Destination?.ArrTime)}
                  </div>
                  <button
                    className="text-[#007aff] text-sm underline"
                    onClick={() => setShowFlightDetails(!showFlightDetails)}
                  >
                    Flight Details
                  </button>
                </div>
              )}

              {selectedReturnFlight && (
                <div className="flex items-center gap-2">
                  <div className="font-medium">Return</div>
                  <div className="text-gray-300">•</div>
                  <AirlineLogo airline={selectedReturnFlight.AirlineCode} size="sm" />
                  <div>
                    {formatTime(selectedReturnFlight.Segments?.[0]?.[0]?.Origin?.DepTime)} →{" "}
                    {formatTime(selectedReturnFlight.Segments?.[0]?.[0]?.Destination?.ArrTime)}
                  </div>
                  <button
                    className="text-[#007aff] text-sm underline"
                    onClick={() => setShowFlightDetails(!showFlightDetails)}
                  >
                    Flight Details
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold">₹{totalPrice.toLocaleString()}</div>
                <div className="text-sm">per adult</div>
                <button
                  className="text-blue-300 text-sm underline"
                  onClick={() => setShowFlightDetails(!showFlightDetails)}
                >
                  Fare Details
                </button>
              </div>

              <button
                className="bg-[#007aff] text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
                disabled={!selectedOutbound || !selectedReturn}
                onClick={handleBookNow}
              >
                BOOK NOW
              </button>

              {/* <button
                className="border border-white text-white px-6 py-3 rounded-lg font-medium"
                disabled={!selectedOutbound || !selectedReturn}
              >
                LOCK PRICE
              </button> */}
            </div>
          </div>
        </div>
      )}

      {/* Flight Details Modal */}
      {showFlightDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Flight & Fare Details</h3>
              <button className="text-gray-500" onClick={() => setShowFlightDetails(false)}>
                ✕
              </button>
            </div>

            {selectedOutboundFlight && (
              <div className="mb-6">
                <h4 className="font-medium mb-2">Outbound Flight</h4>
                <div className="border rounded p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <AirlineLogo airline={selectedOutboundFlight.AirlineCode} size="md" />
                    <div>
                      <div className="font-medium">
                        {selectedOutboundFlight.Segments?.[0]?.[0]?.Airline?.AirlineName || "Unknown Airline"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedOutboundFlight.Segments?.[0]?.[0]?.Airline?.FlightNumber || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xl font-semibold">
                        {formatTime(selectedOutboundFlight.Segments?.[0]?.[0]?.Origin?.DepTime)}
                      </div>
                      <div className="text-sm">
                        {selectedOutboundFlight.Segments?.[0]?.[0]?.Origin?.Airport?.AirportCode || "N/A"}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-gray-500">
                        {formatDuration(selectedOutboundFlight.Segments?.[0]?.[0]?.Duration)}
                      </div>
                      <div className="border-t border-gray-300 w-32 my-1"></div>
                      <div className="text-xs text-gray-500">
                        {selectedOutboundFlight.Segments?.[0]?.length === 1 ? "Non stop" : "With stops"}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-semibold">
                        {formatTime(selectedOutboundFlight.Segments?.[0]?.[0]?.Destination?.ArrTime)}
                      </div>
                      <div className="text-sm">
                        {selectedOutboundFlight.Segments?.[0]?.[0]?.Destination?.Airport?.AirportCode || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReturnFlight && (
              <div className="mb-6">
                <h4 className="font-medium mb-2">Return Flight</h4>
                <div className="border rounded p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <AirlineLogo airline={selectedReturnFlight.AirlineCode} size="md" />
                    <div>
                      <div className="font-medium">
                        {selectedReturnFlight.Segments?.[0]?.[0]?.Airline?.AirlineName || "Unknown Airline"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedReturnFlight.Segments?.[0]?.[0]?.Airline?.FlightNumber || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xl font-semibold">
                        {formatTime(selectedReturnFlight.Segments?.[0]?.[0]?.Origin?.DepTime)}
                      </div>
                      <div className="text-sm">
                        {selectedReturnFlight.Segments?.[0]?.[0]?.Origin?.Airport?.AirportCode || "N/A"}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-gray-500">
                        {formatDuration(selectedReturnFlight.Segments?.[0]?.[0]?.Duration)}
                      </div>
                      <div className="border-t border-gray-300 w-32 my-1"></div>
                      <div className="text-xs text-gray-500">
                        {selectedReturnFlight.Segments?.[0]?.length === 1 ? "Non stop" : "With stops"}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-semibold">
                        {formatTime(selectedReturnFlight.Segments?.[0]?.[0]?.Destination?.ArrTime)}
                      </div>
                      <div className="text-sm">
                        {selectedReturnFlight.Segments?.[0]?.[0]?.Destination?.Airport?.AirportCode || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">Fare Summary</h4>
              <div className="border rounded p-4">
                <div className="flex justify-between mb-2">
                  <span>Base Fare</span>
                  <span>
                    ₹
                    {(
                      (selectedOutboundFlight?.Fare?.BaseFare || 0) + (selectedReturnFlight?.Fare?.BaseFare || 0)
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Taxes & Fees</span>
                  <span>
                    ₹
                    {(
                      (selectedOutboundFlight?.Fare?.Tax || 0) + (selectedReturnFlight?.Fare?.Tax || 0)
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="border-t my-2"></div>
                <div className="flex justify-between font-bold">
                  <span>Total Amount</span>
                  <span>₹{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="bg-[#007aff] text-white px-6 py-2 rounded-lg font-medium"
                onClick={() => {
                  setShowFlightDetails(false)
                  if (selectedOutbound && selectedReturn) {
                    handleBookNow()
                  }
                }}
              >
                CONTINUE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoundTripSelectionView
