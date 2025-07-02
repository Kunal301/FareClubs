"use client"

import type React from "react"
import { X, Check, Info } from "lucide-react"
import { AirlineLogo } from "../common/AirlineLogo"
import { format, parseISO } from "date-fns"

interface FareOption {
  name: string
  price: number
  description: string
  baggage: {
    cabinBaggage: string
    checkInBaggage: string
  }
  flexibility: {
    cancellationFee: string
    dateChangeFee: string
    isFreeChange: boolean
  }
  seats: {
    free: boolean
    complimentaryMeals: boolean
  }
  benefits: {
    priorityCheckIn: boolean
    priorityBoarding: boolean
    extraBaggage: string
    expressCheckIn: boolean
  }
  worth: number
}

interface FareOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  flight: any
  onSelectFare: (fareOption: FareOption) => void
  fareOptions: FareOption[]
}

const parseDateString = (dateStr: string) => {
  try {
    const date = parseISO(dateStr)
    return format(date, "HH:mm")
  } catch (error) {
    console.error("Error parsing date:", error)
    return dateStr
  }
}

const FareOptionsModal: React.FC<FareOptionsModalProps> = ({ isOpen, onClose, flight, onSelectFare, fareOptions }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b relative">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#007aff]">
              {fareOptions.length} FARE OPTIONS available for your trip.
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 absolute right-6 top-6">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Flight details header */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b">
            <div className="flex items-center gap-2">
              <span className="font-medium">{flight.OptionSegmentsInfo[0].DepartureAirport}</span>
              <span className="text-gray-500">→</span>
              <span className="font-medium">{flight.OptionSegmentsInfo[0].ArrivalAirport}</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <AirlineLogo airline={flight.OptionSegmentsInfo[0].MarketingAirline} size="sm" />
              <span className="text-sm text-gray-600">
                {flight.OptionSegmentsInfo[0].MarketingAirline} • {flight.OptionSegmentsInfo[0].FlightNumber} •
                Departure at {parseDateString(flight.OptionSegmentsInfo[0].DepartureTime)} • Arrival at{" "}
                {parseDateString(flight.OptionSegmentsInfo[0].ArrivalTime)}
              </span>
            </div>
          </div>

          {/* Fare options grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {fareOptions.map((option, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                {/* Fare header */}
                <div className="p-4 bg-gray-50 border-b">
                  <div className="text-2xl font-bold">₹{option.price.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">per adult</div>
                  <div className="font-medium text-[#007aff] mt-1">{option.name}</div>
                </div>

                {/* Baggage */}
                <div className="p-4 border-b">
                  <h3 className="font-medium mb-2">Baggage</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm">{option.baggage.cabinBaggage} Cabin Baggage</span>
                    </div>
                    <div className="flex items-start">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm">{option.baggage.checkInBaggage} Check-in Baggage</span>
                    </div>
                  </div>
                </div>

                {/* Flexibility */}
                <div className="p-4 border-b">
                  <h3 className="font-medium mb-2">Flexibility</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      {option.flexibility.cancellationFee.includes("Free") ? (
                        <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 mr-2 flex-shrink-0" />
                      )}
                      <span className="text-sm">{option.flexibility.cancellationFee}</span>
                    </div>
                    <div className="flex items-start">
                      {option.flexibility.isFreeChange ? (
                        <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 mr-2 flex-shrink-0" />
                      )}
                      <span className="text-sm">{option.flexibility.dateChangeFee}</span>
                    </div>
                  </div>
                </div>

                {/* Seats & Meals */}
                <div className="p-4 border-b">
                  <h3 className="font-medium mb-2">Seats, Meals & More</h3>
                  <div className="space-y-2">
                    {option.seats.free ? (
                      <div className="flex items-start">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-sm">Free Seats</span>
                      </div>
                    ) : (
                      <div className="flex items-start">
                        <div className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">Chargeable Seats</span>
                      </div>
                    )}

                    {option.seats.complimentaryMeals ? (
                      <div className="flex items-start">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-sm">Complimentary Meals</span>
                      </div>
                    ) : (
                      <div className="flex items-start">
                        <div className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">Chargeable Meals</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Benefits */}
                {(option.benefits.priorityCheckIn ||
                  option.benefits.priorityBoarding ||
                  option.benefits.expressCheckIn) && (
                  <div className="p-4 border-b">
                    <h3 className="font-medium mb-2">Exclusive Benefits</h3>
                    <div className="space-y-2">
                      {option.benefits.expressCheckIn && (
                        <div className="flex items-start">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span className="text-sm">Free Express Check-In</span>
                        </div>
                      )}
                      {option.benefits.priorityBoarding && (
                        <div className="flex items-start">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span className="text-sm">Free Priority Boarding</span>
                        </div>
                      )}
                      {option.benefits.priorityCheckIn && (
                        <div className="flex items-start">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span className="text-sm">Priority Check-In</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Worth */}
                {option.worth > 0 && (
                  <div className="p-4 border-b bg-blue-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-700">
                        BENEFITS WORTH ₹{option.worth.toLocaleString()} INCLUDED
                      </span>
                      <Info className="w-4 h-4 text-blue-500 ml-1" />
                    </div>
                    {option.benefits.extraBaggage && (
                      <div className="text-sm text-blue-700 mt-1">Extra {option.benefits.extraBaggage} Baggage</div>
                    )}
                  </div>
                )}

                {/* Book button */}
                <div className="p-4">
                  <button
                    onClick={() => onSelectFare(option)}
                    className="w-full py-2 bg-[#007aff] text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    BOOK NOW
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FareOptionsModal
