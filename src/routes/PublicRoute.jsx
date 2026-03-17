// src/routes/PublicRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const PublicRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token'); // or use your auth state

  const homePath = localStorage.getItem('redirectPath'); // or use your auth state
  if (isAuthenticated) {
    return <Navigate to={homePath} replace />;
  }
  return children;
};

export default PublicRoute;
