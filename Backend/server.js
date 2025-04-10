import express from "express"
import cors from "cors"
import axios from "axios"

const app = express()
app.use(
  cors({
    origin: "http://localhost:3000", // Allow requests from your React app
    credentials: true,
  }),
)

app.use(express.json())

const SHARED_API_BASE_URL = "http://Sharedapi.tektravels.com/SharedData.svc/rest"
const AIR_API_BASE_URL = "http://api.tektravels.com/BookingEngineService_Air/AirService.svc/rest"

// Authentication endpoint
app.post("/api/auth", async (req, res) => {
  try {
    console.log("Authentication request:", JSON.stringify(req.body, null, 2))

    const response = await axios.post(`${SHARED_API_BASE_URL}/Authenticate`, req.body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("Authentication response:", JSON.stringify(response.data, null, 2))

    if (response.headers["set-cookie"]) {
      response.headers["set-cookie"].forEach((cookie) => {
        res.setHeader("Set-Cookie", cookie)
      })
    }

    res.json(response.data)
  } catch (error) {
    console.error("Authentication error:", error.response?.data || error.message)
    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Description || "Authentication failed",
      StatusCode: error.response?.status || 500,
    })
  }
})

// Logout endpoint
app.post("/api/logout", async (req, res) => {
  try {
    console.log("Logout request:", JSON.stringify(req.body, null, 2))

    const response = await axios.post(`${SHARED_API_BASE_URL}/Logout`, req.body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("Logout response:", JSON.stringify(response.data, null, 2))
    res.json(response.data)
  } catch (error) {
    console.error("Logout error:", error.response?.data || error.message)
    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Description || "Logout failed",
      StatusCode: error.response?.status || 500,
    })
  }
})

// Get Agency Balance endpoint
app.post("/api/balance", async (req, res) => {
  try {
    console.log("Balance request:", JSON.stringify(req.body, null, 2))

    const response = await axios.post(`${SHARED_API_BASE_URL}/GetAgencyBalance`, req.body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("Balance response:", JSON.stringify(response.data, null, 2))
    res.json(response.data)
  } catch (error) {
    console.error("Balance error:", error.response?.data || error.message)
    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Description || "Failed to get balance",
      StatusCode: error.response?.status || 500,
    })
  }
})

