import mongoose from "mongoose"
import fetch from "node-fetch"
import Airport from "../models/airport.js"

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/fareclubs"

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log("Connected to MongoDB")
  } catch (error) {
    console.error("MongoDB connection error:", error)
    process.exit(1)
  }
}

function parseCSVLine(line) {
  const result = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

async function importAirports() {
  try {
    await connectDB()

    console.log("Fetching CSV file...")
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/updated%20Airport%201-wLhXQNM48P4nnKKRl4H1UjQWJLDP2W.csv",
    )
    const csvText = await response.text()

    const lines = csvText.split("\n").filter((line) => line.trim())
    console.log(`Found ${lines.length} lines in CSV`)

    // Parse headers
    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""))
    console.log("Headers:", headers)

    // Clear existing data
    await Airport.deleteMany({})
    console.log("Cleared existing airport data")

    const airports = []
    let successCount = 0
    let errorCount = 0

    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      try {
        const columns = parseCSVLine(lines[i])

        // Map columns based on common CSV structures
        // Adjust these mappings based on your actual CSV structure
        const airportData = {
          iataCode: columns[4]?.trim() || "", // AIRPORTCODE from CSV
          icaoCode: "", // Not available in this CSV
          airportName: columns[5]?.trim() || "", // AIRPORTNAME from CSV
          cityName: columns[0]?.trim() || "", // CITYNAME from CSV
          countryName: columns[3]?.trim() || "", // COUNTRYNAME from CSV
          countryCode: columns[2]?.trim() || "", // COUNTRYCODE from CSV
          stateProvince: "", // Not available in this CSV
          latitude: null, // Not available in this CSV
          longitude: null, // Not available in this CSV
          timezone: "", // Not available in this CSV
        }

        // Skip if no IATA code
        if (!airportData.iataCode || airportData.iataCode.length !== 3) {
          continue
        }

        airports.push(airportData)
        successCount++

        // Batch insert every 1000 records
        if (airports.length >= 1000) {
          await Airport.insertMany(airports, { ordered: false })
          console.log(`Inserted batch of ${airports.length} airports`)
          airports.length = 0 // Clear array
        }
      } catch (error) {
        errorCount++
        console.error(`Error processing line ${i + 1}:`, error.message)
      }
    }

    // Insert remaining airports
    if (airports.length > 0) {
      await Airport.insertMany(airports, { ordered: false })
      console.log(`Inserted final batch of ${airports.length} airports`)
    }

    console.log(`Import completed: ${successCount} successful, ${errorCount} errors`)

    // Create indexes
    await Airport.createIndexes()
    console.log("Created database indexes")

    // Show some sample data
    const sampleAirports = await Airport.find().limit(5)
    console.log("Sample airports:", sampleAirports)
  } catch (error) {
    console.error("Import error:", error)
  } finally {
    await mongoose.disconnect()
    console.log("Disconnected from MongoDB")
  }
}

// Run the import
importAirports()
