"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { format, parseISO, parse, isValid, addDays } from "date-fns";
import { SearchHeader } from "./Search/SearchHeader";
import { FilterSection } from "./Search/FilterSection";
import { SortingTabs, type SortOption } from "./Search/SortingTabs";
import { FlightCard } from "./Search/FlightCard";
import { Pagination } from "./Search/Pagination";
import { Header } from "./booking/BookingHeader";
import NoFlightsFound from "./Search/NotFlightFound";
// Import the components for round-trip and multi-city views
import RoundTripSelectionView from "./Search/RoundTripSelection";
import MultiCitySelectionView from "./Search/MultiCitySelection";

// Define types for the new API structure
interface TaxBreakup {
  key: string;
  value: number;
}

interface ChargeBU {
  key: string;
  value: number;
}

interface Fare {
  Currency: string;
  BaseFare: number;
  Tax: number;
  TaxBreakup: TaxBreakup[];
  YQTax: number;
  AdditionalTxnFeeOfrd: number;
  AdditionalTxnFeePub: number;
  PGCharge: number;
  OtherCharges: number;
  ChargeBU: ChargeBU[];
  Discount: number;
  PublishedFare: number;
  CommissionEarned: number;
  PLBEarned: number;
  IncentiveEarned: number;
  OfferedFare: number;
  TdsOnCommission: number;
  TdsOnPLB: number;
  TdsOnIncentive: number;
  ServiceFee: number;
  TotalBaggageCharges: number;
  TotalMealCharges: number;
  TotalSeatCharges: number;
  TotalSpecialServiceCharges: number;
}

interface FareBreakdown {
  Currency: string;
  PassengerType: number;
  PassengerCount: number;
  BaseFare: number;
  Tax: number;
  TaxBreakUp: TaxBreakup[] | null;
  YQTax: number;
  AdditionalTxnFeeOfrd: number;
  AdditionalTxnFeePub: number;
  PGCharge: number;
  SupplierReissueCharges: number;
}

interface Airline {
  AirlineCode: string;
  AirlineName: string;
  FlightNumber: string;
  FareClass: string;
  OperatingCarrier: string;
}

interface Airport {
  AirportCode: string;
  AirportName: string;
  Terminal: string;
  CityCode: string;
  CityName: string;
  CountryCode: string;
  CountryName: string;
}

interface Origin {
  Airport: Airport;
  DepTime: string;
}

interface Destination {
  Airport: Airport;
  ArrTime: string;
}

interface FareClassification {
  Type: string;
  Color?: string;
}

interface Segment {
  Baggage: string;
  CabinBaggage: string;
  CabinClass: number;
  SupplierFareClass: string | null;
  TripIndicator: number;
  SegmentIndicator: number;
  Airline: Airline;
  NoOfSeatAvailable: number;
  Origin: Origin;
  Destination: Destination;
  Duration: number;
  GroundTime: number;
  Mile: number;
  StopOver: boolean;
  FlightInfoIndex: string;
  StopPoint: string;
  StopPointArrivalTime: string | null;
  StopPointDepartureTime: string | null;
  Craft: string;
  Remark: string | null;
  IsETicketEligible: boolean;
  FlightStatus: string;
  Status: string;
  FareClassification: FareClassification;
}

interface FareRule {
  Origin: string;
  Destination: string;
  Airline: string;
  FareBasisCode: string;
  FareRuleDetail: string;
  FareRestriction: string;
  FareFamilyCode: string;
  FareRuleIndex: string;
}

interface FlightResult {
  ResultIndex: string;
  Source: number;
  IsLCC: boolean;
  IsRefundable: boolean;
  IsPanRequiredAtBook: boolean;
  IsPanRequiredAtTicket: boolean;
  IsPassportRequiredAtBook: boolean;
  IsPassportRequiredAtTicket: boolean;
  GSTAllowed: boolean;
  IsCouponAppilcable: boolean;
  IsGSTMandatory: boolean;
  AirlineRemark: string;
  IsPassportFullDetailRequiredAtBook: boolean;
  ResultFareType: string;
  Fare: Fare;
  FareBreakdown: FareBreakdown[];
  Segments: Segment[][];
  LastTicketDate: string | null;
  TicketAdvisory: string | null;
  FareRules: FareRule[];
  AirlineCode: string;
  ValidatingAirline: string;
  FareClassification: FareClassification;
}

interface SearchResponse {
  ResponseStatus: number;
  Error: {
    ErrorCode: number;
    ErrorMessage: string;
  };
  TraceId: string;
  Origin: string;
  Destination: string;
  Results: FlightResult[][];
}

// Define CityPair interface for multi-city trips
interface CityPair {
  from: string;
  to: string;
  date: string;
}

// Define SearchFormData interface
interface SearchFormData {
  from: string;
  to: string;
  date: string;
  returnDate?: string;
  passengers: number;
  tripType: string;
  fareType?: string;
  preferredAirlines?: string[];
  directFlight?: boolean;
  multiCityTrips?: CityPair[];
  journeyType?: string;
  resultFareType?: string;
  sources?: string[] | null;
}

const SearchResults: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [results, setResults] = useState<FlightResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [priceRange, setPriceRange] = useState<number[]>([0, 100000]);
  const [selectedStops, setSelectedStops] = useState<number[]>([]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<{
    id: string | null;
    tab: string | null;
  }>({
    id: null,
    tab: null,
  });
  const [sortOption, setSortOption] = useState<SortOption>("CHEAPEST");
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
  });

  // This is the key change - we'll keep track of the last search type that was actually executed
  const [lastSearchedType, setLastSearchedType] = useState<string>("one-way");

  const [currentPage, setCurrentPage] = useState(1);
  const [flightsPerPage] = useState(15);
  const [shouldSearch, setShouldSearch] = useState(false);
  const [selectedDepartureTimes, setSelectedDepartureTimes] = useState<
    string[]
  >([]);
  const [selectedFlightIds, setSelectedFlightIds] = useState<string[]>([]);
  const [repricedResults, setRepricedResults] = useState<any>(null);
  const [repricingModalOpen, setRepricingModalOpen] = useState(false);
  const [repricingFlight, setRepricingFlight] = useState<FlightResult | null>(
    null
  );
  const [initialSearchParams, setInitialSearchParams] = useState<any>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"outbound" | "return">("outbound");
  const [outboundResults, setOutboundResults] = useState<FlightResult[]>([]);
  const [returnResults, setReturnResults] = useState<FlightResult[]>([]);
  const [multiCityResults, setMultiCityResults] = useState<FlightResult[][]>(
    []
  );
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);
  const [savedResultsLoaded, setSavedResultsLoaded] = useState(false);
  const [returningFromBooking, setReturningFromBooking] = useState(false);

  // Function to determine if we should show round trip view
  // Only show round trip view if the last searched type was round-trip AND we have results
  const shouldShowRoundTripView = () => {
    return (
      lastSearchedType === "round-trip" &&
      outboundResults.length > 0 &&
      returnResults.length > 0
    );
  };

  // Function to determine if we should show multi-city view
  // Only show multi-city view if the last searched type was multi-city AND we have results
  const shouldShowMultiCityView = () => {
    return (
      lastSearchedType === "multi-city" &&
      multiCityResults.length > 0 &&
      multiCityResults.some((segment) => segment.length > 0) // Changed from every to some to show even if some segments have no flights
    );
  };

  // Get search params from location state or localStorage
  const getInitialSearchParams = useCallback(() => {
    if (location.state?.searchParams) {
      // Save to localStorage when we have params from state
      localStorage.setItem(
        "searchParams",
        JSON.stringify(location.state.searchParams)
      );
      return location.state.searchParams;
    }

    // Try to get from localStorage if state is null
    const savedParams = localStorage.getItem("searchParams");
    if (savedParams) {
      return JSON.parse(savedParams);
    }

    // If no saved params, redirect to dashboard
    navigate("/");
    return null;
  }, [location.state, navigate]);

  const getTokenId = useCallback(() => {
    return localStorage.getItem("tokenId");
  }, []);

  const loadSavedResults = useCallback((params: any) => {
    if (
      !params?.date ||
      params.date.trim() === "" ||
      (params.tripType === "round-trip" && (!params.returnDate || params.returnDate.trim() === ""))
    ) {
      console.warn("Missing departure or return date. Not showing saved results.")
      return false
    }
    
    const savedResults = localStorage.getItem("searchResults");
    if (savedResults) {
      try {
        const parsedResults = JSON.parse(savedResults);

        // Set the full results array
        setResults(parsedResults);
        console.log(
          "Loaded saved results from localStorage:",
          parsedResults.length
        );

        // For round trips, separate outbound and return results
        if (params?.tripType === "round-trip" && Array.isArray(parsedResults)) {
          // Create a more robust filtering function
          const isTripIndicator = (
            flight: FlightResult,
            indicator: number
          ): boolean => {
            try {
              // Get the first segment to check origin/destination
              if (
                !flight.Segments ||
                !flight.Segments.length ||
                !flight.Segments[0].length
              ) {
                return false;
              }

              const segment = flight.Segments[0][0];

              // For outbound (indicator 1): MUST be from 'from' to 'to'
              if (indicator === 1) {
                return (
                  segment.Origin.Airport.AirportCode === params.from &&
                  segment.Destination.Airport.AirportCode === params.to
                );
              }

              // For return (indicator 2): MUST be from 'to' to 'from'
              if (indicator === 2) {
                return (
                  segment.Origin.Airport.AirportCode === params.to &&
                  segment.Destination.Airport.AirportCode === params.from
                );
              }

              return false;
            } catch (e) {
              console.error("Error checking trip indicator:", e);
              return false;
            }
          };

          // Filter outbound flights (TripIndicator = 1 or matching origin/destination)
          const outbound = parsedResults.filter((flight) =>
            isTripIndicator(flight, 1)
          );

          // Filter return flights (TripIndicator = 2 or matching origin/destination)
          const returnFlights = parsedResults.filter((flight) =>
            isTripIndicator(flight, 2)
          );

          console.log(
            "Loaded from localStorage - Outbound flights:",
            outbound.length
          );
          console.log(
            "Loaded from localStorage - Return flights:",
            returnFlights.length
          );

          if (outbound.length > 0) {
            setOutboundResults(outbound);
          }

          if (returnFlights.length > 0) {
            setReturnResults(returnFlights);
          }

          // If we have both outbound and return flights, set the last searched type to round-trip
          if (outbound.length > 0 && returnFlights.length > 0) {
            setLastSearchedType("round-trip");
          }

          // Add these debug logs right after:
          console.log(
            "DEBUG - Outbound flights details:",
            outbound.map((flight) => {
              const segment = flight.Segments[0][0];
              return {
                flightId: flight.ResultIndex,
                from: segment.Origin.Airport.AirportCode,
                to: segment.Destination.Airport.AirportCode,
                airline: flight.AirlineCode,
                tripIndicator: segment.TripIndicator,
              };
            })
          );

          console.log(
            "DEBUG - Return flights details:",
            returnFlights.map((flight) => {
              const segment = flight.Segments[0][0];
              return {
                flightId: flight.ResultIndex,
                from: segment.Origin.Airport.AirportCode,
                to: segment.Destination.Airport.AirportCode,
                airline: flight.AirlineCode,
                tripIndicator: segment.TripIndicator,
              };
            })
          );
        }
        // For multi-city trips, organize results by segment
        else if (
          params?.tripType === "multi-city" &&
          Array.isArray(parsedResults) &&
          params?.multiCityTrips
        ) {
          const multiCitySegments: FlightResult[][] = [];

          // For each city pair in the multi-city trip
          params.multiCityTrips.forEach((cityPair: CityPair, index: number) => {
            // Filter flights for this segment
            const segmentFlights = parsedResults.filter((flight) => {
              try {
                if (
                  !flight.Segments ||
                  !flight.Segments.length ||
                  !flight.Segments[0].length
                ) {
                  return false;
                }

                const segment = flight.Segments[0][0];
                return (
                  segment.Origin.Airport.AirportCode === cityPair.from &&
                  segment.Destination.Airport.AirportCode === cityPair.to
                );
              } catch (e) {
                console.error("Error filtering multi-city segment:", e);
                return false;
              }
            });

            multiCitySegments[index] = segmentFlights;
          });

          console.log(
            "Loaded from localStorage - Multi-city segments:",
            multiCitySegments.map((s) => s.length)
          );

          if (
            multiCitySegments.length > 0 &&
            multiCitySegments.every((segment) => segment.length > 0)
          ) {
            setMultiCityResults(multiCitySegments);
            setLastSearchedType("multi-city");
          }
        } else {
          // If not round trip or multi-city, set the last searched type to one-way
          setLastSearchedType("one-way");
        }
        return true; // Indicate that results were loaded
      } catch (e) {
        console.error("Error parsing saved results:", e);
        return false;
      }
    }
    return false; // Indicate that no results were loaded
  }, []);

  useEffect(() => {
    const params = getInitialSearchParams();
    const token = getTokenId();
    setInitialSearchParams(params);
    setTokenId(token);

    // Check if we're returning from booking
    const isReturningFromBooking = location.state?.returnFromBooking === true;
    setReturningFromBooking(isReturningFromBooking);

    if (params) {
      localStorage.setItem("searchParams", JSON.stringify(params));
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
      });

      // Always try to load saved results when returning from booking
      if (
        isReturningFromBooking ||
        (!location.state?.shouldSearch && !savedResultsLoaded)
      ) {
        const loaded = loadSavedResults(params);
        setSavedResultsLoaded(loaded);
      }
    }

    // Check if we should trigger a search
    if (location.state?.shouldSearch) {
      setShouldSearch(true);
    }
  }, [
    getInitialSearchParams,
    getTokenId,
    location.state,
    loadSavedResults,
    savedResultsLoaded,
  ]);

  // Format date for the API (yyyy-MM-ddTHH:mm:ss)
  const formatDateForApi = useCallback((dateStr: string) => {
    try {
      if (!dateStr || dateStr.trim() === "") {
        console.error("Empty date string provided to formatDateForApi");
        return new Date().toISOString().split("T")[0] + "T00:00:00"; // Use current date as fallback
      }

      // Check if the date is already in ISO format
      if (dateStr.includes("T")) {
        return dateStr; // Already in correct format
      }

      const date = parse(dateStr, "yyyy-MM-dd", new Date());
      if (!isValid(date)) {
        console.error("Invalid date parsed:", dateStr);
        return new Date().toISOString().split("T")[0] + "T00:00:00"; // Use current date as fallback
      }

      return format(date, "yyyy-MM-dd'T'HH:mm:ss");
    } catch (error) {
      console.error(
        "Error formatting date:",
        error,
        "for date string:",
        dateStr
      );
      // Return a valid date format as fallback
      return new Date().toISOString().split("T")[0] + "T00:00:00";
    }
  }, []);

  const searchFlights = useCallback(async () => {
    console.log(
      "searchFlights called with tokenId:",
      tokenId,
      "and shouldSearch:",
      shouldSearch
    );
    if (!shouldSearch || !tokenId) return;

    setLoading(true);
    setError("");

    try {
      // Determine journey type based on searchParams
      let journeyType = searchForm.journeyType || "1"; // Default to one-way
      let segments: {
        Origin: string;
        Destination: string;
        FlightCabinClass: string;
        PreferredDepartureTime: string;
        PreferredArrivalTime: string;
      }[] = [];

      if (searchForm.tripType === "one-way") {
        journeyType = "1";
        segments = [
          {
            Origin: searchForm.from,
            Destination: searchForm.to,
            FlightCabinClass: "1", // 1 for All classes
            PreferredDepartureTime: formatDateForApi(searchForm.date),
            PreferredArrivalTime: formatDateForApi(searchForm.date),
          },
        ];

        // Add debug logging
        console.log("Search segments:", segments);
        console.log("Search date:", searchForm.date);
      } else if (searchForm.tripType === "round-trip") {
        journeyType = "2";

        // Make sure we have a valid return date
        const returnDate =
          searchForm.returnDate && searchForm.returnDate.trim() !== ""
            ? searchForm.returnDate
            : format(addDays(new Date(searchForm.date), 1), "yyyy-MM-dd");

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
        ];

        // Add debug logging
        console.log("Round trip segments:", segments);
        console.log("Departure date:", searchForm.date);
        console.log("Return date:", returnDate);
      } else if (
        searchForm.tripType === "multi-city" &&
        searchForm.multiCityTrips
      ) {
        journeyType = "3";
        segments = searchForm.multiCityTrips.map((trip) => ({
          Origin: trip.from,
          Destination: trip.to,
          FlightCabinClass: "1",
          PreferredDepartureTime: formatDateForApi(trip.date),
          PreferredArrivalTime: formatDateForApi(trip.date),
        }));

        // Add debug logging
        console.log("Multi-city segments:", segments);
      }

      // Prepare the request payload according to the API structure
      const requestData: any = {
        EndUserIp: "192.168.1.1", // This should be the actual user's IP in production
        TokenId: tokenId,
        AdultCount: searchForm.passengers.toString(),
        ChildCount: "0",
        InfantCount: "0",
        DirectFlight: searchForm.directFlight ? "true" : "false",
        OneStopFlight: "false",
        JourneyType: journeyType,
        Segments: segments,
      };

      // Add ResultFareType if specified
      if (searchForm.resultFareType) {
        requestData.ResultFareType = searchForm.resultFareType;
      }

      // Add PreferredAirlines if specified
      if (
        searchForm.preferredAirlines &&
        searchForm.preferredAirlines.length > 0
      ) {
        requestData.PreferredAirlines = searchForm.preferredAirlines;
      } else {
        requestData.PreferredAirlines = null;
      }

      // Add Sources if specified
      if (searchForm.sources && searchForm.sources.length > 0) {
        requestData.Sources = searchForm.sources;
      } else {
        requestData.Sources = null;
      }

      console.log(
        "Making API request with data:",
        JSON.stringify(requestData, null, 2)
      );

      // Use the proxy server instead of direct API call
      const response = await axios.post(
        "http://localhost:5000/api/search", // Use your local proxy server
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      // Store the raw API response for debugging
      setRawApiResponse(response.data);

      // Log the full API response
      console.log("Raw Search API Response:", response.data);
      console.log(
        "API response received:",
        response.status,
        response.statusText
      );

      if (
        response.data.Response &&
        response.data.Response.ResponseStatus === 1
      ) {
        // Store the TraceId for future requests
        setTraceId(response.data.Response.TraceId);
        localStorage.setItem("traceId", response.data.Response.TraceId);

        // Process the results - flatten the nested array structure
        let flattened: FlightResult[] = [];

        // Check if Results is an array of arrays or just a single array
        if (Array.isArray(response.data.Response.Results)) {
          if (Array.isArray(response.data.Response.Results[0])) {
            // It's an array of arrays
            flattened = response.data.Response.Results.flat();
          } else {
            // It's a single array
            flattened = response.data.Response.Results;
          }
        }

        console.log("Flattened results:", flattened.length);

        // Store the results
        localStorage.setItem("searchResults", JSON.stringify(flattened));
        setResults(flattened);

        // For round trips, separate outbound and return results
        if (searchForm.tripType === "round-trip") {
          console.log(
            "Processing round trip results, total flights:",
            flattened.length
          );

          // Create a more robust filtering function
          const isTripIndicator = (
            flight: FlightResult,
            indicator: number
          ): boolean => {
            try {
              // Get the first segment to check origin/destination
              if (
                !flight.Segments ||
                !flight.Segments.length ||
                !flight.Segments[0].length
              ) {
                return false;
              }

              const segment = flight.Segments[0][0];

              // For outbound (indicator 1): MUST be from 'from' to 'to'
              if (indicator === 1) {
                return (
                  segment.Origin.Airport.AirportCode === searchForm.from &&
                  segment.Destination.Airport.AirportCode === searchForm.to
                );
              }

              // For return (indicator 2): MUST be from 'to' to 'from'
              if (indicator === 2) {
                return (
                  segment.Origin.Airport.AirportCode === searchForm.to &&
                  segment.Destination.Airport.AirportCode === searchForm.from
                );
              }

              return false;
            } catch (e) {
              console.error("Error checking trip indicator:", e);
              return false;
            }
          };

          // Filter outbound flights (TripIndicator = 1 or matching origin/destination)
          const outbound = flattened.filter((flight) =>
            isTripIndicator(flight, 1)
          );

          // Filter return flights (TripIndicator = 2 or matching origin/destination)
          const returnFlights = flattened.filter((flight) =>
            isTripIndicator(flight, 2)
          );

          console.log("Outbound flights found:", outbound.length);
          console.log("Return flights found:", returnFlights.length);

          setOutboundResults(outbound);
          setReturnResults(returnFlights);

          // Add this logging after we filter outbound and return flights to debug the results
          console.log(
            "DEBUG - Outbound flights details:",
            outbound.map((flight) => {
              const segment = flight.Segments[0][0];
              return {
                flightId: flight.ResultIndex,
                from: segment.Origin.Airport.AirportCode,
                to: segment.Destination.Airport.AirportCode,
                airline: flight.AirlineCode,
                tripIndicator: segment.TripIndicator,
              };
            })
          );

          console.log(
            "DEBUG - Return flights details:",
            returnFlights.map((flight) => {
              const segment = flight.Segments[0][0];
              return {
                flightId: flight.ResultIndex,
                from: segment.Origin.Airport.AirportCode,
                to: segment.Destination.Airport.AirportCode,
                airline: flight.AirlineCode,
                tripIndicator: segment.TripIndicator,
              };
            })
          );

          // Always show outbound tab first
          setActiveTab("outbound");
        }
        // For multi-city trips, organize results by segment
        else if (
          searchForm.tripType === "multi-city" &&
          searchForm.multiCityTrips
        ) {
          console.log(
            "Processing multi-city results, total flights:",
            response.data.Response.Results.length
          );

          // Validate multi-city trip dates
          const isValidMultiCity = searchForm.multiCityTrips.every(
            (trip, index, trips) => {
              if (index === 0) return true;
              const prevDate = new Date(trips[index - 1].date);
              const currDate = new Date(trip.date);
              return currDate >= prevDate;
            }
          );

          if (!isValidMultiCity) {
            setError("Multi-city trip dates must be in chronological order");
            return;
          }

          // Check if the API returned an array of arrays (one array per segment)
          if (
            Array.isArray(response.data.Response.Results) &&
            Array.isArray(response.data.Response.Results[0])
          ) {
            // The API returned results in the expected format - one array per segment
            setMultiCityResults(response.data.Response.Results);

            // Log the number of flights found for each segment
            response.data.Response.Results.forEach(
              (segmentFlights: FlightResult[], index: number) => {
                console.log(
                  `Segment ${index + 1}: ${segmentFlights.length} flights found`
                );
              }
            );

            // Flatten all results for the main results array
            const flattened = response.data.Response.Results.flat();
            setResults(flattened);
          } else {
            // The API returned a flat array - we need to organize it by segment
            console.log("API returned flat results, organizing by segment...");

            const multiCitySegments: FlightResult[][] = [];
            const flattened = response.data.Response.Results || [];

            // For each city pair in the multi-city trip
            searchForm.multiCityTrips.forEach((cityPair, index) => {
              // Filter flights for this segment
              const segmentFlights = flattened.filter(
                (flight: FlightResult) => {
                  try {
                    if (
                      !flight.Segments ||
                      !flight.Segments.length ||
                      !flight.Segments[0].length
                    ) {
                      return false;
                    }

                    const segment = flight.Segments[0][0];

                    // Check if this segment has a SegmentIndex property that matches our current index
                    if (
                      "SegmentIndex" in segment &&
                      segment["SegmentIndex"] !== undefined
                    ) {
                      return segment["SegmentIndex"] === index;
                    }

                    // More flexible matching - case insensitive and trim whitespace
                    const flightOrigin =
                      segment.Origin.Airport.AirportCode.trim().toUpperCase();
                    const flightDest =
                      segment.Destination.Airport.AirportCode.trim().toUpperCase();
                    const searchOrigin = cityPair.from.trim().toUpperCase();
                    const searchDest = cityPair.to.trim().toUpperCase();

                    const matches =
                      flightOrigin === searchOrigin &&
                      flightDest === searchDest;
                    return matches;
                  } catch (e) {
                    console.error("Error filtering multi-city segment:", e);
                    return false;
                  }
                }
              );

              multiCitySegments[index] = segmentFlights;
              console.log(
                `Segment ${index + 1} (${cityPair.from} to ${cityPair.to}): ${
                  segmentFlights.length
                } flights`
              );
            });

            // Even if some segments have no flights, still set the results
            setMultiCityResults(multiCitySegments);
          }

          setLastSearchedType("multi-city");
        }

        // Update the last searched type to the current search type
        // This is the key change - we only update this when a search is actually performed
        setLastSearchedType(searchForm.tripType);
      } else {
        const errorMsg =
          response.data.Response?.Error?.ErrorMessage || "Search failed";
        setError(errorMsg);
        console.error("Search API error:", errorMsg);
      }
    } catch (err) {
      console.error("Error in searchFlights:", err);
      if (axios.isAxiosError(err)) {
        if (err.code === "ERR_NETWORK") {
          setError(
            "Network error: Please check if the backend server is running at http://localhost:5000"
          );
        } else {
          setError(
            `Failed to fetch results: ${err.message}. Please try again.`
          );
        }
      } else {
        setError("Failed to fetch results. Please try again.");
      }
    } finally {
      setLoading(false);
      setShouldSearch(false);
    }
  }, [searchForm, tokenId, shouldSearch, formatDateForApi]);

  useEffect(() => {
    if (shouldSearch) {
      console.log("shouldSearch is true, calling searchFlights()");
      searchFlights();
    }
  }, [searchFlights, shouldSearch]);

  const handleSearchChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setSearchForm({ ...searchForm, [e.target.name]: e.target.value });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Search form submitted, triggering search...");

    // Update search params in localStorage
    localStorage.setItem("searchParams", JSON.stringify(searchForm));

    // Clear previous results
    localStorage.removeItem("searchResults");

    // Reset results
    setResults([]);
    setOutboundResults([]);
    setReturnResults([]);
    setMultiCityResults([]);

    // Set flag to trigger search
    setShouldSearch(true);

    // Reset to first page
    setCurrentPage(1);
  };

  const handleTabClick = (flightId: string, tabName: string) => {
    setSelectedFlight((prev) => {
      if (prev.id === flightId && prev.tab === tabName) {
        return { id: null, tab: null };
      }
      return { id: flightId, tab: tabName };
    });
  };

  const formatDate = (date: string) => {
    const parsedDate = parse(date, "yyyy-MM-dd", new Date());
    return format(parsedDate, "dd/MM/yyyy");
  };

  // Helper function to format API date time
  const formatDateTime = (dateTimeStr: string) => {
    try {
      const date = parseISO(dateTimeStr);
      return {
        time: format(date, "HH:mm"),
        date: format(date, "dd MMM, yyyy"),
      };
    } catch (error) {
      console.error("Invalid date:", dateTimeStr);
      return { time: "Invalid", date: "Invalid" };
    }
  };

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
    };
    return airlineImageMap[airline] || "/images/default-airline.png";
  };

  const sortFlights = (flights: FlightResult[], option: SortOption) => {
    return [...flights].sort((a, b) => {
      switch (option) {
        case "CHEAPEST":
          return a.Fare.PublishedFare - b.Fare.PublishedFare;
        case "SHORTEST":
          // Get the total duration from the first segment
          const aDuration = a.Segments[0]?.[0]?.Duration || 0;
          const bDuration = b.Segments[0]?.[0]?.Duration || 0;
          return aDuration - bDuration;
        case "DEPARTURE":
          // Compare departure times
          const aDepTime = a.Segments[0]?.[0]?.Origin.DepTime || "";
          const bDepTime = b.Segments[0]?.[0]?.Origin.DepTime || "";
          return new Date(aDepTime).getTime() - new Date(bDepTime).getTime();
        case "ARRIVAL":
          // Compare arrival times
          const aArrTime = a.Segments[0]?.[0]?.Destination.ArrTime || "";
          const bArrTime = b.Segments[0]?.[0]?.Destination.ArrTime || "";
          return new Date(aArrTime).getTime() - new Date(bArrTime).getTime();
        default:
          return 0;
      }
    });
  };

  const resetFilters = () => {
    setPriceRange([minPrice, maxPrice]);
    setSelectedStops([]);
    setSelectedAirlines([]);
    setSelectedDepartureTimes([]);
  };

  const handleTimeChange = (timeRange: string) => {
    setSelectedDepartureTimes((prev) => {
      if (prev.includes(timeRange)) {
        return prev.filter((t) => t !== timeRange);
      }
      return [...prev, timeRange];
    });
  };

  // Get the current results based on active tab for round trips
  const currentResults = useMemo(() => {
    if (lastSearchedType === "round-trip") {
      console.log(
        `Getting ${activeTab} results. Outbound: ${outboundResults.length}, Return: ${returnResults.length}`
      );
      return activeTab === "outbound" ? outboundResults : returnResults;
    }
    return results;
  }, [lastSearchedType, activeTab, outboundResults, returnResults, results]);

  const filteredResultsMemo = useMemo(() => {
    console.log("Selected Departure Times:", selectedDepartureTimes);
    console.log("Total results:", currentResults.length);

    return sortFlights(
      currentResults.filter((result) => {
        // Get price from the new API structure
        const price = result.Fare.PublishedFare;

        // Get airline code
        const airline = result.AirlineCode;

        // Calculate stops based on segments
        const stops = result.Segments[0]?.length - 1 || 0;

        // Parse departure time
        const departureTimeStr = result.Segments[0]?.[0]?.Origin.DepTime;

        if (!departureTimeStr) return false;

        try {
          const departureTime = new Date(departureTimeStr);

          // Calculate hours and minutes for time filtering
          const hours = departureTime.getHours();
          const minutes = departureTime.getMinutes();
          const totalMinutes = hours * 60 + minutes;

          const isInSelectedTimeRange =
            selectedDepartureTimes.length === 0 ||
            selectedDepartureTimes.some((timeRange) => {
              const [startTime, endTime] = timeRange.split(" - ");
              const [startHour, startMinute = "00"] = startTime.split(":");
              const [endHour, endMinute = "00"] = endTime.split(":");

              const rangeStart =
                Number.parseInt(startHour) * 60 + Number.parseInt(startMinute);
              const rangeEnd =
                Number.parseInt(endHour) * 60 + Number.parseInt(endMinute);

              return totalMinutes >= rangeStart && totalMinutes < rangeEnd;
            });

          return (
            price >= priceRange[0] &&
            price <= priceRange[1] &&
            (selectedAirlines.length === 0 ||
              selectedAirlines.includes(airline)) &&
            (selectedStops.length === 0 || selectedStops.includes(stops)) &&
            isInSelectedTimeRange
          );
        } catch (error) {
          console.error("Error parsing departure time:", error, {
            departureTimeStr,
            flight: `${airline} ${result.Segments[0]?.[0]?.Airline.FlightNumber}`,
          });
          return false;
        }
      }),
      sortOption
    );
  }, [
    currentResults,
    priceRange,
    selectedAirlines,
    selectedStops,
    selectedDepartureTimes,
    sortOption,
  ]);

  const totalPages = Math.ceil(filteredResultsMemo.length / flightsPerPage);

  const getCurrentPageFlights = () => {
    const indexOfLastFlight = currentPage * flightsPerPage;
    const indexOfFirstFlight = indexOfLastFlight - flightsPerPage;
    return filteredResultsMemo.slice(indexOfFirstFlight, indexOfLastFlight);
  };

  const goToNextPage = () =>
    setCurrentPage((page) => Math.min(page + 1, totalPages));
  const goToPrevPage = () => setCurrentPage((page) => Math.max(page - 1, 1));

  const minPrice = useMemo(
    () =>
      currentResults.length > 0
        ? Math.min(...currentResults.map((r) => r.Fare.PublishedFare))
        : 0,
    [currentResults]
  );

  const maxPrice = useMemo(
    () =>
      currentResults.length > 0
        ? Math.max(...currentResults.map((r) => r.Fare.PublishedFare))
        : 100000,
    [currentResults]
  );

  useEffect(() => {
    setPriceRange([minPrice, maxPrice]);
  }, [minPrice, maxPrice]);

  const handleDateChange = (newDate: string) => {
    setSearchForm((prev) => ({
      ...prev,
      date: newDate,
    }));

    // If this is a round trip and no return date is set, set a default return date
    if (
      searchForm.tripType === "round-trip" &&
      (!searchForm.returnDate || searchForm.returnDate.trim() === "")
    ) {
      const departureDate = new Date(newDate);
      const newReturnDate = format(addDays(departureDate, 1), "yyyy-MM-dd");
      setSearchForm((prev) => ({
        ...prev,
        returnDate: newReturnDate,
      }));
    }
  };

  const handleReturnDateChange = (newDate: string) => {
    setSearchForm((prev) => ({
      ...prev,
      returnDate: newDate,
    }));
  };

  const handleTripTypeChange = (type: string) => {
    setSearchForm((prev) => {
      // If switching to round-trip and no return date is set, set a default return date (next day)
      let returnDate = prev.returnDate;
      if (
        type === "round-trip" &&
        (!prev.returnDate || prev.returnDate.trim() === "")
      ) {
        // Set return date to the next day after departure date, or current date + 1 if no departure date
        if (prev.date && prev.date.trim() !== "") {
          const departureDate = new Date(prev.date);
          returnDate = format(addDays(departureDate, 1), "yyyy-MM-dd");
        } else {
          returnDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
        }
      }

      return {
        ...prev,
        tripType: type,
        returnDate: type === "round-trip" ? returnDate : "",
        // Reset multi-city trips when switching to multi-city
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
      };
    });
  };

  const handleMultiCityChange = (
    index: number,
    field: keyof CityPair,
    value: string
  ) => {
    setSearchForm((prev) => {
      const updatedTrips = [...(prev.multiCityTrips || [])];
      if (!updatedTrips[index]) {
        updatedTrips[index] = { from: "", to: "", date: "" };
      }
      updatedTrips[index] = { ...updatedTrips[index], [field]: value };
      return { ...prev, multiCityTrips: updatedTrips };
    });
  };

  const handleAddMultiCity = () => {
    setSearchForm((prev) => {
      const updatedTrips = [...(prev.multiCityTrips || [])];
      if (updatedTrips.length < 5) {
        // Limit to 5 trips
        updatedTrips.push({ from: "", to: "", date: "" });
      }
      return { ...prev, multiCityTrips: updatedTrips };
    });
  };

  const handleRemoveMultiCity = (index: number) => {
    setSearchForm((prev) => {
      const updatedTrips = [...(prev.multiCityTrips || [])];
      if (updatedTrips.length > 1) {
        updatedTrips.splice(index, 1);
      }
      return { ...prev, multiCityTrips: updatedTrips };
    });
  };

  const handleFlightSelection = (flightId: string) => {
    setSelectedFlightIds((prev) => {
      if (prev.includes(flightId)) {
        return prev.filter((id) => id !== flightId);
      }
      return [...prev, flightId];
    });
  };

  const handleBookFlight = async (flightId: string) => {
    setLoading(true);
    setError("");

    try {
      const flightToBook = results.find(
        (result) => result.ResultIndex === flightId
      );
      if (!flightToBook) {
        throw new Error("Flight not found");
      }
      setRepricingFlight(flightToBook);

      // Store the selected flight in localStorage
      localStorage.setItem("selectedFlight", JSON.stringify(flightToBook));
      localStorage.setItem("searchParams", JSON.stringify(searchForm));
      localStorage.setItem("traceId", traceId || "");

      // Convert the flight data to the format expected by the booking page
      const adaptedFlight = {
        SearchSegmentId:
          Number.parseInt(flightToBook.ResultIndex.replace(/\D/g, "")) || 0, // Convert to number
        JourneyTime: flightToBook.Segments[0][0].Duration,
        OptionId: flightToBook.ResultIndex,
        OptionSegmentsInfo: flightToBook.Segments[0].map((segment) => ({
          DepartureAirport: segment.Origin.Airport.AirportCode,
          ArrivalAirport: segment.Destination.Airport.AirportCode,
          DepartureTime: segment.Origin.DepTime,
          ArrivalTime: segment.Destination.ArrTime,
          MarketingAirline: segment.Airline.AirlineName,
          FlightNumber: segment.Airline.FlightNumber,
        })),
        OptionPriceInfo: {
          TotalPrice: flightToBook.Fare.PublishedFare.toString(),
          TotalBasePrice: flightToBook.Fare.BaseFare.toString(),
          TotalTax: flightToBook.Fare.Tax.toString(),
          PaxPriceDetails: flightToBook.FareBreakdown.map((breakdown) => ({
            PaxType:
              breakdown.PassengerType === 1
                ? "Adult"
                : breakdown.PassengerType === 2
                ? "Child"
                : "Infant",
            BasePrice: breakdown.BaseFare.toString(),
            FuelSurcharge: breakdown.YQTax.toString(),
            AirportTax: breakdown.Tax.toString(),
            UdfCharge: "0",
            CongestionCharge: "0",
            SupplierAddCharge: "0",
          })),
        },
      };

      navigate("/booking", {
        state: {
          flight: adaptedFlight,
          searchParams: searchForm,
          tokenId: tokenId,
          traceId: traceId,
        },
      });
    } catch (err) {
      console.error("Error preparing for booking:", err);
      setError("Failed to prepare flight for booking");
    } finally {
      setLoading(false);
    }
  };

  // Handle booking for multi-city trips
  const handleBookMultiCityFlights = (selectedFlightIds: string[]) => {
    setLoading(true);
    setError("");

    try {
      const selectedFlights: FlightResult[] = [];

      // Find all selected flights
      selectedFlightIds.forEach((flightId, index) => {
        // Make sure we're looking in the correct segment
        const flight = multiCityResults[index]?.find(
          (f) => f.ResultIndex === flightId
        );
        if (flight) {
          selectedFlights.push(flight);
        } else {
          console.error(
            `Flight with ID ${flightId} not found in segment ${index}`
          );
        }
      });

      if (selectedFlights.length !== selectedFlightIds.length) {
        throw new Error("Some selected flights could not be found");
      }

      // Store the selected flights in localStorage
      localStorage.setItem(
        "selectedMultiCityFlights",
        JSON.stringify(selectedFlights)
      );
      localStorage.setItem("searchParams", JSON.stringify(searchForm));
      localStorage.setItem("traceId", traceId || "");

      // Calculate total price
      const totalPrice = selectedFlights.reduce(
        (sum, flight) => sum + flight.Fare.PublishedFare,
        0
      );

      // Convert the flights data to the format expected by the booking page
      const adaptedFlights = selectedFlights.map((flight) => ({
        SearchSegmentId:
          Number.parseInt(flight.ResultIndex.replace(/\D/g, "")) || 0,
        JourneyTime: flight.Segments[0][0].Duration,
        OptionId: flight.ResultIndex,
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
              PaxType:
                breakdown.PassengerType === 1
                  ? "Adult"
                  : breakdown.PassengerType === 2
                  ? "Child"
                  : "Infant",
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
      }));

      // Log the data being sent to the booking page for debugging
      console.log("Multi-city booking data:", {
        flights: adaptedFlights,
        totalPrice,
        searchParams: searchForm,
      });

      navigate("/booking", {
        state: {
          multiCityFlights: adaptedFlights,
          searchParams: searchForm,
          tokenId: tokenId,
          traceId: traceId,
          isMultiCity: true,
          totalPrice: totalPrice,
        },
      });
    } catch (err) {
      console.error("Error preparing for multi-city booking:", err);
      setError("Failed to prepare flights for booking");
    } finally {
      setLoading(false);
    }
  };

  // Adapter function to convert new API flight data to the format expected by FlightCard
  const adaptFlightForCard = (flight: FlightResult) => {
    return {
      OptionId: flight.ResultIndex, // Keep as string, don't convert
      SearchSegmentId:
        Number.parseInt(flight.ResultIndex.replace(/\D/g, "")) || 0, // Convert to number or use 0 as fallback
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
          PaxType:
            breakdown.PassengerType === 1
              ? "Adult"
              : breakdown.PassengerType === 2
              ? "Child"
              : "Infant",
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
    };
  };

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
              }));
            }}
            onDateChange={handleDateChange}
            onReturnDateChange={handleReturnDateChange}
            onTripTypeChange={handleTripTypeChange}
            onMultiCityChange={handleMultiCityChange}
            onAddMultiCity={handleAddMultiCity}
            onRemoveMultiCity={handleRemoveMultiCity}
          />

          {/* Add Back to Home button */}
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
              <div className="bg-red-100 border border-red-400 text-[#eb0066] px-4 py-3 rounded relative">
                {error}
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="container mx-auto px-4 py-8">
              {shouldShowRoundTripView() && (
                <RoundTripSelectionView
                  outboundFlights={outboundResults}
                  returnFlights={returnResults}
                  searchParams={searchForm}
                  onBookFlight={(outboundId, returnId) => {
                    // Find the selected flights
                    const outboundFlight = outboundResults.find(
                      (f) => f.ResultIndex === outboundId
                    );
                    const returnFlight = returnResults.find(
                      (f) => f.ResultIndex === returnId
                    );

                    if (outboundFlight && returnFlight) {
                      // Combine the flights for booking
                      const combinedFlight = {
                        ...outboundFlight,
                        ReturnFlight: returnFlight,
                        TotalPrice:
                          outboundFlight.Fare.PublishedFare +
                          returnFlight.Fare.PublishedFare,
                      };

                      // Store the combined flight in localStorage
                      localStorage.setItem(
                        "selectedFlight",
                        JSON.stringify(outboundFlight)
                      );
                      localStorage.setItem(
                        "selectedReturnFlight",
                        JSON.stringify(returnFlight)
                      );

                      // Navigate to booking page
                      navigate("/booking", {
                        state: {
                          flight: adaptFlightForCard(outboundFlight),
                          returnFlight: adaptFlightForCard(returnFlight),
                          searchParams: searchForm,
                          tokenId: tokenId,
                          traceId: traceId,
                          isRoundTrip: true,
                          totalPrice:
                            outboundFlight.Fare.PublishedFare +
                            returnFlight.Fare.PublishedFare,
                        },
                      });
                    }
                  }}
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
                  {/* Original content with SortingTabs, FilterSection, etc. */}
                  {currentResults.length > 0 && (
                    <>
                      <SortingTabs
                        activeTab={sortOption}
                        onSort={(option) => {
                          setSortOption(option);
                          setCurrentPage(1); // Reset to first page when sorting changes
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
                                return prev.filter((s) => s !== stops);
                              }
                              return [...prev, stops];
                            });
                          }}
                          onAirlinesChange={(airline) => {
                            setSelectedAirlines((prev) => {
                              if (prev.includes(airline)) {
                                return prev.filter((a) => a !== airline);
                              }
                              return [...prev, airline];
                            });
                          }}
                          airlines={Array.from(
                            new Set(currentResults.map((r) => r.AirlineCode))
                          ).map((airline) => ({
                            name: airline,
                            minPrice: Math.min(
                              ...currentResults
                                .filter((r) => r.AirlineCode === airline)
                                .map((r) => r.Fare.PublishedFare)
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
                              {Math.min(
                                currentPage * flightsPerPage,
                                filteredResultsMemo.length
                              )}{" "}
                              of {filteredResultsMemo.length} flights
                            </h2>
                          </div>
                          <div className="space-y-4">
                            {getCurrentPageFlights().map((result, index) => {
                              const adaptedFlight = adaptFlightForCard(result);
                              return (
                                <FlightCard
                                  key={index}
                                  flight={adaptedFlight}
                                  selectedTab={
                                    selectedFlight.id === result.ResultIndex
                                      ? selectedFlight.tab
                                      : null
                                  }
                                  onTabClick={(id, tab) =>
                                    handleTabClick(result.ResultIndex, tab)
                                  }
                                  getAirlineImage={getAirlineImage}
                                  isSelected={selectedFlightIds.includes(
                                    result.ResultIndex
                                  )}
                                  onSelect={() =>
                                    handleFlightSelection(result.ResultIndex)
                                  }
                                  onBook={() =>
                                    handleBookFlight(result.ResultIndex)
                                  }
                                  OptionId={result.ResultIndex}
                                />
                              );
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
                    <NoFlightsFound
                      searchParams={searchForm}
                      sessionId={tokenId || ""}
                    />
                  )}
                </>
              )}

              {!loading &&
                !error &&
                currentResults.length === 0 &&
                !shouldShowRoundTripView() &&
                !shouldShowMultiCityView() && (
                  <div className="min-h-screen">
                    {/* Always show NoFlightsFound when there are no results, regardless of shouldSearch state */}
                    <NoFlightsFound
                      searchParams={searchForm}
                      sessionId={tokenId || ""}
                    />
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
  );
};

export default SearchResults;
