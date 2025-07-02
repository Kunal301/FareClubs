import axios from "axios"

/**
 * Interface for passenger information required for booking
 */
export interface PassengerInfo {
  Title: string
  FirstName: string
  LastName: string
  PaxType: number | string // 1 for Adult, 2 for Child, 3 for Infant
  DateOfBirth?: string
  Gender: number | string // 1 for Male, 2 for Female
  PassportNo?: string
  PassportExpiry?: string
  AddressLine1: string
  AddressLine2?: string
  City: string
  CountryCode: string
  ContactNo: string
  Email: string
  IsLeadPax: boolean
  Nationality: string
  FFAirlineCode?: string
  FFNumber?: string
  GSTCompanyAddress?: string
  GSTCompanyContactNumber?: string
  GSTCompanyName?: string
  GSTNumber?: string
  GSTCompanyEmail?: string
  CellCountryCode?: string
}

/**
 * Interface for Book API request
 */
export interface BookRequest {
  EndUserIp: string
  TokenId: string
  TraceId: string
  ResultIndex: string
  Passengers: PassengerInfo[]
}

/**
 * Interface for Book API response
 */
export interface BookResponse {
  Response?: {
    Response: any
    PNR: string
    BookingId: number
    SSRDenied: boolean
    SSRMessage: string | null
    Status: number
    IsPriceChanged: boolean
    IsTimeChanged: boolean
    FlightItinerary: {
      BookingId: number
      PNR: string
      IsDomestic: boolean
      Source: number
      Origin: string
      Destination: string
      AirlineCode: string
      ValidatingAirlineCode: string
      LastTicketDate: string
      IsLCC: boolean
      NonRefundable: boolean
      FareType: string
      Fare: {
        Currency: string
        BaseFare: number
        Tax: number
        YQTax: number
        AdditionalTxnFeePub: number
        AdditionalTxnFeeOfrd: number
        OtherCharges: number
        Discount: number
        PublishedFare: number
        OfferedFare: number
        TdsOnCommission: number
        TdsOnPLB: number
        TdsOnIncentive: number
        ServiceFee: number
      }
      Passenger: Array<{
        PaxId: number
        Title: string
        FirstName: string
        LastName: string
        PaxType: number
        DateOfBirth: string
        Gender: number
        PassportNo: string
        PassportExpiry: string
        AddressLine1: string
        AddressLine2: string
        City: string
        CountryCode: string
        CountryName: string
        ContactNo: string
        Email: string
        IsLeadPax: boolean
        FFAirlineCode: string | null
        FFNumber: string
        Fare: any
      }>
      Segments: Array<{
        TripIndicator: number
        SegmentIndicator: number
        Airline: {
          AirlineCode: string
          AirlineName: string
          FlightNumber: string
          FareClass: string
          OperatingCarrier: string
        }
        Origin: {
          Airport: {
            AirportCode: string
            AirportName: string
            Terminal: string
            CityCode: string
            CityName: string
            CountryCode: string
            CountryName: string
          }
          DepTime: string
        }
        Destination: {
          Airport: {
            AirportCode: string
            AirportName: string
            Terminal: string
            CityCode: string
            CityName: string
            CountryCode: string
            CountryName: string
          }
          ArrTime: string
        }
        Duration: number
        FlightStatus: string
        Status: string
      }>
      FareRules: Array<{
        Origin: string
        Destination: string
        Airline: string
        FareBasisCode: string
        FareRuleDetail: string
        FareRestriction: string
      }>
    }
  }
  Error?: {
    ErrorCode: number
    ErrorMessage: string
  }
  TraceId?: string
  ResponseStatus?: number
}

/**
 * Creates a booking using the Book API
 * @param bookRequest The booking request data
 * @returns Promise with the booking response
 */
export const createBooking = async (bookRequest: BookRequest): Promise<BookResponse> => {
  try {
    console.log("Sending booking request:", JSON.stringify(bookRequest, null, 2))

    const response = await axios.post("http://localhost:5000/api/book", bookRequest, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000, // 30 second timeout
    })

    console.log("Booking API response:", response.status, response.statusText)
    console.log("Booking response data:", JSON.stringify(response.data, null, 2))

    return response.data
  } catch (error) {
    console.error("Error in createBooking:", error)

    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error response data:", error.response.data)
        console.error("Error response status:", error.response.status)
        console.error("Error response headers:", error.response.headers)

        return {
          Error: {
            ErrorCode: error.response.status,
            ErrorMessage: `Server error: ${error.response.data?.message || error.message || "Unknown server error"}`,
          },
          ResponseStatus: error.response.status,
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request)
        return {
          Error: {
            ErrorCode: 0,
            ErrorMessage: "No response received from server. Please check your network connection.",
          },
          ResponseStatus: 0,
        }
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error setting up request:", error.message)
        return {
          Error: {
            ErrorCode: 0,
            ErrorMessage: `Request setup error: ${error.message}`,
          },
          ResponseStatus: 0,
        }
      }
    }

    return {
      Error: {
        ErrorCode: 0,
        ErrorMessage: error instanceof Error ? error.message : "Unknown error occurred",
      },
      ResponseStatus: 0,
    }
  }
}

