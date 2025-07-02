"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import "./SeatMap.css"

interface SeatMapProps {
  seatData: any
  selectedSeats: Record<string, any>
  onSeatSelect: (seat: any) => void
  passengerCount?: number
}

interface SeatInfo {
  Code: string
  RowNo: string
  SeatNo: string | null
  SeatType: number
  SeatWayType: number
  AvailablityType: number
  Price: number
  Origin: string
  Destination: string
}

const SeatMap: React.FC<SeatMapProps> = ({ seatData, selectedSeats, onSeatSelect, passengerCount = 1 }) => {
  const [rows, setRows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [flightInfo, setFlightInfo] = useState<{
    AirlineCode: string
    FlightNumber: string
    CraftType: string
    Origin: string
    Destination: string
  } | null>(null)

  const seatMapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      setLoading(true)
      if (!seatData || !seatData.SegmentSeat || !Array.isArray(seatData.SegmentSeat)) {
        setError("No seat map data available for this flight")
        setLoading(false)
        return
      }

      // Extract flight info from the first segment
      if (seatData.SegmentSeat.length > 0) {
        const segment = seatData.SegmentSeat[0]
        if (segment.RowSeats && segment.RowSeats.length > 0 && segment.RowSeats[0].Seats.length > 0) {
          const firstSeat = segment.RowSeats[0].Seats[0]
          setFlightInfo({
            AirlineCode: firstSeat.AirlineCode || "",
            FlightNumber: firstSeat.FlightNumber || "",
            CraftType: firstSeat.CraftType || "",
            Origin: firstSeat.Origin || "",
            Destination: firstSeat.Destination || "",
          })
        }
      }

      // Process seat data into rows
      const processedRows: any[] = []
      seatData.SegmentSeat.forEach((segment: any) => {
        if (segment.RowSeats && Array.isArray(segment.RowSeats)) {
          segment.RowSeats.forEach((rowData: any) => {
            if (rowData.Seats && Array.isArray(rowData.Seats)) {
              // Group seats by row number
              const rowNo = rowData.Seats[0]?.RowNo
              if (rowNo) {
                const existingRowIndex = processedRows.findIndex((r) => r.rowNo === rowNo)
                if (existingRowIndex >= 0) {
                  // Add to existing row
                  processedRows[existingRowIndex].seats = [...processedRows[existingRowIndex].seats, ...rowData.Seats]
                } else {
                  // Create new row
                  processedRows.push({
                    rowNo,
                    seats: [...rowData.Seats],
                  })
                }
              }
            }
          })
        }
      })

      // Sort rows by row number
      processedRows.sort((a, b) => {
        const aNum = Number.parseInt(a.rowNo, 10)
        const bNum = Number.parseInt(b.rowNo, 10)
        return aNum - bNum
      })

      // Generate rows 0-31 if we don't have enough data
      const dummyRows = []
      for (let i = 0; i <= 31; i++) {
        const rowExists = processedRows.some((row) => Number.parseInt(row.rowNo) === i)
        if (!rowExists) {
          dummyRows.push({
            rowNo: i.toString(),
            seats: generateDummySeats(i),
          })
        }
      }

      const allRows = [...processedRows, ...dummyRows].sort((a, b) => {
        const aNum = Number.parseInt(a.rowNo, 10)
        const bNum = Number.parseInt(b.rowNo, 10)
        return aNum - bNum
      })

      setRows(allRows)
      setLoading(false)
    } catch (error) {
      console.error("Error processing seat map data:", error)
      setError("Failed to process seat map data")
      setLoading(false)
    }
  }, [seatData])

  const generateDummySeats = (rowNo: number) => {
    const seatColumns = ["A", "B", "C", "D", "E", "F"]

    // Create a pattern of available/unavailable seats that matches the screenshot
    const unavailablePattern: Record<string, Record<string, boolean>> = {
      "0": { A: true, B: true, C: true, D: true, E: true, F: true },
      "1": { A: false, B: false, C: false, D: false, E: false, F: false },
      "2": { A: false, B: false, C: false, D: false, E: false, F: false },
      "6": { D: true, E: true, F: true },
    }

    return seatColumns.map((col) => {
      // Check if this seat should be unavailable based on the pattern
      const isUnavailable = unavailablePattern[rowNo.toString()]?.[col] === true

      // Set specific prices for row 2 to match the screenshot (blue seats for D and E)
      let price = 0
      if (rowNo === 2) {
        if (col === "D" || col === "E") {
          price = 200 // Low price range for blue seats
        } else {
          price = 0 // Default price
        }
      } else if (rowNo === 1) {
        price = 950 // XL seats
      } else {
        price = Math.random() > 0.8 ? 0 : Math.floor(Math.random() * 500)
      }

      return {
        RowNo: rowNo.toString(),
        SeatNo: col,
        SeatType: col === "C" || col === "D" ? 3 : col === "A" || col === "F" ? 1 : 2,
        AvailablityType: isUnavailable ? 1 : 3, // 1 = unavailable, 3 = available
        Price: price,
        Origin: flightInfo?.Origin || "DEL",
        Destination: flightInfo?.Destination || "BOM",
      }
    })
  }

  const getSeatContent = (seat: SeatInfo, rowNo: string): React.ReactNode => {
    // If it's row 1, show XL
    if (rowNo === "1") {
      return <span> XL </span>
    }

    // If seat is free (₹0), show ₹0
    if (seat.Price === 0) {
      return <span>₹0</span>
    }

    // Otherwise show empty space
    return <span> </span>
  }

  const handleSeatClick = (seat: SeatInfo) => {
    // Only allow selection of available seats
    if (seat.AvailablityType !== 3 && seat.AvailablityType !== 4) {
      return
    }

    // Check if we've already selected the maximum number of seats
    const currentSelectedCount = Object.keys(selectedSeats).length
    const seatKey = `${seat.RowNo}${seat.SeatNo}`

    // If this seat is already selected, allow deselection
    if (selectedSeats[seatKey]) {
      onSeatSelect(seat)
      return
    }

    // Otherwise, check if we've reached the passenger limit
    if (currentSelectedCount >= passengerCount) {
      alert(`You can only select ${passengerCount} seat(s) for this booking.`)
      return
    }

    // Select the seat
    onSeatSelect(seat)
  }

  const getSeatStyle = (seat: SeatInfo, rowNo: string): React.CSSProperties => {
    // XL seats (row 1 or exit rows)
    if (rowNo === "1" || rowNo === "18" || rowNo === "28" || rowNo === "29") {
      return { backgroundColor: "rgb(201, 186, 255)" }
    }

    // Regular available seats
    if (seat.AvailablityType === 3 || seat.AvailablityType === 4) {
      return { backgroundColor: "rgb(186, 218, 255)" }
    }

    return {}
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#007aff]"></div>
        <span className="ml-2">Loading seat map...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <div>
            <h3 className="font-medium text-amber-800">Seat map unavailable</h3>
            <p className="text-sm text-amber-700 mt-1">{error}</p>
            <p className="text-sm text-amber-700 mt-2">
              You may select seats at the airport check-in counter or through the airline's website.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="seat-map-header">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">
              {flightInfo ? `${flightInfo.Origin} → ${flightInfo.Destination}` : "Select Your Seat"}
            </h2>
            <p className="text-sm">{`${Object.keys(selectedSeats).length} of ${passengerCount} Seat(s) Selected`}</p>
          </div>
          <div className="text-amber-600 font-medium">Selection pending</div>
        </div>
      </div>

      <div className="flightWrap" ref={seatMapRef}>
        <div>
          <span
            className="bgProperties iconflFront"
            style={{ backgroundImage: "url('https://jsak.mmtcdn.com/flights/assets/media/ic_flightSmallFront.png')" }}
          ></span>
        </div>

        <div className="flightSeatMatrix">
          <div>
            {/* Lavatory row */}
            <div className="seatRow">
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="lavatoryWrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM10 8v14h4V8h-4z" fill="#9CA3AF" />
                  </svg>
                </div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="lavatoryWrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM10 8v14h4V8h-4z" fill="#9CA3AF" />
                  </svg>
                </div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
            </div>

            {/* Exit row */}
            <div className="seatRow">
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="exitIcon left">
                  <span className="exit-icon exit-left">Exit</span>
                </div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="exitIcon right">
                  <span className="exit-icon exit-right">Exit</span>
                </div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
            </div>

            {/* Column headers */}
            <div className="seatRow">
              <div className="seatCol">
                <div>
                  <div className="seatEmptyLabel"></div>
                </div>
              </div>
              <div className="seatCol">
                <div>
                  <div className="seatLabel">A</div>
                </div>
              </div>
              <div className="seatCol">
                <div>
                  <div className="seatLabel">B</div>
                </div>
              </div>
              <div className="seatCol">
                <div>
                  <div className="seatLabel">C</div>
                </div>
              </div>
              <div className="seatCol">
                <div>
                  <div className="seatEmptyLabel"></div>
                </div>
              </div>
              <div className="seatCol">
                <div>
                  <div className="seatLabel">D</div>
                </div>
              </div>
              <div className="seatCol">
                <div>
                  <div className="seatLabel">E</div>
                </div>
              </div>
              <div className="seatCol">
                <div>
                  <div className="seatLabel">F</div>
                </div>
              </div>
              <div className="seatCol">
                <div>
                  <div className="seatEmptyLabel"></div>
                </div>
              </div>
            </div>

            {/* Seat rows */}
            {rows.map((row) => (
              <div className="seatRow" key={`row-${row.rowNo}`}>
                <div className="seatCol">
                  <div>
                    <div className="seatLabel">{row.rowNo}</div>
                  </div>
                </div>

                {["A", "B", "C"].map((seatCol) => {
                  const seat = row.seats.find((s: SeatInfo) => s.SeatNo === seatCol)
                  const seatKey = `${row.rowNo}${seatCol}`

                  if (!seat) {
                    return (
                      <div className="seatCol" key={`empty-${row.rowNo}-${seatCol}`}>
                        <div className="emptyCell"></div>
                      </div>
                    )
                  }

                  return (
                    <div className="seatCol" key={`${row.rowNo}-${seatCol}`}>
                      <div className="relative" id={`${seat.Origin}$${seat.Destination}$${row.rowNo}${seatCol}`}>
                        {seat.AvailablityType === 3 || seat.AvailablityType === 4 ? (
                          <div
                            className={`seatBlock pointer ${row.rowNo === "18" || row.rowNo === "28" || row.rowNo === "29" ? "noReclineExitSeat" : ""}`}
                            style={getSeatStyle(seat, row.rowNo)}
                            onClick={() => handleSeatClick(seat)}
                          >
                            {getSeatContent(seat, row.rowNo)}
                            <div className="seat-tooltip">
                              Seat {row.rowNo}
                              {seatCol} - ₹{seat.Price}
                            </div>
                          </div>
                        ) : (
                          <div className="seatNotAvailable">
                            <img
                              src="https://imgak.mmtcdn.com/flights/assets/media/dt/ancillaries/seat_not_available.png"
                              alt="seatNotAvailaible"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                <div className="seatCol">
                  <div>
                    <div className="seatEmptyLabel"></div>
                  </div>
                </div>

                {["D", "E", "F"].map((seatCol) => {
                  const seat = row.seats.find((s: SeatInfo) => s.SeatNo === seatCol)
                  const seatKey = `${row.rowNo}${seatCol}`

                  if (!seat) {
                    return (
                      <div className="seatCol" key={`empty-${row.rowNo}-${seatCol}`}>
                        <div className="emptyCell"></div>
                      </div>
                    )
                  }

                  return (
                    <div className="seatCol" key={`${row.rowNo}-${seatCol}`}>
                      <div className="relative" id={`${seat.Origin}$${seat.Destination}$${row.rowNo}${seatCol}`}>
                        {seat.AvailablityType === 3 || seat.AvailablityType === 4 ? (
                          <div
                            className={`seatBlock pointer ${row.rowNo === "18" || row.rowNo === "28" || row.rowNo === "29" ? "noReclineExitSeat" : ""}`}
                            style={getSeatStyle(seat, row.rowNo)}
                            onClick={() => handleSeatClick(seat)}
                          >
                            {getSeatContent(seat, row.rowNo)}
                            <div className="seat-tooltip">
                              Seat {row.rowNo}
                              {seatCol} - ₹{seat.Price}
                            </div>
                          </div>
                        ) : (
                          <div className="seatNotAvailable">
                            <img
                              src="https://imgak.mmtcdn.com/flights/assets/media/dt/ancillaries/seat_not_available.png"
                              alt="seatNotAvailaible"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                <div className="seatCol">
                  <div>
                    <div className="seatLabel">{row.rowNo}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Bottom lavatory row */}
            <div className="seatRow">
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="galleyWrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="4" width="16" height="16" rx="2" stroke="#9CA3AF" strokeWidth="2" />
                    <line x1="8" y1="8" x2="16" y2="8" stroke="#9CA3AF" strokeWidth="2" />
                    <line x1="8" y1="12" x2="16" y2="12" stroke="#9CA3AF" strokeWidth="2" />
                    <line x1="8" y1="16" x2="16" y2="16" stroke="#9CA3AF" strokeWidth="2" />
                  </svg>
                </div>
              </div>
              <div className="seatCol">
                <div className="lavatoryWrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM10 8v14h4V8h-4z" fill="#9CA3AF" />
                  </svg>
                </div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="lavatoryWrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM10 8v14h4V8h-4z" fill="#9CA3AF" />
                  </svg>
                </div>
              </div>
              <div className="seatCol">
                <div className="galleyWrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="4" width="16" height="16" rx="2" stroke="#9CA3AF" strokeWidth="2" />
                    <line x1="8" y1="8" x2="16" y2="8" stroke="#9CA3AF" strokeWidth="2" />
                    <line x1="8" y1="12" x2="16" y2="12" stroke="#9CA3AF" strokeWidth="2" />
                    <line x1="8" y1="16" x2="16" y2="16" stroke="#9CA3AF" strokeWidth="2" />
                  </svg>
                </div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
            </div>

            {/* Bottom exit row */}
            <div className="seatRow">
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="exitIcon left">
                  <span className="exit-icon exit-left">Exit</span>
                </div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
              <div className="seatCol">
                <div className="exitIcon right">
                  <span className="exit-icon exit-right">Exit</span>
                </div>
              </div>
              <div className="seatCol">
                <div className="emptyCell"></div>
              </div>
            </div>
          </div>

          {/* Seat legend */}
          <div className="seat-legend">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: "#a7f3d0", border: "1px solid #6ee7b7" }}></div>
              <span>Free</span>
            </div>
            <div className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: "rgb(186, 218, 255)", border: "1px solid #60a5fa" }}
              ></div>
              <span>₹ 99-400</span>
            </div>
            <div className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: "rgb(201, 186, 255)", border: "1px solid #c4b5fd" }}
              ></div>
              <span>₹ 500-950</span>
            </div>
            <div className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: "white", border: "1px solid #d1d5db", position: "relative" }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 0,
                    height: 0,
                    borderStyle: "solid",
                    borderWidth: "10px 10px 0 0",
                    borderColor: "#e63946 transparent transparent transparent",
                  }}
                ></div>
              </div>
              <span>Exit Row Seats</span>
            </div>
          </div>
        </div>

        <div>
          <span
            className="bgProperties iconflTail"
            style={{ backgroundImage: "url('https://jsak.mmtcdn.com/flights/assets/media/ic_flightSmallTail.png')" }}
          ></span>
        </div>
      </div>
    </div>
  )
}

export default SeatMap