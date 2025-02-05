import React from 'react';

const HomeContent = () => {
  return (
    <div className="bg-[#0F1923] text-white py-16 px-8">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
        <div className="bg-[#1C252E] p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-[#FF4655] mb-4">How to Bid</h2>
          <p className="text-gray-300">
            Navigate to our match prediction section, select your favorite teams, 
            and place your web credits on the anticipated winner. Stay strategic 
            and informed to maximize your chances!
          </p>
        </div>

        <div className="bg-[#1C252E] p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-[#FF4655] mb-4">Climb Leaderboards</h2>
          <p className="text-gray-300">
            Earn points for accurate predictions. The more matches you correctly 
            predict, the higher you'll climb on our global leaderboard. Compete 
            with Valorant enthusiasts worldwide!
          </p>
        </div>

        <div className="bg-[#1C252E] p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-[#FF4655] mb-4">About Us</h2>
          <p className="text-gray-300">
            We're passionate Valorant fans creating an interactive platform 
            that brings the excitement of esports betting to the community. 
            Fair play, transparency, and fan engagement are our core values.
          </p>
        </div>
      </div>

      <div className="text-center mt-12">
        <h3 className="text-3xl font-bold text-[#FF4655] mb-6">
          Join the Ultimate Valorant Prediction Experience
        </h3>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
          Combine your game knowledge, strategic thinking, and passion for 
          Valorant to predict match outcomes and win exciting rewards.
        </p>
        <button className="bg-[#FF4655] text-white px-8 py-3 rounded-xs 
          hover:bg-red-600 transition duration-300 transform hover:scale-105">
          Start Predicting Now
        </button>
      </div>

      <div className="max-w-6xl mx-auto mt-16">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="bg-[#1C252E] p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-[#FF4655] mb-4">Tournament Insights</h2>
            <p className="text-gray-300">
              Get real-time updates on ongoing Valorant tournaments, 
              team performance statistics, and in-depth match analysis 
              to make informed betting decisions.
            </p>
          </div>
          <div className="bg-[#1C252E] p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-[#FF4655] mb-4">Community Engagement</h2>
            <p className="text-gray-300">
              Connect with fellow Valorant enthusiasts, share predictions, 
              and participate in community challenges and special events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeContent;
