"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import { format, parse, isValid, addDays } from "date-fns"
import { SearchHeader } from "./Search/SearchHeader"
import { FilterSection } from "./Search/FilterSection"
import { SortingTabs, type SortOption } from "./Search/SortingTabs"
import { FlightCard } from "./Search/FlightCard"
import { Pagination } from "./Search/Pagination"
import { Header } from "./booking/BookingHeader"
import NoFlightsFound from "./Search/NotFlightFound"
import { getFareQuote, type FareQuoteResponse } from "../services/fareService"
import RoundTripSelectionView from "./Search/RoundTripSelection"
import MultiCitySelectionView from "./Search/MultiCitySelection"

// Define types for the new API structure
interface TaxBreakup {
  key: string
  value: number
}

interface ChargeBU {
  key: string
  value: number
}

interface Fare {
  Currency: string
  BaseFare: number
  Tax: number
  TaxBreakup: TaxBreakup[]
  YQTax: number
  AdditionalTxnFeeOfrd: number
  AdditionalTxnFeePub: number
  PGCharge: number
  OtherCharges: number
  ChargeBU: ChargeBU[]
  Discount: number
  PublishedFare: number
  CommissionEarned: number
  PLBEarned: number
  IncentiveEarned: number
  TdsOnCommission: number
  TdsOnPLB: number
  TdsOnIncentive: number
  ServiceFee: number
  TotalBaggageCharges: number
  TotalMealCharges: number
  TotalSeatCharges: number
}

interface FareBreakdown {
  Currency: string
  PassengerType: number
  PassengerCount: number
  BaseFare: number
  Tax: number
  TaxBreakUp: TaxBreakup[] | null
  YQTax: number
  AdditionalTxnFeeOfrd: number
  AdditionalTxnFeePub: number
  PGCharge: number
  SupplierReissueCharges: number
}

interface Airline {
  AirlineCode: string
  AirlineName: string
  FlightNumber: string
  FareClass: string
  OperatingCarrier: string
}

interface Airport {
  AirportCode: string
  AirportName: string
  Terminal: string
  CityCode: string
  CityName: string
  CountryCode: string
  CountryName: string
}

interface Origin {
  Airport: Airport
  DepTime: string
}

interface Destination {
  Airport: Airport
  ArrTime: string
}

interface FareClassification {
  Type: string
  Color?: string
}

interface Segment {
  Baggage: string
  CabinBaggage: string
  CabinClass: number
  SupplierFareClass: string | null
  TripIndicator: number
  SegmentIndicator: number
  Airline: Airline
  NoOfSeatAvailable: number
  Origin: Origin
  Destination: Destination
  Duration: number
  GroundTime: number
  Mile: number
  StopOver: boolean
  FlightInfoIndex: string
  StopPoint: string
  StopPointArrivalTime: string | null
  StopPointDepartureTime: string | null
  Craft: string
  Remark: string | null
  IsETicketEligible: boolean
  FlightStatus: string
  Status: string
  FareClassification: FareClassification
}

interface FareRule {
  Origin: string
  Destination: string
  Airline: string
  FareBasisCode: string
  FareRuleDetail: string
  FareRestriction: string
  FareFamilyCode: string
  FareRuleIndex: string
}

interface FlightResult {
  ResultIndex: string
  Source: number
  IsLCC: boolean
  IsRefundable: boolean
  IsPanRequiredAtBook: boolean
  IsPanRequiredAtTicket: boolean
  IsPassportRequiredAtBook: boolean
  IsPassportRequiredAtTicket: boolean
  GSTAllowed: boolean
  IsCouponAppilcable: boolean
  IsGSTMandatory: boolean
  AirlineRemark: string
  IsPassportFullDetailRequiredAtBook: boolean
  ResultFareType: string
  Fare: Fare
  FareBreakdown: FareBreakdown[]
  Segments: Segment[][]
  LastTicketDate: string | null
  TicketAdvisory: string | null
  FareRules: FareRule[]
  AirlineCode: string
  ValidatingAirline: string
  FareClassification: FareClassification
}

interface SearchResponse {
  ResponseStatus: number
  Error: {
    ErrorCode: number
    ErrorMessage: string
  }
  TraceId: string
  Origin: string
  Destination: string
  Results: FlightResult[][]
}

// Define CityPair interface for multi-city trips
interface CityPair {
  from: string
  to: string
  date: string
}

// Define SearchFormData interface
interface SearchFormData {
  from: string
  to: string
  date: string
  returnDate?: string
  passengers: number
  tripType: string
  fareType?: string
  preferredAirlines?: string[]
  directFlight?: boolean
  multiCityTrips?: CityPair[]
  journeyType?: string
  resultFareType?: string
  sources?: string[] | null
}

