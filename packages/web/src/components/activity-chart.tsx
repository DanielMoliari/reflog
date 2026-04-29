'use client'

import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  AreaChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'

interface ChartDataPoint {
  date: string
  value: number
  [key: string]: string | number
}

interface ActivityChartProps {
  data: ChartDataPoint[]
  type?: 'line' | 'bar' | 'area'
  color?: string
  height?: number
  loading?: boolean
  yLabel?: string
  formatValue?: (v: number) => string
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1c1c1c',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  fontSize: 12,
  color: '#f1f5f9',
}

export function ActivityChart({
  data,
  type = 'area',
  color = '#06b6d4',
  height = 220,
  loading,
  yLabel,
  formatValue,
}: ActivityChartProps) {
  if (loading) return <Skeleton style={{ height }} className="w-full" />

  const tickStyle = { fontSize: 11, fill: '#475569' }
  const gridStyle = { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '3 3' }

  const fmtVal = formatValue
    ? (v: unknown) => [formatValue(Number(v ?? 0)), ''] as [string, string]
    : (v: unknown) => [v as string, ''] as [string, string]

  const fmtLabel = (l: unknown) => formatDate(String(l ?? ''))

  const xAxisProps = {
    dataKey: 'date' as const,
    tickFormatter: (v: string) => formatDate(v),
    tick: tickStyle,
    axisLine: false,
    tickLine: false,
    dy: 8,
  }
  const yAxisProps = {
    tick: tickStyle,
    axisLine: false,
    tickLine: false,
    width: 36,
    label: yLabel
      ? { value: yLabel, angle: -90, position: 'insideLeft' as const, fill: '#475569', fontSize: 11 }
      : undefined,
    tickFormatter: formatValue ? (v: number) => formatValue(v) : undefined,
  }

  const sharedProps = {
    data,
    margin: { top: 4, right: 4, bottom: 0, left: 0 },
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === 'bar' ? (
        <BarChart {...sharedProps}>
          <CartesianGrid vertical={false} {...gridStyle} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <RechartsTooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={fmtVal}
            labelFormatter={fmtLabel}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      ) : type === 'line' ? (
        <LineChart {...sharedProps}>
          <CartesianGrid vertical={false} {...gridStyle} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <RechartsTooltip contentStyle={TOOLTIP_STYLE} formatter={fmtVal} labelFormatter={fmtLabel} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      ) : (
        <AreaChart {...sharedProps}>
          <defs>
            <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} {...gridStyle} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <RechartsTooltip contentStyle={TOOLTIP_STYLE} formatter={fmtVal} labelFormatter={fmtLabel} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${color.replace('#', '')})`}
            dot={false}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  )
}
