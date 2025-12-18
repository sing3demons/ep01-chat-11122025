import { MaskingService, type MaskingRule } from "./masking";
import crypto from 'crypto';
import os from 'os';
const endOfLine = os.EOL;

// ✅ Cache hostname เพราะไม่เปลี่ยนแปลง
const HOSTNAME = os.hostname();

// ✅ Pre-allocate buffer สำหรับ random bytes
const traceIdBuffer = Buffer.allocUnsafe(16);
const spanIdBuffer = Buffer.allocUnsafe(8);

function generateTraceId(): string {
    crypto.randomFillSync(traceIdBuffer);
    return traceIdBuffer.toString('hex'); // 32 hex chars
}

function generateSpanId(): string {
    crypto.randomFillSync(spanIdBuffer);
    return spanIdBuffer.toString('hex'); // 16 hex chars
}

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
type LogDtoPartial = {
    service?: string;
    version?: string;
    hostname?: string;
    module?: string;
    sessionId?: string;
    transactionId?: string;
    requestId?: string;
    userId?: string | undefined;
}

interface ILogActionType {
    action: string;
    description?: string | undefined;
    subAction?: string | undefined;
}

export enum DBActionEnum {
    FIND = 'FIND',
    READ = 'READ',
    CREATE = 'CREATE',
    INSERT = 'INSERT',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    AGGREGATE = 'AGGREGATE',
    NONE = 'NONE'
}

export class LogAction {
    static INBOUND(description: string, subAction?: string): ILogActionType {
        return {
            action: '[INBOUND]',
            description,
            subAction
        };
    }

    static OUTBOUND(description: string, subAction?: string): ILogActionType {
        return {
            action: '[OUTBOUND]',
            description,
            subAction
        };
    }

    static DB_REQUEST(operation: DBActionEnum | string, description: string): ILogActionType {
        return {
            action: '[DB_REQUEST]',
            description,
            subAction: operation
        };
    }

    static DB_RESPONSE(operation: DBActionEnum | string, description: string): ILogActionType {
        return {
            action: '[DB_RESPONSE]',
            description,
            subAction: operation
        };
    }


    static EXTERNAL_API_REQUEST(description: string, subAction?: string): ILogActionType {
        return {
            action: '[EXTERNAL_API_REQUEST]',
            description,
            subAction
        };
    }

    static EXTERNAL_API_RESPONSE(description: string, subAction?: string): ILogActionType {
        return {
            action: '[EXTERNAL_API_RESPONSE]',
            description,
            subAction
        };
    }

    static EXCEPTION(description: string, subAction?: string): ILogActionType {
        return {
            action: '[EXCEPTION]',
            description,
            subAction
        };
    }
}

export interface LogDependencyMetadata {
    dependency?: string;
    responseTime?: number;
    resultCode?: string;
    resultFlag?: string;
}

// ✅ Interface สำหรับ external logger (pino, winston, etc.)
export interface ILogTransport {
    info(obj: object): void;
    debug(obj: object): void;
    warn?(obj: object): void;
    error?(obj: object): void;
}

// ✅ Default transport ใช้ stdout
export class DefaultTransport implements ILogTransport {
    info(obj: object): void {
        process.stdout.write(JSON.stringify(obj) + endOfLine);
    }
    debug(obj: object): void {
        process.stdout.write(JSON.stringify(obj) + endOfLine);
    }
    warn(obj: object): void {
        process.stdout.write(JSON.stringify(obj) + endOfLine);
    }
    error(obj: object): void {
        process.stderr.write(JSON.stringify(obj) + endOfLine);
    }
}

// ✅ Logger options สำหรับ configuration
export interface LoggerOptions {
    transport?: ILogTransport;
    masker?: MaskingService;
    prettyPrint?: boolean;
}