// Search endpoint
app.post("/api/search", async (req, res) => {
  try {
    console.log("Search request:", JSON.stringify(req.body, null, 2))

    // Validate the request
    if (!req.body.TokenId) {
      return res.status(400).json({
        Status: "Failed",
        Description: "TokenId is required",
        StatusCode: 400,
      })
    }

    if (!req.body.JourneyType || !["1", "2", "3"].includes(req.body.JourneyType)) {
      return res.status(400).json({
        Status: "Failed",
        Description: "Valid JourneyType (1, 2, or 3) is required",
        StatusCode: 400,
      })
    }

    if (!req.body.Segments || !Array.isArray(req.body.Segments) || req.body.Segments.length === 0) {
      return res.status(400).json({
        Status: "Failed",
        Description: "At least one segment is required",
        StatusCode: 400,
      })
    }

    // For round trip (JourneyType 2), ensure there are exactly 2 segments
    if (req.body.JourneyType === "2" && req.body.Segments.length !== 2) {
      return res.status(400).json({
        Status: "Failed",
        Description: "Round trip requires exactly 2 segments",
        StatusCode: 400,
      })
    }

    // For multi-city (JourneyType 3), ensure there are at least 2 segments
    if (req.body.JourneyType === "3" && req.body.Segments.length < 1) {
      return res.status(400).json({
        Status: "Failed",
        Description: "Multi-city trip requires at least 1 segment",
        StatusCode: 400,
      })
    }

    // Add this detailed logging for multi-city searches
    if (req.body.JourneyType === "3") {
      console.log("Multi-city search detected with segments:")
      req.body.Segments.forEach((segment, index) => {
        console.log(
          `Segment ${index + 1}: ${segment.Origin} to ${segment.Destination} on ${segment.PreferredDepartureTime}`,
        )
      })
    }

    // For round trip (JourneyType 2), ensure the segments are correctly set up
    if (req.body.JourneyType === "2") {
      console.log("Round trip search detected. Validating segments...")

      // Ensure segment 1 is from origin to destination
      const segment1 = req.body.Segments[0]

      // Ensure segment 2 is from destination back to origin
      const segment2 = req.body.Segments[1]

      console.log(`Segment 1: ${segment1.Origin} to ${segment1.Destination}`)
      console.log(`Segment 2: ${segment2.Origin} to ${segment2.Destination}`)

      // Verify that segment2 origin matches segment1 destination
      if (segment1.Destination !== segment2.Origin) {
        console.warn(
          `Warning: Return segment origin (${segment2.Origin}) does not match outbound destination (${segment1.Destination})`,
        )
      }

      // Verify that segment2 destination matches segment1 origin
      if (segment1.Origin !== segment2.Destination) {
        console.warn(
          `Warning: Return segment destination (${segment2.Destination}) does not match outbound origin (${segment1.Origin})`,
        )
      }
    }

    // IMPORTANT FIX: For multi-city searches, we'll make individual one-way searches for each segment
    // This ensures consistent pricing between one-way and multi-city searches
    if (req.body.JourneyType === "3") {
      console.log("Processing multi-city search by making individual segment searches")

      const allResults = []

      // Make individual searches for each segment
      for (let i = 0; i < req.body.Segments.length; i++) {
        const segment = req.body.Segments[i]

        // Create a one-way search request for this segment
        const segmentRequest = {
          ...req.body,
          JourneyType: "1", // One-way
          Segments: [segment], // Just this segment
        }

        console.log(`Making one-way search for segment ${i + 1}: ${segment.Origin} to ${segment.Destination}`)

        try {
          const segmentResponse = await axios.post(`${AIR_API_BASE_URL}/Search`, segmentRequest, {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          })

          if (segmentResponse.data.Response && segmentResponse.data.Response.Results) {
            // Add segment index to each result for identification
            const segmentResults = segmentResponse.data.Response.Results

            // Flatten if needed and add segment index
            let flatResults = Array.isArray(segmentResults[0]) ? segmentResults.flat() : segmentResults

            // Add the segment index to each result
            flatResults = flatResults.map((result) => {
              if (result && result.Segments && result.Segments.length > 0 && result.Segments[0].length > 0) {
                result.Segments[0].forEach((seg) => {
                  seg.SegmentIndex = i
                })
              }
              return result
            })

            allResults.push(flatResults)
            console.log(`Found ${flatResults.length} flights for segment ${i + 1}`)
          } else {
            console.log(`No results found for segment ${i + 1}`)
            allResults.push([]) // Empty array for this segment
          }
        } catch (error) {
          console.error(`Error searching for segment ${i + 1}:`, error.message)
          allResults.push([]) // Empty array for this segment on error
        }
      }

      // Construct a response similar to the API's format
      const multiCityResponse = {
        Response: {
          ResponseStatus: 1,
          Error: { ErrorCode: 0, ErrorMessage: "" },
          TraceId: req.body.TokenId + "-multi-" + Date.now(),
          Results: allResults,
        },
      }

      console.log(`Returning multi-city results with ${allResults.length} segments`)
      return res.json(multiCityResponse)
    }

    // For one-way and round-trip, proceed with normal API call
    const response = await axios.post(`${AIR_API_BASE_URL}/Search`, req.body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("Search response status:", response.status)
    console.log("Full API response:", JSON.stringify(response.data, null, 2))

    // Check if we have results or an error
    if (response.data.Response && response.data.Response.ResponseStatus === 2) {
      console.log("API returned an error:", response.data.Response.Error)
    }

    // For round trips, ensure we have both outbound and return flights
    if (req.body.JourneyType === "2" && response.data.Response && response.data.Response.Results) {
      const results = response.data.Response.Results

      // Log the structure of the results
      console.log(
        "Results structure:",
        JSON.stringify(
          results.map((r) => typeof r),
          null,
          2,
        ),
      )

      // Check if results is an array of arrays or just a flat array
      if (Array.isArray(results) && results.length > 0) {
        const flattened = Array.isArray(results[0]) ? results.flat() : results

        // Count outbound and return flights
        let outboundCount = 0
        let returnCount = 0

        flattened.forEach((flight) => {
          if (
            flight &&
            flight.Segments &&
            flight.Segments.length > 0 &&
            flight.Segments[0].length > 0 &&
            flight.Segments[0][0]
          ) {
            const tripIndicator = flight.Segments[0][0].TripIndicator
            if (tripIndicator === 1) outboundCount++
            if (tripIndicator === 2) returnCount++
          }
        })

        console.log(`Found ${outboundCount} outbound flights and ${returnCount} return flights`)

        // If we have no return flights, log a warning
        if (returnCount === 0) {
          console.warn("No return flights found in the API response for round trip search!")
        }
      }
    }

    res.json(response.data)
  } catch (error) {
    console.error("Search error:", error.response?.data || error.message)
    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Error?.ErrorMessage || "Search failed",
      StatusCode: error.response?.status || 500,
    })
  }
})

// FareQuote endpoint
app.post("/api/farequote", async (req, res) => {
  try {
    console.log("FareQuote request:", JSON.stringify(req.body, null, 2))

    const response = await axios.post(`${AIR_API_BASE_URL}/FareQuote`, req.body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("FareQuote response status:", response.status)
    res.json(response.data)
  } catch (error) {
    console.error("FareQuote error:", error.response?.data || error.message)
    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Error?.ErrorMessage || "FareQuote failed",
      StatusCode: error.response?.status || 500,
    })
  }
})

// Book endpoint
app.post("/api/book", async (req, res) => {
  try {
    console.log("Book request:", JSON.stringify(req.body, null, 2))

    const response = await axios.post(`${AIR_API_BASE_URL}/Book`, req.body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("Book response status:", response.status)
    res.json(response.data)
  } catch (error) {
    console.error("Book error:", error.response?.data || error.message)
    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Error?.ErrorMessage || "Booking failed",
      StatusCode: error.response?.status || 500,
    })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
