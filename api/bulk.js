// File: api/bulk.js
// Bulk currency conversions using stored data

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

function calculateConversion(fromCurrency, toCurrency, amount, rates) {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  
  if (!rates.conversion_rates[from]) {
    throw new Error(`Currency ${from} not supported`);
  }
  
  if (!rates.conversion_rates[to]) {
    throw new Error(`Currency ${to} not supported`);
  }
  
  const amountInUSD = amount / rates.conversion_rates[from];
  const convertedAmount = amountInUSD * rates.conversion_rates[to];
  
  return {
    converted: convertedAmount,
    rate: rates.conversion_rates[to] / rates.conversion_rates[from]
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
    let conversions = [];
    
    if (req.method === 'POST') {
      conversions = req.body?.conversions || [];
    } else {
      // Handle GET request with query parameters
      const { from, to, amounts } = req.query;
      if (from && to && amounts) {
        const amountArray = amounts.split(',').map(a => parseFloat(a.trim()));
        conversions = amountArray.map(amount => ({ from, to, amount }));
      }
    }

    if (!conversions.length) {
      return res.status(400).json({
        success: false,
        error: 'No conversions provided',
        example: {
          method: 'POST',
          body: {
            conversions: [
              { from: 'USD', to: 'EUR', amount: 100 },
              { from: 'GBP', to: 'JPY', amount: 50 }
            ]
          },
          alternative: 'GET /api/bulk?from=USD&to=EUR&amounts=100,200,300'
        }
      });
    }

    // Limit bulk requests
    if (conversions.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 200 conversions per request'
      });
    }

    // Get stored rates once for all conversions
    const ratesData = await getStoredRates();
    const results = [];
    const startTime = Date.now();

    // Process all conversions using stored data
    for (const conversion of conversions) {
      const { from, to, amount } = conversion;
      
      try {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          throw new Error('Invalid amount');
        }

        const { converted, rate } = calculateConversion(from, to, numAmount, ratesData);

        results.push({
          from: from.toUpperCase(),
          to: to.toUpperCase(),
          amount: numAmount,
          rate: parseFloat(rate.toFixed(6)),
          converted: parseFloat(converted.toFixed(2)),
          success: true
        });
      } catch (error) {
        results.push({
          from: from?.toUpperCase(),
          to: to?.toUpperCase(),
          amount: amount,
          error: error.message,
          success: false
        });
      }
    }

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      total_conversions: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      processing_time_ms: processingTime,
      results: results,
      data_source: 'local_storage',
      base_currency: ratesData.base_code,
      last_updated: ratesData.time_last_update_utc,
      cache_status: ratesData.status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk conversions',
      message: error.message
    });
  }
}
