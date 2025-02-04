import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
)

app.use(express.json())

const API_BASE_URL = "https://corp.fareclubs.com/restwebsvc"

app.post("/api/auth", async (req, res) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/loginV1`, req.body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

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

app.post("/api/air/search", async (req, res) => {
  try {
    const { Data, sessionId } = req.body

    // Construct the exact request format that works in Postman
    const requestData = {
      Data: {
        IsMobileSearchQuery: "N",
        MaxOptionsCount: "10",
        TravelType: "D",
        JourneyType: "O",
        IsPersonalBooking: "N",
        AirOriginDestinations: [
          {
            DepartureAirport: Data.AirOriginDestinations[0].DepartureAirport,
            ArrivalAirport: Data.AirOriginDestinations[0].ArrivalAirport,
            DepartureDate: Data.AirOriginDestinations[0].DepartureDate,
          },
        ],
        AirPassengerQuantities: {
          NumAdults: Data.AirPassengerQuantities.NumAdults,
          NumChildren: 0,
          NumInfants: 0,
        },
        AirSearchPreferences: {
          BookingClass: "G",
          Carrier: "ANY",
        },
        SearchLevelReportingParams: {
          BillingEntityCode: 0,
        },
      },
    }

    console.log("Sending request to API:", JSON.stringify(requestData, null, 2))

    const response = await axios.post(`${API_BASE_URL}/air/searchV1`, requestData, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `JSESSIONID=${sessionId}`,
      },
    })

    console.log("Raw API response:", JSON.stringify(response.data, null, 2))

    // Send the complete response without processing
    res.json(response.data)
  } catch (error) {
    console.error("Air search error:", error.response?.data || error.message)
    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Description || "Air search failed",
      StatusCode: error.response?.status || 500,
    })
  }
})

app.post("/api/air/reprice", async (req, res) => {
  try {
    const { SearchFormData, AirOriginDestinationOptions } = req.body
    const sessionId = req.headers.cookie.split("JSESSIONID=")[1]

    const response = await axios.post(
      `${API_BASE_URL}/air/repriceV1`,
      {
        Data: {
          SearchFormData,
          AirOriginDestinationOptions,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Cookie: `JSESSIONID=${sessionId}`,
        },
      },
    )

    res.json(response.data)
  } catch (error) {
    console.error("Air reprice error:", error.response?.data || error.message)
    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Description || "Air reprice failed",
      StatusCode: error.response?.status || 500,
    })
  }
})

app.post("/api/air/book", async (req, res) => {
  try {
    const { SearchFormData, CartData, CartBookingId, Passengers, DeliveryInfo, MetaInfos, PaymentMethod } = req.body
    const sessionId = req.headers.cookie.split("JSESSIONID=")[1]

    const response = await axios.post(
      `${API_BASE_URL}/air/bookV1`,
      {
        Data: {
          SearchFormData,
          CartData,
          CartBookingId,
          Passengers,
          DeliveryInfo,
          MetaInfos,
          PaymentMethod,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Cookie: `JSESSIONID=${sessionId}`,
        },
      },
    )

    res.json(response.data)
  } catch (error) {
    console.error("Air booking error:", error.response?.data || error.message)
    res.status(error.response?.status || 500).json({
      Status: "Failed",
      Description: error.response?.data?.Description || "Air booking failed",
      StatusCode: error.response?.status || 500,
    })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

