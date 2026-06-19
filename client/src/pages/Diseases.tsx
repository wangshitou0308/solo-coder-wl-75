import { useState, useEffect } from 'react';
import { aquariumApi, diseaseApi, creatureApi } from '../api';
import type { Aquarium, Disease, Creature } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from '../components/Modal';

export default function Diseases() {
  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [selectedAquarium, setSelectedAquarium] = useState<number | null>(null);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState<Disease | null>(null);
  const [formData, setFormData] = useState<Partial<Disease>>({});
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'cured'>('all');

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
    try {
      const [d, c] = await Promise.all([
        diseaseApi.getAll(selectedAquarium),
        creatureApi.getAll(selectedAquarium),
      ]);
      setDiseases(d);
      setCreatures(c);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleAdd = () => {
    setEditingDisease(null);
    setFormData({
      start_date: new Date().toISOString().split('T')[0],
      diagnosis: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (d: Disease) => {
    setEditingDisease(d);
    setFormData(d);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条医疗记录吗？')) return;
    try {
      await diseaseApi.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete disease:', error);
      alert('删除失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAquarium) return;
    try {
      if (editingDisease) {
        await diseaseApi.update(editingDisease.id, formData);
      } else {
        await diseaseApi.create(selectedAquarium, formData);
      }
      setModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to save disease:', error);
      alert('保存失败');
    }
  };

  const filteredDiseases = diseases.filter(d => {
    if (filterStatus === 'active') return !d.end_date;
    if (filterStatus === 'cured') return !!d.end_date;
    return true;
  });

  const activeCount = diseases.filter(d => !d.end_date).length;
  const curedCount = diseases.filter(d => d.end_date && d.result === '治愈').length;

  const monthlyData = diseases.reduce((acc: { [key: string]: number }, d) => {
    const month = d.start_date.substring(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(monthlyData)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const getCreatureName = (creatureId: number | null | undefined) => {
    if (!creatureId) return '全缸';
    const c = creatures.find(cr => cr.id === creatureId);
    return c ? c.name : '未知';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">鱼病医疗</h2>
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
        <button className="btn-primary" onClick={handleAdd}>
          + 记录病害
        </button>
      </div>

      {!selectedAquarium ? (
        <div className="card text-center py-12 text-gray-500">请先选择一个鱼缸</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-6">
              <p className="text-sm text-gray-500">总病害数</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{diseases.length}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-gray-500">治疗中</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">{activeCount}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-gray-500">已治愈</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{curedCount}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-gray-500">治愈率</p>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                {diseases.length > 0 ? `${((curedCount / diseases.length) * 100).toFixed(0)}%` : '-'}
              </p>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-4">病害发生趋势</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="病害数"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="border-b px-6 py-3">
              <div className="flex gap-2">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'active', label: '治疗中' },
                  { key: 'cured', label: '已治愈' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key as any)}
                    className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                      filterStatus === tab.key
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>发病日期</th>
                    <th>患病生物</th>
                    <th>诊断</th>
                    <th>症状</th>
                    <th>用药</th>
                    <th>状态</th>
                    <th>结果</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDiseases.map(d => (
                    <tr key={d.id}>
                      <td>{d.start_date}</td>
                      <td>{getCreatureName(d.creature_id)}</td>
                      <td className="font-medium">{d.diagnosis}</td>
                      <td className="max-w-xs truncate">{d.symptoms || '-'}</td>
                      <td className="max-w-xs truncate">{d.medication || '-'}</td>
                      <td>
                        {d.end_date ? (
                          <span className="badge-success">已结束</span>
                        ) : (
                          <span className="badge-warning">治疗中</span>
                        )}
                      </td>
                      <td>
                        {d.result === '治愈' ? (
                          <span className="text-emerald-600">治愈</span>
                        ) : d.result === '死亡' ? (
                          <span className="text-red-600">死亡</span>
                        ) : d.result ? (
                          d.result
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(d)}
                            className="text-primary-600 hover:text-primary-800 text-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDiseases.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        暂无病害记录
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
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDisease ? '编辑病害记录' : '记录病害'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">患病生物</label>
              <select
                className="input"
                value={formData.creature_id || ''}
                onChange={e => setFormData({ ...formData, creature_id: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">全缸</option>
                {creatures.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">发病日期 *</label>
              <input
                type="date"
                className="input"
                value={formData.start_date || ''}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">诊断结果 *</label>
            <input
              type="text"
              className="input"
              placeholder="如 白点病、烂尾病、水霉病等"
              value={formData.diagnosis || ''}
              onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">症状描述</label>
            <textarea
              className="input"
              rows={2}
              value={formData.symptoms || ''}
              onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
              placeholder="描述发病症状"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">用药</label>
              <input
                type="text"
                className="input"
                value={formData.medication || ''}
                onChange={e => setFormData({ ...formData, medication: e.target.value })}
              />
            </div>
            <div>
              <label className="label">剂量</label>
              <input
                type="text"
                className="input"
                value={formData.dosage || ''}
                onChange={e => setFormData({ ...formData, dosage: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">结束日期</label>
              <input
                type="date"
                className="input"
                value={formData.end_date || ''}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">治疗结果</label>
              <select
                className="input"
                value={formData.result || ''}
                onChange={e => setFormData({ ...formData, result: e.target.value || null })}
              >
                <option value="">未结束</option>
                <option value="治愈">治愈</option>
                <option value="好转">好转</option>
                <option value="死亡">死亡</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">备注</label>
            <textarea
              className="input"
              rows={2}
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              取消
            </button>
            <button type="submit" className="btn-primary">保存</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
