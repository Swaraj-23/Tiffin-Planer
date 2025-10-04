import React, { useState } from 'react';
import API from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Login(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const nav = useNavigate();
  async function submit(e){
    e.preventDefault();
    try {
      // Clear any existing token first
      localStorage.clear();
      
      const { data } = await API.post('/api/auth/login',{ email, password });
      localStorage.setItem('token', data.token);
      
      // Force reload API instance with new token
      API.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      // Navigate and force a page reload to ensure clean state
      window.location.href = '/';
    } catch(err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Login failed');
    }
  }
  return (
    <div className="p-5 max-w-md mx-auto mt-10">
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
        theme="light"
      />
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      <form onSubmit={submit}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full p-2 mb-3 border rounded" />
        <input value={password} type="password" onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full p-2 mb-3 border rounded" />
        <button className="w-full p-2 bg-blue-500 text-white rounded">Login</button>
      </form>
      <p className="mt-3">No account? <Link to="/register" className="text-blue-600">Register</Link></p>
    </div>
  );
}
