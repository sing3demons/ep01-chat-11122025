# Database Architecture - Raw SQL Implementation

## Overview

This project uses **raw SQL queries** with **pgx driver** instead of ORM for maximum performance and control. This approach provides:

- **Better Performance**: No ORM overhead
- **Full SQL Control**: Use advanced PostgreSQL features
- **Type Safety**: Strong typing with Go structs
- **Explicit Queries**: Clear understanding of database operations

## Database Stack

- **Database**: PostgreSQL 15+
- **Driver**: pgx/v5 (pure Go PostgreSQL driver)
- **Connection Pool**: pgxpool for connection management
- **Migrations**: golang-migrate for schema management

## Connection Management

### Connection Pool Configuration

```go
// Pool configuration in config.go
type DatabaseConfig struct {
    Host            string        // Database host
    Port            int           // Database port
    User            string        // Database user
    Password        string        // Database password
    Name            string        // Database name
    SSLMode         string        // SSL mode (disable/require/verify-full)
    MaxOpenConns    int           // Maximum open connections (default: 25)
    MaxIdleConns    int           // Maximum idle connections (default: 25)
    ConnMaxLifetime time.Duration // Connection max lifetime (default: 5m)
}
```

### Connection Pool Benefits

- **Automatic Connection Management**: Pool handles connection lifecycle
- **Connection Reuse**: Reduces connection overhead
- **Concurrent Safety**: Thread-safe operations
- **Health Monitoring**: Built-in connection health checks

## Repository Pattern

### Interface Definition

```go
type Repository interface {
    Create(ctx context.Context, user *User) error
    GetByID(ctx context.Context, id uuid.UUID) (*User, error)
    GetByEmail(ctx context.Context, email string) (*User, error)
    // ... other methods
}
```

### Implementation Example

