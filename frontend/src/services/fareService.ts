import axios from "axios"

// --- START: Type definitions (Ideally, move to a shared types file) ---

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
  OfferedFare: number
  TdsOnCommission: number
  TdsOnPLB: number
  TdsOnIncentive: number
  ServiceFee: number
  TotalBaggageCharges: number
  TotalMealCharges: number
  TotalSeatCharges: number
  TotalSpecialServiceCharges: number
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
  TripIndicator: number // Important for distinguishing legs in round-trip/multi-city
  SegmentIndicator: number // Important for distinguishing segments within a leg
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

// This represents the structure of the 'Results' object within a FareQuoteResponse
// It's very similar to FlightResult from SearchResults.tsx
export interface FareQuoteResultData {
  IsHoldAllowed: any
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
  Segments: Segment[][] // FareQuote API might return this as Segment[][] for consistency,
  // with the outer array typically having one flight option.
  LastTicketDate: string | null
  TicketAdvisory: string | null
  FareRules: FareRule[]
  AirlineCode: string
  ValidatingAirline: string
  FareClassification: FareClassification
  // Additional fields specific to FareQuote response can be added here
  // e.g., MiniFareRules, Availablity, etc.
  MiniFareRules?: any[] // Placeholder, adjust based on actual API
  IsHoldAllowedWithSSR?: boolean
}

// --- END: Type definitions ---

// Defines the overall structure of the FareQuote API response
export interface FareQuoteResponse {
  Response?: {
    ResponseStatus: number
    Error?: {
      ErrorCode: number
      ErrorMessage: string
    }
    TraceId: string
    Results: FareQuoteResultData // The actual flight details after quoting
  }
  Error?: {
    // For handling top-level errors if the 'Response' object isn't present
    ErrorCode: number
    ErrorMessage: string
  }
  // Other potential top-level fields from the API
  status?: number // Some APIs might return HTTP status or custom status here
  message?: string // General message
}

/**
 * Calls the FareQuote API to get updated pricing and validation information
 * @param tokenId The authentication token
 * @param traceId The trace ID from the search response
 * @param resultIndex The result index of the selected flight
 * @returns Promise with the FareQuote response
 */
export const getFareQuote = async (
  tokenId: string,
  traceId: string,
  resultIndex: string,
): Promise<FareQuoteResponse> => {
  try {
    const response = await axios.post<FareQuoteResponse>(
      // Specify response type for axios
      "https://fareclubs.onrender.com/api/farequote",
      {
        EndUserIp: "192.168.10.10", // This should be dynamically determined in production
        TokenId: tokenId,
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    )

    return response.data
  } catch (error) {
    console.error("Error in getFareQuote:", error)
    // Construct a FareQuoteResponse-compatible error object
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data as FareQuoteResponse // If API returns error in expected format
    }
    // Fallback error structure
    return {
      Error: {
        ErrorCode: -1, // Custom error code for client-side/network errors
        ErrorMessage: "Failed to get fare quote. Please try again.",
      },
    }
  }
}

/**
 * Calls the FareRule API to get fare rules information
 * @param tokenId The authentication token
 * @param traceId The trace ID from the search response
 * @param resultIndex The result index of the selected flight
 * @returns Promise with the FareRule response
 */
export const getFareRule = async (tokenId: string, traceId: string, resultIndex: string) => {
  // Define FareRuleResponse type if not already defined
  // For now, using 'any' as its structure isn't fully specified here
  try {
    const response = await axios.post<any>(
      // Specify FareRuleResponse type if available
      "https://fareclubs.onrender.com/api/farerule",
      {
        EndUserIp: "192.168.10.10", // This should be dynamically determined in production
        TokenId: tokenId,
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    )

    return response.data
  } catch (error) {
    console.error("Error in getFareRule:", error)
    throw new Error("Failed to get fare rules. Please try again.") // Or return a structured error
  }
}
