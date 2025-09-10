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

  // Prepare chart data for animation
  const prepareAnimationData = () => {
    if (!results) return { datasets: [] };

    const { points } = results;
    const steps = getCurrentSteps();
    const currentStepData = steps[currentStep] || {};
    
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

    // Add algorithm-specific visualization
    if (selectedAlgorithm === 'jarvis') {
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
    } else {
      // Graham Scan visualization
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
    }

    return { datasets };
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
        text: `${selectedAlgorithm === 'jarvis' ? 'Jarvis March' : 'Graham Scan'} Animation - Step ${currentStep + 1}`,
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

  const steps = getCurrentSteps();
  const totalSteps = steps.length;

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="control-panel">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Step-by-Step Animation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="control-group">
            <label className="control-label">Algorithm</label>
            <select
              value={selectedAlgorithm}
              onChange={(e) => {
                setSelectedAlgorithm(e.target.value);
                setCurrentStep(0);
                stopAnimation();
              }}
              className="control-input"
            >
              <option value="jarvis">Jarvis March</option>
              <option value="graham">Graham Scan</option>
            </select>
          </div>

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
                disabled={totalSteps === 0}
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
                  Step {currentStep + 1} of {totalSteps}
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <button 
                onClick={nextStep} 
                disabled={currentStep >= totalSteps - 1}
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

          {/* Step Description */}
          {stepDescription && (
            <div className="control-panel">
              <h3 className="font-semibold text-gray-900 mb-2">Current Step:</h3>
              <p className="text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                {stepDescription}
              </p>
            </div>
          )}

          {/* Chart */}
          <div className="chart-container">
            <Scatter data={prepareAnimationData()} options={chartOptions} />
          </div>

          {/* Algorithm Info */}
          <div className="algorithm-comparison">
            <div className="algorithm-card">
              <div className="algorithm-header">
                <div className="algorithm-title">
                  {selectedAlgorithm === 'jarvis' ? 'Jarvis March' : 'Graham Scan'}
                </div>
                <div className="algorithm-subtitle">Step-by-Step Analysis</div>
              </div>
              <div className="algorithm-content">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Steps:</span>
                    <span>{totalSteps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Step:</span>
                    <span>{currentStep + 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span>{totalSteps > 0 ? Math.round(((currentStep + 1) / totalSteps) * 100) : 0}%</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedAlgorithm === 'jarvis' ? (
                      <>
                        <strong>Algorithm:</strong> Wraps around the points like a gift, checking each point to find the most counter-clockwise edge at each step.
                      </>
                    ) : (
                      <>
                        <strong>Algorithm:</strong> Sorts points and builds lower/upper hulls by maintaining the convex property using cross products.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="algorithm-card">
              <div className="algorithm-header">
                <div className="algorithm-title">Performance Stats</div>
                <div className="algorithm-subtitle">Current Algorithm</div>
              </div>
              <div className="algorithm-content">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Execution Time:</span>
                    <span className="font-mono">
                      {(getCurrentResult()?.execution_time * 1000).toFixed(3)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hull Size:</span>
                    <span>{getCurrentResult()?.hull_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Input Points:</span>
                    <span>{results.points.length}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Complexity:</strong> {selectedAlgorithm === 'jarvis' ? 'O(nh)' : 'O(n log n)'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AlgorithmAnimator;