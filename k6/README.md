# K6 Load Testing for Uplox

This directory contains k6 load testing scripts for the Uplox file upload application.

## Features

- **Configurable Load Testing**: Support for different VU counts and duration via environment variables
- **File Upload Testing**: Tests the `/files/upload` endpoint with various file types
- **Distributed Testing**: Support for high-scale testing (up to 10,000 VUs)
- **Result Export**: Exports test results in JSON format
- **Health Check**: Validates service health before running upload tests
- **Realistic Test Data**: Uses sample files with proper multipart form data

## Quick Start

### 1. Build the Tests

```bash
cd k6
pnpm install
pnpm run build
```

### 2. Run Tests Locally

```bash
# Development test (10 VUs, 30 seconds)
pnpm run test:dev

# Load test (100 VUs, 10 minutes)
pnpm run test:load

# Stress test (1000 VUs, 10 minutes)
pnpm run test:stress

# Distributed test
pnpm run test:distributed
```

### 3. Run Tests with Docker Compose

```bash
# Default configuration (100 VUs, 10 minutes)
docker-compose up k6

# Custom configuration
K6_VUS=200 K6_DURATION=15m docker-compose up k6

# Distributed mode for high-scale testing
K6_DISTRIBUTED_MODE=true K6_VUS=500 docker-compose up k6
```

## Environment Variables

Configure the tests using these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `K6_VUS` | `100` | Number of virtual users (concurrent connections) |
| `K6_DURATION` | `10m` | Test duration (e.g., 30s, 5m, 1h) |
| `K6_TARGET_URL` | `http://uplox:3000` | Target URL for the Uplox service |
| `K6_DISTRIBUTED_MODE` | `false` | Enable distributed testing mode |

## Test Configuration

### Standard Load Test (100 VUs, 10 minutes)
```bash
K6_VUS=100 K6_DURATION=10m docker-compose up k6
```

### High-Scale Distributed Test (10,000 VUs)
```bash
K6_DISTRIBUTED_MODE=true K6_VUS=10000 K6_DURATION=10m docker-compose up k6
```

### Custom Duration Test
```bash
K6_VUS=500 K6_DURATION=30m docker-compose up k6
```

## Test Files

The tests use sample files from the `./sample_files` directory:

- `xlsx_test.xlsx` - Excel file (89KB)
- `zip_but_xls.zip` - ZIP file (132KB)
- `pptx_infected.rar` - Large RAR file (14MB)
- `pptx_test.pptx` - PowerPoint file (67KB)
- `rar_test.rar` - Small RAR file (1.7KB)
- `doc_infected.zip` - Infected document (1.1MB)
- `doc_test.doc` - Word document (44KB)
- `docm_text.docm` - Word macro document (19KB)
- `docx_password.docx` - Password-protected document (21KB)
- `doc_infected.doc` - Infected document (1.2MB)
- `malicious.pdf` - Malicious PDF file (6.5KB)

## Test Results

Test results are exported to the `results/` directory:

- `k6-results-[timestamp].json` - Detailed test results in JSON format
- Results include metrics like response times, error rates, and throughput

## Performance Thresholds

The tests include performance thresholds:

- **Response Time**: 95% of requests must complete within 5 seconds
- **Error Rate**: Less than 50% failure rate (since infected files are expected to fail)

## Distributed Testing

For high-scale testing (10,000+ VUs), enable distributed mode:

```bash
K6_DISTRIBUTED_MODE=true K6_VUS=10000 K6_DURATION=10m docker-compose up k6
```

Distributed mode uses a ramping pattern:
1. Ramp up to 10% of target VUs (2 minutes)
2. Ramp up to 50% of target VUs (3 minutes)
3. Ramp up to full target VUs (2 minutes)
4. Maintain full load for the specified duration
5. Ramp down to 0 VUs (3 minutes)

## Monitoring

During tests, monitor:

- **Application logs**: Check uplox service logs for errors
- **Resource usage**: Monitor CPU, memory, and network usage
- **Storage**: Monitor MinIO storage performance
- **Anti-virus scanner**: Check ClamAV scanner performance

## Expected Behavior

The tests are designed to handle both success and failure scenarios:

- **Success (200)**: File uploaded successfully
- **Failure (400)**: Expected for infected files or validation errors
- **Error (500)**: Unexpected server errors

Both success and failure responses are considered acceptable test outcomes.

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure the uplox service is running
2. **Timeout errors**: Increase the test timeout or reduce VU count
3. **Memory issues**: Reduce file sizes or VU count for resource-constrained environments
4. **Build errors**: Ensure TypeScript and dependencies are properly installed

### Debug Mode

For debugging, run tests with verbose output:

```bash
k6 run --verbose dist/main-tests.js
```

## Architecture

The test suite is designed for:

- **Scalability**: Support for thousands of concurrent users
- **Reliability**: Proper error handling and health checks
- **Maintainability**: TypeScript with proper type definitions
- **Observability**: Comprehensive metrics and result export

## Contributing

When adding new tests:

1. Follow the existing TypeScript patterns
2. Add appropriate type definitions
3. Include proper error handling
4. Update this README with any new features 