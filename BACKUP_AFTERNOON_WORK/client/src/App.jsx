import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Board from './components/Board';
import Dashboard from './components/Dashboard';

function App() {
    return (
        <Router>
            <div className="flex h-screen bg-app text-main overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto p-8 relative">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/board/:type" element={<Board />} />
                        <Route path="/settings" element={<div className="p-10"><h1>Settings</h1></div>} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
