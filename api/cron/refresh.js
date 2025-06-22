// File: api/cron/refresh.js
// Vercel cron job to automatically refresh data every minute

const API_KEY = '6b2256511d4d75a4aea7bfaf';

// This will be shared across all serverless functions
let globalCachedData = null;
let globalLastFetchTime = null;

async function fetchLatestRates() {
  try {
    console.log('[CRON] Fetching latest rates from ExchangeRate-API...');
    
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
    
    // Store the data globally
    globalCachedData = {
      ...data,
      cached_at: new Date().toISOString(),
      total_currencies: Object.keys(data.conversion_rates).length,
      fetched_by: 'cron_job'
    };
    
    globalLastFetchTime = Date.now();
    
    console.log(`[CRON] Successfully cached ${globalCachedData.total_currencies} currencies`);
    return globalCachedData;
    
  } catch (error) {
    console.error('[CRON] Error fetching exchange rates:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Security: Verify this is being called by Vercel cron
  // You can set CRON_SECRET in environment variables for additional security
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('[CRON] Unauthorized cron request');
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      });
    }
  }

  try {
    console.log('[CRON] Cron job triggered: Refreshing exchange rates');
    const startTime = Date.now();
    
    // Force refresh the data
    const refreshedData = await fetchLatestRates();
    const processingTime = Date.now() - startTime;
    
    console.log(`[CRON] Successfully refreshed ${refreshedData.total_currencies} currencies in ${processingTime}ms`);
    
    // Successful response
    res.status(200).json({
      success: true,
      message: 'Exchange rates refreshed by cron job',
      timestamp: new Date().toISOString(),
      processing_time_ms: processingTime,
      total_currencies: refreshedData.total_currencies,
      last_updated: refreshedData.time_last_update_utc,
      next_update: refreshedData.time_next_update_utc,
      cron_execution: 'completed',
      data_freshness: 'latest'
    });

  } catch (error) {
    console.error('[CRON] Cron job failed:', error);
    
    // Error response
    res.status(500).json({
      success: false,
      error: 'Cron job failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      cron_execution: 'failed',
      retry_suggestion: 'Will retry on next scheduled execution'
    });
  }
}

// Export the shared data for other functions to use
export { globalCachedData, globalLastFetchTime };
