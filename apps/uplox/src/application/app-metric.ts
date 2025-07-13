export interface AppMetrics {
    // ------------------ PERFORMANCE METRICS --------------
    /**
     * Upload request duration in milliseconds - Histogram
     * @param duration Duration in milliseconds
     * @param method HTTP method
     * @param route Route path
     * @param statusCode HTTP status code
     */
    uploadRequestDurationMillis(duration: number, method?: string, route?: string, statusCode?: string): Promise<void>;
    /**
     * Presign request duration in milliseconds - Histogram
     * @param duration Duration in milliseconds
     * @param method HTTP method
     * @param route Route path
     * @param statusCode HTTP status code
     */
    presignDurationMillis(duration: number, method?: string, route?: string, statusCode?: string): Promise<void>;
    /**
     * Metadata request duration in milliseconds - Histogram
     * @param duration Duration in milliseconds
     * @param method HTTP method
     * @param route Route path
     * @param statusCode HTTP status code
     */
    metadataDurationMillis(duration: number, method?: string, route?: string, statusCode?: string): Promise<void>;
    /**
     * AV scan duration in milliseconds - Histogram
     * @param name Scanner name
     * @param duration Duration in milliseconds
     * @param result Scan result
     */
    avScanDurationMillis(name: string, duration: number, result?: string): Promise<void>;
    /**
     * Storage put latency in milliseconds - Histogram
     * @param latency Latency in milliseconds
     * @param bucket Storage bucket name
     * @param result Operation result
     */
    storagePutLatencyMillis(latency: number, bucket?: string, result?: string): Promise<void>;
    /**
     * Throughput in bytes per second - Counter/Summary
     * @param bytes Number of bytes
     * @param operation Operation type
     */
    throughputBytesPerSecons(bytes: number, operation?: string): Promise<void>;
    // ------------------- SECURITY METRICS ----------------------
    /**
     * Total number of virus file detected by AV - Counter
     * @param name Scanner name
     * @param virusType Type of virus detected
     */
    avDetectionTotal(name: string, virusType?: string): Promise<void>;
    /**
     * Total number of AV scan failed - Counter
     * @param name Scanner name
     * @param failureReason Reason for failure
     */
    avScanFailureTotal(name: string, failureReason?: string): Promise<void>;
    /**
     * Total number of SHA256 mismatch - Counter
     * @param operation Operation where mismatch occurred
     */
    sha256MismatchTotal(operation?: string): Promise<void>;
    /**
     * Total number of requests that rejected by rate limit - Counter
     * @param endpoint API endpoint
     * @param limitType Type of limit applied
     */
    rateLimitRequestsTotal(endpoint?: string, limitType?: string): Promise<void>;
    // ------------------ RELIABILITY & AVAILABILITY ---------------
    /**
     * Health check latency in milliseconds - Histogram
     * @param latency Latency in milliseconds
     * @param endpoint Health check endpoint
     */
    healthCheckLatencyMillis(latency: number, endpoint?: string): Promise<void>;
    /**
     * Uptime in seconds - Gauge
     * @param seconds Uptime in seconds
     */
    uptimeSecondsTotal(seconds?: number): Promise<void>;
    /**
     * Total number of API errors (4xx, 5xx) - Counter
     * @param method HTTP method
     * @param route Route path
     * @param statusCode HTTP status code
     */
    apiErrorsTotal(method?: string, route?: string, statusCode?: string): Promise<void>;
    /**
     * Total number of upload to storage that failed - Counter
     * @param errorType Type of error
     * @param stage Stage where error occurred
     */
    uploadErrorsTotal(errorType?: string, stage?: string): Promise<void>;
    // ---------------- USAGE & BUSINESS METRICS --------------
    /**
     * Total number of successfully uploaded files - Counter
     * @param fileType Type of file uploaded
     */
    uploadTotal(fileType?: string): Promise<void>;
    /**
     * Total number of uploads by MIME type - Counter
     * @param mime MIME type
     */
    uploadsByMime(mime: string): Promise<void>;
    /**
     * Total number of uploads by size bucket - Counter
     *
     * Example:
     * - 0-100KB
     * - 100KB-1MB
     * - 1MB-10MB
     * - 10MB-100MB
     * - 100MB-1GB
     * - 1GB-10GB
     * - 10GB-100GB
     * @param bucket Size bucket name
     */
    uploadsBySizeBucket(bucket: string): Promise<void>;

    /**
     * Serve Metric content
     */
    serveRoute(): Promise<string>;
}
