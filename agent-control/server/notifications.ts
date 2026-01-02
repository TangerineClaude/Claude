// Server-side notification system for mission updates

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  missionId?: number;
}

class NotificationService {
  // Store connected clients for server-sent events
  private clients: Set<any> = new Set();

  // Add SSE client
  addClient(res: any) {
    this.clients.add(res);

    // Remove client on disconnect
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  // Send notification to all connected clients
  async sendNotification(notification: NotificationPayload) {
    const message = JSON.stringify({
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString(),
    });

    // Send to all connected SSE clients
    this.clients.forEach((client) => {
      client.write(`data: ${message}\n\n`);
    });

    console.log(`📢 Notification sent: ${notification.title}`);
  }

  // Mission-specific notifications
  async notifyMissionStarted(missionId: number, title: string) {
    await this.sendNotification({
      title: 'Mission Started',
      body: `Mission "${title}" is now running`,
      url: `/missions/${missionId}`,
      missionId,
    });
  }

  async notifyMissionCompleted(missionId: number, title: string) {
    await this.sendNotification({
      title: 'Mission Completed! ✅',
      body: `Mission "${title}" finished successfully`,
      url: `/missions/${missionId}`,
      missionId,
    });
  }

  async notifyMissionFailed(missionId: number, title: string, error?: string) {
    await this.sendNotification({
      title: 'Mission Failed ❌',
      body: error || `Mission "${title}" encountered an error`,
      url: `/missions/${missionId}`,
      missionId,
    });
  }

  async notifyTaskCompleted(missionId: number, taskOrder: number, description: string) {
    await this.sendNotification({
      title: 'Task Completed',
      body: `Step ${taskOrder}: ${description}`,
      url: `/missions/${missionId}`,
      missionId,
    });
  }
}

export const notificationService = new NotificationService();
