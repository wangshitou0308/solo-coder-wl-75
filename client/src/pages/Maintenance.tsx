import { useState, useEffect } from 'react';
import { aquariumApi, maintenanceApi } from '../api';
import type { Aquarium, Maintenance } from '../types';
import { MaintenanceTypes } from '../types';
import Modal from '../components/Modal';

export default function Maintenance() {
  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [selectedAquarium, setSelectedAquarium] = useState<number | null>(null);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [upcoming, setUpcoming] = useState<Maintenance[]>([]);
  const [overdue, setOverdue] = useState<Maintenance[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Maintenance>>({});
  const [filterType, setFilterType] = useState<string>('all');

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
      const [m, up] = await Promise.all([
        maintenanceApi.getAll(selectedAquarium),
        maintenanceApi.getUpcoming(selectedAquarium),
      ]);
      setMaintenances(m);
      setUpcoming(up.upcoming);
      setOverdue(up.overdue);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleAdd = () => {
    setFormData({
      maintenance_type: 'filter_change',
      maintenance_date: new Date().toISOString().split('T')[0],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAquarium) return;
    try {
      await maintenanceApi.create(selectedAquarium, formData);
      setModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to add maintenance:', error);
      alert('添加失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条维护记录吗？')) return;
    try {
      await maintenanceApi.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete maintenance:', error);
      alert('删除失败');
    }
  };

  const getTypeLabel = (type: string) => {
    const found = MaintenanceTypes.find(m => m.value === type);
    return found ? found.label : type;
  };

  const filteredMaintenances = filterType === 'all'
    ? maintenances
    : maintenances.filter(m => m.maintenance_type === filterType);

  const isOverdue = (nextDate: string | null | undefined) => {
    if (!nextDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return nextDate < today;
  };

  const isSoon = (nextDate: string | null | undefined) => {
    if (!nextDate) return false;
    const today = new Date();
    const next = new Date(nextDate);
    const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  const daysUntil = (date: string) => {
    const today = new Date();
    const target = new Date(date);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">设备维护</h2>
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
          + 记录维护
        </button>
      </div>

      {!selectedAquarium ? (
        <div className="card text-center py-12 text-gray-500">请先选择一个鱼缸</div>
      ) : (
        <>
          {(overdue.length > 0 || upcoming.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overdue.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                    <span>🔴</span>
                    逾期维护 ({overdue.length}项)
                  </h4>
                  <ul className="space-y-2">
                    {overdue.slice(0, 5).map(m => (
                      <li key={m.id} className="flex justify-between items-center text-sm text-red-700">
                        <span>{getTypeLabel(m.maintenance_type)}</span>
                        <span className="font-medium">
                          已逾期 {Math.abs(daysUntil(m.next_maintenance_date!))} 天
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {upcoming.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                    <span>🟡</span>
                    即将到期 ({upcoming.length}项)
                  </h4>
                  <ul className="space-y-2">
                    {upcoming.slice(0, 5).map(m => (
                      <li key={m.id} className="flex justify-between items-center text-sm text-amber-700">
                        <span>{getTypeLabel(m.maintenance_type)}</span>
                        <span className="font-medium">
                          {daysUntil(m.next_maintenance_date!)} 天后
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-sm text-gray-500">总维护记录</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{maintenances.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">逾期</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{overdue.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">待处理</p>
              <p className="text-2xl font-bold text-amber-600 mt-2">{upcoming.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">维护类型</p>
              <p className="text-2xl font-bold text-primary-600 mt-2">
                {new Set(maintenances.map(m => m.maintenance_type)).size}
              </p>
            </div>
          </div>

          <div className="card">
            <div className="border-b px-6 py-3">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  全部
                </button>
                {MaintenanceTypes.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setFilterType(t.value)}
                    className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                      filterType === t.value
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>维护类型</th>
                    <th>维护日期</th>
                    <th>描述</th>
                    <th>提醒周期</th>
                    <th>下次维护</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaintenances.map(m => (
                    <tr key={m.id}>
                      <td>
                        <span className="badge-info">{getTypeLabel(m.maintenance_type)}</span>
                      </td>
                      <td>{m.maintenance_date}</td>
                      <td className="max-w-xs truncate">{m.description || '-'}</td>
                      <td>{m.reminder_days ? `${m.reminder_days} 天` : '-'}</td>
                      <td>{m.next_maintenance_date || '-'}</td>
                      <td>
                        {m.next_maintenance_date && isOverdue(m.next_maintenance_date) ? (
                          <span className="badge-danger">已逾期</span>
                        ) : m.next_maintenance_date && isSoon(m.next_maintenance_date) ? (
                          <span className="badge-warning">即将到期</span>
                        ) : m.next_maintenance_date ? (
                          <span className="badge-success">正常</span>
                        ) : (
                          <span className="badge-secondary">无提醒</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMaintenances.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        暂无维护记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="记录设备维护">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">维护类型 *</label>
              <select
                className="input"
                value={formData.maintenance_type || 'filter_change'}
                onChange={e => setFormData({ ...formData, maintenance_type: e.target.value })}
                required
              >
                {MaintenanceTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">维护日期 *</label>
              <input
                type="date"
                className="input"
                value={formData.maintenance_date || ''}
                onChange={e => setFormData({ ...formData, maintenance_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">维护描述</label>
            <textarea
              className="input"
              rows={2}
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="描述维护内容"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">提醒周期 (天)</label>
              <input
                type="number"
                min="1"
                className="input"
                placeholder="留空表示不提醒"
                value={formData.reminder_days || ''}
                onChange={e => setFormData({ ...formData, reminder_days: e.target.value ? parseInt(e.target.value) : null })}
              />
              <p className="text-xs text-gray-500 mt-1">设置后会自动计算下次维护日期</p>
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
