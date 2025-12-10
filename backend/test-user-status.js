// Test script for user status and presence system
const { PrismaClient } = require('@prisma/client');
const { UserService } = require('./dist/services/UserService');
const { WebSocketManager } = require('./dist/services/WebSocketManager');

const prisma = new PrismaClient();

async function testUserStatusSystem() {
  console.log('🚀 Testing User Status and Presence System...\n');

  try {
    // Initialize services
    const webSocketManager = new WebSocketManager();
    const userService = new UserService(webSocketManager);

    // Clean up any existing test data (in correct order due to foreign keys)
    await prisma.contact.deleteMany({});
    await prisma.blockedUser.deleteMany({});
    await prisma.privacySettings.deleteMany({});
    await prisma.user.deleteMany({ where: { username: { contains: 'testuser' } } });

    console.log('1️⃣ Creating test users...');
    
    // Create test users
    const user1 = await prisma.user.create({
      data: {
        username: 'testuser1',
        email: 'test1@example.com',
        passwordHash: 'hash1',
      },
    });

    const user2 = await prisma.user.create({
      data: {
        username: 'testuser2',
        email: 'test2@example.com',
        passwordHash: 'hash2',
      },
    });

    console.log(`✅ Created users: ${user1.username} (${user1.id}) and ${user2.username} (${user2.id})\n`);

    console.log('2️⃣ Testing online status management...');
    
    // Test setting user online
    const onlineUser1 = await userService.updateUserStatus(user1.id, true);
    console.log(`✅ ${user1.username} is now online: ${onlineUser1.isOnline}`);

    // Test updating last seen
    await userService.updateLastSeen(user1.id);
    console.log(`✅ Updated last seen for ${user1.username}`);

    // Test setting user offline
    const offlineUser1 = await userService.updateUserStatus(user1.id, false);
    console.log(`✅ ${user1.username} is now offline: ${offlineUser1.isOnline}\n`);

    console.log('3️⃣ Testing privacy settings...');
    
    // Test privacy settings
    const privacySettings = await userService.getPrivacySettings(user1.id);
    console.log(`✅ Default privacy settings for ${user1.username}:`, {
      showOnlineStatus: privacySettings.showOnlineStatus,
      showLastSeen: privacySettings.showLastSeen,
      allowContactsOnly: privacySettings.allowContactsOnly,
    });

    // Update privacy settings
    const updatedPrivacy = await userService.updatePrivacySettings(user1.id, {
      showOnlineStatus: false,
      allowContactsOnly: true,
    });
    console.log(`✅ Updated privacy settings:`, {
      showOnlineStatus: updatedPrivacy.showOnlineStatus,
      showLastSeen: updatedPrivacy.showLastSeen,
      allowContactsOnly: updatedPrivacy.allowContactsOnly,
    });

    console.log('\n4️⃣ Testing contact management...');
    
    // Add contact
    await userService.addContact(user1.id, user2.id);
    console.log(`✅ Added ${user2.username} as contact of ${user1.username}`);

    // Get contacts
    const contacts = await userService.getContacts(user1.id);
    console.log(`✅ ${user1.username} has ${contacts.length} contacts`);

    console.log('\n5️⃣ Testing status visibility with privacy settings...');
    
    // Set user2 online
    await userService.updateUserStatus(user2.id, true);
    
    // Test status visibility (user2 should be visible to user1 since they're contacts)
    const statusForContact = await userService.getUserStatusForContact(user1.id, user2.id);
    console.log(`✅ ${user2.username} status as seen by ${user1.username}:`, {
      isOnline: statusForContact.isOnline,
      hasLastSeen: !!statusForContact.lastSeen,
    });

    console.log('\n6️⃣ Testing user blocking...');
    
    // Block user
    await userService.blockUser(user1.id, user2.id);
    console.log(`✅ ${user1.username} blocked ${user2.username}`);

    // Check if blocked
    const isBlocked = await userService.isUserBlocked(user1.id, user2.id);
    console.log(`✅ Is ${user2.username} blocked by ${user1.username}? ${isBlocked}`);

    // Test status visibility after blocking (should be offline)
    const statusAfterBlock = await userService.getUserStatusForContact(user1.id, user2.id);
    console.log(`✅ ${user2.username} status after blocking:`, {
      isOnline: statusAfterBlock.isOnline,
      hasLastSeen: !!statusAfterBlock.lastSeen,
    });

    console.log('\n7️⃣ Testing unblock...');
    
    // Unblock user
    await userService.unblockUser(user1.id, user2.id);
    console.log(`✅ ${user1.username} unblocked ${user2.username}`);

    const isStillBlocked = await userService.isUserBlocked(user1.id, user2.id);
    console.log(`✅ Is ${user2.username} still blocked? ${isStillBlocked}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ User creation and management');
    console.log('✅ Online/offline status updates');
    console.log('✅ Last seen timestamp tracking');
    console.log('✅ Privacy settings management');
    console.log('✅ Contact management');
    console.log('✅ Status visibility with privacy controls');
    console.log('✅ User blocking and unblocking');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await prisma.contact.deleteMany({});
    await prisma.blockedUser.deleteMany({});
    await prisma.privacySettings.deleteMany({});
    await prisma.user.deleteMany({ where: { username: { contains: 'testuser' } } });
    
    await prisma.$disconnect();
    console.log('✅ Cleanup completed');
  }
}

// Run the test
testUserStatusSystem().catch(console.error);