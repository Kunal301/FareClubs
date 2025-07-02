"use client"

import type React from "react"
import { useState } from "react"
import { X } from "lucide-react"
import SeatMap from "./SeatMap"

interface ViewSeatMapButtonProps {
  seatData: any
  passengerCount?: number
  onSeatSelect?: (selectedSeats: Record<string, any>) => void
}

const ViewSeatMapButton: React.FC<ViewSeatMapButtonProps> = ({ seatData, passengerCount = 1, onSeatSelect }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedSeats, setSelectedSeats] = useState<Record<string, any>>({})

  const handleSeatSelect = (seat: any) => {
    const seatKey = `${seat.RowNo}${seat.SeatNo}`

    // Toggle seat selection
    setSelectedSeats((prev) => {
      const newSelection = { ...prev }

      if (newSelection[seatKey]) {
        // If already selected, remove it
        delete newSelection[seatKey]
      } else {
        // Otherwise add it
        newSelection[seatKey] = seat
      }

      return newSelection
    })
  }

  const handleConfirm = () => {
    if (onSeatSelect) {
      onSeatSelect(selectedSeats)
    }
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        View Interactive Seat Map
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">Select Your Seats</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-0">
              <SeatMap
                seatData={seatData}
                selectedSeats={selectedSeats}
                onSeatSelect={handleSeatSelect}
                passengerCount={passengerCount}
              />
            </div>

            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={handleConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ViewSeatMapButton
