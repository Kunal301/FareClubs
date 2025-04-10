"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { format, parseISO, isValid } from "date-fns"
import { AirlineLogo } from "../common/AirlineLogo"
import { Check, Filter, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"

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

interface MultiCitySelectionViewProps {
  multiCityFlights: any[][]
  searchParams: any
  onBookFlight: (selectedFlightIds: string[]) => void
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

// Update the adaptFlight function to better handle price data
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

    // Ensure we're getting the correct price
    let price = 0
    if (flight.Fare && typeof flight.Fare.PublishedFare === "number") {
      price = flight.Fare.PublishedFare
    } else if (flight.Fare && typeof flight.Fare.PublishedFare === "string") {
      price = Number.parseFloat(flight.Fare.PublishedFare)
    }

    // Log the price for debugging
    console.log(`Flight ${flight.ResultIndex} price: ${price}, raw value: ${flight.Fare?.PublishedFare}`)

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
      Price: price,
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

const MultiCitySelectionView: React.FC<MultiCitySelectionViewProps> = ({
  multiCityFlights,
  searchParams,
  onBookFlight,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0)
  const [selectedFlights, setSelectedFlights] = useState<string[]>([])
  const [showFlightDetails, setShowFlightDetails] = useState(false)
  const [adaptedFlights, setAdaptedFlights] = useState<FlightOption[][]>([])

  // Filter states for each tab
  const [priceRanges, setPriceRanges] = useState<number[][]>([])
  const [selectedStops, setSelectedStops] = useState<number[][]>([])
  const [selectedAirlines, setSelectedAirlines] = useState<string[][]>([])
  const [selectedDepartureTimes, setSelectedDepartureTimes] = useState<string[][]>([])
  const [showFilters, setShowFilters] = useState<boolean[]>([])
  const [filteredFlights, setFilteredFlights] = useState<FlightOption[][]>([])

  // Process flights when component mounts or when flight data changes
  useEffect(() => {
    try {
      console.log("Processing multi-city flights:", multiCityFlights)

      const adaptedFlightsBySegment: FlightOption[][] = []
      const priceRangesBySegment: number[][] = []
      const stopsBySegment: number[][] = []
      const airlinesBySegment: string[][] = []
      const departureTimesBySegment: string[][] = []
      const showFiltersBySegment: boolean[] = []

      multiCityFlights.forEach((segmentFlights, index) => {
        console.log(`Processing segment ${index + 1} with ${segmentFlights?.length || 0} flights`)

        // Handle empty segments gracefully
        if (!segmentFlights || segmentFlights.length === 0) {
          adaptedFlightsBySegment[index] = []
          priceRangesBySegment[index] = [0, 100000]
          stopsBySegment[index] = []
          airlinesBySegment[index] = []
          departureTimesBySegment[index] = []
          showFiltersBySegment[index] = false
          return // Skip to next segment
        }

        const adapted = segmentFlights.map(adaptFlight)
        adaptedFlightsBySegment[index] = adapted

        // Initialize filter states for this segment
        priceRangesBySegment[index] = [
          Math.min(...adapted.map((f) => f.Price), 100000),
          Math.max(...adapted.map((f) => f.Price), 0),
        ]
        stopsBySegment[index] = []
        airlinesBySegment[index] = []
        departureTimesBySegment[index] = []
        showFiltersBySegment[index] = false
      })

      setAdaptedFlights(adaptedFlightsBySegment)
      setPriceRanges(priceRangesBySegment)
      setSelectedStops(stopsBySegment)
      setSelectedAirlines(airlinesBySegment)
      setSelectedDepartureTimes(departureTimesBySegment)
      setShowFilters(showFiltersBySegment)

      // Initialize selected flights array with empty strings
      setSelectedFlights(new Array(multiCityFlights.length).fill(""))
    } catch (error) {
      console.error("Error processing flights:", error)
    }
  }, [multiCityFlights])

  // Add these computed values for min/max prices for the current tab
  const currentTabMinPrice = useMemo(() => {
    if (adaptedFlights[activeTab]?.length > 0) {
      return Math.min(...adaptedFlights[activeTab].map((f) => f.Price), 100000)
    }
    return 0
  }, [adaptedFlights, activeTab])

  const currentTabMaxPrice = useMemo(() => {
    if (adaptedFlights[activeTab]?.length > 0) {
      return Math.max(...adaptedFlights[activeTab].map((f) => f.Price), 0)
    }
    return 100000
  }, [adaptedFlights, activeTab])

  // Add this useEffect to filter flights when filter criteria change
  useEffect(() => {
    const newFilteredFlights = [...adaptedFlights]

    adaptedFlights.forEach((segmentFlights, segmentIndex) => {
      // Filter flights for this segment
      const filtered = segmentFlights.filter((flight) => {
        // Price filter
        if (flight.Price < priceRanges[segmentIndex]?.[0] || flight.Price > priceRanges[segmentIndex]?.[1]) {
          return false
        }

        // Stops filter
        const stops = flight.IsNonStop ? 0 : flight.Segments?.[0]?.length ? flight.Segments[0].length - 1 : 0
        if (selectedStops[segmentIndex]?.length > 0 && !selectedStops[segmentIndex].includes(stops)) {
          return false
        }

        // Airline filter
        if (
          selectedAirlines[segmentIndex]?.length > 0 &&
          !selectedAirlines[segmentIndex].includes(flight.AirlineCode)
        ) {
          return false
        }

        // Departure time filter
        if (selectedDepartureTimes[segmentIndex]?.length > 0) {
          try {
            const departureTime = flight.DepartureTime ? new Date(flight.DepartureTime) : null
            if (!departureTime) return false

            const hours = departureTime.getHours()
            const minutes = departureTime.getMinutes()
            const totalMinutes = hours * 60 + minutes

            const isInSelectedTimeRange = selectedDepartureTimes[segmentIndex].some((timeRange) => {
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

      newFilteredFlights[segmentIndex] = filtered
    })

    setFilteredFlights(newFilteredFlights)
  }, [adaptedFlights, priceRanges, selectedStops, selectedAirlines, selectedDepartureTimes])

  // Add these helper functions for filter operations
  const resetFilters = (segmentIndex: number) => {
    const newPriceRanges = [...priceRanges]
    const newSelectedStops = [...selectedStops]
    const newSelectedAirlines = [...selectedAirlines]
    const newSelectedDepartureTimes = [...selectedDepartureTimes]

    if (adaptedFlights[segmentIndex]?.length > 0) {
      const minPrice = Math.min(...adaptedFlights[segmentIndex].map((f) => f.Price), 100000)
      const maxPrice = Math.max(...adaptedFlights[segmentIndex].map((f) => f.Price), 0)
      newPriceRanges[segmentIndex] = [minPrice, maxPrice]
    }

    newSelectedStops[segmentIndex] = []
    newSelectedAirlines[segmentIndex] = []
    newSelectedDepartureTimes[segmentIndex] = []

    setPriceRanges(newPriceRanges)
    setSelectedStops(newSelectedStops)
    setSelectedAirlines(newSelectedAirlines)
    setSelectedDepartureTimes(newSelectedDepartureTimes)
  }

  const handleDepartureTimeChange = (segmentIndex: number, timeRange: string) => {
    const newSelectedDepartureTimes = [...selectedDepartureTimes]

    if (!newSelectedDepartureTimes[segmentIndex]) {
      newSelectedDepartureTimes[segmentIndex] = []
    }

    if (newSelectedDepartureTimes[segmentIndex].includes(timeRange)) {
      newSelectedDepartureTimes[segmentIndex] = newSelectedDepartureTimes[segmentIndex].filter((t) => t !== timeRange)
    } else {
      newSelectedDepartureTimes[segmentIndex] = [...newSelectedDepartureTimes[segmentIndex], timeRange]
    }

    setSelectedDepartureTimes(newSelectedDepartureTimes)
  }

  const handleSelectFlight = (segmentIndex: number, flightId: string) => {
    const newSelectedFlights = [...selectedFlights]
    newSelectedFlights[segmentIndex] = flightId
    setSelectedFlights(newSelectedFlights)

    // Log the selection for debugging
    console.log(`Selected flight ${flightId} for segment ${segmentIndex}`)
    console.log("Current selections:", newSelectedFlights)

    // If this is the last segment, don't automatically move to the next tab
    if (segmentIndex < multiCityFlights.length - 1) {
      setActiveTab(segmentIndex + 1)
    }
  }

  const handleBookNow = () => {
    // Check if all segments have a selected flight
    const allSegmentsSelected = selectedFlights.every((id, index) => {
      // Only check segments that have flights available
      if (multiCityFlights[index] && multiCityFlights[index].length > 0) {
        return id !== ""
      }
      // Skip validation for segments with no flights
      return true
    })

    if (allSegmentsSelected) {
      // Filter out empty selections (for segments with no flights)
      const validSelections = selectedFlights.filter((id) => id !== "")

      if (validSelections.length === 0) {
        alert("Please select at least one flight before booking")
        return
      }

      console.log("Booking flights with IDs:", validSelections)
      onBookFlight(validSelections)
    } else {
      // Find the first segment without a selection and switch to it
      const missingSegmentIndex = selectedFlights.findIndex((id, index) => {
        return id === "" && multiCityFlights[index] && multiCityFlights[index].length > 0
      })

      if (missingSegmentIndex !== -1) {
        setActiveTab(missingSegmentIndex)
        alert("Please select a flight for all segments before booking")
      }
    }
  }

  // Calculate total price of all selected flights
  const totalPrice = useMemo(() => {
    let total = 0

    selectedFlights.forEach((flightId, segmentIndex) => {
      if (flightId && adaptedFlights[segmentIndex]) {
        const flight = adaptedFlights[segmentIndex].find((f) => f.ResultIndex === flightId)
        if (flight && typeof flight.Price === "number") {
          total += flight.Price
        }
      }
    })

    return Math.round(total)
  }, [selectedFlights, adaptedFlights])

  const renderFlightCard = (flight: FlightOption, isSelected: boolean, onSelect: () => void) => {
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
            <div className="text-lg font-bold">
              ₹{typeof flight.Price === "number" ? Math.round(flight.Price).toLocaleString() : "0"}
            </div>
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
    segmentIndex: number,
    showFilter: boolean,
    setShowFilter: (show: boolean) => void,
    priceRange: number[],
    setPriceRange: (range: number[]) => void,
    selectedStopsForSegment: number[],
    setSelectedStopsForSegment: (stops: number[]) => void,
    selectedAirlinesForSegment: string[],
    setSelectedAirlinesForSegment: (airlines: string[]) => void,
    selectedDepartureTimesForSegment: string[],
    handleDepartureTimeChangeForSegment: (timeRange: string) => void,
    resetFiltersForSegment: () => void,
    minPrice: number,
    maxPrice: number,
    airlines: { code: string; name: string }[],
  ) => {
    return (
      <div className="mb-4">
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="flex items-center gap-2 text-[#007aff] hover:text-[#0056b3] mb-2"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">{showFilter ? "Hide Filters" : "Show Filters"}</span>
          {showFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFilter && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-4">
              <h3 className="text-sm font-medium">Filters</h3>
              <button onClick={resetFiltersForSegment} className="text-sm text-[#007aff] hover:text-[#0056b3]">
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
                  onChange={(e) => {
                    const newPriceRanges = [...priceRanges]
                    newPriceRanges[segmentIndex] = [Number(e.target.value), priceRange[1]]
                    setPriceRanges(newPriceRanges)
                  }}
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
                  onChange={(e) => {
                    const newPriceRanges = [...priceRanges]
                    newPriceRanges[segmentIndex] = [priceRange[0], Number(e.target.value)]
                    setPriceRanges(newPriceRanges)
                  }}
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
                      checked={selectedStopsForSegment.includes(stop)}
                      onChange={() => {
                        const newSelectedStops = [...selectedStops]
                        if (!newSelectedStops[segmentIndex]) {
                          newSelectedStops[segmentIndex] = []
                        }

                        if (newSelectedStops[segmentIndex].includes(stop)) {
                          newSelectedStops[segmentIndex] = newSelectedStops[segmentIndex].filter((s) => s !== stop)
                        } else {
                          newSelectedStops[segmentIndex] = [...newSelectedStops[segmentIndex], stop]
                        }

                        setSelectedStops(newSelectedStops)
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
                      checked={selectedAirlinesForSegment.includes(airline.code)}
                      onChange={() => {
                        const newSelectedAirlines = [...selectedAirlines]
                        if (!newSelectedAirlines[segmentIndex]) {
                          newSelectedAirlines[segmentIndex] = []
                        }

                        if (newSelectedAirlines[segmentIndex].includes(airline.code)) {
                          newSelectedAirlines[segmentIndex] = newSelectedAirlines[segmentIndex].filter(
                            (a) => a !== airline.code,
                          )
                        } else {
                          newSelectedAirlines[segmentIndex] = [...newSelectedAirlines[segmentIndex], airline.code]
                        }

                        setSelectedAirlines(newSelectedAirlines)
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
                      checked={selectedDepartureTimesForSegment.includes(timeRange)}
                      onChange={() => handleDepartureTimeChangeForSegment(timeRange)}
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

  // Get the city pairs from searchParams
  const getCityPair = (index: number) => {
    if (searchParams.multiCityTrips && searchParams.multiCityTrips[index]) {
      const trip = searchParams.multiCityTrips[index]
      return {
        from: trip.from,
        to: trip.to,
        date: trip.date ? format(new Date(trip.date), "dd MMM yyyy") : "N/A",
      }
    }
    return { from: "N/A", to: "N/A", date: "N/A" }
  }

  // Update the renderEmptySegment function to be more informative
  const renderEmptySegment = (segmentIndex: number) => {
    const cityPair = getCityPair(segmentIndex)

    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Flights Found</h3>
        <p className="text-gray-500 mb-4">
          We couldn't find any flights for this segment ({cityPair.from} → {cityPair.to} on {cityPair.date}).
        </p>
        <div className="text-left p-4 bg-blue-50 rounded-lg mb-4 max-w-md mx-auto">
          <h4 className="font-medium text-blue-800 mb-2">Possible reasons:</h4>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li>No direct flights available for this route</li>
            <li>The selected date may not have any scheduled flights</li>
            <li>The route may require a connecting flight</li>
            <li>Try searching for this route as a one-way trip</li>
          </ul>
        </div>
        <p className="text-gray-500">Try adjusting your search criteria or selecting a different date.</p>
      </div>
    )
  }

  // Check if any segments have flights
  const hasAnyFlights = multiCityFlights.some((segment) => segment && segment.length > 0)

  return (
    <div className="container mx-auto">
      {!hasAnyFlights && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-500 mr-2 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">No flights found for your multi-city search</h3>
              <p className="text-sm text-amber-700 mt-1">
                Try searching for each segment individually as one-way trips. Multi-city searches may have limited
                availability.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs for each segment - styled like the round-trip tabs */}
      <div className="border-b mb-6">
        <div className="flex overflow-x-auto">
          {multiCityFlights.map((_, index) => {
            const cityPair = getCityPair(index)
            const isActive = activeTab === index
            const isSelected = selectedFlights[index] !== ""
            const hasFlights = multiCityFlights[index] && multiCityFlights[index].length > 0

            return (
              <button
                key={index}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                  isActive ? "text-[#007aff] border-b-2 border-[#007aff]" : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab(index)}
              >
                <div className="flex items-center gap-1">
                  <span>
                    {index === 0
                      ? "1st Segment: "
                      : index === 1
                        ? "2nd Segment: "
                        : index === 2
                          ? "3rd Segment: "
                          : `${index + 1}th Segment: `}
                    {cityPair.from} → {cityPair.to}
                  </span>
                  {isSelected && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-800 text-xs rounded-full">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                  {!hasFlights && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-amber-100 text-amber-800 text-xs rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Current tab content */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          {multiCityFlights.map((segmentFlights, segmentIndex) => {
            // Only render the active tab
            if (segmentIndex !== activeTab) return null

            const cityPair = getCityPair(segmentIndex)

            return (
              <div key={segmentIndex}>
                <div className="bg-gray-100 p-4 mb-4 rounded-lg">
                  <h2 className="text-lg font-bold">
                    {cityPair.from} → {cityPair.to}
                    <span className="ml-2 text-sm font-normal text-gray-600">{cityPair.date}</span>
                  </h2>
                </div>

                {/* Filters for this segment - only show if we have flights */}
                {segmentFlights &&
                  segmentFlights.length > 0 &&
                  renderFilterSection(
                    segmentIndex,
                    showFilters[segmentIndex] || false,
                    (show) => {
                      const newShowFilters = [...showFilters]
                      newShowFilters[segmentIndex] = show
                      setShowFilters(newShowFilters)
                    },
                    priceRanges[segmentIndex] || [0, 100000],
                    (range) => {
                      const newPriceRanges = [...priceRanges]
                      newPriceRanges[segmentIndex] = range
                      setPriceRanges(newPriceRanges)
                    },
                    selectedStops[segmentIndex] || [],
                    (stops) => {
                      const newSelectedStops = [...selectedStops]
                      newSelectedStops[segmentIndex] = stops
                      setSelectedStops(newSelectedStops)
                    },
                    selectedAirlines[segmentIndex] || [],
                    (airlines) => {
                      const newSelectedAirlines = [...selectedAirlines]
                      newSelectedAirlines[segmentIndex] = airlines
                      setSelectedAirlines(newSelectedAirlines)
                    },
                    selectedDepartureTimes[segmentIndex] || [],
                    (timeRange) => handleDepartureTimeChange(segmentIndex, timeRange),
                    () => resetFilters(segmentIndex),
                    adaptedFlights[segmentIndex]?.length > 0
                      ? Math.min(...adaptedFlights[segmentIndex].map((f) => f.Price), 100000)
                      : 0,
                    adaptedFlights[segmentIndex]?.length > 0
                      ? Math.max(...adaptedFlights[segmentIndex].map((f) => f.Price), 0)
                      : 100000,
                    Array.from(new Set(adaptedFlights[segmentIndex]?.map((f) => f.AirlineCode) || [])).map((code) => ({
                      code,
                      name: adaptedFlights[segmentIndex]?.find((f) => f.AirlineCode === code)?.AirlineName || code,
                    })),
                  )}

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {(filteredFlights[segmentIndex]?.length > 0
                    ? filteredFlights[segmentIndex]
                    : adaptedFlights[segmentIndex] || []
                  ).length > 0
                    ? // Render flights if we have them
                      (filteredFlights[segmentIndex]?.length > 0
                        ? filteredFlights[segmentIndex]
                        : adaptedFlights[segmentIndex] || []
                      ).map((flight) =>
                        renderFlightCard(flight, selectedFlights[segmentIndex] === flight.ResultIndex, () =>
                          handleSelectFlight(segmentIndex, flight.ResultIndex),
                        ),
                      )
                    : // Render empty state if no flights
                      renderEmptySegment(segmentIndex)}

                  {filteredFlights[segmentIndex]?.length === 0 && adaptedFlights[segmentIndex]?.length > 0 && (
                    <div className="p-4 text-center bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No flights match your filter criteria</p>
                      <button
                        onClick={() => resetFilters(segmentIndex)}
                        className="mt-2 text-[#007aff] hover:text-[#0056b3] text-sm"
                      >
                        Reset Filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom Summary Bar */}
      {selectedFlights.some((id) => id !== "") && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a2158] text-white p-4 shadow-lg">
          <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
              {selectedFlights.map((flightId, index) => {
                if (!flightId) return null

                const flight = adaptedFlights[index]?.find((f) => f.ResultIndex === flightId)
                if (!flight) return null

                return (
                  <div key={index} className="flex items-center gap-2">
                    <div className="font-medium">
                      {getCityPair(index).from} → {getCityPair(index).to}
                    </div>
                    <div className="text-gray-300">•</div>
                    <AirlineLogo airline={flight.AirlineCode} size="sm" />
                    <div>
                      {formatTime(flight.DepartureTime)} → {formatTime(flight.ArrivalTime)}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold">₹{totalPrice.toLocaleString()}</div>
                <div className="text-sm">Total price</div>
              </div>

              <button
                className="bg-[#007aff] text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
                disabled={selectedFlights.some((id) => id === "")}
                onClick={handleBookNow}
              >
                BOOK NOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiCitySelectionView
