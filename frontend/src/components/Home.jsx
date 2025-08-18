import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./Home.css";
import CursorEffects from "./ValorantCursorEffects";
import { Link } from "react-router-dom";


const Home = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const [currentText, setCurrentText] = useState(0);
  const [formattedTime, setFormattedTime] = useState('');
  
  const images = [
    "/src/assets/test.jpg",
    "/src/assets/9.jpg",
    "/src/assets/7.jpeg",
    "/src/assets/8.jpg",
    "/src/assets/11.jpg",
    "/src/assets/11.webp",
    "/src/assets/10.jpg"
  ];

  const texts = [
    { text: "PREDICT • CONQUER • DOMINATE", lang: "en" },
    { text: "PREDECIR • CONQUISTAR • DOMINAR", lang: "es" },
    { text: "PREVER • CONQUISTAR • DOMINAR", lang: "pt-BR" },
    { text: "VORHERSAGEN • EROBERN • DOMINIEREN", lang: "de" },
    { text: "予測 • 征服 • 支配", lang: "ja" },
    { text: "예측 • 정복 • 지배", lang: "ko" },
    { text: "预测 • 征服 • 统治", lang: "zh" }
];

  const formatTime = () => {
    const date = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${days[date.getDay()]} ${hours}:${minutes} IST`;
  };

  useEffect(() => {
    setFormattedTime(formatTime());
    
    const imageInterval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 5000);

    const textInterval = setInterval(() => {
      setCurrentText((prev) => (prev + 1) % texts.length);
    }, 4000);

    const timeInterval = setInterval(() => {
      setFormattedTime(formatTime());
    }, 60000);

    return () => {
      clearInterval(imageInterval);
      clearInterval(textInterval);
      clearInterval(timeInterval);
    };
  }, []);

  return (
    <div className="bg-[#0F1923] text-white min-h-screen flex items-center justify-center relative">
      <CursorEffects />
      
      <motion.img
        key={currentImage}
        src={images[currentImage]}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 3 }}
      />

      <div className="z-10 text-center px-4">
        <h1 className="text-5xl font-bold text-[#FF4655] drop-shadow-lg font-cyber mb-8">
          Welcome to B'on'ES
        </h1>
        
        <motion.p
          key={currentText}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className={`text-3xl text-gray-300 mt-4 max-w-2xl mx-auto font-neotokyo tracking-widest ${
            ['ja', 'ko', 'zh', 'hi'].includes(texts[currentText].lang) ? 'font-noto' : ''
          }`}
        >
          {texts[currentText].text}
        </motion.p>
        
        <Link to="/login">
          <button className="mt-12 px-8 py-3 bg-[#FF4655] text-white font-cyber text-xl tracking-wider 
            hover:bg-[#FF4655]/80 transition-colors duration-300 rounded font-bold">
            Get Started
          </button>
        </Link>
      </div>

      <div className="absolute bottom-6 right-6 font-cyber text-xl font-bold text-[#FF4655] 
        tracking-wider time-display">
        {formattedTime}
      </div>
    </div>
  );
};

export default Home;