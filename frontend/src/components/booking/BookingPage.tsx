"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Check } from 'lucide-react'
import { format, isValid, parseISO } from "date-fns"
import { Header } from "./BookingHeader"
import { AirlineLogo } from "../common/AirlineLogo"
import FareRules from "./FareRules"
import SSROptions from "./ssrOptions"
import RefundableBookingOption from "./Pricing/RefundableBookingOptions"
import { RefundShieldService } from "../../services/refundShieldService"
import { EcomPaymentService } from "../../services/ecomPaymentServices"
import { preparePassengerData, handleBookingProcess } from "../../services/bookingService"
import { handleTicketingProcess } from "../../services/ticketService"

const DEBUG = false // Set to true to enable debug logs

interface BookingPageProps {
  flight?: {
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
    }
    IsLCC?: boolean
    SelectedFare?: {
      name: string
      benefits: {
        priorityCheckIn: boolean
        priorityBoarding: boolean
        extraBaggage: string
        expressCheckIn: boolean
      }
      baggage: {
        cabinBaggage: string
        checkInBaggage: string
      }
      flexibility: {
        cancellationFee: string
        dateChangeFee: string
      }
      seats: {
        free: boolean
        complimentaryMeals: boolean
      }
    }
  }
}

const parseDateString = (dateStr: string) => {
  try {
    // First try direct ISO parsing
    let date = parseISO(dateStr)

    // If invalid, try parsing dd/MM/yyyy, HH:mm format
    if (!isValid(date)) {
      const [datePart, timePart] = dateStr.split(", ")
      if (datePart && timePart) {
        const [day, month, year] = datePart.split("/")
        const [hours, minutes] = timePart.split(":")
        date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(hours), Number(minutes))
      }
    }

    // If still invalid, return current date as fallback
    if (!isValid(date)) {
      console.warn(`Invalid date string: ${dateStr}, using current date as fallback`)
      return new Date()
    }

    return date
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error)
    return new Date()
  }
}

const addDatePickerStyles = () => {
  const style = document.createElement("style")
  style.textContent = `
.air-datepicker-cell.-disabled- {
  color: #ccc !important;
  cursor: not-allowed !important;
  background-color: #f5f5f5 !important;
}
`
  document.head.appendChild(style)
}

