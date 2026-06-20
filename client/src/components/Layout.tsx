import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', label: '数据看板', icon: '📊' },
  { to: '/aquariums', label: '鱼缸档案', icon: '🐠' },
  { to: '/water-quality', label: '水质监测', icon: '💧' },
  { to: '/care-tasks', label: '养护任务', icon: '📋' },
  { to: '/creatures', label: '生物管理', icon: '🐟' },
  { to: '/feeding', label: '喂食记录', icon: '🍽️' },
  { to: '/diseases', label: '鱼病医疗', icon: '💊' },
  { to: '/maintenance', label: '设备维护', icon: '🔧' },
  { to: '/inventory', label: '库存管理', icon: '📦' },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">🐠</span>
            水族箱管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">家庭水族箱维护系统</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
          v1.0.0
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {navItems.find(item => item.to === location.pathname || (location.pathname.startsWith(item.to) && item.to !== '/'))?.label || '数据看板'}
          </h2>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
