import axios from "axios"

/**
 * Interface for Ticket API request for Non-LCC flights
 */
export interface NonLCCTicketRequest {
  EndUserIp: string
  TokenId: string
  TraceId: string
  PNR: string
  BookingId: number
  Passport?: PassportDetail[]
  IsPriceChangeAccepted?: boolean
}

/**
 * Interface for passport details
 */
export interface PassportDetail {
  PaxId: number
  PassportNo: string
  PassportExpiry: string // Format: "YYYY-MM-DDT00:00:00"
  DateOfBirth: string // Format: "YYYY-MM-DDT00:00:00"
}

/**
 * Interface for Ticket API request for LCC flights
 */
export interface LCCTicketRequest {
  EndUserIp: string
  TokenId: string
  TraceId: string
  ResultIndex: string
  Passengers: LCCPassenger[]
  IsPriceChangeAccepted?: boolean
  PreferredCurrency?: string
  AgentReferenceNo?: string
}

/**
 * Interface for LCC passenger details
 */
export interface LCCPassenger {
  Title: string
  FirstName: string
  LastName: string
  PaxType: number // Adult = 1, Child = 2, Infant = 3
  DateOfBirth: string
  Gender: number // Male = 1, Female = 2
  PassportNo?: string
  PassportExpiry?: string
  AddressLine1: string
  AddressLine2?: string
  City: string
  CountryCode: string
  CountryName: string
  ContactNo: string
  Email: string
  IsLeadPax: boolean
  FFAirlineCode?: string
  FFNumber?: string
  Fare: {
    BaseFare: number
    Tax: number
    YQTax: number
    AdditionalTxnFeePub: number
    AdditionalTxnFeeOfrd: number
    OtherCharges: number
  }
  Nationality?: string
  Baggage?: any[]
  MealDynamic?: any[]
  SeatDynamic?: any[]
  SpecialServices?: any[]
  GSTCompanyAddress?: string
  GSTCompanyContactNumber?: string
  GSTCompanyName?: string
  GSTNumber?: string
  GSTCompanyEmail?: string
}

/**
 * Interface for Ticket API response
 */
