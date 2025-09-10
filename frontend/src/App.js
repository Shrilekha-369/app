import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import ConvexHullVisualizer from './components/ConvexHullVisualizer';
import PerformanceAnalyzer from './components/PerformanceAnalyzer';
import AlgorithmAnimator from './components/AlgorithmAnimator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeTab, setActiveTab] = useState('visualizer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Test backend connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await axios.get(`${API}/`);
        console.log('Backend connected:', response.data.message);
      } catch (error) {
        console.error('Backend connection failed:', error);
        setError('Failed to connect to backend');
      }
    };
    testConnection();
  }, []);

  const TabButton = ({ id, label, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-6 py-3 font-medium text-sm rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Convex Hull Analyzer</h1>
                <p className="text-sm text-gray-600">Comparative Analysis of Jarvis March vs Graham Scan</p>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-4">
            <TabButton
              id="visualizer"
              label="Hull Visualizer"
              isActive={activeTab === 'visualizer'}
              onClick={setActiveTab}
            />
            <TabButton
              id="animator"
              label="Step-by-Step Animation"
              isActive={activeTab === 'animator'}
              onClick={setActiveTab}
            />
            <TabButton
              id="performance"
              label="Performance Analysis"
              isActive={activeTab === 'performance'}
              onClick={setActiveTab}
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'visualizer' && (
          <ConvexHullVisualizer 
            api={API} 
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        )}
        
        {activeTab === 'animator' && (
          <AlgorithmAnimator 
            api={API}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        )}
        
        {activeTab === 'performance' && (
          <PerformanceAnalyzer 
            api={API}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="mb-2">Convex Hull Comparative Analysis - Educational Tool</p>
            <div className="flex justify-center space-x-8 text-sm">
              <div>
                <strong>Jarvis March:</strong> O(nh) time complexity
              </div>
              <div>
                <strong>Graham Scan:</strong> O(n log n) time complexity
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;