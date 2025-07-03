import axios from "axios"

/**
 * Calls the SSR API to get available special service requests (meals, baggage, seats)
 * @param tokenId The authentication token
 * @param traceId The trace ID from the search response
 * @param resultIndex The result index of the selected flight
 * @returns Promise with the SSR response
 */
export const getSSROptions = async (tokenId: string, traceId: string, resultIndex: string) => {
  try {
    // Direct call to SSR API with the provided ResultIndex
    // The component will handle refreshing the session and getting a valid ResultIndex
    const response = await axios.post(
      "https://fareclubs.onrender.com/api/ssr",
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
    console.error("Error in getSSROptions:", error)
    throw new Error("Failed to get SSR options. Please try again.")
  }
}

/**
 * Adds selected SSR options to the booking
 * @param tokenId The authentication token
 * @param bookingId The booking ID
 * @param ssrOptions The selected SSR options
 * @returns Promise with the response
 */
export const addSSRToBooking = async (tokenId: string, bookingId: string, ssrOptions: any) => {
  try {
    const response = await axios.post(
      "https://fareclubs.onrender.com/api/add-ssr",
      {
        EndUserIp: "192.168.10.10",
        TokenId: tokenId,
        BookingId: bookingId,
        SSROptions: ssrOptions,
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
    console.error("Error in addSSRToBooking:", error)
    throw new Error("Failed to add SSR options to booking. Please try again.")
  }
}
