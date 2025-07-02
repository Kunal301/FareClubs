import { format } from "date-fns"

export interface CityPair {
  from: string
  to: string
  date: string
}

/**
 * Validates that multi-city trip dates are in chronological order
 * @param trips Array of city pairs with dates
 * @returns Object with validation result and error message
 */
export const validateMultiCityDates = (trips: CityPair[]): { isValid: boolean; errorMessage: string } => {
  if (!trips || trips.length <= 1) {
    return { isValid: true, errorMessage: "" }
  }

  // First check if all dates are specified
  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i]

    // Skip if trip is undefined (can happen if a trip was removed)
    if (!trip) continue

    if (!trip.date || trip.date.trim() === "") {
      return {
        isValid: false,
        errorMessage: `Please select a date for segment ${i + 1}.`,
      }
    }
  }

  // Then check chronological order
  for (let i = 1; i < trips.length; i++) {
    const prevTrip = trips[i - 1]
    const currentTrip = trips[i]

    // Skip if either trip is undefined
    if (!prevTrip || !currentTrip) continue

    const prevDate = new Date(prevTrip.date)
    const currentDate = new Date(currentTrip.date)

    // Check if dates are valid
    if (isNaN(prevDate.getTime()) || isNaN(currentDate.getTime())) {
      return {
        isValid: false,
        errorMessage: `Invalid date format in segment ${isNaN(prevDate.getTime()) ? i : i + 1}.`,
      }
    }

    if (currentDate < prevDate) {
      return {
        isValid: false,
        errorMessage: `Departure date of segment ${i + 1} (${format(currentDate, "dd MMM yyyy")}) can't be earlier than departure of segment ${i} (${format(prevDate, "dd MMM yyyy")}).`,
      }
    }
  }

  return { isValid: true, errorMessage: "" }
}

/**
 * Checks if a destination city is the same as the origin city of the next segment
 * @param trips Array of city pairs
 * @returns Object with validation result and warning message
 */
export const checkConnectingCities = (trips: CityPair[]): { isConnected: boolean; warningMessage: string } => {
  if (!trips || trips.length <= 1) {
    return { isConnected: true, warningMessage: "" }
  }

  for (let i = 0; i < trips.length - 1; i++) {
    const currentTrip = trips[i]
    const nextTrip = trips[i + 1]

    if (currentTrip.to !== nextTrip.from) {
      return {
        isConnected: false,
        warningMessage: `Note: Segment ${i + 1} ends in ${currentTrip.to} but segment ${i + 2} starts from ${nextTrip.from}.`,
      }
    }
  }

  return { isConnected: true, warningMessage: "" }
}
