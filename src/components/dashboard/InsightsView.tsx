import React, { useState } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  UserX, 
  Star, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Search,
  Mail,
  MessageSquare,
  Sparkles,
  Info,
  Calendar,
  Filter
} from 'lucide-react';
import { useApp } from '../../context';
import { 
  ResponsiveContainer, 
  BarChart,
  Bar,
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const InsightsView: React.FC = () => {
  const { currentCompany } = useApp();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [hoveredHeatCell, setHoveredHeatCell] = useState<{ day: string; time: string; count: number } | null>(null);

  const stats = currentCompany.stats;
  const resolutionRate = stats.totalConversations > 0 
    ? Math.round((stats.resolvedConversations / stats.totalConversations) * 100) 
    : 94;

  // 1. Conversation Volume Over Time (Matches Screenshot 1)
  const volumeData = [
    { date: '10 Aug', range: '09 Aug, 2026 – 10 Aug, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '12 Aug', range: '11 Aug, 2026 – 12 Aug, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '14 Aug', range: '13 Aug, 2026 – 14 Aug, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '16 Aug', range: '15 Aug, 2026 – 16 Aug, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '18 Aug', range: '17 Aug, 2026 – 18 Aug, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '20 Aug', range: '19 Aug, 2026 – 20 Aug, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '22 Aug', range: '21 Aug, 2026 – 22 Aug, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '24 Aug', range: '23 Aug, 2026 – 24 Aug, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '26 Aug', range: '25 Aug, 2026 – 26 Aug, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '28 Aug', range: '27 Aug, 2026 – 28 Aug, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '30 Aug', range: '29 Aug, 2026 – 30 Aug, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '1 Sept', range: '31 Aug, 2026 – 01 Sept, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '3 Sept', range: '02 Sept, 2026 – 03 Sept, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '5 Sept', range: '04 Sept, 2026 – 05 Sept, 2026', created: 0, solved: 0, reopened: 0, overdue: 0 },
    { date: '7 Sept', range: '06 Sept, 2026 – 07 Sept, 2026', created: 4, solved: 0, reopened: 0, overdue: 0 }
  ];

  // 2. Conversations by Priority Data (Matches Screenshot 2 Left)
  const priorityData = [
    { date: '10 Aug', urgent: 0, high: 0, normal: 0, low: 0, total: 0 },
    { date: '14 Aug', urgent: 0, high: 0, normal: 0, low: 0, total: 0 },
    { date: '18 Aug', urgent: 0, high: 0, normal: 0, low: 0, total: 0 },
    { date: '22 Aug', urgent: 0, high: 0, normal: 0, low: 0, total: 0 },
    { date: '26 Aug', urgent: 0, high: 0, normal: 0, low: 0, total: 0 },
    { date: '30 Aug', urgent: 0, high: 0, normal: 0, low: 0, total: 0 },
    { date: '3 Sept', urgent: 0, high: 0, normal: 0, low: 0, total: 0 },
    { date: '7 Sept', urgent: 1, high: 1, normal: 2, low: 0, total: 4 }
  ];

  // 3. Conversations by Source Donut Data (Matches Screenshot 2 Right)
  const sourceData = [
    { name: 'Mail', value: 4, percentage: '100%', color: '#6366f1' },
    { name: 'Website Chat', value: 0, percentage: '0%', color: '#0ea5e9' },
    { name: 'WhatsApp', value: 0, percentage: '0%', color: '#10b981' },
    { name: 'API / SDK', value: 0, percentage: '0%', color: '#f59e0b' }
  ];

  // 4. Hourly Breakdown Heatmap Matrix (7 days x 24 hours)
  const daysOfWeek = [
    { label: 'S', fullName: 'Sunday' },
    { label: 'M', fullName: 'Monday' },
    { label: 'T', fullName: 'Tuesday' },
    { label: 'W', fullName: 'Wednesday' },
    { label: 'T', fullName: 'Thursday' },
    { label: 'F', fullName: 'Friday' },
    { label: 'S', fullName: 'Saturday' }
  ];

  // Generate 24 hours (0 to 23) in 4 quadrants of 6 hours each:
  // Quadrant 1 (Sunrise): 06:00 - 11:00 (hours 6-11)
  // Quadrant 2 (Day): 12:00 - 17:00 (hours 12-17)
  // Quadrant 3 (Sunset): 18:00 - 23:00 (hours 18-23)
  // Quadrant 4 (Moon): 00:00 - 05:00 (hours 0-5)
  const heatmapData: Record<string, number[]> = {
    Sunday: Array(24).fill(0),
    Monday: Array(24).fill(0),
    Tuesday: [
      0, 0, 0, 0, 0, 0, // 0-5
      0, 0, 0, 0, 0, 0, // 6-11
      0, 0, 0, 0, 0, 0, // 12-17
      0, 4, 0, 0, 0, 0  // 18-23 (19:00 / 7 PM has 4 conversations)
    ],
    Wednesday: Array(24).fill(0),
    Thursday: Array(24).fill(0),
    Friday: Array(24).fill(0),
    Saturday: Array(24).fill(0)
  };

  const topQuestions = [
    { topic: 'Pricing & Subscription Plans', percentage: 38, count: 410 },
    { topic: 'Refund & Return Policy', percentage: 26, count: 320 },
    { topic: 'Product Specs & Compatibility', percentage: 18, count: 230 },
    { topic: 'API & Developer Integration', percentage: 11, count: 192 },
    { topic: 'Account & Team Management', percentage: 7, count: 128 }
  ];

  // Custom Tooltip for Conversation Volume Chart (Matches Screenshot 1 exact style)
  const CustomVolumeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = volumeData.find(d => d.date === label) || payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-xl text-xs space-y-3 min-w-[210px] animate-in fade-in zoom-in-95">
          <div className="font-bold text-slate-800 border-b border-slate-100 pb-2 text-[12px]">
            {dataPoint.range || label}
          </div>
          
          <div className="space-y-1.5 font-semibold">
            <div className="flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0ea5e9]"></span>
                <span>{dataPoint.overdue || 0} - Overdue</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#db2777]"></span>
                <span>{dataPoint.reopened || 0} - Reopened</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]"></span>
                <span>{dataPoint.solved || 0} - Solved</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#6366f1]"></span>
                <span>{dataPoint.created || 0} - Conversations Created</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-slate-500 font-medium hover:text-slate-800 cursor-pointer">
            <Search className="w-3 h-3 text-slate-400" />
            <span>Click to view all data</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Analytics & Insights</h1>
            <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200/60 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              Live Aggregation
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time conversation metrics, throughput channels, response times, and hourly breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs font-bold text-slate-600">
            <button 
              onClick={() => setSelectedRange('7d')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${selectedRange === '7d' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
            >
              7 Days
            </button>
            <button 
              onClick={() => setSelectedRange('30d')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${selectedRange === '30d' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
            >
              30 Days
            </button>
            <button 
              onClick={() => setSelectedRange('90d')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${selectedRange === '90d' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
            >
              90 Days
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Total Conversations
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">4</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              +100% <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Autonomous AI coverage</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Resolution Rate
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">{resolutionRate}%</span>
            <span className="text-xs font-semibold text-slate-500">Target: 90%+</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Resolved without staff intervention</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Time Saved
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">~86 hrs</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Equivalent to 2 full-time reps</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Satisfaction (CSAT)
          </span>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">4.9</span>
            <span className="text-sm text-slate-500 font-semibold">/ 5.0</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500 ml-1" />
          </div>
          <p className="text-xs text-slate-500 mt-1">High customer satisfaction</p>
        </div>
      </div>

      {/* 3. Primary Chart: Conversation Volume Over Time (Exact Match to Screenshot 1) */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-800">
            Conversation Volume Over Time
          </h3>

          {/* Color-coded Legend matching Screenshot 1 */}
          <div className="flex items-center flex-wrap gap-4 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#6366f1]"></span>
              <span>Conversations Created</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#f97316]"></span>
              <span>Solved</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#db2777]"></span>
              <span>Reopened</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#0ea5e9]"></span>
              <span>Overdue</span>
            </div>
          </div>
        </div>

        {/* Stacked Bar Chart with Dotted Grid */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={volumeData} 
              margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={{ stroke: '#cbd5e1' }} 
              />
              <YAxis 
                domain={[0, 4]} 
                ticks={[0, 1, 2, 3, 4]} 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                content={<CustomVolumeTooltip />} 
                cursor={{ fill: '#f8fafc', opacity: 0.8 }}
              />
              <Bar 
                dataKey="overdue" 
                stackId="a" 
                fill="#0ea5e9" 
                radius={[0, 0, 0, 0]} 
                barSize={18} 
              />
              <Bar 
                dataKey="reopened" 
                stackId="a" 
                fill="#db2777" 
                radius={[0, 0, 0, 0]} 
                barSize={18} 
              />
              <Bar 
                dataKey="solved" 
                stackId="a" 
                fill="#f97316" 
                radius={[0, 0, 0, 0]} 
                barSize={18} 
              />
              <Bar 
                dataKey="created" 
                stackId="a" 
                fill="#6366f1" 
                radius={[6, 6, 0, 0]} 
                barSize={18} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Two-Column Row: CONVERSATIONS BY PRIORITY & CONVERSATIONS BY SOURCE (Matches Screenshot 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: CONVERSATIONS BY PRIORITY */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Conversations by Priority
            </h4>
            <span className="text-xs font-semibold text-slate-400">Total: 4</span>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorPriority" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: '#e2e8f0' }} 
                />
                <YAxis 
                  domain={[0, 4]} 
                  ticks={[0, 1, 2, 3, 4]} 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip contentStyle={{ backgroundColor: '#090d16', borderRadius: '12px', border: '1px solid #1e293b', color: '#f8fafc', fontSize: '12px' }} />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  name="Priority Inquiries" 
                  stroke="#0ea5e9" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorPriority)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: CONVERSATIONS BY SOURCE (Donut Chart matching Screenshot 2) */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Conversations by Source
            </h4>
            <span className="text-xs font-semibold text-slate-400">Channels</span>
          </div>

          {/* Donut Chart with Center Text */}
          <div className="relative h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={82}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#090d16', borderRadius: '10px', color: '#f8fafc', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>

            {/* Inlaid Center Count */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">4</span>
              <span className="text-[11px] font-medium text-slate-500">Total Conversations</span>
            </div>
          </div>

          {/* Source Legend */}
          <div className="flex items-center justify-center gap-6 pt-2 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#6366f1]"></span>
              <span>100% Mail</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Hourly Breakdown of New Conversations (Exact Heatmap Matrix matching Screenshot 2) */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-800">
            Hourly Breakdown of New Conversations
          </h3>
          {hoveredHeatCell && (
            <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200/60 animate-in fade-in">
              {hoveredHeatCell.day}, {hoveredHeatCell.time}: <strong>{hoveredHeatCell.count} conversations</strong>
            </div>
          )}
        </div>

        {/* Heatmap Grid Stage */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[700px] space-y-3">
            {/* Top Time Quadrant Headers with Celestial / Weather Icons */}
            <div className="grid grid-cols-4 gap-4 pl-8 text-center text-slate-500">
              {/* Sunrise: 6:00 - 12:00 */}
              <div className="flex items-center justify-center gap-1.5 py-1">
                <Sunrise className="w-5 h-5 text-amber-500" />
              </div>

              {/* Sun: 12:00 - 18:00 */}
              <div className="flex items-center justify-center gap-1.5 py-1">
                <Sun className="w-5 h-5 text-amber-500" />
              </div>

              {/* Sunset: 18:00 - 00:00 */}
              <div className="flex items-center justify-center gap-1.5 py-1">
                <Sunset className="w-5 h-5 text-indigo-500" />
              </div>

              {/* Moon: 00:00 - 06:00 */}
              <div className="flex items-center justify-center gap-1.5 py-1">
                <Moon className="w-4.5 h-4.5 text-indigo-400" />
              </div>
            </div>

            {/* Matrix Rows for Each Day of the Week */}
            <div className="space-y-2">
              {daysOfWeek.map((day) => {
                const rowHours = heatmapData[day.fullName] || Array(24).fill(0);
                
                // Partition 24 hours into 4 quadrants of 6 hours
                // Quadrant 1 (Sunrise): hours 6 to 11
                const q1 = rowHours.slice(6, 12);
                // Quadrant 2 (Sun): hours 12 to 17
                const q2 = rowHours.slice(12, 18);
                // Quadrant 3 (Sunset): hours 18 to 23
                const q3 = rowHours.slice(18, 24);
                // Quadrant 4 (Moon): hours 0 to 5
                const q4 = rowHours.slice(0, 6);

                const quadrants = [
                  { hours: q1, startHour: 6 },
                  { hours: q2, startHour: 12 },
                  { hours: q3, startHour: 18 },
                  { hours: q4, startHour: 0 }
                ];

                return (
                  <div key={day.label + day.fullName} className="flex items-center gap-3">
                    {/* Day initial label */}
                    <span className="w-5 text-xs font-bold text-slate-500 text-center">
                      {day.label}
                    </span>

                    {/* 4 Quadrants Container */}
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      {quadrants.map((quad, qIdx) => (
                        <div key={qIdx} className="grid grid-cols-6 gap-1.5">
                          {quad.hours.map((val, hIdx) => {
                            const currentHour = (quad.startHour + hIdx) % 24;
                            const formatTime = `${currentHour === 0 ? '12 AM' : currentHour < 12 ? `${currentHour} AM` : currentHour === 12 ? '12 PM' : `${currentHour - 12} PM`}`;
                            const isHigh = val > 0;

                            return (
                              <div
                                key={hIdx}
                                onMouseEnter={() => setHoveredHeatCell({ day: day.fullName, time: formatTime, count: val })}
                                onMouseLeave={() => setHoveredHeatCell(null)}
                                className={`h-8 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                                  isHigh 
                                    ? 'bg-[#6366f1] text-white font-extrabold text-xs shadow-sm ring-2 ring-indigo-300' 
                                    : 'bg-indigo-50/70 hover:bg-indigo-100/90 border border-indigo-100/50'
                                }`}
                                title={`${day.fullName}, ${formatTime}: ${val} conversations`}
                              >
                                {isHigh ? val : ''}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Top Customer Topics */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">Top Customer Topics</h3>
          <p className="text-sm text-slate-500">Most frequent inquiry categories across all channels</p>
        </div>

        <div className="space-y-3.5 pt-1">
          {topQuestions.map((q, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                <span className="truncate pr-2">{q.topic}</span>
                <span className="text-slate-500 font-mono text-xs">{q.percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all"
                  style={{ width: `${q.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Progressive Disclosure: Developer Metrics & LLM Telemetry */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200/60">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900">Developer Metrics & LLM Telemetry</h4>
              <p className="text-xs sm:text-sm text-slate-500">Token usage, retrieval latency, and model performance metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span>{showAdvanced ? 'Hide Telemetry' : 'Show Telemetry'}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {showAdvanced && (
          <div className="p-6 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 animate-in fade-in duration-150">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Token Consumption</span>
              <p className="text-xl font-bold text-slate-900">342,800 tokens</p>
              <p className="text-xs text-slate-500 font-mono">Prompt: 280k · Completion: 62.8k</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Embedding Latency</span>
              <p className="text-xl font-bold text-emerald-600">42 ms</p>
              <p className="text-xs text-slate-500 font-mono">Dense cosine similarity</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">FastAPI p95 Latency</span>
              <p className="text-xl font-bold text-slate-900">1.18 s</p>
              <p className="text-xs text-slate-500 font-mono">Asynchronous streaming</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
