import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BracketsPage = () => {
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [userScore, setUserScore] = useState(0);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (!token || !storedUser) {
      navigate('/login');
      return;
    }

    try {
      setUserInfo(JSON.parse(storedUser));
    } catch (e) {
      console.error('Error parsing user info:', e);
    }

    fetchMatches();
    fetchUserPredictions();
    fetchUserScore();
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/matches');
      if (response.ok) {
        const data = await response.json();
        setMatches(data || []);
      } else {
        console.error('Failed to fetch matches:', response.status);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPredictions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('No token found for predictions');
        return;
      }
      const response = await fetch('http://localhost:8080/api/v1/protected/predictions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const predMap = {};
        if (Array.isArray(data)) {
          data.forEach(pred => {
            predMap[pred.match_id] = {
              score1: pred.predicted_score1,
              score2: pred.predicted_score2,
            };
          });
        }
        setPredictions(predMap);
      } else if (response.status === 401) {
        // Unauthorized - redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        console.error('Failed to fetch predictions:', response.status);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const fetchUserScore = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        return;
      }
      const response = await fetch('http://localhost:8080/api/v1/protected/score', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserScore(data.score || 0);
      } else if (response.status === 401) {
        // Unauthorized - redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching score:', error);
    }
  };

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const response = await fetch('http://localhost:8080/api/v1/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const canPredict = (match) => {
    if (match.status === 'completed' || match.status === 'finished') {
      return false;
    }
    
    // Check if match starts in more than 1 hour
    try {
      const matchTime = parseMatchTime(match.start_time);
      if (!matchTime) return true; // If we can't parse, allow prediction
      
      const oneHourBefore = new Date(matchTime.getTime() - 60 * 60 * 1000);
      return new Date() < oneHourBefore;
    } catch (e) {
      return true;
    }
  };

  const parseMatchTime = (timeStr) => {
    if (!timeStr) return null;
    
    // Try to parse various formats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Try parsing "1:30 PM" format
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const ampm = timeMatch[3].toUpperCase();
      
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      const matchDate = new Date(today);
      matchDate.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, assume it's tomorrow
      if (matchDate < now) {
        matchDate.setDate(matchDate.getDate() + 1);
      }
      
      return matchDate;
    }
    
    // Try ISO format
    const isoDate = new Date(timeStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    return null;
  };

  const handlePredictionChange = (matchIdStr, team, value) => {
    setPredictions(prev => ({
      ...prev,
      [matchIdStr]: {
        ...prev[matchIdStr],
        [team]: value,
      },
    }));
  };

  const savePrediction = async (match) => {
    if (!canPredict(match)) {
      alert('This match is locked. Predictions can only be made 1 hour before match start.');
      return;
    }

    // Handle both id and _id formats from MongoDB
    const matchId = match.id || match._id || (match.ID ? match.ID.$oid || match.ID : null);
    if (!matchId) {
      alert('Invalid match ID');
      return;
    }
    
    // Convert ObjectID to string if needed
    const matchIdStr = typeof matchId === 'object' ? matchId.$oid || matchId.toString() : matchId.toString();
    
    const prediction = predictions[matchIdStr] || {};
    
    if (!prediction || !prediction.score1 || !prediction.score2) {
      alert('Please enter scores for both teams');
      return;
    }

    setSaving(prev => ({ ...prev, [matchIdStr]: true }));

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8080/api/v1/protected/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          match_id: matchIdStr,
          predicted_score1: prediction.score1,
          predicted_score2: prediction.score2,
        }),
      });

      if (response.ok) {
        alert('Prediction saved successfully!');
        fetchUserPredictions(); // Refresh predictions
        fetchUserScore(); // Refresh score
      } else {
        const data = await response.json();
        alert(data.message || 'Error saving prediction');
      }
    } catch (error) {
      console.error('Error saving prediction:', error);
      alert('Error saving prediction. Please try again.');
    } finally {
      setSaving(prev => ({ ...prev, [matchIdStr]: false }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Organize matches into bracket structure (simplified - you can enhance this)
  const organizeBracket = (matches) => {
    // Sort matches by start time
    const sorted = [...matches].sort((a, b) => {
      const timeA = parseMatchTime(a.start_time);
      const timeB = parseMatchTime(b.start_time);
      if (!timeA || !timeB) return 0;
      return timeA - timeB;
    });

    // Group by round (simplified - you can enhance based on actual bracket structure)
    return sorted;
  };

  const organizedMatches = organizeBracket(matches);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl font-bold tracking-widest">LOADING BRACKETS...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 border border-red-500 transform rotate-45 animate-float"></div>
          <div className="absolute top-60 right-20 w-24 h-24 border border-red-600 transform rotate-12 animate-float-delay-1"></div>
          <div className="absolute bottom-40 left-1/4 w-16 h-16 border border-red-400 transform -rotate-12 animate-float-delay-2"></div>
        </div>
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-red-600 opacity-5 blur-3xl rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-red-500 opacity-3 blur-3xl rounded-full animate-pulse-slow-delay"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-gray-800 bg-gray-900 bg-opacity-90 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white tracking-wider valorant-title">
              B'on'ES
            </h1>
            <p className="text-red-500 text-sm font-bold tracking-widest mt-1">
              VALORANT GAME CHANGERS 2025
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            {userInfo && (
              <div className="text-right">
                <div className="text-white font-bold tracking-wide">{userInfo.username}</div>
                <div className="text-red-500 text-sm font-bold">
                  SCORE: <span className="text-white">{userScore}</span>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                setShowLeaderboard(true);
                fetchLeaderboard();
              }}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold tracking-wider transition-all duration-300 valorant-button border-2 border-gray-700"
            >
              LEADERBOARD
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold tracking-wider transition-all duration-300 valorant-button"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black text-white mb-2 tracking-wider valorant-title">
            TOURNAMENT BRACKET
          </h2>
          <p className="text-gray-400 text-sm tracking-wide">
            Predict match scores and earn points. +10 for correct, -5 for wrong.
          </p>
        </div>

        {/* Bracket Grid */}
        <div className="space-y-6">
          {organizedMatches.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No matches found for Valorant Game Changers</p>
            </div>
          ) : (
            organizedMatches.map((match, index) => {
              // Handle both id and _id formats from MongoDB
              const matchId = match.id || match._id || (match.ID ? match.ID.$oid || match.ID : null);
              if (!matchId) {
                console.warn('Match without ID:', match);
                return null;
              }
              
              // Convert ObjectID to string if needed
              const matchIdStr = typeof matchId === 'object' ? matchId.$oid || matchId.toString() : matchId.toString();
              
              const prediction = predictions[matchIdStr] || {};
              const isLocked = !canPredict(match);
              const isCompleted = match.status === 'completed' || match.status === 'finished';
              const hasPrediction = prediction.score1 && prediction.score2;

              return (
                <div
                  key={matchIdStr || index}
                  className="bg-gray-900 bg-opacity-90 backdrop-blur-sm border-2 border-gray-800 p-6 valorant-form-simple"
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    {/* Match Info */}
                    <div className="flex-1 min-w-[300px]">
                      <div className="text-red-500 text-xs font-bold tracking-widest mb-2">
                        {match.start_time || 'TBD'} | {match.status?.toUpperCase() || 'UPCOMING'}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Team 1 */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="text-white font-bold text-lg tracking-wide mb-1">
                              {match.team1 || 'TBD'}
                            </div>
                            {isCompleted ? (
                              <div className="text-red-500 font-bold text-2xl">
                                {match.score1 || '0'}
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                max="13"
                                value={prediction.score1 || ''}
                                onChange={(e) => handlePredictionChange(matchIdStr, 'score1', e.target.value)}
                                disabled={isLocked}
                                className={`w-20 px-3 py-2 bg-gray-800 border-2 ${
                                  isLocked ? 'border-gray-700 text-gray-500' : 'border-gray-600 text-white'
                                } focus:border-red-500 focus:outline-none font-bold text-xl tracking-wide`}
                                placeholder="0"
                              />
                            )}
                          </div>
                        </div>

                        {/* VS */}
                        <div className="flex items-center justify-center">
                          <span className="text-gray-500 font-bold text-xl">VS</span>
                        </div>

                        {/* Team 2 */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 text-right">
                            <div className="text-white font-bold text-lg tracking-wide mb-1">
                              {match.team2 || 'TBD'}
                            </div>
                            {isCompleted ? (
                              <div className="text-red-500 font-bold text-2xl">
                                {match.score2 || '0'}
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                max="13"
                                value={prediction.score2 || ''}
                                onChange={(e) => handlePredictionChange(matchIdStr, 'score2', e.target.value)}
                                disabled={isLocked}
                                className={`w-20 px-3 py-2 bg-gray-800 border-2 ${
                                  isLocked ? 'border-gray-700 text-gray-500' : 'border-gray-600 text-white'
                                } focus:border-red-500 focus:outline-none font-bold text-xl tracking-wide ml-auto`}
                                placeholder="0"
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Prediction Status */}
                      {hasPrediction && !isCompleted && (
                        <div className="text-green-400 text-xs font-mono mb-2">
                          ✓ Prediction: {prediction.score1} - {prediction.score2}
                        </div>
                      )}
                      {isLocked && !isCompleted && (
                        <div className="text-yellow-500 text-xs font-mono mb-2">
                          ⚠ Predictions locked (1 hour before match)
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {!isCompleted && (
                      <div className="flex items-center">
                        <button
                          onClick={() => savePrediction(match)}
                          disabled={isLocked || saving[matchIdStr]}
                          className={`px-6 py-3 font-black tracking-widest transition-all duration-300 valorant-button ${
                            isLocked || saving[matchIdStr]
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                        >
                          {saving[matchIdStr] ? 'SAVING...' : hasPrediction ? 'UPDATE' : 'PREDICT'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
          <div className="relative w-1/2 max-w-2xl h-3/4 bg-gray-900 border-2 border-gray-800 valorant-form-simple overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gray-800 border-b-2 border-gray-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-white tracking-wider valorant-title">
                  LEADERBOARD
                </h2>
                <p className="text-red-500 text-xs font-bold tracking-widest mt-1">
                  TOP PREDICTORS
                </p>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold tracking-wider transition-all duration-300 valorant-button text-sm"
              >
                CLOSE
              </button>
            </div>

            {/* Leaderboard Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingLeaderboard ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-white text-lg font-bold tracking-widest">LOADING...</div>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500 text-lg">No players yet</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Top 3 Podium */}
                  {leaderboard.length >= 3 && (
                    <div className="flex justify-center items-end gap-4 mb-6 pb-6 border-b-2 border-gray-800">
                      {/* 2nd Place */}
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-gray-700 border-2 border-gray-600 flex items-center justify-center mb-2 valorant-form-simple">
                          <span className="text-2xl font-black text-gray-400">2</span>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-bold text-sm">{leaderboard[1].username}</div>
                          <div className="text-red-500 font-bold text-lg">{leaderboard[1].score}</div>
                        </div>
                      </div>
                      {/* 1st Place */}
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-yellow-600 border-2 border-yellow-500 flex items-center justify-center mb-2 valorant-form-simple">
                          <span className="text-3xl font-black text-yellow-200">1</span>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-bold">{leaderboard[0].username}</div>
                          <div className="text-yellow-400 font-bold text-xl">{leaderboard[0].score}</div>
                        </div>
                      </div>
                      {/* 3rd Place */}
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-orange-800 border-2 border-orange-700 flex items-center justify-center mb-2 valorant-form-simple">
                          <span className="text-2xl font-black text-orange-400">3</span>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-bold text-sm">{leaderboard[2].username}</div>
                          <div className="text-orange-500 font-bold text-lg">{leaderboard[2].score}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rest of Leaderboard */}
                  <div className="space-y-2">
                    {leaderboard.map((entry, index) => {
                      const currentUserId = userInfo ? (userInfo.id || userInfo._id || (userInfo.ID ? userInfo.ID.$oid || userInfo.ID : null)) : null;
                      const entryUserId = entry.user_id;
                      const isCurrentUser = userInfo && currentUserId && entryUserId && currentUserId.toString() === entryUserId.toString();
                      
                      return (
                        <div
                          key={entry.user_id || index}
                          className={`flex items-center justify-between p-4 border-2 ${
                            isCurrentUser
                              ? 'bg-red-900 bg-opacity-30 border-red-600'
                              : 'bg-gray-800 border-gray-700'
                          } valorant-form-simple`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 flex items-center justify-center font-black text-lg ${
                              index === 0 ? 'bg-yellow-600 text-yellow-200' :
                              index === 1 ? 'bg-gray-700 text-gray-400' :
                              index === 2 ? 'bg-orange-800 text-orange-400' :
                              'bg-gray-700 text-gray-500'
                            } valorant-form-simple`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className={`font-bold tracking-wide ${
                                isCurrentUser ? 'text-red-400' : 'text-white'
                              }`}>
                                {entry.username}
                                {isCurrentUser && <span className="text-red-500 ml-2">(YOU)</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-black text-xl ${
                              entry.score >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {entry.score > 0 ? '+' : ''}{entry.score}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');

        .valorant-title {
          font-family: 'Orbitron', monospace;
          font-weight: 900;
          text-shadow: 0 0 20px rgba(255, 70, 85, 0.5);
        }

        .valorant-form-simple {
          clip-path: polygon(
            0 0,
            calc(100% - 20px) 0,
            100% 20px,
            100% 100%,
            20px 100%,
            0 calc(100% - 20px)
          );
        }

        .valorant-button {
          clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 100%, 15px 100%);
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(45deg);
          }
          50% {
            transform: translateY(-20px) rotate(45deg);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.05;
          }
          50% {
            opacity: 0.1;
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delay-1 {
          animation: float 6s ease-in-out infinite;
          animation-delay: 1s;
        }

        .animate-float-delay-2 {
          animation: float 6s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-pulse-slow-delay {
          animation: pulse-slow 4s ease-in-out infinite;
          animation-delay: 2s;
        }

        input {
          font-family: 'Rajdhani', sans-serif;
        }

        button {
          font-family: 'Rajdhani', sans-serif;
        }
      `}</style>
    </div>
  );
};

export default BracketsPage;

