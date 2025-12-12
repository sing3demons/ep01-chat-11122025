package postgres

import (
	"context"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/stdlib"
)

// Migrate runs database migrations
func Migrate(db *DB) error {
	// Get underlying sql.DB for migrations
	sqlDB := stdlib.OpenDBFromPool(db.Pool)
	defer sqlDB.Close()

	// Create postgres driver instance
	driver, err := postgres.WithInstance(sqlDB, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create postgres driver: %w", err)
	}

	// Create migrate instance
	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"postgres",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	// Run migrations
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}

// CreateMigrationTables creates migration tables if they don't exist
func (db *DB) CreateMigrationTables(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version bigint NOT NULL PRIMARY KEY,
			dirty boolean NOT NULL
		);
	`
	
	_, err := db.Pool.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to create migration tables: %w", err)
	}

	return nil
}