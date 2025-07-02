import axios from "axios"

// Request Types
interface GetBookingDetailsBaseRequest {
  EndUserIp: string
  TokenId: string
}

interface GetBookingDetailsByIdRequest extends GetBookingDetailsBaseRequest {
  BookingId: string
}

interface GetBookingDetailsByPNRRequest extends GetBookingDetailsBaseRequest {
  PNR: string
  FirstName?: string
  LastName?: string
}

interface GetBookingDetailsByTraceIdRequest extends GetBookingDetailsBaseRequest {
  TraceId: string
}

// Response Types
export interface GetBookingDetailsResponse {
  Error?: {
    ErrorCode: number
    ErrorMessage: string
  }
  Response?: {
    Error?: {
      ErrorCode: number
      ErrorMessage: string
    }
    FlightItinerary?: {
      BookingId: number
      PNR: string
      IsDomestic: boolean
      Source: number
      Origin: string
      Destination: string
      AirlineCode: string
      ValidatingAirlineCode: string
      AirlineRemark?: string
      AirlineTollFreeNo?: string
      IsLCC: boolean
      NonRefundable: boolean
      FareType: string
      Fare: {
        Currency: string
        BaseFare: number
        Tax: number
        YQTax: number
        AdditionalTxnFeeOfrd: number
        AdditionalTxnFeePub: number
        OtherCharges: number
        ChargeBU: Array<{
          key: string
          value: number
        }>
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
        AddressLine1?: string
        AddressLine2?: string
        City?: string
        CountryCode?: string
        CountryName?: string
        ContactNo?: string
        Email?: string
        IsLeadPax: boolean
        FFAirlineCode?: string
        FFNumber?: string
        Fare: {
          Currency: string
          BaseFare: number
          Tax: number
          YQTax: number
          AdditionalTxnFeeOfrd: number
          AdditionalTxnFeePub: number
          OtherCharges: number
          ChargeBU: Array<{
            key: string
            value: number
          }>
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
        }
        Baggage?: Array<{
          WayType: number
          Code: string
          Description: number
          Weight: number
          Currency: string
          Price: number
          Origin: string
          Destination: string
        }>
        MealDynamic?: Array<{
          WayType: number
          Code: string
          Description: number
          AirlineDescription: string
          Quantity: number
          Price: number
          Currency: string
          Origin: string
          Destination: string
        }>
        Ticket?: {
          TicketId: number
          TicketNumber: string
          IssueDate: string
          ValidatingAirline: string
          Remarks: string
          ServiceFeeDisplayType: string
          Status: string
        }
        SegmentAdditionalInfo?: Array<{
          FareBasis: string
          NVA: string | null
          NVB: string | null
          Baggage: string
          Meal: string
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
        AirlinePNR?: string
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
        StopPoint?: string
        StopPointArrivalTime?: string | null
        StopPointDepartureTime?: string | null
        Craft?: string
        IsETicketEligible: boolean
        FlightStatus: string
        Status: string
      }>
      FareRules?: Array<{
        Origin: string
        Destination: string
        Airline: string
        FareBasisCode: string
        FareRuleDetail: string
        FareRestriction: string
      }>
      Status: number
      InvoiceNo?: string
      InvoiceCreatedOn?: string
      ResponseStatus?: number
      TraceId?: string
    }
  }
}

export class BookingDetailsService {
  private static getEndUserIp(): string {
    // In a real application, you might want to get the actual IP
    // For now, we'll use a placeholder
    return "192.168.1.1"
  }

  public static async getBookingDetailsById(tokenId: string, bookingId: string): Promise<GetBookingDetailsResponse> {
    try {
      const request: GetBookingDetailsByIdRequest = {
        EndUserIp: this.getEndUserIp(),
        TokenId: tokenId,
        BookingId: bookingId,
      }

      const response = await axios.post(`${process.env.API_BASE_URL || ""}/api/air/getBookingDetails`, request)

      return response.data
    } catch (error) {
      console.error("Error fetching booking details by ID:", error)
      throw error
    }
  }

  public static async getBookingDetailsByPNR(
    tokenId: string,
    pnr: string,
    firstName?: string,
    lastName?: string,
  ): Promise<GetBookingDetailsResponse> {
    try {
      const request: GetBookingDetailsByPNRRequest = {
        EndUserIp: this.getEndUserIp(),
        TokenId: tokenId,
        PNR: pnr,
      }

      if (firstName) {
        request.FirstName = firstName
      }

      if (lastName) {
        request.LastName = lastName
      }

      const response = await axios.post(`${process.env.API_BASE_URL || ""}/api/air/getBookingDetails`, request)

      return response.data
    } catch (error) {
      console.error("Error fetching booking details by PNR:", error)
      throw error
    }
  }

  public static async getBookingDetailsByTraceId(tokenId: string, traceId: string): Promise<GetBookingDetailsResponse> {
    try {
      const request: GetBookingDetailsByTraceIdRequest = {
        EndUserIp: this.getEndUserIp(),
        TokenId: tokenId,
        TraceId: traceId,
      }

      const response = await axios.post(`${process.env.API_BASE_URL || ""}/api/air/getBookingDetails`, request)

      return response.data
    } catch (error) {
      console.error("Error fetching booking details by Trace ID:", error)
      throw error
    }
  }

  public static getBookingStatusDescription(status: number): string {
    switch (status) {
      case 1:
        return "Pending"
      case 2:
        return "Confirmed"
      case 3:
        return "Cancelled"
      case 4:
        return "Failed"
      case 5:
        return "Completed"
      case 6:
        return "Rejected"
      case 7:
        return "Refunded"
      case 8:
        return "Partially Refunded"
      default:
        return "Unknown"
    }
  }
}
