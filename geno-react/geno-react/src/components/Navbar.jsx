import React,{useEffect,useState} from 'react';
import {NavLink,useNavigate,useLocation} from 'react-router-dom';

function isLoggedIn(){
 return localStorage.getItem('genoLoggedIn')==='true' || sessionStorage.getItem('genoLoggedIn')==='true';
}

export default function Navbar(){
 const [loggedIn,setLoggedIn]=useState(isLoggedIn());
 const nav=useNavigate();
 const loc=useLocation();
 useEffect(()=>{setLoggedIn(isLoggedIn())},[loc.pathname]);

 const logout=(e)=>{e.preventDefault();localStorage.clear();sessionStorage.clear();setLoggedIn(false);nav('/')};

 return (
  <nav className="navbar">
    <div className="logo"><img src="/logo.png" className="logo-img"/></div>
    <ul className="nav-links">
      {loggedIn?<>
        <li><NavLink to="/dashboard">Dashboard</NavLink></li>
        <li><NavLink to="/about">About</NavLink></li>
        <li><a href="/" onClick={logout}>Log out</a></li>
      </>:<>
        <li><NavLink to="/">Home</NavLink></li>
        <li><NavLink to="/about">About</NavLink></li>
        <li><NavLink to="/login">Login</NavLink></li>
      </>}
    </ul>
  </nav>
  
 );
}