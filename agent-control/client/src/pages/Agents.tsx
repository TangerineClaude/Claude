import { useState } from 'react';
import { useAgents, useCreateAgent } from '../lib/api';

export default function Agents() {
  const { data: agents } = useAgents();
  const createAgent = useCreateAgent();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [goal, setGoal] = useState('');
  const [backstory, setBackstory] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !goal) return;

    await createAgent.mutateAsync({ name, role, goal, backstory });
    setName('');
    setRole('');
    setGoal('');
    setBackstory('');
    setIsCreating(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="text-sm text-terminal-dim mb-2">&gt; AGENTS</div>
          <h1 className="text-2xl">YOUR AI TEAM</h1>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 border border-terminal-border hover:bg-terminal-hover transition-colors rounded"
        >
          {isCreating ? 'CANCEL' : '+ NEW AGENT'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="border border-terminal-border p-6 rounded mb-6">
          <div className="mb-4">
            <label className="block text-sm mb-2">NAME</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border border-terminal-border p-2 rounded focus:outline-none focus:border-terminal-text"
              placeholder="Research Agent"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-2">ROLE</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-transparent border border-terminal-border p-2 rounded focus:outline-none focus:border-terminal-text"
              placeholder="Senior Researcher"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-2">GOAL</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-transparent border border-terminal-border p-2 rounded focus:outline-none focus:border-terminal-text h-20"
              placeholder="Research and gather information..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-2">BACKSTORY (Optional)</label>
            <textarea
              value={backstory}
              onChange={(e) => setBackstory(e.target.value)}
              className="w-full bg-transparent border border-terminal-border p-2 rounded focus:outline-none focus:border-terminal-text h-20"
              placeholder="You are an expert researcher..."
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-terminal-text text-terminal-bg hover:bg-terminal-dim transition-colors rounded font-bold"
          >
            CREATE AGENT
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-6">
        {agents?.map((agent: any) => (
          <div key={agent.id} className="border border-terminal-border p-6 rounded">
            <div className="text-2xl mb-2">👻</div>
            <h3 className="text-xl font-bold mb-2">{agent.name}</h3>
            <div className="text-terminal-dim text-sm mb-3">{agent.role}</div>
            <div className="text-sm mb-3">{agent.goal}</div>
            {agent.backstory && (
              <div className="text-xs text-terminal-dim italic">{agent.backstory}</div>
            )}
            <div className="mt-4 pt-4 border-t border-terminal-border text-xs text-terminal-dim">
              Model: {agent.model}
            </div>
          </div>
        ))}
      </div>

      {(!agents || agents.length === 0) && !isCreating && (
        <div className="border border-terminal-border p-8 rounded text-center text-terminal-dim">
          <div className="text-4xl mb-4">👻</div>
          <div>No agents yet. Create your first AI team member!</div>
        </div>
      )}
    </div>
  );
}