const BookingPage: React.FC<BookingPageProps> = () => {
  const location = useLocation()
  const navigate = useNavigate()

  if (DEBUG) {
    console.log("BookingPage initial location.state:", location.state) // DEBUG LOG
  }

  const [searchParams, setSearchParams] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [flight, setFlight] = useState<BookingPageProps["flight"] | null>(null)
  // Add these new state variables inside the BookingPage component
  const [isMultiCity, setIsMultiCity] = useState(false)
  const [multiCityFlights, setMultiCityFlights] = useState<BookingPageProps["flight"][] | null>(null)
  const [returnFlight, setReturnFlight] = useState<BookingPageProps["flight"] | null>(null)
  const [isRoundTrip, setIsRoundTrip] = useState(false)
  const [totalPrice, setTotalPrice] = useState<number | null>(null)
  const [previousFare, setPreviousFare] = useState<number | null>(null)
  const [updatedFare, setUpdatedFare] = useState<number | null>(null)
  const [showAlert, setShowAlert] = useState(true)
  const [selectedFare, setSelectedFare] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: "",
    mobile: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "", // Add this line
    receiveOffers: true,
    promoCode: "",
  })

  // Add validation info state from FareQuote
  const [validationInfo, setValidationInfo] = useState({
    isGSTMandatory: false,
    isPanRequiredAtBook: false,
    isPanRequiredAtTicket: false,
    isPassportRequiredAtBook: false,
    isPassportRequiredAtTicket: false,
    isHoldAllowed: false,
    isRefundable: true,
  })

  const [bookingOptions, setBookingOptions] = useState({
    fareType: "refundable", // or "non-refundable"
    seatSelection: false,
    useGST: false,
    gstNumber: "",
  })

  // Add a new state variable for tracking which flight's fare rules to show
  const [activeFareRulesFlight, setActiveFareRulesFlight] = useState<"outbound" | "return">("outbound")

  // Add state for SSR options
  const [selectedSSROptions, setSelectedSSROptions] = useState<any>({
    outbound: {},
    return: {},
  })
  const [ssrTotalPrice, setSSRTotalPrice] = useState<{
    outbound: number
    return: number
    total: number
  }>({
    outbound: 0,
    return: 0,
    total: 0,
  })
  const [showSSROptions, setShowSSROptions] = useState<boolean>(false)

  const [showFlightDetails, setShowFlightDetails] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFareRulesModal, setShowFareRulesModal] = useState(false)

  // New state for refundable booking
  const [isRefundableSelected, setIsRefundableSelected] = useState(false)
  const [refundablePrice, setRefundablePrice] = useState(0)

  // New state for EMI payment
  const [isEMISelected, setIsEMISelected] = useState(false)
  const [showEMIForm, setShowEMIForm] = useState(false)
  const [emiProcessing, setEmiProcessing] = useState(false)
  const [emiResponse, setEmiResponse] = useState<any>(null)

  // Update the useEffect that loads flight data
  useEffect(() => {
    try {
      if (location.state) {
        const flightData = location.state.flight || null
        const returnFlightData = location.state.returnFlight || null
        const multiCityFlightsData = location.state.multiCityFlights || null
        const isRoundTripBooking = location.state.isRoundTrip || false
        const isMultiCityBooking = location.state.isMultiCity || false
        const combinedPrice = location.state.totalPrice || null
        const prevFare = location.state.previousFare || null
        const updFare = location.state.updatedFare || null
        const showAlertFlag = location.state.showAlert || false
        const validationInfoData = location.state.validationInfo || null
        const tokenIdData = location.state?.tokenId || localStorage.getItem("tokenId") || ""
        const traceIdData = location.state?.traceId || localStorage.getItem("traceId") || ""
        const resultIndexData = location.state?.resultIndex || ""
        const selectedFareData = location.state.selectedFare || null

        // Get search params to validate trip type
        const searchParams = location.state.searchParams || JSON.parse(localStorage.getItem("searchParams") || "{}")

        // Only set round-trip if we explicitly have return flight data AND search was for round-trip
        // This is the key change - we're being much more strict about when to show round-trip UI
        const actuallyRoundTrip = Boolean(
          isRoundTripBooking &&
            returnFlightData &&
            searchParams?.tripType === "round-trip" &&
            // Add this additional check to ensure we're not accidentally showing return data
            location.state?.isRoundTrip === true,
        )

        const actuallyMultiCity = Boolean(
          isMultiCityBooking && multiCityFlightsData && searchParams?.tripType === "multi-city",
        )

        if (DEBUG) {
          console.log("BookingPage validation:", {
            searchTripType: searchParams?.tripType,
            hasReturnFlight: !!returnFlightData,
            hasMultiCityFlights: !!multiCityFlightsData,
            isRoundTripFromState: location.state?.isRoundTrip,
            actuallyRoundTrip,
            actuallyMultiCity,
          })
        }

        setFlight(flightData)
        setReturnFlight(actuallyRoundTrip ? returnFlightData : null)
        setMultiCityFlights(actuallyMultiCity ? multiCityFlightsData : null)
        setIsRoundTrip(actuallyRoundTrip)
        setIsMultiCity(actuallyMultiCity)
        setTotalPrice(combinedPrice)
        setPreviousFare(prevFare)
        setUpdatedFare(updFare)
        setShowAlert(showAlertFlag)
        setSelectedFare(selectedFareData)

        // Set validation info if available
        if (validationInfoData) {
          setValidationInfo(validationInfoData)
        }

        if (DEBUG) {
          console.log("BookingPage final state:", {
            isRoundTrip: actuallyRoundTrip,
            isMultiCity: actuallyMultiCity,
            hasReturnFlight: !!returnFlightData,
            searchTripType: searchParams?.tripType,
          })
        }
      }
    } catch (err) {
      console.error("Error loading flight data:", err)
      setError("Failed to load flight details")
    } finally {
      setIsLoading(false)
    }
  }, [location.state])

  const handleContinueBooking = () => {
    setShowAlert(false)
  }

  const handleGoBack = () => {
    navigate("/search-results")
  }

  // Update the useEffect that loads from localStorage
  useEffect(() => {
    try {
      const storedSearchParams = localStorage.getItem("searchParams")
      const storedSessionId = localStorage.getItem("sessionId")
      const storedFlight = localStorage.getItem("selectedFlight")
      const storedReturnFlight = localStorage.getItem("selectedReturnFlight")

      // Parse search params to check trip type
      const parsedSearchParams = storedSearchParams ? JSON.parse(storedSearchParams) : {}
      const isTripTypeRoundTrip = parsedSearchParams?.tripType === "round-trip"

      const newSearchParams =
        location.state?.searchParams || (storedSearchParams ? JSON.parse(storedSearchParams) : null)
      const newSessionId = location.state?.sessionId || storedSessionId
      const newFlight = location.state?.flight || (storedFlight ? JSON.parse(storedFlight) : null)
      const newReturnFlight =
        location.state?.returnFlight || (storedReturnFlight ? JSON.parse(storedReturnFlight) : null)

      setSearchParams(newSearchParams)
      setSessionId(newSessionId)

      if (newFlight) {
        setFlight(newFlight)
      }

      // Only set return flight if we have both the flight data AND the trip type is round-trip AND it's explicitly a round-trip booking
      if (newReturnFlight && isTripTypeRoundTrip && location.state?.isRoundTrip === true) {
        setReturnFlight(newReturnFlight)
        setIsRoundTrip(true)
        if (DEBUG) {
          console.log("BookingPage: Setting return flight for round-trip")
        }
      } else {
        // Explicitly set these to null/false for one-way trips
        setReturnFlight(null)
        setIsRoundTrip(false)
        if (DEBUG) {
          console.log("BookingPage: Clearing return flight data - not a round-trip")
        }
      }

      if (newFlight && newReturnFlight && isTripTypeRoundTrip) {
        // Calculate total price for round trip
        const outboundPrice = Number(newFlight.OptionPriceInfo?.TotalPrice || 0)
        const returnPrice = Number(newReturnFlight.OptionPriceInfo?.TotalPrice || 0)
        setTotalPrice(outboundPrice + returnPrice)
      }
    } catch (err) {
      console.error("Error loading from localStorage:", err)
    }
  }, [location.state])

  useEffect(() => {
    if (flight && flight.OptionSegmentsInfo && flight.OptionSegmentsInfo.length > 0) {
      if (DEBUG) {
        console.log("Flight departure time:", flight.OptionSegmentsInfo[0].DepartureTime)
        console.log("Flight arrival time:", flight.OptionSegmentsInfo[0].ArrivalTime)
        console.log("Parsed departure time:", parseDateString(flight.OptionSegmentsInfo[0].DepartureTime))
        console.log("Parsed arrival time:", parseDateString(flight.OptionSegmentsInfo[0].ArrivalTime))
      }
    }
  }, [flight])

  useEffect(() => {
    addDatePickerStyles()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setBookingOptions((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  // Handle SSR option selection
  const handleSSRSelect = useCallback((selectedOptions: any, totalPrice: number) => {
    setSelectedSSROptions({ outbound: selectedOptions, return: {} })
    setSSRTotalPrice({ outbound: totalPrice, return: 0, total: totalPrice })
  }, [])

  // Handle refundable booking selection
  const handleRefundableSelect = (isSelected: boolean, price: number) => {
    setIsRefundableSelected(isSelected)
    setRefundablePrice(price)
  }

  // Handle EMI payment selection
  const handleEMISelect = (isSelected: boolean) => {
    setIsEMISelected(isSelected)
    setShowEMIForm(isSelected)
  }

  // Process EMI payment
  const handleProcessEMIPayment = async (
    cardNumber: string,
    mobileNumber: string,
    tenure: string,
    schemeId: string,
  ) => {
    if (!flight) return

    setEmiProcessing(true)

    try {
      // Create request for OTP API
      const requestId = EcomPaymentService.generateRequestId()
      const orderNo = `FARECLUBS_${Date.now()}`
      const totalAmount = totalPrice || Number(flight.OptionPriceInfo?.TotalPrice || 0)

      const otpRequest = {
        DEALERID: process.env.ECOM_DEALER_ID || "194",
        VALIDATIONKEY: process.env.ECOM_VALIDATION_KEY || "6384075253966928",
        REQUESTID: requestId,
        CARDNUMBER: cardNumber,
        MOBILENO: mobileNumber,
        ORDERNO: orderNo,
        LOANAMT: totalAmount.toFixed(2),
        Tenure: tenure,
        SchemeId: schemeId,
        IPADDR: "192.168.1.1", // This should be dynamically determined in production
        PIN: "411014", // This should be the delivery pincode
        PRODDESC: "Flight Booking",
        REQUEST_DATE_TIME: EcomPaymentService.formatDateTime(),
        RETURNURL: `${window.location.origin}/booking/emi-callback`,
      }

      // Call OTP API
      const response = await EcomPaymentService.initiateOTP(otpRequest)
      setEmiResponse(response)

      // If successful, open KFS URL in a new window
      if (response.RSPCODE === "0" || response.RSPCODE === "00") {
        window.open(response.KFSURL, "_blank")

        // After 5 minutes, check the status using Re-Query API
        setTimeout(async () => {
          const reQueryRequest = {
            DEALERID: process.env.ECOM_DEALER_ID || "194",
            REQID: EcomPaymentService.generateRequestId(),
            VALKEY: process.env.ECOM_VALIDATION_KEY || "6384075253966928",
            REQUERYID: requestId,
            ACQCHNLID: "05",
          }

          const reQueryResponse = await EcomPaymentService.reQuery(reQueryRequest)

          // Process re-query response
          if (reQueryResponse.RESCODE === "0" || reQueryResponse.RESCODE === "00") {
            const transactionStatus = reQueryResponse.ENQINFO[0]?.RSPCODE
            if (transactionStatus === "0" || transactionStatus === "00") {
              // Transaction successful
              alert("EMI payment successful!")
            } else {
              // Transaction failed
              alert("EMI payment failed. Please try again.")
            }
          } else {
            // Re-query failed
            alert("Failed to check payment status. Please contact support.")
          }
        }, 300000) // 5 minutes
      } else {
        // OTP initiation failed
        alert(`Failed to initiate EMI payment: ${response.RESPDESC}`)
      }
    } catch (error) {
      console.error("Error processing EMI payment:", error)
      alert("An error occurred while processing your EMI payment. Please try again.")
    } finally {
      setEmiProcessing(false)
    }
  }

  // Add a retry mechanism for API calls
  const retryApiCall = async <T,>(apiCall: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
    let lastError

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (DEBUG) {
          console.log(`API call attempt ${attempt}/${maxRetries}`)
        }
        const result = await apiCall()
        return result
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error)
        lastError = error

        if (attempt < maxRetries) {
          if (DEBUG) {
            console.log(`Retrying in ${delay}ms...`)
          }
          await new Promise((resolve) => setTimeout(resolve, delay))
          // Increase delay for next retry (exponential backoff)
          delay *= 2
        }
      }
    }

    throw lastError
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!flight || !flight.OptionSegmentsInfo || flight.OptionSegmentsInfo.length === 0 || !flight.OptionPriceInfo) {
      setError("Flight details not available. Please try again.")
      return
    }

    try {
      // Basic validation
      if (
        !formData.email ||
        !formData.mobile ||
        !formData.firstName ||
        !formData.lastName ||
        !formData.gender ||
        !formData.dateOfBirth
      ) {
        setError("Please fill in all required fields.")
        return
      }

      setIsLoading(true)
      setError(null) // Clear any previous errors

      // Calculate total amount including all options
      const baseAmount = totalPrice || Number(flight.OptionPriceInfo.TotalPrice || 0)
      const totalAmount = baseAmount + ssrTotalPrice.total + (isRefundableSelected ? refundablePrice : 0)

      // If refundable booking is selected, report to Refund Shield
      if (isRefundableSelected) {
        try {
          // Make sure flight data is available with proper null checks
          const departureDate = parseDateString(flight.OptionSegmentsInfo[0].DepartureTime)

          // Create products array for Refund Shield with proper null checks
          const products = []

          // Add main flight with proper null checks
          products.push({
            product_type: "TKT",
            title: `Flight ${flight.OptionSegmentsInfo[0].MarketingAirline} ${flight.OptionSegmentsInfo[0].FlightNumber}`,
            price: Number(flight.OptionPriceInfo.TotalPrice),
          })

          // Add return flight if round trip with proper null checks
          if (
            isRoundTrip &&
            returnFlight &&
            returnFlight.OptionSegmentsInfo &&
            returnFlight.OptionSegmentsInfo.length > 0 &&
            returnFlight.OptionPriceInfo
          ) {
            products.push({
              product_type: "TKT",
              title: `Return Flight ${returnFlight.OptionSegmentsInfo[0].MarketingAirline} ${returnFlight.OptionSegmentsInfo[0].FlightNumber}`,
              price: Number(returnFlight.OptionPriceInfo.TotalPrice),
            })
          }

          // Add SSR options if any
          if (ssrTotalPrice.total > 0) {
            products.push({
              product_type: "TKT",
              title: "Additional Services",
              price: ssrTotalPrice.total,
            })
          }

          // Create the refund shield request with the API key
          const refundShieldRequest = {
            apikey:
              process.env.REACT_APP_REFUND_SHIELD_API_KEY ||
              process.env.REFUND_SHIELD_API_KEY ||
              "d4fe14939b4a5653444bc8975d457630", // Include apikey to satisfy TypeScript
            cid: `FARECLUBS_${Date.now()}`,
            cname: formData.firstName,
            csurname: formData.lastName,
            booking_paid_in_full: true,
            booking_is_refundable: true,
            booking_payment_value: baseAmount,
            booking_quantity: 1,
            booking_total_transaction_value: totalAmount,
            booking_type: "TKT",
            booking_name: `Flight ${flight.OptionSegmentsInfo[0].MarketingAirline} ${flight.OptionSegmentsInfo[0].FlightNumber}`,
            booking_reference: `FARECLUBS_${Date.now()}`,
            currency_code: "INR",
            language_code: "EN",
            date_of_purchase: new Date().toISOString(),
            start_date_of_event: departureDate.toISOString(),
            products: products,
          }

          try {
            if (DEBUG) {
              console.log("Sending request to Refund Shield")
            }
            const refundShieldResponse = await RefundShieldService.reportSale(refundShieldRequest)

            if (!refundShieldResponse.success) {
              console.error("Failed to report sale to Refund Shield:", refundShieldResponse.error)
              // Continue with booking even if Refund Shield fails
            } else {
              if (DEBUG) {
                console.log("Successfully reported sale to Refund Shield")
              }
            }
          } catch (refundError) {
            console.error("Error reporting to Refund Shield:", refundError)
            // Continue with booking even if Refund Shield fails
          }
        } catch (refundShieldError) {
          console.error("Error setting up Refund Shield request:", refundShieldError)
          // Continue with booking even if Refund Shield setup fails
        }
      }

      // Prepare passenger data for booking
      const passengerData = preparePassengerData(
        {
          title: "Mr",
          firstName: formData.firstName,
          lastName: formData.lastName,
          gender: formData.gender,
          mobile: formData.mobile,
          email: formData.email,
          dateOfBirth: formData.dateOfBirth, // Add this line
          addressLine1: "123 Main St", // Default address
          city: "Mumbai", // Default city
          countryCode: "IN", // Default country code
          nationality: "IN", // Default nationality
          gstNumber: bookingOptions.useGST ? bookingOptions.gstNumber : undefined,
        },
        flight.OptionPriceInfo,
      )

      // Get the TokenId and TraceId from localStorage or state
      const tokenId = location.state?.tokenId || localStorage.getItem("tokenId") || ""
      const traceId = location.state?.traceId || localStorage.getItem("traceId") || ""

      // Handle ResultIndex properly for round-trip vs one-way
      let resultIndex = ""
      if (isRoundTrip) {
        // For round-trip, we need to handle both outbound and return flights
        const outboundResultIndex = location.state?.outboundResultIndex || ""
        const returnResultIndex = location.state?.returnResultIndex || ""

        // For domestic round-trip, book each segment separately
        // For now, let's start with the outbound flight
        resultIndex = outboundResultIndex
      } else {
        // For one-way flights, use the flight's ResultIndex
        resultIndex = location.state?.resultIndex || flight?.SearchSegmentId?.toString() || ""
      }

      if (DEBUG) {
        console.log("Using ResultIndex for booking:", resultIndex)
      }

      // Create booking request
      const bookingRequest = {
        EndUserIp: "192.168.10.10", // This should be dynamically determined in production
        TokenId: tokenId,
        TraceId: traceId,
        ResultIndex: resultIndex,
        Passengers: [passengerData],
      }

      // Process booking or ticketing based on whether it's an LCC flight
      try {
        // Check if it's an LCC flight
        const isLCC = flight?.IsLCC || false

        if (isLCC) {
          if (DEBUG) {
            console.log("This is an LCC flight. Proceeding directly to ticketing...")
          }

          if (isRoundTrip) {
            if (DEBUG) {
              console.log("Processing round-trip LCC booking...")
            }

            // For round-trip LCC, we need to book both flights
            // According to API docs, for domestic round-trip, book each segment separately
            const outboundResultIndex = location.state?.outboundResultIndex || ""
            const returnResultIndex = location.state?.returnResultIndex || ""

            if (!outboundResultIndex || !returnResultIndex) {
              setError("Missing flight information for round-trip booking")
              return
            }

            // First, book the outbound flight
            if (DEBUG) {
              console.log("Booking outbound flight with ResultIndex:", outboundResultIndex)
            }

            const outboundPassengerData = [
              {
                Title: "Mr",
                FirstName: formData.firstName,
                LastName: formData.lastName,
                PaxType: 1,
                DateOfBirth: formData.dateOfBirth
                  ? new Date(formData.dateOfBirth).toISOString()
                  : new Date(new Date().setFullYear(new Date().getFullYear() - 20)).toISOString(),
                Gender: formData.gender === "female" ? 2 : 1,
                AddressLine1: "123 Main St",
                AddressLine2: "",
                City: "Mumbai",
                CountryCode: "IN",
                CountryName: "India",
                ContactNo: formData.mobile,
                Email: formData.email,
                IsLeadPax: true,
                Fare: {
                  BaseFare: Number(flight.OptionPriceInfo.TotalBasePrice || 0),
                  Tax: Number(flight.OptionPriceInfo.TotalTax || 0),
                  YQTax: 0,
                  AdditionalTxnFeePub: 0,
                  AdditionalTxnFeeOfrd: 0,
                  OtherCharges: 0,
                },
                Nationality: "IN",
              },
            ]

            if (DEBUG) {
              console.log("LCC Round-Trip Outbound - Attempting Ticketing with:", {
                tokenId,
                traceId,
                outboundResultIndex,
                isLCCFlight: flight?.IsLCC,
                passengerData: outboundPassengerData,
                rawLocationState: location.state,
                localStorageTokenId: localStorage.getItem("tokenId"),
                localStorageTraceId: localStorage.getItem("traceId"),
              })
            }

            try {
              // Book outbound flight
              const outboundTicketResponse = await handleTicketingProcess(
                0,
                "",
                tokenId,
                traceId,
                true,
                outboundResultIndex,
                outboundPassengerData,
              )

              if (outboundTicketResponse.Response?.Response?.Status === 1) {
                if (DEBUG) {
                  console.log("Outbound flight booked successfully")
                }

                // Now book the return flight
                if (DEBUG) {
                  console.log("Booking return flight with ResultIndex:", returnResultIndex)
                }

                const returnPassengerData = [
                  {
                    ...outboundPassengerData[0],
                    Fare: {
                      BaseFare: Number(returnFlight?.OptionPriceInfo?.TotalBasePrice || 0),
                      Tax: Number(returnFlight?.OptionPriceInfo?.TotalTax || 0),
                      YQTax: 0,
                      AdditionalTxnFeePub: 0,
                      AdditionalTxnFeeOfrd: 0,
                      OtherCharges: 0,
                    },
                  },
                ]

                if (DEBUG) {
                  console.log("LCC Round-Trip Return - Attempting Ticketing with:", {
                    tokenId,
                    traceId,
                    returnResultIndex,
                    isLCCFlight: returnFlight?.IsLCC,
                    passengerData: returnPassengerData,
                    rawLocationState: location.state,
                    localStorageTokenId: localStorage.getItem("tokenId"),
                    localStorageTraceId: localStorage.getItem("traceId"),
                  })
                }

                const returnTicketResponse = await handleTicketingProcess(
                  0,
                  "",
                  tokenId,
                  traceId,
                  true,
                  returnResultIndex,
                  returnPassengerData,
                )

                if (returnTicketResponse.Response?.Response?.Status === 1) {
                  if (DEBUG) {
                    console.log("Return flight booked successfully")
                  }

                  // Navigate to confirmation with both bookings
                  navigate("/booking/confirmation", {
                    state: {
                      bookingReference: outboundTicketResponse.Response?.Response?.FlightItinerary?.PNR,
                      returnBookingReference: returnTicketResponse.Response?.Response?.FlightItinerary?.PNR,
                      bookingId: outboundTicketResponse.Response?.Response?.FlightItinerary?.BookingId,
                      returnBookingId: returnTicketResponse.Response?.Response?.FlightItinerary?.BookingId,
                      totalAmount,
                      flight,
                      returnFlight,
                      isRoundTrip: true,
                      isRefundableSelected,
                      refundablePrice,
                      ssrOptions: selectedSSROptions,
                      ssrTotalPrice,
                      customerDetails: formData,
                      outboundTicketResponse,
                      returnTicketResponse,
                    },
                  })
                } else {
                  setError(
                    `Return flight booking failed: ${returnTicketResponse.Error?.ErrorMessage || "Unknown error"}`,
                  )
                }
              } else {
                setError(
                  `Outbound flight booking failed: ${outboundTicketResponse.Error?.ErrorMessage || "Unknown error"}`,
                )
              }
            } catch (err) {
              console.error("Error during round-trip LCC booking:", err)
              setError(`Round-trip booking failed: ${err instanceof Error ? err.message : "Unknown error"}`)
            }
          } else {
            // Single flight LCC booking (existing logic)
            const formattedPassengerData = [
              {
                Title: "Mr",
                FirstName: formData.firstName,
                LastName: formData.lastName,
                PaxType: 1,
                DateOfBirth: formData.dateOfBirth
                  ? new Date(formData.dateOfBirth).toISOString()
                  : new Date(new Date().setFullYear(new Date().getFullYear() - 20)).toISOString(),
                Gender: formData.gender === "female" ? 2 : 1,
                AddressLine1: "123 Main St",
                AddressLine2: "",
                City: "Mumbai",
                CountryCode: "IN",
                CountryName: "India",
                ContactNo: formData.mobile,
                Email: formData.email,
                IsLeadPax: true,
                Fare: {
                  BaseFare: Number(flight.OptionPriceInfo.TotalBasePrice || 0),
                  Tax: Number(flight.OptionPriceInfo.TotalTax || 0),
                  YQTax: 0,
                  AdditionalTxnFeePub: 0,
                  AdditionalTxnFeeOfrd: 0,
                  OtherCharges: 0,
                },
                Nationality: "IN",
              },
            ]

            if (DEBUG) {
              console.log("LCC flight detected. ResultIndex:", resultIndex)
              console.log("Formatted passenger data:", JSON.stringify(formattedPassengerData, null, 2))
            }

            if (DEBUG) {
              console.log("LCC Single Flight - Attempting Ticketing with:", {
                tokenId,
                traceId,
                resultIndex,
                isLCCFlight: flight?.IsLCC,
                passengerData: formattedPassengerData,
                rawLocationState: location.state,
                localStorageTokenId: localStorage.getItem("tokenId"),
                localStorageTraceId: localStorage.getItem("traceId"),
              })
            }

            try {
              const ticketResponse = await handleTicketingProcess(
                0,
                "",
                tokenId,
                traceId,
                true,
                resultIndex,
                formattedPassengerData,
              )

              if (ticketResponse.Response?.Response?.Status === 1) {
                navigate("/booking/confirmation", {
                  state: {
                    bookingReference: ticketResponse.Response?.Response?.FlightItinerary?.PNR,
                    bookingId: ticketResponse.Response?.Response?.FlightItinerary?.BookingId,
                    ticketId: ticketResponse.Response?.Response?.FlightItinerary?.Passenger?.[0]?.Ticket?.TicketId,
                    totalAmount,
                    flight,
                    returnFlight,
                    isRoundTrip,
                    isRefundableSelected,
                    refundablePrice,
                    ssrOptions: selectedSSROptions,
                    ssrTotalPrice,
                    customerDetails: formData,
                    ticketResponse,
                  },
                })
              } else {
                const errorMessage = ticketResponse.Error?.ErrorMessage || "Unknown error during LCC ticketing"
                console.error("LCC Ticketing failed:", errorMessage, ticketResponse)
                setError(`Ticketing failed: ${errorMessage}`)
              }
            } catch (err) {
              console.error("Error during LCC ticketing:", err)
              let errorMessage = "Failed to process LCC booking"
              if (err instanceof Error) {
                errorMessage += `: ${err.message}`
              }
              setError(errorMessage)
            }
          }
        } else {
          // For non-LCC flights, proceed with the regular booking process
          const bookingResponse = await retryApiCall(() => handleBookingProcess(bookingRequest))

          if (DEBUG) {
            console.log("Booking response received:", bookingResponse)
          }

          // Check if booking was successful
          if (bookingResponse.Response?.Status === 1) {
            // If it's a non-LCC flight, we need to issue a ticket
            if (bookingResponse.Response.FlightItinerary && !bookingResponse.Response.FlightItinerary.IsLCC) {
              try {
                // Issue ticket
                const ticketResponse = await handleTicketingProcess(
                  bookingResponse.Response.BookingId,
                  bookingResponse.Response.PNR,
                  tokenId,
                  traceId,
                  false, // Add isLCC parameter (false for non-LCC flights)
                )

                // Check if ticketing was successful
                if (ticketResponse.Response?.Response?.Status === 1) {
                  // Navigate to confirmation page with ticket details
                  navigate("/booking/confirmation", {
                    state: {
                      bookingReference: bookingResponse.Response.PNR,
                      bookingId: bookingResponse.Response.BookingId,
                      ticketId: ticketResponse.Response?.Response?.FlightItinerary?.Passenger?.[0]?.Ticket?.TicketId,
                      totalAmount,
                      flight,
                      returnFlight,
                      isRoundTrip,
                      isRefundableSelected,
                      refundablePrice,
                      ssrOptions: selectedSSROptions,
                      ssrTotalPrice,
                      customerDetails: formData,
                      bookingResponse,
                      ticketResponse,
                    },
                  })
                } else {
                  // Ticketing failed
                  setError(`Ticketing failed: ${ticketResponse.Error?.ErrorMessage || "Unknown error"}`)
                }
              } catch (ticketError) {
                console.error("Error issuing ticket:", ticketError)
                setError(`Error issuing ticket: ${(ticketError as Error).message}`)
              }
            } else {
              // For LCC flights, booking is sufficient (no separate ticketing required)
              navigate("/booking/confirmation", {
                state: {
                  bookingReference: bookingResponse.Response.PNR,
                  bookingId: bookingResponse.Response.BookingId,
                  totalAmount,
                  flight,
                  returnFlight,
                  isRoundTrip,
                },
              })
            }
          } else {
            // Booking failed with a known error
            const errorMessage =
              bookingResponse.Error?.ErrorMessage ||
              (bookingResponse.Response ? `Booking status: ${bookingResponse.Response.Status}` : "Unknown error")
            console.error("Booking failed with error:", errorMessage, bookingResponse)
            setError(`Booking failed: ${errorMessage}`)
          }
        }
      } catch (err) {
        console.error("Error submitting booking:", err)

        // Improved error handling with more details
        let errorMessage = "An error occurred while processing your booking"
        if (err instanceof Error) {
          errorMessage += `: ${err.message}`
          console.error("Error stack:", err.stack)
        } else {
          errorMessage += ". Please try again or contact support."
        }

        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    } catch (err) {
      console.error("Error submitting booking:", err)
      setError(`An error occurred while processing your booking: ${(err as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const convenienceFee = 149.0

  const handleBackToResults = () => {
    // Get the stored search parameters and session ID
    let storedSearchParams: string | null = localStorage.getItem("searchParams")
    let storedSessionId: string | null = localStorage.getItem("sessionId")
    const storedTraceId: string | null = localStorage.getItem("traceId")

    // Fallback to flight data if searchParams are missing
    if (!storedSearchParams && flight && flight.OptionSegmentsInfo && flight.OptionSegmentsInfo.length > 0) {
      const defaultSearchParams = {
        from: flight.OptionSegmentsInfo[0].DepartureAirport,
        to: flight.OptionSegmentsInfo[0].ArrivalAirport,
        date: flight.OptionSegmentsInfo[0].DepartureTime.split(",")[0], // Extract date part
        passengers: 1, // Default passenger count
      }
      storedSearchParams = JSON.stringify(defaultSearchParams)
      localStorage.setItem("searchParams", storedSearchParams)
    }

    if (!storedSessionId) {
      storedSessionId = sessionId || "default-session"
      localStorage.setItem("sessionId", storedSessionId)
    }

    // Ensure storedSearchParams is never null before parsing
    const parsedSearchParams = storedSearchParams ? JSON.parse(storedSearchParams) : {}

    navigate("/search-results", {
      state: {
        searchParams: parsedSearchParams,
        sessionId: storedSessionId!,
        traceId: storedTraceId,
        shouldSearch: false, // Important: Don't trigger a new search
        returnFromBooking: true, // Add a flag to indicate we're returning from booking
      },
    })
  }

  // Render validation warnings based on FareQuote response
  const renderValidationWarnings = () => {
    if (!validationInfo) return null

    const warnings = []

    if (validationInfo.isGSTMandatory) {
      warnings.push("GST details are mandatory for this booking.")
    }

    if (validationInfo.isPanRequiredAtBook) {
      warnings.push("PAN card details are required at the time of booking.")
    }

    if (validationInfo.isPassportRequiredAtBook) {
      warnings.push("Passport details are required at the time of booking.")
    }

    if (!validationInfo.isRefundable) {
      warnings.push("This fare is non-refundable.")
    }

    if (warnings.length === 0) return null

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-medium text-yellow-800 mb-2">Important Information</h3>
        <ul className="list-disc pl-5 text-sm text-yellow-700 space-y-1">
          {warnings.map((warning, index) => (
            <li key={index}>{warning}</li>
          ))}
        </ul>
      </div>
    )
  }

  // Update the renderItineraryDetails function to include multi-city trips
  const renderItineraryDetails = () => {
    // Check if we have any flight data to display
    const hasFlightData = flight && flight.OptionSegmentsInfo && flight.OptionSegmentsInfo.length > 0
    const hasReturnFlightData =
      isRoundTrip && returnFlight && returnFlight.OptionSegmentsInfo && returnFlight.OptionSegmentsInfo.length > 0
    const hasMultiCityData = isMultiCity && multiCityFlights && multiCityFlights.length > 0

    if (DEBUG) {
      console.log("renderItineraryDetails validation:", {
        hasFlightData,
        hasReturnFlightData,
        hasMultiCityData,
        isRoundTrip,
        isMultiCity,
      })
    }

    if (!hasFlightData && !hasMultiCityData) {
      return (
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="text-center py-8">
            <p className="text-gray-500">No flight details available to display</p>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Itinerary Details</h2>
          <button
            onClick={() => setShowFlightDetails(!showFlightDetails)}
            className="px-4 py-2 bg-[#007AFF] text-white rounded-md hover:bg-[#007aff]"
          >
            {showFlightDetails ? "Hide Detail" : "Flight Detail"}
          </button>
        </div>
        <div className="flex justify-end mb-6">
          {isRoundTrip ? (
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowFareRulesModal(true)
                  setActiveFareRulesFlight("outbound")
                }}
                className="px-4 py-2 border border-[#007AFF] text-[#007AFF] rounded-md hover:bg-blue-50"
              >
                View Outbound Fare Rules
              </button>
              <button
                onClick={() => {
                  setShowFareRulesModal(true)
                  setActiveFareRulesFlight("return")
                }}
                className="px-4 py-2 border border-[#007AFF] text-[#007AFF] rounded-md hover:bg-blue-50"
              >
                View Return Fare Rules
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowFareRulesModal(true)}
              className="px-4 py-2 border border-[#007AFF] text-[#007AFF] rounded-md hover:bg-blue-50"
            >
              View Fare Rules
            </button>
          )}
        </div>
        {/* Display validation warnings */}
        {renderValidationWarnings()}
        {/* Display error message if any */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-red-800 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Error
            </h3>
            <p className="text-sm text-red-700">{error}</p>
            <div className="mt-3">
              <button onClick={() => setError(null)} className="text-sm text-red-600 hover:text-red-800 font-medium">
                Dismiss
              </button>
              <button
                onClick={handleSubmit}
                className="ml-4 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {showFlightDetails ? (
          <div className="space-y-6">
            {/* Multi-city Flights */}
            {isMultiCity &&
              multiCityFlights &&
              multiCityFlights.map((segmentFlight, index) => {
                // Skip rendering if segment flight or its required properties are missing
                if (!segmentFlight || !segmentFlight.OptionSegmentsInfo || !segmentFlight.OptionSegmentsInfo[0]) {
                  return null
                }

                return (
                  <React.Fragment key={index}>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="bg-[#007aff] rounded-full p-2">
                        <svg
                          className="w-5 h-5 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">
                          Segment {index + 1} :{" "}
                          {format(
                            parseDateString(segmentFlight.OptionSegmentsInfo[0].DepartureTime),
                            "EEE, dd MMM yyyy",
                          )}
                        </div>
                        <div className="text-gray-600">
                          {segmentFlight.OptionSegmentsInfo[0].DepartureAirport} -{" "}
                          {segmentFlight.OptionSegmentsInfo[0].ArrivalAirport}
                        </div>
                      </div>
                    </div>

                    {/* Flight Info Card */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded border flex items-center justify-center">
                            <AirlineLogo airline={segmentFlight.OptionSegmentsInfo[0].MarketingAirline} size="md" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {segmentFlight.OptionSegmentsInfo[0].MarketingAirline},{" "}
                              {segmentFlight.OptionSegmentsInfo[0].FlightNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              <svg
                                className="w-4 h-4 inline-block mr-1"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M20 8h-9m9 4h-9m9 4h-9M4 8h1m-1 4h1m-1 4h1" />
                              </svg>
                              15 Kg Check-in, 7 KG handbag
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="relative mt-6">
                        {/* Flight Route Line */}
                        <div className="flex items-center justify-between">
                          {/* Departure Details */}
                          <div className="flex-1">
                            <div className="text-3xl font-bold mb-1">
                              {format(parseDateString(segmentFlight.OptionSegmentsInfo[0].DepartureTime), "HH:mm")}
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium">{segmentFlight.OptionSegmentsInfo[0].DepartureAirport}</div>
                              <div className="text-sm text-gray-600">Terminal - 1</div>
                            </div>
                          </div>

                          {/* Middle Section with Airline Info */}
                          <div className="flex-1 px-8">
                            <div className="flex items-center justify-center mb-2">
                              <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                                <AirlineLogo airline={segmentFlight.OptionSegmentsInfo[0].MarketingAirline} size="md" />
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-sm">
                                {segmentFlight.OptionSegmentsInfo[0].MarketingAirline},{" "}
                                {segmentFlight.OptionSegmentsInfo[0].FlightNumber}
                              </div>
                            </div>
                          </div>

                          {/* Arrival Details */}
                          <div className="flex-1 text-right">
                            <div className="text-3xl font-bold mb-1">
                              {format(parseDateString(segmentFlight.OptionSegmentsInfo[0].ArrivalTime), "HH:mm")}
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium">{segmentFlight.OptionSegmentsInfo[0].ArrivalAirport}</div>
                              <div className="text-sm text-gray-600">Terminal - 1</div>
                            </div>
                          </div>
                        </div>

                        {/* Duration and Class Info */}
                        <div className="absolute right-0 top-0 -mt-6 flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                            </svg>
                            Economy
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                )
              })}

            {/* Outbound Flight (if not multi-city) */}
            {!isMultiCity && flight && flight.OptionSegmentsInfo && flight.OptionSegmentsInfo.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <div className="bg-[#007aff] rounded-full p-2">
                    <svg
                      className="w-5 h-5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">
                      Outbound Flight :{" "}
                      {format(parseDateString(flight.OptionSegmentsInfo[0].DepartureTime), "EEE, dd MMM yyyy")}
                    </div>
                    <div className="text-gray-600">
                      {flight.OptionSegmentsInfo[0].DepartureAirport} - {flight.OptionSegmentsInfo[0].ArrivalAirport}
                    </div>
                  </div>
                </div>

                {/* Outbound Flight Info Card */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded border flex items-center justify-center">
                        <AirlineLogo airline={flight.OptionSegmentsInfo[0].MarketingAirline} size="md" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {flight.OptionSegmentsInfo[0].MarketingAirline}, {flight.OptionSegmentsInfo[0].FlightNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          <svg
                            className="w-4 h-4 inline-block mr-1"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M20 8h-9m9 4h-9m9 4h-9M4 8h1m-1 4h1m-1 4h1" />
                          </svg>
                          15 Kg Check-in, 7 KG handbag
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="relative mt-6">
                    {/* Flight Route Line */}
                    <div className="flex items-center justify-between">
                      {/* Departure Details */}
                      <div className="flex-1">
                        <div className="text-3xl font-bold mb-1">
                          {format(parseDateString(flight.OptionSegmentsInfo[0].DepartureTime), "HH:mm")}
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium">{flight.OptionSegmentsInfo[0].DepartureAirport}</div>
                          <div className="text-sm text-gray-600">Terminal - 1</div>
                        </div>
                      </div>

                      {/* Middle Section with Airline Info */}
                      <div className="flex-1 px-8">
                        <div className="flex items-center justify-center mb-2">
                          <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                            <AirlineLogo airline={flight.OptionSegmentsInfo[0].MarketingAirline} size="md" />
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-sm">
                            {flight.OptionSegmentsInfo[0].MarketingAirline}, {flight.OptionSegmentsInfo[0].FlightNumber}
                          </div>
                        </div>
                      </div>

                      {/* Arrival Details */}
                      <div className="flex-1 text-right">
                        <div className="text-3xl font-bold mb-1">
                          {format(parseDateString(flight.OptionSegmentsInfo[0].ArrivalTime), "HH:mm")}
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium">{flight.OptionSegmentsInfo[0].ArrivalAirport}</div>
                          <div className="text-sm text-gray-600">Terminal - 1</div>
                        </div>
                      </div>
                    </div>

                    {/* Duration and Class Info */}
                    <div className="absolute right-0 top-0 -mt-6 flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        </svg>
                        Economy
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Return Flight (if round trip) */}
            {isRoundTrip &&
              returnFlight &&
              returnFlight.OptionSegmentsInfo &&
              returnFlight.OptionSegmentsInfo.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-sm mt-6">
                    <div className="bg-[#eb0066] rounded-full p-2">
                      <svg
                        className="w-5 h-5 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium">
                        Return Flight :{" "}
                        {format(parseDateString(returnFlight.OptionSegmentsInfo[0].DepartureTime), "EEE, dd MMM yyyy")}
                      </div>
                      <div className="text-gray-600">
                        {returnFlight.OptionSegmentsInfo[0].DepartureAirport} -{" "}
                        {returnFlight.OptionSegmentsInfo[0].ArrivalAirport}
                      </div>
                    </div>
                  </div>

                  {/* Return Flight Info Card */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded border flex items-center justify-center">
                          <AirlineLogo airline={returnFlight.OptionSegmentsInfo[0].MarketingAirline} size="md" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {returnFlight.OptionSegmentsInfo[0].MarketingAirline},{" "}
                            {returnFlight.OptionSegmentsInfo[0].FlightNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            <svg
                              className="w-4 h-4 inline-block mr-1"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M20 8h-9m9 4h-9m9 4h-9M4 8h1m-1 4h1m-1 4h1" />
                            </svg>
                            15 Kg Check-in, 7 KG handbag
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline for Return Flight */}
                    <div className="relative mt-6">
                      {/* Flight Route Line */}
                      <div className="flex items-center justify-between">
                        {/* Departure Details */}
                        <div className="flex-1">
                          <div className="text-3xl font-bold mb-1">
                            {format(parseDateString(returnFlight.OptionSegmentsInfo[0].DepartureTime), "HH:mm")}
                          </div>
                          <div className="space-y-1">
                            <div className="font-medium">{returnFlight.OptionSegmentsInfo[0].DepartureAirport}</div>
                            <div className="text-sm text-gray-600">Terminal - 1</div>
                          </div>
                        </div>

                        {/* Middle Section with Airline Info */}
                        <div className="flex-1 px-8">
                          <div className="flex items-center justify-center mb-2">
                            <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                              <AirlineLogo airline={returnFlight.OptionSegmentsInfo[0].MarketingAirline} size="md" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-sm">
                              {returnFlight.OptionSegmentsInfo[0].MarketingAirline},{" "}
                              {returnFlight.OptionSegmentsInfo[0].FlightNumber}
                            </div>
                          </div>
                        </div>

                        {/* Arrival Details */}
                        <div className="flex-1 text-right">
                          <div className="text-3xl font-bold mb-1">
                            {format(parseDateString(returnFlight.OptionSegmentsInfo[0].ArrivalTime), "HH:mm")}
                          </div>
                          <div className="space-y-1">
                            <div className="font-medium">{returnFlight.OptionSegmentsInfo[0].ArrivalAirport}</div>
                            <div className="text-sm text-gray-600">Terminal - 1</div>
                          </div>
                        </div>
                      </div>

                      {/* Duration and Class Info */}
                      <div className="absolute right-0 top-0 -mt-6 flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                          </svg>
                          Economy
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

            <div className="mt-8 text-sm text-gray-500 border-t pt-4">
              The baggage information is just for reference. Please Check with airline before check-in. For more
              information, visit the airline's official website.
            </div>
          </div>
        ) : (
          <div>
            {/* Collapsed view for multi-city flights */}
            {isMultiCity &&
              multiCityFlights &&
              multiCityFlights.map((segmentFlight, index) => {
                if (!segmentFlight || !segmentFlight.OptionSegmentsInfo || !segmentFlight.OptionSegmentsInfo[0]) {
                  return null
                }

                return (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                    <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                      <AirlineLogo airline={segmentFlight.OptionSegmentsInfo[0].MarketingAirline} size="lg" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {segmentFlight.OptionSegmentsInfo[0].MarketingAirline}{" "}
                            {segmentFlight.OptionSegmentsInfo[0].FlightNumber}
                          </p>
                          <p className="text-sm text-gray-600">
                            {segmentFlight.OptionSegmentsInfo[0].DepartureAirport} -{" "}
                            {segmentFlight.OptionSegmentsInfo[0].ArrivalAirport}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {format(parseDateString(segmentFlight.OptionSegmentsInfo[0].DepartureTime), "HH:mm")}
                          </p>
                          <p className="text-sm text-gray-600">Non-Stop</p>
                          <p className="font-medium">
                            {format(parseDateString(segmentFlight.OptionSegmentsInfo[0].ArrivalTime), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

            {/* Collapsed view for outbound flight (if not multi-city) */}
            {!isMultiCity && flight && flight.OptionSegmentsInfo && flight.OptionSegmentsInfo.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                  <AirlineLogo airline={flight.OptionSegmentsInfo[0].MarketingAirline} size="lg" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {flight.OptionSegmentsInfo[0].MarketingAirline} {flight.OptionSegmentsInfo[0].FlightNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        {flight.OptionSegmentsInfo[0].DepartureAirport} - {flight.OptionSegmentsInfo[0].ArrivalAirport}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {format(parseDateString(flight.OptionSegmentsInfo[0].DepartureTime), "HH:mm")}
                      </p>
                      <p className="text-sm text-gray-600">Non-Stop</p>
                      <p className="font-medium">
                        {format(parseDateString(flight.OptionSegmentsInfo[0].ArrivalTime), "HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsed view for return flight (if round trip) */}
            {isRoundTrip &&
              returnFlight &&
              returnFlight.OptionSegmentsInfo &&
              returnFlight.OptionSegmentsInfo.length > 0 && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                    <AirlineLogo airline={returnFlight.OptionSegmentsInfo[0].MarketingAirline} size="lg" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {returnFlight.OptionSegmentsInfo[0].MarketingAirline}{" "}
                          {returnFlight.OptionSegmentsInfo[0].FlightNumber}
                        </p>
                        <p className="text-sm text-gray-600">
                          {returnFlight.OptionSegmentsInfo[0].DepartureAirport} -{" "}
                          {returnFlight.OptionSegmentsInfo[0].ArrivalAirport}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {format(parseDateString(returnFlight.OptionSegmentsInfo[0].DepartureTime), "HH:mm")}
                        </p>
                        <p className="text-sm text-gray-600">Non-Stop</p>
                        <p className="font-medium">
                          {format(parseDateString(returnFlight.OptionSegmentsInfo[0].ArrivalTime), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    )
  }

  // Add a new section to display selected fare details
  const renderSelectedFareDetails = () => {
    if (!flight?.SelectedFare && !selectedFare) return null

    const fare = flight?.SelectedFare || selectedFare

    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Selected Fare: {fare.name}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Baggage */}
          <div>
            <h3 className="font-medium mb-2 text-[#007aff]">Baggage</h3>
            <div className="space-y-2">
              <div className="flex items-start">
                <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm">{fare.baggage.cabinBaggage} Cabin Baggage</span>
              </div>
              <div className="flex items-start">
                <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm">{fare.baggage.checkInBaggage} Check-in Baggage</span>
              </div>
            </div>
          </div>

          {/* Flexibility */}
          <div>
            <h3 className="font-medium mb-2 text-[#007aff]">Flexibility</h3>
            <div className="space-y-2">
              <div className="flex items-start">
                <div className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm">{fare.flexibility.cancellationFee}</span>
              </div>
              <div className="flex items-start">
                <div className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm">{fare.flexibility.dateChangeFee}</span>
              </div>
            </div>
          </div>

          {/* Seats & Meals */}
          <div>
            <h3 className="font-medium mb-2 text-[#007aff]">Seats & Meals</h3>
            <div className="space-y-2">
              <div className="flex items-start">
                {fare.seats.free ? (
                  <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 mr-2 flex-shrink-0" />
                )}
                <span className="text-sm">{fare.seats.free ? "Free Seats" : "Chargeable Seats"}</span>
              </div>
              <div className="flex items-start">
                {fare.seats.complimentaryMeals ? (
                  <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 mr-2 flex-shrink-0" />
                )}
                <span className="text-sm">
                  {fare.seats.complimentaryMeals ? "Complimentary Meals" : "Chargeable Meals"}
                </span>
              </div>
            </div>
          </div>

          {/* Benefits */}
          {(fare.benefits.priorityCheckIn ||
            fare.benefits.priorityBoarding ||
            fare.benefits.expressCheckIn ||
            fare.benefits.extraBaggage) && (
            <div>
              <h3 className="font-medium mb-2 text-[#007aff]">Exclusive Benefits</h3>
              <div className="space-y-2">
                {fare.benefits.expressCheckIn && (
                  <div className="flex items-start">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Express Check-In</span>
                  </div>
                )}
                {fare.benefits.priorityBoarding && (
                  <div className="flex items-start">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Priority Boarding</span>
                  </div>
                )}
                {fare.benefits.priorityCheckIn && (
                  <div className="flex items-start">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Priority Check-In</span>
                  </div>
                )}
                {fare.benefits.extraBaggage && (
                  <div className="flex items-start">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">Extra {fare.benefits.extraBaggage} Baggage</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#007aff] mx-auto mb-4"></div>
          <h2 className="text-xl font-medium">Loading flight details...</h2>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-red-50 p-8 rounded-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4">Error Loading Flight Details</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/" className="text-[#007aff] hover:text-[#007aff] font-medium">
            Return to search
          </Link>
        </div>
      </div>
    )
  }

  // Show empty state if no flight data
  if (!flight && !isMultiCity && (!multiCityFlights || multiCityFlights.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No flight details available</h1>
          <Link to="/" className="text-[#007aff] hover:text-[#007aff]">
            Return to search
          </Link>
        </div>
      </div>
    )
  }

  const totalAmount =
    flight && flight.OptionPriceInfo ? Number(flight.OptionPriceInfo.TotalPrice) + convenienceFee : convenienceFee

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {showAlert && previousFare && updatedFare && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center w-96">
            {/* Company Logo */}
            <div className="flex justify-center mb-4">
              <img
                src="/images/logo.png"
                alt="FareClubs Logo"
                className="h-16"
                onError={(e) => {
                  e.currentTarget.src = "/community-travel-deals.png"
                }}
              />
            </div>

            <h2 className="text-xl font-semibold mb-6">Fare Update</h2>

            <div className="flex justify-between items-center p-4 bg-gray-100 rounded mb-6">
              <div className="text-left">
                <p className="text-gray-600 text-sm">Previous Fare:</p>
                <p className="text-lg font-semibold text-red-500">₹{previousFare?.toFixed(2)}</p>
              </div>
              <div className="text-2xl font-bold text-gray-400">→</div>
              <div className="text-right">
                <p className="text-gray-600 text-sm">Updated Fare:</p>
                <p className="text-lg font-semibold text-green-500">₹{updatedFare?.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex justify-between gap-4">
              <button
                onClick={handleContinueBooking}
                className="flex-1 px-4 py-2 bg-[#007AFF] text-white rounded hover:bg-blue-600 transition-colors"
              >
                Continue Booking
              </button>
              <button
                onClick={handleGoBack}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <button onClick={handleBackToResults} className="text-gray-600 hover:text-gray-800 flex items-center">
              <ArrowLeft className="w-5 h-5" />
              <span className="ml-1">Back to Results</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Almost done!</h1>
            <p className="text-gray-600">Enter your details and complete your booking now.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            {renderItineraryDetails()}

            {/* Add the selected fare details section */}
            {renderSelectedFareDetails()}

            {/* SSR Options Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Additional Services</h2>
                <button
                  onClick={() => setShowSSROptions(!showSSROptions)}
                  className="px-4 py-2 bg-[#007AFF] text-white rounded-md hover:bg-[#007aff]"
                >
                  {showSSROptions ? "Hide Options" : "Show Options"}
                </button>
              </div>

              {showSSROptions && (
                <>
                  {isRoundTrip ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium text-lg mb-4">Outbound Flight Services</h3>
                        <SSROptions
                          tokenId={location.state?.tokenId || localStorage.getItem("tokenId") || ""}
                          traceId={location.state?.traceId || localStorage.getItem("traceId") || ""}
                          resultIndex={location.state?.outboundResultIndex || flight?.SearchSegmentId?.toString() || ""}
                          isLCC={flight?.IsLCC || false}
                          onSSRSelect={(options, price) => {
                            setSelectedSSROptions((prev: any) => ({ ...prev, outbound: options }))
                            setSSRTotalPrice((prev: {outbound: number, return: number, total: number}) => ({
                              outbound: price,
                              return: prev.return,
                              total: price + (prev.return || 0),
                            }))
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg mb-4">Return Flight Services</h3>
                        <SSROptions
                          tokenId={location.state?.tokenId || localStorage.getItem("tokenId") || ""}
                          traceId={location.state?.traceId || localStorage.getItem("traceId") || ""}
                          resultIndex={
                            location.state?.returnResultIndex || returnFlight?.SearchSegmentId?.toString() || ""
                          }
                          isLCC={returnFlight?.IsLCC || false}
                          onSSRSelect={(options, price) => {
                            setSelectedSSROptions((prev: any) => ({ ...prev, return: options }))
                            setSSRTotalPrice((prev: {outbound: number, return: number, total: number}) => ({
                              outbound: prev.outbound,
                              return: price,
                              total: price + (prev.outbound || 0),
                            }))
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <SSROptions
                      tokenId={location.state?.tokenId || localStorage.getItem("tokenId") || ""}
                      traceId={location.state?.traceId || localStorage.getItem("traceId") || ""}
                      resultIndex={location.state?.resultIndex || flight?.SearchSegmentId?.toString() || ""}
                      isLCC={flight?.IsLCC || false}
                      onSSRSelect={handleSSRSelect}
                    />
                  )}
                </>
              )}
            </div>

            {/* Contact Details */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Contact Details</h2>
              <p className="text-sm text-gray-600 mb-4">
                Your mobile number will be used only for sending flight related communication
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-[#eb0066]">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile number <span className="text-[#eb0066]">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="receiveOffers"
                    checked={formData.receiveOffers}
                    onChange={handleInputChange}
                    className="rounded text-[#007aff]"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Send me the latest travel deals and special offers via email and/or SMS.
                  </span>
                </label>
              </div>
            </div>

            {/* Traveller Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Traveller Details</h2>
              <p className="text-sm text-gray-600 mb-4">Please enter name as mentioned on your government ID proof.</p>
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Traveller 1: Adult</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-[#eb0066">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-[#eb0066">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-[#eb0066">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="male"
                        checked={formData.gender === "male"}
                        onChange={handleInputChange}
                        className="text-[#007aff]"
                      />
                      <span className="ml-2">Male</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="female"
                        checked={formData.gender === "female"}
                        onChange={handleInputChange}
                        className="text-[#007aff]"
                      />
                      <span className="ml-2">Female</span>
                    </label>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth <span className="text-[#eb0066">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md"
                    required
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 12)).toISOString().split("T")[0]}
                  />
                  <p className="text-xs text-gray-500 mt-1">Passengers must be at least 12 years old.</p>
                </div>
              </div>
            </div>

            {/* Refundable Booking Upgrade */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <RefundableBookingOption
                totalPrice={
                  isRoundTrip && returnFlight && returnFlight.OptionPriceInfo
                    ? totalPrice ||
                      Number(flight?.OptionPriceInfo?.TotalPrice || 0) +
                        Number(returnFlight.OptionPriceInfo?.TotalPrice || 0)
                    : totalPrice || Number(flight?.OptionPriceInfo?.TotalPrice || 0)
                }
                onSelect={handleRefundableSelect}
                currency="₹"
                startDate={
                  flight && flight.OptionSegmentsInfo && flight.OptionSegmentsInfo.length > 0
                    ? parseDateString(flight.OptionSegmentsInfo[0].DepartureTime)
                    : new Date()
                }
              />
            </div>

            {/* GST Details */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="useGST"
                  name="useGST"
                  checked={bookingOptions.useGST}
                  onChange={handleOptionChange}
                  className="mr-2"
                />
                <label htmlFor="useGST" className="text-sm font-medium">
                  Use GST for this booking {validationInfo.isGSTMandatory && "(REQUIRED)"}
                </label>
              </div>
              {(bookingOptions.useGST || validationInfo.isGSTMandatory) && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    To claim credit of GST charged by airlines/FareClubs, please enter your company's GST number
                  </p>
                  <input
                    type="text"
                    name="gstNumber"
                    value={bookingOptions.gstNumber}
                    onChange={handleOptionChange}
                    placeholder="Enter GST Number"
                    className="w-full p-2 border rounded-md"
                    required={validationInfo.isGSTMandatory}
                  />
                </div>
              )}
            </div>

            {/* Fare Rules Button */}
          </div>

          {/* Price Details Sidebar */}
          <div className="col-span-1">
            {/* Price Details Sidebar */}
            <div className="col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <h2 className="text-lg font-semibold mb-4">Price Details</h2>
                {updatedFare !== null ? (
                  // -------------- SHOW THE NEW BREAKDOWN WHEN REPRICING HAS OCCURRED --------------
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Price</span>
                      <span className="font-semibold">₹{updatedFare}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Convenience Fees</span>
                      <span className="font-semibold">₹{convenienceFee}</span>
                    </div>
                    {(typeof ssrTotalPrice === "number"
                      ? ssrTotalPrice > 0
                      : ssrTotalPrice.outbound > 0 || ssrTotalPrice.return > 0) && (
                      <div className="flex justify-between">
                        <span>Additional Services</span>
                        <span className="font-semibold">
                          ₹
                          {typeof ssrTotalPrice === "number"
                            ? ssrTotalPrice
                            : ssrTotalPrice.outbound + ssrTotalPrice.return}
                        </span>
                      </div>
                    )}
                    {isRefundableSelected && (
                      <div className="flex justify-between">
                        <span>Refundable Booking</span>
                        <span className="font-semibold">₹{refundablePrice}</span>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>You Pay</span>
                      <span>
                        ₹
                        {updatedFare +
                          convenienceFee +
                          (typeof ssrTotalPrice === "number"
                            ? ssrTotalPrice
                            : ssrTotalPrice.outbound + ssrTotalPrice.return) +
                          (isRefundableSelected ? refundablePrice : 0)}
                      </span>
                    </div>
                  </div>
                ) : isMultiCity && totalPrice ? (
                  // -------------- MULTI-CITY PRICING --------------
                  <div className="space-y-2">
                    {multiCityFlights &&
                      multiCityFlights.map((segmentFlight, index) => (
                        <div className="flex justify-between" key={index}>
                          <span>Segment {index + 1}</span>
                          <span className="font-semibold">
                            ₹
                            {segmentFlight && segmentFlight.OptionPriceInfo
                              ? segmentFlight.OptionPriceInfo.TotalPrice
                              : "0"}
                          </span>
                        </div>
                      ))}
                    <div className="flex justify-between">
                      <span>Convenience Fees</span>
                      <span className="font-semibold">₹{convenienceFee}</span>
                    </div>
                    {(typeof ssrTotalPrice === "number"
                      ? ssrTotalPrice > 0
                      : ssrTotalPrice.outbound > 0 || ssrTotalPrice.return > 0) && (
                      <div className="flex justify-between">
                        <span>Additional Services</span>
                        <span className="font-semibold">
                          ₹
                          {typeof ssrTotalPrice === "number"
                            ? ssrTotalPrice
                            : ssrTotalPrice.outbound + ssrTotalPrice.return}
                        </span>
                      </div>
                    )}
                    {isRefundableSelected && (
                      <div className="flex justify-between">
                        <span>Refundable Booking</span>
                        <span className="font-semibold">₹{refundablePrice}</span>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>You Pay</span>
                      <span>
                        ₹
                        {totalPrice +
                          convenienceFee +
                          (typeof ssrTotalPrice === "number"
                            ? ssrTotalPrice
                            : ssrTotalPrice.outbound + ssrTotalPrice.return) +
                          (isRefundableSelected ? refundablePrice : 0)}
                      </span>
                    </div>
                  </div>
                ) : isRoundTrip && totalPrice && flight?.OptionPriceInfo && returnFlight?.OptionPriceInfo ? (
                  // -------------- ROUND TRIP PRICING --------------
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Outbound Flight</span>
                      <span className="font-semibold">₹{flight.OptionPriceInfo.TotalPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Return Flight</span>
                      <span className="font-semibold">₹{returnFlight.OptionPriceInfo.TotalPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Convenience Fees</span>
                      <span className="font-semibold">₹{convenienceFee}</span>
                    </div>
                    {(typeof ssrTotalPrice === "number"
                      ? ssrTotalPrice > 0
                      : ssrTotalPrice.outbound > 0 || ssrTotalPrice.return > 0) && (
                      <div className="flex justify-between">
                        <span>Additional Services</span>
                        <span className="font-semibold">
                          ₹
                          {typeof ssrTotalPrice === "number"
                            ? ssrTotalPrice
                            : ssrTotalPrice.outbound + ssrTotalPrice.return}
                        </span>
                      </div>
                    )}
                    {isRefundableSelected && (
                      <div className="flex justify-between">
                        <span>Refundable Booking</span>
                        <span className="font-semibold">₹{refundablePrice}</span>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>You Pay</span>
                      <span>
                        ₹
                        {totalPrice +
                          convenienceFee +
                          (typeof ssrTotalPrice === "number"
                            ? ssrTotalPrice
                            : ssrTotalPrice.outbound + ssrTotalPrice.return) +
                          (isRefundableSelected ? refundablePrice : 0)}
                      </span>
                    </div>
                  </div>
                ) : (
                  // -------------- ORIGINAL BREAKDOWN WHEN NOT REPRICED --------------
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Adult (1 × ₹{flight?.OptionPriceInfo?.TotalBasePrice || 0})</span>
                      <span className="font-semibold">₹{flight?.OptionPriceInfo?.TotalBasePrice || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Airline Taxes &amp; Fees</span>
                      <span className="font-semibold">₹{flight?.OptionPriceInfo?.TotalTax || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Convenience Fees</span>
                      <span className="font-semibold">₹{convenienceFee}</span>
                    </div>
                    {(typeof ssrTotalPrice === "number"
                      ? ssrTotalPrice > 0
                      : ssrTotalPrice.outbound > 0 || ssrTotalPrice.return > 0) && (
                      <div className="flex justify-between">
                        <span>Additional Services</span>
                        <span className="font-semibold">
                          ₹
                          {typeof ssrTotalPrice === "number"
                            ? ssrTotalPrice
                            : ssrTotalPrice.outbound + ssrTotalPrice.return}
                        </span>
                      </div>
                    )}
                    {isRefundableSelected && (
                      <div className="flex justify-between">
                        <span>Refundable Booking</span>
                        <span className="font-semibold">₹{refundablePrice}</span>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>You Pay</span>
                      <span>
                        ₹
                        {flight && flight.OptionPriceInfo
                          ? Number(flight.OptionPriceInfo.TotalPrice) +
                            convenienceFee +
                            (typeof ssrTotalPrice === "number"
                              ? ssrTotalPrice
                              : ssrTotalPrice.outbound + ssrTotalPrice.return) +
                            (isRefundableSelected ? refundablePrice : 0)
                          : convenienceFee +
                            (typeof ssrTotalPrice === "number"
                              ? ssrTotalPrice
                              : ssrTotalPrice.outbound + ssrTotalPrice.return) +
                            (isRefundableSelected ? refundablePrice : 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Promo Code */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Promo Code</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="promoCode"
                  value={formData.promoCode}
                  onChange={handleInputChange}
                  placeholder="Enter promo code"
                  className="flex-1 p-2 border rounded-md"
                />
                <button className="px-4 py-2 bg-[#007aff] text-white rounded-md hover:bg-[#007aff]">Apply</button>
              </div>
              <div className="mt-4">
                <label className="flex items-center gap-2 p-2 border rounded-md">
                  <input type="radio" name="promo" className="text-[#007aff]" />
                  <div>
                    <div className="font-medium">FIRST100</div>
                    <div className="text-sm text-gray-600">Save ₹100</div>
                    <div className="text-xs text-gray-500">Get Up to ₹800* Off. Valid only for UPI Payments</div>
                  </div>
                </label>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full mt-6 px-6 py-3 bg-[#eb0066] text-white rounded-md hover:bg-[#eb0066] font-medium"
              >
                Pay Now
              </button>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center">
                  <img src="images/trustpilot.png" alt="Trustpilot Rating" className="h-12" />
                </div>
                <img src="/images/iata.png" alt="IATA Logo" className="h-12" />
              </div>
              <p className="mt-4 text-xs text-gray-500 text-center">
                By clicking on Pay Now, you are agreeing to our Terms & Conditions, Privacy Policy, User Agreement, and
                Covid-19 Guidelines.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fare Rules Modal */}
      {showFareRulesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {isRoundTrip
                  ? `Fare Rules - ${activeFareRulesFlight === "outbound" ? "Outbound Flight" : "Return Flight"}`
                  : "Fare Rules"}
              </h3>
              <button className="text-gray-500" onClick={() => setShowFareRulesModal(false)}>
                ✕
              </button>
            </div>
            {isRoundTrip
              ? activeFareRulesFlight === "outbound"
                ? flight && (
                    <FareRules
                      tokenId={location.state?.tokenId || localStorage.getItem("tokenId") || ""}
                      traceId={location.state?.traceId || localStorage.getItem("traceId") || ""}
                      resultIndex={location.state?.outboundResultIndex || flight?.SearchSegmentId?.toString() || ""}
                    />
                  )
                : returnFlight && (
                    <FareRules
                      tokenId={location.state?.tokenId || localStorage.getItem("tokenId") || ""}
                      traceId={location.state?.traceId || localStorage.getItem("traceId") || ""}
                      resultIndex={location.state?.returnResultIndex || returnFlight?.SearchSegmentId?.toString() || ""}
                    />
                  )
              : flight && (
                  <FareRules
                    tokenId={location.state?.tokenId || localStorage.getItem("tokenId") || ""}
                    traceId={location.state?.traceId || localStorage.getItem("traceId") || ""}
                    resultIndex={location.state?.resultIndex || flight?.SearchSegmentId?.toString() || ""}
                  />
                )}
            <div className="mt-6 flex justify-end">
              <button
                className="bg-[#007aff] text-white px-6 py-2 rounded-lg font-medium"
                onClick={() => setShowFareRulesModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingPage
