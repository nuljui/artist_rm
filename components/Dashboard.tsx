import React, { useMemo, useState } from 'react';
import { Artist, LifecycleStage, ArtType, Persona } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { GeminiService } from '../services/geminiService';
import { PALETTE, LIFECYCLE_COLORS, PERSONA_COLORS } from './colors';

interface DashboardProps {
  data: Artist[];
}

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // Metrics
  const totalArtists = data.length;
  const engaged = data.filter(a => a.status === LifecycleStage.ENGAGED).length;
  const avgFitScore = data.length > 0
    ? (data.reduce((acc, curr) => acc + curr.fitScore, 0) / data.length).toFixed(1)
    : '0.0';
  const highInfluenceCount = data.filter(a => a.influenceScore > 80).length;

  // Chart Data: Lifecycle Funnel
  // Chart Data: Lifecycle Funnel
  const funnelData = useMemo(() => {
    const counts: Record<string, number> = {};
    const activeStages = Object.values(LifecycleStage).filter(s => !s.startsWith('Closed'));

    // Initialize counts
    activeStages.forEach(s => counts[s] = 0);
    counts['Closed'] = 0;

    data.forEach(a => {
      if (a.status.startsWith('Closed')) {
        counts['Closed'] = (counts['Closed'] || 0) + 1;
      } else {
        counts[a.status] = (counts[a.status] || 0) + 1;
      }
    });

    return [
      ...activeStages.map(stage => ({ name: stage, count: counts[stage] })),
      { name: 'Closed', count: counts['Closed'] }
    ];
  }, [data]);

  // Chart Data: Art Type Distribution
  const artTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(ArtType).forEach(t => counts[t] = 0);
    data.forEach(a => {
      counts[a.artType] = (counts[a.artType] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [data]);

  // Chart Data: Platform Distribution
  const platformData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(a => {
      // Count primary platform or all? Let's count unique artists per primary platform for cleaner chart
      const primary = a.profiles[0]?.platform || 'Unknown';
      counts[primary] = (counts[primary] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, count: counts[key] })).sort((a, b) => b.count - a.count);
  }, [data]);

  // Chart Data: Persona Distribution
  const personaData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(Persona).forEach(p => counts[p] = 0);
    data.forEach(a => {
      counts[a.persona] = (counts[a.persona] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, count: counts[key] }));
  }, [data]);



  // ... inside component ...

  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    const result = await GeminiService.generateInsights(data);
    setInsight(result);
    setLoadingInsight(false);
  };

  const COLORS = [PALETTE.Blue, PALETTE.Orange, PALETTE.Purple, PALETTE.Green, PALETTE.Pink, PALETTE.Teal];

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-gray-100 pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-lg text-gray-500 font-light">Performance overview & AI insights</p>
        </div>
        <button
          onClick={handleGenerateInsight}
          disabled={loadingInsight}
          className="group flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:shadow-none w-full md:w-auto justify-center"
        >
          {loadingInsight ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          )}
          <span className="font-medium">Generate Insights</span>
        </button>
      </div>

      {insight && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-8 rounded-2xl animate-fade-in relative shadow-sm">
          <button onClick={() => setInsight(null)} className="absolute top-6 right-6 text-blue-300 hover:text-blue-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">AI Strategic Analysis</h3>
          </div>
          <div className="text-gray-700 prose prose-blue max-w-none text-base leading-relaxed font-light">
            {insight}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Total Roster</p>
          <p className="text-4xl font-extrabold text-gray-900 tracking-tight">{totalArtists}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Engaged</p>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 tracking-tight">{engaged}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Fit Score</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-4xl font-extrabold text-gray-900 tracking-tight">{avgFitScore}</p>
            <span className="text-base text-gray-400 font-normal">/ 5.0</span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">High Impact</p>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600 tracking-tight">{highInfluenceCount}</p>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-12"></div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-16">

        {/* Lifecycle Funnel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Pipeline Stages</h3>
            <span className="text-sm text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{totalArtists} Artists</span>
          </div>
          <div className="h-72 w-full bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={60} stroke="#9CA3AF" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} stroke="#9CA3AF" />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }} />
                <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={48}>
                  {funnelData.map((entry, index) => (
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
                  data={artTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={6}
                  dataKey="value"
                  cornerRadius={6}
                >
                  {artTypeData.map((entry, index) => (
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
              <BarChart data={platformData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              <BarChart data={personaData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={13} tickLine={false} axisLine={false} width={100} stroke="#4B5563" fontWeight={500} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="count" radius={[0, 100, 100, 0]} barSize={32} background={{ fill: '#F9FAFB', radius: [0, 100, 100, 0] }}>
                  {personaData.map((entry, index) => (
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