```go
func (r *UserRepository) Create(ctx context.Context, u *user.User) error {
    query := `
        INSERT INTO users (id, username, email, password_hash, is_online, last_seen, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `
    
    _, err := r.db.Exec(ctx, query,
        u.ID, u.Username, u.Email, u.PasswordHash,
        u.IsOnline, u.LastSeen, u.CreatedAt, u.UpdatedAt,
    )
    
    return err
}
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes for Performance

```sql
-- Essential indexes for fast queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_online ON users(is_online);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### Automatic Timestamp Updates

```sql
-- Function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## Migration Management

### Migration Files Structure

```
migrations/
├── 000001_create_users_table.up.sql
├── 000001_create_users_table.down.sql
├── 000002_create_chat_rooms_table.up.sql
├── 000002_create_chat_rooms_table.down.sql
└── ...
```

### Running Migrations

```bash
# Run all pending migrations
make migrate-up

# Rollback last migration
make migrate-down

# Create new migration
make migrate-create NAME=add_user_settings_table
```

### Migration Best Practices

1. **Always create both up and down migrations**
2. **Use transactions for complex migrations**
3. **Test migrations on staging first**
4. **Keep migrations small and focused**
5. **Use descriptive migration names**

## Query Patterns

### Basic CRUD Operations

```go
// Create
query := `INSERT INTO users (id, username, email) VALUES ($1, $2, $3)`
_, err := db.Exec(ctx, query, id, username, email)

// Read
query := `SELECT id, username, email FROM users WHERE id = $1`
err := db.QueryRow(ctx, query, id).Scan(&user.ID, &user.Username, &user.Email)

// Update
query := `UPDATE users SET username = $2, updated_at = $3 WHERE id = $1`
_, err := db.Exec(ctx, query, id, username, time.Now())

// Delete
query := `DELETE FROM users WHERE id = $1`
_, err := db.Exec(ctx, query, id)
```

### Complex Queries with Joins

```go
query := `
    SELECT u.id, u.username, u.email, COUNT(m.id) as message_count
    FROM users u
    LEFT JOIN messages m ON u.id = m.sender_id
    WHERE u.created_at >= $1
    GROUP BY u.id, u.username, u.email
    ORDER BY message_count DESC
    LIMIT $2 OFFSET $3
`
```

### Batch Operations

```go
// Batch insert using COPY
batch := &pgx.Batch{}
for _, user := range users {
    batch.Queue("INSERT INTO users (id, username, email) VALUES ($1, $2, $3)",
        user.ID, user.Username, user.Email)
}
results := db.SendBatch(ctx, batch)
defer results.Close()
```

## Error Handling

### Common Error Patterns

```go
func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*user.User, error) {
    var u user.User
    err := r.db.QueryRow(ctx, query, id).Scan(&u.ID, &u.Username, &u.Email)
    
    if err != nil {
        if err == pgx.ErrNoRows {
            return nil, fmt.Errorf("user not found")
        }
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    
    return &u, nil
}
```

### Transaction Handling

```go
func (r *UserRepository) CreateWithProfile(ctx context.Context, user *User, profile *Profile) error {
    tx, err := r.db.Begin(ctx)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    defer tx.Rollback(ctx)
    
    // Insert user
    _, err = tx.Exec(ctx, "INSERT INTO users (...) VALUES (...)", ...)
    if err != nil {
        return fmt.Errorf("failed to create user: %w", err)
    }
    
    // Insert profile
    _, err = tx.Exec(ctx, "INSERT INTO profiles (...) VALUES (...)", ...)
    if err != nil {
        return fmt.Errorf("failed to create profile: %w", err)
    }
    
    return tx.Commit(ctx)
}
```

## Performance Optimization

### Connection Pool Tuning

```go
// Optimal pool configuration
poolConfig.MaxConns = 25        // Based on CPU cores and workload
poolConfig.MinConns = 5         // Keep minimum connections warm
poolConfig.MaxConnLifetime = 5 * time.Minute
poolConfig.MaxConnIdleTime = 30 * time.Minute
```

### Query Optimization

1. **Use Prepared Statements** for repeated queries
2. **Add Proper Indexes** for WHERE clauses
3. **Use LIMIT and OFFSET** for pagination
4. **Avoid N+1 Queries** with JOINs
5. **Use Connection Pooling** effectively

### Monitoring Queries

```go
// Log slow queries
func (r *Repository) logSlowQuery(ctx context.Context, query string, duration time.Duration) {
    if duration > 100*time.Millisecond {
        log.Warn("Slow query detected",
            "query", query,
            "duration", duration,
        )
    }
}
```

## Testing

### Repository Testing

```go
func TestUserRepository_Create(t *testing.T) {
    // Setup test database
    db := setupTestDB(t)
    defer cleanupTestDB(t, db)
    
    repo := NewUserRepository(db)
    user := &User{
        ID:       uuid.New(),
        Username: "testuser",
        Email:    "test@example.com",
    }
    
    err := repo.Create(context.Background(), user)
    assert.NoError(t, err)
    
    // Verify user was created
    found, err := repo.GetByID(context.Background(), user.ID)
    assert.NoError(t, err)
    assert.Equal(t, user.Username, found.Username)
}
```

### Integration Testing

```go
func TestUserRepository_Integration(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test")
    }
    
    // Use real database for integration tests
    db := connectToTestDB(t)
    defer db.Close()
    
    // Run tests against real database
}
```

## Benefits of Raw SQL Approach

### Performance Benefits

- **No ORM Overhead**: Direct SQL execution
- **Optimized Queries**: Hand-tuned for performance
- **Connection Pooling**: Efficient resource usage
- **Prepared Statements**: Query plan caching

### Development Benefits

- **Full SQL Control**: Use advanced PostgreSQL features
- **Clear Intent**: Explicit queries show exactly what happens
- **Type Safety**: Strong typing with Go structs
- **Debugging**: Easy to debug SQL queries

### Maintenance Benefits

- **No Magic**: Clear understanding of database operations
- **Version Control**: SQL migrations in version control
- **Database Features**: Use PostgreSQL-specific features
- **Performance Tuning**: Direct control over query optimization

## Migration from ORM

If migrating from an ORM like GORM:

1. **Keep Entity Structs**: Remove ORM tags, keep field structure
2. **Create Repository Interfaces**: Define clear contracts
3. **Implement Raw SQL**: Replace ORM calls with SQL queries
4. **Add Migrations**: Create SQL migration files
5. **Update Tests**: Test against real database operations

This approach provides better performance, clearer code, and full control over database operations while maintaining clean architecture principles.