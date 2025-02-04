import type React from "react"
import { Luggage } from "lucide-react"
import { format, parseISO, isValid } from "date-fns"
import { useNavigate } from "react-router-dom"

interface FlightCardProps {
  flight: {
    SearchSegmentId: number
    JourneyTime: number
    OptionSegmentsInfo: {
      DepartureAirport: string
      ArrivalAirport: string
      DepartureTime: string
      ArrivalTime: string
      MarketingAirline: string
      FlightNumber: string
    }[]
    OptionPriceInfo: {
      TotalPrice: string
      TotalBasePrice: string
      TotalTax: string
      PaxPriceDetails: {
        PaxType: string
        BasePrice: string
        FuelSurcharge: string
        AirportTax: string
        UdfCharge: string
        CongestionCharge: string
        SupplierAddCharge: string
      }[]
    }
  }
  selectedTab: string | null
  onTabClick: (flightId: number, tabName: string) => void
  getAirlineImage: (airline: string) => string
  isSelected: boolean
  onSelect: () => void
  onBook: (flightId: number) => void
}

export const FlightCard: React.FC<FlightCardProps> = ({
  flight,
  selectedTab,
  onTabClick,
  getAirlineImage,
  isSelected,
  onSelect,
  onBook,
}) => {
  const navigate = useNavigate()
  const formatDateTime = (dateTimeStr: string) => {
    let date = parseISO(dateTimeStr)
    if (!isValid(date)) {
      const [datePart, timePart] = dateTimeStr.split(", ")
      const [day, month, year] = datePart.split("/")
      const isoString = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart}`
      date = parseISO(isoString)
    }
    return format(date, "HH:mm")
  }

  const calculateDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const isNextDay = (departureTime: string, arrivalTime: string) => {
    const depDate = new Date(departureTime)
    const arrDate = new Date(arrivalTime)
    return arrDate.getDate() > depDate.getDate()
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
          <img
            src={getAirlineImage(flight.OptionSegmentsInfo[0].MarketingAirline) || "/placeholder.svg"}
            alt={flight.OptionSegmentsInfo[0].MarketingAirline}
            className="w-10 h-10 object-contain"
          />
          <div>
            <div className="font-medium">{flight.OptionSegmentsInfo[0].MarketingAirline}</div>
            <div className="text-sm text-gray-500">{flight.OptionSegmentsInfo[0].FlightNumber}</div>
          </div>
        </div>

        <div className="flex-1 px-8">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-xl font-semibold">{formatDateTime(flight.OptionSegmentsInfo[0].DepartureTime)}</div>
              <div className="text-sm text-gray-500">{flight.OptionSegmentsInfo[0].DepartureAirport}</div>
            </div>

            <div className="flex-1 px-4">
              <div className="text-center text-sm text-gray-500">{calculateDuration(flight.JourneyTime)}</div>
              <div className="relative">
                <div className="border-t-2 border-gray-300 absolute w-full top-1/2"></div>
              </div>
              <div className="text-center text-xs text-gray-500">
                {flight.OptionSegmentsInfo.length > 1 ? `${flight.OptionSegmentsInfo.length - 1} Stop` : "Non-stop"}
              </div>
            </div>

            <div className="text-center">
              <div className="text-xl font-semibold">
                {formatDateTime(flight.OptionSegmentsInfo[flight.OptionSegmentsInfo.length - 1].ArrivalTime)}
              </div>
              <div className="text-sm text-gray-500">
                {flight.OptionSegmentsInfo[flight.OptionSegmentsInfo.length - 1].ArrivalAirport}
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end space-x-2">
            <div className="text-2xl font-bold">₹{flight.OptionPriceInfo.TotalPrice}</div>
            {isNextDay(
              flight.OptionSegmentsInfo[0].DepartureTime,
              flight.OptionSegmentsInfo[flight.OptionSegmentsInfo.length - 1].ArrivalTime,
            ) && <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded">Next Day</span>}
          </div>
          <div className="text-sm text-green-600 font-medium">Zero Fees</div>
          <button
            className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => navigate("/booking", { state: { flight } })}
          >
            Book Now
          </button>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex space-x-4 mb-4">
          <button
            className={`${
              selectedTab === "flightDetails" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
            } pb-2`}
            onClick={() => onTabClick(flight.SearchSegmentId, "flightDetails")}
          >
            Flight Details
          </button>
          <button
            className={`${
              selectedTab === "fareSummary" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
            } pb-2`}
            onClick={() => onTabClick(flight.SearchSegmentId, "fareSummary")}
          >
            Fare Summary
          </button>
          <button
            className={`${
              selectedTab === "fareDetails" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
            } pb-2`}
            onClick={() => onTabClick(flight.SearchSegmentId, "fareDetails")}
          >
            Fare Details
          </button>
        </div>

        {selectedTab === "flightDetails" && (
          <div className="bg-gray-50 p-4 rounded-lg">
            {flight.OptionSegmentsInfo.map((segment, index) => (
              <div key={index} className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={getAirlineImage(segment.MarketingAirline) || "/placeholder.svg"}
                    alt={segment.MarketingAirline}
                    className="w-8 h-8 object-contain"
                  />
                  <div>
                    <div className="font-medium">
                      {segment.MarketingAirline} {segment.FlightNumber}
                    </div>
                    <div className="text-sm text-gray-500">
                      {segment.DepartureAirport} → {segment.ArrivalAirport}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatDateTime(segment.DepartureTime)} - {formatDateTime(segment.ArrivalTime)}
                  </div>
                  <div className="text-sm text-gray-500">{calculateDuration(flight.JourneyTime)}</div>
                </div>
              </div>
            ))}
            <div className="flex items-center space-x-6 text-sm text-gray-600 mt-4">
              <div className="flex items-center">
                <Luggage className="w-4 h-4 mr-2" />
                <span>Check-in: 15 Kg</span>
              </div>
              <div className="flex items-center">
                <Luggage className="w-4 h-4 mr-2" />
                <span>Cabin: 7 Kg</span>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "fareSummary" && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Fare</span>
              <span>₹{flight.OptionPriceInfo.TotalBasePrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Taxes & Fees</span>
              <span>₹{flight.OptionPriceInfo.TotalTax}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total Amount</span>
              <span>₹{flight.OptionPriceInfo.TotalPrice}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

