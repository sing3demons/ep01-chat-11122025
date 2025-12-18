import type { MaskingRule } from "./masking.js";
import type { ICustomLogger, ILogTransport, LogDependencyMetadata, LoggerOptions } from "./logger.js";
import { jest } from "@jest/globals"

// ✅ Mock LogDto type (simplified)
type LogDto = {
    level?: 'debug' | 'info' | 'warn' | 'error';
    service: string;
    version: string;
    hostname: string;
    type?: 'detail' | 'summary';
    module?: string;
    sessionId: string;
    transactionId: string;
    requestId: string;
    userId?: string | undefined;
    action?: string | undefined;
    actionDescription?: string | undefined;
    subAction?: string | undefined;
    dependency?: string | undefined;
    message?: string | undefined;
    timestamp?: Date;
    responseTime?: number | undefined;
    resultCode?: string | undefined;
    resultMessage?: string | undefined;
    resultFlag?: string | undefined;
    [x: string]: string | number | Date | Record<string, any> | undefined;
    additionalSummary?: Record<string, any> | undefined;
}

interface ILogActionType {
    action: string;
    description?: string | undefined;
    subAction?: string | undefined;
}

// ✅ Type for call records
interface CallRecord {
    info: Array<{ action: ILogActionType; data: any; maskingRules?: Array<MaskingRule> }>;
    debug: Array<{ action: ILogActionType; data: any; maskingRules?: Array<MaskingRule> }>;
    error: Array<{ action: ILogActionType; data: any; maskingRules?: Array<MaskingRule> }>;
    flush: Array<{ msg?: string }>;
    flushError: Array<{ stack: any }>;
    init: Array<{ dto: any }>;
    update: Array<{ key: string; value: any }>;
    setDependencyMetadata: Array<{ meta: LogDependencyMetadata }>;
    setSummaryLogAdditionalInfo: Array<{ key: string; value: any }>;
    addCustomField: Array<{ key: string; value: any }>;
}

/**
 * ✅ Mock Transport สำหรับ capture logs ใน test
 */
export class MockTransport implements ILogTransport {
    public logs: { level: string; obj: object }[] = [];

    info(obj: object): void {
        this.logs.push({ level: 'info', obj });
    }

    debug(obj: object): void {
        this.logs.push({ level: 'debug', obj });
    }

    warn(obj: object): void {
        this.logs.push({ level: 'warn', obj });
    }

    error(obj: object): void {
        this.logs.push({ level: 'error', obj });
    }

    // ✅ Helper methods สำหรับ test
    clear(): void {
        this.logs = [];
    }

    getLastLog(): { level: string; obj: object } | undefined {
        return this.logs[this.logs.length - 1];
    }

    getLogsByLevel(level: string): object[] {
        return this.logs.filter(log => log.level === level).map(log => log.obj);
    }

    hasLogWithMessage(message: string): boolean {
        return this.logs.some(log =>
            JSON.stringify(log.obj).includes(message)
        );
    }
}

/**
 * ✅ Mock Logger สำหรับ unit testing
 * - ไม่เขียน output จริง
 * - เก็บ logs ไว้ให้ตรวจสอบได้
 * - รองรับ Jest spy functions: expect(mockLogger.info).toHaveBeenCalledWith(...)
 * 
 * @example
 * // สร้าง mock logger
 * const mockLogger = createMockLogger();
 * 
 * // inject เข้าไปใน service
 * const service = new MyService(mockLogger);
 * service.handleRequest();
 * 
 * // ตรวจสอบด้วย Jest matchers
 * expect(mockLogger.info).toHaveBeenCalled();
 * expect(mockLogger.info).toHaveBeenCalledWith(
 *   expect.objectContaining({ action: '[INBOUND]' }),
 *   expect.any(Object)
 * );
 * expect(mockLogger.flush).toHaveBeenCalled();
 */
export class MockLogger {
    public calls: CallRecord = {
        info: [],
        debug: [],
        error: [],
        flush: [],
        flushError: [],
        init: [],
        update: [],
        setDependencyMetadata: [],
        setSummaryLogAdditionalInfo: [],
        addCustomField: [],
    };

    private dto: Partial<LogDto> = {};

    // ✅ Jest spy functions - ใช้กับ expect().toHaveBeenCalledWith()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public info: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public debug: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public error: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public flush: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public flushError: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public init: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public update: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public setDependencyMetadata: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public setSummaryLogAdditionalInfo: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public addCustomField: any;

