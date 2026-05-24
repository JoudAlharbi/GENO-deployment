import React from 'react';
import Navbar from './Navbar';
export default function Layout({children}){
 return (<>
  <div className="dna-background"/>
  <div className="container site-container">
    <Navbar/>
    {children}
  </div>
 </>);
}