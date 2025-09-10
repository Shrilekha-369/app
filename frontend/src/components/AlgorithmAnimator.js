import React, { useState, useEffect, useRef } from 'react';
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

const AlgorithmAnimator = ({ api, isLoading, setIsLoading, setError }) => {
  const [numPoints, setNumPoints] = useState(20);
  const [results, setResults] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000); // milliseconds
  const [jarvisStepDescription, setJarvisStepDescription] = useState('');
  const [grahamStepDescription, setGrahamStepDescription] = useState('');
  
  const animationInterval = useRef(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${api}/convex-hull/compare`, {
        num_points: numPoints,
        bbox_size: 100
      });
      setResults(response.data);
      setCurrentStep(0);
      setIsPlaying(false);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const getJarvisSteps = () => {
    if (!results) return [];
    return results.jarvis_result.steps;
  };

  const getGrahamSteps = () => {
    if (!results) return [];
    return results.graham_result.steps;
  };

  const getMaxSteps = () => {
    if (!results) return 0;
    return Math.max(getJarvisSteps().length, getGrahamSteps().length);
  };

  // Animation controls
  const playAnimation = () => {
    if (isPlaying) {
      stopAnimation();
      return;
    }

    const maxSteps = getMaxSteps();
    if (currentStep >= maxSteps - 1) {
      setCurrentStep(0);
    }

    setIsPlaying(true);
    animationInterval.current = setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = prev + 1;
        if (nextStep >= maxSteps) {
          stopAnimation();
          return maxSteps - 1;
        }
        return nextStep;
      });
    }, animationSpeed);
  };

  const stopAnimation = () => {
    setIsPlaying(false);
    if (animationInterval.current) {
      clearInterval(animationInterval.current);
      animationInterval.current = null;
    }
  };

  const resetAnimation = () => {
    stopAnimation();
    setCurrentStep(0);
  };

  const nextStep = () => {
    const maxSteps = getMaxSteps();
    if (currentStep < maxSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Update step descriptions
  useEffect(() => {
    const jarvisSteps = getJarvisSteps();
    const grahamSteps = getGrahamSteps();
    
    if (jarvisSteps.length > 0 && currentStep < jarvisSteps.length) {
      setJarvisStepDescription(jarvisSteps[currentStep].step_description || '');
    } else {
      setJarvisStepDescription('Algorithm completed');
    }
    
    if (grahamSteps.length > 0 && currentStep < grahamSteps.length) {
      setGrahamStepDescription(grahamSteps[currentStep].step_description || '');
    } else {
      setGrahamStepDescription('Algorithm completed');
    }
  }, [currentStep, results]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
      }
    };
  }, []);

  // Prepare chart data for Jarvis March animation
  const prepareJarvisAnimationData = () => {
    if (!results) return { datasets: [] };

    const { points } = results;
    const jarvisSteps = getJarvisSteps();
    const currentStepData = jarvisSteps[currentStep] || {};
    
    // All points
    const allPointsData = points.map(([x, y]) => ({ x, y }));

    const datasets = [
      {
        label: 'All Points',
        data: allPointsData,
        backgroundColor: 'rgba(107, 114, 128, 0.8)',
        borderColor: 'rgba(107, 114, 128, 1)',
        pointRadius: 4,
        pointHoverRadius: 6,
        showLine: false,
      }
    ];

    // Current hull being built
    if (currentStepData.hull_so_far && currentStepData.hull_so_far.length > 0) {
      const hullData = currentStepData.hull_so_far.map(([x, y]) => ({ x, y }));
      datasets.push({
        label: 'Hull So Far',
        data: hullData,
        backgroundColor: 'rgba(59, 130, 246, 1)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 3,
        pointRadius: 6,
        showLine: true,
        fill: false,
        tension: 0,
      });
    }

    // Candidate edge
    if (currentStepData.type === 'candidate' && currentStepData.from_point && currentStepData.to_point) {
      datasets.push({
        label: 'Candidate Edge',
        data: [
          { x: currentStepData.from_point[0], y: currentStepData.from_point[1] },
          { x: currentStepData.to_point[0], y: currentStepData.to_point[1] }
        ],
        backgroundColor: 'rgba(255, 165, 0, 0.8)',
        borderColor: 'rgba(255, 165, 0, 1)',
        borderWidth: 2,
        borderDash: [3, 3],
        pointRadius: 5,
        showLine: true,
        fill: false,
      });
    }

    // Chosen edge
    if (currentStepData.type === 'chosen' && currentStepData.from_point && currentStepData.to_point) {
      datasets.push({
        label: 'Chosen Edge',
        data: [
          { x: currentStepData.from_point[0], y: currentStepData.from_point[1] },
          { x: currentStepData.to_point[0], y: currentStepData.to_point[1] }
        ],
        backgroundColor: 'rgba(34, 197, 94, 1)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 4,
        pointRadius: 7,
        showLine: true,
        fill: false,
      });
    }

    return { datasets };
  };

  // Prepare chart data for Graham Scan animation
  const prepareGrahamAnimationData = () => {
    if (!results) return { datasets: [] };

    const { points } = results;
    const grahamSteps = getGrahamSteps();
    const currentStepData = grahamSteps[currentStep] || {};
    
    // All points
    const allPointsData = points.map(([x, y]) => ({ x, y }));

    const datasets = [
      {
        label: 'All Points',
        data: allPointsData,
        backgroundColor: 'rgba(107, 114, 128, 0.8)',
        borderColor: 'rgba(107, 114, 128, 1)',
        pointRadius: 4,
        pointHoverRadius: 6,
        showLine: false,
      }
    ];

    // Current stack
    if (currentStepData.stack && currentStepData.stack.length > 0) {
      const stackData = currentStepData.stack.map(([x, y]) => ({ x, y }));
      datasets.push({
        label: `${currentStepData.hull_part || 'Stack'}`,
        data: stackData,
        backgroundColor: currentStepData.hull_part === 'lower' ? 'rgba(59, 130, 246, 1)' : 'rgba(239, 68, 68, 1)',
        borderColor: currentStepData.hull_part === 'lower' ? 'rgba(59, 130, 246, 1)' : 'rgba(239, 68, 68, 1)',
        borderWidth: 3,
        pointRadius: 6,
        showLine: true,
        fill: false,
        tension: 0,
      });
    }

    // Highlight current point being processed
    if (currentStepData.current_point || currentStepData.added_point) {
      const point = currentStepData.current_point || currentStepData.added_point;
      datasets.push({
        label: 'Current Point',
        data: [{ x: point[0], y: point[1] }],
        backgroundColor: 'rgba(255, 165, 0, 1)',
        borderColor: 'rgba(255, 165, 0, 1)',
        pointRadius: 8,
        showLine: false,
      });
    }

    // Final hull for last step
    if (currentStepData.type === 'final' && currentStepData.final_hull) {
      const finalHullData = [...currentStepData.final_hull, currentStepData.final_hull[0]].map(([x, y]) => ({ x, y }));
      datasets.push({
        label: 'Final Hull',
        data: finalHullData,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 4,
        pointRadius: 7,
        showLine: true,
        fill: false,
        tension: 0,
      });
    }

    return { datasets };
  };

  const jarvisChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Jarvis March - Step ${currentStep + 1}`,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'X Coordinate',
        },
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: 'Y Coordinate',
        },
      },
    },
  };

  const grahamChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Graham Scan - Step ${currentStep + 1}`,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'X Coordinate',
        },
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: 'Y Coordinate',
        },
      },
    },
  };

  const jarvisSteps = getJarvisSteps();
  const grahamSteps = getGrahamSteps();
  const maxSteps = getMaxSteps();

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="control-panel">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Side-by-Side Algorithm Animation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="control-group">
            <label className="control-label">Number of Points</label>
            <input
              type="number"
              min="4"
              max="50"
              value={numPoints}
              onChange={(e) => setNumPoints(parseInt(e.target.value) || 4)}
              className="control-input"
            />
          </div>

          <div className="control-group">
            <label className="control-label">Actions</label>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="control-button w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="loading-spinner mr-2"></div>
                  Loading...
                </span>
              ) : (
                'Generate New Data'
              )}
            </button>
          </div>
        </div>
      </div>

      {results && (
        <>
          {/* Animation Controls */}
          <div className="control-panel">
            <div className="animation-controls">
              <button
                onClick={playAnimation}
                className="play-button"
                disabled={maxSteps === 0}
              >
                {isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              <button onClick={resetAnimation} className="control-button secondary">
                Reset
              </button>

              <button 
                onClick={prevStep} 
                disabled={currentStep === 0}
                className="control-button secondary"
              >
                ← Prev
              </button>

              <div className="flex-1 text-center">
                <div className="text-sm text-gray-600 mb-1">
                  Step {currentStep + 1} of {maxSteps}
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${maxSteps > 0 ? ((currentStep + 1) / maxSteps) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <button 
                onClick={nextStep} 
                disabled={currentStep >= maxSteps - 1}
                className="control-button secondary"
              >
                Next →
              </button>

              <div className="flex flex-col items-center">
                <label className="text-sm text-gray-600 mb-1">Speed</label>
                <input
                  type="range"
                  min="100"
                  max="3000"
                  step="100"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
                  className="speed-slider"
                />
                <span className="text-xs text-gray-500">{animationSpeed}ms</span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Jarvis March Chart */}
            <div className="chart-container">
              <Scatter data={prepareJarvisAnimationData()} options={jarvisChartOptions} />
            </div>

            {/* Graham Scan Chart */}
            <div className="chart-container">
              <Scatter data={prepareGrahamAnimationData()} options={grahamChartOptions} />
            </div>
          </div>

          {/* Step Descriptions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Jarvis March Description */}
            <div className="control-panel">
              <h3 className="font-semibold text-blue-600 mb-2 flex items-center">
                <span className="w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
                Jarvis March - Step {Math.min(currentStep + 1, jarvisSteps.length)}
              </h3>
              <p className="text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200 min-h-[60px]">
                {jarvisStepDescription || 'Waiting for algorithm to start...'}
              </p>
            </div>

            {/* Graham Scan Description */}
            <div className="control-panel">
              <h3 className="font-semibold text-red-600 mb-2 flex items-center">
                <span className="w-3 h-3 bg-red-600 rounded-full mr-2"></span>
                Graham Scan - Step {Math.min(currentStep + 1, grahamSteps.length)}
              </h3>
              <p className="text-gray-700 bg-red-50 p-3 rounded-lg border border-red-200 min-h-[60px]">
                {grahamStepDescription || 'Waiting for algorithm to start...'}
              </p>
            </div>
          </div>

          {/* Algorithm Comparison Stats */}
          <div className="algorithm-comparison">
            <div className="algorithm-card">
              <div className="algorithm-header" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <div className="algorithm-title">Jarvis March Progress</div>
                <div className="algorithm-subtitle">Gift Wrapping Algorithm</div>
              </div>
              <div className="algorithm-content">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Current Step:</span>
                    <span>{Math.min(currentStep + 1, jarvisSteps.length)} / {jarvisSteps.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span>{jarvisSteps.length > 0 ? Math.round((Math.min(currentStep + 1, jarvisSteps.length) / jarvisSteps.length) * 100) : 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Steps:</span>
                    <span>{jarvisSteps.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Execution Time:</span>
                    <span className="font-mono">
                      {(results.jarvis_result.execution_time * 1000).toFixed(3)}ms
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Strategy:</strong> Wraps around points like a gift, checking each point to find the most counter-clockwise edge.
                  </div>
                </div>
              </div>
            </div>

            <div className="algorithm-card">
              <div className="algorithm-header" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <div className="algorithm-title">Graham Scan Progress</div>
                <div className="algorithm-subtitle">Polar Sorting Algorithm</div>
              </div>
              <div className="algorithm-content">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Current Step:</span>
                    <span>{Math.min(currentStep + 1, grahamSteps.length)} / {grahamSteps.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span>{grahamSteps.length > 0 ? Math.round((Math.min(currentStep + 1, grahamSteps.length) / grahamSteps.length) * 100) : 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Steps:</span>
                    <span>{grahamSteps.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Execution Time:</span>
                    <span className="font-mono">
                      {(results.graham_result.execution_time * 1000).toFixed(3)}ms
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Strategy:</strong> Sorts points and builds lower/upper hulls by maintaining convex property using cross products.
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
                  Jarvis March Results
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
                  Graham Scan Results
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

          {/* Algorithm Comparison Info */}
          <div className="control-panel">
            <h3 className="text-lg font-semibold mb-4">Direct Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="stat-value">
                  {results.performance_comparison.jarvis_faster ? 'Jarvis' : 'Graham'}
                </div>
                <div className="stat-label">Faster Algorithm</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {(results.performance_comparison.time_difference * 1000).toFixed(3)}ms
                </div>
                <div className="stat-label">Time Difference</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {results.performance_comparison.hull_sizes_match ? '✓ Match' : '✗ Differ'}
                </div>
                <div className="stat-label">Hull Results</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-red-50 rounded-lg border">
              <p className="text-sm text-gray-700">
                <strong>Educational Insight:</strong> Watch how Jarvis March methodically wraps around the points like 
                gift wrapping, while Graham Scan efficiently builds the hull by sorting points and using a stack-based approach. 
                Notice how Graham Scan often requires fewer steps due to its O(n log n) sorting phase, while Jarvis March's 
                step count depends on the hull size (h), resulting in O(nh) complexity.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AlgorithmAnimator;