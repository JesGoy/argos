/**
 * Lightweight demand forecasting — pure functions, no ML, no I/O.
 *
 * Blends a simple moving average (stable baseline) with single-exponential
 * smoothing (responsive to recent trend) over a zero-filled daily demand
 * series. Good enough to drive reorder suggestions for an MVP; swap for a
 * proper model later without touching callers.
 */

export interface DemandForecast {
  /** Blended estimate of units sold per day. */
  avgDailyDemand: number;
  /** Simple mean of the daily series. */
  movingAverage: number;
  /** Exponentially-smoothed level (recent-weighted). */
  exponentialSmoothing: number;
  /** Days projected forward. */
  horizonDays: number;
  /** Projected demand over the horizon (rounded up). */
  forecastQuantity: number;
  /** Number of days in the input series. */
  dataPoints: number;
  /** Total units observed across the series. */
  totalObserved: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * @param dailyQuantities Units sold per day, oldest → newest, zero-filled for
 *   days without sales.
 * @param horizonDays How many days forward to project.
 * @param alpha Smoothing factor (0..1); higher = more weight on recent days.
 */
export function forecastDemand(
  dailyQuantities: number[],
  horizonDays: number,
  alpha = 0.5
): DemandForecast {
  const dataPoints = dailyQuantities.length;
  const totalObserved = dailyQuantities.reduce((sum, q) => sum + q, 0);
  const movingAverage = dataPoints > 0 ? totalObserved / dataPoints : 0;

  // Single exponential smoothing, seeded with the first observation.
  let level = dailyQuantities[0] ?? 0;
  for (let i = 1; i < dataPoints; i++) {
    level = alpha * dailyQuantities[i] + (1 - alpha) * level;
  }
  const exponentialSmoothing = dataPoints > 0 ? level : 0;

  // Weight the stable baseline and the responsive level equally.
  const avgDailyDemand = (movingAverage + exponentialSmoothing) / 2;
  const forecastQuantity = Math.ceil(avgDailyDemand * horizonDays);

  return {
    avgDailyDemand: round2(avgDailyDemand),
    movingAverage: round2(movingAverage),
    exponentialSmoothing: round2(exponentialSmoothing),
    horizonDays,
    forecastQuantity,
    dataPoints,
    totalObserved,
  };
}

/**
 * Build a zero-filled daily series (oldest → newest) covering [startDate,
 * endDate] from sparse {date, quantity} rows.
 */
export function buildDailySeries(
  rows: Array<{ date: string; quantity: number }>,
  startDate: Date,
  endDate: Date
): number[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.quantity);
  }

  const series: number[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = cursor.toISOString().split('T')[0];
    series.push(byDate.get(key) ?? 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
}
