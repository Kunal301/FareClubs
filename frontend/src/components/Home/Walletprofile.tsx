"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Wallet, User, ChevronDown, LogOut, PlusCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const WalletProfile = () => {
  const [balance, setBalance] = useState(0) // Wallet balance
  const [isDropdownOpen, setIsDropdownOpen] = useState(false) // Dropdown toggle
  const [profiles, setProfiles] = useState(["Kunal"]) // List of profiles
  const [selectedProfile, setSelectedProfile] = useState("Kunal") // Active profile
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 640)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    // Try to get member info from localStorage
    const memberInfoStr = localStorage.getItem("memberInfo")
    if (memberInfoStr) {
      try {
        const memberInfo = JSON.parse(memberInfoStr)
        if (memberInfo.FirstName) {
          setSelectedProfile(memberInfo.FirstName)
          setProfiles([memberInfo.FirstName])
        }
      } catch (error) {
        console.error("Error parsing member info:", error)
      }
    }

    const handleResize = () => setIsSmallScreen(window.innerWidth < 640)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const switchProfile = (profile: React.SetStateAction<string>) => {
    setSelectedProfile(profile)
    setIsDropdownOpen(false)
  }

  const handleLogout = async () => {
    if (isLoggingOut) return // Prevent multiple clicks

    setIsLoggingOut(true)

    try {
      // Get required data from localStorage
      const tokenId = localStorage.getItem("tokenId") || localStorage.getItem("TokenId")
      const memberInfoStr = localStorage.getItem("memberInfo")

      if (!tokenId || !memberInfoStr) {
        console.error("Missing token or member info")
        // Even if we don't have the token, clear local storage and redirect
        performLocalLogout()
        return
      }

      const memberInfo = JSON.parse(memberInfoStr)

      // Call logout API
      const response = await axios.post(
        "https://Sharedapi.tektravels.com/SharedData.svc/rest/Logout",
        {
          ClientId: "ApiIntegrationNew",
          EndUserIp: "192.168.1.1", // This should be the actual user's IP in production
          TokenAgencyId: memberInfo.AgencyId,
          TokenMemberId: memberInfo.MemberId,
          TokenId: tokenId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      )

      console.log("Logout API Response:", response.data)

      if (response.data.Status === 1) {
        // 1 means Successful
        console.log("Logout successful")
      } else {
        console.error("Logout failed:", response.data.Error?.ErrorMessage)
      }
    } catch (error) {
      console.error("Error during logout:", error)
    } finally {
      // Always perform local logout regardless of API success/failure
      performLocalLogout()
      setIsLoggingOut(false)
    }
  }

  const performLocalLogout = () => {
    // Clear all relevant session data
    localStorage.removeItem("tokenId")
    localStorage.removeItem("TokenId")
    localStorage.removeItem("tokenTimestamp")
    localStorage.removeItem("memberInfo")
    localStorage.removeItem("searchParams")
    localStorage.removeItem("searchResults")
    localStorage.removeItem("selectedFlight")
    localStorage.removeItem("searchFormData")
    localStorage.removeItem("sessionId")
    localStorage.removeItem("traceId")

    // Close the dropdown
    setIsDropdownOpen(false)

    // Use navigate for client-side routing instead of window.location.href
    navigate("/login")
  }

  const addNewProfile = () => {
    const newProfile = prompt("Enter new profile name:")
    if (newProfile) {
      setProfiles([...profiles, newProfile])
      setSelectedProfile(newProfile)
      setIsDropdownOpen(false)
    }
  }

  return (
    <div className="relative flex items-center justify-center gap-4">
      {/* Wallet Section - Always Visible */}
      <div className="flex items-center bg-gray-100 px-2 py-1 border rounded-lg">
        <Wallet className="w-6 h-6 text-gray-500 mr-3" />
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 font-semibold">FC Wallet</span>
          <span className="text-sm font-semibold text-black">₹ {balance}</span>
        </div>
      </div>

      {/* Profile Section */}
      <div className="relative lg:mr-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={toggleDropdown}>
          <div className="w-8 h-8 bg-pink-600 text-white flex items-center justify-center rounded-full font-bold ">
            {selectedProfile.charAt(0)}
          </div>
          {!isSmallScreen && <span className="text-sm font-medium">Hi, {selectedProfile}</span>}
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 w-48 bg-white shadow-md rounded-lg overflow-hidden z-50">
            <ul className="text-sm text-gray-700">
              <li className="px-4 py-2 font-medium">Hi, {selectedProfile}</li>
              <li className="border-t border-gray-200"></li>
              {profiles.map((profile, index) => (
                <li
                  key={index}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                  onClick={() => switchProfile(profile)}
                >
                  <User className="w-4 h-4 mr-2" />
                  {profile}
                </li>
              ))}
              <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center" onClick={addNewProfile}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Add New Profile
              </li>
              <li className="border-t border-gray-200"></li>
              <li
                className="px-4 py-2 text-red-500 hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default WalletProfile
