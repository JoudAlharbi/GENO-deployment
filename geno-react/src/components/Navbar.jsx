import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

function isLoggedIn() {
  return (
    localStorage.getItem('genoLoggedIn') === 'true' ||
    sessionStorage.getItem('genoLoggedIn') === 'true'
  );
}

function getUserInfo() {
  try {
    const userStr =
      localStorage.getItem('genoUser') || sessionStorage.getItem('genoUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [user, setUser] = useState(getUserInfo());
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setUser(getUserInfo());
    setMenuOpen(false);
  }, [loc.pathname]);

  const logout = (e) => {
    e.preventDefault();
    localStorage.clear();
    sessionStorage.clear();
    setLoggedIn(false);
    setUser(null);
    setMenuOpen(false);
    nav('/');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={`navbar ${menuOpen ? 'navbar--open' : ''}`}>
      <div className="navbar__brand logo">
        <img src="/logo.png" className="logo-img" alt="GENO" />
      </div>

      <button
        type="button"
        className="navbar__toggle"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="navbar__toggle-bar" />
        <span className="navbar__toggle-bar" />
        <span className="navbar__toggle-bar" />
      </button>

      <ul className={`nav-links ${menuOpen ? 'nav-links--open' : ''}`}>
        {loggedIn ? (
          <>
            <li>
              <NavLink to="/dashboard" onClick={closeMenu}>
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/load" onClick={closeMenu}>
                Upload
              </NavLink>
            </li>
            <li>
              <NavLink to="/about" onClick={closeMenu}>
                About
              </NavLink>
            </li>
            {user && (
              <li className="nav-user">
                <span className="nav-user__avatar">
                  {(user.fullname || user.email || 'U').charAt(0).toUpperCase()}
                </span>
                <span className="nav-user__name">
                  {user.fullname || user.email || 'User'}
                </span>
              </li>
            )}
            <li>
              <a href="/" onClick={logout} style={{ color: '#ff9999' }}>
                Log out
              </a>
            </li>
          </>
        ) : (
          <>
            <li>
              <NavLink to="/" onClick={closeMenu}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/about" onClick={closeMenu}>
                About
              </NavLink>
            </li>
            <li>
              <NavLink to="/login" onClick={closeMenu}>
                Login
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
