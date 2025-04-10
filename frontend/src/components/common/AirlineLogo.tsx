"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface AirlineLogoProps {
  airline: string
  size?: "sm" | "md" | "lg"
  className?: string
}

// Map of airline codes/names to their image paths
const AIRLINE_IMAGE_MAP: Record<string, string> = {
  // Airline codes
  "6E": "/images/indigo.png",
  AI: "/images/airindia.png",
  IX: "/images/airindia-express.png",
  QP: "/images/akasaair.jpeg",
  SG: "/images/spicejet.png",
  "9I": "/images/allianceair.jpeg",
  UK: "/images/vistara.png",
  G8: "/images/goair.png",

  // Airline names (normalized to uppercase)
  INDIGO: "/images/indigo.png",
  "AIR INDIA": "/images/airindia.png",
  "AIR INDIA EXPRESS": "/images/airindia-express.png",
  "AKASA AIR": "/images/akasaair.jpeg",
  SPICEJET: "/images/spicejet.png",
  "ALLIANCE AIR": "/images/allianceair.jpeg",
  VISTARA: "/images/vistara.png",
  GOAIR: "/images/goair.png",
}

export const AirlineLogo: React.FC<AirlineLogoProps> = ({ airline, size = "md", className = "" }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)

  // Size classes
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  }

  useEffect(() => {
    // Try to find the image path for this airline
    const normalizedAirline = airline.trim().toUpperCase()

    // First try direct match
    let imagePath = AIRLINE_IMAGE_MAP[normalizedAirline]

    // If no direct match, try to find a partial match
    if (!imagePath) {
      // Check if the airline name contains any of our known airlines
      const matchingAirline = Object.keys(AIRLINE_IMAGE_MAP).find(
        (key) => normalizedAirline.includes(key) || key.includes(normalizedAirline),
      )

      if (matchingAirline) {
        imagePath = AIRLINE_IMAGE_MAP[matchingAirline]
      }
    }

    if (imagePath) {
      // Check if the image exists
      const img = new Image()
      img.onload = () => {
        setImageSrc(imagePath)
        setImageLoaded(true)
      }
      img.onerror = () => {
        console.log(`Failed to load airline image for ${airline}`)
        setImageSrc(null)
        setImageLoaded(false)
      }
      img.src = imagePath
    } else {
      setImageSrc(null)
      setImageLoaded(false)
    }
  }, [airline])

  // Get initials for fallback
  const getInitials = () => {
    return airline
      .split(" ")
      .map((word) => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gray-100 flex items-center justify-center ${className}`}
      style={
        imageLoaded && imageSrc
          ? { backgroundImage: `url(${imageSrc})`, backgroundSize: "cover", backgroundPosition: "center" }
          : {}
      }
    >
      {(!imageLoaded || !imageSrc) && <span className="text-xs font-bold text-gray-500">{getInitials()}</span>}
    </div>
  )
}

