import axios from 'axios';

// Headers that should not be forwarded (hop-by-hop headers)
const HOP_BY_HOP_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host' // We'll set the host to the target service
];

/**
 * Filter out hop-by-hop headers
 */
function filterHeaders(headers) {
  const filtered = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.includes(lowerKey)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * Build the target URL
 */
function buildTargetUrl(targetUrl, remainingPath, queryString) {
  const url = new URL(targetUrl);
  url.pathname = url.pathname.replace(/\/$/, '') + remainingPath;
  if (queryString) {
    url.search = queryString;
  }
  return url.toString();
}

/**
 * Forward HTTP request to target service
 */
export async function forwardRequest(route, remainingPath, req, res) {
  try {
    // Check if method is allowed
    if (route.methods && route.methods.length > 0 && !route.methods.includes(req.method)) {
      return res.status(405).json({ message: "Method not allowed" });
    }

    // Build target URL (preserve query string from original request)
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const targetUrl = buildTargetUrl(route.targetUrl, remainingPath, queryString);

    // Prepare headers
    const headers = filterHeaders(req.headers);
    
    // Prepare request config
    const config = {
      method: req.method,
      url: targetUrl,
      headers: headers,
      validateStatus: () => true, // Don't throw on any status code
      timeout: 30000, // 30 second timeout
      maxRedirects: 5
    };

    // Include body for methods that support it
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      config.data = req.body;
      config.headers['content-type'] = req.headers['content-type'] || 'application/json';
    }

    // Make the request
    const response = await axios(config);

    // Forward response status and headers
    res.status(response.status);
    
    // Forward response headers (except hop-by-hop)
    const responseHeaders = filterHeaders(response.headers);
    for (const [key, value] of Object.entries(responseHeaders)) {
      res.setHeader(key, value);
    }

    // Forward response body
    res.send(response.data);

  } catch (error) {
    console.error('Proxy error:', error.message);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(502).json({ message: "Bad Gateway - Target service unavailable" });
    }
    
    if (error.response) {
      // Forward error response from target
      res.status(error.response.status);
      res.send(error.response.data);
    } else {
      res.status(502).json({ message: "Bad Gateway" });
    }
  }
}