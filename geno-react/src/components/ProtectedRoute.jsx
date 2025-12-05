import React from 'react';
import {Navigate} from 'react-router-dom';
function isLoggedIn(){
 return localStorage.getItem('genoLoggedIn')==='true' || sessionStorage.getItem('genoLoggedIn')==='true';
}
export default function ProtectedRoute({children}){
 if(!isLoggedIn()) return <Navigate to="/login" replace/>;
 return children;
}