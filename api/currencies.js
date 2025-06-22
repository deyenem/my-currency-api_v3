// File: api/currencies.js
// List all available currencies from stored data

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

// Enhanced currency names mapping
const CURRENCY_NAMES = {
  'USD': 'United States Dollar',
  'EUR': 'Euro',
  'GBP': 'British Pound Sterling',
  'JPY': 'Japanese Yen',
  'AUD': 'Australian Dollar',
  'CAD': 'Canadian Dollar',
  'CHF': 'Swiss Franc',
  'CNY': 'Chinese Yuan Renminbi',
  'SEK': 'Swedish Krona',
  'NOK': 'Norwegian Krone',
  'MXN': 'Mexican Peso',
  'SGD': 'Singapore Dollar',
  'HKD': 'Hong Kong Dollar',
  'NZD': 'New Zealand Dollar',
  'TRY': 'Turkish Lira',
  'RUB': 'Russian Ruble',
  'INR': 'Indian Rupee',
  'BRL': 'Brazilian Real',
  'ZAR': 'South African Rand',
  'PLN': 'Polish Zloty',
  'ILS': 'Israeli New Shekel',
  'KRW': 'South Korean Won',
  'THB': 'Thai Baht',
  'IDR': 'Indonesian Rupiah',
  'MYR': 'Malaysian Ringgit',
  'PHP': 'Philippine Peso',
  'CZK': 'Czech Republic Koruna',
  'HUF': 'Hungarian Forint',
  'RON': 'Romanian Leu',
  'BGN': 'Bulgarian Lev',
  'HRK': 'Croatian Kuna',
  'DKK': 'Danish Krone',
  'ISK': 'Icelandic Krona',
  'AED': 'United Arab Emirates Dirham',
  'AFN': 'Afghan Afghani',
  'ALL': 'Albanian Lek',
  'AMD': 'Armenian Dram',
  'ANG': 'Netherlands Antillean Guilder',
  'AOA': 'Angolan Kwanza',
  'ARS': 'Argentine Peso',
  'AWG': 'Aruban Florin',
  'AZN': 'Azerbaijani Manat',
  'BAM': 'Bosnia-Herzegovina Convertible Mark',
  'BBD': 'Barbadian Dollar',
  'BDT': 'Bangladeshi Taka',
  'BHD': 'Bahraini Dinar',
  'BIF': 'Burundian Franc',
  'BMD': 'Bermudan Dollar',
  'BND': 'Brunei Dollar',
  'BOB': 'Bolivian Boliviano',
  'BSD': 'Bahamian Dollar',
  'BTN': 'Bhutanese Ngultrum',
  'BWP': 'Botswanan Pula',
  'BYN': 'Belarusian Ruble',
  'BZD': 'Belize Dollar',
  'CDF': 'Congolese Franc',
  'CLP': 'Chilean Peso',
  'COP': 'Colombian Peso',
  'CRC': 'Costa Rican Colón',
  'CUP': 'Cuban Peso',
  'CVE': 'Cape Verdean Escudo',
  'DJF': 'Djiboutian Franc',
  'DOP': 'Dominican Peso',
  'DZD': 'Algerian Dinar',
  'EGP': 'Egyptian Pound',
  'ERN': 'Eritrean Nakfa',
  'ETB': 'Ethiopian Birr',
  'FJD': 'Fijian Dollar',
  'FKP': 'Falkland Islands Pound',
  'FOK': 'Faroese Króna',
  'GEL': 'Georgian Lari',
  'GGP': 'Guernsey Pound',
  'GHS': 'Ghanaian Cedi',
  'GIP': 'Gibraltar Pound',
  'GMD': 'Gambian Dalasi',
  'GNF': 'Guinean Franc',
  'GTQ': 'Guatemalan Quetzal',
  'GYD': 'Guyanaese Dollar',
  'HNL': 'Honduran Lempira',
  'HTG': 'Haitian Gourde',
  'IMP': 'Isle of Man Pound',
  'IQD': 'Iraqi Dinar',
  'IRR': 'Iranian Rial',
  'JEP': 'Jersey Pound',
  'JMD': 'Jamaican Dollar',
  'JOD': 'Jordanian Dinar',
  'KES': 'Kenyan Shilling',
  'KGS': 'Kyrgystani Som',
  'KHR': 'Cambodian Riel',
  'KID': 'Kiribati Dollar',
  'KMF': 'Comorian Franc',
  'KWD': 'Kuwaiti Dinar',
  'KYD': 'Cayman Islands Dollar',
  'KZT': 'Kazakhstani Tenge',
  'LAK': 'Laotian Kip',
  'LBP': 'Lebanese Pound',
  'LKR': 'Sri Lankan Rupee',
  'LRD': 'Liberian Dollar',
  'LSL': 'Lesotho Loti',
  'LYD': 'Libyan Dinar',
  'MAD': 'Moroccan Dirham',
  'MDL': 'Moldovan Leu',
  'MGA': 'Malagasy Ariary',
  'MKD': 'Macedonian Denar',
  'MMK': 'Myanmar Kyat',
  'MNT': 'Mongolian Tugrik',
  'MOP': 'Macanese Pataca',
  'MRU': 'Mauritanian Ouguiya',
  'MUR': 'Mauritian Rupee',
  'MVR': 'Maldivian Rufiyaa',
  'MWK': 'Malawian Kwacha',
  'MZN': 'Mozambican Metical',
  'NAD': 'Namibian Dollar',
  'NGN': 'Nigerian Naira',
  'NIO': 'Nicaraguan Córdoba',
  'NPR': 'Nepalese Rupee',
  'OMR': 'Omani Rial',
  'PAB': 'Panamanian Balboa',
  'PEN': 'Peruvian Nuevo Sol',
  'PGK': 'Papua New Guinean Kina',
  'PKR': 'Pakistani Rupee',
  'PYG': 'Paraguayan Guarani',
  'QAR': 'Qatari Rial',
  'RSD': 'Serbian Dinar',
  'RWF': 'Rwandan Franc',
  'SAR': 'Saudi Riyal',
  'SBD': 'Solomon Islands Dollar',
  'SCR': 'Seychellois Rupee',
  'SDG': 'Sudanese Pound',
  'SHP': 'Saint Helena Pound',
  'SLE': 'Sierra Leonean Leone',
  'SLL': 'Sierra Leonean Leone (Old)',
  'SOS': 'Somali Shilling',
  'SRD': 'Surinamese Dollar',
  'SSP': 'South Sudanese Pound',
  'STN': 'São Tomé and Príncipe Dobra',
  'SYP': 'Syrian Pound',
  'SZL': 'Swazi Lilangeni',
  'TJS': 'Tajikistani Somoni',
  'TMT': 'Turkmenistani Manat',
  'TND': 'Tunisian Dinar',
  'TOP': 'Tongan Paʻanga',
  'TTD': 'Trinidad and Tobago Dollar',
  'TVD': 'Tuvaluan Dollar',
  'TWD': 'Taiwan New Dollar',
  'TZS': 'Tanzanian Shilling',
  'UAH': 'Ukrainian Hryvnia',
  'UGX': 'Ugandan Shilling',
  'UYU': 'Uruguayan Peso',
  'UZS': 'Uzbekistan Som',
  'VES': 'Venezuelan Bolívar',
  'VND': 'Vietnamese Dong',
  'VUV': 'Vanuatu Vatu',
  'WST': 'Samoan Tala',
  'XAF': 'CFA Franc BEAC',
  'XCD': 'East Caribbean Dollar',
  'XCG': 'Caribbean Guilder',
  'XDR': 'Special Drawing Rights',
  'XOF': 'CFA Franc BCEAO',
  'XPF': 'CFP Franc',
  'YER': 'Yemeni Rial',
  'ZMW': 'Zambian Kwacha',
  'ZWL': 'Zimbabwean Dollar'
};

