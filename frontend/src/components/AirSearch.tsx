import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeftRight, Calendar, Users, Clock, Luggage } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

interface AirSearchProps {
  sessionId: string;
}

interface FlightSegment {
  DepartureAirport: string;
  ArrivalAirport: string;
  DepartureTime: string;
  ArrivalTime: string;
  MarketingAirline: string;
  FlightNumber: string;
}

interface SearchResult {
  SearchSegmentId: number;
  JourneyTime: number;
  OptionSegmentsInfo: FlightSegment[];
}

const AirSearch: React.FC<AirSearchProps> = ({ sessionId }) => {
  const [searchParams, setSearchParams] = useState({
    IsMobileSearchQuery: "N",
    MaxOptionsCount: "10",
    TravelType: "D",
    JourneyType: "O",
    IsPersonalBooking: "N",
    AirOriginDestinations: [{
      DepartureAirport: "",
      ArrivalAirport: "",
      DepartureDate: ""
    }],
    AirPassengerQuantities: {
      NumAdults: 1,
      NumChildren: 0,
      NumInfants: 0
    },
    AirSearchPreferences: {
      BookingClass: "G",
      Carrier: "ANY"
    },
    SearchLevelReportingParams: {
      BillingEntityCode: 0
    }
  });

  const [searchResults, setSearchResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('flightDetails');

  const handleOriginDestinationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchParams(prevParams => ({
      ...prevParams,
      AirOriginDestinations: [
        {
          ...prevParams.AirOriginDestinations[0],
          [name]: value
        }
      ]
    }));
  };

  const handlePassengerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchParams(prevParams => ({
      ...prevParams,
      AirPassengerQuantities: {
        ...prevParams.AirPassengerQuantities,
        [name]: parseInt(value)
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/air/search', {
        Data: {
          ...searchParams,
          AirOriginDestinations: [{
            ...searchParams.AirOriginDestinations[0],
            DepartureDate: formatDate(searchParams.AirOriginDestinations[0].DepartureDate)
          }]
        },
        sessionId: sessionId
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Air Search Response:', response.data);

      if (response.data.Status === "Success") {
        setSearchResults(response.data.Data);
      } else {
        setError(response.data.Description || 'Air search failed');
      }
    } catch (err) {
      console.error('Air search error:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.Description || 'Air search failed. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = parseISO(dateTimeStr);
    if (!isValid(date)) {
      console.error('Invalid date:', dateTimeStr);
      return { time: 'Invalid', date: 'Invalid' };
    }
    return {
      time: format(date, 'HH:mm'),
      date: format(date, 'dd MMM, yyyy')
    };
  };

  const calculateDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getAirlineImage = (airline: string) => {
    const airlineImageMap: { [key: string]: string } = {
      'IndiGo': '/images/indigo.png',
      'Air India': '/images/airindia.png',
      'Air India Express': '/images/airindia-express.png',
      'Akasa Air': '/images/akasaair.jpeg',
    };

    return airlineImageMap[airline] || '/images/default-airline.png';
  };

  return (
    <div className="max-w-7xl mx-auto mt-4">
      {/* Search Form Header */}
      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-600 p-4 rounded-lg shadow-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="col-span-2 flex items-center space-x-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="From: New Delhi (DEL)"
                className="w-full p-2 rounded border-0"
                value={searchParams.AirOriginDestinations[0].DepartureAirport}
                onChange={(e) => handleOriginDestinationChange(e)}
                name="DepartureAirport"
              />
            </div>
           
            <div className="flex-1">
              <input
                type="text"
                placeholder="To: Mumbai (BOM)"
                className="w-full p-2 rounded border-0"
                value={searchParams.AirOriginDestinations[0].ArrivalAirport}
                onChange={(e) => handleOriginDestinationChange(e)}
                name="ArrivalAirport"
              />
            </div>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              className="w-full p-2 pl-10 rounded border-0"
              value={searchParams.AirOriginDestinations[0].DepartureDate}
              onChange={(e) => handleOriginDestinationChange(e)}
              name="DepartureDate"
            />
          </div>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              className="w-full p-2 pl-10 rounded border-0 appearance-none"
              value={searchParams.AirPassengerQuantities.NumAdults}
              onChange={(e) => handlePassengerChange(e)}
              name="NumAdults"
            >
              <option value={1}>1 Traveller</option>
              <option value={2}>2 Travellers</option>
              <option value={3}>3 Travellers</option>
            </select>
          </div>
          <button
            onClick={(e) => handleSubmit(e)}
            disabled={isLoading}
            className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
          >
            {isLoading ? 'Searching...' : 'Modify Search'}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}

      {searchResults?.AirSearchResult && (
        <div className="grid grid-cols-12 gap-6">
          {/* Filters */}
          <div className="col-span-3 bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-4">Filters</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Price Range</h4>
                <input type="range" className="w-full" />
              </div>
              <div>
                <h4 className="font-medium mb-2">Airlines</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" /> IndiGo
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" /> SpiceJet
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="col-span-9 space-y-4">
            {searchResults.AirSearchResult.map((result: SearchResult, index: number) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-4">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Airline Info */}
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2">
                      <img
                        src={getAirlineImage(result.OptionSegmentsInfo[0].MarketingAirline) || "/placeholder.svg"}
                        alt={result.OptionSegmentsInfo[0].MarketingAirline}
                        className="w-10 h-10 object-contain"
                      />
                      <div>
                        <div className="font-medium">{result.OptionSegmentsInfo[0].MarketingAirline}</div>
                        <div className="text-sm text-gray-500">{result.OptionSegmentsInfo[0].FlightNumber}</div>
                      </div>
                    </div>
                  </div>

                  {/* Flight Times */}
                  <div className="col-span-7">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="text-xl font-bold">
                          {formatDateTime(result.OptionSegmentsInfo[0].DepartureTime).time}
                        </div>
                        <div className="text-sm text-gray-500">{result.OptionSegmentsInfo[0].DepartureAirport}</div>
                      </div>

                      <div className="flex-1 px-4">
                        <div className="relative">
                          <div className="border-t-2 border-gray-300 w-full absolute top-1/2"></div>
                          <div className="text-center relative">
                            <span className="bg-white px-2 text-sm text-gray-500">
                              {calculateDuration(result.JourneyTime)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xl font-bold">
                          {formatDateTime(result.OptionSegmentsInfo[0].ArrivalTime).time}
                        </div>
                        <div className="text-sm text-gray-500">{result.OptionSegmentsInfo[0].ArrivalAirport}</div>
                      </div>
                    </div>
                  </div>

                  {/* Price and Book */}
                  <div className="col-span-3 text-right">
                    <div className="text-2xl font-bold text-blue-600">₹6,888</div>
                    <button className="bg-blue-600 text-white px-6 py-2 rounded mt-2 hover:bg-blue-700 transition-colors">
                      Book Now
                    </button>
                  </div>
                </div>

                {/* Flight Details Tabs */}
                <div className="mt-4 border-t pt-4">
                  <div className="flex space-x-4 mb-4">
                    <button
                      className={`${
                        activeTab === 'flightDetails' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
                      } pb-2`}
                      onClick={() => setActiveTab('flightDetails')}
                    >
                      Flight Details
                    </button>
                    <button
                      className={`${
                        activeTab === 'fareSummary' ? ' border-b-2' : 'text-gray-500'
                      } pb-2`}
                      onClick={() => setActiveTab('fareSummary')}
                    >
                      Fare Summary
                    </button>
                  </div>

                  {activeTab === 'flightDetails' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>Duration: {calculateDuration(result.JourneyTime)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Luggage className="w-4 h-4 text-gray-500" />
                          <span>Baggage: 15 Kg Check-in, 7 Kg Cabin</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'fareSummary' && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Base Fare</span>
                        <span>₹5,500</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxes & Fees</span>
                        <span>₹1,388</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>₹6,888</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AirSearch;

