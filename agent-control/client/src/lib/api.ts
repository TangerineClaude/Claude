import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = '/api';

// Agents
export const useAgents = () => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/agents`);
      if (!res.ok) throw new Error('Failed to fetch agents');
      return res.json();
    },
  });
};

export const useCreateAgent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_URL}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create agent');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};

// Missions
export const useMissions = () => {
  return useQuery({
    queryKey: ['missions'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/missions`);
      if (!res.ok) throw new Error('Failed to fetch missions');
      return res.json();
    },
    refetchInterval: 2000, // Poll every 2 seconds
  });
};

export const useMission = (id: number) => {
  return useQuery({
    queryKey: ['missions', id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/missions/${id}`);
      if (!res.ok) throw new Error('Failed to fetch mission');
      return res.json();
    },
    refetchInterval: 1000, // Poll every second for live updates
    enabled: !!id,
  });
};

export const useCreateMission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_URL}/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create mission');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
};

export const useUpdateMission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`${API_URL}/missions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update mission');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
};

// Tasks
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
};

// Logs
export const useCreateLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
};

// Health check
export const useHealth = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/health`);
      if (!res.ok) throw new Error('Server offline');
      return res.json();
    },
    refetchInterval: 5000,
  });
};
