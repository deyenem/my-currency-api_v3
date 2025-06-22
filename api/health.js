// File: api/health.js
// Health check endpoint

// Shared storage logic
let cachedData = null;
let lastFetchTime = null;
const REFRESH_INTERVAL = 60 * 1000;
const API_KEY = '6b2256511d4d75a4aea7bfaf';

async function fetchLatestRates() {
  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.result !== 'success') throw new Error(data['error-type'] || 'API Error');
    
    cachedData = {
      ...data,
      cached_at: new Date().toISOString(),
      total_currencies: Object.keys(data.conversion_rates).length
    };
    lastFetchTime = Date.now();
    return cachedData;
  } catch (error) {
    console.error('Error fetching rates:', error);
    throw error;
  }
}

async function getStoredRates(forceRefresh = false) {
  if (forceRefresh || !cachedData || !lastFetchTime || (Date.now() - lastFetchTime) >= REFRESH_INTERVAL) {
    try {
      await fetchLatestRates();
    } catch (error) {
      if (cachedData) {
        return { ...cachedData, status: 'stale_cache', error: error.message };
      }
      throw error;
    }
  }
  return { ...cachedData, status: 'fresh' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const startTime = Date.now();
    
    let healthStatus = 'healthy';
    let dataAvailable = true;
    let errorMessage = null;
    let data = null;

    try {
      data = await getStoredRates();
    } catch (error) {
      healthStatus = 'unhealthy';
      dataAvailable = false;
      errorMessage = error.message;
    }

    const responseTime = Date.now() - startTime;
    
    const health = {
      status: healthStatus,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      data_available: dataAvailable,
      version: '2.0.0',
      api_name: 'Currency Exchange API',
      uptime_seconds: Math.floor(process.uptime()),
      memory: {
        used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external_mb: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      node_version: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || 'production'
    };

    // Add data-specific health info if available
    if (data) {
      health.data_health = {
        total_currencies: data.total_currencies,
        last_updated: data.time_last_update_utc,
        next_update: data.time_next_update_utc,
        cache_age_ms: data.cached_at ? Date.now() - new Date(data.cached_at).getTime() : null,
        cache_status: data.status,
        base_currency: data.base_code
      };
    }

    // Add error info if unhealthy
    if (errorMessage) {
      health.error = errorMessage;
      health.troubleshooting = [
        'Check if ExchangeRate-API is accessible',
        'Verify API key is valid',
        'Check network connectivity',
        'Try refreshing data manually via /api/admin?action=refresh'
      ];
    }

    // Performance indicators
    health.performance = {
      response_time_category: responseTime < 100 ? 'excellent' : 
                            responseTime < 500 ? 'good' : 
                            responseTime < 1000 ? 'fair' : 'poor',
      memory_usage_category: health.memory.used_mb < 50 ? 'low' :
                            health.memory.used_mb < 100 ? 'normal' :
                            health.memory.used_mb < 200 ? 'high' : 'critical'
    };

    // Set appropriate HTTP status
    const httpStatus = healthStatus === 'healthy' ? 200 : 503;
    
    res.status(httpStatus).json(health);

  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure',
      message: error.message,
      data_available: false,
      uptime_seconds: Math.floor(process.uptime()),
      version: '2.0.0'
    });
  }
}
