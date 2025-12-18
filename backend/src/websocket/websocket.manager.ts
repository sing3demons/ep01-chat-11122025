import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { AuthService } from '../auth/auth.service';
import { OfflineService } from './offline.service';
import { ReconnectionManager } from './reconnection.manager';
import { ICustomLogger } from '../logger/logger';
import { AuthRepository } from '../auth';
import prisma from '../config/database';

export interface WebSocketConnection {
  id: string;
  userId: string;
  socket: WebSocket;
  isActive: boolean;
  connectedAt: Date;
  lastHeartbeat: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
  messageId?: string;
}

/**
 * WebSocket Manager
 * Handles WebSocket connections, authentication, and session management
 */
export class WebSocketManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set of connectionIds
  private rooms: Map<string, Set<string>> = new Map(); // roomId -> Set of connectionIds
  private userRooms: Map<string, string> = new Map(); // connectionId -> current roomId
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds
  private readonly authService: AuthService

  constructor(private wss: WebSocketServer, private readonly logger: ICustomLogger) {
    const authRepository = new AuthRepository(prisma, logger);
    this.authService = new AuthService(authRepository);
    this.setupHeartbeat();
    this.setupWebSocketServer();

    // Initialize offline support and reconnection manager
    // const offlineService = OfflineService.getInstance();
    const reconnectionManager = ReconnectionManager.getInstance();
    reconnectionManager.initialize(this);
  }

  /**
   * Setup WebSocket server event handlers
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const connectionId = this.generateConnectionId();
    const ipAddress = req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    console.log(`New WebSocket connection: ${connectionId} from ${ipAddress}`);

    // Set up temporary connection (will be authenticated later)
    const tempConnection: Partial<WebSocketConnection> = {
      id: connectionId,
      socket: ws,
      isActive: false,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      userAgent,
      ipAddress
    };

    // Set up message handlers
    ws.on('message', (message: Buffer) => {
      this.handleMessage(connectionId, message);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnection(connectionId, code, reason.toString());
    });

    ws.on('error', (error: Error) => {
      this.handleError(connectionId, error);
    });

    ws.on('pong', () => {
      this.handlePong(connectionId);
    });

    // Send connection acknowledgment
    this.sendMessage(ws, {
      type: 'connection_ack',
      data: { connectionId },
      timestamp: new Date().toISOString()
    });

    // Store temporary connection
    this.connections.set(connectionId, tempConnection as WebSocketConnection);

    // Set authentication timeout
    setTimeout(() => {
      const connection = this.connections.get(connectionId);
      if (connection && !connection.isActive) {
        console.log(`Authentication timeout for connection: ${connectionId}`);
        this.closeConnection(connectionId, 4001, 'Authentication timeout');
      }
    }, 10000); // 10 seconds to authenticate
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(connectionId: string, message: Buffer): Promise<void> {
    try {
      const data: WebSocketMessage = JSON.parse(message.toString());
      const connection = this.connections.get(connectionId);

      if (!connection) {
        console.error(`Message from unknown connection: ${connectionId}`);
        return;
      }

      console.log(`Message from ${connectionId}:`, data.type);

      switch (data.type) {
        case 'authenticate':
          await this.handleAuthentication(connectionId, data.data);
          break;

        case 'register_device':
          await this.handleDeviceRegistration(connectionId, data.data);
          break;

        case 'heartbeat':
          this.handleHeartbeat(connectionId);
          break;

        case 'message':
          await this.handleChatMessage(connectionId, data);
          break;

        case 'typing_start':
        case 'typing_stop':
          await this.handleTypingIndicator(connectionId, data);
          break;

        case 'join_room':
          await this.handleJoinRoom(connectionId, data.data);
          break;

        case 'leave_room':
          await this.handleLeaveRoom(connectionId, data.data);
          break;

        case 'message_read':
          await this.handleMessageStatusUpdate(connectionId, data, 'read');
          break;

        case 'message_delivered':
          await this.handleMessageStatusUpdate(connectionId, data, 'delivered');
          break;

        case 'get_unread_count':
          await this.handleGetUnreadCount(connectionId, data.data);
          break;

        case 'retry_queued_message':
          await this.handleRetryQueuedMessage(connectionId, data.data);
          break;

        case 'sync_devices':
          await this.handleDeviceSync(connectionId);
          break;

        case 'connection_status_request':
          await this.handleConnectionStatusRequest(connectionId);
          break;

        default:
          console.warn(`Unknown message type: ${data.type}`);
          this.sendError(connection.socket, 'Unknown message type', data.type);
      }

    } catch (error) {
      console.error(`Error handling message from ${connectionId}:`, error);
      const connection = this.connections.get(connectionId);
      if (connection) {
        this.sendError(connection.socket, 'Invalid message format');
      }
    }
  }

  /**
   * Handle user authentication
   */
  private async handleAuthentication(connectionId: string, authData: any): Promise<void> {
    try {
      const { token } = authData;

      if (!token) {
        this.sendAuthError(connectionId, 'Token required');
        return;
      }

      // Verify token
      const authResult = await this.authService.verifyToken(token);

      if (!authResult.success || !authResult.data) {
        this.sendAuthError(connectionId, 'Invalid token');
        return;
      }

      const user = authResult.data;
      const connection = this.connections.get(connectionId);

      if (!connection) {
        console.error(`Authentication for unknown connection: ${connectionId}`);
        return;
      }

      // Update connection with user info
      connection.userId = user.id;
      connection.isActive = true;

      // Add to user connections map
      if (!this.userConnections.has(user.id)) {
        this.userConnections.set(user.id, new Set());
      }
      this.userConnections.get(user.id)!.add(connectionId);

      // Update user online status
      // TODO: Implement proper dependency injection for UserService
      // await UserService.updateOnlineStatus(user.id, true);

      // Send authentication success
      this.sendMessage(connection.socket, {
        type: 'auth_success',
        data: { user },
        timestamp: new Date().toISOString()
      });

      // Broadcast user online status to contacts
      await this.broadcastUserStatusChange(user.id, true);

      // Mark messages as delivered for the user
      await this.markUserMessagesAsDelivered(user.id);

      // Register connection for health monitoring
      const reconnectionManager = ReconnectionManager.getInstance();
      reconnectionManager.registerConnection(connection);

      // Handle reconnection if this was a reconnection attempt
      await reconnectionManager.handleSuccessfulReconnection(user.id, connectionId);

      console.log(`User ${user.username} authenticated on connection ${connectionId}`);

    } catch (error) {
      console.error(`Authentication error for ${connectionId}:`, error);
      this.sendAuthError(connectionId, 'Authentication failed');
    }
  }

  /**
   * Handle connection disconnection
   */
  private async handleDisconnection(connectionId: string, code: number, reason: string): Promise<void> {
    console.log(`Connection ${connectionId} disconnected: ${code} - ${reason}`);

    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Handle reconnection logic
    const reconnectionManager = ReconnectionManager.getInstance();
    if (connection.userId) {
      await reconnectionManager.handleDisconnection(
        connection.userId,
        connectionId,
        code,
        reason,
        connection.userAgent // Use userAgent as deviceId for now
      );
    }

    // Remove from rooms
    const currentRoom = this.userRooms.get(connectionId);
    if (currentRoom) {
      const roomConnections = this.rooms.get(currentRoom);
      if (roomConnections) {
        roomConnections.delete(connectionId);
        if (roomConnections.size === 0) {
          this.rooms.delete(currentRoom);
        }
      }
      this.userRooms.delete(connectionId);
    }

    // Remove from connections
    this.connections.delete(connectionId);

    if (connection.userId) {
      // Remove from user connections
      const userConnections = this.userConnections.get(connection.userId);
      if (userConnections) {
        userConnections.delete(connectionId);

        // If no more connections for this user, update offline status
        if (userConnections.size === 0) {
          this.userConnections.delete(connection.userId);
          // TODO: Implement proper dependency injection for UserService
          // await UserService.updateOnlineStatus(connection.userId, false);
          await this.broadcastUserStatusChange(connection.userId, false);
        }
      }
    }
  }

  /**
   * Handle connection errors
   */
  private handleError(connectionId: string, error: Error): void {
    console.error(`WebSocket error for ${connectionId}:`, error);

    const connection = this.connections.get(connectionId);
    if (connection) {
      this.sendError(connection.socket, 'Connection error occurred');
    }
  }

  /**
   * Handle heartbeat from client
   */
  private handleHeartbeat(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastHeartbeat = new Date();
      this.sendMessage(connection.socket, {
        type: 'heartbeat_ack',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle pong response
   */
  private handlePong(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastHeartbeat = new Date();

      // Update connection health
      const reconnectionManager = ReconnectionManager.getInstance();
      reconnectionManager.updateConnectionHealth(connectionId, true);
    }
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(connectionId: string, data: WebSocketMessage): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) {
      this.sendError(connection?.socket, 'Not authenticated');
      return;
    }

    const { content, chatRoomId } = data.data || {};

    // Use current room if no chatRoomId provided
    const targetRoomId = chatRoomId || this.userRooms.get(connectionId);

    if (!targetRoomId) {
      this.sendError(connection.socket, 'No chat room specified. Use /join <room_id> first.');
      return;
    }

    if (!content) {
      this.sendError(connection.socket, 'Message content is required');
      return;
    }

    try {
      // Create message object
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        senderId: connection.userId,
        chatRoomId: targetRoomId,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      console.log(`Broadcasting message from ${connection.userId} to room ${targetRoomId}: ${content}`);

      // Broadcast to all users in the room
      const roomConnections = this.rooms.get(targetRoomId);
      if (roomConnections) {
        roomConnections.forEach(connId => {
          const conn = this.connections.get(connId);
          if (conn && conn.socket.readyState === 1) { // WebSocket.OPEN
            this.sendMessage(conn.socket, {
              type: 'message',
              data: message,
              timestamp: new Date().toISOString()
            });
          }
        });
      }

      // Send acknowledgment to sender
      this.sendMessage(connection.socket, {
        type: 'message_sent',
        data: { messageId: message.id },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Error handling chat message from ${connectionId}:`, error);
      this.sendError(connection.socket, 'Failed to process message');
    }
  }

  /**
   * Handle typing indicators
   */
  private async handleTypingIndicator(connectionId: string, data: WebSocketMessage): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) return;

    const { chatRoomId } = data.data || {};
    if (!chatRoomId) {
      this.sendError(connection.socket, 'Chat room ID is required for typing indicator');
      return;
    }

    try {
      // Import MessageService to handle typing indicator
      const { MessageService } = await import('../message/message.service');

      const isTyping = data.type === 'typing_start';
      // TODO: Implement proper dependency injection for MessageService
      // const result = await MessageService.handleTypingIndicator(
      //   connection.userId,
      //   chatRoomId,
      //   isTyping
      // );
      const result = { success: true, error: null }; // Temporary fix

      if (!result.success) {
        this.sendError(connection.socket, result.error || 'Failed to handle typing indicator');
      }
    } catch (error) {
      console.error(`Error handling typing indicator from ${connectionId}:`, error);
      this.sendError(connection.socket, 'Failed to process typing indicator');
    }
  }

  /**
   * Handle join room request
   */
  private async handleJoinRoom(connectionId: string, roomData: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) return;

    const { chatRoomId } = roomData || {};
    if (!chatRoomId) {
      this.sendError(connection.socket, 'Chat room ID is required');
      return;
    }

    // Leave current room if any
    const currentRoom = this.userRooms.get(connectionId);
    if (currentRoom) {
      const roomConnections = this.rooms.get(currentRoom);
      if (roomConnections) {
        roomConnections.delete(connectionId);
        if (roomConnections.size === 0) {
          this.rooms.delete(currentRoom);
        }
      }
    }

    // Join new room
    if (!this.rooms.has(chatRoomId)) {
      this.rooms.set(chatRoomId, new Set());
    }
    this.rooms.get(chatRoomId)!.add(connectionId);
    this.userRooms.set(connectionId, chatRoomId);

    console.log(`User ${connection.userId} joined room: ${chatRoomId}`);

    // Send confirmation
    this.sendMessage(connection.socket, {
      type: 'room_joined',
      data: { chatRoomId },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle leave room request
   */
  private async handleLeaveRoom(connectionId: string, roomData: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) return;

    // This will be implemented when chat room service is integrated
    console.log(`User ${connection.userId} leaving room:`, roomData);
  }

  /**
   * Handle message status update (read/delivered)
   */
  private async handleMessageStatusUpdate(
    connectionId: string,
    data: WebSocketMessage,
    status: 'read' | 'delivered'
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) return;

    const { messageId } = data.data || {};
    if (!messageId) {
      this.sendError(connection.socket, 'Message ID is required for status update');
      return;
    }

    try {
      // Import MessageService to handle status update
      const { MessageService } = await import('../message/message.service');

      // TODO: Implement proper dependency injection for MessageService
      // const result = await MessageService.updateMessageStatus(
      //   messageId,
      //   status,
      //   connection.userId
      // );
      const result = { success: true, error: null }; // Temporary fix

      if (result.success) {
        // Send acknowledgment
        this.sendMessage(connection.socket, {
          type: `message_${status}_ack`,
          data: { messageId, status },
          timestamp: new Date().toISOString()
        });
      } else {
        this.sendError(connection.socket, result.error || `Failed to mark message as ${status}`);
      }
    } catch (error) {
      console.error(`Error updating message status from ${connectionId}:`, error);
      this.sendError(connection.socket, `Failed to update message status`);
    }
  }

  /**
   * Handle get unread count request
   */
  private async handleGetUnreadCount(connectionId: string, requestData: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) return;

    try {
      // Import MessageService to get unread count
      const { MessageService } = await import('../message/message.service');

      // TODO: Implement proper dependency injection for MessageService
      // const result = await MessageService.getUnreadMessageCount(
      //   connection.userId,
      //   requestData?.chatRoomId
      // );
      const result = { success: true, data: { unreadCount: 0 }, error: null }; // Temporary fix

      if (result.success) {
        this.sendMessage(connection.socket, {
          type: 'unread_count_response',
          data: result.data,
          timestamp: new Date().toISOString()
        });
      } else {
        this.sendError(connection.socket, result.error || 'Failed to get unread count');
      }
    } catch (error) {
      console.error(`Error getting unread count from ${connectionId}:`, error);
      this.sendError(connection.socket, 'Failed to get unread count');
    }
  }

  /**
   * Setup heartbeat mechanism
   */
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeatCheck();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Perform heartbeat check on all connections
   */
  private performHeartbeatCheck(): void {
    const now = new Date();
    const connectionsToClose: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      const timeSinceLastHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();

      if (timeSinceLastHeartbeat > this.CONNECTION_TIMEOUT) {
        console.log(`Connection ${connectionId} timed out`);
        connectionsToClose.push(connectionId);
      } else if (connection.socket.readyState === WebSocket.OPEN) {
        // Send ping
        connection.socket.ping();
      }
    }

    // Close timed out connections
    connectionsToClose.forEach(connectionId => {
      this.closeConnection(connectionId, 4000, 'Connection timeout');
    });
  }

  /**
   * Broadcast user status change to contacts
   */
  private async broadcastUserStatusChange(userId: string, isOnline: boolean): Promise<void> {
    try {
      // Get user's contacts (this will be implemented when contact service is ready)
      // For now, just log the status change
      console.log(`Broadcasting status change for user ${userId}: ${isOnline ? 'online' : 'offline'}`);

      // TODO: Get user contacts and broadcast to their active connections
      // const contacts = await ContactService.getUserContacts(userId);
      // for (const contact of contacts) {
      //   this.sendToUser(contact.id, {
      //     type: 'user_status_change',
      //     data: { userId, isOnline },
      //     timestamp: new Date().toISOString()
      //   });
      // }
    } catch (error) {
      console.error('Error broadcasting user status change:', error);
    }
  }

  /**
   * Send message to a specific user (all their connections)
   */
  public sendToUser(userId: string, message: WebSocketMessage): void {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections) return;

    for (const connectionId of userConnections) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.socket.readyState === WebSocket.OPEN) {
        this.sendMessage(connection.socket, message);
      }
    }
  }

  /**
   * Send message to multiple users
   */
  public sendToUsers(userIds: string[], message: WebSocketMessage): void {
    userIds.forEach(userId => this.sendToUser(userId, message));
  }

  /**
   * Send message to all connected users
   */
  public broadcast(message: WebSocketMessage): void {
    for (const connection of this.connections.values()) {
      if (connection.isActive && connection.socket.readyState === WebSocket.OPEN) {
        this.sendMessage(connection.socket, message);
      }
    }
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: WebSocket | undefined, error: string, context?: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      this.sendMessage(ws, {
        type: 'error',
        data: { error, context },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send authentication error and close connection
   */
  private sendAuthError(connectionId: string, error: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.sendError(connection.socket, error, 'authentication');
      setTimeout(() => {
        this.closeConnection(connectionId, 4001, 'Authentication failed');
      }, 1000);
    }
  }

  /**
   * Close a specific connection
   */
  public closeConnection(connectionId: string, code: number = 1000, reason: string = 'Normal closure'): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.close(code, reason);
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    authenticatedConnections: number;
    uniqueUsers: number;
  } {
    const totalConnections = this.connections.size;
    let activeConnections = 0;
    let authenticatedConnections = 0;

    for (const connection of this.connections.values()) {
      if (connection.socket.readyState === WebSocket.OPEN) {
        activeConnections++;
      }
      if (connection.isActive) {
        authenticatedConnections++;
      }
    }

    return {
      totalConnections,
      activeConnections,
      authenticatedConnections,
      uniqueUsers: this.userConnections.size
    };
  }

  /**
   * Get user connection status
   */
  public isUserOnline(userId: string): boolean {
    return this.userConnections.has(userId);
  }

  /**
   * Get user connections
   */
  public getUserConnections(userId: string): WebSocketConnection[] {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return [];

    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((conn): conn is WebSocketConnection => conn !== undefined);
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all connections
    for (const [connectionId] of this.connections) {
      this.closeConnection(connectionId, 1001, 'Server shutdown');
    }

    this.connections.clear();
    this.userConnections.clear();
  }

  /**
   * Mark messages as delivered when user comes online
   */
  private async markUserMessagesAsDelivered(userId: string): Promise<void> {
    try {
      // Import MessageService to mark messages as delivered
      const { MessageService } = await import('../message/message.service');

      // TODO: Implement proper dependency injection for MessageService
      // await MessageService.markMessagesAsDelivered(userId);
    } catch (error) {
      console.error('Error marking messages as delivered for user:', userId, error);
    }
  }

  /**
   * Handle device registration for cross-device sync
   */
  private async handleDeviceRegistration(connectionId: string, deviceData: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) {
      this.sendError(connection?.socket, 'Not authenticated');
      return;
    }

    try {
      const { deviceId } = deviceData;
      if (!deviceId) {
        this.sendError(connection.socket, 'Device ID is required');
        return;
      }

      const offlineService = OfflineService.getInstance();
      const result = await offlineService.registerDeviceSession(
        connection.userId,
        deviceId,
        connectionId
      );

      if (result.success) {
        this.sendMessage(connection.socket, {
          type: 'device_registered',
          data: { deviceId },
          timestamp: new Date().toISOString()
        });
      } else {
        this.sendError(connection.socket, result.error || 'Failed to register device');
      }
    } catch (error) {
      console.error(`Error handling device registration from ${connectionId}:`, error);
      this.sendError(connection.socket, 'Failed to register device');
    }
  }

  /**
   * Handle retry queued message request
   */
  private async handleRetryQueuedMessage(connectionId: string, retryData: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) {
      this.sendError(connection?.socket, 'Not authenticated');
      return;
    }

    try {
      const { queuedMessageId } = retryData;
      if (!queuedMessageId) {
        this.sendError(connection.socket, 'Queued message ID is required');
        return;
      }

      const offlineService = OfflineService.getInstance();
      const result = await offlineService.retryMessageDelivery(queuedMessageId);

      if (result.success) {
        this.sendMessage(connection.socket, {
          type: 'queued_message_retry_success',
          data: result.data,
          timestamp: new Date().toISOString()
        });
      } else {
        this.sendError(connection.socket, result.error || 'Failed to retry message delivery');
      }
    } catch (error) {
      console.error(`Error handling retry queued message from ${connectionId}:`, error);
      this.sendError(connection.socket, 'Failed to retry message delivery');
    }
  }

  /**
   * Handle device synchronization request
   */
  private async handleDeviceSync(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) {
      this.sendError(connection?.socket, 'Not authenticated');
      return;
    }

    try {
      const offlineService = OfflineService.getInstance();
      const result = await offlineService.synchronizeUserDevices(connection.userId);

      if (result.success) {
        this.sendMessage(connection.socket, {
          type: 'device_sync_complete',
          data: result.data,
          timestamp: new Date().toISOString()
        });
      } else {
        this.sendError(connection.socket, result.error || 'Failed to sync devices');
      }
    } catch (error) {
      console.error(`Error handling device sync from ${connectionId}:`, error);
      this.sendError(connection.socket, 'Failed to sync devices');
    }
  }

  /**
   * Handle connection status request
   */
  private async handleConnectionStatusRequest(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const reconnectionManager = ReconnectionManager.getInstance();
      const offlineService = OfflineService.getInstance();

      const connectionHealth = reconnectionManager.getConnectionHealth(connectionId);
      const queuedMessages = connection.isActive ?
        offlineService.getQueuedMessages(connection.userId) : [];
      const deviceSessions = connection.isActive ?
        offlineService.getDeviceSessions(connection.userId) : [];

      this.sendMessage(connection.socket, {
        type: 'connection_status_response',
        data: {
          connectionId,
          isAuthenticated: connection.isActive,
          health: connectionHealth,
          queuedMessagesCount: queuedMessages.length,
          activeDevices: deviceSessions.filter(s => s.isActive).length,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error handling connection status request from ${connectionId}:`, error);
      this.sendError(connection.socket, 'Failed to get connection status');
    }
  }

  /**
   * Send message to offline user (queue it)
   */
  public async sendToOfflineUser(userId: string, messageData: any): Promise<void> {
    try {
      const offlineService = OfflineService.getInstance();
      await offlineService.queueMessage(userId, messageData);
    } catch (error) {
      console.error(`Error queuing message for offline user ${userId}:`, error);
    }
  }

  /**
   * Get offline support statistics
   */
  public getOfflineStats(): any {
    const offlineService = OfflineService.getInstance();
    const reconnectionManager = ReconnectionManager.getInstance();

    return {
      offline: offlineService.getOfflineStats(),
      reconnection: reconnectionManager.getReconnectionStats(),
      connections: this.getConnectionStats()
    };
  }
}