export interface ICustomLogger {
    info(action: ILogActionType, data: any, maskingRules?: Array<MaskingRule>): ICustomLogger;
    debug(action: ILogActionType, data: any, maskingRules?: Array<MaskingRule>): ICustomLogger;
    error(action: ILogActionType, data: any, maskingRules?: Array<MaskingRule>): ICustomLogger;
    flush(code?: number, msg?: string): void;
    flushError(stack: any): void;
    init(dto: LogDtoPartial): ICustomLogger;
    update<K extends Exclude<keyof LogDto, 'level' | 'timestamp' | 'service' | 'version' | 'requestId'>>(key: K, value: LogDto[K]): ICustomLogger;
    setDependencyMetadata(meta: LogDependencyMetadata): ICustomLogger;
    setSummaryLogAdditionalInfo(key: string, value: any): ICustomLogger;
    addCustomField<K extends string, V>(key: K, value: V): ICustomLogger;
    sessionId(): string;
    getModule(): string;
}
export class CustomLogger implements ICustomLogger {
    private dto: Partial<LogDto> = {};
    private startTime: number = 0;

    // ✅ Reuse instances (singleton pattern)
    private static readonly sharedMasker = new MaskingService();
    private static readonly sharedTransport = new DefaultTransport();

    private readonly masker: MaskingService;
    private readonly transport: ILogTransport;
    private readonly prettyPrint: boolean;

    /**
     * สร้าง CustomLogger instance
     * @param dto - Initial log data
     * @param options - Logger options (transport, masker, prettyPrint)
     * 
     * @example
     * // ใช้กับ pino
     * import pino from 'pino';
     * const pinoLogger = pino();
     * const logger = new CustomLogger(undefined, { transport: pinoLogger });
     * 
     * @example
     * // ใช้กับ winston
     * import winston from 'winston';
     * const winstonLogger = winston.createLogger({ ... });
     * const logger = new CustomLogger(undefined, { 
     *   transport: {
     *     info: (obj) => winstonLogger.info(obj),
     *     debug: (obj) => winstonLogger.debug(obj),
     *     error: (obj) => winstonLogger.error(obj),
     *   }
     * });
     */
    constructor(dto?: Partial<LogDto>, options?: LoggerOptions) {
        this.masker = options?.masker ?? CustomLogger.sharedMasker;
        this.transport = options?.transport ?? CustomLogger.sharedTransport;
        this.prettyPrint = options?.prettyPrint ?? false;

        this.dto.hostname = HOSTNAME; // ✅ ใช้ cached hostname

        if (dto) {
            Object.assign(this.dto, dto); // ✅ เร็วกว่า spread operator
        }
    }
    init(dto: LogDtoPartial) {
        Object.assign(this.dto, dto); // ✅ เร็วกว่า spread operator

        // ✅ ใช้ nullish coalescing assignment
        this.dto.transactionId ??= generateSpanId(); // Log ของ operation เดียว (query DB, call API)
        this.dto.sessionId ??= generateTraceId(); // Log ทั้งหมดของ user request นี้ (ทุก service)
        this.startTime = Date.now();
        this.dto.requestId = generateSpanId(); // Log ทั้งหมดใน service นี้สำหรับ request นี้

        return this;
    }

    sessionId(): string {
        if (!this.dto.sessionId) {
            this.dto.sessionId = generateTraceId();
        }
        return this.dto.sessionId || '';
    }

    getModule(): string {
        return this.dto.module || '';
    }

    // omit level, timestamp, service
    update<K extends Exclude<keyof LogDto, 'level' | 'timestamp' | 'service' | 'version' | 'requestId'>>(key: K, value: LogDto[K]) {
        (this.dto as LogDto)[key] = value;
        return this;
    }

    setDependencyMetadata(meta: LogDependencyMetadata) {
        if (meta.dependency) {
            (this.dto as LogDto).dependency = meta.dependency;
        }

        if (meta.responseTime) {
            (this.dto as LogDto).responseTime = meta.responseTime;
        }

        if (meta.resultCode) {
            (this.dto as LogDto).resultCode = meta.resultCode;
        }

        if (meta.resultFlag) {
            (this.dto as LogDto).resultFlag = meta.resultFlag;
        }

        return this;
    }