const SearchResults: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const [results, setResults] = useState<FlightResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [priceRange, setPriceRange] = useState<number[]>([0, 100000])
  const [selectedStops, setSelectedStops] = useState<number[]>([])
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([])
  const [selectedFlight, setSelectedFlight] = useState<{
    id: string | null
    tab: string | null
  }>({
    id: null,
    tab: null,
  })
  const [sortOption, setSortOption] = useState<SortOption>("CHEAPEST")
  const [searchForm, setSearchForm] = useState<SearchFormData>({
    from: "",
    to: "",
    date: "",
    returnDate: "",
    passengers: 1,
    tripType: "one-way",
    fareType: "regular",
    directFlight: false,
    multiCityTrips: [],
  })

  const [lastSearchedType, setLastSearchedType] = useState<string>("one-way")

  const [currentPage, setCurrentPage] = useState(1)
  const [flightsPerPage] = useState(15)
  const [shouldSearch, setShouldSearch] = useState(false)
  const [selectedDepartureTimes, setSelectedDepartureTimes] = useState<string[]>([])
  const [selectedFlightIds, setSelectedFlightIds] = useState<string[]>([])
  const [repricedResults, setRepricedResults] = useState<any>(null)
  const [repricingModalOpen, setRepricingModalOpen] = useState(false)
  const [repricingFlight, setRepricingFlight] = useState<FlightResult | null>(null)
  const [initialSearchParams, setInitialSearchParams] = useState<any>(null)
  const [tokenId, setTokenId] = useState<string | null>(null)
  const [traceId, setTraceId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"outbound" | "return">("outbound")
  const [outboundResults, setOutboundResults] = useState<FlightResult[]>([])
  const [returnResults, setReturnResults] = useState<FlightResult[]>([])
  const [multiCityResults, setMultiCityResults] = useState<FlightResult[][]>([])
  const [rawApiResponse, setRawApiResponse] = useState<any>(null)
  const [savedResultsLoaded, setSavedResultsLoaded] = useState(false)
  const [returningFromBooking, setReturningFromBooking] = useState(false)

  // Function to ensure ResultIndex is always a string and prevent scientific notation
  const ensureResultIndexAsString = (resultIndex: any): string => {
    if (typeof resultIndex === "number") {
      return resultIndex.toFixed(0)
    }
    return String(resultIndex)
  }

  // Function to process flight results and ensure ResultIndex is always a string
  const processFlightResults = (flights: FlightResult[]): FlightResult[] => {
    return flights.map((flight) => ({
      ...flight,
      ResultIndex: ensureResultIndexAsString(flight.ResultIndex),
    }))
  }

  // Function to determine if we should show round trip view
  const shouldShowRoundTripView = () => {
    const shouldShow = lastSearchedType === "round-trip" && outboundResults.length > 0 && returnResults.length > 0
    console.log("shouldShowRoundTripView check:", {
      lastSearchedType,
      outboundCount: outboundResults.length,
      returnCount: returnResults.length,
      shouldShow,
    })
    return shouldShow
  }

  // Function to determine if we should show multi-city view
  const shouldShowMultiCityView = () => {
    return (
      lastSearchedType === "multi-city" &&
      multiCityResults.length > 0 &&
      multiCityResults.some((segment) => segment.length > 0)
    )
  }

  // Get search params from location state or localStorage
  const getInitialSearchParams = useCallback(() => {
    if (location.state?.searchParams) {
      localStorage.setItem("searchParams", JSON.stringify(location.state.searchParams))
      return location.state.searchParams
    }

    const savedParams = localStorage.getItem("searchParams")
    if (savedParams) {
      return JSON.parse(savedParams)
    }

    navigate("/")
    return null
  }, [location.state, navigate])

  const getTokenId = useCallback(() => {
    return localStorage.getItem("tokenId")
  }, [])

  const loadSavedResults = useCallback((params: any) => {
    if (
      !params?.date ||
      params.date.trim() === "" ||
      (params.tripType === "round-trip" && (!params.returnDate || params.returnDate.trim() === ""))
    ) {
      console.warn("Missing departure or return date. Not showing saved results.")
      return false
    }

    const savedResults = localStorage.getItem("searchResults")
    if (savedResults) {
      try {
        const parsedResults = JSON.parse(savedResults)
        const processedResults = processFlightResults(parsedResults)
        setResults(processedResults)
        console.log("Loaded saved results from localStorage:", processedResults.length)

        // For round trips, separate outbound and return results
        if (params?.tripType === "round-trip" && Array.isArray(processedResults)) {
          const isTripIndicator = (flight: FlightResult, indicator: number): boolean => {
            try {
              if (!flight.Segments || !flight.Segments.length || !flight.Segments[0].length) {
                return false
              }

              const segment = flight.Segments[0][0]

              if (indicator === 1) {
                return (
                  segment.Origin.Airport.AirportCode === params.from &&
                  segment.Destination.Airport.AirportCode === params.to
                )
              }

              if (indicator === 2) {
                return (
                  segment.Origin.Airport.AirportCode === params.to &&
                  segment.Destination.Airport.AirportCode === params.from
                )
              }

              return false
            } catch (e) {
              console.error("Error checking trip indicator:", e)
              return false
            }
          }

          const outbound = processedResults.filter((flight) => isTripIndicator(flight, 1))
          const returnFlights = processedResults.filter((flight) => isTripIndicator(flight, 2))

          console.log("Loaded from localStorage - Outbound flights:", outbound.length)
          console.log("Loaded from localStorage - Return flights:", returnFlights.length)

          if (outbound.length > 0) {
            setOutboundResults(outbound)
          }

          if (returnFlights.length > 0) {
            setReturnResults(returnFlights)
          }

          if (outbound.length > 0 && returnFlights.length > 0) {
            setLastSearchedType("round-trip")
            console.log("LoadSavedResults: Setting lastSearchedType to round-trip")
          } else {
            setLastSearchedType("one-way")
            console.log("LoadSavedResults: Setting lastSearchedType to one-way")
          }
        }
        // For multi-city trips, organize results by segment
        else if (params?.tripType === "multi-city" && Array.isArray(processedResults) && params?.multiCityTrips) {
          const multiCitySegments: FlightResult[][] = []

          params.multiCityTrips.forEach((cityPair: CityPair, index: number) => {
            const segmentFlights = processedResults.filter((flight) => {
              try {
                if (!flight.Segments || !flight.Segments.length || !flight.Segments[0].length) {
                  return false
                }

                // FIX: Use the last leg's destination for multi-city segment matching
                const firstLeg = flight.Segments[0][0]
                const lastLeg = flight.Segments[0][flight.Segments[0].length - 1]
                return (
                  firstLeg.Origin.Airport.AirportCode === cityPair.from &&
                  lastLeg.Destination.Airport.AirportCode === cityPair.to
                )
              } catch (e) {
                console.error("Error filtering multi-city segment:", e)
                return false
              }
            })

            multiCitySegments[index] = segmentFlights
          })

          console.log(
            "Loaded from localStorage - Multi-city segments:",
            multiCitySegments.map((s) => s.length),
          )

          if (multiCitySegments.length > 0 && multiCitySegments.every((segment) => segment.length > 0)) {
            setMultiCityResults(multiCitySegments)
            setLastSearchedType("multi-city")
          } else {
            setLastSearchedType("one-way")
          }
        } else {
          setLastSearchedType(params?.tripType || "one-way")
        }
        return true
      } catch (e) {
        console.error("Error parsing saved results:", e)
        return false
      }
    }
    return false
  }, [])

  useEffect(() => {
    const params = getInitialSearchParams()
    const token = getTokenId()
    setInitialSearchParams(params)
    setTokenId(token)

    const isReturningFromBooking = location.state?.returnFromBooking === true
    setReturningFromBooking(isReturningFromBooking)

    if (params) {
      localStorage.setItem("searchParams", JSON.stringify(params))
      setSearchForm({
        from: params.from || "",
        to: params.to || "",
        date: params.date || "",
        returnDate: params.returnDate || "",
        passengers: params.passengers || 1,
        tripType: params.tripType || "one-way",
        fareType: params.fareType || "regular",
        preferredAirlines: params.preferredAirlines || [],
        directFlight: params.directFlight || false,
        multiCityTrips: params.multiCityTrips || [],
        journeyType: params.journeyType,
        resultFareType: params.resultFareType,
        sources: params.sources,
      })

      if (isReturningFromBooking || (!location.state?.shouldSearch && !savedResultsLoaded)) {
        const loaded = loadSavedResults(params)
        setSavedResultsLoaded(loaded)
      }
    }

    if (location.state?.shouldSearch) {
      setShouldSearch(true)
    }
  }, [getInitialSearchParams, getTokenId, location.state, loadSavedResults, savedResultsLoaded])

  // Format date for the API (yyyy-MM-ddTHH:mm:ss)
  const formatDateForApi = useCallback((dateStr: string) => {
    try {
      if (!dateStr || dateStr.trim() === "") {
        console.error("Empty date string provided to formatDateForApi")
        return new Date().toISOString().split("T")[0] + "T00:00:00"
      }

      if (dateStr.includes("T")) {
        return dateStr
      }

      const date = parse(dateStr, "yyyy-MM-dd", new Date())
      if (!isValid(date)) {
        console.error("Invalid date parsed:", dateStr)
        return new Date().toISOString().split("T")[0] + "T00:00:00"
      }

      return format(date, "yyyy-MM-dd'T'HH:mm:ss")
    } catch (error) {
      console.error("Error formatting date:", error, "for date string:", dateStr)
      return new Date().toISOString().split("T")[0] + "T00:00:00"
    }
  }, [])

  const searchFlights = useCallback(async () => {
    console.log("searchFlights called with tokenId:", tokenId, "and shouldSearch:", shouldSearch)
    if (!shouldSearch || !tokenId) return

    setLoading(true)
    setError("")

    try {
      let journeyType = searchForm.journeyType || "1"
      let segments: {
        Origin: string
        Destination: string
        FlightCabinClass: string
        PreferredDepartureTime: string
        PreferredArrivalTime: string
      }[] = []

      if (searchForm.tripType === "one-way") {
        journeyType = "1"
        segments = [
          {
            Origin: searchForm.from,
            Destination: searchForm.to,
            FlightCabinClass: "1",
            PreferredDepartureTime: formatDateForApi(searchForm.date),
            PreferredArrivalTime: formatDateForApi(searchForm.date),
          },
        ]
        console.log("One-way search segments:", segments)
      } else if (searchForm.tripType === "round-trip") {
        journeyType = "2"
        const returnDate =
          searchForm.returnDate && searchForm.returnDate.trim() !== ""
            ? searchForm.returnDate
            : format(addDays(new Date(searchForm.date), 1), "yyyy-MM-dd")

        segments = [
          {
            Origin: searchForm.from,
            Destination: searchForm.to,
            FlightCabinClass: "1",
            PreferredDepartureTime: formatDateForApi(searchForm.date),
            PreferredArrivalTime: formatDateForApi(searchForm.date),
          },
          {
            Origin: searchForm.to,
            Destination: searchForm.from,
            FlightCabinClass: "1",
            PreferredDepartureTime: formatDateForApi(returnDate),
            PreferredArrivalTime: formatDateForApi(returnDate),
          },
        ]
        console.log("Round trip segments:", segments)
      } else if (searchForm.tripType === "multi-city" && searchForm.multiCityTrips) {
        journeyType = "3"
        segments = searchForm.multiCityTrips.map((trip) => ({
          Origin: trip.from,
          Destination: trip.to,
          FlightCabinClass: "1",
          PreferredDepartureTime: formatDateForApi(trip.date),
          PreferredArrivalTime: formatDateForApi(trip.date),
        }))
        console.log("Multi-city segments for API request:", segments)
      }

      const requestData: any = {
        EndUserIp: "192.168.1.1",
        TokenId: tokenId,
        AdultCount: searchForm.passengers.toString(),
        ChildCount: "0",
        InfantCount: "0",
        DirectFlight: searchForm.directFlight ? "true" : "false",
        OneStopFlight: "false",
        JourneyType: journeyType,
        Segments: segments,
      }

      if (searchForm.resultFareType) {
        requestData.ResultFareType = searchForm.resultFareType
      }

      if (searchForm.preferredAirlines && searchForm.preferredAirlines.length > 0) {
        requestData.PreferredAirlines = searchForm.preferredAirlines
      } else {
        requestData.PreferredAirlines = null
      }

      if (searchForm.sources && searchForm.sources.length > 0) {
        requestData.Sources = searchForm.sources
      } else {
        requestData.Sources = null
      }

      console.log("Making API request with data:", JSON.stringify(requestData, null, 2))

      const response = await axios.post("https://fareclubs.onrender.com/api/search", requestData, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })

      setRawApiResponse(response.data)
      console.log("Raw Search API Response:", JSON.stringify(response.data, null, 2))

      if (response.data.Response && response.data.Response.ResponseStatus === 1) {
        setTraceId(response.data.Response.TraceId)
        localStorage.setItem("traceId", response.data.Response.TraceId)

        let flattened: FlightResult[] = []

        if (Array.isArray(response.data.Response.Results)) {
          if (Array.isArray(response.data.Response.Results[0])) {
            flattened = response.data.Response.Results.flat()
          } else {
            flattened = response.data.Response.Results
          }
        }

        // Process results to ensure ResultIndex is always a string
        const processedFlattened = processFlightResults(flattened)

        let finalResultsForDisplay: FlightResult[] = processedFlattened

        // IMPORTANT: Filter one-way results to strictly match search origin/destination
        if (searchForm.tripType === "one-way") {
          finalResultsForDisplay = processedFlattened.filter((flight) => {
            try {
              const firstSegment = flight.Segments[0]?.[0]
              const lastSegment = flight.Segments[0]?.[flight.Segments[0].length - 1] // Get the last segment
              if (!firstSegment || !lastSegment) return false

              const flightOrigin = firstSegment.Origin.Airport.AirportCode.trim().toUpperCase()
              const flightDest = lastSegment.Destination.Airport.AirportCode.trim().toUpperCase() // Use last segment's destination
              const searchOrigin = searchForm.from.trim().toUpperCase()
              const searchDest = searchForm.to.trim().toUpperCase()

              return flightOrigin === searchOrigin && flightDest === searchDest
            } catch (e) {
              console.error("Error filtering one-way flight by origin/destination:", e)
              return false
            }
          })
          console.log(
            `One-way results filtered: ${finalResultsForDisplay.length} flights matching ${searchForm.from}-${searchForm.to}`,
          )
        }

        console.log("Flattened results:", finalResultsForDisplay.length)
        localStorage.setItem("searchResults", JSON.stringify(finalResultsForDisplay))
        setResults(finalResultsForDisplay)

        // Process results based on trip type
        if (searchForm.tripType === "round-trip") {
          console.log("Processing round trip results, total flights:", finalResultsForDisplay.length)

          const isTripIndicator = (flight: FlightResult, indicator: number): boolean => {
            try {
              if (!flight.Segments || !flight.Segments.length || !flight.Segments[0].length) {
                return false
              }

              const segment = flight.Segments[0][0]

              if (indicator === 1) {
                return (
                  segment.Origin.Airport.AirportCode === searchForm.from &&
                  segment.Destination.Airport.AirportCode === searchForm.to
                )
              }

              if (indicator === 2) {
                return (
                  segment.Origin.Airport.AirportCode === searchForm.to &&
                  segment.Destination.Airport.AirportCode === searchForm.from
                )
              }

              return false
            } catch (e) {
              console.error("Error checking trip indicator:", e)
              return false
            }
          }

          const outbound = finalResultsForDisplay.filter((flight) => isTripIndicator(flight, 1))
          const returnFlights = finalResultsForDisplay.filter((flight) => isTripIndicator(flight, 2))

          console.log("Outbound flights found:", outbound.length)
          console.log("Return flights found:", returnFlights.length)

          setOutboundResults(outbound)
          setReturnResults(returnFlights)
          setActiveTab("outbound")

          if (outbound.length > 0 && returnFlights.length > 0) {
            setLastSearchedType("round-trip")
            console.log(
              "Setting lastSearchedType to round-trip - Outbound:",
              outbound.length,
              "Return:",
              returnFlights.length,
            )
          } else {
            setLastSearchedType("one-way")
            console.log(
              "Setting lastSearchedType to one-way - Outbound:",
              outbound.length,
              "Return:",
              returnFlights.length,
            )
          }
        } else if (searchForm.tripType === "multi-city" && searchForm.multiCityTrips) {
          console.log("Processing multi-city results, total flights from API:", response.data.Response.Results.length)
          console.log("Search Form Multi-City Trips:", JSON.stringify(searchForm.multiCityTrips, null, 2))

          if (Array.isArray(response.data.Response.Results) && Array.isArray(response.data.Response.Results[0])) {
            const processedMultiCityResults = response.data.Response.Results.map(
              (segmentFlights: FlightResult[], segmentIndex: number) => {
                const expectedOrigin = searchForm.multiCityTrips?.[segmentIndex]?.from?.trim().toUpperCase()
                const expectedDestination = searchForm.multiCityTrips?.[segmentIndex]?.to?.trim().toUpperCase()
                console.log(
                  `--- Filtering for Segment ${segmentIndex + 1}: Expected ${expectedOrigin} -> ${expectedDestination} ---`,
                )

                const filteredSegmentFlights = segmentFlights.filter((flight) => {
                  try {
                    if (!flight.Segments || !flight.Segments.length || !flight.Segments[0].length) {
                      console.warn(`Flight ${flight.ResultIndex} in segment ${segmentIndex} has no valid segments.`)
                      return false
                    }
                    const firstLeg = flight.Segments[0][0]
                    const lastLeg = flight.Segments[0][flight.Segments[0].length - 1] // Get the last leg
                    const flightOrigin = firstLeg.Origin.Airport.AirportCode.trim().toUpperCase()
                    const flightDest = lastLeg.Destination.Airport.AirportCode.trim().toUpperCase() // Use last leg's destination

                    const matches = flightOrigin === expectedOrigin && flightDest === expectedDestination
                    console.log(
                      `  Flight ${flight.ResultIndex}: Actual ${flightOrigin} -> ${flightDest} | Expected ${expectedOrigin} -> ${expectedDestination}. Match: ${matches}. Segments: ${JSON.stringify(flight.Segments[0].map((s) => ({ origin: s.Origin.Airport.AirportCode, dest: s.Destination.Airport.AirportCode })))}`,
                    )
                    return matches
                  } catch (e) {
                    console.error(`Error filtering flight ${flight.ResultIndex} in segment ${segmentIndex}:`, e)
                    return false
                  }
                })
                return processFlightResults(filteredSegmentFlights)
              },
            )
            setMultiCityResults(processedMultiCityResults)

            processedMultiCityResults.forEach((segmentFlights: FlightResult[], index: number) => {
              console.log(`Segment ${index + 1}: ${segmentFlights.length} flights found after strict filtering.`)
            })

            const flattenedMultiCity = processedMultiCityResults.flat()
            setResults(flattenedMultiCity)
            setLastSearchedType("multi-city")
          } else {
            console.log("API returned flat results, organizing by segment with strict filtering...")
            console.log("Search Form Multi-City Trips:", JSON.stringify(searchForm.multiCityTrips, null, 2))

            const multiCitySegments: FlightResult[][] = []
            const flattenedRaw = response.data.Response.Results || []
            const processedFlattenedRaw = processFlightResults(flattenedRaw)

            searchForm.multiCityTrips.forEach((cityPair, index) => {
              const segmentFlights = processedFlattenedRaw.filter((flight: FlightResult) => {
                try {
                  if (!flight.Segments || !flight.Segments.length || !flight.Segments[0].length) {
                    console.warn(`Flight ${flight.ResultIndex} has no valid segments.`)
                    return false
                  }
                  const firstLeg = flight.Segments[0][0]
                  const lastLeg = flight.Segments[0][flight.Segments[0].length - 1] // Get the last leg
                  const flightOrigin = firstLeg.Origin.Airport.AirportCode.trim().toUpperCase()
                  const flightDest = lastLeg.Destination.Airport.AirportCode.trim().toUpperCase() // Use last leg's destination
                  const searchOrigin = cityPair.from.trim().toUpperCase()
                  const searchDest = cityPair.to.trim().toUpperCase()

                  const matches = flightOrigin === searchOrigin && flightDest === searchDest
                  console.log(
                    `  Flight ${flight.ResultIndex}: Actual ${flightOrigin} -> ${flightDest} | Expected ${searchOrigin} -> ${searchDest}. Match: ${matches}. Segments: ${JSON.stringify(flight.Segments[0].map((s) => ({ origin: s.Origin.Airport.AirportCode, dest: s.Destination.Airport.AirportCode })))}`,
                  )
                  return matches
                } catch (e) {
                  console.error(`Error filtering flight ${flight.ResultIndex} for segment ${index}:`, e)
                  return false
                }
              })

              multiCitySegments[index] = segmentFlights
              console.log(
                `Segment ${index + 1} (${cityPair.from} to ${cityPair.to}): ${segmentFlights.length} flights found after strict filtering.`,
              )
            })

            setMultiCityResults(multiCitySegments)
            setResults(processedFlattenedRaw)
            setLastSearchedType("multi-city")
          }
        } else {
          setLastSearchedType("one-way")
        }
        // Log the final multiCityResults state after setting it
        console.log(
          "Final multiCityResults state after processing:",
          JSON.stringify(
            multiCityResults.map((segment) =>
              segment.map((flight) => ({
                resultIndex: flight.ResultIndex,
                origin: flight.Segments[0]?.[0]?.Origin.Airport.AirportCode,
                destination: flight.Segments[0]?.[flight.Segments[0].length - 1]?.Destination.Airport.AirportCode,
              })),
            ),
            null,
            2,
          ),
        )
      } else {
        const errorMsg = response.data.Response?.Error?.ErrorMessage || "Search failed"
        setError(errorMsg)
        console.error("Search API error:", errorMsg)
      }
    } catch (err) {
      console.error("Error in searchFlights:", err)
      if (axios.isAxiosError(err)) {
        if (err.code === "ERR_NETWORK") {
          setError("Network error: Please check if the backend server is running at https://fareclubs.onrender.com")
        } else {
          setError(`Failed to fetch results: ${err.message}. Please try again.`)
        }
      } else {
        setError("Failed to fetch results. Please try again.")
      }
    } finally {
      setLoading(false)
      setShouldSearch(false)
    }
  }, [searchForm, tokenId, shouldSearch, formatDateForApi, multiCityResults]) // Added multiCityResults to dependency array for logging

  useEffect(() => {
    if (shouldSearch) {
      console.log("shouldSearch is true, calling searchFlights()")
      searchFlights()
    }
  }, [searchFlights, shouldSearch])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSearchForm({ ...searchForm, [e.target.name]: e.target.value })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Search form submitted, triggering search...")

    localStorage.setItem("searchParams", JSON.stringify(searchForm))
    localStorage.removeItem("searchResults")

    setResults([])
    setOutboundResults([])
    setReturnResults([])
    setMultiCityResults([])

    setShouldSearch(true)
    setCurrentPage(1)
  }

  const handleTabClick = (flightId: string, tabName: string) => {
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

  const getAirlineImage = (airline: string) => {
    const airlineImageMap: { [key: string]: string } = {
      "6E": "/images/indigo.png",
      AI: "/images/airindia.png",
      IX: "/images/airindia-express.png",
      QP: "/images/akasaair.jpeg",
      SG: "/images/spicejet.png",
      "9I": "/images/allianceair.jpeg",
      UK: "/images/vistara.png",
      G8: "/images/goair.png",
    }
    return airlineImageMap[airline] || "/images/default-airline.png"
  }

  const sortFlights = (flights: FlightResult[], option: SortOption) => {
    return [...flights].sort((a, b) => {
      switch (option) {
        case "CHEAPEST":
          return a.Fare.PublishedFare - b.Fare.PublishedFare
        case "SHORTEST":
          const aDuration = a.Segments[0]?.[0]?.Duration || 0
          const bDuration = b.Segments[0]?.[0]?.Duration || 0
          return aDuration - bDuration
        case "DEPARTURE":
          const aDepTime = a.Segments[0]?.[0]?.Origin.DepTime || ""
          const bDepTime = b.Segments[0]?.[0]?.Origin.DepTime || ""
          return new Date(aDepTime).getTime() - new Date(bDepTime).getTime()
        case "ARRIVAL":
          const aArrTime = a.Segments[0]?.[0]?.Destination.ArrTime || ""
          const bArrTime = b.Segments[0]?.[0]?.Destination.ArrTime || ""
          return new Date(aArrTime).getTime() - new Date(bArrTime).getTime()
        default:
          return 0
      }
    })
  }

  const resetFilters = () => {
    setPriceRange([minPrice, maxPrice])
    setSelectedStops([])
    setSelectedAirlines([])
    setSelectedDepartureTimes([])
  }

  const handleTimeChange = (timeRange: string) => {
    setSelectedDepartureTimes((prev) => {
      if (prev.includes(timeRange)) {
        return prev.filter((t) => t !== timeRange)
      }
      return [...prev, timeRange]
    })
  }

  // Get the current results based on active tab for round trips
  const currentResults = useMemo(() => {
    if (lastSearchedType === "round-trip") {
      console.log(`Getting ${activeTab} results. Outbound: ${outboundResults.length}, Return: ${returnResults.length}`)
      return activeTab === "outbound" ? outboundResults : returnResults
    }
    return results
  }, [lastSearchedType, activeTab, outboundResults, returnResults, results])

  const filteredResultsMemo = useMemo(() => {
    console.log("Selected Departure Times:", selectedDepartureTimes)
    console.log("Total results:", currentResults.length)

    return sortFlights(
      currentResults.filter((result) => {
        const price = result.Fare.PublishedFare
        const airline = result.AirlineCode
        const stops = result.Segments[0]?.length - 1 || 0
        const departureTimeStr = result.Segments[0]?.[0]?.Origin.DepTime

        if (!departureTimeStr) return false

        try {
          const departureTime = new Date(departureTimeStr)
          const hours = departureTime.getHours()
          const minutes = departureTime.getMinutes()
          const totalMinutes = hours * 60 + minutes

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
            flight: `${airline} ${result.Segments[0]?.[0]?.Airline.FlightNumber}`,
          })
          return false
        }
      }),
      sortOption,
    )
  }, [currentResults, priceRange, selectedAirlines, selectedStops, selectedDepartureTimes, sortOption])

  const totalPages = Math.ceil(filteredResultsMemo.length / flightsPerPage)

  const getCurrentPageFlights = () => {
    const indexOfLastFlight = currentPage * flightsPerPage
    const indexOfFirstFlight = indexOfLastFlight - flightsPerPage
    const lastIndexOfLastFlight = Math.min(indexOfLastFlight, filteredResultsMemo.length)
    return filteredResultsMemo.slice(indexOfFirstFlight, lastIndexOfLastFlight)
  }

  const goToNextPage = () => setCurrentPage((page) => Math.min(page + 1, totalPages))
  const goToPrevPage = () => setCurrentPage((page) => Math.max(page - 1, 1))

  const minPrice = useMemo(
    () => (currentResults.length > 0 ? Math.min(...currentResults.map((r) => r.Fare.PublishedFare)) : 0),
    [currentResults],
  )

  const maxPrice = useMemo(
    () => (currentResults.length > 0 ? Math.max(...currentResults.map((r) => r.Fare.PublishedFare)) : 100000),
    [currentResults],
  )

  useEffect(() => {
    setPriceRange([minPrice, maxPrice])
  }, [minPrice, maxPrice])

  const handleDateChange = (newDate: string) => {
    setSearchForm((prev) => ({
      ...prev,
      date: newDate,
    }))

    if (searchForm.tripType === "round-trip" && (!searchForm.returnDate || searchForm.returnDate.trim() === "")) {
      const departureDate = new Date(newDate)
      const newReturnDate = format(addDays(departureDate, 1), "yyyy-MM-dd")
      setSearchForm((prev) => ({
        ...prev,
        returnDate: newReturnDate,
      }))
    }
  }

  const handleReturnDateChange = (newDate: string) => {
    setSearchForm((prev) => ({
      ...prev,
      returnDate: newDate,
    }))
  }

  const handleTripTypeChange = (type: string) => {
    setSearchForm((prev) => {
      let returnDate = prev.returnDate
      if (type === "round-trip" && (!prev.returnDate || prev.returnDate.trim() === "")) {
        if (prev.date && prev.date.trim() !== "") {
          const departureDate = new Date(prev.date)
          returnDate = format(addDays(departureDate, 1), "yyyy-MM-dd")
        } else {
          returnDate = format(addDays(new Date(), 1), "yyyy-MM-dd")
        }
      }

      return {
        ...prev,
        tripType: type,
        returnDate: type === "round-trip" ? returnDate : "",
        multiCityTrips:
          type === "multi-city"
            ? [
                {
                  from: prev.from || "",
                  to: prev.to || "",
                  date: prev.date || "",
                },
              ]
            : [],
      }
    })
  }

  const handleMultiCityChange = (index: number, field: keyof CityPair, value: string) => {
    setSearchForm((prev) => {
      const updatedTrips = [...(prev.multiCityTrips || [])]
      if (!updatedTrips[index]) {
        updatedTrips[index] = { from: "", to: "", date: "" }
      }
      updatedTrips[index] = { ...updatedTrips[index], [field]: value }
      return { ...prev, multiCityTrips: updatedTrips }
    })
  }

  const handleAddMultiCity = () => {
    setSearchForm((prev) => {
      const updatedTrips = [...(prev.multiCityTrips || [])]
      if (updatedTrips.length < 5) {
        updatedTrips.push({ from: "", to: "", date: "" })
      }
      return { ...prev, multiCityTrips: updatedTrips }
    })
  }

  const handleRemoveMultiCity = (index: number) => {
    setSearchForm((prev) => {
      const updatedTrips = [...(prev.multiCityTrips || [])]
      if (updatedTrips.length > 1) {
        updatedTrips.splice(index, 1)
      }
      return { ...prev, multiCityTrips: updatedTrips }
    })
  }

  const handleFlightSelection = (flightId: string) => {
    setSelectedFlightIds((prev) => {
      if (prev.includes(flightId)) {
        return prev.filter((id) => id !== flightId)
      }
      return [...prev, flightId]
    })
  }

  const handleBookRoundTripFlight = async (outboundFlightId: string, returnFlightId: string) => {
    setLoading(true)
    setError("")

    try {
      const outboundFlight = outboundResults.find((f) => f.ResultIndex === outboundFlightId)
      const returnFlightToBook = returnResults.find((f) => f.ResultIndex === returnFlightId)

      if (!outboundFlight || !returnFlightToBook) {
        throw new Error("Selected flight(s) not found.")
      }

      const currentTokenId = tokenId || localStorage.getItem("tokenId")
      const currentTraceId = traceId || localStorage.getItem("traceId")

      if (!currentTokenId || !currentTraceId) {
        throw new Error("Session information is missing. Please search again.")
      }

      let finalOutboundResultIndex = ensureResultIndexAsString(outboundFlight.ResultIndex)
      let fareQuoteOutboundApiResponse: FareQuoteResponse | null = null
      let fareQuoteReturnApiResponse: FareQuoteResponse | null = null

      if (outboundFlight.IsLCC) {
        console.log("SearchResults: Quoting LCC outbound leg:", outboundFlight.ResultIndex)
        fareQuoteOutboundApiResponse = await getFareQuote(currentTokenId, currentTraceId, finalOutboundResultIndex)
        if (fareQuoteOutboundApiResponse.Response && fareQuoteOutboundApiResponse.Response.Results) {
          finalOutboundResultIndex = ensureResultIndexAsString(
            fareQuoteOutboundApiResponse.Response.Results.ResultIndex,
          )
          console.log("SearchResults: LCC outbound quoted. New ResultIndex:", finalOutboundResultIndex)
        } else {
          throw new Error(
            `Failed to quote outbound LCC flight: ${fareQuoteOutboundApiResponse.Error?.ErrorMessage || "Unknown error"}`,
          )
        }
      }

      let finalReturnResultIndex = ensureResultIndexAsString(returnFlightToBook.ResultIndex)
      if (returnFlightToBook.IsLCC) {
        console.log("SearchResults: Quoting LCC return leg:", returnFlightToBook.ResultIndex)
        fareQuoteReturnApiResponse = await getFareQuote(currentTokenId, currentTraceId, finalReturnResultIndex)
        if (fareQuoteReturnApiResponse.Response && fareQuoteReturnApiResponse.Response.Results) {
          finalReturnResultIndex = ensureResultIndexAsString(fareQuoteReturnApiResponse.Response.Results.ResultIndex)
          console.log("SearchResults: LCC return quoted. New ResultIndex:", finalReturnResultIndex)
        } else {
          throw new Error(
            `Failed to quote return LCC flight: ${fareQuoteReturnApiResponse.Error?.ErrorMessage || "Unknown error"}`,
          )
        }
      }

      const adaptedOutboundFlight = adaptFlightForCard(
        fareQuoteOutboundApiResponse?.Response?.Results || outboundFlight,
      )
      const adaptedReturnFlight = adaptFlightForCard(
        fareQuoteReturnApiResponse?.Response?.Results || returnFlightToBook,
      )

      const finalTotalPrice =
        (fareQuoteOutboundApiResponse?.Response?.Results?.Fare.PublishedFare || outboundFlight.Fare.PublishedFare) +
        (fareQuoteReturnApiResponse?.Response?.Results?.Fare.PublishedFare || returnFlightToBook.Fare.PublishedFare)

      localStorage.setItem("selectedFlight", JSON.stringify(adaptedOutboundFlight))
      localStorage.setItem("selectedReturnFlight", JSON.stringify(adaptedReturnFlight))
      localStorage.setItem("searchParams", JSON.stringify(searchForm))
      localStorage.setItem("traceId", currentTraceId || "")

      navigate("/booking", {
        state: {
          flight: adaptedOutboundFlight,
          returnFlight: adaptedReturnFlight,
          searchParams: searchForm,
          tokenId: currentTokenId,
          traceId: currentTraceId,
          isRoundTrip: true,
          totalPrice: finalTotalPrice,
          outboundResultIndex: finalOutboundResultIndex,
          returnResultIndex: finalReturnResultIndex,
          fareQuoteOutboundResponse: fareQuoteOutboundApiResponse,
          fareQuoteReturnResponse: fareQuoteReturnApiResponse,
        },
      })
    } catch (err) {
      console.error("Error preparing for booking:", err)
      setError("Failed to prepare flight for booking")
    } finally {
      setLoading(false)
    }
  }

  const handleBookFlight = async (flightId: string) => {
    setLoading(true)
    setError("")

    try {
      const flightToBook = results.find((result) => result.ResultIndex === flightId)
      if (!flightToBook) {
        throw new Error("Flight not found")
      }
      setRepricingFlight(flightToBook)

      console.warn(
        "handleBookFlight in SearchResults called. Ensure FlightCard interaction is not the intended path for one-way LCC booking with FareQuote.",
      )
    } catch (err) {
      console.error("Error preparing for booking (handleBookFlight in SearchResults):", err)
      setError("Failed to prepare flight for booking")
    } finally {
      setLoading(false)
    }
  }

  const handleBookMultiCityFlights = (selectedFlightIds: string[]) => {
    setLoading(true)
    setError("")

    try {
      const selectedFlights: FlightResult[] = []
      const cleanSelectedFlightIds = selectedFlightIds.map((id) => ensureResultIndexAsString(id))

      const multiCityResultIndexes: string[] = []

      cleanSelectedFlightIds.forEach((flightId, index) => {
        const flight = multiCityResults[index]?.find((f) => ensureResultIndexAsString(f.ResultIndex) === flightId)
        if (flight) {
          selectedFlights.push(flight)
          multiCityResultIndexes[index] = ensureResultIndexAsString(flight.ResultIndex)
        } else {
          console.error(`Flight with ID ${flightId} not found in segment ${index}`)
        }
      })

      if (selectedFlights.length !== cleanSelectedFlightIds.length) {
        throw new Error("Some selected flights could not be found")
      }

      localStorage.setItem("selectedMultiCityFlights", JSON.stringify(selectedFlights))
      localStorage.setItem("searchParams", JSON.stringify(searchForm))
      localStorage.setItem("traceId", traceId || "")

      const totalPrice = selectedFlights.reduce((sum, flight) => sum + flight.Fare.PublishedFare, 0)

      const adaptedFlights = selectedFlights.map((flight) => ({
        SearchSegmentId: Number.parseInt(ensureResultIndexAsString(flight.ResultIndex).replace(/\D/g, "")) || 0,
        JourneyTime: flight.Segments[0][0].Duration,
        OptionId: ensureResultIndexAsString(flight.ResultIndex),
        OptionSegmentsInfo: flight.Segments[0].map((segment) => ({
          DepartureAirport: segment.Origin.Airport.AirportCode,
          ArrivalAirport: segment.Destination.Airport.AirportCode,
          DepartureTime: segment.Origin.DepTime,
          ArrivalTime: segment.Destination.ArrTime,
          MarketingAirline: segment.Airline.AirlineName,
          FlightNumber: segment.Airline.FlightNumber,
        })),
        OptionPriceInfo: {
          TotalPrice: flight.Fare.PublishedFare.toString(),
          TotalBasePrice: flight.Fare.BaseFare.toString(),
          TotalTax: flight.Fare.Tax.toString(),
          PaxPriceDetails:
            flight.FareBreakdown?.map((breakdown) => ({
              PaxType: breakdown.PassengerType === 1 ? "Adult" : breakdown.PassengerType === 2 ? "Child" : "Infant",
              BasePrice: breakdown.BaseFare.toString(),
              FuelSurcharge: breakdown.YQTax.toString(),
              AirportTax: breakdown.Tax.toString(),
              UdfCharge: "0",
              CongestionCharge: "0",
              SupplierAddCharge: "0",
            })) || [],
        },
        IsLCC: flight.IsLCC,
        ResultFareType: flight.ResultFareType,
      }))

      console.log("Multi-city booking data:", {
        flights: adaptedFlights,
        totalPrice,
        searchParams: searchForm,
      })

      navigate("/booking", {
        state: {
          multiCityFlights: adaptedFlights,
          searchParams: searchForm,
          tokenId: tokenId,
          traceId: traceId,
          isMultiCity: true,
          totalPrice: totalPrice,
          multiCityResultIndexes: multiCityResultIndexes,
        },
      })
    } catch (err) {
      console.error("Error preparing for multi-city booking:", err)
      setError("Failed to prepare flights for booking")
    } finally {
      setLoading(false)
    }
  }

  // Adapter function to convert new API flight data to the format expected by FlightCard
  const adaptFlightForCard = (flight: FlightResult) => {
    return {
      OptionId: ensureResultIndexAsString(flight.ResultIndex),
      SearchSegmentId: Number.parseInt(ensureResultIndexAsString(flight.ResultIndex).replace(/\D/g, "")) || 0,
      JourneyTime: flight.Segments[0][0].Duration,
      OptionSegmentsInfo: flight.Segments[0].map((segment) => ({
        DepartureAirport: segment.Origin.Airport.AirportCode,
        ArrivalAirport: segment.Destination.Airport.AirportCode,
        DepartureTime: segment.Origin.DepTime,
        ArrivalTime: segment.Destination.ArrTime,
        MarketingAirline: segment.Airline.AirlineName,
        FlightNumber: segment.Airline.FlightNumber,
      })),
      OptionPriceInfo: {
        TotalPrice: flight.Fare.PublishedFare.toString(),
        TotalBasePrice: flight.Fare.BaseFare.toString(),
        TotalTax: flight.Fare.Tax.toString(),
        PaxPriceDetails: flight.FareBreakdown.map((breakdown) => ({
          PaxType: breakdown.PassengerType === 1 ? "Adult" : breakdown.PassengerType === 2 ? "Child" : "Infant",
          BasePrice: breakdown.BaseFare.toString(),
          FuelSurcharge: breakdown.YQTax.toString(),
          AirportTax: breakdown.Tax.toString(),
          UdfCharge: "0",
          CongestionCharge: "0",
          SupplierAddCharge: "0",
        })),
      },
      IsLCC: flight.IsLCC,
      ResultFareType: flight.ResultFareType,
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {initialSearchParams && tokenId ? (
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
            onReturnDateChange={handleReturnDateChange}
            onTripTypeChange={handleTripTypeChange}
            onMultiCityChange={handleMultiCityChange}
            onAddMultiCity={handleAddMultiCity}
            onRemoveMultiCity={handleRemoveMultiCity}
          />

          <div className="container mx-auto px-4 py-2">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-[#007aff] hover:text-[#0056b3] font-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              Back to Home
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[#007aff]"></div>
            </div>
          )}

          {error && (
            <div className="min-h-screen flex items-center justify-center">
              <div className="bg-red-100 border border-red-400 text-[#eb0066] px-4 py-3 rounded relative">{error}</div>
            </div>
          )}

          {!loading && !error && (
            <div className="container mx-auto px-4 py-8">
              {process.env.NODE_ENV === "development" && (
                <div className="mb-4 p-2 bg-yellow-100 text-xs">
                  Debug: lastSearchedType={lastSearchedType}, shouldShowRoundTrip={shouldShowRoundTripView()}, outbound=
                  {outboundResults.length}, return={returnResults.length}
                </div>
              )}
              {shouldShowRoundTripView() && (
                <RoundTripSelectionView
                  outboundFlights={outboundResults}
                  returnFlights={returnResults}
                  searchParams={searchForm}
                  onBookFlight={handleBookRoundTripFlight}
                />
              )}

              {shouldShowMultiCityView() && (
                <MultiCitySelectionView
                  multiCityFlights={multiCityResults}
                  searchParams={searchForm}
                  onBookFlight={handleBookMultiCityFlights}
                />
              )}

              {!shouldShowRoundTripView() && !shouldShowMultiCityView() && (
                <>
                  {currentResults.length > 0 && (
                    <>
                      <SortingTabs
                        activeTab={sortOption}
                        onSort={(option) => {
                          setSortOption(option)
                          setCurrentPage(1)
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
                          airlines={Array.from(new Set(currentResults.map((r) => r.AirlineCode))).map((airline) => ({
                            name: airline,
                            minPrice: Math.min(
                              ...currentResults
                                .filter((r) => r.AirlineCode === airline)
                                .map((r) => r.Fare.PublishedFare),
                            ),
                          }))}
                          minPrice={minPrice}
                          maxPrice={maxPrice}
                          onReset={resetFilters}
                          selectedDepartureTimes={selectedDepartureTimes}
                          onDepartureTimeChange={handleTimeChange}
                        />

                        <div className="col-span-9">
                          <div className="mb-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold">
                              Showing {(currentPage - 1) * flightsPerPage + 1} -{" "}
                              {Math.min(currentPage * flightsPerPage, filteredResultsMemo.length)} of{" "}
                              {filteredResultsMemo.length} flights
                            </h2>
                          </div>
                          <div className="space-y-4">
                            {getCurrentPageFlights().map((result, index) => {
                              const adaptedFlight = adaptFlightForCard(result)
                              return (
                                <FlightCard
                                  key={index}
                                  flight={adaptedFlight}
                                  selectedTab={selectedFlight.id === result.ResultIndex ? selectedFlight.tab : null}
                                  onTabClick={(id, tab) => handleTabClick(result.ResultIndex, tab)}
                                  getAirlineImage={getAirlineImage}
                                  isSelected={selectedFlightIds.includes(result.ResultIndex)}
                                  onSelect={() => handleFlightSelection(result.ResultIndex)}
                                  onBook={() => handleBookFlight(result.ResultIndex)}
                                  OptionId={result.ResultIndex}
                                />
                              )
                            })}
                          </div>

                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onNextPage={goToNextPage}
                            onPrevPage={goToPrevPage}
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {currentResults.length === 0 && (
                    <NoFlightsFound searchParams={searchForm} sessionId={tokenId || ""} />
                  )}
                </>
              )}

              {!loading &&
                !error &&
                currentResults.length === 0 &&
                !shouldShowRoundTripView() &&
                !shouldShowMultiCityView() && (
                  <div className="min-h-screen">
                    <NoFlightsFound searchParams={searchForm} sessionId={tokenId || ""} />
                  </div>
                )}
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
