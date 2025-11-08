import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { sessionStore } from './auth';
import { storage } from './storage';
import type { Notification } from '@shared/schema';

declare module 'express-session' {
  interface SessionData {
    passport?: {
      user?: string;
    };
  }
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  isAlive?: boolean;
}

class NotificationWebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  initialize(httpServer: Server) {
    this.wss = new WebSocketServer({ 
      noServer: true,
      path: '/ws/notifications'
    });

    // Handle WebSocket upgrade
    httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
      if (request.url === '/ws/notifications') {
        this.authenticateConnection(request, (err, userId, userRole) => {
          if (err || !userId) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          this.wss?.handleUpgrade(request, socket, head, (ws) => {
            const authWs = ws as AuthenticatedWebSocket;
            authWs.userId = userId;
            authWs.userRole = userRole;
            authWs.isAlive = true;
            
            this.wss?.emit('connection', authWs, request);
          });
        });
      }
    });

    this.wss.on('connection', (ws: AuthenticatedWebSocket) => {
      const userId = ws.userId;
      
      if (!userId) {
        ws.close();
        return;
      }

      // Add client to user's set of connections
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId)?.add(ws);

      console.log(`[WebSocket] User ${userId} connected. Total connections: ${this.clients.get(userId)?.size}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connected successfully'
      }));

      // Handle pong responses for heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle client messages
      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          console.log(`[WebSocket] Message from ${userId}:`, data);
          
          // Handle ping
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.clients.get(userId)?.delete(ws);
        if (this.clients.get(userId)?.size === 0) {
          this.clients.delete(userId);
        }
        console.log(`[WebSocket] User ${userId} disconnected`);
      });

      ws.on('error', (error) => {
        console.error(`[WebSocket] Error for user ${userId}:`, error);
      });
    });

    // Heartbeat to detect dead connections
    const interval = setInterval(() => {
      this.wss?.clients.forEach((ws) => {
        const authWs = ws as AuthenticatedWebSocket;
        
        if (authWs.isAlive === false) {
          return authWs.terminate();
        }
        
        authWs.isAlive = false;
        authWs.ping();
      });
    }, 30000); // 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });

    console.log('[WebSocket] Notification WebSocket server initialized');
  }

  private authenticateConnection(
    request: IncomingMessage,
    callback: (err: Error | null, userId?: string, userRole?: string) => void
  ) {
    try {
      const cookies = request.headers.cookie ? parseCookie(request.headers.cookie) : {};
      const sessionId = cookies['connect.sid'];

      if (!sessionId) {
        return callback(new Error('No session ID'));
      }

      // Remove 's:' prefix and signature from signed cookie
      const sid = sessionId.startsWith('s:') 
        ? sessionId.slice(2).split('.')[0] 
        : sessionId;

      sessionStore.get(sid, (err, session) => {
        if (err || !session) {
          return callback(new Error('Invalid session'));
        }

        const userId = session.passport?.user;
        if (!userId) {
          return callback(new Error('Not authenticated'));
        }

        // Fetch user to get role
        storage.getUser(userId).then((user) => {
          if (!user) {
            return callback(new Error('User not found'));
          }
          // Default to support_assistant if role is somehow missing
          const userRole = user.role || 'support_assistant';
          callback(null, userId, userRole);
        }).catch((error) => {
          callback(error as Error);
        });
      });
    } catch (error) {
      callback(error as Error);
    }
  }

  // Broadcast notification to specific user
  sendToUser(userId: string, notification: Notification): boolean {
    const userConnections = this.clients.get(userId);
    
    if (!userConnections || userConnections.size === 0) {
      console.log(`[WebSocket] No active connections for user ${userId}`);
      return false;
    }

    const message = JSON.stringify({
      type: 'notification',
      data: notification
    });

    let sent = 0;
    userConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sent++;
      }
    });

    console.log(`[WebSocket] Sent notification to ${sent} connection(s) for user ${userId}`);
    return sent > 0;
  }

  // Broadcast to all support assistants
  broadcastToSupport(notification: Notification): number {
    const message = JSON.stringify({
      type: 'notification',
      data: notification
    });

    let sent = 0;
    this.clients.forEach((connections, userId) => {
      connections.forEach((ws) => {
        const authWs = ws as AuthenticatedWebSocket;
        // Only send to support assistants
        if (ws.readyState === WebSocket.OPEN && authWs.userRole === 'support_assistant') {
          ws.send(message);
          sent++;
        }
      });
    });

    console.log(`[WebSocket] Broadcast notification to ${sent} support assistant connection(s)`);
    return sent;
  }

  // Get number of active connections for a user
  getConnectionCount(userId: string): number {
    return this.clients.get(userId)?.size || 0;
  }

  // Get total number of connected users
  getTotalConnectedUsers(): number {
    return this.clients.size;
  }
}

export const wsNotificationService = new NotificationWebSocketService();
