"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { debounce } from "lodash"

interface Airport {
  code: string
  icaoCode?: string
  name: string
  city: string
  country: string
  countryCode: string
  displayText: string // e.g., "Ahmedabad (AMD)"
  fullDisplayText: string // e.g., "Sardar Vallabhbhai Patel International Airport, Ahmedabad, India (AMD)"
}

interface AirportAutocompleteProps {
  value: string // This will be the IATA code (e.g., "AMD")
  onChange: (value: string, airport?: Airport) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  name?: string
  id?: string
  onFocus?: () => void
  onBlur?: () => void
  showPopularAirports?: boolean
  country?: string
}

// Define the base URL for the backend API using the existing environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || "" // Will be empty string if not set, leading to relative path

const AirportAutocomplete: React.FC<AirportAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Enter city or airport",
  className = "",
  disabled = false,
  required = false,
  name,
  id,
  onFocus,
  onBlur,
  showPopularAirports = true,
  country = "IN",
}) => {
  const [suggestions, setSuggestions] = useState<Airport[]>([])
  const [popularAirports, setPopularAirports] = useState<Airport[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [inputValue, setInputValue] = useState("") // This is the display value
  const [selectedAirportDetails, setSelectedAirportDetails] = useState<Airport | null>(null) // Stores the full selected airport object

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Ensure inputValue is always a string before accessing .length
  const safeInputValue = inputValue || ""

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        // Using query.length
        setSuggestions([])
        setIsLoading(false)
        return
      }

      try {
        // Use API_BASE_URL for the fetch call
        const response = await fetch(
          `${API_BASE_URL}/api/airports/search?q=${encodeURIComponent(query)}&limit=10${country ? `&country=${country}` : ""}`,
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Failed to fetch airport suggestions. Status:", response.status, "Response:", errorText)
          setSuggestions([])
          return
        }
        const data = await response.json()
        setSuggestions(data)
      } catch (error) {
        console.error("Error fetching airport suggestions:", error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300),
    [country],
  )

  // Effect to handle initial value and value changes from parent
  useEffect(() => {
    if (value && value !== selectedAirportDetails?.code) {
      // If parent provides a value (IATA code) and it's different from current selection
      const fetchAirportDetails = async () => {
        try {
          // Use API_BASE_URL for the fetch call
          const response = await fetch(`${API_BASE_URL}/api/airports/${encodeURIComponent(value)}`)
          if (response.ok) {
            const data: Airport = await response.json()
            setSelectedAirportDetails(data)
            setInputValue(data.displayText) // Set display value to friendly name
          } else {
            // If details can't be fetched, just display the code
            setInputValue(value)
            setSelectedAirportDetails(null)
            console.warn(`Could not fetch details for airport code: ${value}`)
          }
        } catch (error) {
          console.error(`Error fetching details for airport code ${value}:`, error)
          setInputValue(value) // Fallback to displaying the code
          setSelectedAirportDetails(null)
        }
      }
      fetchAirportDetails()
    } else if (!value && selectedAirportDetails) {
      // If parent clears value, clear internal state
      setInputValue("") // Sets to empty string
      setSelectedAirportDetails(null)
    } else if (value && selectedAirportDetails && value === selectedAirportDetails.code) {
      // If value is already set and matches selected details, ensure inputValue is correct
      setInputValue(selectedAirportDetails.displayText) // Sets to string
    }
  }, [value, selectedAirportDetails]) // Depend on value and selectedAirportDetails

  // Fetch popular airports on mount
  useEffect(() => {
    if (showPopularAirports) {
      const fetchPopularAirports = async () => {
        try {
          // Use API_BASE_URL for the fetch call
          const response = await fetch(`${API_BASE_URL}/api/airports/popular/${country}?limit=12`)
          if (!response.ok) {
            const errorText = await response.text()
            console.error("Failed to fetch popular airports. Status:", response.status, "Response:", errorText)
            return
          }
          const data = await response.json()
          setPopularAirports(data)
        } catch (error) {
          console.error("Error fetching popular airports:", error)
        }
      }
      fetchPopularAirports()
    }
  }, [showPopularAirports, country])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setSelectedAirportDetails(null) // Clear selected details on new input
    setSelectedIndex(-1)

    if (newValue.length >= 2) {
      // Using newValue.length
      setIsLoading(true)
      setShowSuggestions(true)
      debouncedSearch(newValue)
    } else {
      setSuggestions([])
      setShowSuggestions(showPopularAirports && popularAirports.length > 0)
      setIsLoading(false)
    }
    // Do not call onChange here, only when a selection is made or input is cleared
    if (newValue === "") {
      onChange("", undefined) // Clear parent's value if input is empty
    }
  }

  // Handle input focus
  const handleFocus = () => {
    setShowSuggestions(true)
    if (safeInputValue.length < 2 && showPopularAirports && popularAirports.length > 0) {
      // Using safeInputValue.length
      setShowSuggestions(true)
    }
    onFocus?.()
  }

  // Handle input blur
  const handleBlur = (e: React.FocusEvent) => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
        // If input value doesn't match a selected airport, clear it
        if (selectedAirportDetails && safeInputValue !== selectedAirportDetails.displayText) {
          // Using safeInputValue
          setInputValue("")
          setSelectedAirportDetails(null)
          onChange("", undefined)
        } else if (!selectedAirportDetails && safeInputValue !== "") {
          // Using safeInputValue
          // If no airport was selected and input is not empty, clear it
          setInputValue("")
          onChange("", undefined)
        }
      }
    }, 150)
    onBlur?.()
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (airport: Airport) => {
    setInputValue(airport.displayText) // Display the friendly name
    setSelectedAirportDetails(airport) // Store full details
    setShowSuggestions(false)
    setSelectedIndex(-1)
    onChange(airport.code, airport) // Pass the IATA code to the parent
    inputRef.current?.focus()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentSuggestions = safeInputValue.length >= 2 ? suggestions : popularAirports // Using safeInputValue.length

    if (!showSuggestions || currentSuggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < currentSuggestions.length - 1 ? prev + 1 : 0))
        break

      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : currentSuggestions.length - 1))
        break

      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < currentSuggestions.length) {
          handleSuggestionSelect(currentSuggestions[selectedIndex])
        }
        break

      case "Escape":
        setShowSuggestions(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const currentSuggestionsToDisplay = safeInputValue.length >= 2 ? suggestions : popularAirports // Using safeInputValue.length
  const showLoader = isLoading && safeInputValue.length >= 2 // Using safeInputValue.length

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={inputValue} // Use inputValue for the input element
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border-none rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
        disabled={disabled}
        required={required}
        name={name}
        id={id}
        autoComplete="off"
      />

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-auto"
        >
          {showLoader && (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              Searching airports...
            </div>
          )}

          {!showLoader &&
            currentSuggestionsToDisplay.length === 0 &&
            safeInputValue.length >= 2 && ( // Using safeInputValue.length
              <div className="px-4 py-3 text-sm text-gray-500">No airports found for "{safeInputValue}"</div> // Using safeInputValue
            )}

          {!showLoader &&
            safeInputValue.length < 2 &&
            showPopularAirports &&
            popularAirports.length > 0 && ( // Using safeInputValue.length
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                Popular Destinations
              </div>
            )}

          {!showLoader &&
            currentSuggestionsToDisplay.map((airport, index) => (
              <div
                key={`${airport.code}-${index}`}
                className={`px-4 py-3 cursor-pointer border-b border-gray-50 last:border-b-0 hover:bg-blue-50 ${
                  index === selectedIndex ? "bg-blue-50 border-blue-200" : ""
                }`}
                onClick={() => handleSuggestionSelect(airport)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {airport.city}
                      <span className="ml-2 text-sm font-normal text-gray-500">({airport.code})</span>
                    </div>
                    <div className="text-sm text-gray-500 truncate">{airport.name}</div>
                    {airport.country !== airport.city && <div className="text-xs text-gray-400">{airport.country}</div>}
                  </div>
                  <div className="ml-2 text-xs font-mono text-gray-400">{airport.code}</div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export default AirportAutocomplete
