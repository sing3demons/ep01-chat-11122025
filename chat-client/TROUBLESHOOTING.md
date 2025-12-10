# Troubleshooting Guide

## Common Issues and Solutions

### 1. ❌ Login Failed: Invalid email or password

**Possible Causes:**
- User doesn't exist in database
- Wrong email/password
- Database connection issues
- Backend not running

**Solutions:**

#### A. Register a new user first
```bash
# In the chat client, choose option 2 (Register) instead of 1 (Login)
=== Authentication ===
1. Login
2. Register
Choose option: 2
```

#### B. Check if backend is running
```bash
# Check if backend is accessible
curl http://localhost:3001/api/health

# Should return:
{"success":true,"message":"WhatsApp Chat System API is running","timestamp":"..."}
```

#### C. Check database connection
```bash
cd backend
npx prisma db push
npx prisma studio  # Opens database browser
```

#### D. Create a test user manually
```bash
cd backend
# Create a simple test script
cat > create-test-user.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: passwordHash,
      },
    });
    
    console.log('✅ Test user created:', user);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
EOF

node create-test-user.js
```

### 2. 🔌 WebSocket Authentication Error

**Error Message:**
```
WebSocket read error: websocket: close 1008 (policy violation): Authentication token required
```

**Cause:** WebSocket connection is not receiving the JWT token properly.

**Solution:** Update the WebSocket connection in the Go client.

### 3. 🚫 Connection Refused

**Error Message:**
```
connection refused
```

**Solutions:**

#### A. Start the backend server
```bash
cd backend
npm start
```

#### B. Check if port 3001 is available
```bash
# Check what's running on port 3001
lsof -i :3001

# If something else is using it, kill it or change backend port
```

#### C. Check backend URL
```bash
# Make sure you're using the correct URL
go run main.go http://localhost:3001
```

### 4. 📦 Go Module Issues

**Error Message:**
```
go: module not found
```

**Solutions:**
```bash
cd chat-client
go mod tidy
go mod download
```

### 5. 🗄️ Database Issues

**Error Message:**
```
Database connection failed
```

**Solutions:**

#### A. Start PostgreSQL
```bash
# Using Docker (if using docker-compose)
cd backend
docker-compose up -d

# Or start PostgreSQL service
sudo service postgresql start
```

#### B. Check database URL
```bash
cd backend
cat .env | grep DATABASE_URL
```

#### C. Reset database
```bash
cd backend
npx prisma db push --force-reset
npx prisma db seed  # If you have seed data
```

## Quick Diagnostic Commands

### Check Backend Health
```bash
curl -v http://localhost:3001/api/health
```

### Check Database Connection
```bash
cd backend
npx prisma db pull
```

### Check WebSocket Endpoint
```bash
# Using wscat (install with: npm install -g wscat)
wscat -c ws://localhost:3001/ws
```

### Test API Endpoints
```bash
# Test registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Step-by-Step Debugging

### 1. Verify Backend is Running
```bash
cd backend
npm start
# Should see: "🚀 Server is running on port 3001"
```

### 2. Test API Manually
```bash
# Health check
curl http://localhost:3001/api/health

# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@test.com","password":"password123"}'
```

### 3. Test Go Client
```bash
cd chat-client
go run main.go http://localhost:3001
# Try registering first, then logging in
```

### 4. Check Logs
```bash
# Backend logs
cd backend
npm start
# Watch for error messages

# Go client logs
cd chat-client
go run main.go http://localhost:3001 2>&1 | tee client.log
```

## Environment Setup

### Required Services
1. **PostgreSQL** - Database
2. **Node.js Backend** - API server
3. **Go Client** - Chat client

### Startup Order
```bash
# 1. Start PostgreSQL (if not running)
docker-compose up -d  # or service postgresql start

# 2. Start Backend
cd backend && npm start

# 3. Start Client
cd chat-client && make run
```

## Common Fixes

### Reset Everything
```bash
# Stop all services
pkill -f "npm start"
docker-compose down

# Clean and restart
cd backend
rm -rf node_modules
npm install
npx prisma db push --force-reset
npm start

# In another terminal
cd chat-client
go clean
go mod tidy
make run
```

### Create Fresh Test Data
```bash
cd backend
npx prisma studio
# Delete all users, then create new ones via the client
```

## Getting Help

If you're still having issues:

1. **Check the logs** - Both backend and client logs
2. **Verify environment** - Database, Node.js, Go versions
3. **Test step by step** - API → WebSocket → Client
4. **Use the diagnostic commands** above

### Useful Commands for Debugging
```bash
# Check what's running on ports
netstat -tulpn | grep :3001
netstat -tulpn | grep :5432

# Check environment variables
cd backend && cat .env

# Check Go environment
go version
go env

# Check Node.js environment
node --version
npm --version
```