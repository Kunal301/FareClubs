import type React from "react"
import { useState } from "react"
import { ArrowLeftRight, Calendar, Users } from "lucide-react"
import { format, parse } from "date-fns"

interface SearchFormData {
  from: string
  to: string
  date: string
  passengers: number
}

interface SearchHeaderProps {
  searchForm: SearchFormData
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onSearchSubmit: (e: React.FormEvent) => void
  onSwapLocations: () => void
  onDateChange: (date: string) => void
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchForm,
  onSearchChange,
  onSearchSubmit,
  onSwapLocations,
  onDateChange,
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    onDateChange(newDate)
    setIsDatePickerOpen(false)
  }

  const toggleDatePicker = () => {
    setIsDatePickerOpen(!isDatePickerOpen)
  }

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "Select date"
    const date = parse(dateString, "yyyy-MM-dd", new Date())
    return format(date, "dd MMM, yyyy")
  }

  const handleSwapLocations = (e: React.MouseEvent) => {
    e.preventDefault()
    onSwapLocations()
  }

  return (
    <div className="bg-gradient-to-r from-[#FF3366] via-[#8B44FF] to-[#3366FF] p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-4 mb-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="tripType"
              value="one-way"
              checked={true}
              className="w-4 h-4 text-white border-white focus:ring-white bg-transparent mr-2"
            />
            <span className="text-white text-sm">One-way</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="tripType"
              value="round-trip"
              className="w-4 h-4 text-white border-white focus:ring-white bg-transparent mr-2"
            />
            <span className="text-white text-sm">Round-trip</span>
          </label>
        </div>

        <form onSubmit={onSearchSubmit}>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-400"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <input
                type="text"
                name="from"
                value={searchForm.from}
                onChange={onSearchChange}
                placeholder="From: New Delhi (DEL)"
                className="w-full pl-10 pr-3 py-2 rounded-md border-0 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-1 flex items-center justify-center">
              <button onClick={handleSwapLocations} className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50">
                <ArrowLeftRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="col-span-3 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-400"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <input
                type="text"
                name="to"
                value={searchForm.to}
                onChange={onSearchChange}
                placeholder="To: Mumbai (BOM)"
                className="w-full pl-10 pr-3 py-2 rounded-md border-0 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="date"
                name="date"
                value={searchForm.date}
                onChange={handleDateChange}
                className="w-full pl-10 pr-3 py-2 rounded-md border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="col-span-2 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Users className="w-4 h-4 text-gray-400" />
              </div>
              <select
                name="passengers"
                value={searchForm.passengers}
                onChange={onSearchChange}
                className="w-full pl-10 pr-3 py-2 rounded-md border-0 focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 Traveller</option>
                <option value={2}>2 Travellers</option>
                <option value={3}>3 Travellers</option>
                <option value={4}>4 Travellers</option>
                <option value={5}>5 Travellers</option>
              </select>
            </div>

            <div className="col-span-1">
              <button
                type="submit"
                className="w-full h-full bg-[#FF3366] text-white rounded-md hover:bg-[#FF1F5A] font-medium text-sm"
              >
                Modify Search
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

