import { useMissions, useAgents } from '../lib/api';
import { Link } from 'wouter';

export default function Home() {
  const { data: missions } = useMissions();
  const { data: agents } = useAgents();

  const activeTasks = missions?.filter((m: any) => m.status === 'running').length || 0;
  const completedTasks = missions?.filter((m: any) => m.status === 'completed').length || 0;

  return (
    <div>
      <div className="mb-8">
        <div className="text-sm text-terminal-dim mb-2">&gt; HOME</div>
        <div className="text-xl mb-2">Status: <span className="text-terminal-text">Online</span></div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl mb-4">OVERVIEW</h2>
        <p className="text-terminal-dim">Everything is working. Ready to go.</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Your Agents */}
        <div className="border border-terminal-border p-6 rounded">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl text-blue-400">👻</span>
            <span className="text-terminal-dim text-sm">YOUR AGENTS</span>
          </div>
          <div className="text-4xl font-bold">{agents?.length || 0}</div>
        </div>

        {/* Active Tasks */}
        <div className="border border-terminal-border p-6 rounded">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl text-yellow-400">⚡</span>
            <span className="text-terminal-dim text-sm">ACTIVE TASKS</span>
          </div>
          <div className="text-4xl font-bold">{activeTasks}</div>
        </div>

        {/* Completed Tasks */}
        <div className="border border-terminal-border p-6 rounded">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl text-terminal-text">🎯</span>
            <span className="text-terminal-dim text-sm">COMPLETED TASKS</span>
          </div>
          <div className="text-4xl font-bold">{completedTasks}</div>
        </div>
      </div>

      {/* Recent Missions */}
      {missions && missions.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl mb-4">RECENT MISSIONS</h3>
          <div className="space-y-3">
            {missions.slice(0, 5).map((mission: any) => (
              <Link key={mission.id} href={`/missions/${mission.id}`}>
                <a className="block border border-terminal-border p-4 rounded hover:bg-terminal-hover transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">{mission.title}</div>
                      <div className="text-sm text-terminal-dim mt-1">{mission.description}</div>
                    </div>
                    <div className={`px-3 py-1 rounded text-xs ${
                      mission.status === 'completed' ? 'bg-green-900 text-green-400' :
                      mission.status === 'failed' ? 'bg-red-900 text-red-400' :
                      mission.status === 'running' ? 'bg-yellow-900 text-yellow-400' :
                      'bg-gray-900 text-gray-400'
                    }`}>
                      {mission.status.toUpperCase()}
                    </div>
                  </div>
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
