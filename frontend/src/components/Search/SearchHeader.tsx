"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ArrowLeftRight } from "lucide-react"
import { format, addDays, parse, isValid } from "date-fns"
import "air-datepicker/air-datepicker.css"
import { useDatePicker } from "../../hooks/useDatePicker"
import { getTodayStart } from "../../utils/dateUtils"

// Add the import for validateMultiCityDates at the top of the file
// Add this near the other imports:

import { validateMultiCityDates } from "../../utils/ValidateMultiCity"

// Define CityPair interface to match the one in SearchResults.tsx
interface CityPair {
  from: string
  to: string
  date: string
}

interface SearchHeaderProps {
  searchForm: {
    from: string
    to: string
    date: string
    returnDate?: string
    passengers: number
    tripType: string
    fareType?: string
    preferredAirlines?: string[]
    directFlight?: boolean
    multiCityTrips?: CityPair[]
  }
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onSearchSubmit: (e: React.FormEvent) => void
  onSwapLocations: () => void
  onDateChange: (date: string) => void
  onReturnDateChange: (date: string) => void
  onTripTypeChange: (type: string) => void
  onMultiCityChange?: (index: number, field: keyof CityPair, value: string) => void
  onAddMultiCity?: () => void
  onRemoveMultiCity?: (index: number) => void
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchForm,
  onSearchChange,
  onSearchSubmit,
  onSwapLocations,
  onDateChange,
  onReturnDateChange,
  onTripTypeChange,
  onMultiCityChange,
  onAddMultiCity,
  onRemoveMultiCity,
}) => {
  const [departureDay, setDepartureDay] = useState<string>("")
  const [returnDay, setReturnDay] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  // Add a local form state to avoid immediate changes to the parent component
  const [localTripType, setLocalTripType] = useState(searchForm.tripType)
  // Add a state for validation error inside the SearchHeader component
  // Add this after the other useState declarations
  const [validationError, setValidationError] = useState<string>("")

  // Initialize departure day when component mounts or searchForm.date changes
  useEffect(() => {
    if (searchForm.date) {
      try {
        const date = parse(searchForm.date, "yyyy-MM-dd", new Date())
        if (isValid(date)) {
          setDepartureDay(format(date, "EEEE"))
        }
      } catch (error) {
        console.error("Error parsing departure date:", error)
      }
    }
  }, [searchForm.date])

  // Initialize return day when component mounts or searchForm.returnDate changes
  useEffect(() => {
    if (searchForm.returnDate) {
      try {
        const date = parse(searchForm.returnDate, "yyyy-MM-dd", new Date())
        if (isValid(date)) {
          setReturnDay(format(date, "EEEE"))
        }
      } catch (error) {
        console.error("Error parsing return date:", error)
      }
    }
  }, [searchForm.returnDate])

  // Update local trip type when searchForm.tripType changes
  useEffect(() => {
    setLocalTripType(searchForm.tripType)
  }, [searchForm.tripType])

  // Use the useDatePicker hook for departure date
  const { inputRef: departureInputRef } = useDatePicker({
    onSelect: (date) => {
      if (date) {
        const formattedDate = format(date, "yyyy-MM-dd")
        onDateChange(formattedDate)
        setDepartureDay(format(date, "EEEE"))

        // If return date is earlier than departure date, update it
        if (searchForm.returnDate) {
          const returnDate = new Date(searchForm.returnDate)
          if (returnDate < date) {
            const newReturnDate = format(addDays(date, 1), "yyyy-MM-dd")
            onReturnDateChange(newReturnDate)
            setReturnDay(format(addDays(date, 1), "EEEE"))
          }
        } else if (searchForm.tripType === "round-trip") {
          // If no return date is set for round trip, set a default (next day)
          const newReturnDate = format(addDays(date, 1), "yyyy-MM-dd")
          onReturnDateChange(newReturnDate)
          setReturnDay(format(addDays(date, 1), "EEEE"))
        }
      }
    },
    minDate: getTodayStart(), // Use the utility function
    maxDate: false, // Explicitly set to false
  })

  // Use the useDatePicker hook for return date
  const { inputRef: returnInputRef } = useDatePicker({
    onSelect: (date) => {
      if (date) {
        const formattedDate = format(date, "yyyy-MM-dd")
        onReturnDateChange(formattedDate)
        setReturnDay(format(date, "EEEE"))
      }
    },
    minDate: searchForm.date ? new Date(searchForm.date) : getTodayStart(), // Ensure return date is after departure
    maxDate: false, // Explicitly set to false
    autoClose: true, // Close the datepicker after selection
  })

  const tripOptions = [
    { label: "One Way", value: "one-way" },
    { label: "Round Trip", value: "round-trip" },
    { label: "Multi City", value: "multi-city" },
  ]

  // Handle trip type change locally first
  const handleLocalTripTypeChange = (type: string) => {
    setLocalTripType(type)
    onTripTypeChange(type)
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!searchForm.from || !searchForm.to) {
      setValidationError("Please select origin and destination cities")
      return
    }

    // Validate date fields based on trip type
    if (localTripType === "one-way" || localTripType === "round-trip") {
      const departureInputValue = departureInputRef?.current?.value
    
      if (!searchForm.date || searchForm.date.trim() === "" || !departureInputValue) {
        setValidationError("Please select a departure date")
        return
      }
    }
    
    if (localTripType === "round-trip") {
      const returnInputValue = returnInputRef?.current?.value
    
      if (!searchForm.returnDate || searchForm.returnDate.trim() === "" || !returnInputValue) {
        setValidationError("Please select a return date")
        return
      }
    }
    
    // Validate multi-city trips if applicable
    if (localTripType === "multi-city" && searchForm.multiCityTrips) {
      // Check each trip individually
      for (let i = 0; i < searchForm.multiCityTrips.length; i++) {
        const trip = searchForm.multiCityTrips[i]

        if (!trip.from || trip.from.trim() === "") {
          setValidationError(`Please select origin city for segment ${i + 1}`)
          return
        }

        if (!trip.to || trip.to.trim() === "") {
          setValidationError(`Please select destination city for segment ${i + 1}`)
          return
        }

        if (!trip.date || trip.date.trim() === "") {
          setValidationError(`Please select date for segment ${i + 1}`)
          return
        }
      }

      const validation = validateMultiCityDates(searchForm.multiCityTrips)
      if (!validation.isValid) {
        setValidationError(validation.errorMessage)
        return
      }
    }

    // Clear any previous validation errors
    setValidationError("")

    // Continue with form submission
    onSearchSubmit(e)
  }

  return (
    <div className="bg-gradient-to-r from-[#eb0066] to-[#007aff] py-4">
      <div className="container mx-auto px-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <div className="flex items-center gap-4 mb-2 md:mb-0">
              {tripOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tripType"
                    value={option.value}
                    checked={localTripType === option.value}
                    onChange={() => handleLocalTripTypeChange(option.value)}
                    className="w-4 h-4 accent-[#007aff]"
                  />
                  <span className="text-gray-600 text-sm font-medium">{option.label}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer ml-4">
                <input
                  type="checkbox"
                  name="directFlight"
                  checked={searchForm.directFlight}
                  onChange={onSearchChange}
                  className="w-4 h-4 accent-[#007aff]"
                />
                <span className="text-gray-600 text-sm font-medium">Non-Stop Flights</span>
              </label>
            </div>
          </div>

          {localTripType !== "multi-city" ? (
            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_0fr_1.5fr_1fr_1fr_1fr] gap-2 items-center">
              <div className="bg-[rgba(221,223,225,0.2)] rounded-xl p-3 md:col-span-1 border-none">
                <label className="block text-black font-semibold text-xs mb-1">From</label>
                <input
                  required
                  name="from"
                  type="text"
                  placeholder="NEW DELHI"
                  className="w-full bg-transparent p-0 text-black font-bold text-sm focus:outline-none uppercase"
                  value={searchForm.from}
                  onChange={onSearchChange}
                />
              </div>

              <div className="flex justify-center items-center">
                <button
                  type="button"
                  onClick={onSwapLocations}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm border border-black border-opacity-25"
                >
                  <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="bg-[rgba(221,223,225,0.2)] rounded-xl p-3 md:col-span-1">
                <label className="block text-black font-semibold text-xs mb-1">To</label>
                <input
                  name="to"
                  type="text"
                  placeholder="MUMBAI"
                  value={searchForm.to}
                  onChange={onSearchChange}
                  className="w-full bg-transparent p-0 text-black font-bold text-sm focus:outline-none appearance-none border-none uppercase"
                  required
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 md:col-span-1">
                <label className="block text-gray-500 text-xs mb-1">Departure</label>
                <div className="relative">
                  <input
                    ref={departureInputRef}
                    type="text"
                    className="w-full bg-transparent p-0 text-gray-800 font-medium text-sm focus:outline-none cursor-pointer"
                    placeholder="Select Date"
                    readOnly
                    required
                  />
                  {departureDay && <div className="text-xs text-gray-500 mt-1">{departureDay}</div>}
                </div>
              </div>

              {localTripType === "round-trip" && (
                <div className="bg-gray-50 rounded-lg p-3 md:col-span-1">
                  <label className="block text-gray-500 text-xs mb-1">Return</label>
                  <div className="relative">
                    <input
                      ref={returnInputRef}
                      type="text"
                      className="w-full bg-transparent p-0 text-gray-800 font-medium text-sm focus:outline-none cursor-pointer"
                      placeholder="Select Date"
                      readOnly
                      required={localTripType === "round-trip"}
                    />
                    {returnDay && <div className="text-xs text-gray-500 mt-1">{returnDay}</div>}
                  </div>
                </div>
              )}

              <div className="bg-[rgba(221,223,225,0.2)] rounded-lg p-3 md:col-span-1">
                <label className="block text-gray-500 text-xs mb-1">Passengers</label>
                <select
                  name="passengers"
                  value={searchForm.passengers}
                  onChange={onSearchChange}
                  className="w-full bg-transparent p-0 text-gray-800 font-medium text-sm focus:outline-none appearance-none border-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? "Passenger" : "Passengers"}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="bg-[#007aff] text-white font-semibold rounded-full py-3 px-8 hover:bg-[#007aff] transition-colors md:col-span-1"
                disabled={isLoading}
              >
                {isLoading ? "Searching..." : "Search"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {searchForm.multiCityTrips?.map((trip, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_0.5fr] gap-3 items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div className="bg-white rounded-lg p-3">
                    <label className="block text-gray-500 text-xs mb-1">From</label>
                    <input
                      required
                      type="text"
                      placeholder="Origin City"
                      className="w-full bg-transparent p-0 text-black font-bold text-sm focus:outline-none uppercase"
                      value={trip.from}
                      onChange={(e) => onMultiCityChange?.(index, "from", e.target.value)}
                    />
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <label className="block text-gray-500 text-xs mb-1">To</label>
                    <input
                      required
                      type="text"
                      placeholder="Destination City"
                      className="w-full bg-transparent p-0 text-black font-bold text-sm focus:outline-none uppercase"
                      value={trip.to}
                      onChange={(e) => onMultiCityChange?.(index, "to", e.target.value)}
                    />
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <label className="block text-gray-500 text-xs mb-1">Date</label>
                    <input
                      required
                      type="date"
                      className="w-full bg-transparent p-0 text-gray-800 font-medium text-sm focus:outline-none"
                      value={trip.date}
                      min={format(getTodayStart(), "yyyy-MM-dd")}
                      onChange={(e) => onMultiCityChange?.(index, "date", e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-center">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => onRemoveMultiCity?.(index)}
                        className="text-[#eb0066] hover:text-[#c80057] text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {validationError && (
                <div className="validation-error bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">
                  {validationError}
                </div>
              )}
              <div className="flex justify-between items-center">
                {searchForm.multiCityTrips && searchForm.multiCityTrips.length < 5 && (
                  <button
                    type="button"
                    onClick={onAddMultiCity}
                    className="text-[#007aff] hover:text-[#0056b3] text-sm font-medium"
                  >
                    + Add Another City
                  </button>
                )}

                <div className="flex gap-4 items-center">
                  <div className="bg-[rgba(221,223,225,0.2)] rounded-lg p-3">
                    <label className="block text-gray-500 text-xs mb-1">Passengers</label>
                    <select
                      name="passengers"
                      value={searchForm.passengers}
                      onChange={onSearchChange}
                      className="w-full bg-transparent p-0 text-gray-800 font-medium text-sm focus:outline-none appearance-none border-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? "Passenger" : "Passengers"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="bg-[#007aff] text-white font-semibold rounded-full py-3 px-8 hover:bg-[#007aff] transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? "Searching..." : "Search"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
