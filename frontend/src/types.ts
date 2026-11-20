export type ComparisonPoint = {
  startTime: string
  actualGeneration: number
  forecastGeneration: number
  publishTime: string
  error: number
  absoluteError: number
}

export type DashboardData = {
  period: { start: string; end: string }
  metrics: {
    count: number
    mae: number
    rmse: number
    mape: number
    bias: number
    maxAbsoluteError: number
  }
  comparison: ComparisonPoint[]
  forecastCount: number
  actualCount: number
}

export type DailyError = { date: string; meanAbsoluteError: number }
