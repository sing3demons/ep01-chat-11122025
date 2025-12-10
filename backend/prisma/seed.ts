// Database seed file for development
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: hashedPassword,
      isOnline: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      username: 'bob',
      email: 'bob@example.com',
      passwordHash: hashedPassword,
      isOnline: false,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      username: 'charlie',
      email: 'charlie@example.com',
      passwordHash: hashedPassword,
      isOnline: true,
    },
  });

  console.log('✅ Created test users');

  // Create a direct chat room
  const directChatRoom = await prisma.chatRoom.create({
    data: {
      type: 'direct',
      createdBy: user1.id,
      participants: {
        create: [
          { userId: user1.id, role: 'member' },
          { userId: user2.id, role: 'member' },
        ],
      },
    },
  });

  // Create a group chat room
  const groupChatRoom = await prisma.chatRoom.create({
    data: {
      name: 'Development Team',
      type: 'group',
      createdBy: user1.id,
      participants: {
        create: [
          { userId: user1.id, role: 'admin' },
          { userId: user2.id, role: 'member' },
          { userId: user3.id, role: 'member' },
        ],
      },
    },
  });

  console.log('✅ Created test chat rooms');

  // Create test messages
  await prisma.message.createMany({
    data: [
      {
        content: 'Hello Bob! How are you?',
        senderId: user1.id,
        chatRoomId: directChatRoom.id,
        status: 'delivered',
      },
      {
        content: 'Hi Alice! I\'m doing great, thanks for asking.',
        senderId: user2.id,
        chatRoomId: directChatRoom.id,
        status: 'read',
      },
      {
        content: 'Welcome to the development team chat!',
        senderId: user1.id,
        chatRoomId: groupChatRoom.id,
        status: 'delivered',
      },
      {
        content: 'Thanks! Excited to be here.',
        senderId: user3.id,
        chatRoomId: groupChatRoom.id,
        status: 'delivered',
      },
      {
        content: 'Let\'s discuss the new project requirements.',
        senderId: user1.id,
        chatRoomId: groupChatRoom.id,
        status: 'sent',
      },
    ],
  });

  console.log('✅ Created test messages');

  // Create notification settings for users
  await prisma.notificationSettings.createMany({
    data: [
      {
        userId: user1.id,
        soundEnabled: true,
        desktopNotifications: true,
        mentionNotifications: true,
        groupNotifications: true,
      },
      {
        userId: user2.id,
        soundEnabled: false,
        desktopNotifications: true,
        mentionNotifications: true,
        groupNotifications: false,
      },
      {
        userId: user3.id,
        soundEnabled: true,
        desktopNotifications: false,
        mentionNotifications: true,
        groupNotifications: true,
      },
    ],
  });

  console.log('✅ Created notification settings');

  // Create test notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: user2.id,
        type: 'message',
        title: 'New message from Alice',
        content: 'Hello Bob! How are you?',
        chatRoomId: directChatRoom.id,
        priority: 'normal',
        isRead: false,
      },
      {
        userId: user3.id,
        type: 'group_activity',
        title: 'Added to Development Team',
        content: 'You have been added to the Development Team group',
        chatRoomId: groupChatRoom.id,
        priority: 'high',
        isRead: false,
      },
    ],
  });

  console.log('✅ Created test notifications');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });