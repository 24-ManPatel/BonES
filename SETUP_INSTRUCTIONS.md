# Setup Instructions for BonES Application

## Issues Fixed

1. **Login Redirect**: Changed from `window.location.href` to React Router's `navigate()` for proper SPA navigation
2. **useEffect Dependencies**: Fixed dependency array in BracketsPage to prevent infinite loops
3. **Error Handling**: Added better error handling for API calls with proper authentication checks
4. **Token Validation**: Added checks to ensure token exists before making API calls

## Commands to Run

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install/Update Go dependencies:**
   ```bash
   go mod tidy
   ```

3. **Run the backend server:**
   ```bash
   go run main.go
   ```
   
   The server should start on `http://localhost:8080`

### Frontend Setup

1. **Open a new terminal and navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The frontend should start on `http://localhost:5173`

## Environment Variables

Make sure you have a `.env` file in the root directory with:
- `MONGO_URI` - Your MongoDB connection string
- `DB_NAME` - Your database name
- `COLLECTION_NAME` - Your matches collection name
- `JWT_SECRET` - Secret key for JWT tokens (optional, has default)

## Testing the Application

1. Start both backend and frontend servers
2. Navigate to `http://localhost:5173`
3. Go to `/login` page
4. Login with your credentials
5. You should be redirected to `/brackets` page automatically

## Troubleshooting

### If brackets page doesn't load:

1. **Check browser console** for any JavaScript errors
2. **Check network tab** to see if API calls are failing
3. **Verify backend is running** on port 8080
4. **Check CORS settings** - backend should allow `http://localhost:5173`
5. **Verify token is stored** - Check localStorage in browser DevTools for `authToken` and `user`

### Common Issues:

- **401 Unauthorized**: Token might be expired or invalid. Try logging in again.
- **CORS errors**: Make sure backend CORS is configured for `http://localhost:5173`
- **API not responding**: Check if backend server is running and MongoDB is connected

## File Changes Made

1. `frontend/src/components/Login.jsx` - Added useNavigate hook and changed redirect method
2. `frontend/src/components/BracketsPage.jsx` - Fixed useEffect dependencies and added error handling
3. `backend/models/match.go` - Added `FetchedAt` field to Match model
4. `backend/handlers/matchHandler.go` - Added date filtering to show only matches from last 5 days to next 5 days
5. Backend imports are correctly commented out (not used)

## Date Filtering Feature

The matches API now filters matches to show only:
- **Last 5 days**: Matches that occurred in the past 5 days
- **Next 5 days**: Matches scheduled for the next 5 days

This filtering is based on:
1. `fetched_at` field: Ensures we're working with recently fetched data (within last 30 days)
2. `start_time` field: Primary filter to show matches scheduled within the ±5 day window

The system uses the current date to calculate the date range dynamically.

