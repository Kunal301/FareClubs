import express from "express"
import cors from "cors"
import axios from "axios"
import mongoose from "mongoose"
import airportRoutes from "./routes/airportRoutes.js"

const app = express()
app.use(
  cors({
    origin: "https://fareclubs-flightengine.onrender.com", // Allow requests from your React app
    credentials: true,
  }),
)

app.use(express.json())

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/fareclubs"

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Use airport routes
app.use("/api/airports", airportRoutes)

const SHARED_API_BASE_URL = "https://Sharedapi.tektravels.com/SharedData.svc/rest"
const AIR_API_BASE_URL = "https://api.tektravels.com/BookingEngineService_Air/AirService.svc/rest"

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
          TraceId: req.body.TokenId,
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

app.get("/api/health", (req, res) => {
  res.status(200).send("Server is healthy")
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

// Alias for /api/book to support /api/air/book requests
app.post("/api/air/book", async (req, res) => {
  try {
    console.log("Book request (via /api/air/book):", JSON.stringify(req.body, null, 2))

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

app.post("/api/farerule", async (req, res) => {
  try {
    console.log("FareRule request:", JSON.stringify(req.body, null, 2))

    if (!AIR_API_BASE_URL) {
      console.error("AIR_API_BASE_URL environment variable is not set")
      return res.status(500).json({
        Status: "Failed",
        Description: "API base URL is not configured. Please set AIR_API_BASE_URL environment variable.",
        StatusCode: 500,
      })
    }

    // Validate the ResultIndex
    if (!req.body.ResultIndex) {
      console.error("Missing ResultIndex in request")
      return res.status(400).json({
        Status: "Failed",
        Description: "ResultIndex is required",
        StatusCode: 400,
        Response: {
          Error: {
            ErrorCode: 400,
            ErrorMessage: "Missing ResultIndex",
          },
        },
      })
    }

    // Log the ResultIndex length for debugging
    console.log("ResultIndex length:", req.body.ResultIndex.length)

    const response = await axios.post(`${AIR_API_BASE_URL}/FareRule`, req.body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000, // Add a timeout to prevent hanging requests
    })

    console.log("FareRule response status:", response.status)
    console.log("FareRule response data:", JSON.stringify(response.data, null, 2))

    // Check if the response contains an error
    if (
      response.data.Response &&
      response.data.Response.Error &&
      response.data.Response.Error.ErrorMessage &&
      response.data.Response.Error.ErrorMessage.trim() !== ""
    ) {
      console.error("FareRule API returned an error:", response.data.Response.Error)

      // Return a more user-friendly response
      return res.status(200).json({
        Status: "Success",
        Response: {
          Error: response.data.Response.Error,
          FareRules: {
            FareRuleDetail: "No fare rules available for this flight.",
          },
        },
      })
    }

    // Pass through the response as is
    res.json(response.data)
  } catch (error) {
    console.error("FareRule error:", error.message)
    if (error.response) {
      console.error("FareRule error response:", error.response.data)
      console.error("FareRule error status:", error.response.status)
    }

    // Return a structured error response
    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Error?.ErrorMessage || error.message || "FareRule failed",
      StatusCode: error.response?.status || 500,
      Response: {
        Error: {
          ErrorCode: error.response?.status || 500,
          ErrorMessage: error.response?.data?.Error?.ErrorMessage || error.message || "Failed to fetch fare rules",
        },
        FareRules: null,
      },
    })
  }
})

app.post("/api/ssr", async (req, res) => {
  try {
    console.log("SSR request:", JSON.stringify(req.body, null, 2))

    if (!AIR_API_BASE_URL) {
      console.error("AIR_API_BASE_URL environment variable is not set")
      return res.status(500).json({
        Status: "Failed",
        Description: "API base URL is not configured. Please set AIR_API_BASE_URL environment variable.",
        StatusCode: 500,
      })
    }

    // Validate required parameters
    if (!req.body.TokenId || !req.body.TraceId || !req.body.ResultIndex) {
      console.error("Missing required parameters in SSR request")
      return res.status(400).json({
        Status: "Failed",
        Description: "TokenId, TraceId, and ResultIndex are required",
        StatusCode: 400,
        Response: {
          Error: {
            ErrorCode: 400,
            ErrorMessage: "Missing required parameters",
          },
        },
      })
    }

    console.log(
      `Making SSR API call to ${AIR_API_BASE_URL}/SSR with TokenId: ${req.body.TokenId}, TraceId: ${req.body.TraceId}, ResultIndex: ${req.body.ResultIndex}`,
    )

    const response = await axios.post(`${AIR_API_BASE_URL}/SSR`, req.body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000, // Add a timeout to prevent hanging requests
    })

    console.log("SSR response status:", response.status)
    console.log("SSR response data:", JSON.stringify(response.data, null, 2))

    // Check if the response contains an error
    if (
      response.data.Response &&
      response.data.Response.Error &&
      response.data.Response.Error.ErrorMessage &&
      response.data.Response.Error.ErrorMessage.trim() !== ""
    ) {
      console.error("SSR API returned an error:", response.data.Response.Error)

      // Return a more user-friendly response
      return res.status(200).json({
        Status: "Success",
        Response: {
          Error: response.data.Response.Error,
          SSROptions: null,
        },
      })
    }

    // Pass through the response as is
    res.json(response.data)
  } catch (error) {
    console.error("SSR error:", error.message)
    if (error.response) {
      console.error("SSR error response:", error.response.data)
      console.error("SSR error status:", error.response.status)
    }

    // Return a structured error response
    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Error?.ErrorMessage || error.message || "SSR request failed",
      StatusCode: error.response?.status || 500,
      Response: {
        Error: {
          ErrorCode: error.response?.status || 500,
          ErrorMessage: error.response?.data?.Error?.ErrorMessage || error.message || "Failed to fetch SSR options",
        },
        SSROptions: null,
      },
    })
  }
})

// Add SSR to booking endpoint
app.post("/api/add-ssr", async (req, res) => {
  try {
    console.log("Add SSR request:", JSON.stringify(req.body, null, 2))

    if (!AIR_API_BASE_URL) {
      console.error("AIR_API_BASE_URL environment variable is not set")
      return res.status(500).json({
        Status: "Failed",
        Description: "API base URL is not configured. Please set AIR_API_BASE_URL environment variable.",
        StatusCode: 500,
      })
    }

    // Validate required parameters
    if (!req.body.TokenId || !req.body.BookingId || !req.body.SSROptions) {
      console.error("Missing required parameters in Add SSR request")
      return res.status(400).json({
        Status: "Failed",
        Description: "TokenId, BookingId, and SSROptions are required",
        StatusCode: 400,
        Response: {
          Error: {
            ErrorCode: 400,
            ErrorMessage: "Missing required parameters",
          },
        },
      })
    }

    // For post-booking SSR additions, we use the TicketReIssue endpoint
    const response = await axios.post(`${AIR_API_BASE_URL}/TicketReIssue`, req.body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    })

    console.log("Add SSR response status:", response.status)
    console.log("Add SSR response data:", JSON.stringify(response.data, null, 2))

    // Check if the response contains an error
    if (
      response.data.Response &&
      response.data.Response.Error &&
      response.data.Response.Error.ErrorMessage &&
      response.data.Response.Error.ErrorMessage.trim() !== ""
    ) {
      console.error("Add SSR API returned an error:", response.data.Response.Error)

      return res.status(200).json({
        Status: "Success",
        Response: {
          Error: response.data.Response.Error,
          Result: null,
        },
      })
    }

    // Pass through the response as is
    res.json(response.data)
  } catch (error) {
    console.error("Add SSR error:", error.message)
    if (error.response) {
      console.error("Add SSR error response:", error.response.data)
      console.error("Add SSR error status:", error.response.status)
    }

    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Error?.ErrorMessage || error.message || "Add SSR request failed",
      StatusCode: error.response?.status || 500,
      Response: {
        Error: {
          ErrorCode: error.response?.status || 500,
          ErrorMessage: error.response?.data?.Error?.ErrorMessage || error.message || "Failed to add SSR options",
        },
        Result: null,
      },
    })
  }
})

// Add a new endpoint for LCC ticket booking
app.post("/api/air/ticket", async (req, res) => {
  try {
    console.log("Ticket request:", JSON.stringify(req.body, null, 2))

    const response = await axios.post(`${AIR_API_BASE_URL}/Ticket`, req.body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("Ticket response status:", response.status)
    console.log("Ticket response data:", JSON.stringify(response.data, null, 2))
    res.json(response.data)
  } catch (error) {
    console.error("Ticket error:", error.response?.data || error.message)
    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Error?.ErrorMessage || "Ticketing failed",
      StatusCode: error.response?.status || 500,
    })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
