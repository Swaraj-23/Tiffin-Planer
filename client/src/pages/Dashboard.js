import React, { useEffect, useState } from 'react';
import API from '../api';

function getThisWeekMondayISO(offsetWeeks=0){
  // Create date in IST
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istDate = new Date(now.getTime() + istOffset);
  
  // Find Monday
  const day = istDate.getUTCDay();
  const diffToMon = ((day + 6) % 7); // Calculate days to go back to Monday
  
  // Set to Monday 00:00 IST
  const mon = new Date(istDate.getTime());
  mon.setUTCHours(0,0,0,0);
  mon.setUTCDate(mon.getUTCDate() - diffToMon);
  
  // Apply week offset if any
  if (offsetWeeks !== 0) {
    mon.setUTCDate(mon.getUTCDate() + offsetWeeks * 7);
  }
  
  return mon.toISOString().slice(0,10);
}

export default function Dashboard(){
  const [weekStart,setWeekStart] = useState(getThisWeekMondayISO());
  const [users,setUsers] = useState([]);
  const [plans,setPlans] = useState([]);
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
  const [myPlan,setMyPlan] = useState(defaultPlan);
  const [myTotal,setMyTotal] = useState(0);

  useEffect(()=>{ loadAll(); },[weekStart]);

  async function loadAll(){
    try{
      const [uRes,pRes,mRes] = await Promise.all([
        API.get('/api/users'),
        API.get(`/api/plans/week/${weekStart}`),
        API.get(`/api/plans/mine/${weekStart}`)
      ]);
      setUsers(uRes.data);
      setPlans(pRes.data);
      setMyPlan(mRes.data.plan || defaultPlan);
      setMyTotal(mRes.data.total || 0);
    }catch(err){
      console.error(err);
      alert('Failed to load data');
    }
  }

  function handleChangeDay(day, meal, val){
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

  async function save(){
    try{
      const payload = { weekStart, days: myPlan.days };
      const { data } = await API.post('/api/plans', payload);
      setMyPlan(data.plan);
      setMyTotal(data.total);
      
      // Reload all plans to update friends' section
      const pRes = await API.get(`/api/plans/week/${weekStart}`);
      setPlans(pRes.data);
      
      alert('Plan saved successfully!');
    }catch(err){
      console.error(err);
      alert(err.response?.data?.error || 'Save failed');
    }
  }

  function renderPlanForUser(u){
    const p = plans.find(x => String(x.user.id) === String(u._id));
    return (
      <div className="border p-2 rounded-xl mb-2 bg-gray-50">
        <div className="font-bold">{u.name}</div>
        <div className="text-sm">Total: ₹{p ? p.total : 0}</div>
        <div className="flex gap-2 flex-wrap mt-2">
          {['mon','tue','wed','thu','fri','sat'].map(d => (
            <div key={d} className="px-2 py-1 rounded bg-white border">
              <div className="text-xs font-semibold">{d.toUpperCase().slice(0,3)}</div>
              <div className="text-xs">L: {p ? p.days[d].lunch : 'none'}</div>
              <div className="text-xs">D: {p ? p.days[d].dinner : 'none'}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Tiffin Planner</h3>
        <button 
          onClick={()=>{ 
            localStorage.clear(); 
            window.location.href = '/login';
          }} 
          className="px-3 py-1 bg-red-500 text-white rounded"
        >
          Logout
        </button>
      </div>

      <div className="mb-4">
        <div className="mb-2">
          <label className="font-medium">Week starting: </label>
          <span className="text-gray-700">{formatDateIST(weekStart)}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setWeekStart(getThisWeekMondayISO(-1))} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">← Previous Week</button>
          <button onClick={()=>setWeekStart(getThisWeekMondayISO(0))} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Current Week</button>
          <button onClick={()=>setWeekStart(getThisWeekMondayISO(1))} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Next Week →</button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="bg-white p-4 rounded-2xl shadow">
          <h4 className="font-semibold mb-2">Your Plan</h4>
          <div className="flex gap-2 overflow-x-auto">
            {['mon','tue','wed','thu','fri','sat'].map(d => (
              <div key={d} className="min-w-[140px] border rounded-xl p-2">
                <div className="font-bold text-sm mb-2">{d.toUpperCase().slice(0,3)}</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs font-semibold mb-1">Lunch</div>
                    <select 
                      value={myPlan.days[d].lunch} 
                      onChange={e=>handleChangeDay(d,'lunch',e.target.value)} 
                      className="w-full border rounded p-1 text-sm"
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
                      onChange={e=>handleChangeDay(d,'dinner',e.target.value)} 
                      className="w-full border rounded p-1 text-sm"
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
            <button onClick={save} className="bg-blue-500 text-white px-3 py-1 rounded">Save</button>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Friends' Plans</h4>
          {users.filter(u=>u.email).map(u=>renderPlanForUser(u))}
        </div>
      </div>
    </div>
  );
}
