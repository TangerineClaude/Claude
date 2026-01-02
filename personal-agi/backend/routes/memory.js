const express = require('express');
const router = express.Router();
const ContextManager = require('../memory/context_manager');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * POST /api/memory/save
 * Save a memory node
 */
router.post('/save', async (req, res) => {
  try {
    const { content, category, tags, importance, metadata } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const memory = await ContextManager.saveMemory({
      content,
      category,
      tags,
      source: 'manual',
      importance,
      metadata
    });

    res.json({ success: true, memory });
  } catch (error) {
    logger.error('Save memory error:', error);
    res.status(500).json({ error: 'Failed to save memory' });
  }
});

/**
 * POST /api/memory/search
 * Search memories
 */
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 10, category } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await ContextManager.searchMemories(query, limit, category);

    res.json({
      success: true,
      results: results.map(r => ({
        id: r.id,
        content: r.content,
        category: r.category,
        tags: r.tags,
        importance: r.importance,
        createdAt: r.created_at,
        similarity: 1 - r.distance
      }))
    });
  } catch (error) {
    logger.error('Search memory error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * POST /api/memory/tags
 * Get memories by tags
 */
router.post('/tags', async (req, res) => {
  try {
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags array is required' });
    }

    const results = await ContextManager.getMemoriesByTags(tags);

    res.json({ success: true, results });
  } catch (error) {
    logger.error('Get by tags error:', error);
    res.status(500).json({ error: 'Failed to retrieve memories' });
  }
});

/**
 * POST /api/memory/import
 * Import data from external source
 */
router.post('/import', async (req, res) => {
  try {
    const { data, source = 'import' } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Data array is required' });
    }

    const imported = await ContextManager.importData(data, source);

    res.json({
      success: true,
      imported: imported.length,
      message: `Imported ${imported.length} items from ${source}`
    });
  } catch (error) {
    logger.error('Import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

module.exports = router;
