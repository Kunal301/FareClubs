import axios from "axios"

// Constants for Refund Shield API
const REFUND_SHIELD_API_URL = {
  sandbox: "https://refund-shield-sandbox-fae8a5117ef1.herokuapp.com/api/booking/",
  production: "https://refund-shield-production-5cabd1e1c778.herokuapp.com/api/booking/",
}

// Update the API key handling to be more robust
const API_KEY =
  process.env.REACT_APP_REFUND_SHIELD_API_KEY || process.env.REFUND_SHIELD_API_KEY || "d4fe14939b4a5653444bc8975d457630"
const ENVIRONMENT = process.env.NODE_ENV === "production" ? "production" : "sandbox"

// Types for Refund Shield API
export interface RefundShieldProduct {
  product_type: string // "HTL" | "PKG" | "TKT"
  title: string
  price: number
}

export interface RefundShieldRequest {
  apikey: string
  cid: string
  cname: string
  csurname: string
  booking_paid_in_full: boolean
  booking_is_refundable: boolean
  booking_payment_value: number
  booking_quantity: number
  booking_total_transaction_value: number
  booking_type: string // "HTL" | "PKG" | "TKT"
  booking_name: string
  booking_reference: string
  currency_code: string
  language_code: string
  date_of_purchase: string // ISO format: "2024-10-03T13:13:00Z"
  start_date_of_event: string // ISO format: "2024-10-21T13:13:00Z"
  products?: RefundShieldProduct[]
}

export interface RefundShieldResponse {
  success: boolean
  message: string
  error?: string
}

/**
 * Service for interacting with the Refund Shield API
 */
export const RefundShieldService = {
  /**
   * Report a sale to Refund Shield
   * @param data The sale data to report
   * @returns Promise with the response from Refund Shield
   */
  reportSale: async (data: RefundShieldRequest): Promise<RefundShieldResponse> => {
    try {
      // Ensure API key is properly set in the request
      const requestData = {
        ...data,
        apikey: API_KEY, // Always use the API_KEY constant
      }

      console.log("Sending request to Refund Shield:", REFUND_SHIELD_API_URL[ENVIRONMENT])
      console.log("Request data:", JSON.stringify(requestData, null, 2))

      const response = await axios.post(REFUND_SHIELD_API_URL[ENVIRONMENT], requestData, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      return {
        success: true,
        message: "Sale reported successfully",
        ...response.data,
      }
    } catch (error) {
      // More detailed error logging
      if (axios.isAxiosError(error) && error.response) {
        console.error("Refund Shield API Error:", {
          status: error.response.status,
          data: error.response.data,
          url: error.config?.url,
        })
      } else {
        console.error("Error reporting sale to Refund Shield:", error)
      }

      return {
        success: false,
        message: "Failed to report sale",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },

  /**
   * Calculate the refund shield offer price based on the total basket spend
   * @param basketTotal The total basket spend
   * @param percentage The percentage to charge (default: 10%)
   * @returns The calculated offer price
   */
  calculateOfferPrice: (basketTotal: number, percentage = 10): number => {
    return Math.round(((basketTotal * percentage) / 100) * 100) / 100
  },

  /**
   * Check if a purchase is eligible for Refund Shield
   * @param amount The purchase amount
   * @param startDate The booking start date
   * @returns Whether the purchase is eligible
   */
  isEligible: (amount: number, startDate: Date): boolean => {
    console.log("RefundShieldService.isEligible called with:", {
      amount,
      startDate,
      startDateType: typeof startDate,
      startDateValid: startDate instanceof Date && !isNaN(startDate.getTime()),
    })

    // Check minimum price (should be at least ₹1000)
    const minPrice = 1000
    const priceMinCheck = amount >= minPrice
    console.log("Minimum price check:", { amount, minPrice, priceMinCheck })

    // Check maximum price (should be less than ₹500,000 INR per person - much higher for Indian market)
    const maxPrice = 500000
    const priceMaxCheck = amount < maxPrice
    console.log("Maximum price check:", { amount, maxPrice, priceMaxCheck })

    // Check if booking is at least 2 hours in advance (more reasonable)
    const now = new Date()
    const timeDiff = startDate.getTime() - now.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    const timeCheck = hoursDiff >= 2
    console.log("Time check:", {
      now: now.toISOString(),
      startDate: startDate.toISOString(),
      hoursDiff,
      timeCheck,
    })

    // Check if start date is not more than 2 years in the future (more reasonable)
    const twoYearsFromNow = new Date()
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2)
    const futureCheck = startDate <= twoYearsFromNow
    console.log("Future check:", {
      startDate: startDate.toISOString(),
      twoYearsFromNow: twoYearsFromNow.toISOString(),
      futureCheck,
    })

    // Check if start date is not in the past
    const pastCheck = startDate > now
    console.log("Past check:", {
      startDate: startDate.toISOString(),
      now: now.toISOString(),
      pastCheck,
    })

    const finalResult = priceMinCheck && priceMaxCheck && timeCheck && futureCheck && pastCheck
    console.log("Final eligibility result:", {
      priceMinCheck,
      priceMaxCheck,
      timeCheck,
      futureCheck,
      pastCheck,
      finalResult,
    })

    return finalResult
  },
}

export default RefundShieldService
