"use client"

import type React from "react"
import Navbar from "../Home/Navbar"
import Cards from "../Home/Cards"
import Footer from "../Home/Footer"
import Search from "../Home/Search"
interface DashboardProps {
  sessionId: string
}

const Dashboard: React.FC<DashboardProps> = ({ sessionId }) => {
  return (
    <>
      <Navbar />
      <Search sessionId={sessionId} />
      <Cards />
      <Footer />
    </>
  )
}

export default Dashboard
