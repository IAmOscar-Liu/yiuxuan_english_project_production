/**
 * Safely builds a URL by appending query parameters.
 * Handles URL encoding and correctly appends parameters whether the base URL
 * already contains a query string or not.
 *
 * @param {string} baseUrl The base URL to which parameters will be appended.
 * @param {Object.<string, string|number|boolean|Array<string|number|boolean>>} params
 * An object where keys are parameter names and values are parameter values.
 * Values can be strings, numbers, booleans, or arrays of these types.
 * @returns {string} The constructed URL with query parameters.
 */
export function buildUrlWithQuery(
  baseUrl: string,
  params: Record<string, any>
) {
  // Create a new URLSearchParams object
  const urlSearchParams = new URLSearchParams();

  // Iterate over the parameters object and append each key-value pair
  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const value = params[key];

      // Handle array values by appending each item with the same key
      if (Array.isArray(value)) {
        value.forEach((item) => {
          urlSearchParams.append(key, item);
        });
      } else if (value !== null && value !== undefined) {
        // Append non-null/non-undefined single values
        urlSearchParams.append(key, value);
      }
    }
  }

  // Convert the URLSearchParams object to a query string
  const queryString = urlSearchParams.toString();

  // If there are no query parameters, return the base URL as is
  if (!queryString) {
    return baseUrl;
  }

  // Determine if the base URL already has a query string
  const separator = baseUrl.includes("?") ? "&" : "?";

  // Combine the base URL, separator, and the new query string
  console.log(`${baseUrl}${separator}${queryString}`);
  return `${baseUrl}${separator}${queryString}`;
}
