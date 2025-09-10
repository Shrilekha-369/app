import requests
import sys
import json
from datetime import datetime

class ConvexHullAPITester:
    def __init__(self, base_url="https://hull-analyzer.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:500]}...")

            return success, response.json() if response.text else {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout (30s)")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health check endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "",
            200
        )

    def test_convex_hull_compare_basic(self):
        """Test basic convex hull comparison with default parameters"""
        success, response = self.run_test(
            "Convex Hull Compare - Basic",
            "POST",
            "convex-hull/compare",
            200,
            data={"num_points": 10, "bbox_size": 100}
        )
        
        if success and response:
            # Validate response structure
            required_keys = ['points', 'jarvis_result', 'graham_result', 'performance_comparison']
            missing_keys = [key for key in required_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing response keys: {missing_keys}")
            else:
                print(f"   ✅ All required keys present")
                
                # Check if both algorithms produced same hull size
                jarvis_size = response['jarvis_result']['hull_size']
                graham_size = response['graham_result']['hull_size']
                if jarvis_size == graham_size:
                    print(f"   ✅ Hull sizes match: {jarvis_size}")
                else:
                    print(f"   ⚠️  Hull sizes differ: Jarvis={jarvis_size}, Graham={graham_size}")
        
        return success, response

    def test_convex_hull_compare_custom_points(self):
        """Test convex hull comparison with custom points"""
        custom_points = [
            {"x": 0, "y": 0},
            {"x": 10, "y": 0},
            {"x": 10, "y": 10},
            {"x": 0, "y": 10},
            {"x": 5, "y": 5}  # Interior point
        ]
        
        return self.run_test(
            "Convex Hull Compare - Custom Points",
            "POST",
            "convex-hull/compare",
            200,
            data={"custom_points": custom_points}
        )

    def test_convex_hull_compare_edge_cases(self):
        """Test edge cases for convex hull comparison"""
        # Test minimum points
        success1, _ = self.run_test(
            "Convex Hull Compare - Minimum Points (3)",
            "POST",
            "convex-hull/compare",
            200,
            data={"num_points": 3, "bbox_size": 50}
        )
        
        # Test larger dataset
        success2, _ = self.run_test(
            "Convex Hull Compare - Large Dataset (1000)",
            "POST",
            "convex-hull/compare",
            200,
            data={"num_points": 1000, "bbox_size": 500}
        )
        
        return success1 and success2

    def test_performance_analysis(self):
        """Test performance analysis endpoint"""
        success, response = self.run_test(
            "Performance Analysis",
            "POST",
            "convex-hull/performance-analysis",
            200,
            data={
                "start_size": 100,
                "end_size": 500,
                "step_size": 200
            }
        )
        
        if success and response:
            # Validate response structure
            if 'analysis' in response:
                analysis = response['analysis']
                required_keys = ['input_sizes', 'jarvis_times', 'graham_times', 'complexity_analysis']
                missing_keys = [key for key in required_keys if key not in analysis]
                if missing_keys:
                    print(f"   ⚠️  Missing analysis keys: {missing_keys}")
                else:
                    print(f"   ✅ All analysis keys present")
                    print(f"   📊 Tested {len(analysis['input_sizes'])} input sizes")
        
        return success, response

    def test_generate_points(self):
        """Test point generation endpoint"""
        success, response = self.run_test(
            "Generate Points",
            "GET",
            "convex-hull/generate-points/20",
            200,
            params={"bbox_size": 100}
        )
        
        if success and response:
            if 'points' in response and 'count' in response:
                actual_count = len(response['points'])
                expected_count = response['count']
                if actual_count == expected_count == 20:
                    print(f"   ✅ Generated correct number of points: {actual_count}")
                else:
                    print(f"   ⚠️  Point count mismatch: expected=20, actual={actual_count}, reported={expected_count}")
        
        return success, response

    def test_error_handling(self):
        """Test API error handling"""
        # Test invalid num_points (too small)
        success1, _ = self.run_test(
            "Error Handling - Invalid Points (too small)",
            "POST",
            "convex-hull/compare",
            422,  # Validation error
            data={"num_points": 2, "bbox_size": 100}
        )
        
        # Test invalid num_points (too large)
        success2, _ = self.run_test(
            "Error Handling - Invalid Points (too large)",
            "POST",
            "convex-hull/compare",
            422,  # Validation error
            data={"num_points": 20000, "bbox_size": 100}
        )
        
        # Test invalid generate points endpoint
        success3, _ = self.run_test(
            "Error Handling - Invalid Generate Points",
            "GET",
            "convex-hull/generate-points/20000",
            400,  # Bad request
        )
        
        return success1 and success2 and success3

def main():
    print("🚀 Starting Convex Hull API Tests")
    print("=" * 50)
    
    tester = ConvexHullAPITester()
    
    # Run all tests
    print("\n📋 Running API Tests...")
    
    # Basic functionality tests
    tester.test_health_check()
    tester.test_convex_hull_compare_basic()
    tester.test_convex_hull_compare_custom_points()
    tester.test_convex_hull_compare_edge_cases()
    tester.test_performance_analysis()
    tester.test_generate_points()
    
    # Error handling tests
    tester.test_error_handling()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"⚠️  {failed_tests} test(s) failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())