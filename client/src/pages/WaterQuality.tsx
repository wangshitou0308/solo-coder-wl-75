import { useState, useEffect } from 'react';
import { aquariumApi, waterParamApi, waterChangeApi } from '../api';
import type { Aquarium, WaterParameter, WaterChange } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Modal from '../components/Modal';

export default function WaterQuality() {
  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [selectedAquarium, setSelectedAquarium] = useState<number | null>(null);
  const [params, setParams] = useState<WaterParameter[]>([]);
  const [waterChanges, setWaterChanges] = useState<WaterChange[]>([]);
  const [chartParam, setChartParam] = useState('temperature');
  const [paramModalOpen, setParamModalOpen] = useState(false);
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [paramForm, setParamForm] = useState<Partial<WaterParameter>>({});
  const [changeForm, setChangeForm] = useState<Partial<WaterChange>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAquariums();
  }, []);

  useEffect(() => {
    if (selectedAquarium) {
      loadData();
    }
  }, [selectedAquarium]);

  const loadAquariums = async () => {
    try {
      const data = await aquariumApi.getAll();
      setAquariums(data);
      if (data.length > 0) {
        setSelectedAquarium(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load aquariums:', error);
    }
  };

  const loadData = async () => {
    if (!selectedAquarium) return;
    setLoading(true);
    try {
      const [p, wc] = await Promise.all([
        waterParamApi.getAll(selectedAquarium, 30),
        waterChangeApi.getAll(selectedAquarium),
      ]);
      setParams(p);
      setWaterChanges(wc);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddParam = () => {
    setParamForm({
      record_date: new Date().toISOString().split('T')[0],
    });
    setParamModalOpen(true);
  };

  const handleSubmitParam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAquarium) return;
    try {
      await waterParamApi.create(selectedAquarium, paramForm);
      setParamModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to add param:', error);
      alert('添加失败');
    }
  };

  const handleAddChange = () => {
    setChangeForm({
      change_date: new Date().toISOString().split('T')[0],
      volume: 0,
    });
    setChangeModalOpen(true);
  };

  const handleSubmitChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAquarium) return;
    try {
      await waterChangeApi.create(selectedAquarium, changeForm);
      setChangeModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to add water change:', error);
      alert('添加失败');
    }
  };

  const chartData = params
    .slice()
    .reverse()
    .map(p => ({
      date: p.record_date,
      value: (p as any)[chartParam],
    }))
    .filter(d => d.value !== null && d.value !== undefined);

  const paramOptions = [
    { value: 'temperature', label: '温度 (°C)' },
    { value: 'ph', label: 'pH' },
    { value: 'ammonia', label: '氨氮 (mg/L)' },
    { value: 'nitrite', label: '亚硝酸盐 (mg/L)' },
    { value: 'nitrate', label: '硝酸盐 (mg/L)' },
    { value: 'phosphate', label: '磷酸盐 (mg/L)' },
    { value: 'gh', label: 'GH (dGH)' },
    { value: 'kh', label: 'KH (dKH)' },
    { value: 'tds', label: 'TDS (ppm)' },
    { value: 'salinity', label: '盐度 (sg)' },
    { value: 'calcium', label: '钙 (mg/L)' },
    { value: 'magnesium', label: '镁 (mg/L)' },
    { value: 'alkalinity', label: '碱度 (dKH)' },
  ];

  const latestParams = params.length > 0 ? params[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">水质监测</h2>
          <select
            className="input w-auto"
            value={selectedAquarium || ''}
            onChange={e => setSelectedAquarium(parseInt(e.target.value) || null)}
          >
            <option value="">选择鱼缸</option>
            {aquariums.map(aq => (
              <option key={aq.id} value={aq.id}>{aq.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleAddChange}>
            记录换水
          </button>
          <button className="btn-primary" onClick={handleAddParam}>
            + 记录水质
          </button>
        </div>
      </div>

      {!selectedAquarium ? (
        <div className="card text-center py-12 text-gray-500">
          请先选择一个鱼缸
        </div>
      ) : loading ? (
        <div className="card text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <>
          {latestParams?.warnings && latestParams.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">⚠️ 最新水质预警</h4>
              <ul className="space-y-1 text-sm text-amber-700">
                {latestParams.warnings.map((w, i) => (
                  <li key={i}>
                    <span className="font-medium">{w.parameter}</span>:
                    {w.value}{w.unit}
                    {' '}(安全范围: {w.min}-{w.max})
                    {w.status === 'too_low' ? ' - 偏低' : ' - 偏高'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">历史变化曲线</h3>
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
            <div className="h-72">
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
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-4">水质记录历史</h3>
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
                  {params.map(p => (
                    <tr key={p.id}>
                      <td>{p.record_date}</td>
                      <td>{p.temperature || '-'}</td>
                      <td>{p.ph || '-'}</td>
                      <td>{p.ammonia || '-'}</td>
                      <td>{p.nitrite || '-'}</td>
                      <td>{p.nitrate || '-'}</td>
                      <td>
                        {p.warnings && p.warnings.length > 0 ? (
                          <span className="badge-danger">{p.warnings.length}项异常</span>
                        ) : (
                          <span className="badge-success">正常</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {params.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        暂无水质记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-4">换水记录</h3>
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
          </div>
        </>
      )}

      <Modal
        isOpen={paramModalOpen}
        onClose={() => setParamModalOpen(false)}
        title="记录水质参数"
        size="lg"
      >
        <form onSubmit={handleSubmitParam} className="space-y-4">
          <div>
            <label className="label">记录日期 *</label>
            <input
              type="date"
              className="input"
              value={paramForm.record_date || ''}
              onChange={e => setParamForm({ ...paramForm, record_date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">温度 (°C)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={paramForm.temperature || ''}
                onChange={e => setParamForm({ ...paramForm, temperature: parseFloat(e.target.value) || null })}
              />
            </div>
            <div>
              <label className="label">pH</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={paramForm.ph || ''}
                onChange={e => setParamForm({ ...paramForm, ph: parseFloat(e.target.value) || null })}
              />
            </div>
            <div>
              <label className="label">氨氮 (mg/L)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={paramForm.ammonia || ''}
                onChange={e => setParamForm({ ...paramForm, ammonia: parseFloat(e.target.value) || null })}
              />
            </div>
            <div>
              <label className="label">亚硝酸盐 (mg/L)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={paramForm.nitrite || ''}
                onChange={e => setParamForm({ ...paramForm, nitrite: parseFloat(e.target.value) || null })}
              />
            </div>
            <div>
              <label className="label">硝酸盐 (mg/L)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={paramForm.nitrate || ''}
                onChange={e => setParamForm({ ...paramForm, nitrate: parseFloat(e.target.value) || null })}
              />
            </div>
            <div>
              <label className="label">磷酸盐 (mg/L)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={paramForm.phosphate || ''}
                onChange={e => setParamForm({ ...paramForm, phosphate: parseFloat(e.target.value) || null })}
              />
            </div>
            <div>
              <label className="label">GH (dGH)</label>
              <input
                type="number"
                step="0.5"
                className="input"
                value={paramForm.gh || ''}
                onChange={e => setParamForm({ ...paramForm, gh: parseFloat(e.target.value) || null })}
              />
            </div>
            <div>
              <label className="label">KH (dKH)</label>
              <input
                type="number"
                step="0.5"
                className="input"
                value={paramForm.kh || ''}
                onChange={e => setParamForm({ ...paramForm, kh: parseFloat(e.target.value) || null })}
              />
            </div>
            <div>
              <label className="label">TDS (ppm)</label>
              <input
                type="number"
                className="input"
                value={paramForm.tds || ''}
                onChange={e => setParamForm({ ...paramForm, tds: parseFloat(e.target.value) || null })}
              />
            </div>
            <div>
              <label className="label">盐度 (sg)</label>
              <input
                type="number"
                step="0.001"
                className="input"
                value={paramForm.salinity || ''}
                onChange={e => setParamForm({ ...paramForm, salinity: parseFloat(e.target.value) || null })}
              />
            </div>
            <div>
              <label className="label">钙 (mg/L)</label>
              <input
                type="number"
                className="input"
                value={paramForm.calcium || ''}
                onChange={e => setParamForm({ ...paramForm, calcium: parseFloat(e.target.value) || null })}
              />
            </div>
            <div>
              <label className="label">镁 (mg/L)</label>
              <input
                type="number"
                className="input"
                value={paramForm.magnesium || ''}
                onChange={e => setParamForm({ ...paramForm, magnesium: parseFloat(e.target.value) || null })}
              />
            </div>
            <div>
              <label className="label">碱度 (dKH)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={paramForm.alkalinity || ''}
                onChange={e => setParamForm({ ...paramForm, alkalinity: parseFloat(e.target.value) || null })}
              />
            </div>
          </div>

          <div>
            <label className="label">备注</label>
            <textarea
              className="input"
              rows={2}
              value={paramForm.notes || ''}
              onChange={e => setParamForm({ ...paramForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" className="btn-secondary" onClick={() => setParamModalOpen(false)}>
              取消
            </button>
            <button type="submit" className="btn-primary">保存</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={changeModalOpen}
        onClose={() => setChangeModalOpen(false)}
        title="记录换水"
      >
        <form onSubmit={handleSubmitChange} className="space-y-4">
          <div>
            <label className="label">换水日期 *</label>
            <input
              type="date"
              className="input"
              value={changeForm.change_date || ''}
              onChange={e => setChangeForm({ ...changeForm, change_date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">换水量 (L) *</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={changeForm.volume || ''}
              onChange={e => setChangeForm({ ...changeForm, volume: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>
          <div>
            <label className="label">水类型</label>
            <input
              type="text"
              className="input"
              placeholder="如 自来水、RO水、海水等"
              value={changeForm.water_type || ''}
              onChange={e => setChangeForm({ ...changeForm, water_type: e.target.value })}
            />
          </div>
          <div>
            <label className="label">备注</label>
            <textarea
              className="input"
              rows={2}
              value={changeForm.notes || ''}
              onChange={e => setChangeForm({ ...changeForm, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" className="btn-secondary" onClick={() => setChangeModalOpen(false)}>
              取消
            </button>
            <button type="submit" className="btn-primary">保存</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
