import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Booking: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { repriceData, searchParams } = location.state;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBook = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/api/air/book', {
        SearchFormData: repriceData.SearchFormData,
        CartData: repriceData.CartData,
        CartBookingId: repriceData.Cart.CartBookingId,
        Passengers: [
          {
            Type: "A",
            Title: "Mr",
            FirstName: "John",
            LastName: "Doe",
            DateOfBirth: "1990-01-01",
            ReportingParameters: []
          }
        ],
        DeliveryInfo: {
          Mobile: "1234567890",
          Email: "john.doe@example.com",
          SendEmail: "Y",
          SendSMS: "Y",
          Street: "123 Main St",
          City: "New York",
          State: "NY",
          Pincode: "10001",
          Country: "US"
        },
        MetaInfos: repriceData.Cart.MetaInfo,
        PaymentMethod: {
          Mode: "D" // Assuming 'D' is for direct payment
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cookie': `JSESSIONID=${searchParams.sessionId}`
        }
      });

      if (response.data.Status === "Success") {
        // Navigate to a confirmation page
        navigate('/confirmation', { state: { bookingData: response.data.Data } });
      } else {
        setError(response.data.Description || 'Booking failed');
      }
    } catch (err) {
      setError('Failed to book flight');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Booking Confirmation</h1>
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-xl font-semibold mb-2">Flight Details</h2>
        {repriceData.Cart.OrderItems.map((item: any, index: number) => (
          <div key={index} className="mb-4">
            <p>From: {item.FlightSegment.DepartureAirport}</p>
            <p>To: {item.FlightSegment.ArrivalAirport}</p>
            <p>Departure: {item.FlightSegment.DepartureTime}</p>
            <p>Arrival: {item.FlightSegment.ArrivalTime}</p>
            <p>Airline: {item.FlightSegment.MarketingAirline}</p>
            <p>Flight Number: {item.FlightSegment.FlightNumber}</p>
          </div>
        ))}
        <h2 className="text-xl font-semibold mb-2">Price Details</h2>
        <p>Base Price: ₹{repriceData.Cart.PriceDetails.BasePrice}</p>
        <p>Taxes: ₹{repriceData.Cart.PriceDetails.TotalCustomTax}</p>
        <p>Total Price: ₹{repriceData.Cart.PriceDetails.TotalPrice}</p>
        <button
          onClick={handleBook}
          className="bg-[#007aff] hover:bg-[#007aff] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
        >
          Confirm Booking
        </button>
      </div>
    </div>
  );
};

export default Booking;

