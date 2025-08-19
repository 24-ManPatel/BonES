import React, { useState, useEffect } from 'react';

// Animated Text Component with random character effect
const AnimatedText = ({ text, className, delay = 0 }) => {
  const [displayText, setDisplayText] = useState(text.split('').map(() => ''));
  const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';

  useEffect(() => {
    const timer = setTimeout(() => {
      text.split('').forEach((char, index) => {
        const charDelay = index * 100; // delay between characters

        setTimeout(() => {
          let iterations = 0;
          const maxIterations = 10;

          const scrambleInterval = setInterval(() => {
            setDisplayText(prev => {
              const newText = [...prev];
              if (char === ' ') {
                newText[index] = ' ';
                clearInterval(scrambleInterval);
                return newText;
              }

              if (iterations < maxIterations) {
                newText[index] =
                  randomChars[Math.floor(Math.random() * randomChars.length)];
                iterations++;
              } else {
                newText[index] = char;
                clearInterval(scrambleInterval);
              }
              return newText;
            });
          }, 50);
        }, charDelay);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [text, delay]);

  return (
    <div className={className}>
      {displayText.map((char, index) => (
        <span
          key={index}
          className="inline-block transition-all duration-100"
          style={{
            color: text === 'VALORANT' && index % 2 === 0 ? '#ff4655' : 'inherit'
          }}
        >
          {char || '\u00A0'}
        </span>
      ))}
    </div>
  );
};

const ValorantLoginPage = () => {
  const [loading, setLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiMessage, setApiMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Password validation
  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  // Username validation
  const validateUsername = (username) => {
    // 3-20 characters, alphanumeric and underscore only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  // Real-time validation
  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'email':
        if (!value) {
          error = 'Email is required';
        } else if (!validateEmail(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      
      case 'password':
        if (!value) {
          error = 'Password is required';
        } else if (!validatePassword(value)) {
          error = 'Password must be at least 8 characters with uppercase, lowercase, number and special character';
        }
        break;
      
      case 'username':
        if (!isLogin && !value) {
          error = 'Username is required';
        } else if (!isLogin && !validateUsername(value)) {
          error = 'Username must be 3-20 characters, alphanumeric and underscore only';
        }
        break;
      
      default:
        break;
    }
    
    return error;
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear API message when user starts typing
    if (apiMessage) setApiMessage('');

    // Real-time validation
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate email
    const emailError = validateField('email', formData.email);
    if (emailError) newErrors.email = emailError;
    
    // Validate password
    const passwordError = validateField('password', formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    // Validate username for registration
    if (!isLogin) {
      const usernameError = validateField('username', formData.username);
      if (usernameError) newErrors.username = usernameError;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setApiMessage('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const requestBody = isLogin 
        ? { email: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password, username: formData.username };

      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session management
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        setApiMessage(`✅ ${isLogin ? 'Login successful!' : 'Registration successful!'}`);
        
        if (isLogin) {
          // Store JWT token if provided
          // if (data.token) {
          //   localStorage.setItem('authToken', data.token);
          // }
          
          // Redirect to dashboard or home page
          // setTimeout(() => {
          //   window.location.href = '/dashboard';
          // }, 1500);

          setTimeout(() => {
            setApiMessage('Login successful! Welcome to the game!');
          }, 1500);
        } else {
          // Switch to login after successful registration
          setTimeout(() => {
            setIsLogin(true);
            setFormData({ email: formData.email, password: '', username: '' });
            setApiMessage('Registration successful! Please login.');
          }, 1500);
        }
      } else {
        setApiMessage(`${data.message || 'An error occurred'}`);
      }
    } catch (error) {
      console.error('API Error:', error);
      setApiMessage('Network error. Please check if the backend server is running on localhost:8080');    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black overflow-hidden">
        <img
          src="/jett.webp"
          alt="Loading Animation"
          className="w-full h-full object-cover"
          style={{
            imageRendering: 'auto',
            objectFit: 'cover'
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Subtle background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 border border-red-500 transform rotate-45 animate-float"></div>
          <div className="absolute top-60 right-20 w-24 h-24 border border-red-600 transform rotate-12 animate-float-delay-1"></div>
          <div className="absolute bottom-40 left-1/4 w-16 h-16 border border-red-400 transform -rotate-12 animate-float-delay-2"></div>
          <div className="absolute bottom-20 right-1/3 w-20 h-20 border border-red-500 transform rotate-45 animate-float-delay-3"></div>
        </div>

        <div className="absolute top-1/4 left-0 w-96 h-96 bg-red-600 opacity-5 blur-3xl rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-red-500 opacity-3 blur-3xl rounded-full animate-pulse-slow-delay"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        {/* 🔥 FIXED WIDTH FORM CONTAINER */}
        <div className="w-[500px] mx-auto">
          {/* Animated Title */}
          <div className="text-center mb-12">
            <AnimatedText
              text="B'on'ES "
              className="text-6xl font-black text-white mb-4 tracking-wider valorant-title"
              delay={0}
            />
            <AnimatedText
              text="PREDICT • CONQUER • DOMINATE"
              className="text-xl text-red-500 font-bold tracking-widest opacity-90"
              delay={1200}
            />
          </div>

          {/* Form */}
          <div className="valorant-form bg-gray-900 bg-opacity-90 backdrop-blur-sm p-10 animate-slide-up">
            {/* Tab Switcher */}
            <div className="flex mb-8 bg-black rounded-none p-0 overflow-hidden valorant-tabs">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setErrors({});
                  setApiMessage('');
                }}
                className={`flex-1 py-4 text-sm font-bold tracking-wider transition-all duration-300 relative overflow-hidden ${
                  isLogin
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span className="relative z-10">LOGIN</span>
                {isLogin && (
                  <div className="absolute inset-0 bg-red-600 animate-tab-slide"></div>
                )}
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setErrors({});
                  setApiMessage('');
                }}
                className={`flex-1 py-4 text-sm font-bold tracking-wider transition-all duration-300 relative overflow-hidden ${
                  !isLogin
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span className="relative z-10">REGISTER</span>
                {!isLogin && (
                  <div className="absolute inset-0 bg-red-600 animate-tab-slide"></div>
                )}
              </button>
            </div>

            <div className="space-y-8">
              {!isLogin && (
                <div className="animate-fade-in-up">
                  <label className="block text-sm font-bold text-red-500 mb-3 tracking-widest">
                    USERNAME
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`w-full px-0 py-4 bg-transparent border-0 border-b-2 ${
                      errors.username ? 'border-red-400' : 'border-gray-700'
                    } text-white text-lg placeholder-gray-500 focus:outline-none focus:border-red-500 transition-all duration-300 font-mono tracking-wide`}
                    placeholder="ENTER USERNAME"
                    required
                  />
                  {errors.username && (
                    <p className="text-red-400 text-sm mt-2 font-mono tracking-wide">
                      {errors.username}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-red-500 mb-3 tracking-widest">
                  EMAIL
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-0 py-4 bg-transparent border-0 border-b-2 ${
                    errors.email ? 'border-red-400' : 'border-gray-700'
                  } text-white text-lg placeholder-gray-500 focus:outline-none focus:border-red-500 transition-all duration-300 font-mono tracking-wide`}
                  placeholder="ENTER EMAIL"
                  required
                />
                {errors.email && (
                  <p className="text-red-400 text-sm mt-2 font-mono tracking-wide">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-red-500 mb-3 tracking-widest">
                  PASSWORD
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-0 py-4 bg-transparent border-0 border-b-2 ${
                    errors.password ? 'border-red-400' : 'border-gray-700'
                  } text-white text-lg placeholder-gray-500 focus:outline-none focus:border-red-500 transition-all duration-300 font-mono tracking-wide`}
                  placeholder="ENTER PASSWORD"
                  required
                />
                {errors.password && (
                  <p className="text-red-400 text-sm mt-2 font-mono tracking-wide">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* API Response Message */}
              {apiMessage && (
                <div className={`text-center p-3 rounded ${
                  apiMessage.includes('✅') ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                } font-mono tracking-wide`}>
                  {apiMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full ${
                  isSubmitting 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white font-black py-5 text-lg tracking-widest transition-all duration-300 transform hover:scale-105 focus:outline-none valorant-button group relative overflow-hidden`}
              >
                <span className="relative z-10">
                  {isSubmitting 
                    ? (isLogin ? 'ENTERING...' : 'JOINING...') 
                    : (isLogin ? 'ENTER GAME' : 'JOIN THE FIGHT')
                  }
                </span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              </button>
            </div>

            {isLogin && (
              <div className="mt-8 text-center">
                <a
                  href="#"
                  className="text-sm text-gray-500 hover:text-red-500 transition-colors duration-300 tracking-wide"
                >
                  FORGOT PASSWORD?
                </a>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-600 text-sm tracking-wide">
            <p>© 2025 VALORANT E-SPORTS PREDICTIONS</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');

        .valorant-title {
          font-family: 'Orbitron', monospace;
          font-weight: 900;
          text-shadow: 0 0 20px rgba(255, 70, 85, 0.5);
        }

        .valorant-form {
          clip-path: polygon(
            0 0,
            calc(100% - 30px) 0,
            100% 30px,
            100% 100%,
            30px 100%,
            0 calc(100% - 30px)
          );
          border: 2px solid #333;
          width: 500px; /* 🔥 Fixed width */
        }

        .valorant-tabs button {
          clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 100%, 15px 100%);
          margin-right: -15px;
        }

        .valorant-tabs button:last-child {
          margin-right: 0;
          clip-path: polygon(15px 0, 100% 0, 100% 100%, 0 100%);
        }

        .valorant-button {
          clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 100%, 20px 100%);
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(45deg);
          }
          50% {
            transform: translateY(-20px) rotate(45deg);
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.05;
          }
          50% {
            opacity: 0.1;
          }
        }

        @keyframes tab-slide {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
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

        .animate-float-delay-3 {
          animation: float 6s ease-in-out infinite;
          animation-delay: 3s;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-pulse-slow-delay {
          animation: pulse-slow 4s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-tab-slide {
          animation: tab-slide 0.3s ease-out;
        }

        input::placeholder {
          color: #6b7280;
          font-family: 'Rajdhani', sans-serif;
        }

        input {
          font-family: 'Rajdhani', sans-serif;
        }

        label {
          font-family: 'Rajdhani', sans-serif;
        }

        button {
          font-family: 'Rajdhani', sans-serif;
        }
      `}</style>
    </div>
  );
};

export default ValorantLoginPage;