/**
 * Prepares passenger data for booking request
 * @param passengerData Form data for passenger
 * @param fareDetails Fare details from fare quote
 * @returns Formatted passenger info for booking request
 */
export const preparePassengerData = (passengerData: any, fareDetails: any): PassengerInfo => {
  // Convert gender from string to number (1 for Male, 2 for Female)
  const genderMap: { [key: string]: number } = {
    male: 1,
    female: 2,
  }

  // Convert title to proper format if needed
  const titleMap: { [key: string]: string } = {
    mr: "Mr",
    mrs: "Mrs",
    ms: "Ms",
    miss: "Miss",
    master: "Master",
  }

  return {
    Title: titleMap[passengerData.title?.toLowerCase()] || passengerData.title || "Mr",
    FirstName: passengerData.firstName,
    LastName: passengerData.lastName,
    PaxType: 1, // Default to Adult
    DateOfBirth: passengerData.dateOfBirth || undefined,
    Gender: genderMap[passengerData.gender?.toLowerCase()] || 1,
    PassportNo: passengerData.passportNo,
    PassportExpiry: passengerData.passportExpiry,
    AddressLine1: passengerData.addressLine1 || "Address Line 1", // Required field
    AddressLine2: passengerData.addressLine2,
    City: passengerData.city || "City", // Required field
    CountryCode: passengerData.countryCode || "IN", // Required field
    ContactNo: passengerData.mobile || passengerData.contactNo,
    Email: passengerData.email,
    IsLeadPax: true, // Mark as lead passenger
    Nationality: passengerData.nationality || "IN",
    FFAirlineCode: passengerData.ffAirlineCode,
    FFNumber: passengerData.ffNumber,
    GSTCompanyAddress: passengerData.gstCompanyAddress,
    GSTCompanyContactNumber: passengerData.gstCompanyContactNumber,
    GSTCompanyName: passengerData.gstCompanyName,
    GSTNumber: passengerData.gstNumber,
    GSTCompanyEmail: passengerData.gstCompanyEmail,
    CellCountryCode: passengerData.cellCountryCode || "+91",
  }
}

/**
 * Handles the booking process including price/time change scenarios
 * @param bookingData Initial booking data
 * @returns Promise with final booking response
 */
export const handleBookingProcess = async (bookingData: BookRequest): Promise<BookResponse> => {
  try {
    console.log("Starting booking process with data:", JSON.stringify(bookingData, null, 2))

    // First booking attempt
    const bookResponse = await createBooking(bookingData)

    // Check if there was an error
    if (bookResponse.Error && bookResponse.Error.ErrorCode !== 0) {
      console.error("Booking error:", bookResponse.Error)
      throw new Error(bookResponse.Error.ErrorMessage || "Booking failed")
    }

    // Check if booking response is valid
    if (!bookResponse.Response) {
      console.error("Invalid booking response - missing Response object:", bookResponse)
      throw new Error("Invalid booking response received from server")
    }

    // Check if price or time has changed
    if (bookResponse.Response?.IsPriceChanged || bookResponse.Response?.IsTimeChanged) {
      // In a real application, you would show the user the new price/time
      // and ask for confirmation before proceeding
      console.log("Price or time has changed. User confirmation required.")
      return bookResponse
    }

    // If everything is successful, return the response
    return bookResponse
  } catch (error) {
    console.error("Error in handleBookingProcess:", error)

    // Create a structured error response
    const errorResponse: BookResponse = {
      Error: {
        ErrorCode: error instanceof Error ? 500 : 0,
        ErrorMessage: error instanceof Error ? error.message : "Unknown booking process error",
      },
      ResponseStatus: 0,
    }

    return errorResponse
  }
}

/**
 * Gets the booking status description based on status code
 * @param statusCode The booking status code
 * @returns String description of the status
 */
export const getBookingStatusDescription = (statusCode: number): string => {
  const statusMap: { [key: number]: string } = {
    0: "Not Set",
    1: "Successful",
    2: "Failed",
    3: "Other Fare",
    4: "Other Class",
    5: "Booked Other",
    6: "Not Confirmed",
  }

  return statusMap[statusCode] || "Unknown Status"
}
