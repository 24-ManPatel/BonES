import React, { useEffect, useState } from "react";

const AnimatedText = ({ text, delay = 0, isVisible }) => {
  const words = text.split(/(\s+)/).filter(word => word.trim().length > 0);
  
  return (
    <div className="leading-relaxed">
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block mr-1 transition-all duration-500"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transitionDelay: `${delay + (i * 30)}ms`
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
};

const HomeContent = () => {
  const [visibleSections, setVisibleSections] = useState({});

  useEffect(() => {
    const observerCallback = (entries) => {
      entries.forEach(entry => {
        setVisibleSections(prev => ({
          ...prev,
          [entry.target.id]: entry.isIntersecting
        }));
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.2,
      rootMargin: "-50px"
    });

    document.querySelectorAll(".animate-section").forEach(section => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const cardData = [
    {
      title: "How to Bid",
      content: "Navigate to our match prediction section, select your favorite teams, and place your web credits on the anticipated winner. Stay strategic and informed to maximize your chances!"
    },
    {
      title: "Climb Leaderboards",
      content: "Earn points for accurate predictions. The more matches you correctly predict, the higher you'll climb on our global leaderboard. Compete with Valorant enthusiasts worldwide!"
    },
    {
      title: "About Us",
      content: "We're passionate Valorant fans creating an interactive platform that brings the excitement of esports betting to the community. Fair play, transparency, and fan engagement are our core values."
    }
  ];

  const featureData = [
    {
      title: "Tournament Insights",
      content: "Get real-time updates on ongoing Valorant tournaments, team performance statistics, and in-depth match analysis. Make informed betting decisions with comprehensive data at your fingertips."
    },
    {
      title: "Community Engagement",
      content: "Connect with fellow Valorant enthusiasts, share predictions, and participate in community challenges. Join special events and build your reputation in the community."
    },
    {
      title: "Pro Tips & Strategies",
      content: "Access exclusive insights from professional players and analysts to enhance your prediction accuracy. Stay updated with the latest game meta and strategic approaches."
    },
    {
      title: "Reward System",
      content: "Earn exclusive badges, unlock special features, and compete for monthly prizes. Your prediction accuracy and engagement lead to greater rewards!"
    }
  ];

  return (
    <div className="bg-[#0F1923] text-white py-16 px-8">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
        {cardData.map((card, i) => (
          <div
            key={card.title}
            id={`card-${i}`}
            className="animate-section bg-[#1C252E] p-6 rounded-lg shadow-md transition-all duration-1000"
            style={{
              opacity: visibleSections[`card-${i}`] ? 1 : 0,
              transform: visibleSections[`card-${i}`] ? "translateY(0)" : "translateY(50px)"
            }}
          >
            <h2 className="text-2xl font-bold text-[#FF4655] mb-4">
              <AnimatedText text={card.title} delay={i * 100} isVisible={visibleSections[`card-${i}`]} />
            </h2>
            <p className="text-gray-300">
              <AnimatedText 
                text={card.content} 
                delay={i * 100 + 300} 
                isVisible={visibleSections[`card-${i}`]} 
              />
            </p>
          </div>
        ))}
      </div>

      <div 
        id="main-cta"
        className="animate-section text-center mt-12"
        style={{
          opacity: visibleSections["main-cta"] ? 1 : 0,
          transform: visibleSections["main-cta"] ? "translateY(0)" : "translateY(50px)",
          transition: "all 1s ease-out"
        }}
      >
        <h3 className="text-3xl font-bold text-[#FF4655] mb-6">
          <AnimatedText 
            text="Join the Ultimate Valorant Prediction Experience" 
            isVisible={visibleSections["main-cta"]} 
          />
        </h3>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
          <AnimatedText 
            text="Combine your game knowledge, strategic thinking, and passion for Valorant to predict match outcomes. Win exciting rewards based on your performance!" 
            delay={300}
            isVisible={visibleSections["main-cta"]} 
          />
        </p>
        <button className="bg-[#FF4655] text-white px-8 py-3 rounded-md 
          hover:bg-red-600 transition duration-300 transform hover:scale-105">
          Start Predicting Now
        </button>
      </div>

      <div className="max-w-6xl mx-auto mt-16">
        <div className="grid md:grid-cols-2 gap-10">
          {featureData.map((feature, i) => (
            <div
              key={feature.title}
              id={`feature-${i}`}
              className="animate-section bg-[#1C252E] p-6 rounded-lg transition-all duration-1000"
              style={{
                opacity: visibleSections[`feature-${i}`] ? 1 : 0,
                transform: visibleSections[`feature-${i}`] ? "translateY(0)" : "translateY(50px)"
              }}
            >
              <h2 className="text-2xl font-bold text-[#FF4655] mb-4">
                <AnimatedText 
                  text={feature.title} 
                  delay={i * 100}
                  isVisible={visibleSections[`feature-${i}`]} 
                />
              </h2>
              <p className="text-gray-300">
                <AnimatedText 
                  text={feature.content} 
                  delay={i * 100 + 300}
                  isVisible={visibleSections[`feature-${i}`]} 
                />
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeContent;