"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { RefundShieldService } from "../../../services/refundShieldService"

interface RefundableBookingOptionProps {
  totalPrice: number
  onSelect: (isSelected: boolean, price: number) => void
  currency?: string
  startDate: Date
}

const RefundableBookingOption: React.FC<RefundableBookingOptionProps> = ({
  totalPrice,
  onSelect,
  currency = "₹",
  startDate,
}) => {
  const [isRefundable, setIsRefundable] = useState<boolean>(false)
  const [refundPrice, setRefundPrice] = useState<number>(0)
  const [isEligible, setIsEligible] = useState<boolean>(true)

  // Add debug logging
  console.log("RefundableBookingOption Debug:", {
    totalPrice,
    currency,
    startDate,
    startDateType: typeof startDate,
    startDateValid: startDate instanceof Date && !isNaN(startDate.getTime()),
  })

  useEffect(() => {
    console.log("RefundableBookingOption useEffect triggered with:", {
      totalPrice,
      startDate,
      startDateType: typeof startDate,
      startDateValid: startDate instanceof Date && !isNaN(startDate.getTime()),
    })

    // Calculate the refund shield price (10% of total)
    const calculatedPrice = RefundShieldService.calculateOfferPrice(totalPrice)
    setRefundPrice(calculatedPrice)
    console.log("Calculated refund price:", calculatedPrice)

    // Check if the booking is eligible for refund shield
    // Temporarily always eligible for testing
    const eligible = true // RefundShieldService.isEligible(totalPrice, startDate)
    setIsEligible(eligible)
    console.log("Eligibility check result (forced true for testing):", eligible)

    if (!eligible) {
      console.log("RefundableBookingOption: Not eligible, component will not render")
    }
  }, [totalPrice, startDate])

  const handleRefundableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.value === "refundable"
    setIsRefundable(selected)
    onSelect(selected, selected ? refundPrice : 0)
  }

  console.log("RefundableBookingOption render check:", {
    isEligible,
    totalPrice,
    refundPrice,
    willRender: isEligible,
  })

  if (!isEligible) {
    console.log("RefundableBookingOption: Returning null due to ineligibility")
    return null // Don't show the option if not eligible
  }

  console.log("RefundableBookingOption: Rendering component")

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Refundable Booking Upgrade</h2>
        <span className="bg-cyan-400 text-white px-3 py-1 text-sm rounded-full">Travel Worry Free</span>
      </div>

      <div className="bg-amber-50 p-4 rounded-lg mb-4">
        <p className="text-sm">
          Upgrade your booking and receive a 100% refund if you cannot attend for one of the many reasons in our{" "}
          <a
            href="https://refundablebooking.com/refundable-terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#eb0066] hover:underline"
          >
            Terms & Conditions
          </a>
          , which you accept when you select a Refundable Booking.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="relative flex flex-col p-4 bg-green-50 rounded-lg cursor-pointer border border-transparent hover:border-green-300">
          <div className="flex items-center mb-2">
            <input
              type="radio"
              name="refundableOption"
              value="refundable"
              checked={isRefundable}
              onChange={handleRefundableChange}
              className="mr-2"
            />
            <span className="font-medium">Refundable Booking</span>
          </div>
          <span className="text-sm text-gray-600">
            Book now {currency}
            {refundPrice.toFixed(2)}
          </span>
          <span className="text-xs text-gray-500">Per person</span>
          <span className="absolute top-2 right-2 bg-[#007aff] text-white text-xs px-2 py-1 rounded">Recommended</span>
        </label>

        <label className="flex flex-col p-4 bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-300">
          <div className="flex items-center mb-2">
            <input
              type="radio"
              name="refundableOption"
              value="non-refundable"
              checked={!isRefundable}
              onChange={handleRefundableChange}
              className="mr-2"
            />
            <span className="font-medium">Non-Refundable Booking</span>
          </div>
          <span className="text-sm text-gray-600">
            I understand that I may not receive a refund if I need to cancel
          </span>
        </label>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-green-500 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Last-minute emergency</span>
          </div>
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-green-500 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Personal emergency</span>
          </div>
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-green-500 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Home emergency</span>
          </div>
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-green-500 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Family emergency</span>
          </div>
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-green-500 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Accident, illness & injury</span>
          </div>
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-green-500 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Pre-existing medical conditions</span>
          </div>
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-green-500 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Transport failure</span>
          </div>
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-green-500 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Adverse Weather</span>
          </div>
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-green-500 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>And many more reasons...</span>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          <a
            href="https://refundablebooking.com/refundable-terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#eb0066] hover:underline"
          >
            View full Terms & Conditions
          </a>
        </p>
      </div>
    </div>
  )
}

export default RefundableBookingOption
