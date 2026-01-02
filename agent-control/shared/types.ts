import { z } from 'zod';

// Agent schemas
export const createAgentSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  goal: z.string().min(1),
  backstory: z.string().optional(),
  model: z.string().default('gpt-4'),
  tools: z.array(z.string()).default([]),
});

export const updateAgentSchema = createAgentSchema.partial();

// Mission schemas
export const createMissionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const updateMissionSchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  result: z.string().optional(),
});

// Task schemas
export const createTaskSchema = z.object({
  missionId: z.number(),
  agentId: z.number().optional(),
  description: z.string().min(1),
  order: z.number(),
});

export const updateTaskSchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  result: z.string().optional(),
  agentId: z.number().optional(),
});

// Log schemas
export const createLogSchema = z.object({
  missionId: z.number().optional(),
  taskId: z.number().optional(),
  agentId: z.number().optional(),
  level: z.enum(['info', 'warning', 'error', 'success']).default('info'),
  message: z.string().min(1),
  metadata: z.any().optional(),
});

export type CreateAgent = z.infer<typeof createAgentSchema>;
export type UpdateAgent = z.infer<typeof updateAgentSchema>;
export type CreateMission = z.infer<typeof createMissionSchema>;
export type UpdateMission = z.infer<typeof updateMissionSchema>;
export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type CreateLog = z.infer<typeof createLogSchema>;
