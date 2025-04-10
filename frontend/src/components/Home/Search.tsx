"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeftRight, Calendar, Filter } from "lucide-react"
import { format, addDays, parse, isValid } from "date-fns"
import "air-datepicker/air-datepicker.css"
import { CustomDropdown } from "../ui/CustomDropdown"
import { useDatePicker } from "../../hooks/useDatePicker"
import { getTodayStart } from "../../utils/dateUtils"
// Import the validation functions
import { validateMultiCityDates, checkConnectingCities } from "../../utils/ValidateMultiCity"

interface SearchProps {
  sessionId: string
}

interface CityPair {
  from: string
  to: string
  date: string
}

const Search: React.FC<SearchProps> = ({ sessionId }) => {
  useEffect(() => {
    // Clear any existing search parameters when dashboard mounts
    localStorage.removeItem("searchParams")
  }, [])

  const navigate = useNavigate()

  // Initialize with today's date and tomorrow for return
  const today = new Date()
  const tomorrow = addDays(today, 1)

  const [searchParams, setSearchParams] = useState({
    tripType: "one-way", // one-way, round-trip, multi-city
    from: "",
    to: "",
    date: format(today, "yyyy-MM-dd"),
    returnDate: format(tomorrow, "yyyy-MM-dd"), // Default return date is tomorrow
    passengers: 1,
    fareType: "regular", // regular, student, armed-forces, senior-citizen
    preferredAirlines: [] as string[], // For airline filtering
    directFlight: false,
    multiCityTrips: [] as CityPair[], // For multi-city
  })

  const [tripType, setTripType] = useState("one-way")
  const [departureDate, setDepartureDate] = useState<Date | null>(today)
  const [returnDate, setReturnDate] = useState<string>(format(tomorrow, "yyyy-MM-dd"))
  const [showFilters, setShowFilters] = useState(false)

  const [passengerType, setPassengerType] = useState("regular")
  const [nonStop, setNonStop] = useState(false)
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1024)
  const departureRef = useRef<HTMLInputElement | null>(null)
  const returnRef = useRef<HTMLInputElement | null>(null)
  const [departureDay, setDepartureDay] = useState<string>(format(today, "EEEE"))
  const [returnDay, setReturnDay] = useState<string>(format(tomorrow, "EEEE"))
  const [adults, setAdults] = useState<number>(1)
  const [children, setChildren] = useState<number>(0)
  const [infants, setInfants] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([])
  // Add a state for validation errors
  const [validationError, setValidationError] = useState<string>("")
  const [validationWarning, setValidationWarning] = useState<string>("")

  useEffect(() => {
    // Initialize with today's date and tomorrow for return
    const today = new Date()
    const tomorrow = addDays(today, 1)

    setSearchParams((prev) => ({
      ...prev,
      date: format(today, "yyyy-MM-dd"),
      returnDate: format(tomorrow, "yyyy-MM-dd"),
    }))

    setDepartureDate(today)
    setDepartureDay(format(today, "EEEE"))
    setReturnDay(format(tomorrow, "EEEE"))
  }, [])

  useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth > 1024)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const tripOptions = [
    { label: "One Way", value: "one-way" },
    { label: "Round Trip", value: "round-trip" },
    { label: "Multi City", value: "multi-city" },
  ]

  const focusReturnDate = () => {
    const returnInput = document.querySelector("[name='return']")
    if (returnInput) {
      ;(returnInput as HTMLElement).focus()
    }
  }

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

  // Passenger options for dropdown
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

  // Replace the existing date picker initialization with our custom hook
  const { inputRef: departureInputRef } = useDatePicker({
    onSelect: (date) => {
      if (date) {
        const formattedDate = format(date, "yyyy-MM-dd")
        setSearchParams((prev) => ({ ...prev, date: formattedDate }))
        setDepartureDay(format(date, "EEEE"))
        setDepartureDate(date)

        // If return date is earlier than departure date, update it
        if (searchParams.returnDate) {
          const returnDate = new Date(searchParams.returnDate)
          if (returnDate < date) {
            const newReturnDate = format(addDays(date, 1), "yyyy-MM-dd")
            setSearchParams((prev) => ({ ...prev, returnDate: newReturnDate }))
            setReturnDay(format(addDays(date, 1), "EEEE"))
            setReturnDate(newReturnDate)
          }
        }
      } else {
        setSearchParams((prev) => ({ ...prev, date: "" }))
        setDepartureDay("")
        setDepartureDate(null)
      }
    },
    minDate: getTodayStart(), // Use the utility function
    maxDate: false, // Explicitly set to false
  })

  const { inputRef: returnInputRef } = useDatePicker({
    onSelect: (date) => {
      if (date) {
        const formattedDate = format(date, "yyyy-MM-dd")
        setSearchParams((prev) => ({ ...prev, returnDate: formattedDate }))
        setReturnDay(format(date, "EEEE"))
        setReturnDate(formattedDate)
      } else {
        setSearchParams((prev) => ({ ...prev, returnDate: "" }))
        setReturnDay("")
        setReturnDate("")
      }
    },
    minDate: searchParams.date ? new Date(searchParams.date) : getTodayStart(), // Ensure return date is after departure
    maxDate: false, // Explicitly set to false
    autoClose: true, // Close the datepicker after selection
  })

  const handlePassengerChange = (value: number | string) => {
    setSearchParams({
      ...searchParams,
      passengers: Number(value),
    })
    setAdults(Number(value))
  }

  const handleTripTypeChange = (type: string) => {
    setSearchParams((prev) => {
      // If switching to round-trip and no return date is set, set a default return date (next day)
      let returnDate = prev.returnDate
      if (type === "round-trip" && (!prev.returnDate || prev.returnDate.trim() === "")) {
        // Set return date to the next day after departure date, or current date + 1 if no departure date
        if (prev.date && prev.date.trim() !== "") {
          const departureDate = new Date(prev.date)
          returnDate = format(addDays(departureDate, 1), "yyyy-MM-dd")
        } else {
          returnDate = format(addDays(new Date(), 1), "yyyy-MM-dd")
        }
        // Also update the return day display
        setReturnDay(format(new Date(returnDate), "EEEE"))
        setReturnDate(returnDate)
      }

      return {
        ...prev,
        tripType: type,
        returnDate: type === "round-trip" ? returnDate : "",
        // Initialize multi-city trips when switching to multi-city
        multiCityTrips:
          type === "multi-city" ? [{ from: prev.from || "", to: prev.to || "", date: prev.date || "" }] : [],
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
    setSelectedAirlines((prev) => {
      if (airline === "") {
        return [] // Clear all selections if "All Airlines" is selected
      }

      if (prev.includes(airline)) {
        return prev.filter((a) => a !== airline)
      } else {
        return [...prev, airline]
      }
    })

    setSearchParams((prev) => ({
      ...prev,
      preferredAirlines: selectedAirlines,
    }))
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
        // Limit to 5 trips
        updatedTrips.push({ from: "", to: "", date: "" })
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

  // Format date for the API (yyyy-MM-ddTHH:mm:ss)
  const formatDateForApi = (dateStr: string) => {
    try {
      if (!dateStr || dateStr.trim() === "") {
        console.error("Empty date string provided to formatDateForApi")
        return new Date().toISOString().split("T")[0] + "T00:00:00" // Use current date as fallback
      }

      // Check if the date is already in ISO format
      if (dateStr.includes("T")) {
        return dateStr // Already in correct format
      }

      const date = parse(dateStr, "yyyy-MM-dd", new Date())
      if (!isValid(date)) {
        console.error("Invalid date parsed:", dateStr)
        return new Date().toISOString().split("T")[0] + "T00:00:00" // Use current date as fallback
      }

      return format(date, "yyyy-MM-dd'T'HH:mm:ss")
    } catch (error) {
      console.error("Error formatting date:", error, "for date string:", dateStr)
      // Return a valid date format as fallback
      return new Date().toISOString().split("T")[0] + "T00:00:00"
    }
  }

  // Update the handleSearch function to use our backend proxy
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setValidationError("")
    setValidationWarning("")
  
    // ✅ Validate required fields for one-way & round-trip
    if (searchParams.tripType !== "multi-city") {
      if (!searchParams.from || !searchParams.to) {
        setError("Please select origin and destination cities")
        setIsLoading(false)
        return
      }
  
      if (!searchParams.date || searchParams.date.trim() === "" || !departureInputRef.current?.value) {
        setError("Please select a departure date")
        setIsLoading(false)
        return
      }
  
      if (
        searchParams.tripType === "round-trip" &&
        (!searchParams.returnDate || searchParams.returnDate.trim() === "" || !returnInputRef.current?.value)
      ) {
        setError("Please select a return date")
        setIsLoading(false)
        return
      }
    }
  
    // ✅ Validate multi-city segments
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
  
      const gdsAirlines = selectedAirlines.filter((code) => ["AI", "UK"].includes(code))
      const lccAirlines = selectedAirlines.filter((code) => ["6E", "SG", "QP", "IX"].includes(code))
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
  
      const cityToAirportCode: Record<string, string> = {
        DELHI: "DEL",
        "NEW DELHI": "DEL",
        MUMBAI: "BOM",
        BANGALORE: "BLR",
        CHENNAI: "MAA",
        KOLKATA: "CCU",
        HYDERABAD: "HYD",
        JAIPUR: "JAI",
      }
  
      const fromCode = cityToAirportCode[searchParams.from.toUpperCase()] || searchParams.from
      const toCode = cityToAirportCode[searchParams.to.toUpperCase()] || searchParams.to
  
      let finalReturnDate = searchParams.returnDate
      if (searchParams.tripType === "round-trip" && (!finalReturnDate || finalReturnDate.trim() === "")) {
        if (searchParams.date && searchParams.date.trim() !== "") {
          const departureDate = new Date(searchParams.date)
          finalReturnDate = format(addDays(departureDate, 1), "yyyy-MM-dd")
          console.log("Setting default return date:", finalReturnDate)
        }
      }
  
      let segments: {
        Origin: string
        Destination: string
        FlightCabinClass: string
        PreferredDepartureTime: string
        PreferredArrivalTime: string
      }[] = []
  
      if (searchParams.tripType === "one-way") {
        segments = [
          {
            Origin: fromCode,
            Destination: toCode,
            FlightCabinClass: "1",
            PreferredDepartureTime: formatDateForApi(searchParams.date),
            PreferredArrivalTime: formatDateForApi(searchParams.date),
          },
        ]
      } else if (searchParams.tripType === "round-trip") {
        segments = [
          {
            Origin: fromCode,
            Destination: toCode,
            FlightCabinClass: "1",
            PreferredDepartureTime: formatDateForApi(searchParams.date),
            PreferredArrivalTime: formatDateForApi(searchParams.date),
          },
          {
            Origin: toCode,
            Destination: fromCode,
            FlightCabinClass: "1",
            PreferredDepartureTime: formatDateForApi(finalReturnDate),
            PreferredArrivalTime: formatDateForApi(finalReturnDate),
          },
        ]
      } else if (searchParams.tripType === "multi-city") {
        segments = searchParams.multiCityTrips.map((trip) => {
          const fromCode = cityToAirportCode[trip.from.toUpperCase()] || trip.from
          const toCode = cityToAirportCode[trip.to.toUpperCase()] || trip.to
  
          return {
            Origin: fromCode,
            Destination: toCode,
            FlightCabinClass: "1",
            PreferredDepartureTime: formatDateForApi(trip.date),
            PreferredArrivalTime: formatDateForApi(trip.date),
          }
        })
      }
  
      // Save and navigate
      localStorage.setItem(
        "searchParams",
        JSON.stringify({
          ...searchParams,
          from: fromCode,
          to: toCode,
          journeyType,
          resultFareType,
          sources,
          preferredAirlines,
          returnDate: finalReturnDate,
        }),
      )
  
      navigate("/search-results", {
        state: {
          searchParams: {
            from: fromCode,
            to: toCode,
            date: searchParams.date,
            returnDate: finalReturnDate,
            passengers: searchParams.passengers,
            tripType: searchParams.tripType,
            fareType: searchParams.fareType,
            preferredAirlines: selectedAirlines,
            directFlight: searchParams.directFlight,
            multiCityTrips: searchParams.multiCityTrips,
            journeyType,
            resultFareType,
            sources,
          },
          sessionId,
          shouldSearch: true,
        },
      })
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
                        option.value === "" ? selectedAirlines.length === 0 : selectedAirlines.includes(option.value)
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
                  <input
                    required
                    name="from"
                    type="text"
                    placeholder="NEW DELHI"
                    className="w-full bg-transparent p-0 text-black font-bold text-sm focus:outline-none uppercase"
                    value={searchParams.from}
                    onChange={(e) => setSearchParams({ ...searchParams, from: e.target.value })}
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
                  <input
                    name="to"
                    type="text"
                    placeholder="MUMBAI"
                    value={searchParams.to}
                    onChange={(e) => setSearchParams({ ...searchParams, to: e.target.value })}
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
                      aria-required="true"
                      onClick={() => {
                        // If the datepicker doesn't open automatically on focus, force it open on click
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
                      <input
                        required
                        type="text"
                        placeholder="Origin City"
                        className="w-full bg-transparent p-0 text-black font-bold text-sm focus:outline-none uppercase"
                        value={trip.from}
                        onChange={(e) => handleMultiCityChange(index, "from", e.target.value)}
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
                        onChange={(e) => handleMultiCityChange(index, "to", e.target.value)}
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
                        // Add these attributes to ensure proper validation
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
