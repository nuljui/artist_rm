import React, { useMemo } from 'react';
import { LifecycleStage, ArtType, Persona } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { PALETTE, LIFECYCLE_COLORS, PERSONA_COLORS } from './colors';

interface DashboardProps {
  stats: any[][] | null;
}

// Helper to parse the User's specific sheet layout
const parseStats = (rows: any[][]) => {
  const result = {
    totalArtists: 0,
    engaged: 0,
    avgFitScore: '0.0',
    highInfluence: 0,
    pipeline: [] as { name: string, count: number }[],
    platforms: [] as { name: string, count: number }[],
    artTypes: [] as { name: string, value: number }[],
    personas: [] as { name: string, count: number }[],
    owners: [] as { name: string, count: number }[],
  };

  if (!rows || rows.length < 1) return result;

  // Helper to find a section by its Header in Column A (Index 0)
  // And read the headers from that row, and values from the NEXT row.
  const findSection = (sectionName: string) => {
    for (let i = 0; i < rows.length; i++) {
      const cell = String(rows[i][0]).trim();
      if (cell === sectionName && i + 1 < rows.length) {
        // Found Header Row at i
        // Value Row is commonly i+1.
        // But checking the user's layout:
        // Row 2: Dashboard Param Total...
        // Row 3: "" Artists 0 0... (Values seem to be in Row i+1, but offset? No, aligned)
        // User example:
        // Dashboard | Param | Total Roster | Engaged
        //           | Artists | 0            | 0

        // Let's assume headers are at `rows[i]` starting at col 2?
        // "Dashboard" is col 0. "Param" is col 1. Stats start at Col 2.
        const headerRow = rows[i];
        const valueRow = rows[i + 1];

        const data: { [key: string]: any } = {};

        for (let c = 2; c < headerRow.length; c++) {
          const key = String(headerRow[c]).trim();
          if (!key) continue;
          data[key] = valueRow[c];
        }
        return data;
      }
    }
    return {};
  };

  // 1. Dashboard Helper Stats
  const mainStats = findSection("Dashboard");
  result.totalArtists = Number(mainStats["Total Roster"] || 0);
  result.engaged = Number(mainStats["Engaged"] || 0);
  result.avgFitScore = String(mainStats["Fit Score"] || "0.0");
  result.highInfluence = Number(mainStats["High Impact"] || 0);

  // 2. Pipeline Stages
  const pipelineStats = findSection("Pipeline Stages");
  // Map strictly to lifecycle order if possible, or just dump what we find
  const activeStages = Object.values(LifecycleStage).filter(s => !s.startsWith('Closed'));
  result.pipeline = [
    ...activeStages.map(stage => ({ name: stage, count: Number(pipelineStats[stage] || 0) })),
    { name: 'Closed', count: Number(pipelineStats['Closed'] || 0) }
  ];

  // 3. Platforms
  const platformStats = findSection("Platforms");
  result.platforms = Object.keys(platformStats)
    .map(k => ({ name: k, count: Number(platformStats[k]) }))
    .sort((a, b) => b.count - a.count);

  // 4. Art Types
  const artStats = findSection("Art Types");
  result.artTypes = Object.keys(artStats).map(k => ({ name: k, value: Number(artStats[k]) }));

  // 5. Persona Mix
  const personaStats = findSection("Persona Mix");
  result.personas = Object.keys(personaStats).map(k => ({ name: k, count: Number(personaStats[k]) }));

  return result;
};

export const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const data = useMemo(() => parseStats(stats || []), [stats]);

  const COLORS = [PALETTE.Blue, PALETTE.Orange, PALETTE.Purple, PALETTE.Green, PALETTE.Pink, PALETTE.Teal];

  if (!stats) {
    return <div className="p-12 text-center text-gray-400">Loading Stats...</div>;
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-gray-100 pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-lg text-gray-500 font-light">Performance overview</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Total Roster</p>
          <p className="text-4xl font-extrabold text-gray-900 tracking-tight">{data.totalArtists}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Engaged</p>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 tracking-tight">{data.engaged}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Fit Score</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-4xl font-extrabold text-gray-900 tracking-tight">{data.avgFitScore}</p>
            <span className="text-base text-gray-400 font-normal">/ 5.0</span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">High Impact</p>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600 tracking-tight">{data.highInfluence}</p>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-12"></div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-16">

        {/* Lifecycle Funnel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Pipeline Stages</h3>
            <span className="text-sm text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{data.totalArtists} Artists</span>
          </div>
          <div className="h-72 w-full bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.pipeline} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={60} stroke="#9CA3AF" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} stroke="#9CA3AF" />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }} />
                <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={48}>
                  {data.pipeline.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={LIFECYCLE_COLORS[entry.name as LifecycleStage] || '#3b82f6'} className="hover:opacity-80 transition-opacity" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Art Type Breakdown */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Art Types</h3>
          <div className="h-72 w-full bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.artTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={6}
                  dataKey="value"
                  cornerRadius={6}
                >
                  {data.artTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} formatter={(value) => <span className="text-gray-500 text-sm ml-1">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>


        {/* Platform Breakdown */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Platforms</h3>
          <div className="h-72 w-full bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.platforms} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} stroke="#9CA3AF" />
                <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={80} stroke="#4B5563" fontWeight={500} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="count" fill={PALETTE.Blue} radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Persona Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-bold text-gray-900">Persona Mix</h3>
            <span className="h-px bg-gray-200 flex-1"></span>
          </div>
          <div className="h-48 w-full bg-white rounded-2xl p-4 border border-gray-100">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.personas} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={13} tickLine={false} axisLine={false} width={100} stroke="#4B5563" fontWeight={500} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="count" radius={[0, 100, 100, 0]} barSize={32} background={{ fill: '#F9FAFB', radius: [0, 100, 100, 0] }}>
                  {data.personas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PERSONA_COLORS[entry.name as Persona] || PALETTE.Orange} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};