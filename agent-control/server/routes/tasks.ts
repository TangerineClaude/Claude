import { Router } from 'express';
import { db } from '../db.js';
import { tasks } from '../../shared/schema.js';
import { createTaskSchema, updateTaskSchema } from '../../shared/types.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const allTasks = await db.select().from(tasks);
    res.json(allTasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const [newTask] = await db.insert(tasks).values(data).returning();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ error: 'Invalid task data' });
  }
});

// Update task
router.patch('/:id', async (req, res) => {
  try {
    const data = updateTaskSchema.parse(req.body);
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, parseInt(req.params.id)))
      .returning();

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ error: 'Invalid task data' });
  }
});

export default router;
