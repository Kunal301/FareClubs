import mongoose from "mongoose"

const airportSchema = new mongoose.Schema(
  {
    iataCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    icaoCode: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    airportName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    cityName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    countryName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    countryCode: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    stateProvince: {
      type: String,
      trim: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    timezone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    searchText: {
      type: String,
      index: "text", // For full-text search
    },
  },
  {
    timestamps: true,
  },
)

// Create compound indexes for better search performance
airportSchema.index({ cityName: 1, countryName: 1 })
airportSchema.index({ airportName: 1, cityName: 1 })
airportSchema.index({ iataCode: 1, cityName: 1 })

// Pre-save middleware to create searchText field
airportSchema.pre("save", function (next) {
  this.searchText =
    `${this.iataCode} ${this.icaoCode || ""} ${this.airportName} ${this.cityName} ${this.countryName}`.toLowerCase()
  next()
})

export default mongoose.model("Airport", airportSchema)
