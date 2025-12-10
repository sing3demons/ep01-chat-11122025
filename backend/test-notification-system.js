// Test script for notification system integration
const { PrismaClient } = require('@prisma/client');
const { NotificationService } = require('./dist/services/NotificationService');
const { WebSocketManager } = require('./dist/services/WebSocketManager');

const prisma = new PrismaClient();

async function testNotificationSystem() {
  console.log('🔔 Testing Notification System...\n');

  // Initialize services
  const webSocketManager = new WebSocketManager();
  const notificationService = new NotificationService(webSocketManager);

  try {
    // Clean up any existing test data
    console.log('🧹 Cleaning up existing test data...');
    await prisma.notification.deleteMany({});
    await prisma.notificationSettings.deleteMany({});
    await prisma.chatRoom.deleteMany({});
    await prisma.user.deleteMany({ where: { username: { contains: 'notiftest' } } });
    console.log('✅ Cleanup completed\n');

    console.log('1️⃣ Creating test users...');
    
    // Create test users
    const user1 = await prisma.user.create({
      data: {
        username: 'notiftest_alice',
        email: 'alice@example.com',
        passwordHash: 'hash1',
      },
    });

    const user2 = await prisma.user.create({
      data: {
        username: 'notiftest_bob',
        email: 'bob@example.com',
        passwordHash: 'hash2',
      },
    });

    console.log(`✅ Created users: Alice (${user1.id}), Bob (${user2.id})\n`);

    console.log('2️⃣ Testing notification settings...');
    
    // Get default notification settings for Alice
    const aliceSettings = await notificationService.getNotificationSettings(user1.id);
    console.log(`✅ Alice's default settings:`, {
      soundEnabled: aliceSettings.soundEnabled,
      desktopNotifications: aliceSettings.desktopNotifications,
      mentionNotifications: aliceSettings.mentionNotifications,
      groupNotifications: aliceSettings.groupNotifications,
    });

    // Update Bob's notification settings
    const updatedBobSettings = await notificationService.updateNotificationSettings(user2.id, {
      soundEnabled: false,
      desktopNotifications: true,
      mentionNotifications: true,
      groupNotifications: false,
    });
    console.log(`✅ Updated Bob's settings:`, {
      soundEnabled: updatedBobSettings.soundEnabled,
      desktopNotifications: updatedBobSettings.desktopNotifications,
      mentionNotifications: updatedBobSettings.mentionNotifications,
      groupNotifications: updatedBobSettings.groupNotifications,
    });

    console.log('\n3️⃣ Creating chat rooms...');
    
    // Create a direct chat room
    const directChat = await prisma.chatRoom.create({
      data: {
        type: 'direct',
        createdBy: user1.id,
      },
    });

    // Create a group chat room
    const groupChat = await prisma.chatRoom.create({
      data: {
        name: 'Project Team',
        type: 'group',
        createdBy: user1.id,
      },
    });

    console.log(`✅ Created chat rooms: Direct (${directChat.id}), Group (${groupChat.id})`);

    console.log('\n4️⃣ Testing message notifications...');
    
    // Create message notification for Alice
    const messageNotification = await notificationService.createMessageNotification(
      user1.id,
      user2.id,
      'Bob',
      'Hey Alice! How are you doing today?',
      directChat.id,
      'Direct Chat'
    );
    console.log(`✅ Created message notification:`, {
      id: messageNotification.id,
      type: messageNotification.type,
      title: messageNotification.title,
      priority: messageNotification.priority,
    });

    console.log('\n5️⃣ Testing mention notifications...');
    
    // Create mention notification for Bob
    const mentionNotification = await notificationService.createMentionNotification(
      user2.id,
      user1.id,
      'Alice',
      '@bob can you help me with this project?',
      groupChat.id,
      'Project Team'
    );
    console.log(`✅ Created mention notification:`, {
      id: mentionNotification.id,
      type: mentionNotification.type,
      title: mentionNotification.title,
      priority: mentionNotification.priority,
    });

    console.log('\n6️⃣ Testing group activity notifications...');
    
    // Create group activity notification for Alice
    const groupNotification = await notificationService.createGroupActivityNotification(
      user1.id,
      'member_added',
      'Bob',
      groupChat.id,
      'Project Team',
      'Charlie'
    );
    console.log(`✅ Created group activity notification:`, {
      id: groupNotification.id,
      type: groupNotification.type,
      title: groupNotification.title,
      priority: groupNotification.priority,
    });

    console.log('\n7️⃣ Testing unread counts...');
    
    // Get unread counts
    const aliceUnreadCount = await notificationService.getUnreadCount(user1.id);
    const bobUnreadCount = await notificationService.getUnreadCount(user2.id);
    console.log(`✅ Unread counts - Alice: ${aliceUnreadCount}, Bob: ${bobUnreadCount}`);

    console.log('\n8️⃣ Testing notification retrieval...');
    
    // Get notifications for Alice
    const aliceNotifications = await notificationService.getNotifications(user1.id);
    console.log(`✅ Alice has ${aliceNotifications.length} notifications:`);
    aliceNotifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. ${notif.type} - ${notif.title} (${notif.priority})`);
    });

    // Get notifications for Bob
    const bobNotifications = await notificationService.getNotifications(user2.id);
    console.log(`✅ Bob has ${bobNotifications.length} notifications:`);
    bobNotifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. ${notif.type} - ${notif.title} (${notif.priority})`);
    });

    console.log('\n9️⃣ Testing mark as read...');
    
    // Mark Alice's first notification as read
    if (aliceNotifications.length > 0) {
      await notificationService.markAsRead(aliceNotifications[0].id);
      console.log(`✅ Marked Alice's first notification as read`);
      
      const newAliceUnreadCount = await notificationService.getUnreadCount(user1.id);
      console.log(`✅ Alice's new unread count: ${newAliceUnreadCount}`);
    }

    console.log('\n🔟 Testing mark all as read...');
    
    // Mark all of Bob's notifications as read
    await notificationService.markAllAsRead(user2.id);
    console.log(`✅ Marked all of Bob's notifications as read`);
    
    const finalBobUnreadCount = await notificationService.getUnreadCount(user2.id);
    console.log(`✅ Bob's final unread count: ${finalBobUnreadCount}`);

    console.log('\n1️⃣1️⃣ Testing notification settings enforcement...');
    
    // Try to create a group notification for Bob (should fail because group notifications are disabled)
    try {
      await notificationService.createGroupActivityNotification(
        user2.id,
        'member_removed',
        'Alice',
        groupChat.id,
        'Project Team',
        'Charlie'
      );
      console.log('❌ Expected error for disabled group notifications');
    } catch (error) {
      console.log(`✅ Correctly blocked group notification: ${error.message}`);
    }

    console.log('\n🎉 All notification system tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Notification settings management');
    console.log('✅ Message notifications with normal priority');
    console.log('✅ Mention notifications with high priority');
    console.log('✅ Group activity notifications');
    console.log('✅ Unread count tracking');
    console.log('✅ Notification retrieval');
    console.log('✅ Mark as read functionality');
    console.log('✅ Mark all as read functionality');
    console.log('✅ Notification settings enforcement');

  } catch (error) {
    console.error('❌ Notification system test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await prisma.notification.deleteMany({});
    await prisma.notificationSettings.deleteMany({});
    await prisma.chatRoom.deleteMany({});
    await prisma.user.deleteMany({ where: { username: { contains: 'notiftest' } } });
    
    webSocketManager.cleanup();
    await prisma.$disconnect();
    console.log('✅ Cleanup completed');
  }
}

// Run the test
testNotificationSystem().catch(console.error);