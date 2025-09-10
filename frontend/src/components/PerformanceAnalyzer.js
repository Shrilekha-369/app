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
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PerformanceAnalyzer = ({ api, isLoading, setIsLoading, setError }) => {
  const [startSize, setStartSize] = useState(100);
  const [endSize, setEndSize] = useState(2000);
  const [stepSize, setStepSize] = useState(200);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [showHullSizes, setShowHullSizes] = useState(false);

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${api}/convex-hull/performance-analysis`, {
        start_size: startSize,
        end_size: endSize,
        step_size: stepSize
      });
      setAnalysisResults(response.data.analysis);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to run performance analysis');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data for execution times
  const prepareTimeChart = () => {
    if (!analysisResults) return { datasets: [] };

    const data = {
      labels: analysisResults.input_sizes,
      datasets: [
        {
          label: 'Jarvis March Time (ms)',
          data: analysisResults.jarvis_times.map(t => t * 1000),
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: chartType === 'line' ? false : true,
        },
        {
          label: 'Graham Scan Time (ms)',
          data: analysisResults.graham_times.map(t => t * 1000),
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: chartType === 'line' ? false : true,
        },
      ],
    };

    return data;
  };

  // Prepare chart data for hull sizes
  const prepareHullSizeChart = () => {
    if (!analysisResults) return { datasets: [] };

    const data = {
      labels: analysisResults.input_sizes,
      datasets: [
        {
          label: 'Jarvis Hull Size',
          data: analysisResults.jarvis_hull_sizes,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.3)',
          borderWidth: 2,
          pointRadius: 3,
          fill: false,
        },
        {
          label: 'Graham Hull Size',
          data: analysisResults.graham_hull_sizes,
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.3)',
          borderWidth: 2,
          pointRadius: 3,
          fill: false,
        },
      ],
    };

    return data;
  };

  const timeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Algorithm Performance Comparison - Execution Time',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(3)}ms`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Number of Input Points',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Execution Time (milliseconds)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        beginAtZero: true,
      },
    },
  };

  const hullSizeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Hull Size Comparison',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Number of Input Points',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Hull Size (number of vertices)',
        },
        beginAtZero: true,
      },
    },
  };

  // Calculate statistics
  const calculateStatistics = () => {
    if (!analysisResults) return null;

    const jarvisTimes = analysisResults.jarvis_times;
    const grahamTimes = analysisResults.graham_times;
    const inputSizes = analysisResults.input_sizes;

    const jarvisWins = jarvisTimes.filter((time, i) => time < grahamTimes[i]).length;
    const grahamWins = grahamTimes.filter((time, i) => time < jarvisTimes[i]).length;
    
    const avgJarvisTime = jarvisTimes.reduce((a, b) => a + b, 0) / jarvisTimes.length;
    const avgGrahamTime = grahamTimes.reduce((a, b) => a + b, 0) / grahamTimes.length;
    
    const maxJarvisTime = Math.max(...jarvisTimes);
    const maxGrahamTime = Math.max(...grahamTimes);
    
    const minJarvisTime = Math.min(...jarvisTimes);
    const minGrahamTime = Math.min(...grahamTimes);

    // Find where algorithms cross over (if they do)
    let crossoverPoint = null;
    for (let i = 1; i < jarvisTimes.length; i++) {
      const prevJarvisFaster = jarvisTimes[i-1] < grahamTimes[i-1];
      const currJarvisFaster = jarvisTimes[i] < grahamTimes[i];
      
      if (prevJarvisFaster !== currJarvisFaster) {
        crossoverPoint = inputSizes[i];
        break;
      }
    }

    return {
      jarvisWins,
      grahamWins,
      totalTests: jarvisTimes.length,
      avgJarvisTime: avgJarvisTime * 1000, // Convert to ms
      avgGrahamTime: avgGrahamTime * 1000,
      maxJarvisTime: maxJarvisTime * 1000,
      maxGrahamTime: maxGrahamTime * 1000,
      minJarvisTime: minJarvisTime * 1000,
      minGrahamTime: minGrahamTime * 1000,
      crossoverPoint
    };
  };

  const stats = calculateStatistics();

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="control-panel">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Analysis Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="control-group">
            <label className="control-label">Start Size</label>
            <input
              type="number"
              min="10"
              max="1000"
              value={startSize}
              onChange={(e) => setStartSize(parseInt(e.target.value) || 100)}
              className="control-input"
            />
          </div>

          <div className="control-group">
            <label className="control-label">End Size</label>
            <input
              type="number"
              min="100"
              max="10000"
              value={endSize}
              onChange={(e) => setEndSize(parseInt(e.target.value) || 2000)}
              className="control-input"
            />
          </div>

          <div className="control-group">
            <label className="control-label">Step Size</label>
            <input
              type="number"
              min="50"
              max="1000"
              value={stepSize}
              onChange={(e) => setStepSize(parseInt(e.target.value) || 200)}
              className="control-input"
            />
          </div>

          <div className="control-group">
            <label className="control-label">Run Analysis</label>
            <button
              onClick={runAnalysis}
              disabled={isLoading || startSize >= endSize}
              className="control-button w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="loading-spinner mr-2"></div>
                  Analyzing...
                </span>
              ) : (
                'Start Analysis'
              )}
            </button>
          </div>
        </div>

        {/* Chart Options */}
        {analysisResults && (
          <div className="flex gap-4 items-center">
            <div className="control-group">
              <label className="control-label">Chart Type</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="control-input"
              >
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="show-hull-sizes"
                checked={showHullSizes}
                onChange={(e) => setShowHullSizes(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="show-hull-sizes" className="text-sm text-gray-700">
                Show Hull Sizes
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Info */}
      {analysisResults && (
        <div className="alert alert-info">
          <strong>Analysis Parameters:</strong> Testing {analysisResults.input_sizes.length} different input sizes 
          from {startSize} to {endSize} points with step size of {stepSize}.
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.jarvisWins}</div>
            <div className="stat-label">Jarvis Wins</div>
            <div className="stat-change">
              {((stats.jarvisWins / stats.totalTests) * 100).toFixed(1)}% of tests
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.grahamWins}</div>
            <div className="stat-label">Graham Wins</div>
            <div className="stat-change">
              {((stats.grahamWins / stats.totalTests) * 100).toFixed(1)}% of tests
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgJarvisTime.toFixed(2)}ms</div>
            <div className="stat-label">Avg Jarvis Time</div>
            <div className="stat-change">
              Range: {stats.minJarvisTime.toFixed(2)} - {stats.maxJarvisTime.toFixed(2)}ms
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgGrahamTime.toFixed(2)}ms</div>
            <div className="stat-label">Avg Graham Time</div>
            <div className="stat-change">
              Range: {stats.minGrahamTime.toFixed(2)} - {stats.maxGrahamTime.toFixed(2)}ms
            </div>
          </div>
          {stats.crossoverPoint && (
            <div className="stat-card">
              <div className="stat-value">{stats.crossoverPoint}</div>
              <div className="stat-label">Crossover Point</div>
              <div className="stat-change">Algorithm preference changes</div>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      {analysisResults && (
        <div className="space-y-6">
          {/* Execution Time Chart */}
          <div className="chart-container">
            {chartType === 'line' ? (
              <Line data={prepareTimeChart()} options={timeChartOptions} />
            ) : (
              <Bar data={prepareTimeChart()} options={timeChartOptions} />
            )}
          </div>

          {/* Hull Size Chart */}
          {showHullSizes && (
            <div className="chart-container">
              <Line data={prepareHullSizeChart()} options={hullSizeChartOptions} />
            </div>
          )}
        </div>
      )}

      {/* Algorithm Complexity Analysis */}
      {analysisResults && (
        <div className="algorithm-comparison">
          <div className="algorithm-card">
            <div className="algorithm-header" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <div className="algorithm-title">Jarvis March Analysis</div>
              <div className="algorithm-subtitle">Gift Wrapping Algorithm</div>
            </div>
            <div className="algorithm-content">
              <div className="space-y-3">
                <div className="text-sm">
                  <strong>Theoretical Complexity:</strong><br/>
                  {analysisResults.complexity_analysis.jarvis_march.theoretical}
                </div>
                <div className="text-sm">
                  <strong>Best Case:</strong><br/>
                  {analysisResults.complexity_analysis.jarvis_march.best_case}
                </div>
                <div className="text-sm">
                  <strong>Worst Case:</strong><br/>
                  {analysisResults.complexity_analysis.jarvis_march.worst_case}
                </div>
                <div className="text-sm">
                  <strong>Space Complexity:</strong><br/>
                  {analysisResults.complexity_analysis.jarvis_march.space_complexity}
                </div>
                <div className="text-sm text-blue-600 font-medium">
                  Performance: {stats.jarvisWins > stats.grahamWins ? 'Better' : 'Worse'} in this test range
                </div>
              </div>
            </div>
          </div>

          <div className="algorithm-card">
            <div className="algorithm-header" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              <div className="algorithm-title">Graham Scan Analysis</div>
              <div className="algorithm-subtitle">Polar Sorting Algorithm</div>
            </div>
            <div className="algorithm-content">
              <div className="space-y-3">
                <div className="text-sm">
                  <strong>Theoretical Complexity:</strong><br/>
                  {analysisResults.complexity_analysis.graham_scan.theoretical}
                </div>
                <div className="text-sm">
                  <strong>Best Case:</strong><br/>
                  {analysisResults.complexity_analysis.graham_scan.best_case}
                </div>
                <div className="text-sm">
                  <strong>Worst Case:</strong><br/>
                  {analysisResults.complexity_analysis.graham_scan.worst_case}
                </div>
                <div className="text-sm">
                  <strong>Space Complexity:</strong><br/>
                  {analysisResults.complexity_analysis.graham_scan.space_complexity}
                </div>
                <div className="text-sm text-red-600 font-medium">
                  Performance: {stats.grahamWins > stats.jarvisWins ? 'Better' : 'Worse'} in this test range
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysisResults && (
        <div className="control-panel">
          <h3 className="text-lg font-semibold mb-4">Algorithm Recommendation</h3>
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
            <p className="text-gray-800">
              <strong>Expert Analysis:</strong> {analysisResults.complexity_analysis.recommendation}
            </p>
            <div className="mt-3 text-sm text-gray-600">
              Based on your test results ({startSize}-{endSize} points):
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  {stats.jarvisWins > stats.grahamWins ? 'Jarvis March' : 'Graham Scan'} won {Math.max(stats.jarvisWins, stats.grahamWins)} out of {stats.totalTests} tests
                </li>
                <li>
                  Average performance difference: {Math.abs(stats.avgJarvisTime - stats.avgGrahamTime).toFixed(2)}ms
                </li>
                {stats.crossoverPoint && (
                  <li>Algorithm preference changes around {stats.crossoverPoint} points</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceAnalyzer;