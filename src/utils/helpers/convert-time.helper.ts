export const convertToSeconds = (timeStr: string): number => {
  const unitMap: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    mo: 86400 * 30,
  };

  const match = timeStr.match(/^(\d+)([smhd]{1,2})$/);
  if (!match)
    throw new Error(
      "Invalid time format. Use format like '1s', '5m', '2h', '1d'.",
    );

  const value = parseInt(match[1], 10);
  const unit = match[2];

  return value * unitMap[unit];
};