export interface TicketResponse {
  Response?: {
    ResponseStatus?: number
    Error?: {
      ErrorCode: number
      ErrorMessage: string
    }
    TraceId?: string
    Response?: {
      PNR: string
      BookingId: number
      SSRDenied: boolean
      SSRMessage?: string
      Status: number
      IsPriceChanged: boolean
      IsTimeChanged: boolean
      TicketStatus: number
      FlightItinerary: {
        BookingId: number
        PNR: string
        IsDomestic: boolean
        Source: string
        Origin: string
        Destination: string
        AirlineCode: string
        ValidatingAirlineCode: string
        AirlineRemark?: string
        IsLCC: boolean
        NonRefundable: boolean
        FareType: string
        Fare: {
          Currency: string
          BaseFare: number
          Tax: number
          TaxBreakup?: any[]
          YQTax: number
          AdditionalTxnFeeOfrd: number
          AdditionalTxnFeePub: number
          PGCharge?: number
          OtherCharges: number
          ChargeBU?: any[]
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
          TotalBaggageCharges?: number
          TotalMealCharges?: number
          TotalSeatCharges?: number
          TotalSpecialServiceCharges?: number
        }
        Passenger: Array<{
          PaxId: number
          Title: string
          FirstName: string
          LastName: string
          PaxType: number
          DateOfBirth: string
          Gender: number
          PassportNo?: string
          PassportExpiry?: string
          AddressLine1: string
          AddressLine2?: string
          City: string
          CountryCode: string
          CountryName: string
          ContactNo: string
          Email: string
          IsLeadPax: boolean
          FFAirlineCode?: string
          FFNumber?: string
          Fare: any
          Baggage?: any[]
          MealDynamic?: any[]
          SeatDynamic?: any[]
          SpecialServices?: any[]
          Ticket: {
            TicketId: number
            TicketNumber: string
            IssueDate: string
            ValidatingAirline: string
            Remarks: string
            ServiceFeeDisplayType: string
            Status: string
            ConjunctionNumber?: string
            TicketType?: string
          }
          SegmentAdditionalInfo?: Array<{
            FareBasis: string
            NVA: string
            NVB: string
            Baggage: string
            Meal: string
            Seat?: string
            SpecialService?: string
          }>
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
              Terminal?: string
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
              Terminal?: string
              CityCode: string
              CityName: string
              CountryCode: string
              CountryName: string
            }
            ArrTime: string
          }
          Duration: number
          GroundTime: number
          Mile: number
          StopOver: boolean
          Craft: string
          IsETicketEligible: boolean
          FlightStatus: string
          Status: string
          Baggage?: string
          CabinBaggage?: string
          CabinClass?: number
        }>
        FareRules?: any[]
        Status: number
        InvoiceNo?: string
        InvoiceCreatedOn?: string
      }
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
 * Enum for ticket status codes
 */
export enum TicketStatus {
  Failed = 0,
  Successful = 1,
  NotSaved = 2,
  NotCreated = 3,
  NotAllowed = 4,
  InProgress = 5,
  TicketAlreadyCreated = 6,
  PriceChanged = 8,
  OtherError = 9,
}

/**
 * Issues a ticket for a confirmed booking (Non-LCC)
 * @param ticketRequest The ticket request data
 * @returns Promise with the ticket response
 */
export const issueNonLCCTicket = async (ticketRequest: NonLCCTicketRequest): Promise<TicketResponse> => {
  try {
    const response = await axios.post("http://localhost:5000/api/air/ticket", ticketRequest, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    return response.data
  } catch (error) {
    console.error("Error in issueNonLCCTicket:", error)
    throw new Error("Failed to issue ticket. Please try again.")
  }
}

/**
 * Books and issues a ticket for LCC flights (direct booking)
 * @param ticketRequest The ticket request data
 * @returns Promise with the ticket response
 */
export const issueLCCTicket = async (ticketRequest: LCCTicketRequest): Promise<TicketResponse> => {
  try {
    console.log("Sending LCC ticket request:", JSON.stringify(ticketRequest, null, 2))

    // Use the Ticket endpoint directly for LCC flights
    const response = await axios.post("http://localhost:5000/api/air/ticket", ticketRequest, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("LCC ticket response:", response.data)
    return response.data
  } catch (error) {
    console.error("Error in issueLCCTicket:", error)

    // Provide more detailed error information
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status
      const errorMessage =
        error.response?.data?.Error?.ErrorMessage ||
        error.response?.data?.Response?.Error?.ErrorMessage ||
        error.response?.data?.Description ||
        error.message
      console.error(`API Error (${statusCode}): ${errorMessage}`)

      if (error.response?.data) {
        console.error("API Error Response:", error.response.data)
      }

      // Log the original request for debugging
      console.error("Failed request data:", JSON.stringify(ticketRequest, null, 2))

      throw new Error(`Failed to book LCC flight: ${errorMessage}`)
    }

    throw new Error("Failed to issue ticket. Please try again.")
  }
}

/**
 * Handles the ticketing process after a successful booking
 * @param bookingId The booking ID from the Book API response
 * @param pnr The PNR from the Book API response
 * @param tokenId The authentication token
 * @param traceId The trace ID from the search/book process
 * @param isLCC Whether the booking is for a Low-Cost Carrier
 * @param resultIndex The result index (required for LCC bookings)
 * @param passengerData Passenger data (required for LCC bookings)
 * @returns Promise with the ticket response
 */
export const handleTicketingProcess = async (
  bookingId: number,
  pnr: string,
  tokenId: string,
  traceId: string,
  isLCC: boolean,
  resultIndex?: string,
  passengerData?: any[],
): Promise<TicketResponse> => {
  try {
    if (isLCC && (!resultIndex || !passengerData)) {
      throw new Error("Result index and passenger data are required for LCC ticketing")
    }

    if (isLCC && resultIndex && passengerData) {
      console.log("Processing LCC ticket with resultIndex:", resultIndex)
      console.log("Passenger data:", JSON.stringify(passengerData, null, 2))

      // Process LCC ticket
      const lccTicketRequest: LCCTicketRequest = {
        EndUserIp: "192.168.10.10", // This should be dynamically determined in production
        TokenId: tokenId,
        TraceId: traceId,
        ResultIndex: resultIndex,
        Passengers: passengerData.map((passenger) => ({
          ...passenger,
          Fare: passenger.Fare || {
            BaseFare: 0,
            Tax: 0,
            YQTax: 0,
            AdditionalTxnFeePub: 0,
            AdditionalTxnFeeOfrd: 0,
            OtherCharges: 0,
          },
        })),
      }

      // Issue the LCC ticket
      return await issueLCCTicket(lccTicketRequest)
    } else {
      console.log("Processing Non-LCC ticket for BookingId:", bookingId, "PNR:", pnr)

      // Process Non-LCC ticket
      const nonLCCTicketRequest: NonLCCTicketRequest = {
        EndUserIp: "192.168.10.10", // This should be dynamically determined in production
        TokenId: tokenId,
        TraceId: traceId,
        PNR: pnr,
        BookingId: bookingId,
      }

      // Issue the Non-LCC ticket
      return await issueNonLCCTicket(nonLCCTicketRequest)
    }
  } catch (error) {
    console.error("Error in handleTicketingProcess:", error)
    throw error
  }
}

/**
 * Handles price or time changes during the ticketing process
 * @param ticketResponse The initial ticket response with price/time changes
 * @param tokenId The authentication token
 * @param traceId The trace ID from the search/book process
 * @param isLCC Whether the booking is for a Low-Cost Carrier
 * @param acceptPriceChange Whether to accept the price change
 * @returns Promise with the updated ticket response
 */
export const handlePriceOrTimeChange = async (
  ticketResponse: TicketResponse,
  tokenId: string,
  traceId: string,
  isLCC: boolean,
  acceptPriceChange = false,
): Promise<TicketResponse> => {
  try {
    if (!ticketResponse.Response?.Response) {
      throw new Error("Invalid ticket response")
    }

    const { BookingId, PNR } = ticketResponse.Response.Response

    if (isLCC) {
      // For LCC, we need to resubmit the entire request with IsPriceChangeAccepted=true
      // This would require the original request data which we don't have here
      // In a real implementation, you would need to store the original request data
      throw new Error("Price change handling for LCC requires the original passenger data")
    } else {
      // For Non-LCC, we can simply resubmit with IsPriceChangeAccepted=true
      const nonLCCTicketRequest: NonLCCTicketRequest = {
        EndUserIp: "192.168.10.10", // This should be dynamically determined in production
        TokenId: tokenId,
        TraceId: traceId,
        PNR: PNR,
        BookingId: BookingId,
        IsPriceChangeAccepted: acceptPriceChange,
      }

      // Reissue the Non-LCC ticket
      return await issueNonLCCTicket(nonLCCTicketRequest)
    }
  } catch (error) {
    console.error("Error in handlePriceOrTimeChange:", error)
    throw error
  }
}

/**
 * Gets the ticket status description based on status code
 * @param statusCode The ticket status code
 * @returns String description of the status
 */
export const getTicketStatusDescription = (statusCode: number): string => {
  const statusMap: { [key: number]: string } = {
    0: "Failed",
    1: "Successful",
    2: "Not Saved",
    3: "Not Created",
    4: "Not Allowed",
    5: "In Progress",
    6: "Ticket Already Created",
    8: "Price Changed",
    9: "Other Error",
  }

  return statusMap[statusCode] || "Unknown Status"
}

/**
 * Formats passenger data for LCC ticket requests
 * @param passengerDetails The passenger details from booking form
 * @param fareDetails The fare details from flight selection
 * @param selectedSSROptions Selected SSR options (baggage, meals, seats, etc.)
 * @returns Formatted passenger data for LCC ticket request
 */
export const formatLCCPassengerData = (
  passengerDetails: any,
  fareDetails: any,
  selectedSSROptions?: any,
): LCCPassenger => {
  // Extract base fare and tax from fare details
  const baseFare = Number.parseFloat(fareDetails?.BaseFare || fareDetails?.TotalBasePrice || "0")
  const tax = Number.parseFloat(fareDetails?.Tax || fareDetails?.TotalTax || "0")

  // Create passenger object
  const passenger: LCCPassenger = {
    Title: passengerDetails.title || "Mr",
    FirstName: passengerDetails.firstName,
    LastName: passengerDetails.lastName,
    PaxType: passengerDetails.paxType || 1, // Default to Adult
    DateOfBirth:
      passengerDetails.dateOfBirth || new Date(new Date().setFullYear(new Date().getFullYear() - 20)).toISOString(),
    Gender: passengerDetails.gender === "female" ? 2 : 1,
    AddressLine1: passengerDetails.addressLine1 || "Address",
    City: passengerDetails.city || "City",
    CountryCode: passengerDetails.countryCode || "IN",
    CountryName: passengerDetails.countryName || "India",
    ContactNo: passengerDetails.mobile,
    Email: passengerDetails.email,
    IsLeadPax: passengerDetails.isLeadPax || true,
    Fare: {
      BaseFare: baseFare,
      Tax: tax,
      YQTax: 0,
      AdditionalTxnFeePub: 0,
      AdditionalTxnFeeOfrd: 0,
      OtherCharges: 0,
    },
    Nationality: passengerDetails.nationality || "IN",
    // Initialize empty arrays for SSR options
    Baggage: [],
    MealDynamic: [],
    SeatDynamic: [],
    SpecialServices: [],
  }

  // Add passport details if available
  if (passengerDetails.passportNo) {
    passenger.PassportNo = passengerDetails.passportNo
    passenger.PassportExpiry =
      passengerDetails.passportExpiry || new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString()
  }

  // Add GST details if available
  if (passengerDetails.gstNumber) {
    passenger.GSTNumber = passengerDetails.gstNumber
    passenger.GSTCompanyName = passengerDetails.gstCompanyName || ""
    passenger.GSTCompanyAddress = passengerDetails.gstCompanyAddress || ""
    passenger.GSTCompanyContactNumber = passengerDetails.gstCompanyContactNumber || ""
    passenger.GSTCompanyEmail = passengerDetails.gstCompanyEmail || ""
  }

  // Add SSR options if available
  if (selectedSSROptions) {
    if (selectedSSROptions.baggage && Array.isArray(selectedSSROptions.baggage)) {
      passenger.Baggage = selectedSSROptions.baggage
    }
    if (selectedSSROptions.meals && Array.isArray(selectedSSROptions.meals)) {
      passenger.MealDynamic = selectedSSROptions.meals
    }
    if (selectedSSROptions.seats && Array.isArray(selectedSSROptions.seats)) {
      passenger.SeatDynamic = selectedSSROptions.seats
    }
    if (selectedSSROptions.specialServices && Array.isArray(selectedSSROptions.specialServices)) {
      passenger.SpecialServices = selectedSSROptions.specialServices
    }
  }

  return passenger
}

/**
 * Formats passport data for Non-LCC ticket requests
 * @param passengerDetails The passenger details from booking form
 * @param paxId The passenger ID from booking response
 * @returns Formatted passport data for Non-LCC ticket request
 */
export const formatPassportData = (passengerDetails: any, paxId: number): PassportDetail => {
  return {
    PaxId: paxId,
    PassportNo: passengerDetails.passportNo || "",
    PassportExpiry:
      passengerDetails.passportExpiry || new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    DateOfBirth: passengerDetails.dateOfBirth || new Date().toISOString(),
  }
}

/**
 * Generates a PDF ticket from ticket response data
 * @param ticketResponse The ticket response data
 * @returns Promise with the PDF ticket data
 */
export const generatePDFTicket = async (ticketResponse: TicketResponse): Promise<Blob> => {
  try {
    if (!ticketResponse.Response?.Response?.FlightItinerary) {
      throw new Error("Invalid ticket response for PDF generation")
    }

    const response = await axios.post(
      "http://localhost:5000/api/air/generate-ticket-pdf",
      { ticketData: ticketResponse },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        responseType: "blob",
      },
    )

    return response.data
  } catch (error) {
    console.error("Error generating PDF ticket:", error)
    throw new Error("Failed to generate PDF ticket. Please try again.")
  }
}

/**
 * Downloads the PDF ticket
 * @param ticketResponse The ticket response data
 * @param fileName The file name for the downloaded PDF
 */
export const downloadPDFTicket = async (ticketResponse: TicketResponse, fileName = "ticket.pdf"): Promise<void> => {
  try {
    const pdfBlob = await generatePDFTicket(ticketResponse)
    const url = window.URL.createObjectURL(pdfBlob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error downloading PDF ticket:", error)
    throw error
  }
}
