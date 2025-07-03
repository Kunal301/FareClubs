"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeftRight, Calendar, Filter } from "lucide-react"
import { format, addDays, parse, isValid } from "date-fns" // Ensure isValid is imported
import "air-datepicker/air-datepicker.css"
import { CustomDropdown } from "../ui/CustomDropdown"
import { useDatePicker } from "../../hooks/useDatePicker"
import { getTodayStart } from "../../utils/dateUtils"
import { validateMultiCityDates, checkConnectingCities } from "../../utils/ValidateMultiCity"
import AirportAutocomplete from "../ui/AirportAutocomplete"
import axios from "axios" // Import axios

interface SearchProps {
  sessionId: string
}

interface CityPair {
  from: string
  to: string
  date: string
}

// Define the base URL for the backend API using the existing environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://fareclubs.onrender.com" // Fallback for local development

const Search: React.FC<SearchProps> = ({ sessionId }) => {
  const navigate = useNavigate()

  const today = new Date()
  const tomorrow = addDays(today, 1)

  // Define initial formatted dates
  const initialDateFormatted = format(today, "yyyy-MM-dd")
  const initialReturnDateFormatted = format(tomorrow, "yyyy-MM-dd")

  const [searchParams, setSearchParams] = useState({
    tripType: "one-way",
    from: "",
    to: "",
    date: initialDateFormatted, // Use the pre-formatted date
    returnDate: initialReturnDateFormatted, // Use the pre-formatted date
    passengers: 1,
    fareType: "regular",
    preferredAirlines: [] as string[],
    directFlight: false,
    multiCityTrips: [] as CityPair[],
  })

  // Ensure initial derived states are robust against invalid dates
  const [departureDay, setDepartureDay] = useState<string>(
    isValid(new Date(searchParams.date)) ? format(new Date(searchParams.date), "EEEE") : "",
  )
  const [returnDay, setReturnDay] = useState<string>(
    isValid(new Date(searchParams.returnDate)) ? format(new Date(searchParams.returnDate), "EEEE") : "",
  )

  useEffect(() => {
    localStorage.removeItem("searchParams")
  }, [])

  // Update derived day states when date changes
  useEffect(() => {
    try {
      const depDate = new Date(searchParams.date)
      if (searchParams.date && isValid(depDate)) {
        setDepartureDay(format(depDate, "EEEE"))
      } else {
        setDepartureDay("")
      }

      const retDate = new Date(searchParams.returnDate)
      if (searchParams.returnDate && searchParams.tripType === "round-trip" && isValid(retDate)) {
        setReturnDay(format(retDate, "EEEE"))
      } else {
        setReturnDay("")
      }
    } catch (e) {
      console.error("Error updating derived date states:", e)
      setDepartureDay("")
      setReturnDay("")
    }
  }, [searchParams.date, searchParams.returnDate, searchParams.tripType])

  const tripOptions = [
    { label: "One Way", value: "one-way" },
    { label: "Round Trip", value: "round-trip" },
    { label: "Multi City", value: "multi-city" },
  ]

  const fareTypeOptions = [
    { label: "Regular", value: "regular" },
    { label: "Student", value: "student" },
    { label: "Armed Forces", value: "armed-forces" },
    { label: "Senior Citizen", value: "senior-citizen" },
  ]

  const airlineOptions = [
    { label: "All Airlines", value: "" },
    { label: "Indigo", value: "6E" },
    { label: "SpiceJet", value: "SG" },
    { label: "Air India", value: "AI" },
    { label: "Vistara", value: "UK" },
    { label: "Akasa Air", value: "QP" },
    { label: "Air India Express", value: "IX" },
  ]

  const passengerOptions = [
    { value: 1, label: "1 Passenger" },
    { value: 2, label: "2 Passengers" },
    { value: 3, label: "3 Passengers" },
    { value: 4, label: "4 Passengers" },
    { value: 5, label: "5 Passengers" },
    { value: 6, label: "6 Passengers" },
    { value: 7, label: "7 Passengers" },
    { value: 8, label: "8 Passengers" },
    { value: 9, label: "9 Passengers" },
  ]

  const { inputRef: departureInputRef } = useDatePicker({
    onSelect: (date) => {
      if (date) {
        const formattedDate = format(date, "yyyy-MM-dd")
        setSearchParams((prev) => ({ ...prev, date: formattedDate }))
        setSearchParams((prev) => {
          if (prev.returnDate) {
            const returnDateObj = new Date(prev.returnDate)
            if (returnDateObj < date) {
              const newReturnDate = format(addDays(date, 1), "yyyy-MM-dd")
              return { ...prev, returnDate: newReturnDate }
            }
          }
          return prev
        })
      } else {
        setSearchParams((prev) => ({ ...prev, date: "" }))
      }
    },
    minDate: getTodayStart(),
    maxDate: false,
  })

  const { inputRef: returnInputRef } = useDatePicker({
    onSelect: (date) => {
      if (date) {
        const formattedDate = format(date, "yyyy-MM-dd")
        setSearchParams((prev) => ({ ...prev, returnDate: formattedDate }))
      } else {
        setSearchParams((prev) => ({ ...prev, returnDate: "" }))
      }
    },
    // FIX: Ensure minDate is always a valid Date object or false
    minDate: searchParams.date && isValid(new Date(searchParams.date)) ? new Date(searchParams.date) : getTodayStart(), // Fallback to today's start if searchParams.date is invalid
    maxDate: false,
    autoClose: true,
  })

  const handlePassengerChange = (value: number | string) => {
    setSearchParams((prev) => ({
      ...prev,
      passengers: Number(value),
    }))
  }

  const handleTripTypeChange = (type: string) => {
    setSearchParams((prev) => {
      let returnDate = prev.returnDate
      if (type === "round-trip" && (!prev.returnDate || prev.returnDate.trim() === "")) {
        if (prev.date && prev.date.trim() !== "") {
          const departureDate = new Date(prev.date)
          returnDate = format(addDays(departureDate, 1), "yyyy-MM-dd")
        } else {
          returnDate = format(addDays(new Date(), 1), "yyyy-MM-dd")
        }
      }

      let initialMultiCityDate = prev.date
      if (!initialMultiCityDate || initialMultiCityDate.trim() === "") {
        initialMultiCityDate = format(new Date(), "yyyy-MM-dd")
      }

      return {
        ...prev,
        tripType: type,
        returnDate: type === "round-trip" ? returnDate : "",
        multiCityTrips:
          type === "multi-city" ? [{ from: prev.from || "", to: prev.to || "", date: initialMultiCityDate }] : [],
      }
    })
  }

  const handleFareTypeChange = (type: string) => {
    setSearchParams((prev) => ({
      ...prev,
      fareType: type,
    }))
  }

  const handleAirlineChange = (airline: string) => {
    setSearchParams((prev) => {
      let updatedAirlines = [...prev.preferredAirlines]
      if (airline === "") {
        updatedAirlines = []
      } else {
        if (updatedAirlines.includes(airline)) {
          updatedAirlines = updatedAirlines.filter((a) => a !== airline)
        } else {
          updatedAirlines.push(airline)
        }
      }
      return { ...prev, preferredAirlines: updatedAirlines }
    })
  }

  const handleMultiCityChange = (index: number, field: keyof CityPair, value: string) => {
    setSearchParams((prev) => {
      const updatedTrips = [...(prev.multiCityTrips || [])]
      if (!updatedTrips[index]) {
        updatedTrips[index] = { from: "", to: "", date: "" }
      }
      updatedTrips[index] = { ...updatedTrips[index], [field]: value }
      return { ...prev, multiCityTrips: updatedTrips }
    })
  }

  const handleAddMultiCity = () => {
    setSearchParams((prev) => {
      const updatedTrips = [...(prev.multiCityTrips || [])]
      if (updatedTrips.length < 5) {
        const newSegmentDate = format(new Date(), "yyyy-MM-dd")
        updatedTrips.push({ from: "", to: "", date: newSegmentDate })
      }
      return { ...prev, multiCityTrips: updatedTrips }
    })
  }

  const handleRemoveMultiCity = (index: number) => {
    setSearchParams((prev) => {
      const updatedTrips = [...(prev.multiCityTrips || [])]
      if (updatedTrips.length > 1) {
        updatedTrips.splice(index, 1)
      }
      return { ...prev, multiCityTrips: updatedTrips }
    })
  }

  const swapFromTo = () => {
    setSearchParams((prev) => ({
      ...prev,
      from: prev.to,
      to: prev.from,
    }))
  }

  const formatDateForApi = (dateStr: string) => {
    try {
      if (!dateStr || dateStr.trim() === "") {
        console.error("Empty date string provided to formatDateForApi")
        return new Date().toISOString().split("T")[0] + "T00:00:00"
      }
      if (dateStr.includes("T")) {
        return dateStr
      }
      const date = parse(dateStr, "yyyy-MM-dd", new Date())
      if (!isValid(date)) {
        console.error("Invalid date parsed:", dateStr)
        return new Date().toISOString().split("T")[0] + "T00:00:00"
      }
      return format(date, "yyyy-MM-dd'T'HH:mm:ss")
    } catch (error) {
      console.error("Error formatting date:", error, "for date string:", dateStr)
      return new Date().toISOString().split("T")[0] + "T00:00:00"
    }
  }

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [validationError, setValidationError] = useState("")
  const [validationWarning, setValidationWarning] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setValidationError("")
    setValidationWarning("")

    if (searchParams.tripType !== "multi-city") {
      if (!searchParams.from || !searchParams.to) {
        setError("Please select origin and destination cities")
        setIsLoading(false)
        return
      }
      if (!searchParams.date || searchParams.date.trim() === "") {
        setError("Please select a departure date")
        setIsLoading(false)
        return
      }
      if (
        searchParams.tripType === "round-trip" &&
        (!searchParams.returnDate || searchParams.returnDate.trim() === "")
      ) {
        setError("Please select a return date")
        setIsLoading(false)
        return
      }
    }

    if (searchParams.tripType === "multi-city" && searchParams.multiCityTrips) {
      if (!searchParams.multiCityTrips.length) {
        setError("Please add at least one segment for multi-city search")
        setIsLoading(false)
        return
      }

      let allFieldsValid = true
      let specificError = ""

      for (let i = 0; i < searchParams.multiCityTrips.length; i++) {
        const trip = searchParams.multiCityTrips[i]
        if (!trip) continue

        if (!trip.from || trip.from.trim() === "") {
          specificError = `Please select origin city for segment ${i + 1}`
          allFieldsValid = false
          break
        }
        if (!trip.to || trip.to.trim() === "") {
          specificError = `Please select destination city for segment ${i + 1}`
          allFieldsValid = false
          break
        }
        if (!trip.date || trip.date.trim() === "") {
          specificError = `Please select date for segment ${i + 1}`
          allFieldsValid = false
          break
        }
      }

      if (!allFieldsValid) {
        setError(specificError)
        setIsLoading(false)
        return
      }

      const dateValidation = validateMultiCityDates(searchParams.multiCityTrips)
      if (!dateValidation.isValid) {
        setValidationError(dateValidation.errorMessage)
        setIsLoading(false)
        return
      }

      const cityCheck = checkConnectingCities(searchParams.multiCityTrips)
      if (!cityCheck.isConnected) {
        setValidationWarning(cityCheck.warningMessage)
      }
      setError("")
    }

    try {
      const tokenId = localStorage.getItem("tokenId")
      if (!tokenId) {
        setError("You must be logged in to search for flights")
        setIsLoading(false)
        return
      }

      let journeyType = "1"
      if (searchParams.tripType === "round-trip") journeyType = "2"
      else if (searchParams.tripType === "multi-city") journeyType = "3"

      let resultFareType = null
      switch (searchParams.fareType) {
        case "regular":
          resultFareType = "2"
          break
        case "student":
          resultFareType = "3"
          break
        case "armed-forces":
          resultFareType = "4"
          break
        case "senior-citizen":
          resultFareType = "5"
          break
      }

      const gdsAirlines = searchParams.preferredAirlines.filter((code) => ["AI", "UK"].includes(code))
      const lccAirlines = searchParams.preferredAirlines.filter((code) => ["6E", "SG", "QP", "IX"].includes(code))
      let sources = null
      let preferredAirlines = null

      if (gdsAirlines.length > 0 && lccAirlines.length === 0) {
        sources = ["GDS"]
        preferredAirlines = gdsAirlines
      } else if (lccAirlines.length > 0 && gdsAirlines.length === 0) {
        sources = lccAirlines
      } else if (gdsAirlines.length > 0 && lccAirlines.length > 0) {
        sources = ["GDS", ...lccAirlines]
        preferredAirlines = gdsAirlines
      }

      let finalReturnDate = searchParams.returnDate
      if (searchParams.tripType === "round-trip" && (!finalReturnDate || finalReturnDate.trim() === "")) {
        if (searchParams.date && searchParams.date.trim() !== "") {
          const departureDate = new Date(searchParams.date)
          finalReturnDate = format(addDays(departureDate, 1), "yyyy-MM-dd")
        }
      }

      localStorage.setItem(
        "searchParams",
        JSON.stringify({
          ...searchParams,
          journeyType,
          resultFareType,
          sources,
          preferredAirlines,
          returnDate: finalReturnDate,
        }),
      )

      // Make the actual search API call using axios and the API_BASE_URL
      const searchRequest = {
        EndUserIp: "192.168.1.1",
        TokenId: tokenId,
        AdultCount: searchParams.passengers.toString(),
        ChildCount: "0",
        InfantCount: "0",
        DirectFlight: searchParams.directFlight ? "true" : "false",
        OneStopFlight: "false",
        JourneyType: journeyType,
        Segments:
          searchParams.tripType === "multi-city"
            ? searchParams.multiCityTrips.map((trip) => ({
                Origin: trip.from,
                Destination: trip.to,
                FlightCabinClass: "1",
                PreferredDepartureTime: formatDateForApi(trip.date),
                PreferredArrivalTime: formatDateForApi(trip.date),
              }))
            : [
                {
                  Origin: searchParams.from,
                  Destination: searchParams.to,
                  FlightCabinClass: "1",
                  PreferredDepartureTime: formatDateForApi(searchParams.date),
                  PreferredArrivalTime: formatDateForApi(searchParams.date),
                },
                ...(searchParams.tripType === "round-trip" && finalReturnDate
                  ? [
                      {
                        Origin: searchParams.to,
                        Destination: searchParams.from,
                        FlightCabinClass: "1",
                        PreferredDepartureTime: formatDateForApi(finalReturnDate),
                        PreferredArrivalTime: formatDateForApi(finalReturnDate),
                      },
                    ]
                  : []),
              ],
        ResultFareType: resultFareType,
        PreferredAirlines: preferredAirlines,
        Sources: sources,
      }

      const response = await axios.post(`${API_BASE_URL}/api/search`, searchRequest, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000, // 30 seconds timeout
      })

      if (response.data?.Response?.ResponseStatus === 1 && response.data?.Response?.TraceId) {
        localStorage.setItem("traceId", response.data.Response.TraceId)
        // Proceed with navigation only if search is successful
        navigate("/search-results", {
          state: {
            searchParams: {
              from: searchParams.from,
              to: searchParams.to,
              date: searchParams.date,
              returnDate: finalReturnDate,
              passengers: searchParams.passengers,
              tripType: searchParams.tripType,
              fareType: searchParams.fareType,
              preferredAirlines: searchParams.preferredAirlines,
              directFlight: searchParams.directFlight,
              multiCityTrips: searchParams.multiCityTrips,
              journeyType,
              resultFareType,
              sources,
            },
            sessionId,
            shouldSearch: true,
            traceId: response.data.Response.TraceId, // Pass the new traceId
          },
        })
      } else {
        setError(response.data?.Response?.Error?.ErrorMessage || "Flight search failed. Please try again.")
      }
    } catch (error) {
      console.error("Search error:", error)
      setError("Failed to search for flights. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      <div className="absolute top-0 mt-2 left-0 w-full h-28 bg-gradient-to-r from-[#eb0066]  to-[#007aff] z-0"></div>
      <div className="relative z-10 max-w-5xl mx-auto p-4 pt-20">
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <div className="flex items-center gap-4 mb-2 md:mb-0">
              {tripOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tripType"
                    value={option.value}
                    checked={searchParams.tripType === option.value}
                    required
                    onChange={() => handleTripTypeChange(option.value)}
                    className="w-4 h-4 accent-[#007aff]"
                  />
                  <span className="text-gray-600 text-sm font-medium">{option.label}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={searchParams.directFlight}
                  onChange={() => setSearchParams((prev) => ({ ...prev, directFlight: !prev.directFlight }))}
                  className="w-4 h-4 accent-[#007aff]"
                />
                <span className="text-gray-600 text-sm font-medium">Non-Stop Flights</span>
              </label>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-[#007aff] hover:text-[#0056b3]"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">{showFilters ? "Hide Filters" : "Show Filters"}</span>
            </button>
          </div>

          {showFilters && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium mb-3">Fare Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {fareTypeOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fareType"
                      value={option.value}
                      checked={searchParams.fareType === option.value}
                      onChange={() => handleFareTypeChange(option.value)}
                      className="w-4 h-4 accent-[#007aff]"
                    />
                    <span className="text-gray-600 text-sm">{option.label}</span>
                  </label>
                ))}
              </div>

              <h3 className="text-sm font-medium mb-3">Preferred Airlines</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {airlineOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={
                        option.value === ""
                          ? searchParams.preferredAirlines.length === 0
                          : searchParams.preferredAirlines.includes(option.value)
                      }
                      onChange={() => handleAirlineChange(option.value)}
                      className="w-4 h-4 accent-[#007aff]"
                    />
                    <span className="text-gray-600 text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSearch} className="space-y-4">
            {searchParams.tripType !== "multi-city" ? (
              <div className="grid grid-cols-1 md:grid-cols-[1.5fr_0fr_1.5fr_1fr_1fr_1fr_1fr] gap-2 items-center">
                <div className="bg-[rgba(221,223,225,0.2)] rounded-xl p-3 md:col-span-1 border-none">
                  <label className="block text-black font-semibold text-xs mb-1">From</label>
                  <AirportAutocomplete
                    value={searchParams.from || ""}
                    onChange={(value, airport) => {
                      setSearchParams((prev) => ({
                        ...prev,
                        from: airport ? airport.code : value,
                      }))
                    }}
                    placeholder="From (City or Airport)"
                    className="w-full bg-transparent p-0 text-black font-bold text-sm focus:outline-none uppercase"
                    required
                    name="from"
                    showPopularAirports={true}
                    country="IN"
                  />
                </div>

                <div className="flex justify-center items-center">
                  <button
                    type="button"
                    onClick={swapFromTo}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm border border-black border-opacity-25"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="bg-[rgba(221,223,225,0.2)] rounded-xl p-3 md:col-span-1">
                  <label className="block text-black font-semibold text-xs mb-1">To</label>
                  <AirportAutocomplete
                    value={searchParams.to || ""}
                    onChange={(value, airport) => {
                      setSearchParams((prev) => ({
                        ...prev,
                        to: airport ? airport.code : value,
                      }))
                    }}
                    placeholder="To (City or Airport)"
                    className="w-full bg-transparent p-0 text-black font-bold text-sm focus:outline-none uppercase"
                    required
                    name="to"
                    country="IN"
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
                      aria-required="true"
                      onClick={() => {
                        if (departureInputRef.current) {
                          departureInputRef.current.focus()
                        }
                      }}
                    />
                    {departureDay && <div className="text-xs text-gray-500 mt-1">{departureDay}</div>}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 md:col-span-1">
                  <label className="block text-gray-500 text-xs mb-1">
                    {searchParams.tripType === "round-trip" ? "Return" : "Add Return"}
                  </label>
                  <div className="relative">
                    <input
                      ref={returnInputRef}
                      type="text"
                      className="w-full bg-transparent p-0 text-gray-800 font-medium text-sm focus:outline-none cursor-pointer"
                      placeholder="Select Date"
                      readOnly
                      disabled={searchParams.tripType === "one-way"}
                      required={searchParams.tripType === "round-trip"}
                    />
                    {returnDay && searchParams.tripType === "round-trip" && (
                      <div className="text-xs text-gray-500 mt-1">{returnDay}</div>
                    )}
                    {searchParams.tripType === "one-way" && (
                      <Calendar className="absolute right-0 top-0 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                <div className="bg-[rgba(221,223,225,0.2)] rounded-lg p-3 md:col-span-1">
                  <CustomDropdown
                    options={passengerOptions}
                    value={searchParams.passengers}
                    onChange={handlePassengerChange}
                    label="Passengers"
                  />
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
                {searchParams.multiCityTrips.map((trip, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_0.5fr] gap-3 items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="bg-white rounded-lg p-3">
                      <label className="block text-gray-500 text-xs mb-1">From</label>
                      <AirportAutocomplete
                        value={trip.from || ""}
                        onChange={(value, airport) =>
                          handleMultiCityChange(index, "from", airport ? airport.code : value)
                        }
                        placeholder="Origin City"
                        className="w-full bg-transparent p-0 text-black font-bold text-sm focus:outline-none uppercase"
                        required
                        name={`multi-from-${index}`}
                        country="IN"
                      />
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <label className="block text-gray-500 text-xs mb-1">To</label>
                      <AirportAutocomplete
                        value={trip.to || ""}
                        onChange={(value, airport) =>
                          handleMultiCityChange(index, "to", airport ? airport.code : value)
                        }
                        placeholder="Destination City"
                        className="w-full bg-transparent p-0 text-black font-bold text-sm focus:outline-none uppercase"
                        required
                        name={`multi-to-${index}`}
                        country="IN"
                      />
                    </div>{" "}
                    <div className="bg-white rounded-lg p-3">
                      <label className="block text-gray-500 text-xs mb-1">Date</label>
                      <input
                        required
                        type="date"
                        className="w-full bg-transparent p-0 text-gray-800 font-medium text-sm focus:outline-none"
                        value={trip.date}
                        min={format(getTodayStart(), "yyyy-MM-dd")}
                        onChange={(e) => handleMultiCityChange(index, "date", e.target.value)}
                        aria-required="true"
                        aria-invalid={!trip.date}
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMultiCity(index)}
                          className="text-[#eb0066] hover:text-[#c80057] text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {searchParams.tripType === "multi-city" && (
                  <>
                    {validationError && (
                      <div className="col-span-full p-3 bg-red-100 text-red-700 rounded-md mb-4">{validationError}</div>
                    )}
                    {validationWarning && (
                      <div className="col-span-full p-3 bg-yellow-100 text-yellow-700 rounded-md mb-4">
                        {validationWarning}
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between items-center">
                  {searchParams.multiCityTrips.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddMultiCity}
                      className="text-[#007aff] hover:text-[#0056b3] text-sm font-medium"
                    >
                      + Add Another City
                    </button>
                  )}

                  <div className="flex gap-4 items-center">
                    <div className="bg-[rgba(221,223,225,0.2)] rounded-lg p-3">
                      <CustomDropdown
                        options={passengerOptions}
                        value={searchParams.passengers}
                        onChange={handlePassengerChange}
                        label="Passengers"
                      />
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

          {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
        </div>
      </div>
    </div>
  )
}

export default Search
