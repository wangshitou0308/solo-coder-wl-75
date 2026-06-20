import { useState, useEffect } from 'react';
import { aquariumApi, inventoryApi } from '../api';
import type { Aquarium, InventoryItem, InventoryPurchase } from '../types';
import { InventoryCategories } from '../types';
import Modal from '../components/Modal';

export default function Inventory() {
  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<InventoryItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAquarium, setFilterAquarium] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseHistoryOpen, setPurchaseHistoryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [purchaseForm, setPurchaseForm] = useState<Partial<InventoryPurchase>>({});
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadItems();
  }, [filterCategory, filterAquarium]);

  const loadData = async () => {
    try {
      const [aqData, alerts] = await Promise.all([
        aquariumApi.getAll(),
        inventoryApi.getAlerts(),
      ]);
      setAquariums(aqData);
      setLowStockAlerts(alerts);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadItems = async () => {
    try {
      const params: any = {};
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterAquarium !== 'all') params.aquarium_id = parseInt(filterAquarium);
      const data = await inventoryApi.getAll(params);
      setItems(data);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      category: 'fish_food',
      current_quantity: 0,
      unit: 'g',
    });
    setModalOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      current_quantity: item.current_quantity,
      unit: item.unit,
      aquarium_id: item.aquarium_id,
      low_stock_threshold: item.low_stock_threshold,
      estimated_daily_usage: item.estimated_daily_usage,
      notes: item.notes,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await inventoryApi.update(editingItem.id, formData);
      } else {
        await inventoryApi.create(formData);
      }
      setModalOpen(false);
      loadItems();
      loadData();
    } catch (error) {
      console.error('Failed to save item:', error);
      alert('保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个物资吗？')) return;
    try {
      await inventoryApi.delete(id);
      loadItems();
      loadData();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('删除失败');
    }
  };

  const handlePurchase = (item: InventoryItem) => {
    setSelectedItem(item);
    setPurchaseForm({
      purchase_date: new Date().toISOString().split('T')[0],
      quantity: 0,
      unit_price: null,
      supplier: '',
    });
    setPurchaseModalOpen(true);
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await inventoryApi.addPurchase(selectedItem.id, purchaseForm);
      setPurchaseModalOpen(false);
      loadItems();
      loadData();
    } catch (error) {
      console.error('Failed to add purchase:', error);
      alert('添加失败');
    }
  };

  const handleViewPurchases = async (item: InventoryItem) => {
    setSelectedItem(item);
    try {
      const data = await inventoryApi.getPurchases(item.id);
      setPurchases(data);
      setPurchaseHistoryOpen(true);
    } catch (error) {
      console.error('Failed to load purchases:', error);
    }
  };

  const getCategoryLabel = (cat: string) => {
    const found = InventoryCategories.find(c => c.value === cat);
    return found ? found.label : cat;
  };

  const getCategoryIcon = (cat: string) => {
    const icons: Record<string, string> = {
      fish_food: '🍽️', water_reagent: '🧪', filter_media: '🔧',
      medicine: '💊', sea_salt: '🧂', fertilizer: '🌱',
      co2_supply: '💨', other: '📦',
    };
    return icons[cat] || '📦';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">库存管理</h2>
        <button className="btn-primary" onClick={handleAdd}>
          + 添加物资
        </button>
      </div>

      {lowStockAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
            <span>⚠️</span> 低库存预警 ({lowStockAlerts.length}项)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStockAlerts.slice(0, 6).map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white rounded-md px-3 py-2 text-sm">
                <span className="font-medium text-red-700">
                  {getCategoryIcon(item.category)} {item.name}
                </span>
                <span className="text-red-600">
                  {item.current_quantity}{item.unit}
                  {item.estimated_days_remaining !== null && item.estimated_days_remaining !== undefined && (
                    <span className="text-xs ml-1">(约{item.estimated_days_remaining}天)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select
          className="input w-auto"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="all">全部类别</option>
          {InventoryCategories.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={filterAquarium}
          onChange={e => setFilterAquarium(e.target.value)}
        >
          <option value="all">全部鱼缸</option>
          {aquariums.map(aq => (
            <option key={aq.id} value={aq.id}>{aq.name}</option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">📦</p>
          <p>暂无库存记录</p>
          <p className="text-sm mt-1">点击"添加物资"开始管理您的库存</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className={`card p-4 ${item.is_low_stock ? 'border-red-300' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getCategoryIcon(item.category)}</span>
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-xs text-gray-500">{getCategoryLabel(item.category)}</p>
                  </div>
                </div>
                {item.is_low_stock && (
                  <span className="badge-danger text-xs">低库存</span>
                )}
              </div>

              <div className="mt-3">
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-bold text-gray-900">{item.current_quantity}</span>
                  <span className="text-sm text-gray-500 mb-1">{item.unit}</span>
                </div>
                {item.low_stock_threshold && (
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          item.is_low_stock ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (item.current_quantity / item.low_stock_threshold) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      预警线: {item.low_stock_threshold}{item.unit}
                    </p>
                  </div>
                )}
                {item.estimated_days_remaining !== null && item.estimated_days_remaining !== undefined && (
                  <p className={`text-xs mt-1 ${
                    item.estimated_days_remaining < 7 ? 'text-red-600' :
                    item.estimated_days_remaining < 30 ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    预计可用 {item.estimated_days_remaining} 天
                  </p>
                )}
                {item.aquarium_name && (
                  <p className="text-xs text-gray-400 mt-1">鱼缸: {item.aquarium_name}</p>
                )}
              </div>

              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  onClick={() => handlePurchase(item)}
                  className="text-xs px-3 py-1 bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200"
                >
                  采购入库
                </button>
                <button
                  onClick={() => handleViewPurchases(item)}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                >
                  采购记录
                </button>
                <button
                  onClick={() => handleEdit(item)}
                  className="text-xs px-2 py-1 text-primary-600 hover:text-primary-800"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs px-2 py-1 text-red-500 hover:text-red-700"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? '编辑物资' : '添加物资'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">物资名称 *</label>
              <input
                type="text"
                className="input"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">类别 *</label>
              <select
                className="input"
                value={formData.category || 'fish_food'}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                required
              >
                {InventoryCategories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">当前数量 *</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.current_quantity || 0}
                onChange={e => setFormData({ ...formData, current_quantity: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <label className="label">单位 *</label>
              <input
                type="text"
                className="input"
                value={formData.unit || ''}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                placeholder="如 g、mL、片、瓶"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">所属鱼缸</label>
              <select
                className="input"
                value={formData.aquarium_id || ''}
                onChange={e => setFormData({ ...formData, aquarium_id: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">通用</option>
                {aquariums.map(aq => (
                  <option key={aq.id} value={aq.id}>{aq.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">低库存预警</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.low_stock_threshold || ''}
                onChange={e => setFormData({ ...formData, low_stock_threshold: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="留空不预警"
              />
            </div>
          </div>

          <div>
            <label className="label">日均消耗量</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.estimated_daily_usage || ''}
              onChange={e => setFormData({ ...formData, estimated_daily_usage: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="用于预估剩余可用天数"
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

      <Modal isOpen={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} title={`采购入库 - ${selectedItem?.name || ''}`}>
        <form onSubmit={handleSubmitPurchase} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">采购日期 *</label>
              <input
                type="date"
                className="input"
                value={purchaseForm.purchase_date || ''}
                onChange={e => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">采购数量 *</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={purchaseForm.quantity || ''}
                onChange={e => setPurchaseForm({ ...purchaseForm, quantity: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">单价</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={purchaseForm.unit_price || ''}
                onChange={e => setPurchaseForm({ ...purchaseForm, unit_price: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
            <div>
              <label className="label">供应商</label>
              <input
                type="text"
                className="input"
                value={purchaseForm.supplier || ''}
                onChange={e => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">备注</label>
            <textarea
              className="input"
              rows={2}
              value={purchaseForm.notes || ''}
              onChange={e => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" className="btn-secondary" onClick={() => setPurchaseModalOpen(false)}>
              取消
            </button>
            <button type="submit" className="btn-primary">确认入库</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={purchaseHistoryOpen} onClose={() => setPurchaseHistoryOpen(false)} title={`采购记录 - ${selectedItem?.name || ''}`}>
        {purchases.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无采购记录</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>数量</th>
                  <th>单价</th>
                  <th>供应商</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id}>
                    <td>{p.purchase_date}</td>
                    <td>{p.quantity}{selectedItem?.unit}</td>
                    <td>{p.unit_price ? `¥${p.unit_price}` : '-'}</td>
                    <td>{p.supplier || '-'}</td>
                    <td>{p.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
