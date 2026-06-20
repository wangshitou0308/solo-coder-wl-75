import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { aquariumApi, waterParamApi, waterChangeApi, creatureApi, careTaskApi, statsApi } from '../api';
import type { Aquarium, WaterParameter, WaterChange, Creature, CareTask, WaterHealthScore } from '../types';
import { CareTaskTypes } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Modal from '../components/Modal';

export default function AquariumDetail() {
  const { id } = useParams<{ id: string }>();
  const [aquarium, setAquarium] = useState<Aquarium | null>(null);
  const [latestParams, setLatestParams] = useState<WaterParameter | null>(null);
  const [paramHistory, setParamHistory] = useState<WaterParameter[]>([]);
  const [waterChanges, setWaterChanges] = useState<WaterChange[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [careTasks, setCareTasks] = useState<CareTask[]>([]);
  const [healthScore, setHealthScore] = useState<WaterHealthScore | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'params' | 'creatures' | 'water-changes' | 'care-plans'>('overview');
  const [loading, setLoading] = useState(true);
  const [chartParam, setChartParam] = useState('temperature');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<Partial<CareTask>>({});
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<CareTask | null>(null);
  const [completeData, setCompleteData] = useState<Record<string, any>>({});

  const aquariumId = parseInt(id || '0');

  useEffect(() => {
    if (aquariumId) {
      loadData();
    }
  }, [aquariumId]);

  const loadData = async () => {
    try {
      const [aq, latest, history, wc, cr, tasks, hs] = await Promise.all([
        aquariumApi.get(aquariumId),
        waterParamApi.getLatest(aquariumId),
        waterParamApi.getAll(aquariumId, 20),
        waterChangeApi.getAll(aquariumId),
        creatureApi.getAll(aquariumId),
        careTaskApi.getByAquarium(aquariumId),
        statsApi.getHealthScore(aquariumId).catch(() => null),
      ]);
      setAquarium(aq);
      setLatestParams(latest);
      setParamHistory(history);
      setWaterChanges(wc);
      setCreatures(cr);
      setCareTasks(tasks);
      setHealthScore(hs);
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
              { key: 'care-plans', label: '养护计划' },
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
              {healthScore && (
                <div className={`rounded-lg p-4 ${
                  healthScore.level === 'excellent' ? 'bg-emerald-50 border border-emerald-200' :
                  healthScore.level === 'stable' ? 'bg-sky-50 border border-sky-200' :
                  healthScore.level === 'needs_attention' ? 'bg-amber-50 border border-amber-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">水质健康评分</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-3xl font-bold ${
                          healthScore.level === 'excellent' ? 'text-emerald-600' :
                          healthScore.level === 'stable' ? 'text-sky-600' :
                          healthScore.level === 'needs_attention' ? 'text-amber-600' :
                          'text-red-600'
                        }`}>{healthScore.score}</span>
                        <span className={`badge ${
                          healthScore.level === 'excellent' ? 'badge-success' :
                          healthScore.level === 'stable' ? 'bg-sky-100 text-sky-800' :
                          healthScore.level === 'needs_attention' ? 'badge-warning' :
                          'badge-danger'
                        }`}>{healthScore.levelLabel}</span>
                        {healthScore.isDataExpired && (
                          <span className="badge-danger">数据过期</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {healthScore.lastTestDate && (
                        <p className="text-gray-500">最近检测: {healthScore.lastTestDate}</p>
                      )}
                      {healthScore.daysSinceLastTest !== undefined && (
                        <p className={healthScore.isDataExpired ? 'text-red-600' : 'text-gray-400'}>
                          {healthScore.daysSinceLastTest}天前
                        </p>
                      )}
                    </div>
                  </div>
                  {healthScore.causes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-current/10">
                      <p className="text-sm font-medium mb-1">风险原因:</p>
                      <ul className="text-sm space-y-0.5">
                        {healthScore.causes.map((c, i) => <li key={i}>• {c}</li>)}
                      </ul>
                    </div>
                  )}
                  {healthScore.suggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">操作建议:</p>
                      <ul className="text-sm space-y-0.5">
                        {healthScore.suggestions.map((s, i) => <li key={i}>→ {s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

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

          {activeTab === 'care-plans' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button className="btn-primary" onClick={() => {
                  setTaskForm({
                    task_type: 'water_change',
                    cycle_days: 7,
                    next_due_date: new Date().toISOString().split('T')[0],
                  });
                  setTaskModalOpen(true);
                }}>
                  + 新建养护计划
                </button>
              </div>

              {careTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>暂无养护计划</p>
                  <p className="text-sm mt-1">为该鱼缸添加周期性养护任务</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {careTasks.map(task => {
                    const today = new Date().toISOString().split('T')[0];
                    const daysUntil = Math.ceil((new Date(task.next_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const taskType = CareTaskTypes.find(t => t.value === task.task_type);
                    return (
                      <div key={task.id} className={`border rounded-lg p-4 ${
                        task.next_due_date < today && task.status === 'pending' ? 'border-red-300 bg-red-50' :
                        task.next_due_date === today && task.status === 'pending' ? 'border-amber-300 bg-amber-50' :
                        'hover:shadow-sm'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{taskType?.icon || '📋'}</span>
                            <div>
                              <h4 className="font-medium">{taskType?.label || task.task_type}</h4>
                              <p className="text-xs text-gray-500">每{task.cycle_days}天</p>
                            </div>
                          </div>
                          {task.next_due_date < today && task.status === 'pending' ? (
                            <span className="badge-danger text-xs">已逾期</span>
                          ) : task.next_due_date === today && task.status === 'pending' ? (
                            <span className="badge-warning text-xs">今日</span>
                          ) : (
                            <span className="badge-info text-xs">待完成</span>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <p>下次: {task.next_due_date}</p>
                          {daysUntil < 0 && <p className="text-red-600 text-xs">逾期{Math.abs(daysUntil)}天</p>}
                          {daysUntil >= 0 && daysUntil <= 3 && <p className="text-amber-600 text-xs">{daysUntil}天后</p>}
                        </div>
                        {task.notes && <p className="mt-1 text-xs text-gray-500 truncate">{task.notes}</p>}
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={async () => {
                              setActiveTask(task);
                              setCompleteData({});
                              setCompleteModalOpen(true);
                            }}
                            className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200"
                          >
                            完成
                          </button>
                          <button
                            onClick={async () => {
                              await careTaskApi.skip(task.id);
                              loadData();
                            }}
                            className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                          >
                            跳过
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('确定删除？')) return;
                              await careTaskApi.delete(task.id);
                              loadData();
                            }}
                            className="text-xs px-2 py-1 text-red-500 hover:text-red-700"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="新建养护计划">
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await careTaskApi.create(aquariumId, taskForm);
            setTaskModalOpen(false);
            loadData();
          } catch (error) {
            console.error('Failed to create task:', error);
            alert('创建失败');
          }
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">任务类型 *</label>
              <select
                className="input"
                value={taskForm.task_type || 'water_change'}
                onChange={e => setTaskForm({ ...taskForm, task_type: e.target.value })}
                required
              >
                {CareTaskTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">周期 (天) *</label>
              <input
                type="number"
                min="1"
                className="input"
                value={taskForm.cycle_days || 7}
                onChange={e => setTaskForm({ ...taskForm, cycle_days: parseInt(e.target.value) || 7 })}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">下次执行日期 *</label>
            <input
              type="date"
              className="input"
              value={taskForm.next_due_date || ''}
              onChange={e => setTaskForm({ ...taskForm, next_due_date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">备注</label>
            <textarea
              className="input"
              rows={2}
              value={taskForm.notes || ''}
              onChange={e => setTaskForm({ ...taskForm, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" className="btn-secondary" onClick={() => setTaskModalOpen(false)}>取消</button>
            <button type="submit" className="btn-primary">创建</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={completeModalOpen}
        onClose={() => { setCompleteModalOpen(false); setActiveTask(null); }}
        title={activeTask ? `完成 - ${CareTaskTypes.find(t => t.value === activeTask.task_type)?.label || ''}` : '完成任务'}
      >
        <div className="space-y-4">
          {activeTask && (
            <div className="bg-emerald-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-emerald-800">
                完成此任务将自动生成一条{CareTaskTypes.find(t => t.value === activeTask.task_type)?.label}记录
              </p>
            </div>
          )}
          {activeTask?.task_type === 'water_change' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">换水量 (L)</label>
                <input type="number" step="0.1" className="input" value={completeData.volume || ''}
                  onChange={e => setCompleteData({ ...completeData, volume: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">水类型</label>
                <input type="text" className="input" value={completeData.water_type || ''}
                  onChange={e => setCompleteData({ ...completeData, water_type: e.target.value })} />
              </div>
            </div>
          )}
          {activeTask?.task_type === 'water_test' && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'temperature', label: '温度', step: '0.1' },
                { key: 'ph', label: 'pH', step: '0.01' },
                { key: 'ammonia', label: '氨氮', step: '0.01' },
                { key: 'nitrite', label: '亚硝酸盐', step: '0.01' },
                { key: 'nitrate', label: '硝酸盐', step: '0.1' },
                { key: 'kh', label: 'KH', step: '0.5' },
              ].map(p => (
                <div key={p.key}>
                  <label className="label">{p.label}</label>
                  <input type="number" step={p.step} className="input"
                    value={(completeData.param_data || {})[p.key] || ''}
                    onChange={e => setCompleteData({ ...completeData, param_data: { ...(completeData.param_data || {}), [p.key]: parseFloat(e.target.value) || null } })} />
                </div>
              ))}
            </div>
          )}
          {activeTask?.task_type === 'feeding' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">饲料类型</label>
                <input type="text" className="input" value={completeData.food_type || ''}
                  onChange={e => setCompleteData({ ...completeData, food_type: e.target.value })} />
              </div>
              <div>
                <label className="label">喂食量</label>
                <input type="number" step="0.1" className="input" value={completeData.amount || ''}
                  onChange={e => setCompleteData({ ...completeData, amount: parseFloat(e.target.value) || null })} />
              </div>
            </div>
          )}
          <div>
            <label className="label">备注</label>
            <textarea className="input" rows={2} value={completeData.notes || ''}
              onChange={e => setCompleteData({ ...completeData, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" className="btn-secondary" onClick={() => { setCompleteModalOpen(false); setActiveTask(null); }}>取消</button>
            <button type="button" className="btn-success" onClick={async () => {
              if (!activeTask) return;
              try {
                await careTaskApi.complete(activeTask.id, completeData);
                setCompleteModalOpen(false);
                setActiveTask(null);
                loadData();
              } catch (error) {
                console.error('Failed to complete task:', error);
                alert('操作失败');
              }
            }}>确认完成</button>
          </div>
        </div>
      </Modal>
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