    setSummaryLogAdditionalInfo(key: string, value: any) {
        if (!this.dto?.additionalSummary) {
            this.dto.additionalSummary = {};
        }
        Object.defineProperty(this.dto?.additionalSummary, `${key}`, {
            enumerable: true,
            value: value,
            configurable: true
        });
        return this;
    }

    addCustomField<K extends string, V>(key: K, value: V) {
        (this.dto as any)[key] = value;
        return this;
    }


    private convertToStr(value: any): string {
        if (value == null) {
            return String(value);
        }

        const valueType = typeof value;

        if (valueType === 'string') {
            return value;
        }

        // ✅ Handle Buffer - convert to string
        if (Buffer.isBuffer(value)) {
            return value.toString('utf8');
        }

        if (valueType === 'object') {
            try {
                if (this.prettyPrint) {
                    return JSON.stringify(value, this.jsonReplacer.bind(this), 2);
                } else {
                    return JSON.stringify(value, this.jsonReplacer.bind(this));
                }
            } catch {
                return String(value);
            }
        }

        try {
            return String(value);
        } catch {
            return '';
        }
    }
    // ✅ Custom replacer to handle MongoDB ObjectId and Buffer
    private jsonReplacer(_key: string, value: any): any {
        // Handle MongoDB ObjectId (has _bsontype or toHexString method)
        if (value && typeof value === 'object') {
            if (value._bsontype === 'ObjectId' || typeof value.toHexString === 'function') {
                return value.toHexString ? value.toHexString() : String(value);
            }
            // Handle Buffer inside objects
            if (Buffer.isBuffer(value)) {
                return value.toString('utf8');
            }
            // Handle {type: 'Buffer', data: [...]} pattern
            if (value.type === 'Buffer' && Array.isArray(value.data)) {
                return Buffer.from(value.data).toString('utf8');
            }
        }
        return value;
    }

    // clone data and making new instance
    private cloneData(data: any, maskingRules?: Array<MaskingRule>): string {
        if (data == null) return data;
        if (!maskingRules || maskingRules.length === 0) {
            return data;
        }

        const dataType = typeof data;

        if (dataType === 'object') {
            try {
                // ✅ ใช้ JSON.stringify with replacer เพื่อจัดการ ObjectId และ Buffer
                const cloned = JSON.parse(JSON.stringify(data, this.jsonReplacer.bind(this)));
                return this.masker.mask(cloned, maskingRules);
            } catch {
                return data;
            }
        }

        if (dataType === 'string') {
            try {
                const parsed = JSON.parse(data);
                return this.masker.mask(parsed, maskingRules);
            } catch {
                return data;
            }
        }

        return data;
    }

    info(action: ILogActionType, data: any, maskingRules?: Array<MaskingRule>) {
        const msg = this.convertToStr(this.cloneData(data, maskingRules));
        const logDto: Partial<LogDto> = {
            ...this.dto,
            level: 'info',
            type: 'detail',
            action: action.action,
            actionDescription: action.description,
            subAction: action.subAction,
            message: msg,
            timestamp: new Date(),
        };

        // ✅ ใช้ transport แทน stdout โดยตรง
        this.transport.info(logDto);
        this.clear();
        return this;
    }

    debug(action: ILogActionType, data: any, maskingRules?: Array<MaskingRule>) {
        const msg = this.convertToStr(this.cloneData(data, maskingRules));
        const logDto: Partial<LogDto> = {
            ...this.dto,
            level: 'debug',
            type: 'detail',
            action: action.action,
            actionDescription: action.description,
            subAction: action.subAction,
            message: msg,
            timestamp: new Date(),
        };

        // ✅ ใช้ transport แทน stdout โดยตรง
        this.transport.debug(logDto);
        this.clear();
        return this;
    }

    error(action: ILogActionType, data: any, maskingRules?: Array<MaskingRule>) {
        const msg = this.convertToStr(this.cloneData(data, maskingRules));
        const logDto: Partial<LogDto> = {
            ...this.dto,
            level: 'error',
            type: 'detail',
            action: action.action,
            actionDescription: action.description,
            subAction: action.subAction,
            message: msg,
            timestamp: new Date(),
        };

        // ✅ ใช้ transport.error ถ้ามี หรือ fallback เป็น info
        if (this.transport.error) {
            this.transport.error(logDto);
        } else {
            this.transport.info(logDto);
        }
        this.clear();
        return this;
    }

