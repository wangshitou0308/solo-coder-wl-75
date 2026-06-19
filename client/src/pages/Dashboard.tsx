import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { statsApi } from '../api';
import type { OverviewStats, AquariumStatus, MonthlyStats } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [aquariumStatus, setAquariumStatus] = useState<AquariumStatus[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ov, aq, mo] = await Promise.all([
        statsApi.getOverview(),
        statsApi.getAquariumStatus(),
        statsApi.getMonthlyStats(6),
      ]);
      setOverview(ov);
      setAquariumStatus(aq);
      setMonthlyStats(mo);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      freshwater_planted: '淡水草缸',
      saltwater_reef: '海水珊瑚缸',
      freshwater_community: '淡水混养',
      saltwater_fish: '海水鱼',
      breeding: '繁殖缸',
      quarantine: '检疫缸',
    };
    return types[type] || type;
  };

  const hasWarning = (params: any) => {
    return params?.warnings && params.warnings.length > 0;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">鱼缸总数</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{overview?.aquariumCount || 0}</p>
            </div>
            <div className="text-4xl">🐠</div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">生物总数</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{overview?.creatureStats?.total_creatures || 0}</p>
            </div>
            <div className="text-4xl">🐟</div>
          </div>
          <div className="mt-3 text-xs text-gray-500 space-x-3">
            <span>鱼: {overview?.creatureStats?.fish_count || 0}</span>
            <span>虾: {overview?.creatureStats?.shrimp_count || 0}</span>
            <span>珊瑚: {overview?.creatureStats?.coral_count || 0}</span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">活跃疾病</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{overview?.activeDiseases || 0}</p>
            </div>
            <div className="text-4xl">💊</div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待维护</p>
              <div className="flex items-end gap-2 mt-1">
                <p className="text-3xl font-bold text-emerald-600">{overview?.upcomingMaintenances || 0}</p>
                {overview && overview.overdueMaintenances > 0 && (
                  <span className="text-sm text-red-600 mb-1">{overview.overdueMaintenances} 项逾期</span>
                )}
              </div>
            </div>
            <div className="text-4xl">🔧</div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">鱼缸状态总览</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aquariumStatus.map(aq => (
            <Link
              key={aq.id}
              to={`/aquariums/${aq.id}`}
              className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{aq.name}</h4>
                  <p className="text-sm text-gray-500">{getTypeLabel(aq.type)}</p>
                </div>
                {aq.latestParams && hasWarning(aq.latestParams) && (
                  <span className="badge-warning">⚠️ 预警</span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">温度: </span>
                  <span className="font-medium">
                    {aq.latestParams?.temperature ? `${aq.latestParams.temperature}°C` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">pH: </span>
                  <span className="font-medium">{aq.latestParams?.ph || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">生物: </span>
                  <span className="font-medium">{aq.creatureCount} 只</span>
                </div>
                <div>
                  <span className="text-gray-500">上次换水: </span>
                  <span className="font-medium">{aq.lastWaterChange?.change_date || '-'}</span>
                </div>
              </div>
            </Link>
          ))}

          {aquariumStatus.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              暂无鱼缸，点击"鱼缸档案"添加您的第一个鱼缸
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">月度换水 & 检测趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStats?.waterChanges || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="换水次数" fill="#3b82f6" />
                <Bar dataKey="total_volume" name="换水量(L)" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">病害发生频次</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyStats?.diseases || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="病害数" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
