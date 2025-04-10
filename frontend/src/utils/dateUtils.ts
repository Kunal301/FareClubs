/**
 * Utility functions for date handling
 */

/**
 * Checks if a date is in the past (before today)
 * @param date The date to check
 * @returns true if the date is in the past, false otherwise
 */
export const isDateInPast = (date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }
  
  /**
   * Gets today's date at the start of the day
   * @returns Today's date with time set to 00:00:00
   */
  export const getTodayStart = (): Date => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }
  
  /**
   * Formats a date as YYYY-MM-DD for HTML date inputs
   * @param date The date to format
   * @returns The formatted date string
   */
  export const formatDateForInput = (date: Date): string => {
    return date.toISOString().split("T")[0]
  }
  
  /**
   * Adds custom styles for disabled dates in Air-Datepicker
   */
  export const addDatePickerStyles = (): void => {
    // Check if styles are already added
    if (!document.getElementById("air-datepicker-disabled-styles")) {
      const style = document.createElement("style")
      style.id = "air-datepicker-disabled-styles"
      style.textContent = `
        .air-datepicker-cell.-disabled- {
          color: #ccc !important;
          cursor: not-allowed !important;
          background-color: #f5f5f5 !important;
        }
      `
      document.head.appendChild(style)
    }
  }
  
  