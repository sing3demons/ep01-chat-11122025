-- Drop triggers
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms;

-- Drop indexes
DROP INDEX IF EXISTS idx_messages_status;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_chat_room_id;
DROP INDEX IF EXISTS idx_messages_sender_id;

DROP INDEX IF EXISTS idx_chat_room_participants_chat_room_id;
DROP INDEX IF EXISTS idx_chat_room_participants_user_id;

DROP INDEX IF EXISTS idx_chat_rooms_last_message_at;
DROP INDEX IF EXISTS idx_chat_rooms_type;
DROP INDEX IF EXISTS idx_chat_rooms_created_by;

-- Drop tables
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chat_room_participants;
DROP TABLE IF EXISTS chat_rooms;