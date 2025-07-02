"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { format, parseISO } from "date-fns"
import { Search, Calendar, Clock, ArrowRight, Loader2, AlertCircle } from "lucide-react"
import { BookingDetailsService, type GetBookingDetailsResponse } from "../../services/bookingDetailsService"
import { AirlineLogo } from "../common/AirlineLogo"

const BookingHistory: React.FC = () => {
  const navigate = useNavigate()
  const [searchType, setSearchType] = useState<"bookingId" | "pnr" | "traceId">("bookingId")
  const [bookingId, setBookingId] = useState("")
  const [pnr, setPnr] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [traceId, setTraceId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingDetails, setBookingDetails] = useState<GetBookingDetailsResponse | null>(null)
  const [recentBookings, setRecentBookings] = useState<any[]>([])

  // Load recent bookings from localStorage on component mount
  useEffect(() => {
    const storedBookings = localStorage.getItem("recentBookings")
    if (storedBookings) {
      try {
        setRecentBookings(JSON.parse(storedBookings))
      } catch (err) {
        console.error("Error parsing recent bookings:", err)
      }
    }
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBookingDetails(null)
    setIsLoading(true)

    try {
      const tokenId = localStorage.getItem("tokenId") || ""

      if (!tokenId) {
        setError("Authentication token not found. Please log in again.")
        setIsLoading(false)
        return
      }

      let response: GetBookingDetailsResponse

      switch (searchType) {
        case "bookingId":
          if (!bookingId) {
            setError("Please enter a booking ID")
            setIsLoading(false)
            return
          }
          response = await BookingDetailsService.getBookingDetailsById(tokenId, bookingId)
          break
        case "pnr":
          if (!pnr) {
            setError("Please enter a PNR")
            setIsLoading(false)
            return
          }
          response = await BookingDetailsService.getBookingDetailsByPNR(tokenId, pnr, firstName, lastName)
          break
        case "traceId":
          if (!traceId) {
            setError("Please enter a trace ID")
            setIsLoading(false)
            return
          }
          response = await BookingDetailsService.getBookingDetailsByTraceId(tokenId, traceId)
          break
        default:
          setError("Invalid search type")
          setIsLoading(false)
          return
      }

      if (response.Error?.ErrorCode !== 0 || response.Response?.Error?.ErrorCode !== 0) {
        setError(
          response.Error?.ErrorMessage ||
            response.Response?.Error?.ErrorMessage ||
            "Failed to retrieve booking details",
        )
      } else if (response.Response?.FlightItinerary) {
        setBookingDetails(response)

        // Save to recent bookings in localStorage
        const booking = response.Response.FlightItinerary
        const newRecentBooking = {
          bookingId: booking.BookingId,
          pnr: booking.PNR,
          origin: booking.Origin,
          destination: booking.Destination,
          date: booking.Segments[0]?.Origin.DepTime,
          airlineCode: booking.AirlineCode,
          status: booking.Status,
        }

        const updatedRecentBookings = [
          newRecentBooking,
          ...recentBookings.filter((b) => b.bookingId !== newRecentBooking.bookingId),
        ].slice(0, 5)
        setRecentBookings(updatedRecentBookings)
        localStorage.setItem("recentBookings", JSON.stringify(updatedRecentBookings))
      } else {
        setError("No booking found with the provided details")
      }
    } catch (err) {
      console.error("Error searching for booking:", err)
      setError(`Failed to retrieve booking details: ${(err as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewBookingDetails = (bookingId: number) => {
    navigate(`/booking/details/${bookingId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">My Bookings</h1>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex space-x-4 mb-6">
            <button
              type="button"
              className={`px-4 py-2 rounded-md ${
                searchType === "bookingId" ? "bg-[#007aff] text-white" : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setSearchType("bookingId")}
            >
              Booking ID
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-md ${
                searchType === "pnr" ? "bg-[#007aff] text-white" : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setSearchType("pnr")}
            >
              PNR
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-md ${
                searchType === "traceId" ? "bg-[#007aff] text-white" : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setSearchType("traceId")}
            >
              Trace ID
            </button>
          </div>

          <form onSubmit={handleSearch}>
            {searchType === "bookingId" && (
              <div className="mb-4">
                <label htmlFor="bookingId" className="block text-sm font-medium text-gray-700 mb-1">
                  Booking ID
                </label>
                <input
                  type="text"
                  id="bookingId"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter your booking ID"
                />
              </div>
            )}

            {searchType === "pnr" && (
              <>
                <div className="mb-4">
                  <label htmlFor="pnr" className="block text-sm font-medium text-gray-700 mb-1">
                    PNR
                  </label>
                  <input
                    type="text"
                    id="pnr"
                    value={pnr}
                    onChange={(e) => setPnr(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Enter your PNR"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
              </>
            )}

            {searchType === "traceId" && (
              <div className="mb-4">
                <label htmlFor="traceId" className="block text-sm font-medium text-gray-700 mb-1">
                  Trace ID
                </label>
                <input
                  type="text"
                  id="traceId"
                  value={traceId}
                  onChange={(e) => setTraceId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter your trace ID"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 bg-[#007aff] text-white rounded-md hover:bg-blue-600 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Booking Details */}
        {bookingDetails?.Response?.FlightItinerary && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Booking Details</h2>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-4 border-b">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Booking Reference (PNR)</p>
                    <p className="font-medium">{bookingDetails.Response.FlightItinerary.PNR}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Booking ID</p>
                    <p className="font-medium">{bookingDetails.Response.FlightItinerary.BookingId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium">
                      {BookingDetailsService.getBookingStatusDescription(
                        bookingDetails.Response.FlightItinerary.Status,
                      )}
                    </p>
                  </div>
                  {bookingDetails.Response.FlightItinerary.InvoiceCreatedOn && (
                    <div>
                      <p className="text-sm text-gray-500">Booking Date</p>
                      <p className="font-medium">
                        {format(
                          parseISO(bookingDetails.Response.FlightItinerary.InvoiceCreatedOn),
                          "dd MMM yyyy, HH:mm",
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Flight Segments */}
              <div className="p-4">
                <h3 className="font-medium mb-4">Flight Details</h3>
                {bookingDetails.Response.FlightItinerary.Segments.map((segment, index) => (
                  <div key={index} className="border rounded-lg p-4 mb-4 last:mb-0">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                        <AirlineLogo airline={segment.Airline.AirlineCode} size="md" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {segment.Airline.AirlineName} {segment.Airline.FlightNumber}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(parseISO(segment.Origin.DepTime), "EEE, dd MMM yyyy")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-xl font-semibold">{format(parseISO(segment.Origin.DepTime), "HH:mm")}</p>
                        <p className="font-medium">{segment.Origin.Airport.AirportCode}</p>
                        <p className="text-sm text-gray-500">{segment.Origin.Airport.CityName}</p>
                        {segment.Origin.Airport.Terminal && (
                          <p className="text-xs text-gray-500">Terminal {segment.Origin.Airport.Terminal}</p>
                        )}
                      </div>

                      <div className="flex-1 px-4">
                        <div className="relative">
                          <div className="border-t border-gray-300 absolute w-full top-3"></div>
                          <div className="flex justify-center">
                            <div className="bg-white px-2 relative">
                              <p className="text-xs text-gray-500">
                                {segment.Duration
                                  ? `${Math.floor(segment.Duration / 60)}h ${segment.Duration % 60}m`
                                  : "Direct"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-center mt-2">
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-xl font-semibold">
                          {format(parseISO(segment.Destination.ArrTime), "HH:mm")}
                        </p>
                        <p className="font-medium">{segment.Destination.Airport.AirportCode}</p>
                        <p className="text-sm text-gray-500">{segment.Destination.Airport.CityName}</p>
                        {segment.Destination.Airport.Terminal && (
                          <p className="text-xs text-gray-500">Terminal {segment.Destination.Airport.Terminal}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Flight Status</p>
                        <p className="font-medium">{segment.FlightStatus}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Class</p>
                        <p className="font-medium">{segment.Airline.FareClass}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Aircraft</p>
                        <p className="font-medium">{segment.Craft || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Passenger Details */}
              <div className="border-t p-4">
                <h3 className="font-medium mb-4">Passenger Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ticket Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookingDetails.Response.FlightItinerary.Passenger.map((passenger, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium">
                              {passenger.Title} {passenger.FirstName} {passenger.LastName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {passenger.PaxType === 1 ? "Adult" : passenger.PaxType === 2 ? "Child" : "Infant"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{passenger.Ticket?.TicketNumber || "N/A"}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{passenger.Ticket?.Status || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Price Details */}
              <div className="border-t p-4">
                <h3 className="font-medium mb-4">Price Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Base Fare</p>
                    <p className="font-medium">
                      {bookingDetails.Response.FlightItinerary.Fare.Currency}{" "}
                      {bookingDetails.Response.FlightItinerary.Fare.BaseFare.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Taxes & Fees</p>
                    <p className="font-medium">
                      {bookingDetails.Response.FlightItinerary.Fare.Currency}{" "}
                      {bookingDetails.Response.FlightItinerary.Fare.Tax.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Other Charges</p>
                    <p className="font-medium">
                      {bookingDetails.Response.FlightItinerary.Fare.Currency}{" "}
                      {bookingDetails.Response.FlightItinerary.Fare.OtherCharges.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="font-medium text-lg">
                      {bookingDetails.Response.FlightItinerary.Fare.Currency}{" "}
                      {bookingDetails.Response.FlightItinerary.Fare.PublishedFare.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t p-4 flex justify-end">
                {/* <button
                  onClick={() => handleViewBookingDetails(bookingDetails.Response.FlightItinerary.BookingId)}
                  className="px-4 py-2 bg-[#007aff] text-white rounded-md hover:bg-blue-600"
                >
                  View Full Details
                </button> */}
              </div>
            </div>
          </div>
        )}

        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Bookings</h2>
            <div className="space-y-4">
              {recentBookings.map((booking, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleViewBookingDetails(booking.bookingId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-lg border flex items-center justify-center">
                        <AirlineLogo airline={booking.airlineCode} size="sm" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {booking.origin} - {booking.destination}
                        </p>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{booking.date ? format(parseISO(booking.date), "dd MMM yyyy") : "N/A"}</span>
                          <Clock className="w-3 h-3 ml-2 mr-1" />
                          <span>{booking.date ? format(parseISO(booking.date), "HH:mm") : "N/A"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">PNR: {booking.pnr}</p>
                      <p className="text-xs text-gray-500">
                        {BookingDetailsService.getBookingStatusDescription(booking.status)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingHistory
