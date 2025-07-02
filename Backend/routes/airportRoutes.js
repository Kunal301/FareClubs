import express from "express"
import Airport from "../models/Airport.js"
import Airline from "../models/Airline.js"

const router = express.Router()

// Helper function to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // $& means the matched substring
}

// Search airports with autocomplete
router.get("/search", async (req, res) => {
  try {
    const { q, limit = 10, country } = req.query

    if (!q || q.length < 2) {
      return res.json([])
    }

    // Escape special regex characters in the query
    const escapedSearchQuery = escapeRegExp(q.toLowerCase().trim())
    const limitNum = Math.min(Number.parseInt(limit) || 10, 50) // Max 50 results

    // Build MongoDB query
    const query = {
      isActive: true,
      $or: [
        { iataCode: { $regex: escapedSearchQuery, $options: "i" } },
        { icaoCode: { $regex: escapedSearchQuery, $options: "i" } },
        { cityName: { $regex: escapedSearchQuery, $options: "i" } },
        { airportName: { $regex: escapedSearchQuery, $options: "i" } },
        // Ensure searchText field exists and is properly indexed if used
        { searchText: { $regex: escapedSearchQuery, $options: "i" } },
      ],
    }

    // Add country filter if specified
    if (country) {
      query.countryCode = country.toUpperCase()
    }

    const airports = await Airport.find(query)
      .select("iataCode icaoCode airportName cityName countryName countryCode")
      .limit(limitNum)
      .sort({
        // Prioritize exact IATA code matches
        iataCode: 1,
        cityName: 1,
        airportName: 1,
      })
      .lean()

    // Format response for frontend
    const formattedResults = airports.map((airport) => ({
      code: airport.iataCode,
      icaoCode: airport.icaoCode,
      name: airport.airportName,
      city: airport.cityName,
      country: airport.countryName,
      countryCode: airport.countryCode,
      displayText: `${airport.cityName} (${airport.iataCode})`,
      fullDisplayText: `${airport.airportName}, ${airport.cityName}, ${airport.countryName} (${airport.iataCode})`,
    }))

    res.json(formattedResults)
  } catch (error) {
    console.error("Airport search error:", error)
    res.status(500).json({
      error: "Failed to search airports",
      message: error.message,
    })
  }
})

// Get airport by IATA code
router.get("/:code", async (req, res) => {
  try {
    const { code } = req.params

    if (!code || code.length !== 3) {
      return res.status(400).json({ error: "Invalid IATA code" })
    }

    const airport = await Airport.findOne({
      iataCode: code.toUpperCase(),
      isActive: true,
    }).lean()

    if (!airport) {
      return res.status(404).json({ error: "Airport not found" })
    }

    res.json({
      code: airport.iataCode,
      icaoCode: airport.icaoCode,
      name: airport.airportName,
      city: airport.cityName,
      country: airport.countryName,
      countryCode: airport.countryCode,
      stateProvince: airport.stateProvince,
      latitude: airport.latitude,
      longitude: airport.longitude,
      timezone: airport.timezone,
    })
  } catch (error) {
    console.error("Get airport error:", error)
    res.status(500).json({
      error: "Failed to get airport",
      message: error.message,
    })
  }
})

// Get popular airports (most searched/used)
router.get("/popular/:country?", async (req, res) => {
  try {
    // Add a console log to confirm this route is hit
    console.log("Backend: /api/airports/popular route hit.")

    // Prevent caching for this endpoint
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    res.set("Pragma", "no-cache")
    res.set("Expires", "0")
    res.set("Surrogate-Control", "no-store")

    const { country } = req.params
    const { limit = 20 } = req.query

    // Define popular Indian airports (you can expand this)
    const popularIataCodes = [
      "DEL",
      "BOM",
      "BLR",
      "MAA",
      "CCU",
      "HYD",
      "AMD",
      "COK",
      "GOI",
      "PNQ",
      "JAI",
      "LKO",
      "IXC",
      "GAU",
      "BBI",
      "TRV",
      "IXM",
      "IXR",
      "VNS",
      "ATQ",
      "BHO",
      "IDR",
      "CJB",
      "IXE",
    ]

    const query = {
      isActive: true,
      iataCode: { $in: popularIataCodes },
    }

    if (country) {
      query.countryCode = country.toUpperCase()
    }

    const airports = await Airport.find(query)
      .select("iataCode airportName cityName countryName")
      .limit(Number.parseInt(limit))
      .sort({ cityName: 1 })
      .lean()

    const formattedResults = airports.map((airport) => ({
      code: airport.iataCode,
      name: airport.airportName,
      city: airport.cityName,
      country: airport.countryName,
      displayText: `${airport.cityName} (${airport.iataCode})`,
    }))

    // Return an empty array if no popular airports are found
    if (formattedResults.length === 0) {
      console.warn("Backend: No popular airports found for country:", country, "returning empty array.")
      return res.json([])
    }

    res.json(formattedResults)
  } catch (error) {
    console.error("Backend: Get popular airports error:", error)
    res.status(500).json({
      error: "Failed to get popular airports",
      message: error.message,
    })
  }
})

// Search airlines
router.get("/airlines/search", async (req, res) => {
  try {
    const { q, limit = 10 } = req.query

    if (!q || q.length < 1) {
      return res.json([])
    }

    const searchQuery = q.toLowerCase().trim()
    const limitNum = Math.min(Number.parseInt(limit) || 10, 20)

    const airlines = await Airline.find({
      isActive: true,
      $or: [
        { iataCode: { $regex: searchQuery, $options: "i" } },
        { icaoCode: { $regex: searchQuery, $options: "i" } },
        { airlineName: { $regex: searchQuery, $options: "i" } },
      ],
    })
      .select("iataCode icaoCode airlineName logoUrl")
      .limit(limitNum)
      .sort({ airlineName: 1 })
      .lean()

    const formattedResults = airlines.map((airline) => ({
      code: airline.iataCode,
      icaoCode: airline.icaoCode,
      name: airline.airlineName,
      logoUrl: airline.logoUrl || `/images/airlines/${airline.iataCode}.gif`,
      displayText: `${airline.airlineName} (${airline.iataCode})`,
    }))

    res.json(formattedResults)
  } catch (error) {
    console.error("Airline search error:", error)
    res.status(500).json({
      error: "Failed to search airlines",
      message: error.message,
    })
  }
})

export default router
