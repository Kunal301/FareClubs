import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import { format, isValid, parseISO, parse } from "date-fns"
import { SearchHeader } from "./Search/SearchHeader";
import { FilterSection } from "./Search/FilterSection";
import { SortingTabs, type SortOption } from "./Search/SortingTabs";
import { FlightCard } from "./Search/FlightCard";
import { Pagination } from "./Search/Pagination";
import { Header } from "./common/Header"

interface PaxPriceDetail {
  PaxType: string
  BasePrice: string
  FuelSurcharge: string
  AirportTax: string
  UdfCharge: string
  SupplierServiceTax: string
  OCTransactionFee: string
  SBCTax: string
  KKCTax: string
  CongestionCharge: string
  SupplierAddCharge: string
}

interface OptionPriceInfo {
  TotalPrice: string
  TotalBasePrice: string
  TotalTax: string
  TotalServiceTax: string
  TotalCommission: string
  PaxPriceDetails: PaxPriceDetail[]
  ManagementFee: string
}

interface SearchResult {
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
  OptionPriceInfo: OptionPriceInfo
}

const uniqueFlights = (flights: SearchResult[]) => {
  const uniqueFlightMap = new Map()
  return flights.filter((flight) => {
    const key = `${flight.OptionSegmentsInfo[0].MarketingAirline}-${flight.OptionSegmentsInfo[0].FlightNumber}-${flight.OptionSegmentsInfo[0].DepartureTime}`
    if (!uniqueFlightMap.has(key)) {
      uniqueFlightMap.set(key, true)
      return true
    }
    return false
  })
}

