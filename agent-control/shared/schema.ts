import { pgTable, text, serial, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  goal: text('goal').notNull(),
  backstory: text('backstory'),
  model: text('model').default('gpt-4'),
  tools: jsonb('tools').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const missions = pgTable('missions', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'), // pending, running, completed, failed
  result: text('result'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  missionId: integer('mission_id').references(() => missions.id).notNull(),
  agentId: integer('agent_id').references(() => agents.id),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'), // pending, running, completed, failed
  result: text('result'),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const logs = pgTable('logs', {
  id: serial('id').primaryKey(),
  missionId: integer('mission_id').references(() => missions.id),
  taskId: integer('task_id').references(() => tasks.id),
  agentId: integer('agent_id').references(() => agents.id),
  level: text('level').notNull().default('info'), // info, warning, error, success
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  missionId: integer('mission_id').references(() => missions.id),
  agentId: integer('agent_id').references(() => agents.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id).notNull(),
  role: text('role').notNull(), // user, assistant, system
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
