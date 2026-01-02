import { Link, useLocation } from 'wouter';
import { useHealth } from '../lib/api';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealth();

  const navItems = [
    { path: '/', label: 'Home', icon: '⚡' },
    { path: '/tasks', label: 'Tasks', icon: '>' },
    { path: '/agents', label: 'Agents', icon: '👻' },
    { path: '/browser', label: 'Browser', icon: '🛡' },
  ];

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text font-mono">
      {/* Header */}
      <div className="border-b border-terminal-border p-6">
        <div className="flex items-center gap-4">
          <div className="text-3xl">⚡</div>
          <div>
            <h1 className="text-2xl font-bold tracking-wider">AGENT CONTROL</h1>
            <p className="text-terminal-dim text-sm">Your AI Team</p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-terminal-border min-h-[calc(100vh-100px)]">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  className={`flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                    location === item.path
                      ? 'bg-terminal-active border-l-4 border-terminal-border'
                      : 'hover:bg-terminal-hover'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              </Link>
            ))}
          </nav>

          {/* Status */}
          <div className="p-4 mt-8 border-t border-terminal-border">
            <div className="text-terminal-dim text-sm mb-2">Status</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${health?.status === 'online' ? 'bg-terminal-text' : 'bg-red-500'}`} />
              <span className="text-sm">{health?.status || 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