    constructor(_dto?: Partial<LogDto>, _options?: LoggerOptions) {
        const self = this;

        // ✅ สร้าง Jest mock functions
        this.info = jest.fn((action: ILogActionType, data: any, maskingRules?: Array<MaskingRule>) => {
            if (maskingRules) {
                self.calls.info.push({ action, data, maskingRules });
            } else {
                self.calls.info.push({ action, data });
            }
            return self;
        });

        this.debug = jest.fn((action: ILogActionType, data: any, maskingRules?: Array<MaskingRule>) => {
            if (maskingRules) {
                self.calls.debug.push({ action, data, maskingRules });
            } else {
                self.calls.debug.push({ action, data });
            }
            return self;
        });

        this.error = jest.fn((action: ILogActionType, data: any, maskingRules?: Array<MaskingRule>) => {
            if (maskingRules) {
                self.calls.error.push({ action, data, maskingRules });
            } else {
                self.calls.error.push({ action, data });
            }
            return self;
        });

        this.flush = jest.fn((msg?: string) => {
            if (msg !== undefined) {
                self.calls.flush.push({ msg });
            } else {
                self.calls.flush.push({});
            }
        });

        this.flushError = jest.fn((stack: any) => {
            self.calls.flushError.push({ stack });
        });

        this.init = jest.fn((dto: Omit<LogDto, 'timestamp' | 'level' | 'requestId'>) => {
            self.calls.init.push({ dto });
            Object.assign(self.dto, dto);
            return self;
        });

        this.update = jest.fn((key: string, value: any) => {
            self.calls.update.push({ key, value });
            (self.dto as any)[key] = value;
            return self;
        });

        this.setDependencyMetadata = jest.fn((meta: LogDependencyMetadata) => {
            self.calls.setDependencyMetadata.push({ meta });
            return self;
        });

        this.setSummaryLogAdditionalInfo = jest.fn((key: string, value: any) => {
            self.calls.setSummaryLogAdditionalInfo.push({ key, value });
            return self;
        });

        this.addCustomField = jest.fn((key: string, value: any) => {
            self.calls.addCustomField.push({ key, value });
            return self;
        });
    }

    // ✅ Helper methods สำหรับ test assertions

    /**
     * Reset all call records and mock functions
     */
    reset(): void {
        this.calls = {
            info: [],
            debug: [],
            error: [],
            flush: [],
            flushError: [],
            init: [],
            update: [],
            setDependencyMetadata: [],
            setSummaryLogAdditionalInfo: [],
            addCustomField: [],
        } as CallRecord;
        this.dto = {};

        // ✅ Reset Jest mock functions
        this.info.mockClear();
        this.debug.mockClear();
        this.error.mockClear();
        this.flush.mockClear();
        this.flushError.mockClear();
        this.init.mockClear();
        this.update.mockClear();
        this.setDependencyMetadata.mockClear();
        this.setSummaryLogAdditionalInfo.mockClear();
        this.addCustomField.mockClear();
    }

    /**
     * Check if info was called with specific action
     */
    wasInfoCalledWith(actionName: string): boolean {
        return this.calls.info.some(call => call.action.action === actionName);
    }

    /**
     * Check if debug was called with specific action
     */
    wasDebugCalledWith(actionName: string): boolean {
        return this.calls.debug.some(call => call.action.action === actionName);
    }

    /**
     * Get total number of info calls
     */
    get infoCallCount(): number {
        return this.calls.info.length;
    }

    /**
     * Get total number of debug calls
     */
    get debugCallCount(): number {
        return this.calls.debug.length;
    }

    /**
     * Check if flush was called
     */
    get wasFlushCalled(): boolean {
        return this.calls.flush.length > 0;
    }

    /**
     * Check if flushError was called
     */
    get wasFlushErrorCalled(): boolean {
        return this.calls.flushError.length > 0;
    }

    /**
     * Get current dto state
     */
    getDto(): Partial<LogDto> {
        return { ...this.dto };
    }
}

/**
 * ✅ Factory function สำหรับสร้าง mock logger
 */
export function createMockLogger(): MockLogger {
    return new MockLogger();
}

/**
 * ✅ Factory function สำหรับสร้าง mock transport
 */
export function createMockTransport(): MockTransport {
    return new MockTransport();
}

/**
 * ✅ Jest mock helper - สำหรับ mock entire module
 * 
 * @example
 * // ใน test file
 * jest.mock('./logger/logger.js', () => ({
 *   CustomLogger: jest.fn().mockImplementation(() => createMockLogger()),
 *   LogAction: {
 *     INBOUND: jest.fn((desc) => ({ action: '[INBOUND]', description: desc })),
 *     OUTBOUND: jest.fn((desc) => ({ action: '[OUTBOUND]', description: desc })),
 *   }
 * }));
 */
export const mockLoggerModule = {
    CustomLogger: MockLogger,
    LogAction: {
        INBOUND: (description: string, subAction?: string): ILogActionType => ({
            action: '[INBOUND]',
            description,
            subAction
        }),
        OUTBOUND: (description: string, subAction?: string): ILogActionType => ({
            action: '[OUTBOUND]',
            description,
            subAction
        }),
        DB_REQUEST: (operation: string, description: string): ILogActionType => ({
            action: '[DB_REQUEST]',
            description,
            subAction: operation
        }),
        DB_RESPONSE: (operation: string, description: string): ILogActionType => ({
            action: '[DB_RESPONSE]',
            description,
            subAction: operation
        }),
        EXCEPTION: (description: string, subAction?: string): ILogActionType => ({
            action: '[EXCEPTION]',
            description,
            subAction
        }),
    }
};
