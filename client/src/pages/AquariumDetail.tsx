import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { aquariumApi, waterParamApi, waterChangeApi, creatureApi } from '../api';
import type { Aquarium, WaterParameter, WaterChange, Creature } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AquariumDetail() {
  const { id } = useParams<{ id: string }>();
  const [aquarium, setAquarium] = useState<Aquarium | null>(null);
  const [latestParams, setLatestParams] = useState<WaterParameter | null>(null);
  const [paramHistory, setParamHistory] = useState<WaterParameter[]>([]);
  const [waterChanges, setWaterChanges] = useState<WaterChange[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'params' | 'creatures' | 'water-changes'>('overview');
  const [loading, setLoading] = useState(true);
  const [chartParam, setChartParam] = useState('temperature');

  const aquariumId = parseInt(id || '0');

  useEffect(() => {
    if (aquariumId) {
      loadData();
    }
  }, [aquariumId]);

  const loadData = async () => {
    try {
      const [aq, latest, history, wc, cr] = await Promise.all([
        aquariumApi.get(aquariumId),
        waterParamApi.getLatest(aquariumId),
        waterParamApi.getAll(aquariumId, 20),
        waterChangeApi.getAll(aquariumId),
        creatureApi.getAll(aquariumId),
      ]);
      setAquarium(aq);
      setLatestParams(latest);
      setParamHistory(history);
      setWaterChanges(wc);
      setCreatures(cr);
    } catch (error) {
      console.error('Failed to load aquarium detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  if (!aquarium) {
    return <div className="text-center py-12">鱼缸不存在</div>;
  }

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      freshwater_planted: '淡水草缸',
      saltwater_reef: '海水珊瑚缸',
      freshwater_community: '淡水混养',
      saltwater_fish: '海水鱼',
    };
    return types[type] || type;
  };

  const paramOptions = [
    { value: 'temperature', label: '温度 (°C)' },
    { value: 'ph', label: 'pH' },
    { value: 'ammonia', label: '氨氮 (mg/L)' },
    { value: 'nitrite', label: '亚硝酸盐 (mg/L)' },
    { value: 'nitrate', label: '硝酸盐 (mg/L)' },
    { value: 'phosphate', label: '磷酸盐 (mg/L)' },
  ];

  const chartData = paramHistory
    .slice()
    .reverse()
    .map(p => ({
      date: p.record_date,
      value: (p as any)[chartParam],
    }))
    .filter(d => d.value !== null && d.value !== undefined);

  const totalCreatures = creatures.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/aquariums" className="text-gray-500 hover:text-gray-700">
          ← 返回列表
        </Link>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{aquarium.name}</h1>
            <span className="badge-info mt-2">{getTypeLabel(aquarium.type)}</span>
          </div>
          <div className="text-right text-sm text-gray-500">
            {aquarium.volume && <p>容积: {aquarium.volume}L</p>}
            {aquarium.setup_date && <p>开缸日期: {aquarium.setup_date}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <InfoItem label="底床" value={aquarium.substrate} />
          <InfoItem label="过滤系统" value={aquarium.filter_system} />
          <InfoItem label="灯光系统" value={aquarium.lighting_system} />
          <InfoItem label="CO2系统" value={aquarium.co2_system} />
        </div>

        {aquarium.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">备注</p>
            <p className="text-gray-700 mt-1">{aquarium.notes}</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="border-b">
          <nav className="flex">
            {[
              { key: 'overview', label: '总览' },
              { key: 'params', label: '水质参数' },
              { key: 'creatures', label: '生物列表' },
              { key: 'water-changes', label: '换水记录' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="最新温度"
                  value={latestParams?.temperature ? `${latestParams.temperature}°C` : '-'}
                  icon="🌡️"
                />
                <StatCard
                  label="pH值"
                  value={latestParams?.ph || '-'}
                  icon="🧪"
                />
                <StatCard
                  label="生物总数"
                  value={`${totalCreatures} 只`}
                  icon="🐟"
                />
                <StatCard
                  label="换水次数"
                  value={`${waterChanges.length} 次`}
                  icon="💧"
                />
              </div>

              {latestParams?.warnings && latestParams.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-800 mb-2">⚠️ 水质预警</h4>
                  <ul className="space-y-1 text-sm text-amber-700">
                    {latestParams.warnings.map((w, i) => (
                      <li key={i}>
                        {w.parameter}: {w.value}{w.unit} (安全范围: {w.min}-{w.max})
                        {w.status === 'too_low' ? ' - 偏低' : ' - 偏高'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">水质趋势</h3>
                  <select
                    className="input text-sm py-1 w-auto"
                    value={chartParam}
                    onChange={e => setChartParam(e.target.value)}
                  >
                    {paramOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name={paramOptions.find(o => o.value === chartParam)?.label}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'params' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>温度</th>
                    <th>pH</th>
                    <th>氨氮</th>
                    <th>亚硝酸盐</th>
                    <th>硝酸盐</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {paramHistory.map(p => (
                    <tr key={p.id}>
                      <td>{p.record_date}</td>
                      <td>{p.temperature || '-'}</td>
                      <td>{p.ph || '-'}</td>
                      <td>{p.ammonia || '-'}</td>
                      <td>{p.nitrite || '-'}</td>
                      <td>{p.nitrate || '-'}</td>
                      <td>
                        {p.warnings && p.warnings.length > 0 ? (
                          <span className="badge-danger">预警</span>
                        ) : (
                          <span className="badge-success">正常</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paramHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        暂无水质记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'creatures' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creatures.map(c => (
                <div key={c.id} className="border rounded-lg p-4 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{c.name}</h4>
                    {c.is_high_value ? <span className="badge-warning">高价值</span> : null}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{c.species || c.category}</p>
                  <p className="text-lg font-bold text-primary-600 mt-2">{c.quantity} 只</p>
                  {c.add_date && (
                    <p className="text-xs text-gray-400 mt-1">入缸日期: {c.add_date}</p>
                  )}
                </div>
              ))}
              {creatures.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  暂无生物记录
                </div>
              )}
            </div>
          )}

          {activeTab === 'water-changes' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>换水量</th>
                    <th>水类型</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {waterChanges.map(wc => (
                    <tr key={wc.id}>
                      <td>{wc.change_date}</td>
                      <td>{wc.volume}L</td>
                      <td>{wc.water_type || '-'}</td>
                      <td>{wc.notes || '-'}</td>
                    </tr>
                  ))}
                  {waterChanges.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        暂无换水记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-700 mt-1">{value || '-'}</p>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}
