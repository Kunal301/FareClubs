import type React from "react"

interface FilterSectionProps {
  priceRange: number[]
  selectedStops: number[]
  selectedAirlines: string[]
  onPriceRangeChange: (value: number[]) => void
  onStopsChange: (stops: number) => void
  onAirlinesChange: (airline: string) => void
  airlines: { name: string; minPrice: number }[]
  minPrice: number
  maxPrice: number
  onReset: () => void
  selectedDepartureTimes: string[]
  onDepartureTimeChange: (time: string) => void
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  priceRange,
  selectedStops,
  selectedAirlines,
  onPriceRangeChange,
  onStopsChange,
  onAirlinesChange,
  airlines,
  minPrice,
  maxPrice,
  onReset,
  selectedDepartureTimes,
  onDepartureTimeChange,
}) => {
  // Time ranges for departure filtering
  const timeRanges = [
    "00:00 - 05:59",
    "06:00 - 11:59", 
    "12:00 - 17:59",
    "18:00 - 23:59"
  ]

  return (
    <div className="col-span-3">
      <div className="bg-gray-100 rounded-lg p-4 space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">PRICE</h3>
            <button onClick={onReset} className="text-sm text-[#007aff] hover:text-[#007aff]">
              Reset
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>₹{minPrice}</span>
              <span>₹{maxPrice}</span>
            </div>
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              value={priceRange[1]}
              onChange={(e) => onPriceRangeChange([minPrice, Number(e.target.value)])}
              className="w-full accent-[#007aff]"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">STOPS</h3>
          <div className="space-y-2">
            {[0, 1, 2].map((stops) => (
              <label key={stops} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedStops.includes(stops)}
                  onChange={() => onStopsChange(stops)}
                  className="w-4 h-4 text-[#007aff] border-gray-300 rounded focus:ring-[#007aff]"
                />
                <span className="ml-2 text-sm text-gray-600">
                  {stops === 0 ? "Non-stop" : `${stops} ${stops === 1 ? "stop" : "stops"}`}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">DEPARTURE</h3>
          <div className="grid grid-cols-2 gap-2">
            {timeRanges.map((time) => (
              <button
                key={time}
                className={`p-2 text-xs text-center border rounded-md ${
                  selectedDepartureTimes.includes(time)
                    ? "border-[#ffffff] text-[#ffffff] bg-[#eb0066]"
                    : "border-gray-300 hover:border-[#007aff] hover:text-[#007aff]"
                }`}
                onClick={() => onDepartureTimeChange(time)}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">AIRLINES</h3>
          <div className="space-y-2">
            {airlines.map(({ name, minPrice }) => (
              <label key={name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedAirlines.includes(name)}
                    onChange={() => onAirlinesChange(name)}
                    className="w-4 h-4 text-[#007aff] border-gray-300 rounded focus:ring-[#007aff]"
                  />
                  <span className="ml-2 text-sm text-gray-600">{name}</span>
                </div>
                <span className="text-sm text-gray-500">₹{minPrice}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}