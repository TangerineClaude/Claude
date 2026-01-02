import { Router } from 'express';
import { db } from '../db.js';
import { agents } from '../../shared/schema.js';
import { createAgentSchema, updateAgentSchema } from '../../shared/types.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Get all agents
router.get('/', async (req, res) => {
  try {
    const allAgents = await db.select().from(agents);
    res.json(allAgents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get agent by ID
router.get('/:id', async (req, res) => {
  try {
    const agent = await db.select().from(agents).where(eq(agents.id, parseInt(req.params.id)));
    if (agent.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// Create agent
router.post('/', async (req, res) => {
  try {
    const data = createAgentSchema.parse(req.body);
    const [newAgent] = await db.insert(agents).values(data).returning();
    res.status(201).json(newAgent);
  } catch (error) {
    res.status(400).json({ error: 'Invalid agent data' });
  }
});

// Update agent
router.patch('/:id', async (req, res) => {
  try {
    const data = updateAgentSchema.parse(req.body);
    const [updatedAgent] = await db
      .update(agents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agents.id, parseInt(req.params.id)))
      .returning();
    if (!updatedAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(updatedAgent);
  } catch (error) {
    res.status(400).json({ error: 'Invalid agent data' });
  }
});

// Delete agent
router.delete('/:id', async (req, res) => {
  try {
    await db.delete(agents).where(eq(agents.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

export default router;
