"use client"

import { useEffect, useRef } from "react"
import AirDatepicker from "air-datepicker"
import localeEn from "air-datepicker/locale/en"
import { addDatePickerStyles, getTodayStart } from "../utils/dateUtils"

// Define the types that match Air-Datepicker's expected types
type AirDatepickerDate = Date | string | number
type DatePickerDateValue = false | AirDatepickerDate | undefined

interface UseDatePickerOptions {
  onSelect?: (date: Date | null) => void
  dateFormat?: string
  minDate?: Date | null | false
  maxDate?: Date | null | false
  autoClose?: boolean
}

/**
 * Custom hook for initializing date pickers with past dates disabled
 */
export const useDatePicker = (options: UseDatePickerOptions = {}) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const datepickerRef = useRef<AirDatepicker | null>(null)

  const { onSelect, dateFormat = "dd MMM yyyy", minDate = getTodayStart(), maxDate = false, autoClose = true } = options

  useEffect(() => {
    // Add styles for disabled dates
    addDatePickerStyles()

    // Convert minDate and maxDate to the types expected by Air-Datepicker
    // null or undefined should be converted to false (no min/max date)
    const minDateValue: DatePickerDateValue = minDate || false
    const maxDateValue: DatePickerDateValue = maxDate || false

    // Initialize datepicker if input ref is available
    if (inputRef.current && !datepickerRef.current) {
      datepickerRef.current = new AirDatepicker(inputRef.current, {
        locale: localeEn,
        dateFormat,
        autoClose,
        minDate: minDateValue,
        maxDate: maxDateValue,
        onSelect({ date }) {
          if (onSelect) {
            // Handle both single date and array of dates
            if (Array.isArray(date)) {
              // If it's a date range picker
              onSelect(date.length > 0 ? date[0] : null)
            } else {
              // If it's a single date picker
              onSelect(date || null)
            }
          }
        },
      })
    }

    // Cleanup
    return () => {
      if (datepickerRef.current) {
        datepickerRef.current.destroy()
        datepickerRef.current = null
      }
    }
  }, [dateFormat, autoClose, minDate, maxDate, onSelect])

  return { inputRef, datepicker: datepickerRef.current }
}

