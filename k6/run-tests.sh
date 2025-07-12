#!/bin/bash

# K6 Test Runner Script for Uplox
# Usage: ./run-tests.sh [test-type] [additional-args]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DEFAULT_VUS=100
DEFAULT_DURATION="10m"
DEFAULT_TARGET="http://localhost:3000"

# Help function
show_help() {
    echo "K6 Test Runner for Uplox"
    echo ""
    echo "Usage: $0 [options] [test-type]"
    echo ""
    echo "Test Types:"
    echo "  dev        - Development test (10 VUs, 30s)"
    echo "  load       - Load test (100 VUs, 10m)"
    echo "  stress     - Stress test (1000 VUs, 10m)"
    echo "  distributed - Distributed test with ramping"
    echo "  custom     - Custom test (use environment variables)"
    echo ""
    echo "Options:"
    echo "  -h, --help           Show this help"
    echo "  -v, --vus VUS        Number of virtual users (default: $DEFAULT_VUS)"
    echo "  -d, --duration DURATION  Test duration (default: $DEFAULT_DURATION)"
    echo "  -t, --target URL     Target URL (default: $DEFAULT_TARGET)"
    echo "  --distributed        Enable distributed mode"
    echo "  --build-only         Only build, don't run tests"
    echo "  --no-build           Skip build step"
    echo ""
    echo "Environment Variables:"
    echo "  K6_VUS               Number of virtual users"
    echo "  K6_DURATION          Test duration"
    echo "  K6_TARGET_URL        Target URL"
    echo "  K6_DISTRIBUTED_MODE  Enable distributed mode (true/false)"
    echo ""
    echo "Examples:"
    echo "  $0 dev"
    echo "  $0 load -v 200 -d 15m"
    echo "  $0 stress --target http://production.example.com"
    echo "  $0 distributed -v 5000"
    echo "  K6_VUS=500 K6_DURATION=30m $0 custom"
}

# Parse command line arguments
VUS=${K6_VUS:-$DEFAULT_VUS}
DURATION=${K6_DURATION:-$DEFAULT_DURATION}
TARGET=${K6_TARGET_URL:-$DEFAULT_TARGET}
DISTRIBUTED=${K6_DISTRIBUTED_MODE:-false}
BUILD_ONLY=false
NO_BUILD=false
TEST_TYPE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--vus)
            VUS="$2"
            shift 2
            ;;
        -d|--duration)
            DURATION="$2"
            shift 2
            ;;
        -t|--target)
            TARGET="$2"
            shift 2
            ;;
        --distributed)
            DISTRIBUTED=true
            shift
            ;;
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --no-build)
            NO_BUILD=true
            shift
            ;;
        dev|load|stress|distributed|custom)
            TEST_TYPE="$1"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Set test type defaults
case $TEST_TYPE in
    dev)
        VUS=10
        DURATION="30s"
        ;;
    load)
        VUS=100
        DURATION="10m"
        ;;
    stress)
        VUS=1000
        DURATION="10m"
        ;;
    distributed)
        DISTRIBUTED=true
        VUS=${VUS:-100}
        ;;
    custom)
        # Use environment variables or defaults
        ;;
    "")
        echo -e "${RED}No test type specified. Use -h for help.${NC}"
        exit 1
        ;;
esac

# Print configuration
echo -e "${GREEN}K6 Test Configuration:${NC}"
echo -e "  Test Type: ${YELLOW}$TEST_TYPE${NC}"
echo -e "  VUs: ${YELLOW}$VUS${NC}"
echo -e "  Duration: ${YELLOW}$DURATION${NC}"
echo -e "  Target: ${YELLOW}$TARGET${NC}"
echo -e "  Distributed: ${YELLOW}$DISTRIBUTED${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}k6 is not installed. Please install k6 first.${NC}"
    echo "Installation instructions: https://k6.io/docs/get-started/installation/"
    exit 1
fi

# Build TypeScript if needed
if [ "$NO_BUILD" = false ]; then
    echo -e "${GREEN}Building TypeScript...${NC}"
    if ! pnpm run build; then
        echo -e "${RED}Build failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}Build completed${NC}"
fi

# Exit if build-only
if [ "$BUILD_ONLY" = true ]; then
    echo -e "${GREEN}Build completed. Exiting (build-only mode).${NC}"
    exit 0
fi

# Check if built files exist
if [ ! -f "dist/main-tests.js" ]; then
    echo -e "${RED}Built test file not found. Run build first.${NC}"
    exit 1
fi

# Set environment variables for k6
export K6_VUS=$VUS
export K6_DURATION=$DURATION
export K6_TARGET_URL=$TARGET
export K6_DISTRIBUTED_MODE=$DISTRIBUTED

# Create results directory
mkdir -p results

# Run the test
echo -e "${GREEN}Starting k6 test...${NC}"
echo ""

# Run k6 with the built test file
k6 run \
    --vus $VUS \
    --duration $DURATION \
    --out json=results/k6-results-$(date +%Y%m%d-%H%M%S).json \
    dist/main-tests.js

echo ""
echo -e "${GREEN}Test completed!${NC}"
echo -e "Results saved to: ${YELLOW}results/${NC}" 