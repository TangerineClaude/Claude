import { useRoute } from 'wouter';
import { useMission } from '../lib/api';
import { format } from 'date-fns';

export default function MissionDetail() {
  const [, params] = useRoute('/missions/:id');
  const { data: mission, isLoading } = useMission(parseInt(params?.id || '0'));

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!mission) {
    return <div>Mission not found</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <div className="text-sm text-terminal-dim mb-2">&gt; MISSIONS/{mission.id}</div>
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold">{mission.title}</h1>
          <div className={`px-3 py-1 rounded text-xs ${
            mission.status === 'completed' ? 'bg-green-900 text-green-400' :
            mission.status === 'failed' ? 'bg-red-900 text-red-400' :
            mission.status === 'running' ? 'bg-yellow-900 text-yellow-400' :
            'bg-gray-900 text-gray-400'
          }`}>
            {mission.status.toUpperCase()}
          </div>
        </div>
        <p className="text-terminal-dim">{mission.description}</p>
      </div>

      {/* Steps */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl">STEPS</h2>
          <div className="text-terminal-dim text-sm">{mission.tasks?.length || 0}</div>
        </div>
        {mission.tasks && mission.tasks.length > 0 ? (
          <div className="space-y-3">
            {mission.tasks.map((task: any) => (
              <div key={task.id} className="border border-terminal-border p-4 rounded">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-bold mb-1">Step {task.order}: {task.description}</div>
                    {task.result && (
                      <div className="text-sm text-terminal-dim mt-2">{task.result}</div>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ml-4 ${
                    task.status === 'completed' ? 'bg-green-900 text-green-400' :
                    task.status === 'failed' ? 'bg-red-900 text-red-400' :
                    task.status === 'running' ? 'bg-yellow-900 text-yellow-400' :
                    'bg-gray-900 text-gray-400'
                  }`}>
                    {task.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-terminal-border p-8 rounded text-center text-terminal-dim">
            <div className="mb-2">Waiting for AI to create steps...</div>
          </div>
        )}
      </div>

      {/* What's Happening - Live Logs */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl">&gt; WHAT'S HAPPENING</h2>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-terminal-text rounded-full animate-pulse" />
            <span className="text-xs text-terminal-dim">Live</span>
          </div>
        </div>
        <div className="bg-black border border-terminal-border rounded p-4 max-h-96 overflow-y-auto font-mono text-sm">
          {mission.logs && mission.logs.length > 0 ? (
            mission.logs.map((log: any) => (
              <div key={log.id} className="mb-2">
                <span className="text-terminal-dim">[{format(new Date(log.createdAt), 'HH:mm:ss')}]</span>{' '}
                <span className={
                  log.level === 'error' ? 'text-red-400' :
                  log.level === 'warning' ? 'text-yellow-400' :
                  log.level === 'success' ? 'text-green-400' :
                  'text-terminal-text'
                }>{log.level.toUpperCase()}</span>{' '}
                <span className="text-terminal-dim">{log.message}</span>
              </div>
            ))
          ) : (
            <div className="text-terminal-dim">No logs yet...</div>
          )}
        </div>
      </div>
    </div>
  );
}