    // ✅ ปรับปรุง clear ให้เร็วขึ้น - ไม่ต้อง check condition
    private clear() {
        this.dto.responseTime = undefined;
        this.dto.resultCode = undefined;
        this.dto.resultFlag = undefined;
        this.dto.message = undefined;
        this.dto.action = undefined;
        this.dto.actionDescription = undefined;
        this.dto.subAction = undefined;
        this.dto.dependency = undefined;
    }

    flush(code?: number, msg?: string) {
        const responseTime = Date.now() - this.startTime;

        const logDto: Partial<LogDto> = {
            ...this.dto,
            level: 'info',
            type: 'summary',
            resultCode: code ? String(code).padEnd(5, '0').substring(0, 5) : '20000',
            resultMessage: msg || 'Success',
            timestamp: new Date(),
            responseTime,
            ...this.dto.additionalSummary, // ✅ spread additionalSummary directly
        };

        // ✅ ใช้ transport แทน stdout โดยตรง
        this.transport.info(logDto);

        this.dto.additionalSummary = undefined;
        this.cleanUpSummary();
    }

    // ✅ รวม cleanup logic
    private cleanUpSummary() {
        this.dto = {
            service: this.dto.service,
            version: this.dto.version,
            hostname: this.dto.hostname,
        } as Partial<LogDto>;
        this.startTime = 0;
    }

    flushError(stack: any) {
        const responseTime = Date.now() - this.startTime;

        // ✅ กำหนด resultCode และ resultMessage ก่อน
        let resultCode = '50000';
        let resultMessage: string;


        if (stack?.code) {
            const code = String(stack.code);
            resultCode = code.padEnd(5, '0').substring(0, 5);
        }

        if (this.dto?.additionalSummary?.["resultMessage"]) {
            resultMessage = String(this.dto.additionalSummary["resultMessage"]);
            this.dto.additionalSummary["resultMessage"] = undefined;
        } else {
            resultMessage = stack?.message ?? JSON.stringify(stack);
        }

        const logDto: Partial<LogDto> = {
            ...this.dto,
            level: 'error',
            type: 'summary',
            resultCode,
            resultMessage,
            timestamp: new Date(),
            responseTime,
            ...this.dto.additionalSummary, // ✅ spread additionalSummary directly
        };

        if (stack?.errorStack) {
            logDto.errorStack = stack.errorStack;
        }

        if (this.dto?.additionalSummary && Object.keys(this.dto.additionalSummary).length > 0) {
            Object.assign(logDto, this.dto.additionalSummary);
        }

        // ✅ ใช้ transport แทน stdout โดยตรง
        if (this.transport.error) {
            this.transport.error(logDto);
        } else {
            this.transport.info(logDto);
        }

        this.dto.additionalSummary = undefined;
        this.cleanUpSummary();
    }
}

type SummaryErrorParams = {
    message: string;
    code: string;
    errorStack: string;
};
export class SummaryError extends Error {
    code: string;
    errorStack: string;

    constructor(message: string, code: string, errorStack: string) {
        super(message);
        this.code = code;
        this.errorStack = errorStack;
    }
    static fromError(err: unknown, code: string = '50000'): SummaryError {
        let msg = 'unknown error';
        let errorStack = '';
        if (err instanceof Error) {
            msg = err.message;
            errorStack = err.stack || '';
        }
        return new SummaryError(msg, code, errorStack);
    }
}

// const logger = new CustomLogger();
// logger.init({
//     service: 'UserService',
//     version: '1.0.0',
//     module: 'AuthModule',
//     sessionId: 'x',
//     transactionId: 'x',
// });

// logger.info(LogAction.INBOUND('Received user registration request'), { userEmail: "test@example.com" }, [{
//     maskingField: "userEmail",
//     maskingType: "email",
// }]);
// logger.info(LogAction.OUTBOUND('Sending welcome email'), "endpoint: /send-email")
// logger.flush()