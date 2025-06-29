#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Change to the repository root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

print_info "Starting Docker image build process..."
print_info "Repository root: $REPO_ROOT"

# Check if apps directory exists
if [ ! -d "apps" ]; then
    print_error "apps directory not found!"
    exit 1
fi

# Find all directories containing Dockerfile in apps folder
DOCKERFILE_DIRS=()
while IFS= read -r -d '' dockerfile_path; do
    # Get the directory containing the Dockerfile
    dockerfile_dir=$(dirname "$dockerfile_path")
    DOCKERFILE_DIRS+=("$dockerfile_dir")
done < <(find apps -name "Dockerfile" -type f -print0)

# Check if any Dockerfiles were found
if [ ${#DOCKERFILE_DIRS[@]} -eq 0 ]; then
    print_warning "No Dockerfiles found in apps directory!"
    exit 0
fi

print_info "Found ${#DOCKERFILE_DIRS[@]} Dockerfile(s):"
for dir in "${DOCKERFILE_DIRS[@]}"; do
    echo "  - $dir"
done
echo

# Build each Docker image
SUCCESS_COUNT=0
TOTAL_COUNT=${#DOCKERFILE_DIRS[@]}
# Argument to control ClamAV inclusion ./scripts/build-docker.sh false
INCLUDE_CLAMAV=${1:-false}

for dockerfile_dir in "${DOCKERFILE_DIRS[@]}"; do
    # Extract image name from directory path (e.g., apps/uplox -> uplox)
    # If INCLUDE_CLAMAV is false, image name will be surfix with -noclamav
    image_name=$(basename "$dockerfile_dir")
    if [ "$INCLUDE_CLAMAV" = "false" ]; then
        image_name="$image_name-noclamav"
    fi
    
    print_info "Building Docker image: $image_name"
    print_info "Build context: $REPO_ROOT"
    print_info "Dockerfile: $dockerfile_dir/Dockerfile"
    
    # Build the Docker image with repo root as context and specify Dockerfile location
    if docker build --build-arg INCLUDE_CLAMAV="$INCLUDE_CLAMAV" -f "$dockerfile_dir/Dockerfile" -t "$image_name" .; then
        # Get the image size (more robust approach)
        image_size=$(docker images --format "{{.Size}}" "$image_name" 2>/dev/null | head -n 1 || echo "Unknown")
        print_success "Successfully built image: $image_name"
        print_info "Image size: $image_size"
        ((SUCCESS_COUNT++))
    else
        print_error "Failed to build image: $image_name"
    fi
    echo
done

# Summary
echo "=================================="
print_info "Build Summary:"
print_info "Total images: $TOTAL_COUNT"
print_success "Successfully built: $SUCCESS_COUNT"
if [ $SUCCESS_COUNT -lt $TOTAL_COUNT ]; then
    FAILED_COUNT=$((TOTAL_COUNT - SUCCESS_COUNT))
    print_error "Failed builds: $FAILED_COUNT"
    exit 1
else
    print_success "All Docker images built successfully!"
fi
