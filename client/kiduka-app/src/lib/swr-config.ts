import { apiClient } from './api-client';

/**
 * Generic fetcher for SWR that uses our existing ApiClient singleton.
 * The 'key' passed to useSWR should be an array where the first element 
 * is the method name on apiClient, and subsequent elements are arguments.
 * 
 * Example: useSWR(['getAdminDashboard', token], swrFetcher)
 */
export const swrFetcher = async (key: any[]) => {
  const [methodName, ...args] = key;
  
  // Ensure the method exists on the apiClient
  const method = (apiClient as any)[methodName];
  if (typeof method !== 'function') {
    throw new Error(`API method "${methodName}" not found on apiClient`);
  }

  // Bind and call the method with provided arguments
  return method.apply(apiClient, args);
};

/**
 * Global SWR configuration options
 */
export const swrConfig = {
  fetcher: swrFetcher,
  revalidateOnFocus: false, // Prevents sudden jumps when returning to tab
  dedupingInterval: 5000,   // Prevent redundant calls within 5s
};
