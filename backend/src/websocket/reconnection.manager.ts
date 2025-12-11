import { WebSocket } from 'ws';
import { WebSocketManager, WebSocketConnection } from './websocket.manager';
import { OfflineService } from './offline.service';
import { UserService } from '../user/user.service';

export interface ReconnectionAttempt {
  userId: string;
  deviceId?: string;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastError?: string;
}

export interface ConnectionHealth {
  connectionId: string;
  userId: string;
  isHealthy: boolean;
  lastPingAt: Date;
  lastPongAt: Date;
  missedPings: number;
  latency: number;
}

/**
 * Reconnection Manager
 * Handles automatic reconnection logic and connection health monitoring
 */
export class ReconnectionManager {
  private static instance: ReconnectionManager;
  private reconnectionAttempts: Map<string, ReconnectionAttempt> = new Map(); // userId -> attempt
  private connectionHealth: Map<string, ConnectionHealth> = new Map(); // connectionId -> health
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectionInterval: NodeJS.Timeout | null = null;
  
  private readonly HEALTH_CHECK_INTERVAL = 15000; // 15 seconds
  private readonly RECONNECTION_CHECK_INTERVAL = 5000; // 5 seconds
  private readonly MAX_RECONNECTION_ATTEMPTS = 10;
  private readonly RECONNECTION_BACKOFF_BASE = 1000; // 1 second
  private readonly RECONNECTION_BACKOFF_MAX = 30000; // 30 seconds
  private readonly MAX_MISSED_PINGS = 3;
  private readonly PING_TIMEOUT = 10000; // 10 seconds

  private wsManager: WebSocketManager | null = null;

