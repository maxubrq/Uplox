import { AppMetrics } from '@application';
import { Counter, Histogram, Gauge, register } from 'prom-client';

export class PromMetrics implements AppMetrics {
    private static _instance: PromMetrics | null = null;

    // Performance metrics - Histograms
    private readonly uploadRequestDurationHist: Histogram<string>;
    private readonly presignDurationHist: Histogram<string>;
    private readonly avScanDurationHist: Histogram<string>;
    private readonly storagePutLatencyHist: Histogram<string>;
    private readonly healthCheckLatencyHist: Histogram<string>;

    // Security metrics - Counters
    private readonly avDetectionCounter: Counter<string>;
    private readonly avScanFailureCounter: Counter<string>;
    private readonly sha256MismatchCounter: Counter<string>;
    private readonly rateLimitRequestsCounter: Counter<string>;

    // Reliability & Availability metrics
    private readonly uptimeGauge: Gauge<string>;
    private readonly apiErrorsCounter: Counter<string>;
    private readonly uploadErrorsCounter: Counter<string>;

    // Usage & Business metrics
    private readonly uploadCounter: Counter<string>;
    private readonly uploadsByMimeCounter: Counter<string>;
    private readonly uploadsBySizeBucketCounter: Counter<string>;
    private readonly throughputCounter: Counter<string>;

    private constructor() {
        // Initialize performance metrics
        this.uploadRequestDurationHist = new Histogram({
            name: 'uplox_upload_request_duration_milliseconds',
            help: 'Duration of upload requests in milliseconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [1, 5, 15, 50, 100, 500, 1000, 5000, 15000, 50000],
        });

        this.presignDurationHist = new Histogram({
            name: 'uplox_presign_duration_milliseconds',
            help: 'Duration of presign requests in milliseconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [1, 5, 15, 50, 100, 500, 1000, 5000],
        });

        this.avScanDurationHist = new Histogram({
            name: 'uplox_av_scan_duration_milliseconds',
            help: 'Duration of AV scan operations in milliseconds',
            labelNames: ['scanner', 'result'],
            buckets: [10, 50, 100, 500, 1000, 5000, 10000, 30000, 60000],
        });

        this.storagePutLatencyHist = new Histogram({
            name: 'uplox_storage_put_latency_milliseconds',
            help: 'Latency of storage put operations in milliseconds',
            labelNames: ['bucket', 'result'],
            buckets: [1, 5, 15, 50, 100, 500, 1000, 5000, 15000],
        });

        this.healthCheckLatencyHist = new Histogram({
            name: 'uplox_health_check_latency_milliseconds',
            help: 'Latency of health check operations in milliseconds',
            labelNames: ['endpoint'],
            buckets: [1, 5, 15, 50, 100, 500, 1000],
        });

        // Initialize security metrics
        this.avDetectionCounter = new Counter({
            name: 'uplox_av_detection_total',
            help: 'Total number of virus files detected by AV',
            labelNames: ['scanner', 'virus_type'],
        });

        this.avScanFailureCounter = new Counter({
            name: 'uplox_av_scan_failure_total',
            help: 'Total number of AV scan failures',
            labelNames: ['scanner', 'failure_reason'],
        });

        this.sha256MismatchCounter = new Counter({
            name: 'uplox_sha256_mismatch_total',
            help: 'Total number of SHA256 hash mismatches',
            labelNames: ['operation'],
        });

        this.rateLimitRequestsCounter = new Counter({
            name: 'uplox_rate_limit_requests_total',
            help: 'Total number of requests rejected by rate limit',
            labelNames: ['endpoint', 'limit_type'],
        });

        // Initialize reliability metrics
        this.uptimeGauge = new Gauge({
            name: 'uplox_uptime_seconds_total',
            help: 'Total uptime in seconds',
            labelNames: ['service'],
        });

        this.apiErrorsCounter = new Counter({
            name: 'uplox_api_errors_total',
            help: 'Total number of API errors (4xx, 5xx)',
            labelNames: ['method', 'route', 'status_code'],
        });

        this.uploadErrorsCounter = new Counter({
            name: 'uplox_upload_errors_total',
            help: 'Total number of upload errors',
            labelNames: ['error_type', 'stage'],
        });

        // Initialize usage metrics
        this.uploadCounter = new Counter({
            name: 'uplox_upload_total',
            help: 'Total number of successfully uploaded files',
            labelNames: ['file_type'],
        });

        this.uploadsByMimeCounter = new Counter({
            name: 'uplox_uploads_by_mime_total',
            help: 'Total number of uploads by MIME type',
            labelNames: ['mime_type'],
        });

        this.uploadsBySizeBucketCounter = new Counter({
            name: 'uplox_uploads_by_size_bucket_total',
            help: 'Total number of uploads by size bucket',
            labelNames: ['size_bucket'],
        });

        this.throughputCounter = new Counter({
            name: 'uplox_throughput_bytes_total',
            help: 'Total throughput in bytes',
            labelNames: ['operation'],
        });

        // Set initial uptime
        this.uptimeGauge.set({ service: 'uplox' }, Date.now() / 1000);
    }

