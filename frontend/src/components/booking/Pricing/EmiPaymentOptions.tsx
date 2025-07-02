"use client"

import type React from "react"
import { useState } from "react"

interface EMIPaymentOptionProps {
  totalPrice: number
  onSelect: (isSelected: boolean) => void
  onProcessPayment: (cardNumber: string, mobileNumber: string, tenure: string, schemeId: string) => Promise<void>
}

const EMIPaymentOption: React.FC<EMIPaymentOptionProps> = ({ totalPrice, onSelect, onProcessPayment }) => {
  const [isEMISelected, setIsEMISelected] = useState<boolean>(false)
  const [cardNumber, setCardNumber] = useState<string>("")
  const [mobileNumber, setMobileNumber] = useState<string>("")
  const [tenure, setTenure] = useState<string>("3")

  // Scheme IDs based on tenure
  const schemeIds: Record<string, string> = {
    "3": "194194",
    "6": "194196",
    "9": "194198",
    "12": "194200",
  }

  const handleEMIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.checked
    setIsEMISelected(selected)
    onSelect(selected)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isEMISelected && cardNumber && mobileNumber) {
      await onProcessPayment(cardNumber, mobileNumber, tenure, schemeIds[tenure] || schemeIds["3"])
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">EMI Payment Option</h2>
        <span className="bg-blue-400 text-white px-3 py-1 text-sm rounded-full">No Cost EMI</span>
      </div>

      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isEMISelected}
            onChange={handleEMIChange}
            className="form-checkbox h-5 w-5 text-[#007aff]"
          />
          <span className="ml-2">Pay with EMI Card</span>
        </label>
      </div>

      {isEMISelected && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              EMI Card Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="Enter 16-digit EMI card number"
              className="w-full p-2 border rounded-md"
              maxLength={16}
              pattern="\d{16}"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="Enter 10-digit mobile number"
              className="w-full p-2 border rounded-md"
              maxLength={10}
              pattern="\d{10}"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Tenure <span className="text-red-500">*</span>
            </label>
            <select
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="3">3 Months</option>
              <option value="6">6 Months</option>
              <option value="9">9 Months</option>
              <option value="12">12 Months</option>
            </select>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">EMI Details</h3>
            <div className="flex justify-between text-sm">
              <span>Total Amount:</span>
              <span>₹{totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Monthly EMI:</span>
              <span>₹{(totalPrice / Number.parseInt(tenure)).toFixed(2)}</span>
            </div>
          </div>

          <button type="submit" className="w-full px-4 py-2 bg-[#007aff] text-white rounded-md hover:bg-[#0056b3]">
            Proceed with EMI Payment
          </button>
        </form>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>
          By selecting EMI payment, you agree to the terms and conditions of the EMI provider. A one-time password (OTP)
          will be sent to your registered mobile number for verification.
        </p>
      </div>
    </div>
  )
}

export default EMIPaymentOption
