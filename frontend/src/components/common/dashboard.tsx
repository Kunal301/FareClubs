import React from "react"
// import { useNavigate } from "react-router-dom"
// import { ArrowLeftRight, Calendar, Users, Plane, Building2, Car, Bus } from "lucide-react"
// import { Lock, Phone } from "lucide-react"
import  Navbar from "../Home/Navbar"
import Cards from "../Home/Cards"
import Footer from "../Home/Footer"
import Search from "../Home/Search"
interface DashboardProps {
    sessionId: string
  }

const Dashboard: React.FC<DashboardProps> = ({ sessionId }) => {
   
  return(
  <>
  
    <Navbar />
    <Search sessionId={sessionId} />
    <Cards />
    <Footer />
    
    </>
  )
}

export default Dashboard

