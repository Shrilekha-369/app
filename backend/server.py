from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import time
import random
import math
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Tuple, Dict, Optional, Any
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ---------------------- Convex Hull Algorithms ----------------------

def dist_sq(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    """Calculate squared distance between two points"""
    return (a[0]-b[0])**2 + (a[1]-b[1])**2

def orientation(p: Tuple[float, float], q: Tuple[float, float], r: Tuple[float, float]) -> int:
    """Find orientation of ordered triplet (p, q, r)
    Returns:
    0 -> p, q and r are collinear
    1 -> Clockwise
    2 -> Counterclockwise
    """
    val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
    if val == 0:
        return 0
    return 1 if val > 0 else 2

def jarvis_march_with_steps(points: List[Tuple[float, float]]) -> Tuple[List[Tuple[float, float]], List[Dict[str, Any]]]:
    """Jarvis March algorithm with step-by-step logging"""
    pts = list(dict.fromkeys(points))  # Remove duplicates while preserving order
    n = len(pts)
    
    if n < 3:
        return pts, []

    # Find the leftmost point
    l = min(range(n), key=lambda i: (pts[i][0], pts[i][1]))
    
    hull = []
    steps = []
    p = l
    
    while True:
        hull.append(pts[p])
        q = (p + 1) % n
        
        for r in range(n):
            if r == p:
                continue
            
            # Log candidate edge
            steps.append({
                'type': 'candidate',
                'from_point': pts[p],
                'to_point': pts[r],
                'current_best': pts[q],
                'hull_so_far': list(hull),
                'step_description': f'Checking point {pts[r]} against current best {pts[q]}'
            })
            
            o = orientation(pts[p], pts[q], pts[r])
            if o == 2 or (o == 0 and dist_sq(pts[p], pts[r]) > dist_sq(pts[p], pts[q])):
                q = r
        
        # Log chosen edge
        steps.append({
            'type': 'chosen',
            'from_point': pts[p],
            'to_point': pts[q],
            'hull_so_far': list(hull),
            'step_description': f'Selected {pts[q]} as next hull point'
        })
        
        p = q
        if p == l:  # Completed the hull
            break
    
    return hull, steps

def graham_scan_with_steps(points: List[Tuple[float, float]]) -> Tuple[List[Tuple[float, float]], List[Dict[str, Any]]]:
    """Graham Scan algorithm with step-by-step logging"""
    pts = sorted(set(points))
    if len(pts) <= 1:
        return pts, []

    def cross(o: Tuple[float, float], a: Tuple[float, float], b: Tuple[float, float]) -> float:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    upper = []
    steps = []
    
    # Build lower hull
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            removed = lower.pop()
            steps.append({
                'type': 'pop',
                'hull_part': 'lower',
                'removed_point': removed,
                'current_point': p,
                'stack': list(lower),
                'step_description': f'Removed {removed} from lower hull (makes right turn)'
            })
        
        lower.append(p)
        steps.append({
            'type': 'push',
            'hull_part': 'lower',
            'added_point': p,
            'stack': list(lower),
            'step_description': f'Added {p} to lower hull'
        })
    
    # Build upper hull
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            removed = upper.pop()
            steps.append({
                'type': 'pop',
                'hull_part': 'upper',
                'removed_point': removed,
                'current_point': p,
                'stack': list(upper),
                'step_description': f'Removed {removed} from upper hull (makes right turn)'
            })
        
        upper.append(p)
        steps.append({
            'type': 'push',
            'hull_part': 'upper',
            'added_point': p,
            'stack': list(upper),
            'step_description': f'Added {p} to upper hull'
        })

    # Combine hulls (remove last point of each as they are repeated)
    hull = lower[:-1] + upper[:-1]
    
    steps.append({
        'type': 'final',
        'hull_part': 'combined',
        'final_hull': hull,
        'step_description': f'Combined lower and upper hulls to get final convex hull'
    })
    
    return hull, steps

def generate_random_points(n: int, bbox: int = 100) -> List[Tuple[float, float]]:
    """Generate n random unique points within bbox x bbox area"""
    pts = []
    seen = set()
    
    while len(pts) < n:
        p = (random.randint(0, bbox), random.randint(0, bbox))
        if p in seen:
            continue
        seen.add(p)
        pts.append(p)
    
    return pts

def analyze_algorithm_complexity(n_values: List[int]) -> Dict[str, Any]:
    """Analyze time complexity for both algorithms across different input sizes"""
    results = {
        'input_sizes': n_values,
        'jarvis_times': [],
        'graham_times': [],
        'jarvis_hull_sizes': [],
        'graham_hull_sizes': [],
        'complexity_analysis': {}
    }
    
    for n in n_values:
        # Generate test points
        points = generate_random_points(n)
        
        # Test Jarvis March
        start_time = time.perf_counter()
        jarvis_hull, _ = jarvis_march_with_steps(points)
        jarvis_time = time.perf_counter() - start_time
        
        # Test Graham Scan  
        start_time = time.perf_counter()
        graham_hull, _ = graham_scan_with_steps(points)
        graham_time = time.perf_counter() - start_time
        
        results['jarvis_times'].append(jarvis_time)
        results['graham_times'].append(graham_time)
        results['jarvis_hull_sizes'].append(len(jarvis_hull))
        results['graham_hull_sizes'].append(len(graham_hull))
    
    # Calculate complexity analysis
    results['complexity_analysis'] = {
        'jarvis_march': {
            'theoretical': 'O(nh) where n=points, h=hull vertices',
            'best_case': 'O(n log n) when h is small',
            'worst_case': 'O(n²) when all points are on hull',
            'space_complexity': 'O(h)'
        },
        'graham_scan': {
            'theoretical': 'O(n log n)',
            'best_case': 'O(n log n)',
            'worst_case': 'O(n log n)', 
            'space_complexity': 'O(n)'
        },
        'recommendation': 'Graham Scan is generally better for large datasets due to consistent O(n log n) time complexity, while Jarvis March can be better when hull size (h) is very small relative to n.'
    }
    
    return results

# ---------------------- Pydantic Models ----------------------

class Point(BaseModel):
    x: float
    y: float

class ConvexHullRequest(BaseModel):
    num_points: int = Field(default=20, ge=3, le=10000)
    bbox_size: int = Field(default=100, ge=10, le=1000)
    custom_points: Optional[List[Point]] = None

class AlgorithmStep(BaseModel):
    type: str
    step_description: str
    hull_so_far: Optional[List[Tuple[float, float]]] = None
    from_point: Optional[Tuple[float, float]] = None
    to_point: Optional[Tuple[float, float]] = None
    current_best: Optional[Tuple[float, float]] = None
    hull_part: Optional[str] = None
    added_point: Optional[Tuple[float, float]] = None
    removed_point: Optional[Tuple[float, float]] = None
    stack: Optional[List[Tuple[float, float]]] = None
    current_point: Optional[Tuple[float, float]] = None
    final_hull: Optional[List[Tuple[float, float]]] = None

class ConvexHullResult(BaseModel):
    algorithm: str
    points: List[Tuple[float, float]]
    hull: List[Tuple[float, float]]
    hull_size: int
    execution_time: float
    steps: List[Dict[str, Any]]

class ComparisonResult(BaseModel):
    points: List[Tuple[float, float]]
    jarvis_result: ConvexHullResult
    graham_result: ConvexHullResult
    performance_comparison: Dict[str, Any]

class PerformanceAnalysisRequest(BaseModel):
    start_size: int = Field(default=100, ge=10, le=1000)
    end_size: int = Field(default=10000, ge=100, le=100000)
    step_size: int = Field(default=500, ge=100, le=5000)

# ---------------------- API Endpoints ----------------------

@api_router.get("/")
async def root():
    return {"message": "Convex Hull Comparative Analysis API"}

@api_router.post("/convex-hull/compare", response_model=ComparisonResult)
async def compare_convex_hull_algorithms(request: ConvexHullRequest):
    """Compare Jarvis March and Graham Scan algorithms"""
    try:
        # Generate or use custom points
        if request.custom_points:
            points = [(p.x, p.y) for p in request.custom_points]
        else:
            points = generate_random_points(request.num_points, request.bbox_size)
        
        # Run Jarvis March
        start_time = time.perf_counter()
        jarvis_hull, jarvis_steps = jarvis_march_with_steps(points)
        jarvis_time = time.perf_counter() - start_time
        
        # Run Graham Scan
        start_time = time.perf_counter()
        graham_hull, graham_steps = graham_scan_with_steps(points)
        graham_time = time.perf_counter() - start_time
        
        # Performance comparison
        performance_comparison = {
            'jarvis_faster': jarvis_time < graham_time,
            'time_difference': abs(jarvis_time - graham_time),
            'jarvis_steps_count': len(jarvis_steps),
            'graham_steps_count': len(graham_steps),
            'hull_sizes_match': len(jarvis_hull) == len(graham_hull),
            'efficiency_ratio': graham_time / jarvis_time if jarvis_time > 0 else 1.0
        }
        
        return ComparisonResult(
            points=points,
            jarvis_result=ConvexHullResult(
                algorithm="Jarvis March",
                points=points,
                hull=jarvis_hull,
                hull_size=len(jarvis_hull),
                execution_time=jarvis_time,
                steps=jarvis_steps
            ),
            graham_result=ConvexHullResult(
                algorithm="Graham Scan",
                points=points,
                hull=graham_hull,
                hull_size=len(graham_hull),
                execution_time=graham_time,
                steps=graham_steps
            ),
            performance_comparison=performance_comparison
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in convex hull computation: {str(e)}")

@api_router.post("/convex-hull/performance-analysis")
async def analyze_performance(request: PerformanceAnalysisRequest):
    """Analyze algorithm performance across different input sizes"""
    try:
        # Generate input sizes for testing
        n_values = list(range(request.start_size, request.end_size + 1, request.step_size))
        
        # Run complexity analysis
        analysis_results = analyze_algorithm_complexity(n_values)
        
        return {
            "status": "success",
            "analysis": analysis_results,
            "test_parameters": {
                "start_size": request.start_size,
                "end_size": request.end_size,
                "step_size": request.step_size,
                "total_tests": len(n_values)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in performance analysis: {str(e)}")

@api_router.get("/convex-hull/generate-points/{num_points}")
async def generate_points(num_points: int, bbox_size: int = 100):
    """Generate random points for testing"""
    try:
        if num_points < 3 or num_points > 10000:
            raise HTTPException(status_code=400, detail="num_points must be between 3 and 10000")
        
        points = generate_random_points(num_points, bbox_size)
        return {
            "status": "success",
            "points": points,
            "count": len(points),
            "bbox_size": bbox_size
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating points: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()