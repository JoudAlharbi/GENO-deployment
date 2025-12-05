import React,{useEffect,useState} from 'react';
import {NavLink,useNavigate,useLocation} from 'react-router-dom';

function isLoggedIn(){
 return localStorage.getItem('genoLoggedIn')==='true' || sessionStorage.getItem('genoLoggedIn')==='true';
}

function getUserInfo(){
  try {
    const userStr = localStorage.getItem('genoUser') || sessionStorage.getItem('genoUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

export default function Navbar(){
 const [loggedIn,setLoggedIn]=useState(isLoggedIn());
 const [user,setUser]=useState(getUserInfo());
 const nav=useNavigate();
 const loc=useLocation();
 
 useEffect(()=>{
   setLoggedIn(isLoggedIn());
   setUser(getUserInfo());
 },[loc.pathname]);

 const logout=(e)=>{
   e.preventDefault();
   localStorage.clear();
   sessionStorage.clear();
   setLoggedIn(false);
   setUser(null);
   nav('/');
 };

 return (
  <nav className="navbar">
    <div className="logo"><img src="/logo.png" className="logo-img"/></div>
    <ul className="nav-links">
      {loggedIn?<>
        <li><NavLink to="/dashboard">Dashboard</NavLink></li>
        <li><NavLink to="/load">Upload</NavLink></li>
        <li><NavLink to="/about">About</NavLink></li>
        {/* User info display - NFR2 */}
        {user && (
          <li style={{
            color: '#888',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 10px',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            marginLeft: '5px'
          }}>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              color: '#fff'
            }}>
              {(user.fullname || user.email || 'U').charAt(0).toUpperCase()}
            </span>
            <span style={{ color: '#ccc' }}>
              {user.fullname || user.email || 'User'}
            </span>
          </li>
        )}
        <li><a href="/" onClick={logout} style={{ color: '#ff9999' }}>Log out</a></li>
      </>:<>
        <li><NavLink to="/">Home</NavLink></li>
        <li><NavLink to="/about">About</NavLink></li>
        <li><NavLink to="/login">Login</NavLink></li>
      </>}
    </ul>
  </nav>
 );
}