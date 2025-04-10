/* eslint-disable jsx-a11y/anchor-is-valid */
"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Plane, Bed, Car, Bus, Menu } from "lucide-react"
import WalletProfile from "./Walletprofile"
import { useNavigate } from "react-router-dom"

// Define a type for navigation items
interface NavItem {
  icon: React.ElementType
  text: string
  route: string
  color?: string
}

const Navbar: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  const toggleDropdown = (): void => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [])

  // Define navigation items
  const mainNavItems: NavItem[] = [
    { icon: Plane, text: "Flights", route: "/dashboard" },
    { icon: Bed, text: "Hotels", route: "/hotels" },
    { icon: Car, text: "Holidays", route: "/holidays" },
    { icon: Bus, text: "Buses", route: "/buses" },
  ]

  return (
    <div>
      {/* Header Section */}
      <div className="p-3 flex items-center justify-between px-6 relative">
        {/* Left: Hamburger Menu (Visible only on small screens) */}
        <div className="sm:hidden cursor-pointer" ref={menuRef} onClick={toggleDropdown}>
          <Menu className="w-6 h-6 text-black" />
        </div>

        {/* Center: Logo (Hidden on small screens, visible on larger screens) */}
        <div className="hidden sm:block">
          <img
            src={"/images/fareclubs.jpg"}
            alt="Fareclubs Logo"
            className="h-11 ml-5 cursor-pointer"
            onClick={() => navigate("/dashboard")}
          />
        </div>

        {/* Right: Wallet & Profile */}
        <div className="absolute right-6 top-3">
          <WalletProfile />
        </div>
      </div>

      {/* Gradient Divider (Visible only on larger screens) */}
      <div className="hidden sm:block h-[5px] bg-gradient-to-r from-[#eb0066] to-[#FF476B]"></div>

      {/* Navigation Section (Visible on larger screens) */}
      <div className="hidden sm:block mt-4 px-4 sm:px-10">
        <ul className="flex justify-center sm:justify-start space-x-3 sm:space-x-6">
          {mainNavItems.map((item, index) => (
            <li key={index}>
              <button
                onClick={() => navigate(item.route)}
                className="group flex items-center space-x-2 text-black border border-gray-300 rounded-full px-4 py-2 hover:bg-[#eb0066] hover:text-white transition text-xs sm:text-base"
              >
                <item.icon
                  className="w-5 h-5 text-[#eb0066]
                 group-hover:text-white"
                />
                <span>{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default Navbar

