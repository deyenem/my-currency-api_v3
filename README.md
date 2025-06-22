// File: README.md
// Documentation for your API

# My Currency Exchange API

A simple and free currency exchange API built with Vercel.

## Endpoints

### 1. Convert Currency
`GET /api/exchange?from=USD&to=EUR&amount=100`

**Parameters:**
- `from` - Source currency code (default: USD)
- `to` - Target currency code (default: EUR)  
- `amount` - Amount to convert (default: 1)

**Example Response:**
```json
{
  "success": true,
  "from": "USD",
  "to": "EUR",
  "rate": 0.85,
  "amount": 100,
  "converted": 85.00,
  "timestamp": "2025-06-21T10:30:00.000Z",
  "last_updated": "Fri, 21 Jun 2025 00:00:01 +0000"
}
```

### 2. List All Currencies
`GET /api/currencies`

**Example Response:**
```json
{
  "success": true,
  "currencies": [
    {"code": "USD", "name": "United States Dollar"},
    {"code": "EUR", "name": "Euro"}
  ],
  "total": 161
}
```

## Setup Instructions

1. Get your free API key from exchangerate-api.com
2. Deploy to Vercel (free)
3. Add your API key as an environment variable
4. Start using your API!

## Example Usage

```javascript
// Convert 100 USD to EUR
fetch('https://your-api.vercel.app/api/exchange?from=USD&to=EUR&amount=100')
  .then(response => response.json())
  .then(data => console.log(data));
```

Your API will be available at: `https://your-project-name.vercel.app`