const { PrismaClient } = require('@prisma/client');
const { PasswordUtils } = require('./dist/utils/password');

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('🔧 Creating test users...');

    // Create test users
    const users = [
      {
        username: 'alice',
        email: 'alice@test.com',
        password: 'password123'
      },
      {
        username: 'bob',
        email: 'bob@test.com',
        password: 'password123'
      },
      {
        username: 'charlie',
        email: 'charlie@test.com',
        password: 'password123'
      }
    ];

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⚠️  User ${userData.username} already exists`);
        continue;
      }

      // Hash password
      const passwordHash = await PasswordUtils.hashPassword(userData.password);
      
      // Create user
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          passwordHash: passwordHash,
        },
      });

      // Create default notification settings
      await prisma.notificationSettings.create({
        data: {
          userId: user.id,
          soundEnabled: true,
          desktopNotifications: true,
          mentionNotifications: true,
          groupNotifications: true,
        },
      });

      console.log(`✅ Created user: ${userData.username} (${userData.email})`);
    }

    console.log('\n🎉 Test users created successfully!');
    console.log('\nYou can now login with:');
    console.log('- alice@test.com / password123');
    console.log('- bob@test.com / password123');
    console.log('- charlie@test.com / password123');

  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createTestUsers();
}

module.exports = { createTestUsers };