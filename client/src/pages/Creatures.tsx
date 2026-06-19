import { useState, useEffect } from 'react';
import { aquariumApi, creatureApi } from '../api';
import type { Aquarium, Creature, CreatureRecord } from '../types';
import { CreatureCategories, RecordTypes } from '../types';
import Modal from '../components/Modal';

export default function Creatures() {
  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [selectedAquarium, setSelectedAquarium] = useState<number | null>(null);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [summary, setSummary] = useState<{ category: string; total_quantity: number; species_count: number }[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [creatureModalOpen, setCreatureModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedCreature, setSelectedCreature] = useState<Creature | null>(null);
  const [creatureRecords, setCreatureRecords] = useState<CreatureRecord[]>([]);
  const [creatureForm, setCreatureForm] = useState<Partial<Creature>>({});
  const [recordForm, setRecordForm] = useState<Partial<CreatureRecord>>({});
  const [editingCreature, setEditingCreature] = useState<Creature | null>(null);

  useEffect(() => {
    loadAquariums();
  }, []);

  useEffect(() => {
    if (selectedAquarium) {
      loadCreatures();
    }
  }, [selectedAquarium, filterCategory]);

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

  const loadCreatures = async () => {
    if (!selectedAquarium) return;
    try {
      const [cr, sum] = await Promise.all([
        creatureApi.getAll(selectedAquarium, filterCategory === 'all' ? undefined : filterCategory),
        creatureApi.getSummary(selectedAquarium),
      ]);
      setCreatures(cr);
      setSummary(sum);
    } catch (error) {
      console.error('Failed to load creatures:', error);
    }
  };

  const handleAddCreature = () => {
    setEditingCreature(null);
    setCreatureForm({
      name: '',
      category: 'fish',
      quantity: 1,
      is_high_value: 0,
    });
    setCreatureModalOpen(true);
  };

  const handleEditCreature = (c: Creature) => {
    setEditingCreature(c);
    setCreatureForm(c);
    setCreatureModalOpen(true);
  };

  const handleDeleteCreature = async (id: number) => {
    if (!confirm('确定要删除这个生物吗？')) return;
    try {
      await creatureApi.delete(id);
      loadCreatures();
    } catch (error) {
      console.error('Failed to delete creature:', error);
      alert('删除失败');
    }
  };

  const handleSubmitCreature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAquarium) return;
    try {
      if (editingCreature) {
        await creatureApi.update(editingCreature.id, creatureForm);
      } else {
        await creatureApi.create(selectedAquarium, creatureForm);
      }
      setCreatureModalOpen(false);
      loadCreatures();
    } catch (error) {
      console.error('Failed to save creature:', error);
      alert('保存失败');
    }
  };

  const handleViewRecords = async (creature: Creature) => {
    setSelectedCreature(creature);
    try {
      const records = await creatureApi.getRecords(creature.id);
      setCreatureRecords(records);
    } catch (error) {
      console.error('Failed to load records:', error);
    }
    setRecordModalOpen(true);
    setRecordForm({
      record_type: 'observation',
      record_date: new Date().toISOString().split('T')[0],
      quantity: 1,
    });
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreature) return;
    try {
      const result = await creatureApi.addRecord(selectedCreature.id, recordForm);
      setCreatureRecords([result.record, ...creatureRecords]);
      setCreatures(creatures.map(c => c.id === selectedCreature.id ? result.creature : c));
      setRecordForm({
        record_type: 'observation',
        record_date: new Date().toISOString().split('T')[0],
        quantity: 1,
      });
      loadCreatures();
    } catch (error) {
      console.error('Failed to add record:', error);
      alert('添加失败');
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      const result = await creatureApi.deleteRecord(recordId);
      setCreatureRecords(creatureRecords.filter(r => r.id !== recordId));
      if (selectedCreature) {
        setCreatures(creatures.map(c => c.id === selectedCreature.id ? result.creature : c));
      }
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('删除失败');
    }
  };

  const getCategoryLabel = (cat: string) => {
    const found = CreatureCategories.find(c => c.value === cat);
    return found ? found.label : cat;
  };

  const getRecordTypeLabel = (type: string) => {
    const found = RecordTypes.find(r => r.value === type);
    return found ? found.label : type;
  };

  const totalQuantity = creatures.reduce((sum, c) => sum + c.quantity, 0);
  const totalSpecies = creatures.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">生物管理</h2>
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
        <button className="btn-primary" onClick={handleAddCreature}>
          + 添加生物
        </button>
      </div>

      {!selectedAquarium ? (
        <div className="card text-center py-12 text-gray-500">请先选择一个鱼缸</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="card p-4">
              <p className="text-sm text-gray-500">总数量</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuantity}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">物种数</p>
              <p className="text-2xl font-bold text-gray-900">{totalSpecies}</p>
            </div>
            {summary.map(s => (
              <div key={s.category} className="card p-4">
                <p className="text-sm text-gray-500">{getCategoryLabel(s.category)}</p>
                <p className="text-2xl font-bold text-primary-600">{s.total_quantity}</p>
                <p className="text-xs text-gray-400">{s.species_count} 种</p>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterCategory === 'all'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                全部
              </button>
              {CreatureCategories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setFilterCategory(cat.value)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filterCategory === cat.value
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creatures.map(c => (
              <div key={c.id} className="card p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{c.name}</h4>
                    <p className="text-sm text-gray-500">{c.species || getCategoryLabel(c.category)}</p>
                  </div>
                  <div className="flex gap-1">
                    {c.is_high_value ? <span className="badge-warning">高价值</span> : null}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-3xl font-bold text-primary-600">{c.quantity} <span className="text-base font-normal text-gray-500">只</span></p>
                  {c.add_date && (
                    <p className="text-xs text-gray-400 mt-1">入缸日期: {c.add_date}</p>
                  )}
                </div>

                {c.notes && (
                  <p className="text-sm text-gray-500 mt-3 line-clamp-2">{c.notes}</p>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleViewRecords(c)}
                    className="flex-1 text-sm btn-secondary py-1.5"
                  >
                    记录档案
                  </button>
                  <button
                    onClick={() => handleEditCreature(c)}
                    className="px-3 py-1.5 text-sm btn-secondary"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDeleteCreature(c.id)}
                    className="px-3 py-1.5 text-sm btn-danger"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}

            {creatures.length === 0 && (
              <div className="col-span-full text-center py-12 card">
                <div className="text-4xl mb-3">🐟</div>
                <p className="text-gray-500 mb-4">暂无生物记录</p>
                <button className="btn-primary" onClick={handleAddCreature}>
                  添加第一个生物
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={creatureModalOpen}
        onClose={() => setCreatureModalOpen(false)}
        title={editingCreature ? '编辑生物' : '添加生物'}
        size="md"
      >
        <form onSubmit={handleSubmitCreature} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">名称/品种名 *</label>
              <input
                type="text"
                className="input"
                value={creatureForm.name || ''}
                onChange={e => setCreatureForm({ ...creatureForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">类别 *</label>
              <select
                className="input"
                value={creatureForm.category || 'fish'}
                onChange={e => setCreatureForm({ ...creatureForm, category: e.target.value })}
                required
              >
                {CreatureCategories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">学名/详细品种</label>
              <input
                type="text"
                className="input"
                value={creatureForm.species || ''}
                onChange={e => setCreatureForm({ ...creatureForm, species: e.target.value })}
              />
            </div>
            <div>
              <label className="label">数量</label>
              <input
                type="number"
                min="1"
                className="input"
                value={creatureForm.quantity || 1}
                onChange={e => setCreatureForm({ ...creatureForm, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">入缸日期</label>
              <input
                type="date"
                className="input"
                value={creatureForm.add_date || ''}
                onChange={e => setCreatureForm({ ...creatureForm, add_date: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!creatureForm.is_high_value}
                  onChange={e => setCreatureForm({ ...creatureForm, is_high_value: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4"
                />
                <span className="text-sm">高价值生物（单独建档）</span>
              </label>
            </div>
          </div>

          <div>
            <label className="label">备注</label>
            <textarea
              className="input"
              rows={3}
              value={creatureForm.notes || ''}
              onChange={e => setCreatureForm({ ...creatureForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" className="btn-secondary" onClick={() => setCreatureModalOpen(false)}>
              取消
            </button>
            <button type="submit" className="btn-primary">保存</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        title={`${selectedCreature?.name || ''} - 档案记录`}
        size="xl"
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">添加新记录</h4>
            <form onSubmit={handleAddRecord} className="grid grid-cols-4 gap-3">
              <div>
                <label className="label text-xs">记录类型</label>
                <select
                  className="input text-sm py-1"
                  value={recordForm.record_type || 'observation'}
                  onChange={e => setRecordForm({ ...recordForm, record_type: e.target.value })}
                >
                  {RecordTypes.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">日期</label>
                <input
                  type="date"
                  className="input text-sm py-1"
                  value={recordForm.record_date || ''}
                  onChange={e => setRecordForm({ ...recordForm, record_date: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-xs">数量</label>
                <input
                  type="number"
                  min="1"
                  className="input text-sm py-1"
                  value={recordForm.quantity || 1}
                  onChange={e => setRecordForm({ ...recordForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="label text-xs">体长 (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input text-sm py-1"
                  value={recordForm.length || ''}
                  onChange={e => setRecordForm({ ...recordForm, length: parseFloat(e.target.value) || null })}
                />
              </div>
              <div className="col-span-3">
                <label className="label text-xs">描述</label>
                <input
                  type="text"
                  className="input text-sm py-1"
                  value={recordForm.description || ''}
                  onChange={e => setRecordForm({ ...recordForm, description: e.target.value })}
                  placeholder="观察记录、行为描述等"
                />
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn-primary w-full">添加</button>
              </div>
            </form>
          </div>

          <div>
            <h4 className="font-medium mb-3">历史记录</h4>
            <div className="table-container max-h-64 overflow-y-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>类型</th>
                    <th>数量</th>
                    <th>体长</th>
                    <th>描述</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {creatureRecords.map(r => (
                    <tr key={r.id}>
                      <td>{r.record_date}</td>
                      <td>
                        <span className={`badge ${
                          r.record_type === 'death' ? 'badge-danger' :
                          r.record_type === 'birth' ? 'badge-success' :
                          'badge-secondary'
                        }`}>
                          {getRecordTypeLabel(r.record_type)}
                        </span>
                      </td>
                      <td>{r.quantity || '-'}</td>
                      <td>{r.length ? `${r.length}cm` : '-'}</td>
                      <td className="max-w-xs truncate">{r.description || '-'}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteRecord(r.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {creatureRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-gray-500 text-sm">
                        暂无记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
