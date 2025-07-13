import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PromMetrics } from '../prom-metrics';
import { Counter, Histogram, Gauge, register } from 'prom-client';

// Mock prom-client
vi.mock('prom-client', () => ({
    Counter: vi.fn(),
    Histogram: vi.fn(),
    Gauge: vi.fn(),
    register: {
        metrics: vi.fn(),
    },
}));

describe('PromMetrics', () => {
    let promMetrics: PromMetrics;

    // Mock instances
    const mockHistogramObserve = vi.fn();
    const mockCounterInc = vi.fn();
    const mockGaugeSet = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset singleton instance
        (PromMetrics as any)._instance = null;

        // Setup mocks
        (Counter as any).mockImplementation(() => ({
            inc: mockCounterInc,
        }));

        (Histogram as any).mockImplementation(() => ({
            observe: mockHistogramObserve,
        }));

        (Gauge as any).mockImplementation(() => ({
            set: mockGaugeSet,
        }));

        (register.metrics as any).mockResolvedValue('mocked metrics output');

        // Mock Date.now for consistent testing
        vi.spyOn(Date, 'now').mockReturnValue(1672531200000); // 2023-01-01 00:00:00 UTC

        promMetrics = PromMetrics.getInstance();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance when called multiple times', () => {
            const instance1 = PromMetrics.getInstance();
            const instance2 = PromMetrics.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should create only one instance', () => {
            PromMetrics.getInstance();
            PromMetrics.getInstance();
            PromMetrics.getInstance();

            // Should have created metrics instances only once
            expect(Counter).toHaveBeenCalledTimes(10); // 10 counter metrics
            expect(Histogram).toHaveBeenCalledTimes(5); // 5 histogram metrics
            expect(Gauge).toHaveBeenCalledTimes(1); // 1 gauge metric
        });
    });

    describe('Metric Initialization', () => {
        it('should initialize all histogram metrics with correct configuration', () => {
            expect(Histogram).toHaveBeenCalledWith({
                name: 'uplox_upload_request_duration_milliseconds',
                help: 'Duration of upload requests in milliseconds',
                labelNames: ['method', 'route', 'status_code'],
                buckets: [1, 5, 15, 50, 100, 500, 1000, 5000, 15000, 50000],
            });

            expect(Histogram).toHaveBeenCalledWith({
                name: 'uplox_presign_duration_milliseconds',
                help: 'Duration of presign requests in milliseconds',
                labelNames: ['method', 'route', 'status_code'],
                buckets: [1, 5, 15, 50, 100, 500, 1000, 5000],
            });

            expect(Histogram).toHaveBeenCalledWith({
                name: 'uplox_av_scan_duration_milliseconds',
                help: 'Duration of AV scan operations in milliseconds',
                labelNames: ['scanner', 'result'],
                buckets: [10, 50, 100, 500, 1000, 5000, 10000, 30000, 60000],
            });

            expect(Histogram).toHaveBeenCalledWith({
                name: 'uplox_storage_put_latency_milliseconds',
                help: 'Latency of storage put operations in milliseconds',
                labelNames: ['bucket', 'result'],
                buckets: [1, 5, 15, 50, 100, 500, 1000, 5000, 15000],
            });

            expect(Histogram).toHaveBeenCalledWith({
                name: 'uplox_health_check_latency_milliseconds',
                help: 'Latency of health check operations in milliseconds',
                labelNames: ['endpoint'],
                buckets: [1, 5, 15, 50, 100, 500, 1000],
            });
        });

        it('should initialize all counter metrics with correct configuration', () => {
            expect(Counter).toHaveBeenCalledWith({
                name: 'uplox_av_detection_total',
                help: 'Total number of virus files detected by AV',
                labelNames: ['scanner', 'virus_type'],
            });

            expect(Counter).toHaveBeenCalledWith({
                name: 'uplox_av_scan_failure_total',
                help: 'Total number of AV scan failures',
                labelNames: ['scanner', 'failure_reason'],
            });

            expect(Counter).toHaveBeenCalledWith({
                name: 'uplox_sha256_mismatch_total',
                help: 'Total number of SHA256 hash mismatches',
                labelNames: ['operation'],
            });

            expect(Counter).toHaveBeenCalledWith({
                name: 'uplox_rate_limit_requests_total',
                help: 'Total number of requests rejected by rate limit',
                labelNames: ['endpoint', 'limit_type'],
            });

            expect(Counter).toHaveBeenCalledWith({
                name: 'uplox_api_errors_total',
                help: 'Total number of API errors (4xx, 5xx)',
                labelNames: ['method', 'route', 'status_code'],
            });

            expect(Counter).toHaveBeenCalledWith({
                name: 'uplox_upload_errors_total',
                help: 'Total number of upload errors',
                labelNames: ['error_type', 'stage'],
            });

            expect(Counter).toHaveBeenCalledWith({
                name: 'uplox_upload_total',
                help: 'Total number of successfully uploaded files',
                labelNames: ['file_type'],
            });

            expect(Counter).toHaveBeenCalledWith({
                name: 'uplox_uploads_by_mime_total',
                help: 'Total number of uploads by MIME type',
                labelNames: ['mime_type'],
            });

            expect(Counter).toHaveBeenCalledWith({
                name: 'uplox_uploads_by_size_bucket_total',
                help: 'Total number of uploads by size bucket',
                labelNames: ['size_bucket'],
            });

            expect(Counter).toHaveBeenCalledWith({
                name: 'uplox_throughput_bytes_total',
                help: 'Total throughput in bytes',
                labelNames: ['operation'],
            });
        });

        it('should initialize gauge metrics with correct configuration', () => {
            expect(Gauge).toHaveBeenCalledWith({
                name: 'uplox_uptime_seconds_total',
                help: 'Total uptime in seconds',
                labelNames: ['service'],
            });
        });

        it('should set initial uptime', () => {
            expect(mockGaugeSet).toHaveBeenCalledWith({ service: 'uplox' }, 1672531200);
        });
    });

    describe('Performance Metrics', () => {
        it('should record upload request duration with all parameters', async () => {
            await promMetrics.uploadRequestDurationMillis(1500, 'POST', '/upload', '200');

            expect(mockHistogramObserve).toHaveBeenCalledWith(
                { method: 'POST', route: '/upload', status_code: '200' },
                1500,
            );
        });

        it('should record upload request duration with default values', async () => {
            await promMetrics.uploadRequestDurationMillis(1500);

            expect(mockHistogramObserve).toHaveBeenCalledWith(
                { method: 'unknown', route: 'unknown', status_code: 'unknown' },
                1500,
            );
        });

        it('should record presign duration', async () => {
            await promMetrics.presignDurationMillis(300, 'GET', '/presign', '200');

            expect(mockHistogramObserve).toHaveBeenCalledWith(
                { method: 'GET', route: '/presign', status_code: '200' },
                300,
            );
        });

        it('should record AV scan duration', async () => {
            await promMetrics.avScanDurationMillis('clamav', 2000, 'clean');

            expect(mockHistogramObserve).toHaveBeenCalledWith({ scanner: 'clamav', result: 'clean' }, 2000);
        });

        it('should record storage put latency', async () => {
            await promMetrics.storagePutLatencyMillis(100, 'uploads', 'success');

            expect(mockHistogramObserve).toHaveBeenCalledWith({ bucket: 'uploads', result: 'success' }, 100);
        });

        it('should record health check latency', async () => {
            await promMetrics.healthCheckLatencyMillis(50, '/health');

            expect(mockHistogramObserve).toHaveBeenCalledWith({ endpoint: '/health' }, 50);
        });
    });

    describe('Security Metrics', () => {
        it('should record AV detection', async () => {
            await promMetrics.avDetectionTotal('clamav', 'trojan');

            expect(mockCounterInc).toHaveBeenCalledWith({ scanner: 'clamav', virus_type: 'trojan' });
        });

        it('should record AV scan failure', async () => {
            await promMetrics.avScanFailureTotal('clamav', 'timeout');

            expect(mockCounterInc).toHaveBeenCalledWith({ scanner: 'clamav', failure_reason: 'timeout' });
        });

        it('should record SHA256 mismatch', async () => {
            await promMetrics.sha256MismatchTotal('upload');

            expect(mockCounterInc).toHaveBeenCalledWith({ operation: 'upload' });
        });

        it('should record rate limit requests', async () => {
            await promMetrics.rateLimitRequestsTotal('/upload', 'file_size');

            expect(mockCounterInc).toHaveBeenCalledWith({ endpoint: '/upload', limit_type: 'file_size' });
        });
    });

    describe('Reliability Metrics', () => {
        it('should update uptime with provided seconds', async () => {
            await promMetrics.uptimeSecondsTotal(3600);

            expect(mockGaugeSet).toHaveBeenCalledWith({ service: 'uplox' }, 3600);
        });

        it('should update uptime with current time when no seconds provided', async () => {
            await promMetrics.uptimeSecondsTotal();

            expect(mockGaugeSet).toHaveBeenCalledWith({ service: 'uplox' }, 1672531200);
        });

        it('should record API errors', async () => {
            await promMetrics.apiErrorsTotal('POST', '/upload', '500');

            expect(mockCounterInc).toHaveBeenCalledWith({
                method: 'POST',
                route: '/upload',
                status_code: '500',
            });
        });

        it('should record upload errors', async () => {
            await promMetrics.uploadErrorsTotal('virus_detected', 'scan');

            expect(mockCounterInc).toHaveBeenCalledWith({
                error_type: 'virus_detected',
                stage: 'scan',
            });
        });
    });

    describe('Usage Metrics', () => {
        it('should record upload count', async () => {
            await promMetrics.uploadTotal('pdf');

            expect(mockCounterInc).toHaveBeenCalledWith({ file_type: 'pdf' });
        });

        it('should record uploads by MIME type', async () => {
            await promMetrics.uploadsByMime('application/pdf');

            expect(mockCounterInc).toHaveBeenCalledWith({ mime_type: 'application/pdf' });
        });

        it('should record uploads by size bucket', async () => {
            await promMetrics.uploadsBySizeBucket('1MB-10MB');

            expect(mockCounterInc).toHaveBeenCalledWith({ size_bucket: '1MB-10MB' });
        });

        it('should record throughput', async () => {
            await promMetrics.throughputBytesPerSecons(1048576, 'upload');

            expect(mockCounterInc).toHaveBeenCalledWith({ operation: 'upload' }, 1048576);
        });
    });

    describe('serveRoute', () => {
        it('should return metrics in Prometheus format', async () => {
            const result = await promMetrics.serveRoute();

            expect(register.metrics).toHaveBeenCalled();
            expect(result).toBe('mocked metrics output');
        });
    });

    describe('Default Values', () => {
        it('should use default values for optional parameters in histogram metrics', async () => {
            await promMetrics.avScanDurationMillis('clamav', 1000);

            expect(mockHistogramObserve).toHaveBeenCalledWith({ scanner: 'clamav', result: 'unknown' }, 1000);
        });

        it('should use default values for optional parameters in counter metrics', async () => {
            await promMetrics.avDetectionTotal('clamav');

            expect(mockCounterInc).toHaveBeenCalledWith({ scanner: 'clamav', virus_type: 'unknown' });
        });

        it('should use default values for all optional parameters', async () => {
            await promMetrics.apiErrorsTotal();

            expect(mockCounterInc).toHaveBeenCalledWith({
                method: 'unknown',
                route: 'unknown',
                status_code: 'unknown',
            });
        });
    });
});
