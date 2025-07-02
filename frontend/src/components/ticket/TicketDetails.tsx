"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { format, parseISO } from "date-fns"
import { AirlineLogo } from "../common/AirlineLogo"
import { downloadPDFTicket, type TicketResponse } from "../../services/ticketService"
import { Printer, Download, Mail, Share2 } from "lucide-react"

interface TicketDetailsProps {
  ticketResponse?: TicketResponse
}

const TicketDetails: React.FC<TicketDetailsProps> = ({ ticketResponse: propTicketResponse }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [ticketResponse, setTicketResponse] = useState<TicketResponse | null>(propTicketResponse || null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If ticket response is provided as prop, use it
    if (propTicketResponse) {
      setTicketResponse(propTicketResponse)
      return
    }

    // Otherwise, try to get it from location state
    if (location.state?.ticketResponse) {
      setTicketResponse(location.state.ticketResponse)
    } else {
      setError("No ticket details available")
    }
  }, [location.state, propTicketResponse])

  const handlePrintTicket = () => {
    window.print()
  }

  const handleDownloadTicket = async () => {
    if (!ticketResponse) {
      setError("No ticket details available for download")
      return
    }

    setIsLoading(true)
    try {
      const pnr = ticketResponse.Response?.Response?.PNR || "ticket"
      await downloadPDFTicket(ticketResponse, `ticket_${pnr}.pdf`)
    } catch (err) {
      setError(`Failed to download ticket: ${(err as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailTicket = () => {
    if (!ticketResponse?.Response?.Response?.FlightItinerary?.Passenger) {
      setError("No passenger details available to email ticket")
      return
    }

    const leadPassenger =
      ticketResponse.Response.Response.FlightItinerary.Passenger.find((p) => p.IsLeadPax) ||
      ticketResponse.Response.Response.FlightItinerary.Passenger[0]

    const emailSubject = `Your Flight Ticket - PNR: ${ticketResponse.Response.Response.PNR}`
    const emailBody = `Dear ${leadPassenger.FirstName},\n\nPlease find your flight ticket attached.\n\nPNR: ${ticketResponse.Response.Response.PNR}\n\nThank you for booking with FareClubs.`

    window.location.href = `mailto:${leadPassenger.Email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
  }

  const handleShareTicket = () => {
    if (!ticketResponse?.Response?.Response?.PNR) {
      setError("No ticket details available to share")
      return
    }

    if (navigator.share) {
      navigator
        .share({
          title: `Flight Ticket - PNR: ${ticketResponse.Response.Response.PNR}`,
          text: `My flight ticket with PNR: ${ticketResponse.Response.Response.PNR}`,
          url: window.location.href,
        })
        .catch((err) => {
          console.error("Error sharing ticket:", err)
          setError("Failed to share ticket")
        })
    } else {
      setError("Sharing is not supported on this device")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#007aff]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-red-800 mb-2">Error</h3>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }

  if (!ticketResponse?.Response?.Response?.FlightItinerary) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-yellow-800 mb-2">No Ticket Details</h3>
        <p className="text-sm text-yellow-700">No ticket details are available to display.</p>
      </div>
    )
  }

  const { FlightItinerary } = ticketResponse.Response.Response
  const { PNR, BookingId } = ticketResponse.Response.Response
  const leadPassenger = FlightItinerary.Passenger.find((p) => p.IsLeadPax) || FlightItinerary.Passenger[0]
  const ticketNumber = leadPassenger.Ticket?.TicketNumber || PNR
  const issueDate = leadPassenger.Ticket?.IssueDate
    ? format(parseISO(leadPassenger.Ticket.IssueDate), "dd MMM yyyy")
    : "N/A"

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 print:shadow-none">
      {/* Ticket Header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold">E-Ticket</h2>
          <p className="text-gray-600">Booking Reference: {PNR}</p>
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

      {/* Ticket Details */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Booking ID</p>
            <p className="font-medium">{BookingId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Ticket Number</p>
            <p className="font-medium">{ticketNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Issue Date</p>
            <p className="font-medium">{issueDate}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium text-green-600">Confirmed</p>
          </div>
        </div>
      </div>

      {/* Flight Details */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Flight Details</h3>
        {FlightItinerary.Segments.map((segment, index) => (
          <div key={index} className="border rounded-lg p-4 mb-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white rounded-lg border flex items-center justify-center">
                <AirlineLogo airline={segment.Airline.AirlineCode} size="lg" />
              </div>
              <div>
                <p className="font-medium">
                  {segment.Airline.AirlineName} {segment.Airline.FlightNumber}
                </p>
                <p className="text-sm text-gray-500">{format(parseISO(segment.Origin.DepTime), "EEE, dd MMM yyyy")}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{format(parseISO(segment.Origin.DepTime), "HH:mm")}</p>
                <p className="font-medium">{segment.Origin.Airport.AirportCode}</p>
                <p className="text-sm text-gray-500">{segment.Origin.Airport.CityName}</p>
                <p className="text-xs text-gray-500">Terminal: {segment.Origin.Airport.Terminal || "N/A"}</p>
              </div>

              <div className="flex-1 px-4">
                <div className="relative">
                  <div className="border-t border-gray-300 absolute w-full top-3"></div>
                  <div className="flex justify-center">
                    <div className="bg-white px-2 relative">
                      <p className="text-xs text-gray-500">
                        {Math.floor(segment.Duration / 60)}h {segment.Duration % 60}m
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-2xl font-bold">{format(parseISO(segment.Destination.ArrTime), "HH:mm")}</p>
                <p className="font-medium">{segment.Destination.Airport.AirportCode}</p>
                <p className="text-sm text-gray-500">{segment.Destination.Airport.CityName}</p>
                <p className="text-xs text-gray-500">Terminal: {segment.Destination.Airport.Terminal || "N/A"}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Class</p>
                <p className="font-medium">
                  {segment.CabinClass === 2
                    ? "Economy"
                    : segment.CabinClass === 3
                      ? "Premium Economy"
                      : segment.CabinClass === 4
                        ? "Business"
                        : segment.CabinClass === 5
                          ? "First"
                          : "Economy"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Baggage</p>
                <p className="font-medium">{segment.Baggage || "15 KG"}</p>
              </div>
              <div>
                <p className="text-gray-500">Cabin Baggage</p>
                <p className="font-medium">{segment.CabinBaggage || "7 KG"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Passenger Details */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Passenger Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Baggage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seat</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {FlightItinerary.Passenger.map((passenger, index) => {
                const segmentInfo = passenger.SegmentAdditionalInfo?.[0] || {}
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
                    <td className="px-6 py-4 whitespace-nowrap">{(segmentInfo as any)?.Baggage || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{(segmentInfo as any)?.Meal || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{(segmentInfo as any)?.Seat || "N/A"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
        <div className="border rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Base Fare</p>
              <p className="font-medium">₹{FlightItinerary.Fare.BaseFare.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Taxes & Fees</p>
              <p className="font-medium">₹{FlightItinerary.Fare.Tax.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Other Charges</p>
              <p className="font-medium">₹{FlightItinerary.Fare.OtherCharges.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="font-medium text-lg">₹{FlightItinerary.Fare.PublishedFare.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Important Information */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Important Information</h3>
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Please arrive at the airport at least 2 hours before the scheduled departure for domestic flights and 3
              hours for international flights.
            </li>
            <li>Carry a valid photo ID proof along with this e-ticket for security check and verification.</li>
            <li>Check-in counters usually close 45 minutes before departure for domestic flights.</li>
            <li>
              For any changes or cancellations, please contact our customer support at least 4 hours before the
              scheduled departure.
            </li>
            <li>
              Baggage allowance is subject to airline policies and may vary based on fare type and class of travel.
            </li>
          </ul>
        </div>
      </div>

      {/* Contact Information */}
      <div className="border-t pt-4 mt-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">FareClubs Customer Support</p>
            <p className="text-sm text-gray-500">Email: support@fareclubs.com</p>
            <p className="text-sm text-gray-500">Phone: +91-1234567890</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              This is a computer-generated document and does not require a signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TicketDetails
