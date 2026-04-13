import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// ── helpers ───────────────────────────────────────────────────────────────────

function parseMatchTime(timeStr) {
  if (!timeStr) return null;
  // ISO format (new scraper)
  const iso = new Date(timeStr);
  if (!isNaN(iso.getTime())) return iso;
  // Legacy "1:30 PM"
  const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (m) {
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const ap = m[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    const d = new Date();
    d.setHours(h, min, 0, 0);
    if (d < new Date()) d.setDate(d.getDate() + 1);
    return d;
  }
  return null;
}

function canPredict(match) {
  if (match.status === 'completed' || match.status === 'finished') return false;
  const t = parseMatchTime(match.start_time);
  if (!t) return true;
  return new Date() < new Date(t.getTime() - 60 * 60 * 1000);
}

function getMatchId(match) {
  const raw = match.id || match._id || (match.ID ? match.ID.$oid || match.ID : null);
  if (!raw) return null;
  return typeof raw === 'object' ? (raw.$oid || raw.toString()) : raw.toString();
}

function formatMatchTime(timeStr) {
  if (!timeStr) return 'TBD';
  const t = parseMatchTime(timeStr);
  if (!t) return timeStr;
  return t.toLocaleString('en-IN', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short',
  });
}

function groupByDate(matches) {
  const groups = {};
  for (const m of matches) {
    const t = parseMatchTime(m.start_time);
    const key = t
      ? t.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })
      : 'Unknown Date';
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }
  // Sort groups by date
  return Object.entries(groups).sort(([a], [b]) => {
    const da = new Date(a), db = new Date(b);
    return da - db;
  });
}

// ── Point badge ───────────────────────────────────────────────────────────────
function PointBadge({ pts }) {
  if (pts === undefined || pts === null) return null;
  const color = pts > 0 ? 'text-green-400' : pts < 0 ? 'text-red-400' : 'text-gray-400';
  return (
    <span className={`font-black text-sm ${color}`}>
      {pts > 0 ? `+${pts}` : pts} PTS
    </span>
  );
}

