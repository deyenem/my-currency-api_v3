// File: api/admin.js
// Admin endpoint for managing the storage system

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

function shouldRefreshData() {
  if (!cachedData || !lastFetchTime) {
    return true;
  }
  const timeSinceLastFetch = Date.now() - lastFetchTime;
  return timeSinceLastFetch >= REFRESH_INTERVAL;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { action = 'status' } = req.query;

    switch (action) {
      case 'status':
        let statusData;
        try {
          statusData = await getStoredRates();
        } catch (error) {
          return res.status(200).json({
            success: true,
            storage_status: 'error',
            total_currencies: 0,
            has_data: false,
            error: error.message,
            should_refresh: true,
            refresh_interval: '1 minute'
          });
        }
        
        res.status(200).json({
          success: true,
          storage_status: 'active',
          total_currencies: statusData.total_currencies,
          base_currency: statusData.base_code,
          last_updated: statusData.time_last_update_utc,
          next_update: statusData.time_next_update_utc,
          cached_at: statusData.cached_at,
          should_refresh: shouldRefreshData(),
          cache_status: statusData.status,
          refresh_interval: '1 minute',
          data_source: 'ExchangeRate-API',
          has_data: true
        });
        break;

      case 'refresh':
        const freshData = await getStoredRates(true);
        res.status(200).json({
          success: true,
          message: 'Data refreshed successfully',
          total_currencies: freshData.total_currencies,
          last_updated: freshData.time_last_update_utc,
          cached_at: freshData.cached_at,
          action: 'refresh_complete'
        });
        break;

      case 'health':
        try {
          const healthData = await getStoredRates();
          res.status(200).json({
            success: true,
            health: 'healthy',
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            data_available: true,
            last_refresh: healthData.cached_at,
            currencies_count: healthData.total_currencies,
            api_version: '2.0.0'
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            health: 'unhealthy',
            error: error.message,
            data_available: false,
            uptime: process.uptime(),
            memory_usage: process.memoryUsage()
          });
        }
        break;

      case 'clear':
        // Clear cached data
        cachedData = null;
        lastFetchTime = null;
        
        res.status(200).json({
          success: true,
          message: 'Cache cleared successfully',
          action: 'cache_cleared',
          timestamp: new Date().toISOString()
        });
        break;

      default:
        res.status(400).json({
          success: false,
          error: 'Invalid action',
          available_actions: ['status', 'refresh', 'health', 'clear']
        });
    }

  } catch (error) {
    console.error('Admin API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Admin operation failed',
      message: error.message
    });
  }
}
