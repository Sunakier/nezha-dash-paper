/**
 * Utility functions for API requests
 */

/**
 * Get the base URL for HTTP API requests
 * If direct API access is enabled, returns the configured HTTP API base URL
 * Otherwise, returns an empty string (which will use the proxy)
 */
export const getHttpApiBaseUrl = (): string => {
  const directApiAccess = import.meta.env.VITE_DIRECT_API_ACCESS === "true";
  return directApiAccess ? import.meta.env.VITE_API_HTTP_BASE : '';
};

/**
 * Get the base URL for WebSocket connections
 * If direct API access is enabled, returns the configured WebSocket API base URL
 * Otherwise, returns an empty string (which will use the proxy)
 */
export const getWsApiBaseUrl = (): string => {
  const directApiAccess = import.meta.env.VITE_DIRECT_API_ACCESS === "true";
  return directApiAccess ? import.meta.env.VITE_API_WS_BASE : '';
};

/**
 * Get the full URL for an API endpoint
 * @param endpoint The API endpoint (e.g., "/api/v1/server-group")
 * @returns The full URL for the API endpoint
 */
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getHttpApiBaseUrl();
  // If baseUrl is empty, return the endpoint as is (which will use the proxy)
  if (!baseUrl) return endpoint;

  // If the endpoint starts with a slash and the baseUrl ends with a slash,
  // remove the slash from the endpoint to avoid double slashes
  if (endpoint.startsWith('/') && baseUrl.endsWith('/')) {
    return baseUrl + endpoint.substring(1);
  }

  // If the endpoint starts with a slash or the baseUrl ends with a slash,
  // concatenate them directly
  if (endpoint.startsWith('/') || baseUrl.endsWith('/')) {
    return baseUrl + endpoint;
  }

  // Otherwise, add a slash between them
  return baseUrl + '/' + endpoint;
};
