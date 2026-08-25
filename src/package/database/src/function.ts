export default class DatabaseFunctions {
  public getTimeZone = async () => {
    const date = new Date();
    const offsetMinutes = date.getTimezoneOffset();
    const sign = offsetMinutes > 0 ? '-' : '+';
    const offsetHours = String(Math.abs(Math.floor(offsetMinutes / 60))).padStart(2, '0');
    const offsetMinutesFormatted = String(Math.abs(offsetMinutes % 60)).padStart(2, '0');
    const offset = `${sign}${offsetHours}:${offsetMinutesFormatted}`;
    return offset;
  };

  public isDevelopment = (): boolean => process.env.NODE_ENV !== 'production';
}
