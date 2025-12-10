// Test script for complete chat system
const { PrismaClient } = require('@prisma/client');
const { UserService } = require('./dist/services/UserService');
const { MessageService } = require('./dist/services/MessageService');
const { GroupService } = require('./dist/services/GroupService');
const { WebSocketManager } = require('./dist/services/WebSocketManager');

const prisma = new PrismaClient();

async function testChatSystem() {
  console.log('💬 Testing Complete Chat System...\n');

  // Initialize services outside try block so they're available in finally
  const webSocketManager = new WebSocketManager();
  const userService = new UserService(webSocketManager);
  const messageService = new MessageService(webSocketManager);
  const groupService = new GroupService(webSocketManager);

  try {

    // Clean up any existing test data
    console.log('🧹 Cleaning up existing test data...');
    await prisma.message.deleteMany({});
    await prisma.chatRoomParticipant.deleteMany({});
    await prisma.chatRoom.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.blockedUser.deleteMany({});
    await prisma.privacySettings.deleteMany({});
    await prisma.user.deleteMany({ where: { username: { contains: 'chattest' } } });

    console.log('✅ Cleanup completed\n');

    console.log('1️⃣ Creating test users...');
    
    // Create test users
    const user1 = await prisma.user.create({
      data: {
        username: 'chattest_alice',
        email: 'alice@example.com',
        passwordHash: 'hash1',
      },
    });

    const user2 = await prisma.user.create({
      data: {
        username: 'chattest_bob',
        email: 'bob@example.com',
        passwordHash: 'hash2',
      },
    });

    const user3 = await prisma.user.create({
      data: {
        username: 'chattest_charlie',
        email: 'charlie@example.com',
        passwordHash: 'hash3',
      },
    });

    console.log(`✅ Created users:`);
    console.log(`   - Alice (${user1.id})`);
    console.log(`   - Bob (${user2.id})`);
    console.log(`   - Charlie (${user3.id})\n`);

    // Set users online
    await userService.updateUserStatus(user1.id, true);
    await userService.updateUserStatus(user2.id, true);
    await userService.updateUserStatus(user3.id, true);
    console.log('✅ All users are now online\n');

    console.log('2️⃣ Testing Direct Chat...');
    
    // Create a direct chat room manually since GroupService is for groups
    const directChat = await prisma.chatRoom.create({
      data: {
        type: 'direct',
        createdBy: user1.id,
      },
    });

    // Add participants to direct chat
    await prisma.chatRoomParticipant.createMany({
      data: [
        { chatRoomId: directChat.id, userId: user1.id, role: 'member' },
        { chatRoomId: directChat.id, userId: user2.id, role: 'member' },
      ],
    });

    console.log(`✅ Created direct chat room: ${directChat.id}`);

    // Send messages in direct chat
    const message1 = await messageService.sendMessage({
      content: 'Hello Bob! How are you?',
      senderId: user1.id,
      chatRoomId: directChat.id
    });
    console.log(`✅ Alice sent: "${message1.content}"`);

    const message2 = await messageService.sendMessage({
      content: 'Hi Alice! I\'m doing great, thanks for asking!',
      senderId: user2.id,
      chatRoomId: directChat.id
    });
    console.log(`✅ Bob replied: "${message2.content}"`);

    // Get chat history
    const directChatHistory = await messageService.getMessages(directChat.id, user1.id, 10);
    console.log(`✅ Direct chat has ${directChatHistory.length} messages\n`);

    console.log('3️⃣ Testing Group Chat...');
    
    // Create a group chat
    const groupChat = await groupService.createGroup(
      'Test Group Chat',
      user1.id,
      [user1.id, user2.id, user3.id]
    );
    console.log(`✅ Created group chat: "${groupChat.name}" (${groupChat.id})`);

    // Check group members
    const groupMembers = await groupService.getGroupMembers(groupChat.id, user1.id);
    console.log(`✅ Group has ${groupMembers.length} members`);

    // Send group messages
    const groupMessage1 = await messageService.sendMessage({
      content: 'Welcome to our group chat everyone!',
      senderId: user1.id,
      chatRoomId: groupChat.id
    });
    console.log(`✅ Alice (admin) sent: "${groupMessage1.content}"`);

    const groupMessage2 = await messageService.sendMessage({
      content: 'Thanks for creating this group, Alice!',
      senderId: user2.id,
      chatRoomId: groupChat.id
    });
    console.log(`✅ Bob sent: "${groupMessage2.content}"`);

    const groupMessage3 = await messageService.sendMessage({
      content: 'Happy to be here! 🎉',
      senderId: user3.id,
      chatRoomId: groupChat.id
    });
    console.log(`✅ Charlie sent: "${groupMessage3.content}"`);

    // Get group chat history
    const groupChatHistory = await messageService.getMessages(groupChat.id, user1.id, 10);
    console.log(`✅ Group chat has ${groupChatHistory.length} messages\n`);

    console.log('4️⃣ Testing Message Status Updates...');
    
    // Update message status
    const deliveredMessage = await messageService.updateMessageStatus(message1.id, 'delivered', user2.id);
    console.log(`✅ Message status updated to: ${deliveredMessage.status}`);

    const readMessage = await messageService.updateMessageStatus(message1.id, 'read', user2.id);
    console.log(`✅ Message status updated to: ${readMessage.status}\n`);

    console.log('5️⃣ Testing Group Admin Functions...');
    
    // Check if user1 is admin
    const isAliceAdmin = await groupService.isUserAdmin(groupChat.id, user1.id);
    console.log(`✅ Is Alice admin? ${isAliceAdmin}`);

    // Try to make Bob an admin (only Alice can do this)
    await groupService.updateMemberRole(groupChat.id, user2.id, 'admin', user1.id);
    console.log(`✅ Alice made Bob an admin`);

    const isBobAdmin = await groupService.isUserAdmin(groupChat.id, user2.id);
    console.log(`✅ Is Bob admin now? ${isBobAdmin}`);

    // Add a new member to the group
    const user4 = await prisma.user.create({
      data: {
        username: 'chattest_diana',
        email: 'diana@example.com',
        passwordHash: 'hash4',
      },
    });
    console.log(`✅ Created new user Diana (${user4.id})`);

    await groupService.addMember(groupChat.id, user4.id, user1.id);
    console.log(`✅ Alice added Diana to the group`);

    const updatedGroupMembers = await groupService.getGroupMembers(groupChat.id, user1.id);
    console.log(`✅ Group now has ${updatedGroupMembers.length} members\n`);

    console.log('6️⃣ Testing Message Search...');
    
    // Search for messages
    const searchResults = await messageService.searchMessages(groupChat.id, user1.id, 'group');
    console.log(`✅ Found ${searchResults.length} messages containing "group"`);

    if (searchResults.length > 0) {
      console.log(`   First result: "${searchResults[0].content}"`);
    }

    console.log('\n7️⃣ Testing Group Member Removal...');
    
    // Remove a member from the group
    await groupService.removeMember(groupChat.id, user3.id, user1.id);
    console.log(`✅ Alice removed Charlie from the group`);

    const finalGroupMembers = await groupService.getGroupMembers(groupChat.id, user1.id);
    console.log(`✅ Group now has ${finalGroupMembers.length} members\n`);

    console.log('8️⃣ Testing Contact Management Integration...');
    
    // Add contacts
    await userService.addContact(user1.id, user2.id);
    await userService.addContact(user2.id, user1.id);
    console.log(`✅ Alice and Bob are now contacts`);

    // Check contact status
    const bobStatusForAlice = await userService.getUserStatusForContact(user1.id, user2.id);
    console.log(`✅ Bob's status as seen by Alice:`, {
      isOnline: bobStatusForAlice.isOnline,
      hasLastSeen: !!bobStatusForAlice.lastSeen,
    });

    console.log('\n9️⃣ Testing WebSocket Integration...');
    
    // Simulate WebSocket connections
    webSocketManager.addUserToRoom(user1.id, directChat.id);
    webSocketManager.addUserToRoom(user2.id, directChat.id);
    webSocketManager.addUserToRoom(user1.id, groupChat.id);
    webSocketManager.addUserToRoom(user2.id, groupChat.id);
    webSocketManager.addUserToRoom(user4.id, groupChat.id);

    console.log(`✅ Users joined WebSocket rooms`);
    console.log(`   - Direct chat room users: ${webSocketManager.getRoomUsers(directChat.id).length}`);
    console.log(`   - Group chat room users: ${webSocketManager.getRoomUsers(groupChat.id).length}`);

    // Test typing indicators
    webSocketManager.broadcastTyping(groupChat.id, user1.id, true);
    console.log(`✅ Alice started typing in group chat`);

    webSocketManager.broadcastTyping(groupChat.id, user1.id, false);
    console.log(`✅ Alice stopped typing in group chat\n`);

    console.log('🔟 Testing System Statistics...');
    
    // Get some statistics
    const totalUsers = await prisma.user.count();
    const totalChatRooms = await prisma.chatRoom.count();
    const totalMessages = await prisma.message.count();
    const onlineUsers = await prisma.user.count({ where: { isOnline: true } });

    console.log(`📊 System Statistics:`);
    console.log(`   - Total users: ${totalUsers}`);
    console.log(`   - Online users: ${onlineUsers}`);
    console.log(`   - Total chat rooms: ${totalChatRooms}`);
    console.log(`   - Total messages: ${totalMessages}`);

    console.log('\n🎉 All chat system tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ User creation and online status');
    console.log('✅ Direct chat creation and messaging');
    console.log('✅ Group chat creation and messaging');
    console.log('✅ Message status updates (sent → delivered → read)');
    console.log('✅ Group admin functions (role management)');
    console.log('✅ Group member management (add/remove)');
    console.log('✅ Message search functionality');
    console.log('✅ Contact management integration');
    console.log('✅ WebSocket room management');
    console.log('✅ Typing indicators');
    console.log('✅ System statistics');

  } catch (error) {
    console.error('❌ Chat system test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await prisma.message.deleteMany({});
    await prisma.chatRoomParticipant.deleteMany({});
    await prisma.chatRoom.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.blockedUser.deleteMany({});
    await prisma.privacySettings.deleteMany({});
    await prisma.user.deleteMany({ where: { username: { contains: 'chattest' } } });
    
    webSocketManager.cleanup();
    await prisma.$disconnect();
    console.log('✅ Cleanup completed');
  }
}

// Run the test
testChatSystem().catch(console.error);