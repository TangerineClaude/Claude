const { Pool } = require('pg');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class Database {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    if (this.pool) {
      return this.pool;
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('Database connection successful');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected database error:', err);
    });

    return this.pool;
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Query error:', { text, error: error.message });
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('Database connection closed');
    }
  }

  // Conversation methods
  async saveConversation(data) {
    const { userMessage, agentResponse, modelUsed, taskCategory, relatedProject, tokensUsed, costEstimate, embedding, metadata } = data;

    const query = `
      INSERT INTO conversations (user_message, agent_response, model_used, task_category, related_project, tokens_used, cost_estimate, embedding, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [userMessage, agentResponse, modelUsed, taskCategory, relatedProject, tokensUsed, costEstimate, embedding, JSON.stringify(metadata)];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async searchConversations(queryEmbedding, limit = 10) {
    const query = `
      SELECT *, (embedding <=> $1::vector) as distance
      FROM conversations
      ORDER BY distance
      LIMIT $2
    `;

    const result = await this.query(query, [JSON.stringify(queryEmbedding), limit]);
    return result.rows;
  }

  async getRecentConversations(limit = 50) {
    const query = `
      SELECT * FROM conversations
      ORDER BY timestamp DESC
      LIMIT $1
    `;

    const result = await this.query(query, [limit]);
    return result.rows;
  }

  // Memory methods
  async saveMemory(data) {
    const { content, category, tags, source, importance, relatedNodes, embedding, metadata } = data;

    const query = `
      INSERT INTO memory_nodes (content, category, tags, source, importance, related_nodes, embedding, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [content, category, tags, source, importance, relatedNodes, embedding, JSON.stringify(metadata)];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async searchMemories(queryEmbedding, limit = 10, category = null) {
    let query = `
      SELECT *, (embedding <=> $1::vector) as distance
      FROM memory_nodes
    `;

    const values = [JSON.stringify(queryEmbedding), limit];

    if (category) {
      query += ` WHERE category = $3`;
      values.push(category);
    }

    query += ` ORDER BY distance LIMIT $2`;

    const result = await this.query(query, values);
    return result.rows;
  }

  async getMemoriesByTags(tags) {
    const query = `
      SELECT * FROM memory_nodes
      WHERE tags && $1
      ORDER BY created_at DESC
    `;

    const result = await this.query(query, [tags]);
    return result.rows;
  }

  // Task methods
  async createTask(data) {
    const { description, priority, verificationRequired, verificationMethod, assignedModel, estimatedTime, metadata } = data;

    const query = `
      INSERT INTO tasks (description, priority, verification_required, verification_method, assigned_model, estimated_time, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [description, priority, verificationRequired, verificationMethod, assignedModel, estimatedTime, JSON.stringify(metadata)];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async updateTaskStatus(taskId, status, result = null, errorMessage = null) {
    const query = `
      UPDATE tasks
      SET status = $2,
          result = $3,
          error_message = $4,
          completed_at = CASE WHEN $2 IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE NULL END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const values = [taskId, status, result ? JSON.stringify(result) : null, errorMessage];
    const result_row = await this.query(query, values);
    return result_row.rows[0];
  }

  async getActiveTasks() {
    const query = `SELECT * FROM active_tasks`;
    const result = await this.query(query);
    return result.rows;
  }

  // Credential methods
  async saveCredentials(platform, username, encryptedData, sessionData = null) {
    const query = `
      INSERT INTO credentials (platform, username, encrypted_data, session_data)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (platform) DO UPDATE
      SET username = $2, encrypted_data = $3, session_data = $4, updated_at = NOW()
      RETURNING *
    `;

    const values = [platform, username, encryptedData, sessionData ? JSON.stringify(sessionData) : null];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getCredentials(platform) {
    const query = `
      UPDATE credentials
      SET last_used = NOW(), usage_count = usage_count + 1
      WHERE platform = $1
      RETURNING *
    `;

    const result = await this.query(query, [platform]);
    return result.rows[0];
  }

  // Verification methods
  async createVerification(taskId, method, expiresIn = 300) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const query = `
      INSERT INTO verifications (task_id, method, verification_code, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [taskId, method, code, expiresAt];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async verifyCode(verificationId, code) {
    const query = `
      UPDATE verifications
      SET status = CASE
        WHEN verification_code = $2 AND expires_at > NOW() THEN 'approved'
        ELSE 'rejected'
      END,
      responded_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const values = [verificationId, code];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  // Model usage tracking
  async trackModelUsage(data) {
    const { modelName, taskId, conversationId, tokensUsed, cost, latencyMs, success, errorMessage } = data;

    const query = `
      INSERT INTO model_usage (model_name, task_id, conversation_id, tokens_used, cost, latency_ms, success, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [modelName, taskId, conversationId, tokensUsed, cost, latencyMs, success, errorMessage];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getModelCostSummary() {
    const query = `SELECT * FROM model_cost_summary`;
    const result = await this.query(query);
    return result.rows;
  }

  // Project methods
  async createProject(data) {
    const { name, description, category, metadata } = data;

    const query = `
      INSERT INTO projects (name, description, category, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [name, description, category, JSON.stringify(metadata)];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async updateProject(projectId, data) {
    const { name, description, status, category, relatedTasks, relatedMemories, repositoryUrl, deploymentUrl, metadata } = data;

    const query = `
      UPDATE projects
      SET name = COALESCE($2, name),
          description = COALESCE($3, description),
          status = COALESCE($4, status),
          category = COALESCE($5, category),
          related_tasks = COALESCE($6, related_tasks),
          related_memories = COALESCE($7, related_memories),
          repository_url = COALESCE($8, repository_url),
          deployment_url = COALESCE($9, deployment_url),
          metadata = COALESCE($10, metadata),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const values = [projectId, name, description, status, category, relatedTasks, relatedMemories, repositoryUrl, deploymentUrl, metadata ? JSON.stringify(metadata) : null];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getActiveProjects() {
    const query = `
      SELECT * FROM projects
      WHERE status = 'active'
      ORDER BY updated_at DESC
    `;

    const result = await this.query(query);
    return result.rows;
  }
}

// Export singleton instance
module.exports = new Database();
