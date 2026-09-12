import { Queue } from 'bullmq';
import redisconnect from '../../database/redisconnect'; // tumhara existing redis connection

// Queue banayi - iska naam "notifications" hai
const bullmqConnection = redisconnect.duplicate({
  maxRetriesPerRequest: null,
});
export const notificationQueue = new Queue('notifications', {
  connection: bullmqConnection,
});
