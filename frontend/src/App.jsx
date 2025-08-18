import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from './components/Home';
import HomeContent from './components/HomeContent';
import SpikeBlastFooter from './components/SpikeBlastFooter';
import Login from './components/Login';
import './App.css';

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
      </Routes>
    </Router>
  );
}

export default App;
