import type React from "react"

export type SortOption = "CHEAPEST" | "SHORTEST" | "DEPARTURE" | "ARRIVAL"

interface SortingTabsProps {
  activeTab: SortOption
  onSort: (option: SortOption) => void
}

export const SortingTabs: React.FC<SortingTabsProps> = ({ activeTab, onSort }) => {
  return (
    <div className="bg-[#E3F2FD] rounded-lg mb-4">
      <div className="flex">
        {(["CHEAPEST", "SHORTEST", "DEPARTURE", "ARRIVAL"] as SortOption[]).map((tab) => (
          <button
            key={tab}
            className={`px-6 py-3 text-sm ${
              activeTab === tab
                ? "text-[#007aff] font-medium relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#007aff]"
                : "text-gray-600"
            }`}
            onClick={() => onSort(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  )
}

