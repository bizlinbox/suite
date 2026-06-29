'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useWaba } from '@/context/WabaContext';
import { usePermission } from '@/hooks/usePermission';
import { LuBuilding2 as Building2, LuLoader as Loader2 } from 'react-icons/lu';

interface DayCount {
  day: string;
  count: number;
}

interface TopAgent {
  name: string;
  conversationsHandled: number;
}

interface MsgByType {
  messageType: string;
  count: number;
}

interface AnalyticsData {
  totalConversations: number;
  totalMessages: number;
  avgResponseTimeSeconds: number;
  messagesPerDay: DayCount[];
  conversationsPerDay: DayCount[];
  topAgents: TopAgent[];
  messagesByType: MsgByType[];
}

const COLORS = ['#002d62', '#148b7d', '#4b6f9a', '#e8f4f2', '#c2cfe0', '#117a6e', '#0e695f', '#708db0'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function LineChart({ data, color }: { data: DayCount[]; color: string }) {
  if (!data || data.length === 0) return <div className="p-8 text-center text-sm text-gray-400">No data</div>;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const width = 600;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - (d.count / maxVal) * chartH;
    return { x, y, label: formatDate(d.day), value: d.count };
  });

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const labelStep = Math.ceil(data.length / 6);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padding.top + chartH * (1 - ratio);
        return (
          <g key={ratio}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-400">
              {Math.round(maxVal * ratio)}
            </text>
          </g>
        );
      })}
      {/* Area */}
      <path d={areaD} fill={color} opacity={0.1} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill={color} />
          <title>{`${p.label}: ${p.value}`}</title>
        </g>
      ))}
      {/* X labels */}
      {points.filter((_, i) => i % labelStep === 0 || i === data.length - 1).map((p, i) => (
        <text key={i} x={p.x} y={height - 8} textAnchor="middle" className="text-[10px] fill-gray-500">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

function BarChart({ data }: { data: TopAgent[] }) {
  if (!data || data.length === 0) return <div className="p-8 text-center text-sm text-gray-400">No data</div>;

  const maxVal = Math.max(...data.map((d) => d.conversationsHandled), 1);
  const width = 600;
  const height = 220;
  const padding = { top: 10, right: 10, bottom: 60, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barWidth = Math.min(40, chartW / data.length - 8);
  const gap = (chartW - barWidth * data.length) / (data.length + 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid line */}
      <line x1={padding.left} y1={padding.top + chartH} x2={width - padding.right} y2={padding.top + chartH} stroke="#e5e7eb" strokeWidth={1} />
      {data.map((d, i) => {
        const barH = (d.conversationsHandled / maxVal) * chartH;
        const x = padding.left + gap + i * (barWidth + gap);
        const y = padding.top + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} rx={4} fill={COLORS[i % COLORS.length]} />
            <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="text-[10px] fill-gray-700 font-medium">
              {d.conversationsHandled}
            </text>
            <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" className="text-[10px] fill-gray-500" transform={`rotate(-20, ${x + barWidth / 2}, ${height - 8})`}>
              {d.name.length > 10 ? d.name.slice(0, 10) + '...' : d.name}
            </text>
            <title>{`${d.name}: ${d.conversationsHandled} conversations`}</title>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ data }: { data: MsgByType[] }) {
  if (!data || data.length === 0) return <div className="p-8 text-center text-sm text-gray-400">No data</div>;

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const size = 200;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48">
        {data.map((d, i) => {
          const pct = d.count / total;
          const dash = pct * circumference;
          const segment = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            >
              <title>{`${d.messageType}: ${d.count} (${Math.round(pct * 100)}%)`}</title>
            </circle>
          );
          offset += dash;
          return segment;
        })}
        <text x={size / 2} y={size / 2 + 6} textAnchor="middle" className="text-sm fill-gray-700 font-semibold">
          {total}
        </text>
        <text x={size / 2} y={size / 2 + 22} textAnchor="middle" className="text-[10px] fill-gray-400">
          Total
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-3">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="capitalize">{d.messageType}</span>
            <span className="text-gray-400">({Math.round((d.count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const { selectedWabaId } = useWaba();
  const { can, loading: authLoading } = usePermission();

  useEffect(() => {
    api.get('/analytics')
      .then((res) => setData(res.data))
      .catch(() => setData(null));
  }, []);

  const formatTime = (seconds: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (!selectedWabaId) {
    return (
      <div className="panel flex flex-col items-center justify-center p-12 text-center">
        <Building2 size={48} className="mb-4 text-gray-400 dark:text-gray-500" />
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Please select a WABA account</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Use the WABA dropdown in the top navigation to choose an account.</p>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (!can('analytics.read')) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400">
        Access denied
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Overview of conversations, messages, and team performance</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        <div className="panel p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Conversations</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{data?.totalConversations ?? 0}</p>
        </div>
        <div className="panel p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Messages</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{data?.totalMessages ?? 0}</p>
        </div>
        <div className="panel p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Avg Response Time</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatTime(data?.avgResponseTimeSeconds ?? 0)}</p>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Messages per Day (Last 30 Days)</h2>
          <LineChart data={data?.messagesPerDay || []} color="#148b7d" />
        </div>
        <div className="panel p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Conversations per Day (Last 30 Days)</h2>
          <LineChart data={data?.conversationsPerDay || []} color="#002d62" />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Top Agents</h2>
          <BarChart data={data?.topAgents || []} />
        </div>
        <div className="panel p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Messages by Type</h2>
          <DonutChart data={data?.messagesByType || []} />
        </div>
      </div>
    </div>
  );
}
