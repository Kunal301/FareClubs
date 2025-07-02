import express from "express"
import { getBookingDetails, ticket } from "./airControllers.js"

const router = express.Router()

// Existing route
router.post("/booking-details", getBookingDetails)

// New ticket route
router.post("/ticket", ticket)

export default router
