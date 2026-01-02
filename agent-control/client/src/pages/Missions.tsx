import { useState } from 'react';
import { useMissions, useCreateMission } from '../lib/api';
import { Link } from 'wouter';

export default function Missions() {
  const { data: missions } = useMissions();
  const createMission = useCreateMission();
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    await createMission.mutateAsync({ title, description });
    setTitle('');
    setDescription('');
    setIsCreating(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="text-sm text-terminal-dim mb-2">&gt; TASKS</div>
          <h1 className="text-2xl">ALL MISSIONS</h1>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 border border-terminal-border hover:bg-terminal-hover transition-colors rounded"
        >
          {isCreating ? 'CANCEL' : '+ NEW MISSION'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="border border-terminal-border p-6 rounded mb-6">
          <div className="mb-4">
            <label className="block text-sm mb-2">TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent border border-terminal-border p-2 rounded focus:outline-none focus:border-terminal-text"
              placeholder="Export my ChatGPT account..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-2">DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-transparent border border-terminal-border p-2 rounded focus:outline-none focus:border-terminal-text h-24"
              placeholder="My goal is to save every chat..."
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-terminal-text text-terminal-bg hover:bg-terminal-dim transition-colors rounded font-bold"
          >
            CREATE MISSION
          </button>
        </form>
      )}

      <div className="space-y-4">
        {missions?.map((mission: any) => (
          <Link key={mission.id} href={`/missions/${mission.id}`}>
            <a className="block border border-terminal-border p-6 rounded hover:bg-terminal-hover transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold">{mission.title}</h3>
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
              <div className="text-xs text-terminal-dim mt-4">
                Created: {new Date(mission.createdAt).toLocaleString()}
              </div>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
