"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { format, addDays } from "date-fns"
import { ChevronRight } from "lucide-react"

interface NoFlightsFoundProps {
  searchParams: {
    from: string
    to: string
    date: string
    passengers: number
  }
  sessionId: string
}

const NoFlightsFound: React.FC<NoFlightsFoundProps> = ({ searchParams, sessionId }) => {
  const navigate = useNavigate()
  const [alternativeDates, setAlternativeDates] = useState<Array<{ date: Date; price: number }>>([])

  useEffect(() => {
    // Generate alternative dates (we're using 3 dates after the selected date)
    if (searchParams?.date) {
      try {
        const selectedDate = new Date(searchParams.date)
        // Generate random prices for demonstration
        const newDates = [1, 2].map((days) => ({
          date: addDays(selectedDate, days),
          // Random price between 2000 and 4000
          price: Math.round((Math.random() * 2000 + 2000) / 10) * 10,
        }))
        setAlternativeDates(newDates)
      } catch (error) {
        console.error("Error parsing date:", error)
      }
    }
  }, [searchParams?.date])

  const handleDateSelect = (date: Date, price: number) => {
    const newSearchParams = {
      ...searchParams,
      date: format(date, "yyyy-MM-dd"),
    }

    navigate("/search-results", {
      state: {
        searchParams: newSearchParams,
        sessionId,
        shouldSearch: true,
      },
    })
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-8 my-8">
      {/* Illustration */}
      <div className="w-64 h-36 relative mb-8">
        <svg className="w-full h-full" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Clouds */}
          <circle cx="160" cy="25" r="8" fill="#f0f0f0" />
          <circle cx="150" cy="25" r="10" fill="#f0f0f0" />
          <circle cx="140" cy="25" r="7" fill="#f0f0f0" />

          <circle cx="50" cy="20" r="8" fill="#f0f0f0" />
          <circle cx="60" cy="20" r="10" fill="#f0f0f0" />
          <circle cx="70" cy="20" r="7" fill="#f0f0f0" />

          {/* Birds */}
          <path d="M85 22C86 21 87 22 88 23" stroke="#333" strokeWidth="0.5" />
          <path d="M90 20C91 19 92 20 93 21" stroke="#333" strokeWidth="0.5" />

          {/* Trees */}
          <path d="M70 75 L80 50 L90 75 Z" fill="#6E8B74" />
          <rect x="78" y="75" width="4" height="10" fill="#8B5A2B" />

          <path d="M140 75 L150 50 L160 75 Z" fill="#6E8B74" />
          <rect x="148" y="75" width="4" height="10" fill="#8B5A2B" />

          {/* Ground */}
          <line x1="30" y1="85" x2="90" y2="85" stroke="#333" strokeWidth="1" />
          <line x1="110" y1="85" x2="170" y2="85" stroke="#333" strokeWidth="1" />
        </svg>
      </div>

      {/* Message */}
      <h2 className="text-2xl font-bold text-center mb-2">No Flights Found</h2>
      <p className="text-gray-600 mb-8">Here are some alternative options available</p>

      {/* Alternative Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
        {alternativeDates.map((alt, index) => (
          <div
            key={index}
            onClick={() => handleDateSelect(alt.date, alt.price)}
            className="flex justify-between items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div>
              <div className="font-semibold">{format(alt.date, "EEE, dd MMM")}</div>
              <div className="text-gray-600">
                {searchParams?.from || "Origin"} - {searchParams?.to || "Destination"}
              </div>
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">from ₹ {alt.price.toLocaleString()}</span>
              <ChevronRight className="w-5 h-5 text-[#007aff]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NoFlightsFound

