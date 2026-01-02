import { db } from './db.js';
import { missions, tasks, logs, agents } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { generateTasksForMission, executeTask } from './openai.js';
import { notificationService } from './notifications.js';

export class AgentEngine {
  private isRunning = false;

  async start() {
    if (this.isRunning) {
      console.log('Agent engine already running');
      return;
    }

    this.isRunning = true;
    console.log('🤖 Agent engine started');
    this.pollMissions();
  }

  private async pollMissions() {
    while (this.isRunning) {
      try {
        await this.processPendingMissions();
        await this.processRunningMissions();
      } catch (error) {
        console.error('Error in agent engine:', error);
      }

      // Poll every 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  private async processPendingMissions() {
    const pendingMissions = await db
      .select()
      .from(missions)
      .where(eq(missions.status, 'pending'));

    for (const mission of pendingMissions) {
      await this.startMission(mission.id);
    }
  }

  private async processRunningMissions() {
    const runningMissions = await db
      .select()
      .from(missions)
      .where(eq(missions.status, 'running'));

    for (const mission of runningMissions) {
      await this.processMission(mission.id);
    }
  }

  private async startMission(missionId: number) {
    const [mission] = await db
      .select()
      .from(missions)
      .where(eq(missions.id, missionId));

    if (!mission) return;

    console.log(`Starting mission ${missionId}: ${mission.title}`);

    // Update status to running
    await db
      .update(missions)
      .set({ status: 'running', startedAt: new Date() })
      .where(eq(missions.id, missionId));

    // Log start
    await db.insert(logs).values({
      missionId,
      level: 'info',
      message: `Mission started by uverlord.`,
    });

    // Notify mission started
    await notificationService.notifyMissionStarted(missionId, mission.title);

    // Generate tasks using AI
    try {
      await db.insert(logs).values({
        missionId,
        level: 'info',
        message: 'Generating execution plan...',
      });

      const taskDescriptions = await generateTasksForMission(
        `${mission.title}\n\n${mission.description}`
      );

      // Create tasks in database
      for (let i = 0; i < taskDescriptions.length; i++) {
        await db.insert(tasks).values({
          missionId,
          description: taskDescriptions[i],
          order: i + 1,
          status: 'pending',
        });
      }

      await db.insert(logs).values({
        missionId,
        level: 'success',
        message: `Created ${taskDescriptions.length} tasks.`,
      });

      await notificationService.sendNotification({
        title: 'Tasks Generated',
        body: `Created ${taskDescriptions.length} steps for mission "${mission.title}"`,
        url: `/missions/${missionId}`,
        missionId,
      });
    } catch (error) {
      await db.insert(logs).values({
        missionId,
        level: 'error',
        message: `Failed to generate tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      await db
        .update(missions)
        .set({ status: 'failed', completedAt: new Date() })
        .where(eq(missions.id, missionId));
    }
  }

  private async processMission(missionId: number) {
    // Get pending tasks for this mission
    const pendingTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.missionId, missionId));

    const nextTask = pendingTasks
      .filter(t => t.status === 'pending')
      .sort((a, b) => a.order - b.order)[0];

    if (!nextTask) {
      // All tasks are done, check if mission is complete
      const allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.missionId, missionId));

      const allCompleted = allTasks.every(t => t.status === 'completed');
      const anyFailed = allTasks.some(t => t.status === 'failed');

      if (allCompleted) {
        const [mission] = await db
          .select()
          .from(missions)
          .where(eq(missions.id, missionId));

        await db
          .update(missions)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(missions.id, missionId));

        await db.insert(logs).values({
          missionId,
          level: 'success',
          message: 'Mission completed successfully!',
        });

        if (mission) {
          await notificationService.notifyMissionCompleted(missionId, mission.title);
        }
      } else if (anyFailed) {
        const [mission] = await db
          .select()
          .from(missions)
          .where(eq(missions.id, missionId));

        await db
          .update(missions)
          .set({ status: 'failed', completedAt: new Date() })
          .where(eq(missions.id, missionId));

        await db.insert(logs).values({
          missionId,
          level: 'error',
          message: 'Mission failed due to task errors.',
        });

        if (mission) {
          await notificationService.notifyMissionFailed(missionId, mission.title);
        }
      }

      return;
    }

    // Execute the next task
    await this.executeTask(missionId, nextTask.id);
  }

  private async executeTask(missionId: number, taskId: number) {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) return;

    // Update task status to running
    await db
      .update(tasks)
      .set({ status: 'running' })
      .where(eq(tasks.id, taskId));

    await db.insert(logs).values({
      missionId,
      taskId,
      level: 'info',
      message: `Executing step ${task.order}: ${task.description}`,
    });

    try {
      // Get mission context
      const [mission] = await db
        .select()
        .from(missions)
        .where(eq(missions.id, missionId));

      // Get agent if assigned
      let agentRole: string | undefined;
      if (task.agentId) {
        const [agent] = await db
          .select()
          .from(agents)
          .where(eq(agents.id, task.agentId));
        if (agent) {
          agentRole = agent.role;
        }
      }

      // Execute task using AI
      const { result, success } = await executeTask(
        task.description,
        mission ? `${mission.title}\n${mission.description}` : '',
        agentRole
      );

      // Update task with result
      await db
        .update(tasks)
        .set({
          status: success ? 'completed' : 'failed',
          result,
        })
        .where(eq(tasks.id, taskId));

      await db.insert(logs).values({
        missionId,
        taskId,
        level: success ? 'success' : 'error',
        message: success ? `Step ${task.order} completed` : `Step ${task.order} failed`,
      });

      if (success) {
        await notificationService.notifyTaskCompleted(missionId, task.order, task.description);
      }
    } catch (error) {
      await db
        .update(tasks)
        .set({
          status: 'failed',
          result: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(tasks.id, taskId));

      await db.insert(logs).values({
        missionId,
        taskId,
        level: 'error',
        message: `Error executing step ${task.order}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  stop() {
    this.isRunning = false;
    console.log('Agent engine stopped');
  }
}

export const agentEngine = new AgentEngine();
