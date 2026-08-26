import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { queryClient } from "./queryClient";

/**
 * Format a date using the user's timezone from settings.
 * If no timezone is set, defaults to local browser time.
 */
export function formatWithTimezone(date: Date | string | number, formatStr: string = "MMM d, yyyy h:mm a"): string {
  try {
    const settings = queryClient.getQueryData<any>(["/api/settings"]);
    
    // In our api, data is directly returned or wrapped in data property
    const timezone = settings?.data?.timezone || settings?.timezone;
    
    // Convert to Date object
    let dateObj = new Date(date);
    
    // Fix timezone issues if date is YYYY-MM-DD string without time (like dashboard dates)
    if (typeof date === 'string' && date.length === 10) {
      dateObj = new Date(date + "T12:00:00");
    }

    if (isNaN(dateObj.getTime())) {
      return "Invalid date";
    }

    if (timezone) {
      return formatInTimeZone(dateObj, timezone, formatStr);
    }
    
    // Fallback to local time
    return format(dateObj, formatStr);
  } catch (e) {
    console.error("Error formatting date with timezone:", e);
    return format(new Date(date), formatStr);
  }
}
