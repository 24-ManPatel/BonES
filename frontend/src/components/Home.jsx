import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./Home.css";

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
    }, 3000); // Changes image every 3 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0F1923] text-white min-h-screen flex flex-col items-center justify-center">
      {/* Scrolling Images Section */}
      <div className="relative w-full h-[60vh] overflow-hidden">
        <motion.img
          key={currentImage}
          src={images[currentImage]}
          alt="Valorant Banner"
          className="absolute w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        />
      </div>

      {/* Main Content */}
      <div className="text-center mt-8 px-4">
        <h1 className="text-4xl font-bold text-[#FF4655] drop-shadow-lg">
          Valorant Esports Betting
        </h1>
        <p className="text-lg text-gray-300 mt-4 max-w-2xl">
          Predict match winners and climb the leaderboards with web credits! Join the competition and make your mark in the Valorant betting scene.
        </p>
        <button className="mt-6 px-6 py-3 bg-[#FF4655] text-white font-semibold rounded-xl shadow-lg hover:bg-[#E63946] transition duration-300">
          Get Started
        </button>
      </div>
    </div>
  );
};

export default Home;
