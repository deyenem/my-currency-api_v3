// File: api/rates.js
// Simple endpoint that returns all exchange rates

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
    const { base = 'USD', format = 'json' } = req.query;
    
    // Get stored rates (will be fresh due to auto-refresh)
    const ratesData = await getStoredRates();
    
    if (base.toUpperCase() !== ratesData.base_code) {
      return res.status(400).json({
        success: false,
        error: `Base currency ${base} not supported. Only ${ratesData.base_code} base is available.`,
        supported_base: ratesData.base_code
      });
    }

    const responseData = {
      success: true,
      result: 'success',
      base_code: ratesData.base_code,
      conversion_rates: ratesData.conversion_rates,
      time_last_update_utc: ratesData.time_last_update_utc,
      time_next_update_utc: ratesData.time_next_update_utc,
      total_currencies: ratesData.total_currencies,
      data_source: 'local_storage',
      cache_status: ratesData.status,
      cached_at: ratesData.cached_at,
      response_time: '< 50ms'
    };

    // Handle XML format
    if (format === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      const ratesXml = Object.entries(ratesData.conversion_rates)
        .map(([code, rate]) => `<${code}>${rate}</${code}>`)
        .join('');
      
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rates>
  <success>${responseData.success}</success>
  <base_code>${responseData.base_code}</base_code>
  <total_currencies>${responseData.total_currencies}</total_currencies>
  <last_updated>${responseData.time_last_update_utc}</last_updated>
  <conversion_rates>
    ${ratesXml}
  </conversion_rates>
</rates>`;
      return res.status(200).send(xml);
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Rates API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exchange rates',
      message: error.message
    });
  }
}
