"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

interface Option {
  value: number | string
  label: string
}

interface CustomDropdownProps {
  options: Option[]
  value: number | string
  onChange: (value: number | string) => void
  label?: string
  className?: string
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({ options, value, onChange, label, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Find the selected option label
  const selectedOption = options.find((option) => option.value === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
    } else if (e.key === "ArrowDown" && !isOpen) {
      setIsOpen(true)
      e.preventDefault()
    } else if (e.key === "ArrowUp" && !isOpen) {
      setIsOpen(true)
      e.preventDefault()
    } else if (e.key === "Enter" || e.key === " ") {
      setIsOpen(!isOpen)
      e.preventDefault()
    }
  }

  const handleSelect = (option: Option) => {
    onChange(option.value)
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`} onKeyDown={handleKeyDown} tabIndex={0}>
      {label && <label className="block text-gray-500 text-xs mb-1">{label}</label>}

      <div
        className="flex items-center justify-between w-full bg-transparent cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-black font-medium text-sm">{selectedOption?.label}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg overflow-hidden"
            style={{ maxHeight: "250px", overflowY: "auto" }}
          >
            {options.map((option) => (
              <motion.div
                key={option.value}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors text-[0.8rem] ${
                  option.value === value ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"
                }`}
                onClick={() => handleSelect(option)}
                whileHover={{ x: 5 }}
                transition={{ duration: 0.1 }}
              >
                {option.label}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

