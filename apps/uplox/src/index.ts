import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

// Health check endpoint
app.get('/health', c => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', c => {
    return c.json({
        message: 'Uplox API is running',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    });
});

// API routes
app.get('/api/status', c => {
    return c.json({
        redis: process.env.REDIS_URL || 'not configured',
        database: process.env.DATABASE_URL ? 'configured' : 'not configured',
        scanner: process.env.SCANNER_HOST ? 'configured' : 'not configured',
        storage: process.env.MINIO_ENDPOINT ? 'configured' : 'not configured',
    });
});

const port = 3000;

console.log(`Server is running on port ${port}`);

serve({
    fetch: app.fetch,
    port,
});
