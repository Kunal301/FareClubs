import mongoose from "mongoose"

const airlineSchema = new mongoose.Schema(
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
    airlineName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    countryName: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.model("Airline", airlineSchema)
