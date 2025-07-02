import React from 'react'
import { Navigate } from 'react-router-dom'

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem("tokenId")
  return token ? children : <Navigate to="/login" />
}

export default ProtectedRoute
