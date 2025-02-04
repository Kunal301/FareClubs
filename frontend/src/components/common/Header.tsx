import { useState } from "react"
import { ChevronUp, ChevronDown, Phone, Globe } from "lucide-react"

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <img
            src="/images/fareclubs.jpg"
            alt="FareClubs Logo"
            className="h-8"
          />
        </div>

        {/* Support Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-1 px-4 py-2 bg-gray-50 rounded-t-md"
          >
            <span>Support</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isOpen && (
            <div className="absolute right-0 w-72 bg-white shadow-lg rounded-lg mt-0 z-50">
              <div className="bg-[#005AFF] text-white p-4 rounded-t-lg flex items-center space-x-2">
                <div className="w-5 h-5 animate-spin border-2 border-white border-t-transparent rounded-full" />
                <span>Live Support Hours 24x7</span>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <div className="text-sm text-gray-600">Call Toll Free (New Bookings)</div>
                  <a href="tel:1800-570-0333" className="flex items-center space-x-2 text-lg font-semibold">
                    <Phone className="w-4 h-4" />
                    <span>1800-570-0333</span>
                  </a>
                </div>

                <div>
                  <div className="text-sm text-gray-600">For Customer Support</div>
                  <a href="tel:080-6968-6968" className="flex items-center space-x-2 text-lg font-semibold">
                    <Phone className="w-4 h-4" />
                    <span>080-6968-6968</span>
                  </a>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600 border-t pt-4">
                  <Globe className="w-4 h-4" />
                  <span>We speak English, Hindi</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