function getCurrencyName(code) {
  return CURRENCY_NAMES[code] || `${code} Currency`;
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
      search = '', 
      format = 'json', 
      include_rates = 'false',
      sort = 'code'
    } = req.query;
    
    // Get stored rates
    const ratesData = await getStoredRates();
    
    // Build currency list from stored rates
    let currencies = Object.keys(ratesData.conversion_rates).map(code => {
      const currencyObj = {
        code,
        name: getCurrencyName(code)
      };
      
      if (include_rates === 'true') {
        currencyObj.rate_from_usd = ratesData.conversion_rates[code];
        currencyObj.rate_to_usd = 1 / ratesData.conversion_rates[code];
      }
      
      return currencyObj;
    });

    // Apply search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      currencies = currencies.filter(currency => 
        currency.code.toLowerCase().includes(searchTerm) ||
        currency.name.toLowerCase().includes(searchTerm)
      );
    }

    // Sort currencies
    if (sort === 'name') {
      currencies.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      currencies.sort((a, b) => a.code.localeCompare(b.code));
    }

    const responseData = {
      success: true,
      currencies,
      total: currencies.length,
      search: search || null,
      includes_rates: include_rates === 'true',
      base_currency: ratesData.base_code,
      last_updated: ratesData.time_last_update_utc,
      next_update: ratesData.time_next_update_utc,
      data_source: 'local_storage',
      cache_status: ratesData.status,
      timestamp: new Date().toISOString()
    };

    // Handle XML format
    if (format === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<currencies>
  <success>${responseData.success}</success>
  <total>${responseData.total}</total>
  <base_currency>${responseData.base_currency}</base_currency>
  <last_updated>${responseData.last_updated}</last_updated>
  <currencies>
    ${currencies.map(c => `
    <currency>
      <code>${c.code}</code>
      <n><![CDATA[${c.name}]]></n>
      ${c.rate_from_usd ? `<rate_from_usd>${c.rate_from_usd}</rate_from_usd>` : ''}
      ${c.rate_to_usd ? `<rate_to_usd>${c.rate_to_usd}</rate_to_usd>` : ''}
    </currency>`).join('')}
  </currencies>
</currencies>`;
      return res.status(200).send(xml);
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Currencies API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch currencies list',
      message: error.message
    });
  }
}
