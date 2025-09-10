import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ConvexHullVisualizer = ({ api, isLoading, setIsLoading, setError }) => {
  const [numPoints, setNumPoints] = useState(50);
  const [bboxSize, setBboxSize] = useState(100);
  const [results, setResults] = useState(null);
  const [customPoints, setCustomPoints] = useState([]);
  const [inputMode, setInputMode] = useState('random'); // 'random' or 'custom'

  const generateAndCompute = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const requestData = {
        num_points: inputMode === 'random' ? numPoints : undefined,
        bbox_size: bboxSize,
        custom_points: inputMode === 'custom' ? customPoints : undefined
      };

      const response = await axios.post(`${api}/convex-hull/compare`, requestData);
      setResults(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to compute convex hull');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomPoint = () => {
    const x = Math.floor(Math.random() * bboxSize);
    const y = Math.floor(Math.random() * bboxSize);
    setCustomPoints([...customPoints, { x, y }]);
  };

  const removeCustomPoint = (index) => {
    setCustomPoints(customPoints.filter((_, i) => i !== index));
  };

  const clearCustomPoints = () => {
    setCustomPoints([]);
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (!results) return { datasets: [] };

    const { points, jarvis_result, graham_result } = results;

    // All points
    const allPointsData = points.map(([x, y]) => ({ x, y }));

    // Jarvis hull with closed loop
    const jarvisHullData = [...jarvis_result.hull, jarvis_result.hull[0]].map(([x, y]) => ({ x, y }));

    // Graham hull with closed loop  
    const grahamHullData = [...graham_result.hull, graham_result.hull[0]].map(([x, y]) => ({ x, y }));

    return {
      datasets: [
        {
          label: 'All Points',
          data: allPointsData,
          backgroundColor: 'rgba(107, 114, 128, 0.8)',
          borderColor: 'rgba(107, 114, 128, 1)',
          pointRadius: 4,
          pointHoverRadius: 6,
          showLine: false,
        },
        {
          label: `Jarvis March Hull (${jarvis_result.hull_size} vertices)`,
          data: jarvisHullData,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          showLine: true,
          fill: false,
          tension: 0,
        },
        {
          label: `Graham Scan Hull (${graham_result.hull_size} vertices)`,
          data: grahamHullData,
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgba(239, 68, 68, 1)',
          showLine: true,
          fill: false,
          tension: 0,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Convex Hull Comparison: Jarvis March vs Graham Scan',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: (${context.parsed.x}, ${context.parsed.y})`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'X Coordinate',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: 'Y Coordinate',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'point',
    },
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="control-panel">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Hull Visualizer Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Input Mode Selection */}
          <div className="control-group">
            <label className="control-label">Input Mode</label>
            <select
              value={inputMode}
              onChange={(e) => setInputMode(e.target.value)}
              className="control-input"
            >
              <option value="random">Random Points</option>
              <option value="custom">Custom Points</option>
            </select>
          </div>

          {inputMode === 'random' && (
            <div className="control-group">
              <label className="control-label">Number of Points</label>
              <input
                type="number"
                min="3"
                max="1000"
                value={numPoints}
                onChange={(e) => setNumPoints(parseInt(e.target.value) || 3)}
                className="control-input"
              />
            </div>
          )}

          <div className="control-group">
            <label className="control-label">Coordinate Range</label>
            <input
              type="number"
              min="10"
              max="500"
              value={bboxSize}
              onChange={(e) => setBboxSize(parseInt(e.target.value) || 100)}
              className="control-input"
            />
          </div>

          <div className="control-group">
            <label className="control-label">Actions</label>
            <button
              onClick={generateAndCompute}
              disabled={isLoading || (inputMode === 'custom' && customPoints.length < 3)}
              className="control-button w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="loading-spinner mr-2"></div>
                  Computing...
                </span>
              ) : (
                'Generate & Analyze'
              )}
            </button>
          </div>
        </div>

        {/* Custom Points Controls */}
        {inputMode === 'custom' && (
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Custom Points ({customPoints.length})</h3>
              <div className="space-x-2">
                <button onClick={addCustomPoint} className="control-button">
                  Add Random Point
                </button>
                <button onClick={clearCustomPoints} className="control-button secondary">
                  Clear All
                </button>
              </div>
            </div>
            
            {customPoints.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                {customPoints.map((point, index) => (
                  <div key={index} className="flex items-center bg-white p-2 rounded border text-sm">
                    <span>({point.x}, {point.y})</span>
                    <button
                      onClick={() => removeCustomPoint(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {customPoints.length < 3 && (
              <div className="alert alert-warning">
                Need at least 3 points to compute convex hull
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <>
          {/* Statistics */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{results.points.length}</div>
              <div className="stat-label">Total Points</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{results.jarvis_result.hull_size}</div>
              <div className="stat-label">Jarvis Hull Size</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{results.graham_result.hull_size}</div>
              <div className="stat-label">Graham Hull Size</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {results.performance_comparison.jarvis_faster ? 'Jarvis' : 'Graham'}
              </div>
              <div className="stat-label">Faster Algorithm</div>
            </div>
          </div>

          {/* Chart */}
          <div className="chart-container">
            <Scatter data={prepareChartData()} options={chartOptions} />
          </div>

          {/* Performance Comparison */}
          <div className="algorithm-comparison">
            <div className="algorithm-card">
              <div className="algorithm-header" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <div className="algorithm-title">Jarvis March</div>
                <div className="algorithm-subtitle">Gift Wrapping Algorithm</div>
              </div>
              <div className="algorithm-content">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Execution Time:</span>
                    <span className="font-mono">{(results.jarvis_result.execution_time * 1000).toFixed(3)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hull Vertices:</span>
                    <span>{results.jarvis_result.hull_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Algorithm Steps:</span>
                    <span>{results.performance_comparison.jarvis_steps_count}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Complexity:</strong> O(nh) where n=points, h=hull vertices
                  </div>
                </div>
              </div>
            </div>

            <div className="algorithm-card">
              <div className="algorithm-header" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <div className="algorithm-title">Graham Scan</div>
                <div className="algorithm-subtitle">Polar Sorting Algorithm</div>
              </div>
              <div className="algorithm-content">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Execution Time:</span>
                    <span className="font-mono">{(results.graham_result.execution_time * 1000).toFixed(3)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hull Vertices:</span>
                    <span>{results.graham_result.hull_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Algorithm Steps:</span>
                    <span>{results.performance_comparison.graham_steps_count}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Complexity:</strong> O(n log n) consistent time complexity
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Algorithm Results Display */}
          <div className="control-panel">
            <h3 className="text-lg font-semibold mb-4">Algorithm Results</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Jarvis March Results */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <span className="w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
                  Jarvis March
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="font-medium text-blue-700 w-20">Hull size:</span>
                    <span className="font-mono text-blue-900">{results.jarvis_result.hull_size}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Coordinates:</span>
                    <div className="mt-1 p-2 bg-white rounded border font-mono text-sm text-blue-900 max-h-32 overflow-y-auto">
                      {results.jarvis_result.hull.map((coord, index) => (
                        <span key={index}>
                          ({coord[0]}, {coord[1]}){index < results.jarvis_result.hull.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Graham Scan Results */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                  <span className="w-3 h-3 bg-red-600 rounded-full mr-2"></span>
                  Graham Scan
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="font-medium text-red-700 w-20">Hull size:</span>
                    <span className="font-mono text-red-900">{results.graham_result.hull_size}</span>
                  </div>
                  <div>
                    <span className="font-medium text-red-700">Coordinates:</span>
                    <div className="mt-1 p-2 bg-white rounded border font-mono text-sm text-red-900 max-h-32 overflow-y-auto">
                      {results.graham_result.hull.map((coord, index) => (
                        <span key={index}>
                          ({coord[0]}, {coord[1]}){index < results.graham_result.hull.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="control-panel">
            <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="stat-value">
                  {(results.performance_comparison.time_difference * 1000).toFixed(3)}ms
                </div>
                <div className="stat-label">Time Difference</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {results.performance_comparison.efficiency_ratio.toFixed(2)}x
                </div>
                <div className="stat-label">Speed Ratio</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {results.performance_comparison.hull_sizes_match ? '✓' : '✗'}
                </div>
                <div className="stat-label">Results Match</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ConvexHullVisualizer;