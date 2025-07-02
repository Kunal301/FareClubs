"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Check } from "lucide-react"
import { format, isValid, parseISO } from "date-fns"
import { Header } from "./BookingHeader"
import { AirlineLogo } from "../common/AirlineLogo"
import FareRules from "./FareRules"
import SSROptions from "./ssrOptions"
import RefundableBookingOption from "./Pricing/RefundableBookingOptions"
import { EcomPaymentService } from "../../services/ecomPaymentServices"
import { preparePassengerData } from "../../services/bookingService"
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
    console.log("BookingPage initial location.state:", location.state)
  }

  const [searchParams, setSearchParams] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [flight, setFlight] = useState<BookingPageProps["flight"] | null>(null)
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
    dateOfBirth: "",
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
    fareType: "refundable",
    seatSelection: false,
    useGST: false,
    gstNumber: "",
  })

  // Update state for multi-city fare rules
  const [activeFareRulesFlight, setActiveFareRulesFlight] = useState<"outbound" | "return" | number>("outbound")

  // Update SSR options state for multi-city
  const [selectedSSROptions, setSelectedSSROptions] = useState<any>({
    outbound: {},
    return: {},
    segments: {}, // Add segments for multi-city
  })
  const [ssrTotalPrice, setSSRTotalPrice] = useState<{
    outbound: number
    return: number
    segments: Record<number, number> // Add segments pricing
    total: number
  }>({
    outbound: 0,
    return: 0,
    segments: {},
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

  // Add state to track SSR component keys to prevent multiple instances
  const [ssrComponentKeys, setSSRComponentKeys] = useState<{
    outbound: string
    return: string
    segments: Record<number, string>
  }>({
    outbound: `outbound-${Date.now()}`,
    return: `return-${Date.now()}`,
    segments: {},
  })

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
        const selectedFareData = location.state.selectedFare || null

        // Get search params to validate trip type
        const searchParams = location.state.searchParams || JSON.parse(localStorage.getItem("searchParams") || "{}")

        // Only set round-trip if we explicitly have return flight data AND search was for round-trip
        const actuallyRoundTrip = Boolean(
          isRoundTripBooking &&
            returnFlightData &&
            searchParams?.tripType === "round-trip" &&
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

        // Generate unique keys for SSR components based on flight data
        const newKeys = {
          outbound: `outbound-${flightData?.SearchSegmentId || Date.now()}`,
          return: `return-${returnFlightData?.SearchSegmentId || Date.now()}`,
          segments: {} as Record<number, string>,
        }

        // Generate keys for multi-city segments
        if (actuallyMultiCity && multiCityFlightsData) {
          multiCityFlightsData.forEach((segmentFlight: any, index: number) => {
            newKeys.segments[index] = `segment-${index}-${segmentFlight?.SearchSegmentId || Date.now()}`
          })
        }

        setSSRComponentKeys(newKeys)

        if (DEBUG) {
          console.log("BookingPage final state:", {
            isRoundTrip: actuallyRoundTrip,
            isMultiCity: actuallyMultiCity,
            hasReturnFlight: !!returnFlightData,
            searchTripType: searchParams?.tripType,
            ssrKeys: newKeys,
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

  // Handle SSR option selection with memoization to prevent unnecessary re-renders
  const handleSSRSelect = useCallback((selectedOptions: any, totalPrice: number) => {
    if (DEBUG) {
      console.log("SSR Select - Outbound:", { selectedOptions, totalPrice })
    }
    setSelectedSSROptions((prev: any) => ({
      ...prev,
      outbound: selectedOptions,
      return: prev.return,
      segments: prev.segments,
    }))
    setSSRTotalPrice((prev) => ({
      ...prev,
      outbound: totalPrice,
      total:
        totalPrice +
        prev.return +
        Object.values(prev.segments).reduce((sum: number, price: any) => sum + (price || 0), 0),
    }))
  }, [])

  // Handle SSR option selection for multi-city segments with memoization
  const handleSegmentSSRSelect = useCallback((segmentIndex: number, selectedOptions: any, totalPrice: number) => {
    if (DEBUG) {
      console.log(`SSR Select - Segment ${segmentIndex}:`, { selectedOptions, totalPrice })
    }
    setSelectedSSROptions((prev: any) => ({
      ...prev,
      segments: {
        ...prev.segments,
        [segmentIndex]: selectedOptions,
      },
    }))

    setSSRTotalPrice((prev) => {
      const newSegments = {
        ...prev.segments,
        [segmentIndex]: totalPrice,
      }
      const segmentsTotal = Object.values(newSegments).reduce((sum: number, price: any) => sum + (price || 0), 0)

      return {
        ...prev,
        segments: newSegments,
        total: prev.outbound + prev.return + segmentsTotal,
      }
    })
  }, [])

  // Handle return flight SSR selection with memoization
  const handleReturnSSRSelect = useCallback((selectedOptions: any, totalPrice: number) => {
    if (DEBUG) {
      console.log("SSR Select - Return:", { selectedOptions, totalPrice })
    }
    setSelectedSSROptions((prev: any) => ({ ...prev, return: selectedOptions }))
    setSSRTotalPrice((prev) => ({
      ...prev,
      return: totalPrice,
      total:
        prev.outbound +
        totalPrice +
        Object.values(prev.segments).reduce((sum: number, price: any) => sum + (price || 0), 0),
    }))
  }, [])

  // Handle refundable booking selection
  const handleRefundableSelect = (isSelected: boolean, price: number) => {
    if (DEBUG) {
      console.log("RefundableBookingOption selection:", { isSelected, price })
    }
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
        IPADDR: "192.168.1.1",
        PIN: "411014",
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
              alert("EMI payment successful!")
            } else {
              alert("EMI payment failed. Please try again.")
            }
          } else {
            alert("Failed to check payment status. Please contact support.")
          }
        }, 300000) // 5 minutes
      } else {
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
          delay *= 2
        }
      }
    }

    throw lastError
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("=== BOOKING SUBMISSION STARTED ===")
    console.log("Form data:", formData)
    console.log("Flight data:", flight)
    console.log("Multi-city flights:", multiCityFlights)
    console.log("Is multi-city:", isMultiCity)
    console.log("Is round trip:", isRoundTrip)
    console.log("Location state:", location.state)

    // Enhanced validation with detailed logging
    if (!flight && (!isMultiCity || !multiCityFlights || multiCityFlights.length === 0)) {
      console.error("VALIDATION ERROR: No flight data available")
      setError("Flight details not available. Please try again.")
      return
    }

    if (isMultiCity && (!multiCityFlights || multiCityFlights.length === 0)) {
      console.error("VALIDATION ERROR: Multi-city selected but no multi-city flights available")
      setError("Multi-city flight details not available. Please try again.")
      return
    }

    if (
      !isMultiCity &&
      (!flight || !flight.OptionSegmentsInfo || flight.OptionSegmentsInfo.length === 0 || !flight.OptionPriceInfo)
    ) {
      console.error("VALIDATION ERROR: Single flight data incomplete", {
        hasFlight: !!flight,
        hasSegments: !!flight?.OptionSegmentsInfo?.length,
        hasPriceInfo: !!flight?.OptionPriceInfo,
      })
      setError("Flight details not available. Please try again.")
      return
    }

    // Form validation with detailed logging
    const requiredFields = ["email", "mobile", "firstName", "lastName", "gender", "dateOfBirth"]
    const missingFields = requiredFields.filter((field) => !formData[field as keyof typeof formData])

    if (missingFields.length > 0) {
      console.error("VALIDATION ERROR: Missing required fields:", missingFields)
      setError(`Please fill in all required fields: ${missingFields.join(", ")}`)
      return
    }

    console.log("✓ All validations passed, proceeding with booking...")

    try {
      setIsLoading(true)
      setError(null)

      // Get tokens with validation
      const tokenId = location.state?.tokenId || localStorage.getItem("tokenId") || ""
      const traceId = location.state?.traceId || localStorage.getItem("traceId") || ""

      console.log("Tokens:", { tokenId: tokenId ? "Present" : "Missing", traceId: traceId ? "Present" : "Missing" })

      if (!tokenId || !traceId) {
        console.error("VALIDATION ERROR: Missing required tokens")
        setError("Session expired. Please search for flights again.")
        return
      }

      // Calculate total amount including all options
      let baseAmount = 0
      if (isMultiCity && multiCityFlights) {
        baseAmount =
          totalPrice ||
          multiCityFlights.reduce((sum, segmentFlight) => {
            return sum + Number(segmentFlight?.OptionPriceInfo?.TotalPrice || 0)
          }, 0)
      } else {
        baseAmount = totalPrice || Number(flight?.OptionPriceInfo?.TotalPrice || 0)
      }

      const totalAmount = baseAmount + ssrTotalPrice.total + (isRefundableSelected ? refundablePrice : 0)
      console.log("Calculated amounts:", { baseAmount, ssrTotal: ssrTotalPrice.total, refundablePrice, totalAmount })

      // Prepare passenger data for booking
      const passengerData = preparePassengerData(
        {
          title: "Mr",
          firstName: formData.firstName,
          lastName: formData.lastName,
          gender: formData.gender,
          mobile: formData.mobile,
          email: formData.email,
          dateOfBirth: formData.dateOfBirth,
          addressLine1: "123 Main St",
          city: "Mumbai",
          countryCode: "IN",
          nationality: "IN",
          gstNumber: bookingOptions.useGST ? bookingOptions.gstNumber : undefined,
        },
        flight?.OptionPriceInfo || { TotalPrice: "0", TotalBasePrice: "0", TotalTax: "0" },
      )

      console.log("Prepared passenger data:", passengerData)

      // Process booking based on trip type and airline type
      if (isMultiCity) {
        console.log("=== PROCESSING MULTI-CITY BOOKING ===")

        if (!multiCityFlights || multiCityFlights.length === 0) {
          console.error("ERROR: No multi-city flights available for booking")
          setError("Multi-city flight information is missing. Please try again.")
          return
        }

        console.log(`Processing ${multiCityFlights.length} segments`)

        try {
          const ticketResponses = []

          // Process each segment of the multi-city trip
          
for (let i = 0; i < multiCityFlights.length; i++) {
  const segmentFlight = multiCityFlights[i]
  console.log(`
--- Processing Segment ${i + 1} ---`)
  console.log("Segment flight data:", segmentFlight)

  if (!segmentFlight || !segmentFlight.OptionSegmentsInfo || !segmentFlight.OptionPriceInfo) {
    console.error(`ERROR: Segment ${i + 1} has incomplete data`)
    setError(`Segment ${i + 1} flight information is incomplete. Please try again.`)
    return
  }

  // 🔄 Step 1: Call FareQuote before ticketing
  console.log(`Calling FareQuote for segment ${i + 1}...`)
  const originalResultIndex = segmentFlight?.SearchSegmentId?.toString() || ""
  const fareQuoteResponse = await getFareQuote(tokenId, traceId, originalResultIndex)

  const updatedResult = fareQuoteResponse?.Response?.Results
  if (!updatedResult || !updatedResult.ResultIndex) {
    console.error(`FareQuote failed for segment ${i + 1}`, fareQuoteResponse)
    setError(`Unable to validate fare for segment ${i + 1}. Please try again.`)
    return
  }

  const updatedResultIndex = updatedResult.ResultIndex
  const fare = updatedResult.Fare

  console.log(`Segment ${i + 1} updated ResultIndex:`, updatedResultIndex)

  // 🧾 Step 2: Prepare fresh passenger data from FareQuote
  const segmentPassengerData = [
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
        BaseFare: Number(fare?.BaseFare || 0),
        Tax: Number(fare?.Tax || 0),
        YQTax: Number(fare?.YQTax || 0),
        AdditionalTxnFeePub: Number(fare?.AdditionalTxnFeePub || 0),
        AdditionalTxnFeeOfrd: Number(fare?.AdditionalTxnFeeOfrd || 0),
        OtherCharges: Number(fare?.OtherCharges || 0),
      },
      Nationality: "IN",
    },
  ]

  console.log(`Segment ${i + 1} passenger data:`, segmentPassengerData)

  // ✈️ Step 3: Ticketing
  console.log(`Calling handleTicketingProcess for segment ${i + 1}...`)
  const segmentTicketResponse = await handleTicketingProcess(
    0,
    "",
    tokenId,
    traceId,
    true,
    updatedResultIndex,
    segmentPassengerData,
  )

  console.log(`Full segment ${i + 1} ticket response:`, JSON.stringify(segmentTicketResponse, null, 2))

  // ✅ Step 4: Validate response
  const isSuccess =
    segmentTicketResponse.Response?.ResponseStatus === 1 ||
    segmentTicketResponse.Response?.Response?.Status === 1

  if (!isSuccess) {
    const errorMessage =
      segmentTicketResponse?.Response?.Error?.ErrorMessage ||
      segmentTicketResponse?.Error?.ErrorMessage ||
      "Unknown error"
    console.error(`ERROR: Segment ${i + 1} booking failed: ${errorMessage}`)
    setError(`Segment ${i + 1} booking failed: ${errorMessage}`)
    return
  }

  console.log(`✓ Segment ${i + 1} booked successfully`)
  ticketResponses.push(segmentTicketResponse)

  // Optional: Add 1-second delay between segments to reduce API load risk
  await new Promise((resolve) => setTimeout(resolve, 1000))
}
---`)
            console.log("Segment flight data:", segmentFlight)

            if (!segmentFlight || !segmentFlight.OptionSegmentsInfo || !segmentFlight.OptionPriceInfo) {
              console.error(`ERROR: Segment ${i + 1} has incomplete data`)
              setError(`Segment ${i + 1} flight information is incomplete. Please try again.`)
              return
            }

            const segmentResultIndex = (
              location.state?.multiCityResultIndexes?.[i] ||
              location.state?.[`segment${i}ResultIndex`] ||
              segmentFlight?.SearchSegmentId?.toString() ||
              ""
            ).toString()

            console.log(`Segment ${i + 1} result index:`, segmentResultIndex)

            if (!segmentResultIndex) {
              console.error(`ERROR: Missing result index for segment ${i + 1}`)
              setError(`Missing booking information for segment ${i + 1}. Please try again.`)
              return
            }

            const segmentPassengerData = [
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
                  BaseFare: Number(segmentFlight?.OptionPriceInfo?.TotalBasePrice || 0),
                  Tax: Number(segmentFlight?.OptionPriceInfo?.TotalTax || 0),
                  YQTax: 0,
                  AdditionalTxnFeePub: 0,
                  AdditionalTxnFeeOfrd: 0,
                  OtherCharges: 0,
                },
                Nationality: "IN",
              },
            ]

            console.log(`Segment ${i + 1} passenger data:`, segmentPassengerData)

            console.log(`Calling handleTicketingProcess for segment ${i + 1}...`)

            const segmentTicketResponse = await handleTicketingProcess(
              0,
              "",
              tokenId,
              traceId,
              true, // Assuming LCC for multi-city for now
              segmentResultIndex,
              segmentPassengerData,
            )

            console.log(`Full segment ${i + 1} ticket response:`, JSON.stringify(segmentTicketResponse, null, 2))

            // Check multiple possible response structures
            let isSuccess = false
            let errorMessage = "Unknown error"

            // Check the main response structure - use ResponseStatus instead of Status
            if (segmentTicketResponse.Response?.ResponseStatus === 1) {
              isSuccess = true
            } else if (segmentTicketResponse.Response?.Response?.Status === 1) {
              isSuccess = true
            } else if (segmentTicketResponse.Response && !segmentTicketResponse.Error) {
              // If we have a response without an explicit error, consider it successful
              isSuccess = true
            }

            // Get error message from various possible locations
            if (!isSuccess) {
              errorMessage = segmentTicketResponse.Error?.ErrorMessage || "Booking failed - please try again"
            }

            if (isSuccess) {
              console.log(`✓ Segment ${i + 1} booked successfully`)
              ticketResponses.push(segmentTicketResponse)
            } else {
              console.error(`ERROR: Segment ${i + 1} booking failed:`, errorMessage)
              console.error("Full error response:", segmentTicketResponse)
              setError(`Segment ${i + 1} booking failed: ${errorMessage}`)
              return
            }
          }

          // All segments booked successfully
          console.log("✓ All multi-city segments booked successfully")
          console.log("Navigating to confirmation...")

          navigate("/booking/confirmation", {
            state: {
              bookingReference: ticketResponses[0]?.Response?.Response?.FlightItinerary?.PNR,
              bookingId: ticketResponses[0]?.Response?.Response?.FlightItinerary?.BookingId,
              totalAmount,
              multiCityFlights,
              isMultiCity: true,
              isRefundableSelected,
              refundablePrice,
              ssrOptions: selectedSSROptions,
              ssrTotalPrice,
              customerDetails: formData,
              multiCityTicketResponses: ticketResponses,
            },
          })
        } catch (err) {
          console.error("EXCEPTION during multi-city booking:", err)
          const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
          setError(`Multi-city booking failed: ${errorMessage}`)
        }
      } else if (isRoundTrip) {
        console.log("=== PROCESSING ROUND-TRIP BOOKING ===")
        // Round trip logic here (existing code)
        setError("Round-trip booking logic not implemented in this debug version")
      } else {
        console.log("=== PROCESSING ONE-WAY BOOKING ===")
        // One-way logic here (existing code)
        setError("One-way booking logic not implemented in this debug version")
      }
    } catch (err) {
      console.error("EXCEPTION in handleSubmit:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(`Booking submission failed: ${errorMessage}`)
    } finally {
      console.log("=== BOOKING SUBMISSION ENDED ===")
      setIsLoading(false)
    }
  }

  // Add this useEffect after the existing ones to track state changes
  useEffect(() => {
    console.log("=== BOOKING PAGE STATE DEBUG ===")
    console.log("isMultiCity:", isMultiCity)
    console.log("multiCityFlights:", multiCityFlights)
    console.log("flight:", flight)
    console.log("isRoundTrip:", isRoundTrip)
    console.log("returnFlight:", returnFlight)
    console.log("totalPrice:", totalPrice)
    console.log("location.state:", location.state)
    console.log("================================")
  }, [isMultiCity, multiCityFlights, flight, isRoundTrip, returnFlight, totalPrice, location.state])

  const convenienceFee = 149.0

  const handleBackToResults = () => {
    let storedSearchParams: string | null = localStorage.getItem("searchParams")
    let storedSessionId: string | null = localStorage.getItem("sessionId")
    const storedTraceId: string | null = localStorage.getItem("traceId")

    if (!storedSearchParams && flight && flight.OptionSegmentsInfo && flight.OptionSegmentsInfo.length > 0) {
      const defaultSearchParams = {
        from: flight.OptionSegmentsInfo[0].DepartureAirport,
        to: flight.OptionSegmentsInfo[0].ArrivalAirport,
        date: flight.OptionSegmentsInfo[0].DepartureTime.split(",")[0],
        passengers: 1,
      }
      storedSearchParams = JSON.stringify(defaultSearchParams)
      localStorage.setItem("searchParams", storedSearchParams)
    }

    if (!storedSessionId) {
      storedSessionId = sessionId || "default-session"
      localStorage.setItem("sessionId", storedSessionId)
    }

    const parsedSearchParams = storedSearchParams ? JSON.parse(storedSearchParams) : {}

    navigate("/search-results", {
      state: {
        searchParams: parsedSearchParams,
        sessionId: storedSessionId!,
        traceId: storedTraceId,
        shouldSearch: false,
        returnFromBooking: true,
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
          {isMultiCity ? (
            // Multi-city fare rules buttons
            <div className="flex flex-wrap gap-2">
              {multiCityFlights &&
                multiCityFlights.map((segmentFlight, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setShowFareRulesModal(true)
                      setActiveFareRulesFlight(index)
                    }}
                    className="px-3 py-2 border border-[#007AFF] text-[#007AFF] rounded-md hover:bg-blue-50 text-sm"
                  >
                    Segment {index + 1} Fare Rules
                  </button>
                ))}
            </div>
          ) : isRoundTrip ? (
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
        {renderValidationWarnings()}
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

                      <div className="relative mt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-3xl font-bold mb-1">
                              {format(parseDateString(segmentFlight.OptionSegmentsInfo[0].DepartureTime), "HH:mm")}
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium">{segmentFlight.OptionSegmentsInfo[0].DepartureAirport}</div>
                              <div className="text-sm text-gray-600">Terminal - 1</div>
                            </div>
                          </div>

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

                  <div className="relative mt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-3xl font-bold mb-1">
                          {format(parseDateString(flight.OptionSegmentsInfo[0].DepartureTime), "HH:mm")}
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium">{flight.OptionSegmentsInfo[0].DepartureAirport}</div>
                          <div className="text-sm text-gray-600">Terminal - 1</div>
                        </div>
                      </div>

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

                    <div className="relative mt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-3xl font-bold mb-1">
                            {format(parseDateString(returnFlight.OptionSegmentsInfo[0].DepartureTime), "HH:mm")}
                          </div>
                          <div className="space-y-1">
                            <div className="font-medium">{returnFlight.OptionSegmentsInfo[0].DepartureAirport}</div>
                            <div className="text-sm text-gray-600">Terminal - 1</div>
                          </div>
                        </div>

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

  // Calculate the total price for RefundableBookingOption
  const calculateRefundablePrice = () => {
    if (DEBUG) {
      console.log("Calculating refundable price with:", {
        isRoundTrip,
        isMultiCity,
        totalPrice,
        flightPrice: flight?.OptionPriceInfo?.TotalPrice,
        returnFlightPrice: returnFlight?.OptionPriceInfo?.TotalPrice,
        multiCityFlights: multiCityFlights?.length,
      })
    }

    if (isRoundTrip && returnFlight && returnFlight.OptionPriceInfo) {
      const calculatedTotal =
        totalPrice ||
        Number(flight?.OptionPriceInfo?.TotalPrice || 0) + Number(returnFlight.OptionPriceInfo?.TotalPrice || 0)

      if (DEBUG) {
        console.log("Round-trip refundable price:", calculatedTotal)
      }
      return calculatedTotal
    } else if (isMultiCity && multiCityFlights && multiCityFlights.length > 0) {
      const calculatedTotal =
        totalPrice ||
        multiCityFlights.reduce((sum, segmentFlight) => {
          return sum + Number(segmentFlight?.OptionPriceInfo?.TotalPrice || 0)
        }, 0)

      if (DEBUG) {
        console.log("Multi-city refundable price:", calculatedTotal)
      }
      return calculatedTotal
    } else {
      const calculatedTotal = totalPrice || Number(flight?.OptionPriceInfo?.TotalPrice || 0)

      if (DEBUG) {
        console.log("One-way refundable price:", calculatedTotal)
      }
      return calculatedTotal
    }
  }

  // Calculate the start date for RefundableBookingOption
  const calculateStartDate = () => {
    if (flight && flight.OptionSegmentsInfo && flight.OptionSegmentsInfo.length > 0) {
      const startDate = parseDateString(flight.OptionSegmentsInfo[0].DepartureTime)
      if (DEBUG) {
        console.log("Calculated start date:", startDate)
      }
      return startDate
    }

    if (DEBUG) {
      console.log("Using fallback start date (current date)")
    }
    return new Date()
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

  // Debug logging for RefundableBookingOption props
  if (DEBUG) {
    console.log("About to render RefundableBookingOption with:", {
      totalPrice: calculateRefundablePrice(),
      startDate: calculateStartDate(),
      isRoundTrip,
      isMultiCity,
    })
  }

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
                  {isMultiCity ? (
                    // Multi-city SSR options with unique keys
                    <div className="space-y-6">
                      {multiCityFlights &&
                        multiCityFlights.map((segmentFlight, index) => {
                          // Get the result index for this segment and ensure it's a string
                          const segmentResultIndex = (
                            location.state?.multiCityResultIndexes?.[index] ||
                            location.state?.[`segment${index}ResultIndex`] ||
                            segmentFlight?.SearchSegmentId?.toString() ||
                            ""
                          ).toString()

                          return (
                            <div key={`multi-city-${index}`}>
                              <h3 className="font-medium text-lg mb-4">
                                Segment {index + 1} Services ({segmentFlight?.OptionSegmentsInfo?.[0]?.DepartureAirport}{" "}
                                - {segmentFlight?.OptionSegmentsInfo?.[0]?.ArrivalAirport})
                              </h3>
                              <SSROptions
                                key={ssrComponentKeys.segments[index] || `segment-${index}-${Date.now()}`}
                                tokenId={location.state?.tokenId || localStorage.getItem("tokenId") || ""}
                                traceId={location.state?.traceId || localStorage.getItem("traceId") || ""}
                                resultIndex={segmentResultIndex}
                                isLCC={segmentFlight?.IsLCC || false}
                                onSSRSelect={(options, price) => handleSegmentSSRSelect(index, options, price)}
                              />
                            </div>
                          )
                        })}
                    </div>
                  ) : isRoundTrip ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium text-lg mb-4">Outbound Flight Services</h3>
                        <SSROptions
                          key={ssrComponentKeys.outbound}
                          tokenId={location.state?.tokenId || localStorage.getItem("tokenId") || ""}
                          traceId={location.state?.traceId || localStorage.getItem("traceId") || ""}
                          resultIndex={location.state?.outboundResultIndex || flight?.SearchSegmentId?.toString() || ""}
                          isLCC={flight?.IsLCC || false}
                          onSSRSelect={(options, price) => {
                            setSelectedSSROptions((prev: any) => ({ ...prev, outbound: options }))
                            setSSRTotalPrice((prev) => ({
                              ...prev,
                              outbound: price,
                              total:
                                price +
                                prev.return +
                                Object.values(prev.segments).reduce(
                                  (sum: number, segPrice: any) => sum + (segPrice || 0),
                                  0,
                                ),
                            }))
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg mb-4">Return Flight Services</h3>
                        <SSROptions
                          key={ssrComponentKeys.return}
                          tokenId={location.state?.tokenId || localStorage.getItem("tokenId") || ""}
                          traceId={location.state?.traceId || localStorage.getItem("traceId") || ""}
                          resultIndex={
                            location.state?.returnResultIndex || returnFlight?.SearchSegmentId?.toString() || ""
                          }
                          isLCC={returnFlight?.IsLCC || false}
                          onSSRSelect={handleReturnSSRSelect}
                        />
                      </div>
                    </div>
                  ) : (
                    <SSROptions
                      key={ssrComponentKeys.outbound}
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
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Traveller Details</h2>
              <p className="text-sm text-gray-600 mb-4">Please enter name as mentioned on your government ID proof.</p>
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Traveller 1: Adult</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-[#eb0066]">*</span>
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
                      Last Name <span className="text-[#eb0066]">*</span>
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
                    Gender <span className="text-[#eb0066]">*</span>
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
                    Date of Birth <span className="text-[#eb0066]">*</span>
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
                totalPrice={calculateRefundablePrice()}
                onSelect={handleRefundableSelect}
                currency="₹"
                startDate={calculateStartDate()}
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
          </div>

          {/* Price Details Sidebar */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Price Details</h2>
              {updatedFare !== null ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Price</span>
                    <span className="font-semibold">₹{updatedFare}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Convenience Fees</span>
                    <span className="font-semibold">₹{convenienceFee}</span>
                  </div>
                  {ssrTotalPrice.total > 0 && (
                    <div className="flex justify-between">
                      <span>Additional Services</span>
                      <span className="font-semibold">₹{ssrTotalPrice.total}</span>
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
                        ssrTotalPrice.total +
                        (isRefundableSelected ? refundablePrice : 0)}
                    </span>
                  </div>
                </div>
              ) : isMultiCity && totalPrice ? (
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
                  {ssrTotalPrice.total > 0 && (
                    <div className="flex justify-between">
                      <span>Additional Services</span>
                      <span className="font-semibold">₹{ssrTotalPrice.total}</span>
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
                      {totalPrice + convenienceFee + ssrTotalPrice.total + (isRefundableSelected ? refundablePrice : 0)}
                    </span>
                  </div>
                </div>
              ) : isRoundTrip && totalPrice && flight?.OptionPriceInfo && returnFlight?.OptionPriceInfo ? (
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
                  {ssrTotalPrice.total > 0 && (
                    <div className="flex justify-between">
                      <span>Additional Services</span>
                      <span className="font-semibold">₹{ssrTotalPrice.total}</span>
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
                      {totalPrice + convenienceFee + ssrTotalPrice.total + (isRefundableSelected ? refundablePrice : 0)}
                    </span>
                  </div>
                </div>
              ) : (
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
                  {ssrTotalPrice.total > 0 && (
                    <div className="flex justify-between">
                      <span>Additional Services</span>
                      <span className="font-semibold">₹{ssrTotalPrice.total}</span>
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
                          ssrTotalPrice.total +
                          (isRefundableSelected ? refundablePrice : 0)
                        : convenienceFee + ssrTotalPrice.total + (isRefundableSelected ? refundablePrice : 0)}
                    </span>
                  </div>
                </div>
              )}
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

              {/* Add this debug button before the Pay Now button */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  console.log("=== DEBUG BUTTON CLICKED ===")
                  console.log("Current form data:", formData)
                  console.log("Current flight data:", { flight, multiCityFlights, isMultiCity, isRoundTrip })
                  console.log("Location state:", location.state)
                  console.log("============================")
                }}
                className="w-full mt-4 px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium"
              >
                Debug Info
              </button>

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
                {isMultiCity
                  ? `Fare Rules - Segment ${(activeFareRulesFlight as number) + 1}`
                  : isRoundTrip
                    ? `Fare Rules - ${activeFareRulesFlight === "outbound" ? "Outbound Flight" : "Return Flight"}`
                    : "Fare Rules"}
              </h3>
              <button className="text-gray-500" onClick={() => setShowFareRulesModal(false)}>
                ✕
              </button>
            </div>
            {isMultiCity
              ? // Multi-city fare rules - use the same FareRules component
                multiCityFlights &&
                typeof activeFareRulesFlight === "number" &&
                multiCityFlights[activeFareRulesFlight] && (
                  <FareRules
                    tokenId={location.state?.tokenId || localStorage.getItem("tokenId") || ""}
                    traceId={location.state?.traceId || localStorage.getItem("traceId") || ""}
                    resultIndex={
                      (
                        location.state?.multiCityResultIndexes?.[activeFareRulesFlight] ||
                        location.state?.[`segment${activeFareRulesFlight}ResultIndex`] ||
                        multiCityFlights[activeFareRulesFlight]?.SearchSegmentId?.toString() ||
                        ""
                      ).toString() // Ensure string conversion
                    }
                  />
                )
              : isRoundTrip
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
                        resultIndex={
                          location.state?.returnResultIndex || returnFlight?.SearchSegmentId?.toString() || ""
                        }
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
