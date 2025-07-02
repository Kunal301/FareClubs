/**
 * Formats SSR options for display and API requests
 */

/**
 * Groups SSR options by type (baggage, meal, seat)
 * @param options Array of SSR options
 * @returns Object with grouped options
 */
export const groupSSROptionsByType = (options: any[]) => {
    if (!options || !Array.isArray(options)) {
      return {
        baggage: [],
        meal: [],
        seat: [],
        other: [],
      }
    }
  
    return options.reduce(
      (acc: any, option: any) => {
        const type = option.Type?.toLowerCase() || "other"
  
        if (type.includes("baggage")) {
          acc.baggage.push(option)
        } else if (type.includes("meal")) {
          acc.meal.push(option)
        } else if (type.includes("seat")) {
          acc.seat.push(option)
        } else {
          acc.other.push(option)
        }
  
        return acc
      },
      {
        baggage: [],
        meal: [],
        seat: [],
        other: [],
      },
    )
  }
  
  /**
   * Formats SSR options for API request
   * @param selectedOptions Selected SSR options
   * @param passengerCount Number of passengers
   * @returns Formatted SSR options for API request
   */
  export const formatSSROptionsForRequest = (selectedOptions: Record<string, any>, passengerCount = 1) => {
    if (!selectedOptions || Object.keys(selectedOptions).length === 0) {
      return []
    }
  
    return Object.values(selectedOptions).map((option) => ({
      SSRCode: option.Code,
      SSRType: option.Type,
      PassengerType: option.PassengerType || "ADT", // Default to adult
      SegmentIndicator: option.SegmentIndicator || "1", // Default to first segment
      Amount: option.Amount,
      Quantity: passengerCount,
    }))
  }
  
  /**
   * Calculates total price for selected SSR options
   * @param selectedOptions Selected SSR options
   * @param passengerCount Number of passengers
   * @returns Total price
   */
  export const calculateSSRTotalPrice = (selectedOptions: Record<string, any>, passengerCount = 1) => {
    if (!selectedOptions || Object.keys(selectedOptions).length === 0) {
      return 0
    }
  
    return Object.values(selectedOptions).reduce((total, option) => {
      return total + option.Amount * passengerCount
    }, 0)
  }
  