import { Router } from 'express';
import { db } from '../db.js';
import { logs } from '../../shared/schema.js';
import { createLogSchema } from '../../shared/types.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Get all logs (with optional filtering)
router.get('/', async (req, res) => {
  try {
    let query = db.select().from(logs).orderBy(desc(logs.createdAt));

    if (req.query.missionId) {
      query = query.where(eq(logs.missionId, parseInt(req.query.missionId as string))) as any;
    }

    const allLogs = await query.limit(100);
    res.json(allLogs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Create log
router.post('/', async (req, res) => {
  try {
    const data = createLogSchema.parse(req.body);
    const [newLog] = await db.insert(logs).values(data).returning();
    res.status(201).json(newLog);
  } catch (error) {
    res.status(400).json({ error: 'Invalid log data' });
  }
});

export default router;
