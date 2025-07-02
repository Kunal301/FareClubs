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

// useEffect(() => {
  //   // Clear any existing search parameters when dashboard mounts
  //   localStorage.removeItem("searchParams")
  //   localStorage.removeItem("sessionId")
  // }, [])

  // const navigate = useNavigate()
  // const [searchParams, setSearchParams] = React.useState({
  //   tripType: "one-way",
  //   from: "",
  //   to: "",
  //   date: "",
  //   passengers: 1,
  // })

  // const handleSearch = (e: React.FormEvent) => {
  //   e.preventDefault()
  //   navigate("/search-results", {
  //     state: {
  //       searchParams: {
  //         from: searchParams.from,
  //         to: searchParams.to,
  //         date: searchParams.date,
  //         passengers: searchParams.passengers,
  //       },
  //       sessionId,
  //       shouldSearch: true,
  //     },
  //   })
  // }

  // return (
  //   <Cards>
  //   <div className="min-h-screen bg-gradient-to-r from-pink-500 via-purple-500 to-blue-600">
  //     <div className="container mx-auto px-4 py-8">
  //       {/* Logo and Navigation */}
  //       <div className="mb-8">
  //         <h1 className="text-3xl font-bold text-white mb-6">FareClubs</h1>
  //         <div className="flex space-x-4 bg-white rounded-lg p-2 ">
  //           <button className="flex items-center space-x-2 px-4 py-2 bg-pink-500 text-white rounded-md">
  //             <Plane className="w-4 h-4" />
  //             <span>Flights</span>
  //           </button>
  //           <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
  //             <Building2 className="w-4 h-4" />
  //             <span>Hotels</span>
  //           </button>
  //           <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
  //             <Car className="w-4 h-4" />
  //             <span>Holidays</span>
  //           </button>
  //           <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
  //             <Bus className="w-4 h-4" />
  //             <span>Buses</span>
  //           </button>
  //         </div>
  //       </div>

  //       {/* Search Form */}
  //       <div className="bg-white rounded-2xl shadow-xl p-6 mb-12">
  //         <div className="flex space-x-4 mb-6">
  //           <label className="flex items-center">
  //             <input
  //               type="radio"
  //               name="tripType"
  //               required
  //               value="one-way"
  //               checked={searchParams.tripType === "one-way"}
  //               onChange={(e) => setSearchParams({ ...searchParams, tripType: e.target.value })}
  //               className="mr-2"
  //             />
  //             One way
  //           </label>
  //           <label className="flex items-center">
  //             <input
  //               type="radio"
  //               required
  //               name="tripType"
  //               value="round-trip"
  //               checked={searchParams.tripType === "round-trip"}
  //               onChange={(e) => setSearchParams({ ...searchParams, tripType: e.target.value })}
  //               className="mr-2"
  //             />
  //             Round Trip
  //           </label>
  //         </div>

  //         <form onSubmit={handleSearch} className="grid md:grid-cols-12 gap-4">
  //           <div className="md:col-span-3">
  //             <input
  //               type="text"
  //               required
  //               placeholder="From: New Delhi (DEL)"
  //               className="w-full p-3 border rounded-lg"
  //               value={searchParams.from}
  //               onChange={(e) => setSearchParams({ ...searchParams, from: e.target.value })}
  //             />
  //           </div>
  //           <div className="md:col-span-1 flex items-center justify-center">
  //             <button
  //               type="button"
  //               className="p-2 hover:bg-gray-100 rounded-full"
  //               onClick={() => setSearchParams({ ...searchParams, from: searchParams.to, to: searchParams.from })}
  //             >
  //               <ArrowLeftRight className="w-6 h-6" />
  //             </button>
  //           </div>
  //           <div className="md:col-span-3">
  //             <input
  //               type="text"
  //               required
  //               placeholder="To: Mumbai (BOM)"
  //               className="w-full p-3 border rounded-lg"
  //               value={searchParams.to}
  //               onChange={(e) => setSearchParams({ ...searchParams, to: e.target.value })}
  //             />
  //           </div>
  //           <div className="md:col-span-2">
  //             <div className="relative">
  //               <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
  //               <input
  //                 type="date"
  //                 required
  //                 className="w-full p-3 pl-10 border rounded-lg"
  //                 value={searchParams.date}
  //                 onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
  //               />
  //             </div>
  //           </div>
  //           <div className="md:col-span-2">
  //             <div className="relative">
  //               <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
  //               <select
  //                 className="w-full p-3 pl-10 border rounded-lg appearance-none"
  //                 value={searchParams.passengers}
  //                 onChange={(e) => setSearchParams({ ...searchParams, passengers: Number(e.target.value) })}
  //               >
  //                 <option value={1}>1 Passenger</option>
  //                 <option value={2}>2 Passengers</option>
  //                 <option value={3}>3 Passengers</option>
  //               </select>
  //             </div>
  //           </div>
  //           <div className="md:col-span-1">
  //             <button
  //               type="submit"
  //               className="w-full h-full bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
  //             >
  //               Search
  //             </button>
  //           </div>
  //         </form>
  //       </div>

  //       {/* Promotional Banners */}
  //       <h2 className="text-2xl font-semibold text-white mb-6">Cheap Flight Tickets Prices are at FareClubs!</h2>
  //       <div className="grid md:grid-cols-3 gap-6 mb-12">
  //         <div className="bg-white rounded-lg overflow-hidden shadow-lg">
  //           <img src="/images/icici-offer.jpg" alt="ICICI Bank Offer" className="w-full h-48 object-cover" />
  //           <div className="p-4">
  //             <h3 className="font-bold">Flat 10% off</h3>
  //             <p className="text-sm text-gray-600">on Flights with ICICI Bank</p>
  //           </div>
  //         </div>
  //         <div className="bg-white rounded-lg overflow-hidden shadow-lg">
  //           <img src="/images/federal-bank-offer.jpg" alt="Federal Bank Offer" className="w-full h-48 object-cover" />
  //           <div className="p-4">
  //             <h3 className="font-bold">Up to 15% off</h3>
  //             <p className="text-sm text-gray-600">on Flights with Federal Bank Credit and Debit Cards</p>
  //           </div>
  //         </div>
  //         <div className="bg-white rounded-lg overflow-hidden shadow-lg">
  //           <img src="/images/hdfc-offer.jpg" alt="HDFC Bank Offer" className="w-full h-48 object-cover" />
  //           <div className="p-4">
  //             <h3 className="font-bold">Up to ₹5000 off + No-Cost EMI</h3>
  //             <p className="text-sm text-gray-600">on Flights</p>
  //           </div>
  //         </div>
  //       </div>

  //       {/* Destination Packages */}
  //       <div className="grid md:grid-cols-3 gap-6 mb-12">
  //         <div className="relative rounded-lg overflow-hidden">
  //           <img src="/images/packages-banner.jpg" alt="Explore Packages" className="w-full h-64 object-cover" />
  //           <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
  //             <div className="text-white text-center">
  //               <h3 className="text-2xl font-bold mb-2">Explore</h3>
  //               <p>Packages</p>
  //             </div>
  //           </div>
  //         </div>
  //         <div className="relative rounded-lg overflow-hidden">
  //           <img src="/images/dubai-banner.jpg" alt="Dubai" className="w-full h-64 object-cover" />
  //           <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
  //             <div className="text-white text-center">
  //               <h3 className="text-2xl font-bold mb-2">Dubai</h3>
  //               <p>Land of Luxury</p>
  //               <p className="text-sm">Starting ₹45,099</p>
  //             </div>
  //           </div>
  //         </div>
  //         <div className="relative rounded-lg overflow-hidden">
  //           <img src="/images/sri-lanka-banner.jpg" alt="Sri Lanka" className="w-full h-64 object-cover" />
  //           <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
  //             <div className="text-white text-center">
  //               <h3 className="text-2xl font-bold mb-2">Sri Lanka</h3>
  //               <p>The Island of serenity</p>
  //               <p className="text-sm">Starting ₹45,999</p>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       {/* Trust Indicators */}
  //       <div className="grid md:grid-cols-4 gap-8">
  //         <div className="text-center">
  //           <div className="w-24 h-24 mx-auto mb-4 relative">
  //             <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-spin"></div>
  //             <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
  //               <Users className="w-8 h-8 text-red-500" />
  //             </div>
  //           </div>
  //           <h3 className="font-bold text-white mb-2">More Than 25 Million Monthly Visitors</h3>
  //           <p className="text-sm text-gray-100">
  //             Thanks to its easy-to-use and secure payment infrastructure where you can compare hundreds of flights.
  //           </p>
  //         </div>
  //         <div className="text-center">
  //           <div className="w-24 h-24 mx-auto mb-4 relative">
  //             <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-spin"></div>
  //             <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
  //               <Calendar className="w-8 h-8 text-red-500" />
  //             </div>
  //           </div>
  //           <h3 className="font-bold text-white mb-2">Book Your Ticket in 2 Minutes</h3>
  //           <p className="text-sm text-gray-100">
  //             Creating the opportunity to compare numerous companies with its easy-to-use and secure payment
  //             infrastructure.
  //           </p>
  //         </div>
  //         <div className="text-center">
  //           <div className="w-24 h-24 mx-auto mb-4 relative">
  //             <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-spin"></div>
  //             <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
  //               <Lock className="w-8 h-8 text-red-500" />
  //             </div>
  //           </div>
  //           <h3 className="font-bold text-white mb-2">Secure Payment</h3>
  //           <p className="text-sm text-gray-100">
  //             You can make all your flight ticket purchases easily, quickly, and reliably from your home, office, or
  //             with your mobile phone.
  //           </p>
  //         </div>
  //         <div className="text-center">
  //           <div className="w-24 h-24 mx-auto mb-4 relative">
  //             <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-spin"></div>
  //             <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
  //               <Phone className="w-8 h-8 text-red-500" />
  //             </div>
  //           </div>
  //           <h3 className="font-bold text-white mb-2">24/7 Live Support</h3>
  //           <p className="text-sm text-gray-100">
  //             Our customer service team is ready to support you 24/7 for all transactions you make through our Mobile
  //             Applications.
  //           </p>
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  