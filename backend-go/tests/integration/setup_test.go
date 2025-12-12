package integration

import (
	"database/sql"
	"log"
	"os"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/go-redis/redismock/v9"
	"github.com/redis/go-redis/v9"
	"backend-go/internal/shared/logger"
)

var (
	testDB     *sql.DB
	testMock   sqlmock.Sqlmock
	testRedis  *redis.Client
	redisMock  redismock.ClientMock
	testLogger *logger.Logger
)

func TestMain(m *testing.M) {
	// Setup
	if err := setupMocks(); err != nil {
		log.Fatalf("Failed to setup mocks: %v", err)
	}

	// Run tests
	code := m.Run()

	// Cleanup
	cleanup()

	os.Exit(code)
}

func setupMocks() error {
	var err error

	// Setup SQL mock
	testDB, testMock, err = sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
	if err != nil {
		return err
	}

	// Setup Redis mock
	testRedis, redisMock = redismock.NewClientMock()

	// Setup logger
	testLogger = logger.New("debug", "json")

	return nil
}

func cleanup() {
	if testDB != nil {
		testDB.Close()
	}
	if testRedis != nil {
		testRedis.Close()
	}
}

func resetMocks() {
	// Reset expectations for fresh test
	if testMock != nil {
		// Check if all expectations were met
		if err := testMock.ExpectationsWereMet(); err != nil {
			log.Printf("SQL mock expectations not met: %v", err)
		}
	}
	
	if redisMock != nil {
		redisMock.ClearExpect()
	}
}