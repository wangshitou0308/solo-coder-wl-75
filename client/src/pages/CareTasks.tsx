import { useState, useEffect } from 'react';
import { aquariumApi, careTaskApi } from '../api';
import type { Aquarium, CareTask } from '../types';
import { CareTaskTypes } from '../types';
import Modal from '../components/Modal';

export default function CareTasks() {
  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [selectedAquarium, setSelectedAquarium] = useState<number | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [todayTasks, setTodayTasks] = useState<{ overdue: CareTask[]; dueToday: CareTask[] }>({ overdue: [], dueToday: [] });
  const [modalOpen, setModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<CareTask | null>(null);
  const [formData, setFormData] = useState<Partial<CareTask>>({});
  const [completeData, setCompleteData] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'today' | 'plans'>('today');

  useEffect(() => {
    loadAquariums();
    loadTodayTasks();
  }, []);

  useEffect(() => {
    if (selectedAquarium) {
      loadTasks();
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

  const loadTodayTasks = async () => {
    try {
      const data = await careTaskApi.getToday();
      setTodayTasks(data);
    } catch (error) {
      console.error('Failed to load today tasks:', error);
    }
  };

  const loadTasks = async () => {
    if (!selectedAquarium) return;
    try {
      const data = await careTaskApi.getByAquarium(selectedAquarium);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleAdd = () => {
    setFormData({
      task_type: 'water_change',
      cycle_days: 7,
      next_due_date: new Date().toISOString().split('T')[0],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAquarium) return;
    try {
      await careTaskApi.create(selectedAquarium, formData);
      setModalOpen(false);
      loadTasks();
      loadTodayTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('添加失败');
    }
  };

  const handleCompleteClick = (task: CareTask) => {
    setActiveTask(task);
    setCompleteData({});
    setCompleteModalOpen(true);
  };

  const handleComplete = async () => {
    if (!activeTask) return;
    try {
      await careTaskApi.complete(activeTask.id, completeData);
      setCompleteModalOpen(false);
      setActiveTask(null);
      loadTasks();
      loadTodayTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert('操作失败');
    }
  };

  const handleSkip = async (id: number) => {
    try {
      await careTaskApi.skip(id);
      loadTasks();
      loadTodayTasks();
    } catch (error) {
      console.error('Failed to skip task:', error);
      alert('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个养护计划吗？')) return;
    try {
      await careTaskApi.delete(id);
      loadTasks();
      loadTodayTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('删除失败');
    }
  };

  const getTaskLabel = (type: string) => {
    const found = CareTaskTypes.find(t => t.value === type);
    return found ? found.label : type;
  };

  const getTaskIcon = (type: string) => {
    const found = CareTaskTypes.find(t => t.value === type);
    return found ? found.icon : '📋';
  };

  const getStatusBadge = (task: CareTask) => {
    const today = new Date().toISOString().split('T')[0];
    if (task.next_due_date < today && task.status === 'pending') {
      return <span className="badge-danger">已逾期</span>;
    }
    if (task.next_due_date === today && task.status === 'pending') {
      return <span className="badge-warning">今日待办</span>;
    }
    switch (task.status) {
      case 'completed': return <span className="badge-success">已完成</span>;
      case 'skipped': return <span className="badge-secondary">已跳过</span>;
      default: return <span className="badge-info">待完成</span>;
    }
  };

  const daysUntilDue = (date: string) => {
    const today = new Date();
    const target = new Date(date);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const allTodayTasks = [...todayTasks.overdue, ...todayTasks.dueToday];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">养护任务</h2>
        <button className="btn-primary" onClick={handleAdd}>
          + 新建计划
        </button>
      </div>

      <div className="card">
        <div className="border-b">
          <nav className="flex">
            {[
              { key: 'today', label: `今日待办 (${allTodayTasks.length})` },
              { key: 'plans', label: '养护计划' },
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
      </div>

      {activeTab === 'today' && (
        <div className="space-y-4">
          {todayTasks.overdue.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                <span>🔴</span> 逾期任务 ({todayTasks.overdue.length})
              </h3>
              <div className="space-y-2">
                {todayTasks.overdue.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    getTaskLabel={getTaskLabel}
                    getTaskIcon={getTaskIcon}
                    getStatusBadge={getStatusBadge}
                    daysUntilDue={daysUntilDue}
                    onComplete={handleCompleteClick}
                    onSkip={handleSkip}
                    onDelete={handleDelete}
                    overdue
                  />
                ))}
              </div>
            </div>
          )}

          {todayTasks.dueToday.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <span>🟡</span> 今日待办 ({todayTasks.dueToday.length})
              </h3>
              <div className="space-y-2">
                {todayTasks.dueToday.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    getTaskLabel={getTaskLabel}
                    getTaskIcon={getTaskIcon}
                    getStatusBadge={getStatusBadge}
                    daysUntilDue={daysUntilDue}
                    onComplete={handleCompleteClick}
                    onSkip={handleSkip}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {allTodayTasks.length === 0 && (
            <div className="card text-center py-12 text-gray-500">
              <p className="text-4xl mb-3">✅</p>
              <p>今日没有待办任务</p>
              <p className="text-sm mt-1">可以在"养护计划"中创建新的周期性养护计划</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'plans' && (
        <>
          <div className="flex items-center gap-4 mb-4">
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

          {!selectedAquarium ? (
            <div className="card text-center py-12 text-gray-500">请先选择一个鱼缸</div>
          ) : tasks.length === 0 ? (
            <div className="card text-center py-12 text-gray-500">
              <p>暂无养护计划</p>
              <p className="text-sm mt-1">点击"新建计划"为该鱼缸添加周期性养护任务</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map(task => (
                <div key={task.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getTaskIcon(task.task_type)}</span>
                      <div>
                        <h4 className="font-medium">{getTaskLabel(task.task_type)}</h4>
                        <p className="text-xs text-gray-500">每{task.cycle_days}天</p>
                      </div>
                    </div>
                    {getStatusBadge(task)}
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    <p>下次执行: <span className={daysUntilDue(task.next_due_date) < 0 ? 'text-red-600 font-medium' : ''}>{task.next_due_date}</span></p>
                    {daysUntilDue(task.next_due_date) < 0 && (
                      <p className="text-red-600 text-xs">已逾期 {Math.abs(daysUntilDue(task.next_due_date))} 天</p>
                    )}
                    {daysUntilDue(task.next_due_date) >= 0 && daysUntilDue(task.next_due_date) <= 3 && (
                      <p className="text-amber-600 text-xs">{daysUntilDue(task.next_due_date)} 天后到期</p>
                    )}
                  </div>
                  {task.notes && (
                    <p className="mt-2 text-xs text-gray-500 truncate">{task.notes}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleCompleteClick(task)}
                      className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200"
                    >
                      完成
                    </button>
                    <button
                      onClick={() => handleSkip(task.id)}
                      className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                    >
                      跳过
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-xs px-3 py-1 bg-red-50 text-red-500 rounded-md hover:bg-red-100"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="新建养护计划">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">任务类型 *</label>
              <select
                className="input"
                value={formData.task_type || 'water_change'}
                onChange={e => setFormData({ ...formData, task_type: e.target.value })}
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
                value={formData.cycle_days || 7}
                onChange={e => setFormData({ ...formData, cycle_days: parseInt(e.target.value) || 7 })}
                required
              />
              <p className="text-xs text-gray-500 mt-1">每隔几天执行一次</p>
            </div>
          </div>

          <div>
            <label className="label">下次执行日期 *</label>
            <input
              type="date"
              className="input"
              value={formData.next_due_date || ''}
              onChange={e => setFormData({ ...formData, next_due_date: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">备注</label>
            <textarea
              className="input"
              rows={2}
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="可选备注"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              取消
            </button>
            <button type="submit" className="btn-primary">创建计划</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={completeModalOpen}
        onClose={() => { setCompleteModalOpen(false); setActiveTask(null); }}
        title={activeTask ? `完成 - ${getTaskLabel(activeTask.task_type)}` : '完成任务'}
      >
        <div className="space-y-4">
          {activeTask && (
            <div className="bg-emerald-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-emerald-800">
                完成此任务将自动生成一条{getTaskLabel(activeTask.task_type)}记录
              </p>
              <p className="text-emerald-600 mt-1">下次执行日期将自动更新为 {(() => {
                const next = new Date();
                next.setDate(next.getDate() + activeTask.cycle_days);
                return next.toISOString().split('T')[0];
              })()}</p>
            </div>
          )}

          {activeTask?.task_type === 'water_change' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">换水量 (L)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={completeData.volume || ''}
                  onChange={e => setCompleteData({ ...completeData, volume: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="label">水类型</label>
                <input
                  type="text"
                  className="input"
                  placeholder="如 自来水、RO水"
                  value={completeData.water_type || ''}
                  onChange={e => setCompleteData({ ...completeData, water_type: e.target.value })}
                />
              </div>
            </div>
          )}

          {activeTask?.task_type === 'water_test' && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'temperature', label: '温度 (°C)', step: '0.1' },
                { key: 'ph', label: 'pH', step: '0.01' },
                { key: 'ammonia', label: '氨氮 (mg/L)', step: '0.01' },
                { key: 'nitrite', label: '亚硝酸盐', step: '0.01' },
                { key: 'nitrate', label: '硝酸盐', step: '0.1' },
                { key: 'kh', label: 'KH', step: '0.5' },
              ].map(p => (
                <div key={p.key}>
                  <label className="label">{p.label}</label>
                  <input
                    type="number"
                    step={p.step}
                    className="input"
                    value={(completeData.param_data || {})[p.key] || ''}
                    onChange={e => setCompleteData({
                      ...completeData,
                      param_data: { ...(completeData.param_data || {}), [p.key]: parseFloat(e.target.value) || null }
                    })}
                  />
                </div>
              ))}
            </div>
          )}

          {activeTask?.task_type === 'feeding' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">饲料类型</label>
                <input
                  type="text"
                  className="input"
                  value={completeData.food_type || ''}
                  onChange={e => setCompleteData({ ...completeData, food_type: e.target.value })}
                  placeholder="如 颗粒饲料、冻干红虫"
                />
              </div>
              <div>
                <label className="label">喂食量</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={completeData.amount || ''}
                  onChange={e => setCompleteData({ ...completeData, amount: parseFloat(e.target.value) || null })}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">备注</label>
            <textarea
              className="input"
              rows={2}
              value={completeData.notes || ''}
              onChange={e => setCompleteData({ ...completeData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setCompleteModalOpen(false); setActiveTask(null); }}
            >
              取消
            </button>
            <button type="button" className="btn-success" onClick={handleComplete}>
              确认完成
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TaskCard({ task, getTaskLabel, getTaskIcon, getStatusBadge, daysUntilDue, onComplete, onSkip, onDelete, overdue }: {
  task: CareTask;
  getTaskLabel: (type: string) => string;
  getTaskIcon: (type: string) => string;
  getStatusBadge: (task: CareTask) => React.ReactNode;
  daysUntilDue: (date: string) => number;
  onComplete: (task: CareTask) => void;
  onSkip: (id: number) => void;
  onDelete: (id: number) => void;
  overdue?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${overdue ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{getTaskIcon(task.task_type)}</span>
        <div>
          <p className="font-medium text-sm">
            {task.aquarium_name && <span className="text-gray-500">[{task.aquarium_name}] </span>}
            {getTaskLabel(task.task_type)}
          </p>
          <p className="text-xs text-gray-500">到期: {task.next_due_date} · 每{task.cycle_days}天</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {getStatusBadge(task)}
        <button
          onClick={() => onComplete(task)}
          className="text-xs px-3 py-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
        >
          完成
        </button>
        <button
          onClick={() => onSkip(task.id)}
          className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"
        >
          跳过
        </button>
      </div>
    </div>
  );
}
