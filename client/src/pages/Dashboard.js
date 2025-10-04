import React, { useEffect, useState } from 'react';
import API from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';

function getThisWeekMondayISO(offsetWeeks=0) {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  
  const day = istDate.getUTCDay();
  const diffToMon = ((day + 6) % 7);
  
  const mon = new Date(istDate.getTime());
  mon.setUTCHours(0,0,0,0);
  mon.setUTCDate(mon.getUTCDate() - diffToMon);
  
  if (offsetWeeks !== 0) {
    mon.setUTCDate(mon.getUTCDate() + offsetWeeks * 7);
  }
  
  return mon.toISOString().slice(0,10);
}

export default function Dashboard() {
  const { darkMode, setDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(getThisWeekMondayISO());
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const defaultPlan = {
    days: {
      mon: { lunch: 'none', dinner: 'none' },
      tue: { lunch: 'none', dinner: 'none' },
      wed: { lunch: 'none', dinner: 'none' },
      thu: { lunch: 'none', dinner: 'none' },
      fri: { lunch: 'none', dinner: 'none' },
      sat: { lunch: 'none', dinner: 'none' }
    }
  };
  
  const [myPlan, setMyPlan] = useState(defaultPlan);
  const [myTotal, setMyTotal] = useState(0);

  useEffect(() => { loadAll(); }, [weekStart]);

  async function loadAll() {
    setIsLoading(true);
    try {
      const [uRes, pRes, mRes] = await Promise.all([
        API.get('/api/users'),
        API.get(`/api/plans/week/${weekStart}`),
        API.get(`/api/plans/mine/${weekStart}`)
      ]);
      setUsers(uRes.data);
      setPlans(pRes.data);
      setMyPlan(mRes.data.plan || defaultPlan);
      setMyTotal(mRes.data.total || 0);
    } catch(err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const getMealTypeColor = (type) => {
    if (darkMode) {
      switch(type) {
        case 'full': return 'bg-green-900 text-green-100';
        case 'half': return 'bg-yellow-900 text-yellow-100';
        case 'none': return 'bg-gray-800 text-gray-200';
        default: return 'bg-gray-800';
      }
    }
    switch(type) {
      case 'full': return 'bg-green-100 text-green-800';
      case 'half': return 'bg-yellow-100 text-yellow-800';
      case 'none': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100';
    }
  };

  function handleChangeDay(day, meal, val) {
    setMyPlan(p => ({
      ...p,
      days: {
        ...p.days,
        [day]: {
          ...p.days[day],
          [meal]: val
        }
      }
    }));
  }

  async function save() {
    try {
      const payload = { weekStart, days: myPlan.days };
      const { data } = await API.post('/api/plans', payload);
      setMyPlan(data.plan);
      setMyTotal(data.total);
      
      const pRes = await API.get(`/api/plans/week/${weekStart}`);
      setPlans(pRes.data);
      
      toast.success('Plan saved successfully!');
    } catch(err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Save failed');
    }
  }

  const getWeeklySummary = () => {
    const summary = {
      fullMeals: 0,
      halfMeals: 0,
      totalDays: 0
    };
    
    if (myPlan?.days) {
      Object.values(myPlan.days).forEach(day => {
        if (day.lunch !== 'none') summary.totalDays++;
        if (day.dinner !== 'none') summary.totalDays++;
        if (day.lunch === 'full') summary.fullMeals++;
        if (day.dinner === 'full') summary.fullMeals++;
        if (day.lunch === 'half') summary.halfMeals++;
        if (day.dinner === 'half') summary.halfMeals++;
      });
    }
    
    return summary;
  };

  // Format date in IST
  function formatDateIST(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-white'}`}>
      <div className="p-4 max-w-2xl mx-auto">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={darkMode ? 'dark' : 'light'}
        />
        
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Weekly Summary */}
            <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-blue-50'}`}>
              <h3 className="text-lg font-semibold mb-3">Weekly Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <div className="text-2xl font-bold text-blue-500">{getWeeklySummary().totalDays}</div>
                  <div className="text-sm text-gray-500">Total Meals</div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <div className="text-2xl font-bold text-green-500">{getWeeklySummary().fullMeals}</div>
                  <div className="text-sm text-gray-500">Full Meals</div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <div className="text-2xl font-bold text-yellow-500">{getWeeklySummary().halfMeals}</div>
                  <div className="text-sm text-gray-500">Half Meals</div>
                </div>
              </div>
            </div>

            {/* Header with Dark Mode and Profile */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold">Tiffin Planner</h3>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-full ${darkMode ? 'bg-yellow-500' : 'bg-gray-800 text-white'}`}
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    {users.find(u => u._id === localStorage.getItem('userId'))?.name?.charAt(0) || (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium">
                    {users.find(u => u._id === localStorage.getItem('userId'))?.name}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Logout Confirmation Dialog */}
            {showLogoutConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} max-w-sm mx-4`}>
                  <h3 className="text-lg font-semibold mb-4">Confirm Logout</h3>
                  <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Are you sure you want to logout?</p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmLogout}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Date Navigation */}
            <div className="mb-4">
              <div className="mb-2">
                <label className="font-medium">Week starting: </label>
                {showDatePicker ? (
                  <input 
                    type="date" 
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className={`px-2 py-1 rounded border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white'}`}
                  />
                ) : (
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatDateIST(weekStart)}
                  </span>
                )}
                <button 
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="ml-2 text-blue-500 text-sm hover:underline"
                >
                  {showDatePicker ? 'Hide' : 'Change'}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setWeekStart(getThisWeekMondayISO(-1))} 
                  className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
                  ← Previous Week
                </button>
                <button onClick={() => setWeekStart(getThisWeekMondayISO(0))} 
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Current Week
                </button>
                <button onClick={() => setWeekStart(getThisWeekMondayISO(1))} 
                  className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
                  Next Week →
                </button>
              </div>
            </div>

            {/* Meal Planning Section */}
            <div className={`p-4 rounded-2xl shadow mb-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h4 className="font-semibold mb-2">Your Plan</h4>
              <div className="flex gap-2 overflow-x-auto">
                {['mon','tue','wed','thu','fri','sat'].map(d => (
                  <div key={d} className={`min-w-[140px] rounded-xl p-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'border'}`}>
                    <div className="font-bold text-sm mb-2">{d.toUpperCase().slice(0,3)}</div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-semibold mb-1">Lunch</div>
                        <select 
                          value={myPlan.days[d].lunch} 
                          onChange={e => handleChangeDay(d,'lunch',e.target.value)} 
                          className={`w-full rounded p-1 text-sm ${darkMode ? 'bg-gray-800 border-gray-600' : 'border'}`}
                        >
                          <option value="none">None</option>
                          <option value="half">Half (₹50)</option>
                          <option value="full">Full (₹65)</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-xs font-semibold mb-1">Dinner</div>
                        <select 
                          value={myPlan.days[d].dinner} 
                          onChange={e => handleChangeDay(d,'dinner',e.target.value)} 
                          className={`w-full rounded p-1 text-sm ${darkMode ? 'bg-gray-800 border-gray-600' : 'border'}`}
                        >
                          <option value="none">None</option>
                          <option value="half">Half (₹50)</option>
                          <option value="full">Full (₹65)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="font-medium">Total: ₹{myTotal}</span>
                <button onClick={save} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                  Save
                </button>
              </div>
            </div>

            {/* Friends Plans */}
            <div>
              <h4 className="font-semibold mb-2">Friends' Plans</h4>
              {users.filter(u=>u.email).map(u => (
                <div key={u._id} className={`border p-2 rounded-xl mb-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold">{u.name}</div>
                      <div className="text-sm">
                        Total: ₹{plans.find(x => String(x.user.id) === String(u._id))?.total || 0}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {['mon','tue','wed','thu','fri','sat'].map(d => {
                      const p = plans.find(x => String(x.user.id) === String(u._id));
                      return (
                        <div key={d} className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-white border'}`}>
                          <div className="text-xs font-semibold">{d.toUpperCase().slice(0,3)}</div>
                          <div className={`text-xs px-1 rounded mt-1 ${getMealTypeColor(p?.days[d]?.lunch)}`}>
                            L: {p?.days[d]?.lunch || 'none'}
                          </div>
                          <div className={`text-xs px-1 rounded mt-1 ${getMealTypeColor(p?.days[d]?.dinner)}`}>
                            D: {p?.days[d]?.dinner || 'none'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Group Summary */}
            <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-blue-50'}`}>
              <div className="text-lg font-semibold">Group Summary</div>
              <div className="flex flex-wrap gap-4 mt-2">
                <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <div className="text-sm text-gray-600">Your Total</div>
                  <div className="font-medium">₹{myTotal}</div>
                </div>
                <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <div className="text-sm text-gray-600">Group Total</div>
                  <div className="font-medium">₹{plans.reduce((sum, p) => sum + p.total, 0)}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}