import { User, NotificationSettings, PrivacySettings, PrismaClient } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';
import { DBActionEnum, ICustomLogger, LogAction } from '../logger/logger';
import { MaskingRule, MaskingService } from '../logger/masking';
import { getDefinedPaths } from '@/utils/getDefinedPaths';
import { PrismaModelClient, SqlBuilder } from '@/utils/sqlBuilder';

export interface CreateUserData {
  username: string;
  email: string;
  passwordHash: string;
}

export interface UpdateUserData {
  isOnline?: boolean;
  lastSeen?: Date;
  passwordHash?: string;
}

export interface IAuthRepository {
  createUser(data: CreateUserData): Promise<User>;
  findUserById(id: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserByUsername(username: string): Promise<User | null>;
  findUserByEmailOrUsername(email: string, username: string): Promise<User | null>;
  updateUser(id: string, data: UpdateUserData): Promise<User>;
  updateUserOnlineStatus(id: string, isOnline: boolean): Promise<User>;
  createNotificationSettings(userId: string): Promise<NotificationSettings>;
  createPrivacySettings(userId: string): Promise<PrivacySettings>;
  getNotificationSettings(userId: string): Promise<NotificationSettings | null>;
  getPrivacySettings(userId: string): Promise<PrivacySettings | null>;
}

/**
 * Auth Repository
 * Handles all database operations related to authentication
 */
export class AuthRepository implements IAuthRepository {
  constructor(private readonly prismaInstance: PrismaClient<{
    log: [{ emit: 'event', level: 'query' }];
    errorFormat: "pretty";
  }, "query", DefaultArgs>, private readonly logger: ICustomLogger) { }
  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    const start = performance.now();
    // const cmd = `INSERT INTO "User" ("username","email","passwordHash","isOnline","lastSeen") VALUES ($1,$2,$3,$4,$5) RETURNING *;`;
    const cmd = new PrismaModelClient<Omit<User, 'createdAt' | 'id'>>('users').create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        isOnline: true,
        lastSeen: new Date(),
      }
    }).sql;
    this.logger.setDependencyMetadata({
      dependency: 'user',
    }).debug(LogAction.DB_REQUEST(DBActionEnum.CREATE, cmd), { body: data }, [{
      maskingType: "password",
      maskingField: "body.password"
    },
    {
      maskingType: "email",
      maskingField: "body.email"
    }]);
    const result = await this.prismaInstance.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        isOnline: true,
        lastSeen: new Date()
      }
    });

    this.logger.setDependencyMetadata({
      dependency: 'user',
      responseTime: performance.now() - start
    }).debug(LogAction.DB_RESPONSE(DBActionEnum.CREATE, cmd), { result: result }, [{
      maskingType: "password",
      maskingField: "result.passwordHash"
    },
    {
      maskingType: "email",
      maskingField: "result.email"
    }]);
    return result;
  }

  private async trackDependency<T extends (...args: any) => any>(
    option: { dependency: string, operation: string, query?: string, params?: any, maskingParams?: Array<MaskingRule>, maskingBody?: Array<MaskingRule> },
    dbQueryFunc: T,
  ) {
    let sql = option.query || ''
    let params = option.params || ''
    let start = performance.now()
    this.logger.setDependencyMetadata({
      dependency: option.dependency,
    }).debug(LogAction.DB_REQUEST(option.operation, sql), { params }, option.maskingParams);
    const result = await dbQueryFunc();
    this.logger.setDependencyMetadata({
      dependency: option.dependency,
      responseTime: performance.now() - start
    }).debug(LogAction.DB_RESPONSE(option.operation, sql), result, option.maskingBody);
    return result as ReturnType<typeof dbQueryFunc>
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<User | null> {
    const cmd = new PrismaModelClient<User>('users').findFirst({
      where: { id }
    }).sql
    return await this.trackDependency({
      dependency: 'user',
      operation: DBActionEnum.READ,
      query: cmd,
      params: { id },
      maskingBody: [{
        maskingType: "email",
        maskingField: "email"
      },
      {
        maskingType: "password",
        maskingField: "passwordHash"
      }]
    },
      () => this.prismaInstance.user.findUnique({
        where: { id }
      })
    )
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    // return await this.prismaInstance.user.findUnique({
    //   where: { email }
    // });
    const cmd = new PrismaModelClient<User>('users').findFirst({
      where: { email }
    }).sql
    return await this.trackDependency({
      dependency: 'user',
      operation: DBActionEnum.READ,
      query: cmd,
      params: { email },
      maskingParams: [{
        maskingType: "email",
        maskingField: "params.email"
      }],
      maskingBody: [{
        maskingType: "email",
        maskingField: "email"
      }]
    },
      () => this.prismaInstance.user.findUnique({
        where: { email }
      })
    );
  }

  /**
   * Find user by username
   */
  async findUserByUsername(username: string): Promise<User | null> {
    // return await this.prismaInstance.user.findUnique({
    //   where: { username }
    // });
    const cmd = new PrismaModelClient<User>('users').findFirst({
      where: { username }
    }).sql
    return await this.trackDependency({
      dependency: 'user',
      operation: DBActionEnum.READ,
      query: cmd,
      params: { username },
      maskingBody: [{
        maskingType: "email",
        maskingField: "username"
      }, {
        maskingType: "password",
        maskingField: "passwordHash"
      }]
    },
      () => this.prismaInstance.user.findUnique({
        where: { username }
      })
    );
  }

  /**
   * Find user by email or username
   */
  async findUserByEmailOrUsername(email: string, username: string): Promise<User | null> {
    const qb = new PrismaModelClient<User>('users').findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    return await this.trackDependency({
      dependency: 'user',
      query: qb.sql,
      params: { email, username },
      operation: DBActionEnum.READ,
      maskingParams: [{
        maskingType: "email",
        maskingField: "params.email"
      }],
      maskingBody: [{
        maskingType: "email",
        maskingField: "email"
      }]
    },
      () => this.prismaInstance.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      })
    );
  }

  /**
   * Update user by ID
   */
  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    // return await this.prismaInstance.user.update({
    //   where: { id },
    //   data
    // });

    return await this.trackDependency({
      dependency: 'user',
      operation: DBActionEnum.UPDATE,
      query: new PrismaModelClient<User>('users').update({ where: { id }, data }).sql,
      params: { where: { id }, data },
      maskingBody: [{
        maskingType: "password",
        maskingField: "data.passwordHash"
      }],
      maskingParams: [{
        maskingType: "password",
        maskingField: "params.data.passwordHash"
      }]
    },
      () => this.prismaInstance.user.update({
        where: { id },
        data
      })
    );
  }

  /**
   * Update user online status
   */
  async updateUserOnlineStatus(id: string, isOnline: boolean): Promise<User> {
    const cmd = new PrismaModelClient<User>('users').update({
      where: { id },
      data: {
        isOnline,
        lastSeen: new Date()
      }
    }).sql
    // return await this.prismaInstance.user.update({
    //   where: { id },
    //   data: {
    //     isOnline,
    //     lastSeen: new Date()
    //   }
    // });
    return await this.trackDependency({
      dependency: 'user',
      operation: DBActionEnum.UPDATE,
      query: cmd,
      params: { id, isOnline },
    },
      () => this.prismaInstance.user.update({
        where: { id },
        data: {
          isOnline,
          lastSeen: new Date()
        }
      })
    );
  }

  /**
   * Create default notification settings for user
   */
  async createNotificationSettings(userId: string): Promise<NotificationSettings> {
    const cmd = new PrismaModelClient<Partial<NotificationSettings>>('notificationSettings').create({
      data: {
        userId,
        soundEnabled: true,
        desktopNotifications: true,
        mentionNotifications: true,
        groupNotifications: true
      }
    }).sql
    // return await this.prismaInstance.notificationSettings.create({
    //   data: {
    //     userId,
    //     soundEnabled: true,
    //     desktopNotifications: true,
    //     mentionNotifications: true,
    //     groupNotifications: true
    //   }
    // });
    return await this.trackDependency({
      dependency: 'notificationSettings',
      operation: DBActionEnum.CREATE,
      query: cmd,
      params: { userId },
    },
      () => this.prismaInstance.notificationSettings.create({
        data: {
          userId,
          soundEnabled: true,
          desktopNotifications: true,
          mentionNotifications: true,
          groupNotifications: true
        }
      })
    );
  }

  /**
   * Create default privacy settings for user
   */
  async createPrivacySettings(userId: string): Promise<PrivacySettings> {
    const cmd = new PrismaModelClient<Partial<PrivacySettings>>('privacySettings').create({
      data: {
        userId,
        showOnlineStatus: true,
        showLastSeen: true,
        allowContactsOnly: false
      }
    }).sql
    // return await this.prismaInstance.privacySettings.create({
    //   data: {
    //     userId,
    //     showOnlineStatus: true,
    //     showLastSeen: true,
    //     allowContactsOnly: false
    //   }
    // });
    return await this.trackDependency({
      dependency: 'privacySettings',
      operation: DBActionEnum.CREATE,
      query: cmd,
      params: { userId },
    },
      () => this.prismaInstance.privacySettings.create({
        data: {
          userId,
          showOnlineStatus: true,
          showLastSeen: true,
          allowContactsOnly: false
        }
      })
    );
  }

  /**
   * Get notification settings by user ID
   */
  async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    const cmd = new PrismaModelClient<NotificationSettings>('notificationSettings').findFirst({
      where: { userId }
    }).sql
    // return await this.prismaInstance.notificationSettings.findUnique({
    //   where: { userId }
    // });
    return await this.trackDependency({
      dependency: 'notificationSettings',
      operation: DBActionEnum.READ,
      query: cmd,
      params: { userId },
    },
      () => this.prismaInstance.notificationSettings.findUnique({
        where: { userId }
      })
    );
  }

  /**
   * Get privacy settings by user ID
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    const cmd = new PrismaModelClient<PrivacySettings>('privacySettings').findFirst({
      where: { userId }
    }).sql
    // return await this.prismaInstance.privacySettings.findUnique({
    //   where: { userId }
    // });
    return await this.trackDependency({
      dependency: 'privacySettings',
      operation: DBActionEnum.READ,
      query: cmd,
      params: { userId },
    },
      () => this.prismaInstance.privacySettings.findUnique({
        where: { userId }
      })
    );
  }
}