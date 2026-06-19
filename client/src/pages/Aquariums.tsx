import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { aquariumApi } from '../api';
import { AquariumTypes } from '../types';
import type { Aquarium } from '../types';
import Modal from '../components/Modal';

export default function Aquariums() {
  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAquarium, setEditingAquarium] = useState<Aquarium | null>(null);
  const [formData, setFormData] = useState<Partial<Aquarium>>({});

  useEffect(() => {
    loadAquariums();
  }, []);

  const loadAquariums = async () => {
    try {
      const data = await aquariumApi.getAll();
      setAquariums(data);
    } catch (error) {
      console.error('Failed to load aquariums:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingAquarium(null);
    setFormData({
      name: '',
      type: 'freshwater_planted',
    });
    setModalOpen(true);
  };

  const handleEdit = (aq: Aquarium) => {
    setEditingAquarium(aq);
    setFormData(aq);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个鱼缸吗？相关的所有记录都将被删除。')) return;
    try {
      await aquariumApi.delete(id);
      setAquariums(aquariums.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete aquarium:', error);
      alert('删除失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAquarium) {
        await aquariumApi.update(editingAquarium.id, formData);
      } else {
        await aquariumApi.create(formData);
      }
      setModalOpen(false);
      loadAquariums();
    } catch (error) {
      console.error('Failed to save aquarium:', error);
      alert('保存失败');
    }
  };

  const getTypeLabel = (type: string) => {
    const found = AquariumTypes.find(t => t.value === type);
    return found ? found.label : type;
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">鱼缸档案管理</h2>
        <button className="btn-primary" onClick={handleAdd}>
          + 添加鱼缸
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {aquariums.map(aq => (
          <div key={aq.id} className="card hover:shadow-lg transition-shadow">
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{aq.name}</h3>
                  <span className="badge-info mt-1">{getTypeLabel(aq.type)}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                {aq.volume && <p>容积: {aq.volume}L</p>}
                {aq.size && <p>尺寸: {aq.size}</p>}
                {aq.setup_date && <p>开缸日期: {aq.setup_date}</p>}
                <p>生物数量: {aq.creature_count || 0} 只</p>
                <p>检测记录: {aq.param_count || 0} 条</p>
              </div>

              <div className="mt-4 flex gap-2">
                <Link
                  to={`/aquariums/${aq.id}`}
                  className="flex-1 text-center py-2 text-sm btn-secondary"
                >
                  查看详情
                </Link>
                <button
                  onClick={() => handleEdit(aq)}
                  className="px-3 py-2 text-sm btn-secondary"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(aq.id)}
                  className="px-3 py-2 text-sm btn-danger"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}

        {aquariums.length === 0 && (
          <div className="col-span-full text-center py-12 card">
            <div className="text-4xl mb-3">🐠</div>
            <p className="text-gray-500 mb-4">还没有鱼缸档案</p>
            <button className="btn-primary" onClick={handleAdd}>
              添加第一个鱼缸
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAquarium ? '编辑鱼缸' : '添加鱼缸'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">鱼缸名称 *</label>
              <input
                type="text"
                className="input"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">鱼缸类型 *</label>
              <select
                className="input"
                value={formData.type || ''}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                required
              >
                {AquariumTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">尺寸规格</label>
              <input
                type="text"
                className="input"
                placeholder="如 60x40x40cm"
                value={formData.size || ''}
                onChange={e => setFormData({ ...formData, size: e.target.value })}
              />
            </div>
            <div>
              <label className="label">容积 (L)</label>
              <input
                type="number"
                className="input"
                value={formData.volume || ''}
                onChange={e => setFormData({ ...formData, volume: parseFloat(e.target.value) || null })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">开缸日期</label>
              <input
                type="date"
                className="input"
                value={formData.setup_date || ''}
                onChange={e => setFormData({ ...formData, setup_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">底床类型</label>
              <input
                type="text"
                className="input"
                placeholder="如水草泥、陶粒、珊瑚沙等"
                value={formData.substrate || ''}
                onChange={e => setFormData({ ...formData, substrate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">过滤系统</label>
              <input
                type="text"
                className="input"
                value={formData.filter_system || ''}
                onChange={e => setFormData({ ...formData, filter_system: e.target.value })}
              />
            </div>
            <div>
              <label className="label">灯光系统</label>
              <input
                type="text"
                className="input"
                value={formData.lighting_system || ''}
                onChange={e => setFormData({ ...formData, lighting_system: e.target.value })}
              />
            </div>
            <div>
              <label className="label">CO2设备</label>
              <input
                type="text"
                className="input"
                value={formData.co2_system || ''}
                onChange={e => setFormData({ ...formData, co2_system: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">备注</label>
            <textarea
              className="input"
              rows={3}
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              取消
            </button>
            <button type="submit" className="btn-primary">
              保存
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
