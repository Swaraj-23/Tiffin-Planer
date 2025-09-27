import React, { useState } from 'react';
import API from '../api';
import { useNavigate, Link } from 'react-router-dom';

export default function Register(){
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const nav = useNavigate();
  async function submit(e){
    e.preventDefault();
    try{
      // Clear any existing token first
      localStorage.clear();
      
      const { data } = await API.post('/api/auth/register',{ name, email, password });
      localStorage.setItem('token', data.token);
      
      // Force reload API instance with new token
      API.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      // Navigate and force a page reload to ensure clean state
      window.location.href = '/';
    }catch(err){
      console.error(err);
      alert(err.response?.data?.error || 'Register failed');
    }
  }
  return (
    <div className="p-5 max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      <form onSubmit={submit}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="w-full p-2 mb-3 border rounded" />
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full p-2 mb-3 border rounded" />
        <input value={password} type="password" onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full p-2 mb-3 border rounded" />
        <button className="w-full p-2 bg-blue-500 text-white rounded">Create account</button>
      </form>
      <p className="mt-3">Have account? <Link to="/login" className="text-blue-600">Login</Link></p>
    </div>
  );
}
