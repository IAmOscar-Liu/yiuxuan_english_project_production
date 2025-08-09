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

export function formatDateToLocal(date: Date) {
  const pad = (n: any) => String(n).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatFirebaseDateTime(date: any) {
  if (date.seconds == null) return "N/A";
  try {
    const localString = new Date(date.seconds * 1000).toLocaleString();
    return convertLocalStringToISOFormat(localString);
  } catch (_) {
    return "N/A";
  }
}

export function convertLocalStringToISOFormat(localString: string) {
  // Split date and time
  const [datePart, timePart] = localString.split(", ");

  // Split day/month/year
  const [day, month, year] = datePart.split("/");

  // Return in YYYY-MM-DD HH:mm:ss
  return `${year}-${month.padStart(2, "0")}-${day.padStart(
    2,
    "0"
  )} ${timePart}`;
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
