/**
 * Message module exports
 */

export * from './message.model';
export * from './message.converter';
export * from './message.controller';
export * from './message.service';
export * from './message.repository';
export { default as messageRoutes } from './message.routes';

// Export interfaces
export type { IMessageRepository } from './message.repository';