// ── Match Card ────────────────────────────────────────────────────────────────
function MatchCard({ match, prediction, onPredict, saving }) {
  const [pickedWinner, setPickedWinner] = useState(prediction?.predicted_winner || '');
  const [score1, setScore1] = useState(prediction?.predicted_score1 || '');
  const [score2, setScore2] = useState(prediction?.predicted_score2 || '');
  const [showBonus, setShowBonus] = useState(false);

  const matchId = getMatchId(match);
  const locked = !canPredict(match);
  const finished = match.status === 'completed' || match.status === 'finished';
  const hasPick = !!pickedWinner;
  const evaluated = prediction?.is_evaluated;

  // Sync external prediction changes
  useEffect(() => {
    setPickedWinner(prediction?.predicted_winner || '');
    setScore1(prediction?.predicted_score1 || '');
    setScore2(prediction?.predicted_score2 || '');
  }, [prediction]);

  const handleTeamPick = (team) => {
    if (locked || finished) return;
    setPickedWinner(team);
    if (team === match.team1) {
      setScore1(''); setScore2('');
    } else {
      setScore1(''); setScore2('');
    }
  };

  const handleSave = () => {
    if (!pickedWinner) return;
    onPredict(matchId, pickedWinner, score1, score2);
  };

  const team1Won = finished && parseInt(match.score1) > parseInt(match.score2);
  const team2Won = finished && parseInt(match.score2) > parseInt(match.score1);

  return (
    <div className="relative bg-gray-900 bg-opacity-95 border border-gray-700 valorant-card p-5 group hover:border-red-700 transition-colors duration-300">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-red-500 text-xs font-bold tracking-widest font-mono">
          {formatMatchTime(match.start_time)}
        </span>
        <div className="flex items-center gap-3">
          {evaluated && <PointBadge pts={prediction?.points} />}
          <span className={`text-xs font-bold tracking-widest px-2 py-0.5 ${
            finished ? 'bg-gray-800 text-gray-400' :
            locked   ? 'bg-yellow-900 text-yellow-400' :
                       'bg-green-900 text-green-400'
          }`}>
            {finished ? 'COMPLETED' : locked ? 'LOCKED' : 'OPEN'}
          </span>
        </div>
      </div>

      {/* Teams row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Team 1 */}
        <button
          onClick={() => handleTeamPick(match.team1)}
          disabled={locked || finished}
          className={`relative p-4 border-2 text-left transition-all duration-200 valorant-card
            ${pickedWinner === match.team1
              ? 'border-red-500 bg-red-900 bg-opacity-20'
              : 'border-gray-700 hover:border-gray-500'}
            ${locked || finished ? 'cursor-default' : 'cursor-pointer'}
            ${team1Won ? 'border-green-500' : ''}
          `}
        >
          <div className="font-black text-white text-base tracking-wide leading-tight">
            {match.team1 || 'TBD'}
          </div>
          {finished && (
            <div className={`font-black text-3xl mt-1 ${team1Won ? 'text-green-400' : 'text-gray-500'}`}>
              {match.score1 || '—'}
            </div>
          )}
          {pickedWinner === match.team1 && !finished && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* VS */}
        <div className="text-center">
          <div className="text-gray-600 font-black text-sm tracking-widest">VS</div>
        </div>

        {/* Team 2 */}
        <button
          onClick={() => handleTeamPick(match.team2)}
          disabled={locked || finished}
          className={`relative p-4 border-2 text-right transition-all duration-200 valorant-card
            ${pickedWinner === match.team2
              ? 'border-red-500 bg-red-900 bg-opacity-20'
              : 'border-gray-700 hover:border-gray-500'}
            ${locked || finished ? 'cursor-default' : 'cursor-pointer'}
            ${team2Won ? 'border-green-500' : ''}
          `}
        >
          <div className="font-black text-white text-base tracking-wide leading-tight">
            {match.team2 || 'TBD'}
          </div>
          {finished && (
            <div className={`font-black text-3xl mt-1 ${team2Won ? 'text-green-400' : 'text-gray-500'}`}>
              {match.score2 || '—'}
            </div>
          )}
          {pickedWinner === match.team2 && !finished && (
            <div className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Prediction status / bonus / save */}
      {!finished && (
        <div className="mt-4 space-y-3">
          {hasPick && (
            <div className="text-xs text-gray-400 font-mono">
              PICK: <span className="text-red-400 font-bold">{pickedWinner}</span>
              {prediction?.predicted_score1 && (
                <span className="text-gray-500 ml-2">
                  ({prediction.predicted_score1}–{prediction.predicted_score2})
                </span>
              )}
            </div>
          )}

          {locked ? (
            <div className="text-yellow-500 text-xs font-mono">PREDICTIONS LOCKED</div>
          ) : (
            <>
              {/* Bonus score toggle */}
              {hasPick && (
                <button
                  onClick={() => setShowBonus(v => !v)}
                  className="text-xs text-gray-500 hover:text-gray-300 font-mono underline transition-colors"
                >
                  {showBonus ? 'Hide' : '+ Predict series score'} (bonus +5 pts)
                </button>
              )}

              {showBonus && hasPick && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 text-xs font-mono">Series:</span>
                  <input
                    type="number" min="0" max="3"
                    value={score1}
                    onChange={e => setScore1(e.target.value)}
                    placeholder={match.team1?.slice(0, 3).toUpperCase()}
                    className="w-14 px-2 py-1 bg-gray-800 border border-gray-600 text-white text-center font-bold focus:border-red-500 focus:outline-none text-sm"
                  />
                  <span className="text-gray-600">–</span>
                  <input
                    type="number" min="0" max="3"
                    value={score2}
                    onChange={e => setScore2(e.target.value)}
                    placeholder={match.team2?.slice(0, 3).toUpperCase()}
                    className="w-14 px-2 py-1 bg-gray-800 border border-gray-600 text-white text-center font-bold focus:border-red-500 focus:outline-none text-sm"
                  />
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={!hasPick || saving}
                className={`px-5 py-2 font-black tracking-widest text-sm valorant-button transition-all duration-200 ${
                  !hasPick || saving
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {saving ? 'SAVING...' : prediction?.predicted_winner ? 'UPDATE PICK' : 'LOCK IN PICK'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Result line for completed matches */}
      {finished && evaluated && (
        <div className={`mt-3 text-xs font-mono font-bold ${
          prediction?.winner_correct ? 'text-green-400' : 'text-gray-600'
        }`}>
          {prediction?.winner_correct
            ? `✓ CORRECT PICK ${prediction?.score_correct ? '+ BONUS SCORE' : ''}`
            : prediction?.predicted_winner
              ? `✗ PICKED ${prediction.predicted_winner}`
              : 'NO PICK MADE'}
        </div>
      )}
    </div>
  );
}

// ── Leaderboard Modal ─────────────────────────────────────────────────────────
function LeaderboardModal({ entries, loading, currentUserId, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-gray-900 border border-gray-700 valorant-card flex flex-col max-h-[80vh]">
        <div className="p-5 border-b border-gray-700 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-white tracking-wider valorant-title">LEADERBOARD</h2>
            <p className="text-red-500 text-xs font-bold tracking-widest mt-0.5">TOP PREDICTORS</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold tracking-widest valorant-button"
          >
            CLOSE
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="text-center py-10 text-gray-500 font-mono tracking-widest">LOADING...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-gray-600">No entries yet</div>
          ) : (
            <>
              {/* Podium */}
              {entries.length >= 3 && (
                <div className="flex justify-center items-end gap-3 mb-6 pb-5 border-b border-gray-800">
                  {[entries[1], entries[0], entries[2]].map((e, i) => {
                    const realRank = i === 1 ? 1 : i === 0 ? 2 : 3;
                    const heights  = ['h-20', 'h-28', 'h-16'];
                    const colors   = ['bg-gray-700 border-gray-500', 'bg-yellow-700 border-yellow-500', 'bg-orange-900 border-orange-700'];
                    const textCols = ['text-gray-300', 'text-yellow-200', 'text-orange-300'];
                    return (
                      <div key={e.user_id} className="flex flex-col items-center gap-1">
                        <div className={`w-16 ${heights[i]} ${colors[i]} border-2 valorant-card flex items-center justify-center`}>
                          <span className={`text-2xl font-black ${textCols[i]}`}>{realRank}</span>
                        </div>
                        <div className="text-white text-xs font-bold text-center w-20 truncate">{e.username}</div>
                        <div className={`font-black text-sm ${textCols[i]}`}>{e.score} pts</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Full list */}
              <div className="space-y-2">
                {entries.map((e, i) => {
                  const isMe = currentUserId && e.user_id === currentUserId;
                  return (
                    <div key={e.user_id || i}
                      className={`flex items-center justify-between p-3 border valorant-card ${
                        isMe ? 'border-red-600 bg-red-900 bg-opacity-15' : 'border-gray-800 bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 flex items-center justify-center font-black text-sm valorant-card ${
                          i === 0 ? 'bg-yellow-700 text-yellow-200' :
                          i === 1 ? 'bg-gray-600 text-gray-300' :
                          i === 2 ? 'bg-orange-900 text-orange-400' : 'bg-gray-700 text-gray-500'
                        }`}>{i + 1}</div>
                        <div>
                          <div className={`font-bold text-sm ${isMe ? 'text-red-400' : 'text-white'}`}>
                            {e.username} {isMe && <span className="text-red-500 text-xs">(YOU)</span>}
                          </div>
                          {e.total > 0 && (
                            <div className="text-gray-600 text-xs font-mono">
                              {e.correct}/{e.total} correct
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`font-black text-lg ${e.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {e.score > 0 ? `+${e.score}` : e.score}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BracketsPage() {
  const [matches,      setMatches]      = useState([]);
  const [predictions,  setPredictions]  = useState({});  // matchId → prediction obj
  const [userScore,    setUserScore]    = useState(0);
  const [userInfo,     setUserInfo]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState({});
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [showLB,       setShowLB]       = useState(false);
  const [loadingLB,    setLoadingLB]    = useState(false);
  const [toast,        setToast]        = useState(null);
  const navigate = useNavigate();

  const token = () => localStorage.getItem('authToken');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const authFetch = useCallback(async (url, opts = {}) => {
    const res = await fetch(url, {
      ...opts,
      headers: { ...opts.headers, Authorization: `Bearer ${token()}` },
    });
    if (res.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      navigate('/login');
      return null;
    }
    return res;
  }, [navigate]);

  useEffect(() => {
    const t = token();
    const u = localStorage.getItem('user');
    if (!t || !u) { navigate('/login'); return; }
    try { setUserInfo(JSON.parse(u)); } catch (_) {}

    Promise.all([
      fetchMatches(),
      fetchPredictions(),
      fetchScore(),
      fetchLeaderboard(),
    ]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMatches() {
    try {
      const res = await fetch(`${API}/api/v1/matches`);
      if (res.ok) setMatches((await res.json()) || []);
    } catch (e) { console.error(e); }
  }

  async function fetchPredictions() {
    const res = await authFetch(`${API}/api/v1/protected/predictions`);
    if (!res || !res.ok) return;
    const data = await res.json();
    const map = {};
    if (Array.isArray(data)) data.forEach(p => { map[p.match_id] = p; });
    setPredictions(map);
  }

  async function fetchScore() {
    const res = await authFetch(`${API}/api/v1/protected/score`);
    if (!res || !res.ok) return;
    const data = await res.json();
    setUserScore(data.score || 0);
  }

  async function fetchLeaderboard() {
    setLoadingLB(true);
    try {
      const res = await fetch(`${API}/api/v1/leaderboard`);
      if (res.ok) setLeaderboard(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingLB(false); }
  }

  async function handlePredict(matchId, winner, s1, s2) {
    setSaving(prev => ({ ...prev, [matchId]: true }));
    try {
      const body = { match_id: matchId, predicted_winner: winner };
      if (s1 && s2) { body.predicted_score1 = s1; body.predicted_score2 = s2; }

      const res = await authFetch(`${API}/api/v1/protected/predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res) return;
      if (res.ok) {
        showToast(`Pick locked in: ${winner}`);
        await Promise.all([fetchPredictions(), fetchScore()]);
      } else {
        const d = await res.json();
        showToast(d.message || 'Error saving pick', 'error');
      }
    } catch (e) {
      showToast('Network error. Try again.', 'error');
    } finally {
      setSaving(prev => ({ ...prev, [matchId]: false }));
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const sortedMatches = [...matches].sort((a, b) => {
    const ta = parseMatchTime(a.start_time), tb = parseMatchTime(b.start_time);
    if (!ta || !tb) return 0;
    return ta - tb;
  });

  const grouped = groupByDate(sortedMatches);
  const currentUserId = userInfo?.id || userInfo?._id;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white font-black tracking-widest valorant-title animate-pulse">
          LOADING BRACKETS...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Subtle bg glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-red-700 opacity-4 blur-3xl rounded-full" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-red-600 opacity-3 blur-3xl rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950 bg-opacity-95 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wider valorant-title">B'on'ES</h1>
            <p className="text-red-500 text-xs font-bold tracking-widest">VCT FANTASY PICKS</p>
          </div>
          <div className="flex items-center gap-4">
            {userInfo && (
              <div className="text-right hidden sm:block">
                <div className="text-white font-bold text-sm tracking-wide">{userInfo.username}</div>
                <div className="text-red-500 text-xs font-bold">
                  SCORE: <span className={userScore >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {userScore > 0 ? `+${userScore}` : userScore}
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={() => { setShowLB(true); fetchLeaderboard(); }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-black tracking-widest valorant-button transition-colors"
            >
              LEADERBOARD
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-black tracking-widest valorant-button transition-colors"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 font-bold text-sm tracking-wide valorant-card transition-all ${
          toast.type === 'error' ? 'bg-red-900 border border-red-600 text-red-200' : 'bg-green-900 border border-green-600 text-green-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Content */}
      <main className="relative z-10 container mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white tracking-wider valorant-title mb-2">
            MATCH PICKS
          </h2>
          <p className="text-gray-500 text-sm tracking-wide">
            Pick the winner of each match. +10 pts correct, +5 bonus for exact series score.
          </p>
        </div>

        {grouped.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <div className="text-lg font-mono">NO MATCHES FOUND</div>
            <div className="text-sm mt-2">Run the scraper to fetch VCT match data.</div>
          </div>
        ) : (
          grouped.map(([dateLabel, dayMatches]) => (
            <div key={dateLabel} className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-xs font-black tracking-widest text-red-500 uppercase">{dateLabel}</div>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {dayMatches.map(match => {
                  const id = getMatchId(match);
                  if (!id) return null;
                  return (
                    <MatchCard
                      key={id}
                      match={match}
                      prediction={predictions[id]}
                      onPredict={handlePredict}
                      saving={saving[id]}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Leaderboard modal */}
      {showLB && (
        <LeaderboardModal
          entries={leaderboard}
          loading={loadingLB}
          currentUserId={currentUserId}
          onClose={() => setShowLB(false)}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap');

        .valorant-title { font-family: 'Orbitron', monospace; font-weight: 900; }

        .valorant-card {
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
        }

        .valorant-button {
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%);
        }

        * { font-family: 'Rajdhani', sans-serif; }
        .valorant-title { font-family: 'Orbitron', monospace !important; }
      `}</style>
    </div>
  );
}