  private constructor() {
    this.startHealthMonitoring();
    this.startReconnectionProcessor();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ReconnectionManager {
    if (!ReconnectionManager.instance) {
      ReconnectionManager.instance = new ReconnectionManager();
    }
    return ReconnectionManager.instance;
  }

  /**
   * Initialize with WebSocket manager
   */
  public initialize(wsManager: WebSocketManager): void {
    this.wsManager = wsManager;
  }

  /**
   * Register connection for health monitoring
   */
  public registerConnection(connection: WebSocketConnection): void {
    const health: ConnectionHealth = {
      connectionId: connection.id,
      userId: connection.userId,
      isHealthy: true,
      lastPingAt: new Date(),
      lastPongAt: new Date(),
      missedPings: 0,
      latency: 0
    };

    this.connectionHealth.set(connection.id, health);
    console.log(`Connection health monitoring started for ${connection.id}`);
  }

  /**
   * Unregister connection from health monitoring
   */
  public unregisterConnection(connectionId: string): void {
    const health = this.connectionHealth.get(connectionId);
    if (health) {
      this.connectionHealth.delete(connectionId);
      console.log(`Connection health monitoring stopped for ${connectionId}`);
    }
  }

  /**
   * Update connection health on pong received
   */
  public updateConnectionHealth(connectionId: string, pongReceived: boolean = true): void {
    const health = this.connectionHealth.get(connectionId);
    if (!health) return;

    const now = new Date();

    if (pongReceived) {
      health.lastPongAt = now;
      health.latency = now.getTime() - health.lastPingAt.getTime();
      health.missedPings = 0;
      health.isHealthy = true;
    } else {
      health.missedPings++;
      health.isHealthy = health.missedPings < this.MAX_MISSED_PINGS;
    }

    console.log(`Connection ${connectionId} health updated: healthy=${health.isHealthy}, latency=${health.latency}ms, missed=${health.missedPings}`);
  }

  /**
   * Handle connection disconnection and initiate reconnection if needed
   */
  public async handleDisconnection(
    userId: string, 
    connectionId: string, 
    code: number, 
    reason: string,
    deviceId?: string
  ): Promise<void> {
    try {
      console.log(`Handling disconnection for user ${userId}, connection ${connectionId}: ${code} - ${reason}`);

      // Remove from health monitoring
      this.unregisterConnection(connectionId);

      // Check if disconnection was unexpected (not a normal closure)
      const isUnexpectedDisconnection = code !== 1000 && code !== 1001;

      if (isUnexpectedDisconnection) {
        // Initiate reconnection attempt
        await this.initiateReconnection(userId, deviceId, reason);
      } else {
        // Clean up any existing reconnection attempts
        this.reconnectionAttempts.delete(userId);
      }

      // Update user offline status if no other connections exist
      if (this.wsManager && !this.wsManager.isUserOnline(userId)) {
        await UserService.updateOnlineStatus(userId, false);
      }

    } catch (error) {
      console.error(`Error handling disconnection for user ${userId}:`, error);
    }
  }

  /**
   * Initiate reconnection attempt for a user
   */
  public async initiateReconnection(userId: string, deviceId?: string, lastError?: string): Promise<void> {
    try {
      let attempt = this.reconnectionAttempts.get(userId);

      if (!attempt) {
        // Create new reconnection attempt
        attempt = {
          userId,
          deviceId,
          attemptCount: 0,
          maxAttempts: this.MAX_RECONNECTION_ATTEMPTS,
          nextAttemptAt: new Date(),
          lastError
        };
      } else {
        // Update existing attempt
        attempt.lastError = lastError;
      }

      this.reconnectionAttempts.set(userId, attempt);
      console.log(`Reconnection initiated for user ${userId}, device ${deviceId || 'unknown'}`);

    } catch (error) {
      console.error(`Error initiating reconnection for user ${userId}:`, error);
    }
  }

  /**
   * Handle successful reconnection
   */
  public async handleSuccessfulReconnection(userId: string, connectionId: string, deviceId?: string): Promise<void> {
    try {
      console.log(`Successful reconnection for user ${userId}, connection ${connectionId}`);

      // Remove reconnection attempt
      this.reconnectionAttempts.delete(userId);

      // Handle offline support tasks
      const offlineService = OfflineService.getInstance();
      await offlineService.handleReconnection(userId, deviceId);

      // Register new connection for health monitoring
      if (this.wsManager) {
        const connections = this.wsManager.getUserConnections(userId);
        const connection = connections.find(c => c.id === connectionId);
        if (connection) {
          this.registerConnection(connection);
        }
      }

    } catch (error) {
      console.error(`Error handling successful reconnection for user ${userId}:`, error);
    }
  }

  /**
   * Cancel reconnection attempts for a user
   */
  public cancelReconnection(userId: string): void {
    const attempt = this.reconnectionAttempts.get(userId);
    if (attempt) {
      this.reconnectionAttempts.delete(userId);
      console.log(`Reconnection cancelled for user ${userId}`);
    }
  }

  /**
   * Get reconnection status for a user
   */
  public getReconnectionStatus(userId: string): ReconnectionAttempt | null {
    return this.reconnectionAttempts.get(userId) || null;
  }

  /**
   * Get connection health for a connection
   */
  public getConnectionHealth(connectionId: string): ConnectionHealth | null {
    return this.connectionHealth.get(connectionId) || null;
  }

  /**
   * Get all unhealthy connections
   */
  public getUnhealthyConnections(): ConnectionHealth[] {
    return Array.from(this.connectionHealth.values()).filter(health => !health.isHealthy);
  }

  /**
   * Force reconnection for a user
   */
  public async forceReconnection(userId: string, reason: string = 'Manual reconnection'): Promise<void> {
    try {
      // Close existing connections
      if (this.wsManager) {
        const connections = this.wsManager.getUserConnections(userId);
        connections.forEach(connection => {
          this.wsManager!.closeConnection(connection.id, 4003, reason);
        });
      }

      // Initiate reconnection
      await this.initiateReconnection(userId, undefined, reason);

    } catch (error) {
      console.error(`Error forcing reconnection for user ${userId}:`, error);
    }
  }

  /**
   * Get reconnection statistics
   */
  public getReconnectionStats(): {
    activeReconnectionAttempts: number;
    totalConnectionsMonitored: number;
    healthyConnections: number;
    unhealthyConnections: number;
    averageLatency: number;
  } {
    const healthyConnections = Array.from(this.connectionHealth.values()).filter(h => h.isHealthy).length;
    const unhealthyConnections = this.connectionHealth.size - healthyConnections;
    
    const latencies = Array.from(this.connectionHealth.values()).map(h => h.latency);
    const averageLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

    return {
      activeReconnectionAttempts: this.reconnectionAttempts.size,
      totalConnectionsMonitored: this.connectionHealth.size,
      healthyConnections,
      unhealthyConnections,
      averageLatency: Math.round(averageLatency)
    };
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Start reconnection processor
   */
  private startReconnectionProcessor(): void {
    this.reconnectionInterval = setInterval(() => {
      this.processReconnectionAttempts();
    }, this.RECONNECTION_CHECK_INTERVAL);
  }

  /**
   * Perform health check on all monitored connections
   */
  private performHealthCheck(): void {
    if (!this.wsManager) return;

    const now = new Date();

    for (const [connectionId, health] of this.connectionHealth) {
      // Check if connection is still active
      const connections = this.wsManager.getUserConnections(health.userId);
      const connection = connections.find(c => c.id === connectionId);

      if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
        // Connection is no longer active, remove from monitoring
        this.connectionHealth.delete(connectionId);
        continue;
      }

      // Check for missed pings
      const timeSinceLastPong = now.getTime() - health.lastPongAt.getTime();
      
      if (timeSinceLastPong > this.PING_TIMEOUT) {
        this.updateConnectionHealth(connectionId, false);
        
        // If connection is unhealthy, close it to trigger reconnection
        if (!health.isHealthy) {
          console.log(`Closing unhealthy connection ${connectionId} for user ${health.userId}`);
          this.wsManager.closeConnection(connectionId, 4004, 'Connection unhealthy');
        }
      }

      // Send ping
      if (connection.socket.readyState === WebSocket.OPEN) {
        health.lastPingAt = now;
        connection.socket.ping();
      }
    }
  }

  /**
   * Process reconnection attempts
   */
  private async processReconnectionAttempts(): Promise<void> {
    const now = new Date();

    for (const [userId, attempt] of this.reconnectionAttempts) {
      // Check if it's time for the next attempt
      if (attempt.nextAttemptAt > now) {
        continue;
      }

      // Check if max attempts reached
      if (attempt.attemptCount >= attempt.maxAttempts) {
        console.log(`Max reconnection attempts reached for user ${userId}`);
        this.reconnectionAttempts.delete(userId);
        continue;
      }

      // Check if user is already connected
      if (this.wsManager && this.wsManager.isUserOnline(userId)) {
        console.log(`User ${userId} is already connected, cancelling reconnection`);
        this.reconnectionAttempts.delete(userId);
        continue;
      }

      // Increment attempt count
      attempt.attemptCount++;

      // Calculate next attempt time with exponential backoff
      const backoffDelay = Math.min(
        this.RECONNECTION_BACKOFF_BASE * Math.pow(2, attempt.attemptCount - 1),
        this.RECONNECTION_BACKOFF_MAX
      );
      attempt.nextAttemptAt = new Date(now.getTime() + backoffDelay);

      console.log(`Reconnection attempt ${attempt.attemptCount}/${attempt.maxAttempts} for user ${userId}, next attempt in ${backoffDelay}ms`);

      // Note: Actual reconnection is handled by the client
      // Server just tracks the attempts and provides guidance
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.reconnectionInterval) {
      clearInterval(this.reconnectionInterval);
      this.reconnectionInterval = null;
    }

    this.reconnectionAttempts.clear();
    this.connectionHealth.clear();
  }
}