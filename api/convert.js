// File: api/convert.js
// Fast currency conversion using stored data

// Import storage functions (Note: In Vercel, you'll need to copy the functions or use a shared module approach)
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
  
  // Convert via USD base: amount -> USD -> target currency
  const amountInUSD = amount / rates.conversion_rates[from];
  const convertedAmount = amountInUSD * rates.conversion_rates[to];
  
  return {
    converted: convertedAmount,
    rate: rates.conversion_rates[to] / rates.conversion_rates[from]
  };
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
    const { 
      from = 'USD', 
      to = 'EUR', 
      amount = 1,
      format = 'json'
    } = req.query;
    
    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number'
      });
    }

    // Get stored rates (automatically refreshes if needed)
    const ratesData = await getStoredRates();
    
    // Perform conversion
    const { converted, rate } = calculateConversion(from, to, numAmount, ratesData);
    
    const responseData = {
      success: true,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      amount: numAmount,
      rate: parseFloat(rate.toFixed(6)),
      converted: parseFloat(converted.toFixed(2)),
      timestamp: new Date().toISOString(),
      data_source: 'local_storage',
      base_currency: ratesData.base_code,
      last_updated: ratesData.time_last_update_utc,
      next_update: ratesData.time_next_update_utc,
      cache_status: ratesData.status
    };

    // Handle XML format
    if (format === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<conversion>
  <success>${responseData.success}</success>
  <from>${responseData.from}</from>
  <to>${responseData.to}</to>
  <amount>${responseData.amount}</amount>
  <rate>${responseData.rate}</rate>
  <converted>${responseData.converted}</converted>
  <data_source>${responseData.data_source}</data_source>
  <last_updated>${responseData.last_updated}</last_updated>
</conversion>`;
      return res.status(200).send(xml);
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Conversion Error:', error);
    
    if (error.message.includes('not supported')) {
      res.status(400).json({
        success: false,
        error: 'Invalid currency code',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Conversion failed',
        message: error.message
      });
    }
  }
}
