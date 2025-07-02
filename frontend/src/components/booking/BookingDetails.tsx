"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { format, parseISO } from "date-fns"
import { ArrowLeft, Download, Printer, Mail, Share2, AlertCircle, Loader2 } from "lucide-react"
import { BookingDetailsService, type GetBookingDetailsResponse } from "../../services/bookingDetailsService"
import { AirlineLogo } from "../common/AirlineLogo"

const BookingDetails: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookingDetails, setBookingDetails] = useState<GetBookingDetailsResponse | null>(null)

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) {
        setError("Booking ID is required")
        setIsLoading(false)
        return
      }

      try {
        const tokenId = localStorage.getItem("tokenId") || ""

        if (!tokenId) {
          setError("Authentication token not found. Please log in again.")
          setIsLoading(false)
          return
        }

        const response = await BookingDetailsService.getBookingDetailsById(tokenId, bookingId)

        if (response.Error?.ErrorCode !== 0 || response.Response?.Error?.ErrorCode !== 0) {
          setError(
            response.Error?.ErrorMessage ||
              response.Response?.Error?.ErrorMessage ||
              "Failed to retrieve booking details",
          )
        } else if (response.Response?.FlightItinerary) {
          setBookingDetails(response)
        } else {
          setError("No booking found with the provided ID")
        }
      } catch (err) {
        console.error("Error fetching booking details:", err)
        setError(`Failed to retrieve booking details: ${(err as Error).message}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookingDetails()
  }, [bookingId])

  const handlePrintTicket = () => {
    window.print()
  }

  const handleDownloadTicket = () => {
    // In a real application, this would generate a PDF ticket
    alert("Download functionality would be implemented here")
  }

  const handleEmailTicket = () => {
    if (!bookingDetails?.Response?.FlightItinerary?.Passenger) {
      alert("No passenger details available to email ticket")
      return
    }

    const leadPassenger =
      bookingDetails.Response.FlightItinerary.Passenger.find((p) => p.IsLeadPax) ||
      bookingDetails.Response.FlightItinerary.Passenger[0]

    const emailSubject = `Your Flight Ticket - PNR: ${bookingDetails.Response.FlightItinerary.PNR}`
    const emailBody = `Dear ${leadPassenger.FirstName},\n\nPlease find your flight ticket attached.\n\nPNR: ${bookingDetails.Response.FlightItinerary.PNR}\n\nThank you for booking with FareClubs.`

    window.location.href = `mailto:${leadPassenger.Email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
  }

  const handleShareTicket = () => {
    if (!bookingDetails?.Response?.FlightItinerary?.PNR) {
      alert("No ticket details available to share")
      return
    }

    if (navigator.share) {
      navigator
        .share({
          title: `Flight Ticket - PNR: ${bookingDetails.Response.FlightItinerary.PNR}`,
          text: `My flight ticket with PNR: ${bookingDetails.Response.FlightItinerary.PNR}`,
          url: window.location.href,
        })
        .catch((err) => {
          console.error("Error sharing ticket:", err)
          alert("Failed to share ticket")
        })
    } else {
      alert("Sharing is not supported on this device")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#007aff] mx-auto mb-4" />
          <h2 className="text-xl font-medium">Loading booking details...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-red-50 p-8 rounded-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Error Loading Booking Details</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/booking/history" className="text-[#007aff] hover:text-blue-700 font-medium">
            Return to Booking History
          </Link>
        </div>
      </div>
    )
  }

  if (!bookingDetails?.Response?.FlightItinerary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-yellow-50 p-8 rounded-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">No Booking Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find any booking with the provided ID.</p>
          <Link to="/booking/history" className="text-[#007aff] hover:text-blue-700 font-medium">
            Return to Booking History
          </Link>
        </div>
      </div>
    )
  }

  const { FlightItinerary } = bookingDetails.Response

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link to="/booking/history" className="inline-flex items-center text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Booking History
          </Link>
        </div>

        {/* Booking Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Booking Details</h1>
              <p className="text-gray-600">PNR: {FlightItinerary.PNR}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handlePrintTicket}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 print:hidden"
                title="Print Ticket"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownloadTicket}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 print:hidden"
                title="Download Ticket"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={handleEmailTicket}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 print:hidden"
                title="Email Ticket"
              >
                <Mail className="w-5 h-5" />
              </button>
              <button
                onClick={handleShareTicket}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 print:hidden"
                title="Share Ticket"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Booking ID</p>
              <p className="font-medium">{FlightItinerary.BookingId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{BookingDetailsService.getBookingStatusDescription(FlightItinerary.Status)}</p>
            </div>
            {FlightItinerary.InvoiceCreatedOn && (
              <div>
                <p className="text-sm text-gray-500">Booking Date</p>
                <p className="font-medium">
                  {format(parseISO(FlightItinerary.InvoiceCreatedOn), "dd MMM yyyy, HH:mm")}
                </p>
              </div>
            )}
            {FlightItinerary.InvoiceNo && (
              <div>
                <p className="text-sm text-gray-500">Invoice Number</p>
                <p className="font-medium">{FlightItinerary.InvoiceNo}</p>
              </div>
            )}
          </div>
        </div>

        {/* Flight Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Flight Details</h2>
          {FlightItinerary.Segments.map((segment, index) => (
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
                      {format(parseISO(segment.Origin.DepTime), "EEE, dd MMM yyyy")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {segment.FlightStatus} • {segment.Airline.FareClass} Class
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-xl font-semibold">{format(parseISO(segment.Origin.DepTime), "HH:mm")}</div>
                  <div className="font-medium">{segment.Origin.Airport.AirportCode}</div>
                  <div className="text-sm text-gray-500">{segment.Origin.Airport.CityName}</div>
                  {segment.Origin.Airport.Terminal && (
                    <div className="text-xs text-gray-500">Terminal {segment.Origin.Airport.Terminal}</div>
                  )}
                </div>

                <div className="flex-1 px-4">
                  <div className="relative">
                    <div className="border-t-2 border-gray-300 absolute w-full top-1/2"></div>
                  </div>
                  <div className="text-center text-sm text-gray-500 mt-2">
                    {segment.Duration ? `${Math.floor(segment.Duration / 60)}h ${segment.Duration % 60}m` : "Direct"}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-xl font-semibold">{format(parseISO(segment.Destination.ArrTime), "HH:mm")}</div>
                  <div className="font-medium">{segment.Destination.Airport.AirportCode}</div>
                  <div className="text-sm text-gray-500">{segment.Destination.Airport.CityName}</div>
                  {segment.Destination.Airport.Terminal && (
                    <div className="text-xs text-gray-500">Terminal {segment.Destination.Airport.Terminal}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t">
                <div>
                  <p className="text-gray-500">Aircraft</p>
                  <p className="font-medium">{segment.Craft || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Airline PNR</p>
                  <p className="font-medium">{segment.AirlinePNR || FlightItinerary.PNR}</p>
                </div>
                <div>
                  <p className="text-gray-500">Flight Status</p>
                  <p className="font-medium">{segment.FlightStatus}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Passenger Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Passenger Details</h2>
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
                    Baggage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {FlightItinerary.Passenger.map((passenger, index) => {
                  // Use an empty object with the correct shape as fallback
                  const segmentInfo = passenger.SegmentAdditionalInfo?.[0] || {
                    FareBasis: "",
                    NVA: null,
                    NVB: null,
                    Baggage: "N/A",
                    Meal: "N/A",
                  }
                  return (
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
                      <td className="px-6 py-4 whitespace-nowrap">{segmentInfo.Baggage || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{segmentInfo.Meal || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{passenger.Ticket?.Status || "N/A"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Price Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Price Details</h2>
          <div className="border rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Base Fare</p>
                <p className="font-medium">
                  {FlightItinerary.Fare.Currency} {FlightItinerary.Fare.BaseFare.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Taxes & Fees</p>
                <p className="font-medium">
                  {FlightItinerary.Fare.Currency} {FlightItinerary.Fare.Tax.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Other Charges</p>
                <p className="font-medium">
                  {FlightItinerary.Fare.Currency} {FlightItinerary.Fare.OtherCharges.toFixed(2)}
                </p>
              </div>
              {FlightItinerary.Fare.ServiceFee > 0 && (
                <div>
                  <p className="text-sm text-gray-500">Service Fee</p>
                  <p className="font-medium">
                    {FlightItinerary.Fare.Currency} {FlightItinerary.Fare.ServiceFee.toFixed(2)}
                  </p>
                </div>
              )}
              <div className="col-span-2">
                <hr className="my-2" />
              </div>
              <div className="col-span-2 flex justify-between">
                <p className="font-medium">Total Amount</p>
                <p className="font-bold text-lg">
                  {FlightItinerary.Fare.Currency} {FlightItinerary.Fare.PublishedFare.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fare Rules */}
        {FlightItinerary.FareRules && FlightItinerary.FareRules.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Fare Rules</h2>
            <div className="border rounded-lg p-4">
              {FlightItinerary.FareRules.map((rule, index) => (
                <div key={index} className="mb-4 last:mb-0">
                  <h3 className="font-medium mb-2">
                    {rule.Origin} - {rule.Destination} ({rule.Airline})
                  </h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{rule.FareRuleDetail}</p>
                  {rule.FareRestriction && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Restrictions:</p>
                      <p className="text-sm text-gray-600">{rule.FareRestriction}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Need Help?</h2>
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
      </div>
    </div>
  )
}

export default BookingDetails
