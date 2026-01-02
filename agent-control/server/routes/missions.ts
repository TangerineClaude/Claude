import { Router } from 'express';
import { db } from '../db.js';
import { missions, tasks, logs } from '../../shared/schema.js';
import { createMissionSchema, updateMissionSchema } from '../../shared/types.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Get all missions
router.get('/', async (req, res) => {
  try {
    const allMissions = await db.select().from(missions).orderBy(desc(missions.createdAt));
    res.json(allMissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch missions' });
  }
});

// Get mission by ID with tasks and logs
router.get('/:id', async (req, res) => {
  try {
    const missionId = parseInt(req.params.id);
    const [mission] = await db.select().from(missions).where(eq(missions.id, missionId));

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const missionTasks = await db.select().from(tasks).where(eq(tasks.missionId, missionId));
    const missionLogs = await db.select().from(logs).where(eq(logs.missionId, missionId)).orderBy(desc(logs.createdAt));

    res.json({ ...mission, tasks: missionTasks, logs: missionLogs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mission' });
  }
});

// Create mission
router.post('/', async (req, res) => {
  try {
    const data = createMissionSchema.parse(req.body);
    const [newMission] = await db.insert(missions).values(data).returning();
    res.status(201).json(newMission);
  } catch (error) {
    res.status(400).json({ error: 'Invalid mission data' });
  }
});

// Update mission
router.patch('/:id', async (req, res) => {
  try {
    const data = updateMissionSchema.parse(req.body);
    const updates: any = { ...data, updatedAt: new Date() };

    if (data.status === 'running' && !req.body.startedAt) {
      updates.startedAt = new Date();
    }
    if ((data.status === 'completed' || data.status === 'failed') && !req.body.completedAt) {
      updates.completedAt = new Date();
    }

    const [updatedMission] = await db
      .update(missions)
      .set(updates)
      .where(eq(missions.id, parseInt(req.params.id)))
      .returning();

    if (!updatedMission) {
      return res.status(404).json({ error: 'Mission not found' });
    }
    res.json(updatedMission);
  } catch (error) {
    res.status(400).json({ error: 'Invalid mission data' });
  }
});

// Delete mission
router.delete('/:id', async (req, res) => {
  try {
    await db.delete(missions).where(eq(missions.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete mission' });
  }
});

export default router;
