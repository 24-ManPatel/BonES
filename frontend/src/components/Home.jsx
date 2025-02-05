import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./Home.css";
import CursorEffects from "./ValorantCursorEffects";

const Home = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const images = [
    "/src/assets/jett.jpg",
    "/src/assets/test.jpg",
    "/src/assets/wrapup.jpg"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 3000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0F1923] text-white min-h-screen flex items-center justify-center relative">
      <CursorEffects></CursorEffects>
      {/* Background Image Section */}
      <motion.img
        key={currentImage}
        src={images[currentImage]}
        alt="Background"
        className="background-image"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
      />

      {/* Content on Top */}
      <div className="content-container">
        <h1 className="text-4xl font-bold text-[#FF4655] drop-shadow-lg">
          Valorant Esports Betting
        </h1>
        <p className="text-lg text-gray-300 mt-4 max-w-2xl">
          Predict match winners and climb the leaderboards with web credits! 
          Join the competition and make your mark in the Valorant betting scene.
        </p>
        <button className="button-custom mt-6">
          Get Started
        </button>
      </div>

    </div>
  );
};

export default Home;
