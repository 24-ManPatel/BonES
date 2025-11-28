import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from './components/Home';
import HomeContent from './components/HomeContent';
import SpikeBlastFooter from './components/SpikeBlastFooter';
import Login from './components/Login';
import BracketsPage from './components/BracketsPage';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Home Page Route */}
        <Route
          path="/"
          element={
            <>
              <Home />
              <HomeContent />
              <SpikeBlastFooter />
            </>
          }
        />

        {/* Login Page Route */}
        <Route path="/login" element={<Login />} />

        {/* Brackets Page Route - Protected */}
        <Route 
          path="/brackets" 
          element={
            <ProtectedRoute>
              <BracketsPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