const SearchResults: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [priceRange, setPriceRange] = useState<number[]>([0, 100000])
  const [selectedStops, setSelectedStops] = useState<number[]>([])
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([])
  const [selectedFlight, setSelectedFlight] = useState<{
    id: number | null
    tab: string | null
  }>({
    id: null,
    tab: null,
  })
  const [sortOption, setSortOption] = useState<SortOption>("CHEAPEST")
  const [searchForm, setSearchForm] = useState({
    from: "",
    to: "",
    date: "",
    passengers: 1,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [flightsPerPage] = useState(15)
  const [shouldSearch, setShouldSearch] = useState(false)
  const [selectedDepartureTimes, setSelectedDepartureTimes] = useState<string[]>([])
  const [selectedFlightIds, setSelectedFlightIds] = useState<number[]>([])
  const [repricedResults, setRepricedResults] = useState<any>(null)
  const [repricingModalOpen, setRepricingModalOpen] = useState(false)
  const [repricingFlight, setRepricingFlight] = useState<SearchResult | null>(null)
  const [initialSearchParams, setInitialSearchParams] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Get search params from location state or localStorage
  const getInitialSearchParams = useCallback(() => {
    if (location.state?.searchParams) {
      // Save to localStorage when we have params from state
      localStorage.setItem("searchParams", JSON.stringify(location.state.searchParams))
      localStorage.setItem("sessionId", location.state.sessionId)
      return location.state.searchParams
    }

    // Try to get from localStorage if state is null
    const savedParams = localStorage.getItem("searchParams")
    if (savedParams) {
      return JSON.parse(savedParams)
    }

    // If no saved params, redirect to dashboard
    navigate("/")
    return null
  }, [location.state, navigate])

  const getSessionId = useCallback(() => {
    return location.state?.sessionId || localStorage.getItem("sessionId")
  }, [location.state])

  useEffect(() => {
    const params = getInitialSearchParams()
    const sid = getSessionId()
    setInitialSearchParams(params)
    setSessionId(sid)
    if (params) {
      localStorage.setItem("searchParams", JSON.stringify(params))
      setSearchForm({
        from: params.from,
        to: params.to,
        date: params.date,
        passengers: params.passengers,
      })
    }
    if (sid) {
      localStorage.setItem("sessionId", sid)
    }

    // Check if we should trigger a search
    if (location.state?.shouldSearch) {
      setShouldSearch(true)
    } else {
      // Try to load results from localStorage
      const savedResults = localStorage.getItem("searchResults")
      if (savedResults) {
        setResults(JSON.parse(savedResults))
      }
    }
  }, [getInitialSearchParams, getSessionId, location.state?.shouldSearch])

  // If we don't have search params or session ID, don't render anything
  // if (!initialSearchParams || !sessionId) {
  //   return null
  // }

  const searchFlights = useCallback(async () => {
    if (!shouldSearch) return;
  
    setLoading(true);
    setError("");
  
    try {
      const requestData = {
        Data: {
          IsMobileSearchQuery: "N",
          MaxOptionsCount: "10",
          TravelType: "D",
          JourneyType: "O",
          IsPersonalBooking: "N",
          AirOriginDestinations: [
            {
              DepartureAirport: searchForm.from,
              ArrivalAirport: searchForm.to,
              DepartureDate: formatDate(searchForm.date),
            },
          ],
          AirPassengerQuantities: {
            NumAdults: Number(searchForm.passengers),
            NumChildren: 0,
            NumInfants: 0,
          },
          AirSearchPreferences: {
            BookingClass: "G",
            Carrier: "ANY",
          },
          SearchLevelReportingParams: {
            BillingEntityCode: 0,
          },
        },
        sessionId: sessionId || localStorage.getItem("sessionId") || "", // ✅ **Ensure sessionId is always sent**
      };
  
      console.log("Sending request:", JSON.stringify(requestData, null, 2));
  
      const response = await axios.post("http://localhost:5000/api/air/search", requestData, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
  
      console.log("Raw API Response:", JSON.stringify(response.data, null, 2));
  
      if (response.data.Status === "Success" && Array.isArray(response.data.Data.AirSearchResult)) {
        const processedResults = response.data.Data.AirSearchResult.map((result: any) => ({
          SearchSegmentId: result.SearchSegmentId,
          JourneyTime: result.JourneyTime,
          OptionSegmentsInfo: result.OptionSegmentsInfo.map((segment: any) => ({
            DepartureAirport: segment.DepartureAirport,
            ArrivalAirport: segment.ArrivalAirport,
            DepartureTime: segment.DepartureTime,
            ArrivalTime: segment.ArrivalTime,
            MarketingAirline: segment.MarketingAirline,
            FlightNumber: segment.FlightNumber,
          })),
          OptionPriceInfo: result.OptionPriceInfo,
        }));
  
        setResults(processedResults);
        localStorage.setItem("searchResults", JSON.stringify(processedResults));  // ✅ **Save new results**
      } else {
        setError(response.data.Description || "Search failed");
      }
    } catch (err) {
      console.error("Error in searchFlights:", err);
      if (axios.isAxiosError(err)) {
        console.error("Axios error details:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          headers: err.response?.headers,
        });
      }
      setError("Failed to fetch results");
    } finally {
      setLoading(false);
      setShouldSearch(false);
    }
  }, [searchForm, sessionId, shouldSearch]);
  

  useEffect(() => {
    if (shouldSearch) {
      searchFlights()
    }
  }, [searchFlights, shouldSearch])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSearchForm({ ...searchForm, [e.target.name]: e.target.value })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShouldSearch(true)
    // Clear previous results from localStorage
    localStorage.removeItem("searchResults")
  }

  const handleTabClick = (flightId: number, tabName: string) => {
    setSelectedFlight((prev) => {
      if (prev.id === flightId && prev.tab === tabName) {
        return { id: null, tab: null }
      }
      return { id: flightId, tab: tabName }
    })
  }

  const formatDate = (date: string) => {
    const parsedDate = parse(date, "yyyy-MM-dd", new Date())
    return format(parsedDate, "dd/MM/yyyy")
  }

  const formatDateTime = (dateTimeStr: string) => {
    let date = parseISO(dateTimeStr)

    if (!isValid(date)) {
      const [datePart, timePart] = dateTimeStr.split(", ")
      const [day, month, year] = datePart.split("/")
      const isoString = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart}`
      date = parseISO(isoString)
    }

    if (!isValid(date)) {
      console.error("Invalid date:", dateTimeStr)
      return { time: "Invalid", date: "Invalid" }
    }

    return {
      time: format(date, "HH:mm"),
      date: format(date, "dd MMM, yyyy"),
    }
  }

  const calculateDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getAirlineImage = (airline: string) => {
    const airlineImageMap: { [key: string]: string } = {
      IndiGo: "/images/indigo.png",
      "Air India": "/images/airindia.png",
      "Air India Express": "/images/airindia-express.png",
      "Akasa Air": "/images/akasaair.jpeg",
      "Asdf AIr": "/images/spicejet.png",
      "Alliance Air": "/images/allianceair.jpeg",
    };
    return airlineImageMap[airline] || "/images/default-airline.png";
  };

  const sortFlights = (flights: SearchResult[], option: SortOption) => {
    return [...flights].sort((a, b) => {
      switch (option) {
        case "CHEAPEST":
          return Number(a.OptionPriceInfo.TotalPrice) - Number(b.OptionPriceInfo.TotalPrice)
        case "SHORTEST":
          return a.JourneyTime - b.JourneyTime
        case "DEPARTURE":
        case "ARRIVAL":
          const getDateTime = (flight: SearchResult, isArrival: boolean) => {
            const timeStr = isArrival
              ? flight.OptionSegmentsInfo[flight.OptionSegmentsInfo.length - 1].ArrivalTime
              : flight.OptionSegmentsInfo[0].DepartureTime
            const [datePart, timePart] = timeStr.split(", ")
            const [day, month, year] = datePart.split("/")
            const [hours, minutes] = timePart.split(":")
            return new Date(
              Number.parseInt(year),
              Number.parseInt(month) - 1,
              Number.parseInt(day),
              Number.parseInt(hours),
              Number.parseInt(minutes),
            )
          }
          const aTime = getDateTime(a, option === "ARRIVAL")
          const bTime = getDateTime(b, option === "ARRIVAL")
          return aTime.getTime() - bTime.getTime()
        default:
          return 0
      }
    })
  }

  console.log(
    "Sorted Flights:",
    sortFlights(results, sortOption)
      .slice(0, 5)
      .map((flight) => ({
        airline: flight.OptionSegmentsInfo[0].MarketingAirline,
        flightNumber: flight.OptionSegmentsInfo[0].FlightNumber,
        departureTime: flight.OptionSegmentsInfo[0].DepartureTime,
        arrivalTime: flight.OptionSegmentsInfo[flight.OptionSegmentsInfo.length - 1].ArrivalTime,
        price: flight.OptionPriceInfo.TotalPrice,
      })),
  )

  const resetFilters = () => {
    setPriceRange([minPrice, maxPrice])
    setSelectedStops([])
    setSelectedAirlines([])
    setSelectedDepartureTimes([])
  }

  const handleDepartureTimeChange = (timeRange: string) => {
    setSelectedDepartureTimes((prev) => {
      if (prev.includes(timeRange)) {
        return prev.filter((t) => t !== timeRange)
      }
      return [...prev, timeRange]
    })
  }

  // Add this debug function
  const debugDepartureTime = (flight: SearchResult) => {
    const departureTimeStr = flight.OptionSegmentsInfo[0]?.DepartureTime
    console.log("Original Departure Time:", departureTimeStr)

    // Try parsing with different methods
    const directDate = new Date(departureTimeStr)
    console.log("Direct Parse Result:", {
      date: directDate,
      hours: directDate.getHours(),
      minutes: directDate.getMinutes(),
      isValid: !isNaN(directDate.getTime()),
    })

    // Log the actual departure time string we're working with
    console.log("Flight Details:", {
      airline: flight.OptionSegmentsInfo[0]?.MarketingAirline,
      flightNumber: flight.OptionSegmentsInfo[0]?.FlightNumber,
      departureTime: departureTimeStr,
    })
  }

  const filteredResults = useMemo(() => {
    console.log("Selected Departure Times:", selectedDepartureTimes)

    return sortFlights(
      results.filter((result) => {
        const price = Number(result.OptionPriceInfo?.TotalPrice || 0)
        const airline = result.OptionSegmentsInfo[0]?.MarketingAirline || ""
        const stops = (result.OptionSegmentsInfo?.length || 1) - 1

        // Parse departure time
        const departureTimeStr = result.OptionSegmentsInfo[0]?.DepartureTime
        let departureTime: Date

        try {
          // Parse the date string directly
          const [datePart, timePart] = departureTimeStr.split(", ")
          const [day, month, year] = datePart.split("/")
          const [hours, minutes] = timePart.split(":")
          departureTime = new Date(
            Number.parseInt(year),
            Number.parseInt(month) - 1,
            Number.parseInt(day),
            Number.parseInt(hours),
            Number.parseInt(minutes),
          )

          const totalMinutes = departureTime.getHours() * 60 + departureTime.getMinutes()

          const isInSelectedTimeRange =
            selectedDepartureTimes.length === 0 ||
            selectedDepartureTimes.some((timeRange) => {
              const [startTime, endTime] = timeRange.split(" - ")
              const [startHour, startMinute = "00"] = startTime.split(":")
              const [endHour, endMinute = "00"] = endTime.split(":")

              const rangeStart = Number.parseInt(startHour) * 60 + Number.parseInt(startMinute)
              const rangeEnd = Number.parseInt(endHour) * 60 + Number.parseInt(endMinute)

              return totalMinutes >= rangeStart && totalMinutes < rangeEnd
            })

          return (
            price >= priceRange[0] &&
            price <= priceRange[1] &&
            (selectedAirlines.length === 0 || selectedAirlines.includes(airline)) &&
            (selectedStops.length === 0 || selectedStops.includes(stops)) &&
            isInSelectedTimeRange
          )
        } catch (error) {
          console.error("Error parsing departure time:", error, {
            departureTimeStr,
            flight: `${airline} ${result.OptionSegmentsInfo[0]?.FlightNumber}`,
          })
          return false
        }
      }),
      sortOption,
    )
  }, [results, priceRange, selectedAirlines, selectedStops, selectedDepartureTimes, sortOption])

  console.log("Filtered Results:", filteredResults.length)
  console.log("Sample Flight:", filteredResults[0])

  const totalPages = Math.ceil(filteredResults.length / flightsPerPage)

  const getCurrentPageFlights = () => {
    const indexOfLastFlight = currentPage * flightsPerPage
    const indexOfFirstFlight = indexOfLastFlight - flightsPerPage
    return filteredResults.slice(indexOfFirstFlight, indexOfLastFlight)
  }

  const goToNextPage = () => setCurrentPage((page) => Math.min(page + 1, totalPages))
  const goToPrevPage = () => setCurrentPage((page) => Math.max(page - 1, 1))

  const minPrice = useMemo(() => Math.min(...results.map((r) => Number(r.OptionPriceInfo.TotalPrice))), [results])
  const maxPrice = useMemo(() => Math.max(...results.map((r) => Number(r.OptionPriceInfo.TotalPrice))), [results])

  useEffect(() => {
    setPriceRange([minPrice, maxPrice])
  }, [minPrice, maxPrice])

  const handleDateChange = (newDate: string) => {
    setSearchForm((prev) => ({
      ...prev,
      date: newDate,
    }))
    // Remove: setShouldSearch(true)
  }

  const handleFlightSelection = (flightId: number) => {
    setSelectedFlightIds((prev) => {
      if (prev.includes(flightId)) {
        return prev.filter((id) => id !== flightId)
      }
      return [...prev, flightId]
    })
  }

  const handleRepriceRequest = async () => {
    if (selectedFlightIds.length === 0) return

    setLoading(true)
    setError("")

    try {
      const response = await axios.post(
        "http://localhost:5000/api/air/reprice",
        {
          AirOriginDestinationOptions: selectedFlightIds,
          SearchFormData: searchForm, // You might need to encrypt this data
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      )

      if (response.data.Status === "Success") {
        setRepricedResults(response.data.Data)
      } else {
        setError(response.data.Description || "Repricing failed")
      }
    } catch (err) {
      console.error("Error in repricing:", err)
      setError("Failed to reprice flights")
    } finally {
      setLoading(false)
    }
  }

  const handleBookFlight = async (flightId: number) => {
    setLoading(true);
    setError("");
  
    try {
      const flightToBook = results.find((result) => result.SearchSegmentId === flightId);
      if (!flightToBook) {
        throw new Error("Flight not found");
      }
      setRepricingFlight(flightToBook);
  
      const response = await axios.post(
        "http://localhost:5000/api/air/reprice",
        {
          AirOriginDestinationOptions: [flightId],
          SearchFormData: searchForm,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
  
      if (response.data.Status === "Success") {
        // **Ensure searchParams, sessionId, and results are stored**
        localStorage.setItem("searchParams", JSON.stringify(searchForm));
        localStorage.setItem("sessionId", sessionId || "");
        localStorage.setItem("selectedFlight", JSON.stringify(flightToBook));
        localStorage.setItem("searchResults", JSON.stringify(results));  // ✅ **Store results**
  
        console.log("Before navigation to booking page - searchParams:", searchForm);
        console.log("Before navigation to booking page - sessionId:", sessionId);
        console.log("Before navigation to booking page - selectedFlight:", flightToBook);
  
        navigate("/booking", {
          state: {
            flight: flightToBook,
            searchParams: searchForm,
            sessionId: sessionId,
          },
        });
      } else {
        setError(response.data.Description || "Repricing failed");
      }
    } catch (err) {
      console.error("Error in repricing:", err);
      setError("Failed to reprice flight");
    } finally {
      setLoading(false);
    }
  };
  
  

  // Clean up localStorage when component unmounts
  useEffect(() => {
    const params = getInitialSearchParams();
    const sid = getSessionId();
    setInitialSearchParams(params);
    setSessionId(sid);
  
    if (params) {
      localStorage.setItem("searchParams", JSON.stringify(params));
      setSearchForm({
        from: params.from,
        to: params.to,
        date: params.date,
        passengers: params.passengers,
      });
    }
    if (sid) {
      localStorage.setItem("sessionId", sid);
    }
  
    // ✅ **Restore previous search results if available**
    const savedResults = localStorage.getItem("searchResults");
    if (savedResults) {
      setResults(JSON.parse(savedResults));
    } else if (location.state?.shouldSearch) {
      setShouldSearch(true);
    }
  
  }, [getInitialSearchParams, getSessionId, location.state?.shouldSearch]);
  

  return (
    <div className="min-h-screen bg-gray-100">
      {initialSearchParams && sessionId ? (
        <>
        <Header />
          <SearchHeader
            searchForm={searchForm}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            onSwapLocations={() => {
              setSearchForm((prev) => ({
                ...prev,
                from: prev.to,
                to: prev.from,
              }))
            }}
            onDateChange={handleDateChange}
          />

          {loading && (
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="min-h-screen flex items-center justify-center">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">{error}</div>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="container mx-auto px-4 py-8">
              <SortingTabs
                activeTab={sortOption}
                onSort={(option) => {
                  setSortOption(option)
                  setCurrentPage(1) // Reset to first page when sorting changes
                }}
              />

              <div className="grid grid-cols-12 gap-8">
                <FilterSection
                  priceRange={priceRange}
                  selectedStops={selectedStops}
                  selectedAirlines={selectedAirlines}
                  onPriceRangeChange={setPriceRange}
                  onStopsChange={(stops) => {
                    setSelectedStops((prev) => {
                      if (prev.includes(stops)) {
                        return prev.filter((s) => s !== stops)
                      }
                      return [...prev, stops]
                    })
                  }}
                  onAirlinesChange={(airline) => {
                    setSelectedAirlines((prev) => {
                      if (prev.includes(airline)) {
                        return prev.filter((a) => a !== airline)
                      }
                      return [...prev, airline]
                    })
                  }}
                  airlines={Array.from(new Set(results.map((r) => r.OptionSegmentsInfo[0].MarketingAirline))).map(
                    (airline) => ({
                      name: airline,
                      minPrice: Math.min(
                        ...results
                          .filter((r) => r.OptionSegmentsInfo[0].MarketingAirline === airline)
                          .map((r) => Number(r.OptionPriceInfo.TotalPrice)),
                      ),
                    }),
                  )}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  onReset={resetFilters}
                  selectedDepartureTimes={selectedDepartureTimes}
                  onDepartureTimeChange={handleDepartureTimeChange}
                />

                <div className="col-span-9">
                  <div className="mb-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">
                      Showing {(currentPage - 1) * flightsPerPage + 1} -{" "}
                      {Math.min(currentPage * flightsPerPage, filteredResults.length)} of {filteredResults.length}{" "}
                       flights
                    </h2>
                    {/* <button
                      onClick={handleRepriceRequest}
                      disabled={selectedFlightIds.length === 0}
                      className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      Reprice Selected Flights
                    </button> */}
                  </div>
                  <div className="space-y-4">
                    {getCurrentPageFlights().map((result, index) => (
                      <FlightCard
                        key={index}
                        flight={result}
                        selectedTab={selectedFlight.id === result.SearchSegmentId ? selectedFlight.tab : null}
                        onTabClick={handleTabClick}
                        getAirlineImage={getAirlineImage}
                        isSelected={selectedFlightIds.includes(result.SearchSegmentId)}
                        onSelect={() => handleFlightSelection(result.SearchSegmentId)}
                        onBook={handleBookFlight}
                      />
                    ))}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onNextPage={goToNextPage}
                    onPrevPage={goToPrevPage}
                  />
                </div>
              </div>
            </div>
          )}

          {repricedResults && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg max-w-2xl w-full">
                <h2 className="text-2xl font-bold mb-4">Repriced Results</h2>
                {/* Display repriced results here */}
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(repricedResults, null, 2)}
                </pre>
                <button
                  onClick={() => setRepricedResults(null)}
                  className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {repricingModalOpen && repricingFlight && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4">Confirm Booking</h2>
                <p>
                  Flight: {repricingFlight.OptionSegmentsInfo[0].MarketingAirline}{" "}
                  {repricingFlight.OptionSegmentsInfo[0].FlightNumber}
                </p>
                <p>Price: ₹{repricingFlight.OptionPriceInfo.TotalPrice}</p>
                <div className="mt-4 flex justify-end space-x-4">
                  <button
                    onClick={() => setRepricingModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Here you would proceed with the actual booking process
                      console.log("Booking confirmed for flight:", repricingFlight.SearchSegmentId)
                      setRepricingModalOpen(false)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Confirm Booking
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-xl font-bold text-gray-500">
                {shouldSearch
                  ? "No flights found. Please try different search criteria."
                  : "Use the search form above to find flights."}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-screen">
          <p className="text-xl font-semibold">Loading...</p>
        </div>
      )}
    </div>
  )
}

export default SearchResults

