import React, { useState } from 'react';
import {  Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/login';
import Dashboard from './components/common/dashboard';
import SearchResults from './components/SearchResults';
// import Booking from './components/Booking';
import BookingPage from "../src/components/booking/BookingPage";

const App: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleLoginSuccess = (newSessionId: string) => {
    setSessionId(newSessionId);
  };

  return (
    <>
      <Routes>
        <Route 
          path="/" 
          element={
            !sessionId ? (
              <Login onLoginSuccess={handleLoginSuccess} />
            ) : (
              <Dashboard sessionId={sessionId} />
            )
          } 
        />
        <Route 
          path="/search-results" 
          element={
            sessionId ? (
              <SearchResults />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route path="/booking" element={sessionId ? <BookingPage /> : <Navigate to="/" replace />} />
      </Routes>
      </>
  );
};

export default App;

