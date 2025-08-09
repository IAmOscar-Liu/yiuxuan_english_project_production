/**
 * Converts a JavaScript Date object to a readable string in the format "YYYY-MM-DD HH:mm:ss".
 * If the input is not a valid Date, returns "Invalid Date".
 * @param date - The JavaScript Date object to format.
 * @returns A formatted date string.
 */
export function formatDateToString(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "Invalid Date";
  }
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formats a Date object into a YYYY/MM/DD string.
 * This function ensures that the month and day are always two digits,
 * with a leading zero if necessary.
 *
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted date string in 'YYYY/MM/DD' format.
 */
export function formatDateToYYYYMMDD(date: Date) {
  // Get the date components and ensure they are two digits.
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  // Get the time components and ensure they are two digits.
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  // Return the formatted string combining date and time.
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formats a Date object into a localized date and time string.
 * This function uses the user's browser locale to provide a consistent,
 * human-readable format, including the correct timezone offset.
 *
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted date and time string.
 */
export function formatDateWithLocale(date: Date) {
  // The toLocaleString() method formats the date according to the
  // user's locale and timezone.
  // We use "en-US" as a fallback locale but in practice, the browser
  // will use the user's default.
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false, // Use 24-hour format
  });
}

export function formatUserRole(role: any) {
  switch (role) {
    case "student":
      return "學生";
    case "parent":
      return "家長";
    case "teacher":
      return "老師";
    default:
      return "N/A";
  }
}
