"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useLocation, Link } from "react-router-dom"
import { format, parseISO, isValid } from "date-fns"
import { Check, Download, Printer } from "lucide-react"
import { AirlineLogo } from "../common/AirlineLogo"

// Helper function to parse date strings
const parseDateString = (dateStr: string) => {
  try {
    // First try direct ISO parsing
    let date = parseISO(dateStr)

    // If invalid, try parsing dd/MM/yyyy, HH:mm format
    if (!isValid(date)) {
      const [datePart, timePart] = dateStr.split(", ")
      if (datePart && timePart) {
        const [day, month, year] = datePart.split("/")
        const [hours, minutes] = timePart.split(":")
        date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes))
      }
    }

    // If still invalid, return current date as fallback
    if (!isValid(date)) {
      console.warn(`Invalid date string: ${dateStr}, using current date as fallback`)
      return new Date()
    }

    return date
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error)
    return new Date()
  }
}

const BookingConfirmation: React.FC = () => {
  const location = useLocation()
  const [bookingData, setBookingData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (location.state) {
      setBookingData(location.state)
      setIsLoading(false)
    } else {
      // If no state is available, could try to fetch booking details from API using bookingId from URL
      setIsLoading(false)
    }
  }, [location])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#007aff] mx-auto mb-4"></div>
          <h2 className="text-xl font-medium">Loading booking details...</h2>
        </div>
      </div>
    )
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-red-50 p-8 rounded-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4">Booking Details Not Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find the booking details you're looking for.</p>
          <Link to="/" className="text-[#007aff] hover:text-[#007aff] font-medium">
            Return to home
          </Link>
        </div>
      </div>
    )
  }

  const {
    bookingReference,
    bookingId,
    ticketId,
    totalAmount,
    flight,
    returnFlight,
    isRoundTrip,
    isRefundableSelected,
    refundablePrice,
    ssrOptions,
    ssrTotalPrice,
    customerDetails,
    bookingResponse,
  } = bookingData

  // Extract flight details from booking response if available
  const flightDetails = bookingResponse?.Response?.FlightItinerary?.Segments || []
  const passengerDetails = bookingResponse?.Response?.FlightItinerary?.Passenger || []

  const handlePrintTicket = () => {
    window.print()
  }

  const handleDownloadTicket = () => {
    // In a real application, this would generate a PDF ticket
    alert("Download functionality would be implemented here")
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-green-100 rounded-full p-2">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Booking Confirmed!</h1>
          <p className="text-green-700">
            Your booking has been confirmed. Your booking reference is{" "}
            <span className="font-bold">{bookingReference}</span>
          </p>
        </div>

        {/* Booking Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Booking Summary</h2>
            <div className="flex space-x-2">
              <button
                onClick={handlePrintTicket}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              <button
                onClick={handleDownloadTicket}
                className="flex items-center gap-2 px-4 py-2 bg-[#007aff] hover:bg-[#0056b3] text-white rounded-md"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Booking Reference</h3>
              <p className="font-bold">{bookingReference}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Booking ID</h3>
              <p>{bookingId}</p>
            </div>
            {ticketId && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Ticket ID</h3>
                <p>{ticketId}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Booking Date</h3>
              <p>{format(new Date(), "dd MMM yyyy, HH:mm")}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Amount</h3>
              <p className="font-bold">₹{totalAmount.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Booking Status</h3>
              <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Confirmed
              </p>
            </div>
          </div>

          {/* Passenger Details */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Passenger Details</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              {passengerDetails.length > 0 ? (
                passengerDetails.map((passenger: any, index: number) => (
                  <div key={index} className="flex flex-wrap gap-4 mb-4 last:mb-0">
                    <div className="w-1/4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Name</h4>
                      <p>
                        {passenger.Title} {passenger.FirstName} {passenger.LastName}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Type</h4>
                      <p>{passenger.PaxType === 1 ? "Adult" : passenger.PaxType === 2 ? "Child" : "Infant"}</p>
                    </div>
                    {passenger.DateOfBirth && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Date of Birth</h4>
                        <p>{format(new Date(passenger.DateOfBirth), "dd MMM yyyy")}</p>
                      </div>
                    )}
                    {passenger.PassportNo && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Passport</h4>
                        <p>{passenger.PassportNo}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-wrap gap-4">
                  <div className="w-1/4">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Name</h4>
                    <p>
                      {customerDetails.gender === "male" ? "Mr" : "Ms"} {customerDetails.firstName}{" "}
                      {customerDetails.lastName}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Type</h4>
                    <p>Adult</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Contact</h4>
                    <p>{customerDetails.mobile}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                    <p>{customerDetails.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Flight Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Flight Details</h3>

            {flightDetails.length > 0 ? (
              flightDetails.map((segment: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded border flex items-center justify-center">
                        <AirlineLogo airline={segment.Airline.AirlineCode} size="md" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {segment.Airline.AirlineName} {segment.Airline.FlightNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {segment.Origin.Airport.CityName} ({segment.Origin.Airport.AirportCode}) to{" "}
                          {segment.Destination.Airport.CityName} ({segment.Destination.Airport.AirportCode})
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {format(new Date(segment.Origin.DepTime), "dd MMM yyyy")}
                      </div>
                      <div className="text-sm font-medium">
                        {segment.FlightStatus} • {segment.Airline.FareClass} Class
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <div className="text-xl font-semibold">{format(new Date(segment.Origin.DepTime), "HH:mm")}</div>
                      <div className="text-sm text-gray-500">{segment.Origin.Airport.AirportCode}</div>
                      <div className="text-xs text-gray-500">Terminal {segment.Origin.Airport.Terminal || "N/A"}</div>
                    </div>

                    <div className="flex-1 px-4">
                      <div className="text-center text-sm text-gray-500">
                        {segment.Duration
                          ? `${Math.floor(segment.Duration / 60)}h ${segment.Duration % 60}m`
                          : "Direct"}
                      </div>
                      <div className="relative">
                        <div className="border-t-2 border-gray-300 absolute w-full top-1/2"></div>
                      </div>
                      <div className="text-center text-xs text-gray-500">Non-stop</div>
                    </div>

                    <div className="text-center">
                      <div className="text-xl font-semibold">
                        {format(new Date(segment.Destination.ArrTime), "HH:mm")}
                      </div>
                      <div className="text-sm text-gray-500">{segment.Destination.Airport.AirportCode}</div>
                      <div className="text-xs text-gray-500">
                        Terminal {segment.Destination.Airport.Terminal || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback to using the flight data from the state if booking response segments aren't available
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded border flex items-center justify-center">
                      <AirlineLogo airline={flight.OptionSegmentsInfo[0].MarketingAirline} size="md" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {flight.OptionSegmentsInfo[0].MarketingAirline} {flight.OptionSegmentsInfo[0].FlightNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {flight.OptionSegmentsInfo[0].DepartureAirport} to {flight.OptionSegmentsInfo[0].ArrivalAirport}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {format(parseDateString(flight.OptionSegmentsInfo[0].DepartureTime), "dd MMM yyyy")}
                    </div>
                    <div className="text-sm font-medium">Confirmed • Economy Class</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-xl font-semibold">
                      {format(parseDateString(flight.OptionSegmentsInfo[0].DepartureTime), "HH:mm")}
                    </div>
                    <div className="text-sm text-gray-500">{flight.OptionSegmentsInfo[0].DepartureAirport}</div>
                    <div className="text-xs text-gray-500">Terminal 1</div>
                  </div>

                  <div className="flex-1 px-4">
                    <div className="text-center text-sm text-gray-500">
                      {flight.JourneyTime
                        ? `${Math.floor(flight.JourneyTime / 60)}h ${flight.JourneyTime % 60}m`
                        : "Direct"}
                    </div>
                    <div className="relative">
                      <div className="border-t-2 border-gray-300 absolute w-full top-1/2"></div>
                    </div>
                    <div className="text-center text-xs text-gray-500">Non-stop</div>
                  </div>

                  <div className="text-center">
                    <div className="text-xl font-semibold">
                      {format(parseDateString(flight.OptionSegmentsInfo[0].ArrivalTime), "HH:mm")}
                    </div>
                    <div className="text-sm text-gray-500">{flight.OptionSegmentsInfo[0].ArrivalAirport}</div>
                    <div className="text-xs text-gray-500">Terminal 1</div>
                  </div>
                </div>
              </div>
            )}

            {/* Return Flight (if round trip) */}
            {isRoundTrip && returnFlight && (
              <div className="border rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded border flex items-center justify-center">
                      {returnFlight.OptionSegmentsInfo && returnFlight.OptionSegmentsInfo[0] && (
                        <AirlineLogo airline={returnFlight.OptionSegmentsInfo[0].MarketingAirline} size="md" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {returnFlight.OptionSegmentsInfo && returnFlight.OptionSegmentsInfo[0] ? (
                          <>
                            {returnFlight.OptionSegmentsInfo[0].MarketingAirline}{" "}
                            {returnFlight.OptionSegmentsInfo[0].FlightNumber}
                          </>
                        ) : (
                          "Flight details unavailable"
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {returnFlight.OptionSegmentsInfo && returnFlight.OptionSegmentsInfo[0] ? (
                          <>
                            {returnFlight.OptionSegmentsInfo[0].DepartureAirport} to{" "}
                            {returnFlight.OptionSegmentsInfo[0].ArrivalAirport}
                          </>
                        ) : (
                          "Route details unavailable"
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {returnFlight.OptionSegmentsInfo &&
                      returnFlight.OptionSegmentsInfo[0] &&
                      returnFlight.OptionSegmentsInfo[0].DepartureTime
                        ? format(parseDateString(returnFlight.OptionSegmentsInfo[0].DepartureTime), "dd MMM yyyy")
                        : "Date unavailable"}
                    </div>
                    <div className="text-sm font-medium">Confirmed • Economy Class</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-xl font-semibold">
                      {returnFlight.OptionSegmentsInfo &&
                      returnFlight.OptionSegmentsInfo[0] &&
                      returnFlight.OptionSegmentsInfo[0].DepartureTime
                        ? format(parseDateString(returnFlight.OptionSegmentsInfo[0].DepartureTime), "HH:mm")
                        : "--:--"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {returnFlight.OptionSegmentsInfo && returnFlight.OptionSegmentsInfo[0]
                        ? returnFlight.OptionSegmentsInfo[0].DepartureAirport
                        : "---"}
                    </div>
                    <div className="text-xs text-gray-500">Terminal 1</div>
                  </div>

                  <div className="flex-1 px-4">
                    <div className="text-center text-sm text-gray-500">
                      {returnFlight.JourneyTime
                        ? `${Math.floor(returnFlight.JourneyTime / 60)}h ${returnFlight.JourneyTime % 60}m`
                        : "Direct"}
                    </div>
                    <div className="relative">
                      <div className="border-t-2 border-gray-300 absolute w-full top-1/2"></div>
                    </div>
                    <div className="text-center text-xs text-gray-500">Non-stop</div>
                  </div>

                  <div className="text-center">
                    <div className="text-xl font-semibold">
                      {returnFlight.OptionSegmentsInfo &&
                      returnFlight.OptionSegmentsInfo[0] &&
                      returnFlight.OptionSegmentsInfo[0].ArrivalTime
                        ? format(parseDateString(returnFlight.OptionSegmentsInfo[0].ArrivalTime), "HH:mm")
                        : "--:--"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {returnFlight.OptionSegmentsInfo && returnFlight.OptionSegmentsInfo[0]
                        ? returnFlight.OptionSegmentsInfo[0].ArrivalAirport
                        : "---"}
                    </div>
                    <div className="text-xs text-gray-500">Terminal 1</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Price Details */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Price Details</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Base Fare</span>
                  <span>
                    ₹
                    {bookingResponse?.Response?.FlightItinerary?.Fare?.BaseFare ||
                      flight?.OptionPriceInfo?.TotalBasePrice ||
                      0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes & Fees</span>
                  <span>
                    ₹{bookingResponse?.Response?.FlightItinerary?.Fare?.Tax || flight?.OptionPriceInfo?.TotalTax || 0}
                  </span>
                </div>
                {ssrTotalPrice > 0 && (
                  <div className="flex justify-between">
                    <span>Additional Services</span>
                    <span>₹{ssrTotalPrice}</span>
                  </div>
                )}
                {isRefundableSelected && (
                  <div className="flex justify-between">
                    <span>Refundable Booking</span>
                    <span>₹{refundablePrice}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Convenience Fee</span>
                  <span>₹149.00</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Important Information</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <p>
              • Please arrive at the airport at least 2 hours before the scheduled departure time for domestic flights
              and 3 hours for international flights.
            </p>
            <p>• Carry a valid photo ID proof along with your e-ticket for verification at the airport.</p>
            <p>
              • For any changes or cancellations, please contact our customer support at least 4 hours before the
              scheduled departure.
            </p>
            <p>
              • Baggage allowance: Check-in: 15 kg, Cabin: 7 kg (Please check with the airline for the latest baggage
              policy).
            </p>
            {isRefundableSelected && (
              <p className="text-green-600 font-medium">
                • Your booking is protected with Refund Shield. In case of cancellation, you are eligible for a refund
                as per the terms and conditions.
              </p>
            )}
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Need Help?</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions or need assistance with your booking, our customer support team is available 24/7.
          </p>
          <div className="flex flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
              <p className="text-[#007aff]">support@fareclubs.com</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Phone</h3>
              <p>+91 1800-123-4567</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">WhatsApp</h3>
              <p>+91 9876543210</p>
            </div>
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-[#007aff] hover:bg-[#0056b3] text-white rounded-md font-medium"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default BookingConfirmation
