import type React from "react";
import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { Header } from "../common/Header";
interface BookingPageProps {
  flight?: {
    SearchSegmentId: number;
    JourneyTime: number;
    OptionSegmentsInfo: {
      DepartureAirport: string;
      ArrivalAirport: string;
      DepartureTime: string;
      ArrivalTime: string;
      MarketingAirline: string;
      FlightNumber: string;
    }[];
    OptionPriceInfo: {
      TotalPrice: string;
      TotalBasePrice: string;
      TotalTax: string;
    };
  };
}
const getAirlineImage = (airline: string) => {
  const airlineImageMap: { [key: string]: string } = {
    IndiGo: "/images/indigo.png",
    "Air India": "/images/airindia.png",
    "Air India Express": "/images/airindia-express.png",
    "Akasa Air": "/images/akasaair.jpeg",
    "Alliance Air": "/images/allianceair.jpeg",
  };
  return airlineImageMap[airline] || "/images/default-airline.png";
};

const parseDateString = (dateStr: string) => {
  try {
    // First try direct ISO parsing
    let date = parseISO(dateStr);

    // If invalid, try parsing dd/MM/yyyy, HH:mm format
    if (!isValid(date)) {
      const [datePart, timePart] = dateStr.split(", ");
      if (datePart && timePart) {
        const [day, month, year] = datePart.split("/");
        const [hours, minutes] = timePart.split(":");
        date = new Date(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hours),
          Number(minutes)
        );
      }
    }

    // If still invalid, return current date as fallback
    if (!isValid(date)) {
      console.warn(
        `Invalid date string: ${dateStr}, using current date as fallback`
      );
      return new Date();
    }

    return date;
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error);
    return new Date();
  }
};
const calculateDuration = (journeyTimeInSeconds: number): string => {
  const totalSeconds = journeyTimeInSeconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const BookingPage: React.FC<BookingPageProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flight, setFlight] = useState<BookingPageProps["flight"] | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    mobile: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    receiveOffers: true,
    promoCode: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [bookingOptions, setBookingOptions] = useState({
    fareType: "refundable", // or "non-refundable"
    seatSelection: false,
    useGST: false,
    gstNumber: "",
  });

  const [showFlightDetails, setShowFlightDetails] = useState(true);

  useEffect(() => {
    const storedSearchParams = localStorage.getItem("searchParams");
    const storedSessionId = localStorage.getItem("sessionId");
    const storedFlight = localStorage.getItem("selectedFlight");

    const newSearchParams =
      location.state?.searchParams ||
      (storedSearchParams ? JSON.parse(storedSearchParams) : null);
    const newSessionId = location.state?.sessionId || storedSessionId;
    const newFlight =
      location.state?.flight ||
      (storedFlight ? JSON.parse(storedFlight) : null);

    setSearchParams(newSearchParams);
    setSessionId(newSessionId);
    setFlight(newFlight);
  }, [location.state]);

  useEffect(() => {
    if (flight) {
      console.log(
        "Flight departure time:",
        flight.OptionSegmentsInfo[0].DepartureTime
      );
      console.log(
        "Flight arrival time:",
        flight.OptionSegmentsInfo[0].ArrivalTime
      );
      console.log(
        "Parsed departure time:",
        parseDateString(flight.OptionSegmentsInfo[0].DepartureTime)
      );
      console.log(
        "Parsed arrival time:",
        parseDateString(flight.OptionSegmentsInfo[0].ArrivalTime)
      );
    }
  }, [flight]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setBookingOptions((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add validation and submission logic here
  };

  const convenienceFee = 149.0;
  const totalAmount = flight
    ? Number(flight.OptionPriceInfo.TotalPrice) + convenienceFee
    : 0;

  const handleBackToResults = () => {
    let storedSearchParams: string | null =
      localStorage.getItem("searchParams");
    let storedSessionId: string | null = localStorage.getItem("sessionId");

    // Fallback to flight data if searchParams are missing
    if (!storedSearchParams && flight) {
      const defaultSearchParams = {
        from: flight.OptionSegmentsInfo[0].DepartureAirport,
        to: flight.OptionSegmentsInfo[0].ArrivalAirport,
        date: flight.OptionSegmentsInfo[0].DepartureTime.split(",")[0], // Extract date part
        passengers: 1, // Default passenger count
      };
      storedSearchParams = JSON.stringify(defaultSearchParams);
      localStorage.setItem("searchParams", storedSearchParams);
    }

    if (!storedSessionId) {
      storedSessionId = sessionId || "default-session";
      localStorage.setItem("sessionId", storedSessionId);
    }

    // Ensure storedSearchParams is never null before parsing
    const parsedSearchParams = storedSearchParams
      ? JSON.parse(storedSearchParams)
      : {};

    navigate("/search-results", {
      state: {
        searchParams: parsedSearchParams,
        sessionId: storedSessionId!,
        shouldSearch: false,
      },
    });
  };

  const renderItineraryDetails = () => {
    if (!flight) return null;

    return (
      <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Itinerary Details</h2>
          <button
            onClick={() => setShowFlightDetails(!showFlightDetails)}
            className="px-4 py-2 bg-[#005AFF] text-white rounded-md hover:bg-blue-700"
          >
            {showFlightDetails ? "Hide Detail" : "Flight Detail"} 
          </button>
        </div>

        {showFlightDetails ? (
          <div className="space-y-6">
            {/* Flight Header */}
            <div className="flex items-center gap-2 text-sm">
              <div className="bg-cyan-400 rounded-full p-2">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </div>
              <div>
                <div className="font-medium">
                  Outbound Flight :{" "}
                  {format(
                    parseDateString(flight.OptionSegmentsInfo[0].DepartureTime),
                    "EEE, dd MMM yyyy"
                  )}
                </div>
                <div className="text-gray-600">
                  {flight.OptionSegmentsInfo[0].DepartureAirport} -{" "}
                  {flight.OptionSegmentsInfo[0].ArrivalAirport}
                </div>
              </div>
            </div>

            {/* Flight Info Card */}
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded border flex items-center justify-center">
                    <img
                      src={
                        getAirlineImage(
                          flight.OptionSegmentsInfo[0].MarketingAirline
                        ) || "/placeholder.svg"
                      }
                      alt={flight.OptionSegmentsInfo[0].MarketingAirline}
                      className="w-8 h-8 object-contain"
                    />
                  </div>
                  <div>
                    <div className="font-medium">
                      {flight.OptionSegmentsInfo[0].MarketingAirline},{" "}
                      {flight.OptionSegmentsInfo[0].FlightNumber}
                    </div>
                    <div className="text-sm text-gray-500">
                      <svg
                        className="w-4 h-4 inline-block mr-1"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 8h-9m9 4h-9m9 4h-9M4 8h1m-1 4h1m-1 4h1" />
                      </svg>
                      15 Kg Check-in, 7 KG handbag
                    </div>
                  </div>
                </div>
                {/* <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xl font-semibold">
                      {format(parseDateString(flight.OptionSegmentsInfo[0].DepartureTime), "HH:mm")}
                    </div>
                    <div className="text-sm text-gray-600">{flight.OptionSegmentsInfo[0].DepartureAirport}</div>
                  </div>
                  <div className="flex flex-col items-center px-4">
                    <div className="text-sm text-gray-500">Non-Stop</div>
                    <div className="w-24 h-px bg-gray-300 my-1"></div>
                    <div className="text-xs text-gray-500">2h 5m</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold">
                      {format(parseDateString(flight.OptionSegmentsInfo[0].ArrivalTime), "HH:mm")}
                    </div>
                    <div className="text-sm text-gray-600">{flight.OptionSegmentsInfo[0].ArrivalAirport}</div>
                  </div>
                </div> */}
              </div>

              {/* Timeline */}
              <div className="relative mt-6">
                {/* Flight Route Line */}
                <div className="flex items-center justify-between">
                  {/* Departure Details */}
                  <div className="flex-1">
                    <div className="text-3xl font-bold mb-1">
                      {format(
                        parseDateString(
                          flight.OptionSegmentsInfo[0].DepartureTime
                        ),
                        "HH:mm"
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {flight.OptionSegmentsInfo[0].DepartureAirport}
                      </div>
                      <div className="text-sm text-gray-600">Terminal - 1</div>
                    </div>
                  </div>

                  {/* Middle Section with Airline Info */}
                  <div className="flex-1 px-8">
                    <div className="flex items-center justify-center mb-2">
                      <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                        <img
                          src={
                            getAirlineImage(
                              flight.OptionSegmentsInfo[0].MarketingAirline
                            ) || "/placeholder.svg"
                          }
                          alt={flight.OptionSegmentsInfo[0].MarketingAirline}
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-sm">
                        {flight.OptionSegmentsInfo[0].MarketingAirline},{" "}
                        {flight.OptionSegmentsInfo[0].FlightNumber}
                      </div>
                    </div>
                  </div>

                  {/* Arrival Details */}
                  <div className="flex-1 text-right">
                    <div className="text-3xl font-bold mb-1">
                      {format(
                        parseDateString(
                          flight.OptionSegmentsInfo[0].ArrivalTime
                        ),
                        "HH:mm"
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {flight.OptionSegmentsInfo[0].ArrivalAirport}
                      </div>
                      <div className="text-sm text-gray-600">Terminal - 1</div>
                    </div>
                  </div>
                </div>

                {/* Duration and Class Info */}
                <div className="absolute right-0 top-0 -mt-6 flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                    Economy
                  </div>
                </div>

                {/* Route Line with Dots */}
                {/* <div className="absolute left-0 right-0 top-6">
                  <div className="relative h-0.5 bg-cyan-100 w-full">
                    <div className="absolute left-0 -top-1.5 w-4 h-4 bg-cyan-400 rounded-full"></div>
                    <div className="absolute right-0 -top-1.5 w-4 h-4 bg-cyan-400 rounded-full"></div>
                  </div>
                </div> */}
              </div>

              <div className="mt-8 text-sm text-gray-500 border-t pt-4">
                The baggage information is just for reference. Please Check with
                airline before check-in. For more information, visit the
                airline's official website.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
              <img
                src={
                  getAirlineImage(
                    flight.OptionSegmentsInfo[0].MarketingAirline
                  ) || "/placeholder.svg"
                }
                alt={flight.OptionSegmentsInfo[0].MarketingAirline}
                className="w-12 h-12 object-contain"
              />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">
                    {flight.OptionSegmentsInfo[0].MarketingAirline}{" "}
                    {flight.OptionSegmentsInfo[0].FlightNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    {flight.OptionSegmentsInfo[0].DepartureAirport} -{" "}
                    {flight.OptionSegmentsInfo[0].ArrivalAirport}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {format(
                      parseDateString(
                        flight.OptionSegmentsInfo[0].DepartureTime
                      ),
                      "HH:mm"
                    )}
                  </p>
                  <p className="text-sm text-gray-600">Non-Stop</p>
                  <p className="font-medium">
                    {format(
                      parseDateString(flight.OptionSegmentsInfo[0].ArrivalTime),
                      "HH:mm"
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 8h-9m9 4h-9m9 4h-9M4 8h1m-1 4h1m-1 4h1" />
                </svg>
                <span>15 Kg Check-in, 7 KG handbag</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!flight) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No flight selected</h1>
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            Return to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
        <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={handleBackToResults}
              className="text-gray-600 hover:text-gray-800 flex items-center"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="ml-1">Back to Results</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Almost done!</h1>
            <p className="text-gray-600">
              Enter your details and complete your booking now.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            {renderItineraryDetails()}
            {/* Contact Details */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Contact Details</h2>
              <p className="text-sm text-gray-600 mb-4">
                Your mobile number will be used only for sending flight related
                communication
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="receiveOffers"
                    checked={formData.receiveOffers}
                    onChange={handleInputChange}
                    className="rounded text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Send me the latest travel deals and special offers via email
                    and/or SMS.
                  </span>
                </label>
              </div>
            </div>

            {/* Traveller Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Traveller Details</h2>
              <p className="text-sm text-gray-600 mb-4">
                Please enter name as mentioned on your government ID proof.
              </p>
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Traveller 1: Adult</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="male"
                        checked={formData.gender === "male"}
                        onChange={handleInputChange}
                        className="text-blue-600"
                      />
                      <span className="ml-2">Male</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="female"
                        checked={formData.gender === "female"}
                        onChange={handleInputChange}
                        className="text-blue-600"
                      />
                      <span className="ml-2">Female</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Refundable Booking Upgrade */}
            <div className="bg-white rounded-lg shadow p-6 mt-2 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Refundable Booking Upgrade
                </h2>
                <span className="bg-cyan-400 text-white px-3 py-1 text-sm rounded-full">
                  Travel Worry Free
                </span>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg mb-4">
                <p className="text-sm">
                  Upgrade your booking and receive your flight refund (₹ 9,852)
                  if you cannot attend and can evidence one of the many reasons
                  in our{" "}
                  <Link to="/terms" className="text-red-500 hover:underline">
                    Terms & Conditions
                  </Link>
                  , which you accept when you select a Refundable Booking.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="relative flex flex-col p-4 bg-green-50 rounded-lg cursor-pointer">
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      name="fareType"
                      value="refundable"
                      checked={bookingOptions.fareType === "refundable"}
                      onChange={handleOptionChange}
                      className="mr-2"
                    />
                    <span className="font-medium">Refundable Fare</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    Book now INR. 1478
                  </span>
                  <span className="text-xs text-gray-500">Per person</span>
                  <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                    Recommended
                  </span>
                </label>

                <label className="flex flex-col p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      name="fareType"
                      value="non-refundable"
                      checked={bookingOptions.fareType === "non-refundable"}
                      onChange={handleOptionChange}
                      className="mr-2"
                    />
                    <span className="font-medium">Without Secure</span>
                  </div>
                  <span className="text-sm text-gray-600">Non-Refundable</span>
                </label>
              </div>
            </div>

            {/* Service Option - Seat Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Service Option</h2>
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <svg
                      className="w-6 h-6 mr-2 text-gray-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 8h-9m9 4h-9m9 4h-9M4 8h1m-1 4h1m-1 4h1" />
                    </svg>
                    <span className="font-medium">Seat Selection</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Starting From</div>
                    <div className="font-bold">₹200.00</div>
                    <div className="text-xs text-gray-500">Per Seat</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src="/images/seat.gif"
                      alt="Seat Map Preview"
                      className="w-32 h-20 object-contain"
                    />
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    View Seat Map
                  </button>
                </div>
              </div>
            </div>

            {/* GST Details */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="useGST"
                  name="useGST"
                  checked={bookingOptions.useGST}
                  onChange={handleOptionChange}
                  className="mr-2"
                />
                <label htmlFor="useGST" className="text-sm font-medium">
                  Use GST for this booking (OPTIONAL)
                </label>
              </div>
              {bookingOptions.useGST && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    To claim credit of GST charged by airlines/FareClubs, please
                    enter your company's GST number
                  </p>
                  <input
                    type="text"
                    name="gstNumber"
                    value={bookingOptions.gstNumber}
                    onChange={handleOptionChange}
                    placeholder="Enter GST Number"
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Price Details Sidebar */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Price Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Adult (1 × ₹{flight?.OptionPriceInfo.TotalBasePrice})
                  </span>
                  <span>₹{flight?.OptionPriceInfo.TotalBasePrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Airline Taxes & Fees</span>
                  <span>₹{flight?.OptionPriceInfo.TotalTax}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Convenience Fees</span>
                  <span>₹{convenienceFee.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between font-semibold">
                    <span>You Pay</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Promo Code */}
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Promo Code</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="promoCode"
                    value={formData.promoCode}
                    onChange={handleInputChange}
                    placeholder="Enter promo code"
                    className="flex-1 p-2 border rounded-md"
                  />
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Apply
                  </button>
                </div>
                <div className="mt-4">
                  <label className="flex items-center gap-2 p-2 border rounded-md">
                    <input
                      type="radio"
                      name="promo"
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-medium">FIRST100</div>
                      <div className="text-sm text-gray-600">Save ₹100</div>
                      <div className="text-xs text-gray-500">
                        Get Upto ₹800* Off. Valid only for UPI Payments
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full mt-6 px-6 py-3 bg-[#FF214C] text-white rounded-md hover:bg-pink-700 font-medium"
              >
                Pay Now
              </button>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center">
                  <img
                    src="images/trustpilot.png"
                    alt="Trustpilot Rating"
                    className="h-12"
                  />
                  {/* <div className="ml-2">
                    <div className="text-sm font-medium">4.1</div>
                    <div className="text-xs text-gray-500">by Trustpilot</div>
                  </div> */}
                </div>
                <img
                  src="/images/iata.png"
                  alt="IATA Logo"
                  className="h-12"
                />
              </div>
              <p className="mt-4 text-xs text-gray-500 text-center">
                By clicking on Pay Now, you are agreeing to our Terms &
                Conditions, Privacy Policy, User Agreement and Covid-19
                Guidelines.
              </p>

              {/* Session Timer */}
              <div className="mt-4 text-center text-sm text-gray-600">
                <svg
                  className="w-4 h-4 inline-block mr-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                Your session will expire in 28 min 24 sec
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
