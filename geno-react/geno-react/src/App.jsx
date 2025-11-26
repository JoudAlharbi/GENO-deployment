import React from 'react';
import {Routes,Route} from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LoadSample from './pages/LoadSample';
import Result from './pages/Result';
import ViewReport from './pages/ViewReport';

export default function App(){
 return (
  <Layout>
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/about" element={<About/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/>
      <Route path="/load" element={<ProtectedRoute><LoadSample/></ProtectedRoute>}/>
      <Route path="/result" element={<ProtectedRoute><Result/></ProtectedRoute>}/>
      <Route path="/view" element={<ProtectedRoute><ViewReport/></ProtectedRoute>}/>
    </Routes>
  </Layout>
 );}