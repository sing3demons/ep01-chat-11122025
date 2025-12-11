// Notification service for managing browser notifications and sounds
import type { Notification, NotificationSettings } from '../types/index';

export interface NotificationSoundOptions {
  volume?: number;
  duration?: number;
}

class NotificationService {
  private audioContext: AudioContext | null = null;
  private soundCache: Map<string, AudioBuffer | null> = new Map();
  private settings: NotificationSettings | null = null;
  private permission: NotificationPermission = 'default';

  constructor() {
    this.initializeAudioContext();
    this.checkBrowserNotificationPermission();
  }

  // Initialize audio context for sound playback
  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  // Check browser notification permission
  private checkBrowserNotificationPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  // Request browser notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  // Set notification settings
  setSettings(settings: NotificationSettings) {
    this.settings = settings;
  }

  // Get current settings
  getSettings(): NotificationSettings | null {
    return this.settings;
  }

  // Show browser notification
  async showBrowserNotification(notification: Notification): Promise<void> {
    // Check if browser notifications are enabled in settings
    if (!this.settings?.desktopNotifications) {
      return;
    }

    // Check permission
    if (this.permission !== 'granted') {
      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') {
        return;
      }
    }

    // Filter notifications based on settings
    if (!this.shouldShowNotification(notification)) {
      return;
    }

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.content,
        icon: this.getNotificationIcon(notification.type),
        tag: notification.id,
        requireInteraction: notification.priority === 'high',
        silent: !this.settings?.soundEnabled
      });

      // Auto-close after 5 seconds (except high priority)
      if (notification.priority !== 'high') {
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }

      // Handle click
      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
        // Emit custom event for notification click
        window.dispatchEvent(new CustomEvent('notificationClick', {
          detail: notification
        }));
      };

    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  // Play notification sound
  async playNotificationSound(type: string, priority: string = 'normal', options: NotificationSoundOptions = {}): Promise<void> {
    // Check if sound is enabled in settings
    if (!this.settings?.soundEnabled || !this.audioContext) {
      return;
    }

    try {
      const soundKey = `${type}_${priority}`;
      let audioBuffer = this.soundCache.get(soundKey);

      if (!audioBuffer) {
        audioBuffer = await this.loadSound(type, priority);
        if (audioBuffer) {
          this.soundCache.set(soundKey, audioBuffer);
        }
      }

      if (audioBuffer) {
        await this.playAudioBuffer(audioBuffer, options);
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  // Load sound file
  private async loadSound(type: string, priority: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    try {
      // Generate different tones for different notification types
      const frequency = this.getFrequencyForType(type, priority);
      const duration = priority === 'high' ? 0.3 : 0.2;
      
      return this.generateTone(frequency, duration);
    } catch (error) {
      console.error('Error loading sound:', error);
      return null;
    }
  }

  // Generate tone for notification
  private generateTone(frequency: number, duration: number): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not available');

    const sampleRate = this.audioContext.sampleRate;
    const numSamples = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Create a pleasant notification tone with fade in/out
      const envelope = Math.sin(Math.PI * t / duration);
      channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    }

    return buffer;
  }

  // Play audio buffer
  private async playAudioBuffer(audioBuffer: AudioBuffer, options: NotificationSoundOptions): Promise<void> {
    if (!this.audioContext) return;

    // Resume audio context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = audioBuffer;
    gainNode.gain.value = options.volume ?? 0.5;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start();
  }

  // Get frequency for notification type
  private getFrequencyForType(type: string, priority: string): number {
    const baseFrequencies = {
      message: 800,
      mention: 1000,
      group_activity: 600
    };

    const frequency = baseFrequencies[type as keyof typeof baseFrequencies] || 800;
    return priority === 'high' ? frequency * 1.2 : frequency;
  }

  // Get notification icon
  private getNotificationIcon(type: string): string {
    // Return data URLs for simple icons or paths to icon files
    switch (type) {
      case 'message':
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDJINEMyLjkgMiAyLjAxIDIuOSAyLjAxIDRMMiAyMkw2IDE4SDE4QzE5LjEgMTggMjAgMTcuMSAyMCAxNlY0QzIwIDIuOSAxOS4xIDIgMTggMloiIGZpbGw9IiMwMDdiZmYiLz4KPC9zdmc+';
      case 'mention':
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyUzYuNDggMjIgMTIgMjIgMjIgMTcuNTIgMjIgMTIgMTcuNTIgMiAxMiAyWk0xMyAxN0gxMVYxNUgxM1YxN1pNMTMgMTNIMTFWN0gxM1YxM1oiIGZpbGw9IiNkYzM1NDUiLz4KPC9zdmc+';
      case 'group_activity':
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2IDRDMTguMjEgNCAyMCA1Ljc5IDIwIDhTMTguMjEgMTIgMTYgMTJTMTIgMTAuMjEgMTIgOFMxMy43OSA0IDE2IDRaTTggNEM5LjEgNCA5IDQuOSA5IDZTOC4xIDggNyA4UzUgNy4xIDUgNlM1LjkgNCA3IDRaTTggMTJDNS43OSAxMiA0IDEzLjc5IDQgMTZWMjBIMTJWMTZDMTIgMTMuNzkgMTAuMjEgMTIgOCAxMlpNMTYgMTJDMTMuNzkgMTIgMTIgMTMuNzkgMTIgMTZWMjBIMjBWMTZDMjAgMTMuNzkgMTguMjEgMTIgMTYgMTJaIiBmaWxsPSIjMjhhNzQ1Ii8+Cjwvc3ZnPg==';
      default:
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjVMMjIgN1YxN0wyMCAxOUg0TDIgMTdWN0wxMCA1VjRDMTAgMi45IDEwLjkgMiAxMiAyWiIgZmlsbD0iIzAwN2JmZiIvPgo8L3N2Zz4=';
    }
  }

  // Check if notification should be shown based on settings
  private shouldShowNotification(notification: Notification): boolean {
    if (!this.settings) return true;

    switch (notification.type) {
      case 'mention':
        return this.settings.mentionNotifications;
      case 'group_activity':
        return this.settings.groupNotifications;
      case 'message':
      default:
        return true; // Always show message notifications if desktop notifications are enabled
    }
  }

  // Handle notification display (combines browser notification and sound)
  async handleNotification(notification: Notification): Promise<void> {
    // Show browser notification
    await this.showBrowserNotification(notification);

    // Play sound
    await this.playNotificationSound(notification.type, notification.priority);
  }

  // Clear all browser notifications
  clearAllBrowserNotifications(): void {
    // This is limited by browser APIs - we can only close notifications we created
    // Most browsers don't provide a way to clear all notifications programmatically
    console.log('Clearing browser notifications (limited by browser APIs)');
  }

  // Test notification (for settings)
  async testNotification(): Promise<void> {
    const testNotification: Notification = {
      id: 'test',
      userId: 'test',
      type: 'message',
      title: 'Test Notification',
      content: 'This is a test notification',
      chatRoomId: 'test',
      isRead: false,
      priority: 'normal',
      createdAt: new Date()
    };

    await this.handleNotification(testNotification);
  }

  // Cleanup resources
  cleanup(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.soundCache.clear();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default NotificationService;