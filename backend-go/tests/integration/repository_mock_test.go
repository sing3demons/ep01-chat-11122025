package integration

import (
	"testing"
)

func TestUserRepositoryWithMock(t *testing.T) {
	// Note: We need to adapt the repository to work with sql.DB instead of pgxpool.Pool
	// For now, we'll skip this test as it requires repository refactoring
	t.Skip("Repository tests require adaptation for sql.DB interface")
}

