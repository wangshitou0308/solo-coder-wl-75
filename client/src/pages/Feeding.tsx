import { useState, useEffect } from 'react';
import { aquariumApi, feedingApi } from '../api';
import type { Aquarium, Feeding } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Modal from '../components/Modal';

export default function Feeding() {
  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [selectedAquarium, setSelectedAquarium] = useState<number | null>(null);
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [foodStats, setFoodStats] = useState<{ food_type: string; feed_count: number; total_amount: number }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Feeding>>({});

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
      const [f, stats] = await Promise.all([
        feedingApi.getAll(selectedAquarium),
        feedingApi.getFoodStats(selectedAquarium),
      ]);
      setFeedings(f);
      setFoodStats(stats);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleAdd = () => {
    setFormData({
      feed_date: new Date().toISOString().split('T')[0],
      food_type: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAquarium) return;
    try {
      await feedingApi.create(selectedAquarium, formData);
      setModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to add feeding:', error);
      alert('添加失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await feedingApi.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete feeding:', error);
      alert('删除失败');
    }
  };

  const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const pieData = foodStats.map((s, i) => ({
    name: s.food_type,
    value: s.feed_count,
    fill: COLORS[i % COLORS.length],
  }));

  const totalFeedings = feedings.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">喂食记录</h2>
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
          + 记录喂食
        </button>
      </div>

      {!selectedAquarium ? (
        <div className="card text-center py-12 text-gray-500">请先选择一个鱼缸</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-6">
              <p className="text-sm text-gray-500">喂食总次数</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalFeedings}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-gray-500">饲料种类</p>
              <p className="text-3xl font-bold text-primary-600 mt-2">{foodStats.length}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-gray-500">最常用饲料</p>
              <p className="text-xl font-bold text-emerald-600 mt-2">
                {foodStats[0]?.food_type || '-'}
              </p>
              <p className="text-sm text-gray-500">{foodStats[0]?.feed_count || 0} 次</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-semibold mb-4">饲料使用频率</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={foodStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="food_type" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="feed_count" name="喂食次数" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold mb-4">饲料占比</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-4">喂食记录</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>饲料种类</th>
                    <th>喂食量</th>
                    <th>备注</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {feedings.map(f => (
                    <tr key={f.id}>
                      <td>{f.feed_date}</td>
                      <td>
                        <span className="badge-info">{f.food_type}</span>
                      </td>
                      <td>{f.amount ? `${f.amount}g` : '-'}</td>
                      <td>{f.notes || '-'}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {feedings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        暂无喂食记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="记录喂食">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">喂食日期 *</label>
            <input
              type="date"
              className="input"
              value={formData.feed_date || ''}
              onChange={e => setFormData({ ...formData, feed_date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">饲料种类 *</label>
            <input
              type="text"
              className="input"
              placeholder="如 颗粒饲料、红虫、丰年虾等"
              value={formData.food_type || ''}
              onChange={e => setFormData({ ...formData, food_type: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">喂食量 (g)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={formData.amount || ''}
              onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || null })}
            />
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
