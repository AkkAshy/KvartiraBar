import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import PropertyDetail from './pages/PropertyDetail';
import MyProperties from './pages/MyProperties';
import PropertyForm from './pages/PropertyForm';
import Favorites from './pages/Favorites';
import ContactRequests from './pages/ContactRequests';
import Profile from './pages/Profile';
import MapSearch from './pages/MapSearch';
import Auctions from './pages/Auctions';
import AuctionDetail from './pages/AuctionDetail';
import AuctionForm from './pages/AuctionForm';

// Protected Route Component
const ProtectedRoute = ({ children, sellerOnly = false, buyerOnly = false }) => {
  const { isAuthenticated, loading, isSeller, isBuyer } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (sellerOnly && !isSeller()) {
    return <Navigate to="/" />;
  }

  if (buyerOnly && !isBuyer()) {
    return <Navigate to="/" />;
  }

  return children;
};

// Public Route (redirect to home if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Auth Routes - доступны всем */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Public Routes - доступны всем */}
      <Route path="/" element={<Home />} />
      <Route path="/map" element={<MapSearch />} />
      <Route path="/properties/:id" element={<PropertyDetail />} />

      {/* Auction Routes */}
      <Route path="/auctions" element={<Auctions />} />
      <Route path="/auctions/:id" element={<AuctionDetail />} />

      {/* Protected Routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Seller Only Routes */}
      <Route
        path="/my-properties"
        element={
          <ProtectedRoute sellerOnly>
            <MyProperties />
          </ProtectedRoute>
        }
      />
      <Route
        path="/properties/create"
        element={
          <ProtectedRoute sellerOnly>
            <PropertyForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/properties/edit/:id"
        element={
          <ProtectedRoute sellerOnly>
            <PropertyForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contact-requests"
        element={
          <ProtectedRoute sellerOnly>
            <ContactRequests />
          </ProtectedRoute>
        }
      />

      {/* Buyer Only Routes */}
      <Route
        path="/favorites"
        element={
          <ProtectedRoute buyerOnly>
            <Favorites />
          </ProtectedRoute>
        }
      />

      {/* Auction Create Route - Seller Only */}
      <Route
        path="/auctions/create"
        element={
          <ProtectedRoute sellerOnly>
            <AuctionForm />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
