// File: api/storage.js
// Main data storage and fetching system

// In-memory storage (persists during function execution)
let cachedData = null;
let lastFetchTime = null;
const REFRESH_INTERVAL = 60 * 1000; // 1 minute in milliseconds

// Your actual API key
const API_KEY = '6b2256511d4d75a4aea7bfaf';

async function fetchLatestRates() {
  try {
    console.log('Fetching latest rates from ExchangeRate-API...');
    
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.result !== 'success') {
      throw new Error(`API Error: ${data['error-type'] || 'Unknown error'}`);
    }
    
    // Store the data with additional metadata
    cachedData = {
      ...data,
      cached_at: new Date().toISOString(),
      total_currencies: Object.keys(data.conversion_rates).length,
      refresh_interval_ms: REFRESH_INTERVAL
    };
    
    lastFetchTime = Date.now();
    
    console.log(`Successfully cached ${cachedData.total_currencies} currencies`);
    return cachedData;
    
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    throw error;
  }
}

function shouldRefreshData() {
  if (!cachedData || !lastFetchTime) {
    return true; // No data cached
  }
  
  const timeSinceLastFetch = Date.now() - lastFetchTime;
  return timeSinceLastFetch >= REFRESH_INTERVAL;
}

async function getStoredRates(forceRefresh = false) {
  // Check if we need to refresh
  if (forceRefresh || shouldRefreshData()) {
    try {
      await fetchLatestRates();
    } catch (error) {
      // If fetch fails and we have cached data, use it
      if (cachedData) {
        console.log('Using cached data due to fetch failure');
        return {
          ...cachedData,
          status: 'stale_cache',
          error: error.message
        };
      }
      throw error;
    }
  }
  
  return {
    ...cachedData,
    status: 'fresh'
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { refresh = 'false', action = 'get' } = req.query;
    const forceRefresh = refresh === 'true';
    
    switch (action) {
      case 'get':
        const ratesData = await getStoredRates(forceRefresh);
        res.status(200).json({
          success: true,
          ...ratesData,
          cache_age_ms: lastFetchTime ? Date.now() - lastFetchTime : null,
          next_refresh_in_ms: lastFetchTime ? 
            Math.max(0, REFRESH_INTERVAL - (Date.now() - lastFetchTime)) : 0
        });
        break;
        
      case 'status':
        res.status(200).json({
          success: true,
          has_data: !!cachedData,
          last_fetch: lastFetchTime ? new Date(lastFetchTime).toISOString() : null,
          cache_age_ms: lastFetchTime ? Date.now() - lastFetchTime : null,
          should_refresh: shouldRefreshData(),
          total_currencies: cachedData?.total_currencies || 0,
          refresh_interval_ms: REFRESH_INTERVAL
        });
        break;
        
      case 'refresh':
        await fetchLatestRates();
        res.status(200).json({
          success: true,
          message: 'Data refreshed successfully',
          total_currencies: cachedData.total_currencies,
          last_updated: cachedData.time_last_update_utc,
          cached_at: cachedData.cached_at
        });
        break;
        
      default:
        res.status(400).json({
          success: false,
          error: 'Invalid action',
          available_actions: ['get', 'status', 'refresh']
        });
    }

  } catch (error) {
    console.error('Storage API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Storage operation failed',
      message: error.message
    });
  }
}

// Export for use in other files
export { getStoredRates, shouldRefreshData };