    public static getInstance() {
        if (!PromMetrics._instance) {
            PromMetrics._instance = new PromMetrics();
        }
        return PromMetrics._instance;
    }

    async uploadRequestDurationMillis(
        duration: number,
        method?: string,
        route?: string,
        statusCode?: string,
    ): Promise<void> {
        this.uploadRequestDurationHist.observe(
            { method: method || 'unknown', route: route || 'unknown', status_code: statusCode || 'unknown' },
            duration,
        );
    }

    async presignDurationMillis(duration: number, method?: string, route?: string, statusCode?: string): Promise<void> {
        this.presignDurationHist.observe(
            { method: method || 'unknown', route: route || 'unknown', status_code: statusCode || 'unknown' },
            duration,
        );
    }

    async avScanDurationMillis(name: string, duration: number, result?: string): Promise<void> {
        this.avScanDurationHist.observe({ scanner: name, result: result || 'unknown' }, duration);
    }

    async storagePutLatencyMillis(latency: number, bucket?: string, result?: string): Promise<void> {
        this.storagePutLatencyHist.observe({ bucket: bucket || 'unknown', result: result || 'unknown' }, latency);
    }

    async throughputBytesPerSecons(bytes: number, operation?: string): Promise<void> {
        this.throughputCounter.inc({ operation: operation || 'unknown' }, bytes);
    }

    async avDetectionTotal(name: string, virusType?: string): Promise<void> {
        this.avDetectionCounter.inc({ scanner: name, virus_type: virusType || 'unknown' });
    }

    async avScanFailureTotal(name: string, failureReason?: string): Promise<void> {
        this.avScanFailureCounter.inc({ scanner: name, failure_reason: failureReason || 'unknown' });
    }

    async sha256MismatchTotal(operation?: string): Promise<void> {
        this.sha256MismatchCounter.inc({ operation: operation || 'unknown' });
    }

    async rateLimitRequestsTotal(endpoint?: string, limitType?: string): Promise<void> {
        this.rateLimitRequestsCounter.inc({ endpoint: endpoint || 'unknown', limit_type: limitType || 'unknown' });
    }

    async healthCheckLatencyMillis(latency: number, endpoint?: string): Promise<void> {
        this.healthCheckLatencyHist.observe({ endpoint: endpoint || 'unknown' }, latency);
    }

    async uptimeSecondsTotal(seconds?: number): Promise<void> {
        const uptime = seconds || Date.now() / 1000;
        this.uptimeGauge.set({ service: 'uplox' }, uptime);
    }

    async apiErrorsTotal(method?: string, route?: string, statusCode?: string): Promise<void> {
        this.apiErrorsCounter.inc({
            method: method || 'unknown',
            route: route || 'unknown',
            status_code: statusCode || 'unknown',
        });
    }

    async uploadErrorsTotal(errorType?: string, stage?: string): Promise<void> {
        this.uploadErrorsCounter.inc({
            error_type: errorType || 'unknown',
            stage: stage || 'unknown',
        });
    }

    async uploadTotal(fileType?: string): Promise<void> {
        this.uploadCounter.inc({ file_type: fileType || 'unknown' });
    }

    async uploadsByMime(mime: string): Promise<void> {
        this.uploadsByMimeCounter.inc({ mime_type: mime });
    }

    async uploadsBySizeBucket(bucket: string): Promise<void> {
        this.uploadsBySizeBucketCounter.inc({ size_bucket: bucket });
    }

    async serveRoute(): Promise<string> {
        // Return the metrics in Prometheus format
        const metrics = await register.metrics();
        return metrics;
    }
}
