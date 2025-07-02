
import fetch from "node-fetch"

async function analyzeAirportsCSV() {
  try {
    console.log("Fetching CSV file...")
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/updated%20Airport%201-wLhXQNM48P4nnKKRl4H1UjQWJLDP2W.csv",
    )
    const csvText = await response.text()

    console.log("CSV file fetched successfully!")
    console.log("File size:", csvText.length, "characters")

    // Split into lines and analyze structure
    const lines = csvText.split("\n")
    console.log("Total lines:", lines.length)

    // Show first few lines to understand structure
    console.log("\n--- First 10 lines ---")
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      console.log(`Line ${i + 1}: ${lines[i]}`)
    }

    // Analyze headers
    if (lines.length > 0) {
      const headers = lines[0].split(",")
      console.log("\n--- Headers ---")
      headers.forEach((header, index) => {
        console.log(`Column ${index + 1}: ${header.trim()}`)
      })
    }

    // Show some sample data
    console.log("\n--- Sample Data (lines 2-5) ---")
    for (let i = 1; i < Math.min(5, lines.length); i++) {
      const columns = lines[i].split(",")
      console.log(
        `Row ${i}:`,
        columns.map((col) => col.trim()),
      )
    }

    return csvText
  } catch (error) {
    console.error("Error fetching CSV:", error)
  }
}

// Run the analysis
analyzeAirportsCSV()
