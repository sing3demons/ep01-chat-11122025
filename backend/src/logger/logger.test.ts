import { CustomLogger, LogAction, DBActionEnum, DefaultTransport, type ILogTransport, type LoggerOptions } from './logger.js';
import { MaskingService } from './masking.js';
import { MockTransport, MockLogger, createMockLogger, createMockTransport, mockLoggerModule } from './logger.mock.js';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('CustomLogger', () => {
    let transport: MockTransport;
    let logger: CustomLogger;

    beforeEach(() => {
        transport = new MockTransport();
        logger = new CustomLogger(undefined, { transport });
    });

    afterEach(() => {
        transport.clear();
    });

    describe('constructor', () => {
        it('should create logger with default options', () => {
            const defaultLogger = new CustomLogger();
            expect(defaultLogger).toBeInstanceOf(CustomLogger);
        });

        it('should create logger with initial dto', () => {
            const loggerWithDto = new CustomLogger({ service: 'TestService', version: '1.0.0', hostname: 'test' }, { transport });
            loggerWithDto.init({  sessionId: 'sess', transactionId: 'tx' });
            loggerWithDto.info(LogAction.INBOUND('test'), { data: 'test' });

            const log = transport.getLastLog();
            expect(log).toBeDefined();
            expect((log?.obj as any).service).toBe('TestService');
        });

        it('should create logger with custom masker', () => {
            const customMasker = new MaskingService();
            const loggerWithMasker = new CustomLogger(undefined, { transport, masker: customMasker });
            expect(loggerWithMasker).toBeInstanceOf(CustomLogger);
        });

        it('should create logger with prettyPrint option', () => {
            const loggerWithPretty = new CustomLogger(undefined, { transport, prettyPrint: true });
            expect(loggerWithPretty).toBeInstanceOf(CustomLogger);
        });
    });

    describe('init', () => {
        it('should initialize logger with dto', () => {
            logger.init({
                service: 'TestService',
                version: '1.0.0',
                hostname: 'test-host',
                sessionId: 'session-123',
                transactionId: 'tx-123',
            });

            logger.info(LogAction.INBOUND('test'), { data: 'test' });
            const log = transport.getLastLog();

            expect((log?.obj as any).service).toBe('TestService');
            expect((log?.obj as any).version).toBe('1.0.0');
        });

        it('should auto-generate transactionId if not provided', () => {
            logger.init({
                service: 'TestService',
                version: '1.0.0',
                hostname: 'test-host',
                sessionId: 'session-123',
            } as any);

            logger.info(LogAction.INBOUND('test'), {});
            const log = transport.getLastLog();

            expect((log?.obj as any).transactionId).toBeDefined();
            expect((log?.obj as any).transactionId).toHaveLength(16); // spanId = 8 bytes = 16 hex chars
        });

        it('should auto-generate sessionId if not provided', () => {
            logger.init({
                service: 'TestService',
                version: '1.0.0',
                hostname: 'test-host',
            } as any);

            logger.info(LogAction.INBOUND('test'), {});
            const log = transport.getLastLog();

            expect((log?.obj as any).sessionId).toBeDefined();
            expect((log?.obj as any).sessionId).toHaveLength(32); // traceId = 16 bytes = 32 hex chars
        });

        it('should return this for chaining', () => {
            const result = logger.init({
                service: 'TestService',
                version: '1.0.0',
                hostname: 'test-host',
                sessionId: 'x',
                transactionId: 'x',
            });

            expect(result).toBe(logger);
        });
    });

    describe('update', () => {
        it('should update dto field', () => {
            logger.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
            logger.update('userId', 'user-123');
            logger.info(LogAction.INBOUND('test'), {});

            const log = transport.getLastLog();
            expect((log?.obj as any).userId).toBe('user-123');
        });

        it('should return this for chaining', () => {
            const result = logger.update('module', 'TestModule');
            expect(result).toBe(logger);
        });
    });

    describe('setDependencyMetadata', () => {
        beforeEach(() => {
            logger.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
        });

        it('should set dependency', () => {
            logger.setDependencyMetadata({ dependency: 'external-api' });
            logger.info(LogAction.OUTBOUND('call'), {});

            const log = transport.getLastLog();
            expect((log?.obj as any).dependency).toBe('external-api');
        });

        it('should set responseTime', () => {
            logger.setDependencyMetadata({ responseTime: 150 });
            logger.info(LogAction.OUTBOUND('call'), {});

            const log = transport.getLastLog();
            expect((log?.obj as any).responseTime).toBe(150);
        });

        it('should set resultCode', () => {
            logger.setDependencyMetadata({ resultCode: '20000' });
            logger.info(LogAction.OUTBOUND('call'), {});

            const log = transport.getLastLog();
            expect((log?.obj as any).resultCode).toBe('20000');
        });

        it('should set resultFlag', () => {
            logger.setDependencyMetadata({ resultFlag: 'S' });
            logger.info(LogAction.OUTBOUND('call'), {});

            const log = transport.getLastLog();
            expect((log?.obj as any).resultFlag).toBe('S');
        });

        it('should set all metadata at once', () => {
            logger.setDependencyMetadata({
                dependency: 'db',
                responseTime: 50,
                resultCode: '20000',
                resultFlag: 'S',
            });
            logger.info(LogAction.DB_RESPONSE(DBActionEnum.FIND, 'query'), {});

            const log = transport.getLastLog();
            expect((log?.obj as any).dependency).toBe('db');
            expect((log?.obj as any).responseTime).toBe(50);
            expect((log?.obj as any).resultCode).toBe('20000');
            expect((log?.obj as any).resultFlag).toBe('S');
        });

        it('should return this for chaining', () => {
            const result = logger.setDependencyMetadata({ dependency: 'test' });
            expect(result).toBe(logger);
        });
    });

    describe('setSummaryLogAdditionalInfo', () => {
        beforeEach(() => {
            logger.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
        });

        it('should add additional info to summary log', () => {
            logger.setSummaryLogAdditionalInfo('customKey', 'customValue');
            logger.flush();

            const log = transport.getLastLog();
            expect((log?.obj as any).customKey).toBe('customValue');
        });

        it('should add multiple additional info', () => {
            logger.setSummaryLogAdditionalInfo('key1', 'value1');
            logger.setSummaryLogAdditionalInfo('key2', 'value2');
            logger.flush();

            const log = transport.getLastLog();
            expect((log?.obj as any).key1).toBe('value1');
            expect((log?.obj as any).key2).toBe('value2');
        });

        it('should return this for chaining', () => {
            const result = logger.setSummaryLogAdditionalInfo('key', 'value');
            expect(result).toBe(logger);
        });
    });

    describe('addCustomField', () => {
        beforeEach(() => {
            logger.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
        });

        it('should add custom field to log', () => {
            logger.addCustomField('customField', 'customValue');
            logger.info(LogAction.INBOUND('test'), {});

            const log = transport.getLastLog();
            expect((log?.obj as any).customField).toBe('customValue');
        });

        it('should return this for chaining', () => {
            const result = logger.addCustomField('key', 'value');
            expect(result).toBe(logger);
        });
    });

    describe('info', () => {
        beforeEach(() => {
            logger.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
        });

        it('should log info with action', () => {
            logger.info(LogAction.INBOUND('test request'), { data: 'test' });

            const log = transport.getLastLog();
            expect((log?.obj as any).level).toBe('info');
            expect((log?.obj as any).type).toBe('detail');
            expect((log?.obj as any).action).toBe('[INBOUND]');
            expect((log?.obj as any).actionDescription).toBe('test request');
        });

        it('should log info with subAction', () => {
            logger.info(LogAction.INBOUND('test', 'sub-action'), {});

            const log = transport.getLastLog();
            expect((log?.obj as any).subAction).toBe('sub-action');
        });

        it('should mask data with masking rules', () => {
            logger.info(
                LogAction.INBOUND('test'),
                { email: 'test@example.com' },
                [{ maskingField: 'email', maskingType: 'email' }]
            );

            const log = transport.getLastLog();
            const message = JSON.parse((log?.obj as any).message);
            expect(message.email).not.toBe('test@example.com');
            expect(message.email).toContain('xx');
        });

        it('should handle null data', () => {
            logger.info(LogAction.INBOUND('test'), null);

            const log = transport.getLastLog();
            expect((log?.obj as any).message).toBe('null');
        });

        it('should handle undefined data', () => {
            logger.info(LogAction.INBOUND('test'), undefined);

            const log = transport.getLastLog();
            expect((log?.obj as any).message).toBe('undefined');
        });

        it('should handle string data without masking', () => {
            logger.info(LogAction.INBOUND('test'), 'simple string');

            const log = transport.getLastLog();
            expect((log?.obj as any).message).toBe('simple string');
        });

        it('should handle JSON string data with masking', () => {
            logger.info(
                LogAction.INBOUND('test'),
                '{"email":"test@example.com"}',
                [{ maskingField: 'email', maskingType: 'email' }]
            );

            const log = transport.getLastLog();
            const message = JSON.parse((log?.obj as any).message);
            expect(message.email).not.toBe('test@example.com');
        });

        it('should handle invalid JSON string with masking gracefully', () => {
            logger.info(
                LogAction.INBOUND('test'),
                'not a json string',
                [{ maskingField: 'email', maskingType: 'email' }]
            );

            const log = transport.getLastLog();
            expect((log?.obj as any).message).toBe('not a json string');
        });

        it('should handle number data', () => {
            logger.info(LogAction.INBOUND('test'), 123);

            const log = transport.getLastLog();
            expect((log?.obj as any).message).toBe('123');
        });

        it('should clear detail fields after info', () => {
            logger.setDependencyMetadata({ dependency: 'test', responseTime: 100 });
            logger.info(LogAction.INBOUND('first'), {});

            logger.info(LogAction.INBOUND('second'), {});
            const log = transport.getLastLog();

            expect((log?.obj as any).dependency).toBeUndefined();
            expect((log?.obj as any).responseTime).toBeUndefined();
        });

        it('should return this for chaining', () => {
            const result = logger.info(LogAction.INBOUND('test'), {});
            expect(result).toBe(logger);
        });
    });

    describe('debug', () => {
        beforeEach(() => {
            logger.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
        });

        it('should log debug with action', () => {
            logger.debug(LogAction.INBOUND('debug request'), { data: 'debug' });

            const log = transport.getLastLog();
            expect((log?.obj as any).level).toBe('debug');
            expect((log?.obj as any).type).toBe('detail');
        });

        it('should mask data with masking rules', () => {
            logger.debug(
                LogAction.INBOUND('test'),
                { email: 'test@example.com' },
                [{ maskingField: 'email', maskingType: 'email' }]
            );

            const log = transport.getLastLog();
            const message = (log?.obj as any).message;
            expect(message.email).not.toBe('test@example.com');
        });

        it('should return this for chaining', () => {
            const result = logger.debug(LogAction.INBOUND('test'), {});
            expect(result).toBe(logger);
        });
    });

    describe('flush', () => {
        beforeEach(() => {
            logger.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
        });

        it('should log summary with default message', () => {
            logger.flush();

            const log = transport.getLastLog();
            expect((log?.obj as any).level).toBe('info');
            expect((log?.obj as any).type).toBe('summary');
            expect((log?.obj as any).resultCode).toBe('20000');
            expect((log?.obj as any).resultMessage).toBe('Success');
        });

        it('should log summary with custom message', () => {
            logger.flush('Custom success message');

            const log = transport.getLastLog();
            expect((log?.obj as any).resultMessage).toBe('Custom success message');
        });

        it('should include responseTime', () => {
            logger.flush();

            const log = transport.getLastLog();
            expect((log?.obj as any).responseTime).toBeGreaterThanOrEqual(0);
        });

        it('should include additionalSummary in flush', () => {
            logger.setSummaryLogAdditionalInfo('extra', 'data');
            logger.flush();

            const log = transport.getLastLog();
            expect((log?.obj as any).extra).toBe('data');
        });

        it('should cleanup after flush', () => {
            logger.setSummaryLogAdditionalInfo('temp', 'value');
            logger.flush();

            // Create new logger state
            logger.init({ service: 'Test2', version: '2.0.0', hostname: 'h2', sessionId: 's2', transactionId: 't2' });
            logger.flush();

            const log = transport.getLastLog();
            expect((log?.obj as any).temp).toBeUndefined();
        });
    });

    describe('flushError', () => {
        beforeEach(() => {
            logger.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
        });

        it('should log error summary with error object', () => {
            const error = new Error('Test error');
            logger.flushError(error);

            const log = transport.getLastLog();
            expect((log?.obj as any).level).toBe('error');
            expect((log?.obj as any).type).toBe('summary');
            expect((log?.obj as any).resultCode).toBe('50000');
            expect((log?.obj as any).resultMessage).toBe('Test error');
        });

        it('should extract code from error object', () => {
            const error = { code: '40000', message: 'Bad request' };
            logger.flushError(error);

            const log = transport.getLastLog();
            expect((log?.obj as any).resultCode).toBe('40000');
            expect((log?.obj as any).resultMessage).toBe('Bad request');
        });

        it('should pad short error code', () => {
            const error = { code: '404', message: 'Not found' };
            logger.flushError(error);

            const log = transport.getLastLog();
            expect((log?.obj as any).resultCode).toBe('40400');
        });

        it('should truncate long error code', () => {
            const error = { code: '123456789', message: 'Error' };
            logger.flushError(error);

            const log = transport.getLastLog();
            expect((log?.obj as any).resultCode).toBe('12345');
        });

        it('should stringify non-message error', () => {
            const error = { data: 'some error data' };
            logger.flushError(error);

            const log = transport.getLastLog();
            expect((log?.obj as any).resultMessage).toBe(JSON.stringify(error));
        });

        it('should include responseTime', () => {
            logger.flushError({ message: 'error' });

            const log = transport.getLastLog();
            expect((log?.obj as any).responseTime).toBeGreaterThanOrEqual(0);
        });

        it('should include additionalSummary in flushError', () => {
            logger.setSummaryLogAdditionalInfo('errorContext', 'context-data');
            logger.flushError({ message: 'error' });

            const log = transport.getLastLog();
            expect((log?.obj as any).errorContext).toBe('context-data');
        });

        it('should fallback to info if transport has no error method', () => {
            const noErrorTransport: ILogTransport = {
                info: jest.fn(),
                debug: jest.fn(),
            };
            const loggerNoError = new CustomLogger(undefined, { transport: noErrorTransport });
            loggerNoError.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });

            loggerNoError.flushError({ message: 'error' });

            expect(noErrorTransport.info).toHaveBeenCalled();
        });
    });
});

describe('LogAction', () => {
    describe('INBOUND', () => {
        it('should create INBOUND action', () => {
            const action = LogAction.INBOUND('test description');
            expect(action.action).toBe('[INBOUND]');
            expect(action.description).toBe('test description');
            expect(action.subAction).toBeUndefined();
        });

        it('should create INBOUND action with subAction', () => {
            const action = LogAction.INBOUND('test', 'sub');
            expect(action.subAction).toBe('sub');
        });
    });

    describe('OUTBOUND', () => {
        it('should create OUTBOUND action', () => {
            const action = LogAction.OUTBOUND('test description');
            expect(action.action).toBe('[OUTBOUND]');
            expect(action.description).toBe('test description');
        });

        it('should create OUTBOUND action with subAction', () => {
            const action = LogAction.OUTBOUND('test', 'sub');
            expect(action.subAction).toBe('sub');
        });
    });

    describe('DB_REQUEST', () => {
        it('should create DB_REQUEST action with enum', () => {
            const action = LogAction.DB_REQUEST(DBActionEnum.FIND, 'query users');
            expect(action.action).toBe('[DB_REQUEST]');
            expect(action.description).toBe('query users');
            expect(action.subAction).toBe('FIND');
        });

        it('should create DB_REQUEST action with string', () => {
            const action = LogAction.DB_REQUEST('CUSTOM', 'custom query');
            expect(action.subAction).toBe('CUSTOM');
        });
    });

    describe('DB_RESPONSE', () => {
        it('should create DB_RESPONSE action with enum', () => {
            const action = LogAction.DB_RESPONSE(DBActionEnum.INSERT, 'insert user');
            expect(action.action).toBe('[DB_RESPONSE]');
            expect(action.description).toBe('insert user');
            expect(action.subAction).toBe('INSERT');
        });

        it('should create DB_RESPONSE action with string', () => {
            const action = LogAction.DB_RESPONSE('UPSERT', 'upsert record');
            expect(action.subAction).toBe('UPSERT');
        });
    });

    describe('EXCEPTION', () => {
        it('should create EXCEPTION action', () => {
            const action = LogAction.EXCEPTION('error occurred');
            expect(action.action).toBe('[EXCEPTION]');
            expect(action.description).toBe('error occurred');
        });

        it('should create EXCEPTION action with subAction', () => {
            const action = LogAction.EXCEPTION('error', 'validation');
            expect(action.subAction).toBe('validation');
        });
    });
});

describe('DBActionEnum', () => {
    it('should have correct enum values', () => {
        expect(DBActionEnum.FIND).toBe('FIND');
        expect(DBActionEnum.READ).toBe('READ');
        expect(DBActionEnum.INSERT).toBe('INSERT');
        expect(DBActionEnum.UPDATE).toBe('UPDATE');
        expect(DBActionEnum.DELETE).toBe('DELETE');
        expect(DBActionEnum.AGGREGATE).toBe('AGGREGATE');
        expect(DBActionEnum.NONE).toBe('NONE');
    });
});

describe('MockTransport', () => {
    let mockTransport: MockTransport;

    beforeEach(() => {
        mockTransport = new MockTransport();
    });

    it('should capture info logs', () => {
        mockTransport.info({ test: 'info' });
        expect(mockTransport.logs).toHaveLength(1);
        expect(mockTransport.logs[0]?.level).toBe('info');
    });

    it('should capture debug logs', () => {
        mockTransport.debug({ test: 'debug' });
        expect(mockTransport.logs).toHaveLength(1);
        expect(mockTransport.logs[0]?.level).toBe('debug');
    });

    it('should capture warn logs', () => {
        mockTransport.warn({ test: 'warn' });
        expect(mockTransport.logs).toHaveLength(1);
        expect(mockTransport.logs[0]?.level).toBe('warn');
    });

    it('should capture error logs', () => {
        mockTransport.error({ test: 'error' });
        expect(mockTransport.logs).toHaveLength(1);
        expect(mockTransport.logs[0]?.level).toBe('error');
    });

    it('should clear logs', () => {
        mockTransport.info({ test: 'info' });
        mockTransport.clear();
        expect(mockTransport.logs).toHaveLength(0);
    });

    it('should get last log', () => {
        mockTransport.info({ first: 1 });
        mockTransport.info({ second: 2 });

        const last = mockTransport.getLastLog();
        expect((last?.obj as any).second).toBe(2);
    });

    it('should return undefined for getLastLog when empty', () => {
        const last = mockTransport.getLastLog();
        expect(last).toBeUndefined();
    });

    it('should get logs by level', () => {
        mockTransport.info({ a: 1 });
        mockTransport.debug({ b: 2 });
        mockTransport.info({ c: 3 });

        const infoLogs = mockTransport.getLogsByLevel('info');
        expect(infoLogs).toHaveLength(2);
    });

    it('should check if log contains message', () => {
        mockTransport.info({ message: 'hello world' });

        expect(mockTransport.hasLogWithMessage('hello')).toBe(true);
        expect(mockTransport.hasLogWithMessage('goodbye')).toBe(false);
    });
});

describe('cloneData edge cases', () => {
    let transport: MockTransport;
    let logger: CustomLogger;

    beforeEach(() => {
        transport = new MockTransport();
        logger = new CustomLogger(undefined, { transport });
        logger.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
    });

    it('should handle circular reference in object gracefully', () => {
        const circularObj: any = { name: 'test' };
        circularObj.self = circularObj;

        // Should not throw - structuredClone handles circular refs
        expect(() => {
            logger.info(
                LogAction.INBOUND('test'),
                circularObj,
                [{ maskingField: 'name', maskingType: 'full' }]
            );
        }).not.toThrow();

        // Message should be defined (either masked or original)
        const log = transport.getLastLog();
        expect((log?.obj as any).message).toBeDefined();
    });

    it('should handle object that throws on clone with JSON.stringify fallback', () => {
        // Object with getter that throws
        const problematicObj = {
            get value() {
                throw new Error('Cannot access');
            },
            name: 'test'
        };

        // Should not throw - returns original data when clone fails
        expect(() => {
            logger.info(
                LogAction.INBOUND('test'),
                problematicObj,
                [{ maskingField: 'name', maskingType: 'full' }]
            );
        }).not.toThrow();
    });

    it('should handle empty masking rules array', () => {
        logger.info(LogAction.INBOUND('test'), { data: 'test' }, []);

        const log = transport.getLastLog();
        expect((log?.obj as any).message).toBe('{"data":"test"}');
    });

    it('should handle boolean data', () => {
        logger.info(LogAction.INBOUND('test'), true);

        const log = transport.getLastLog();
        expect((log?.obj as any).message).toBe('true');
    });

    it('should handle array data', () => {
        logger.info(LogAction.INBOUND('test'), [1, 2, 3]);

        const log = transport.getLastLog();
        expect((log?.obj as any).message).toBe('[1,2,3]');
    });

    it('should handle Buffer data and convert to string', () => {
        const buffer = Buffer.from('Hello Buffer');
        logger.info(LogAction.INBOUND('test'), buffer);

        const log = transport.getLastLog();
        expect((log?.obj as any).message).toBe('Hello Buffer');
    });

    it('should handle Buffer with binary data', () => {
        const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
        logger.info(LogAction.INBOUND('test'), buffer);

        const log = transport.getLastLog();
        expect((log?.obj as any).message).toBe('Hello');
    });

    it('should handle MongoDB ObjectId with toHexString method', () => {
        // Mock MongoDB ObjectId
        const mockObjectId = {
            _bsontype: 'ObjectId',
            toHexString: () => '507f1f77bcf86cd799439011'
        };
        const data = { _id: mockObjectId, name: 'test' };
        logger.info(LogAction.INBOUND('test'), data);

        const log = transport.getLastLog();
        const message = JSON.parse((log?.obj as any).message);
        expect(message._id).toBe('507f1f77bcf86cd799439011');
        expect(message.name).toBe('test');
    });

    it('should handle MongoDB ObjectId with _bsontype only', () => {
        const mockObjectId = {
            _bsontype: 'ObjectId',
            toString: () => '507f1f77bcf86cd799439011'
        };
        const data = { _id: mockObjectId, name: 'test' };
        logger.info(LogAction.INBOUND('test'), data);

        const log = transport.getLastLog();
        const message = JSON.parse((log?.obj as any).message);
        expect(message._id).toBe('507f1f77bcf86cd799439011');
    });

    it('should handle Buffer inside object', () => {
        const data = {
            id: '123',
            content: Buffer.from('Hello World')
        };
        logger.info(LogAction.INBOUND('test'), data);

        const log = transport.getLastLog();
        const message = JSON.parse((log?.obj as any).message);
        expect(message.content).toBe('Hello World');
    });

    it('should handle {type: Buffer, data: [...]} pattern', () => {
        const data = {
            _id: { type: 'Buffer', data: [0x48, 0x65, 0x6c, 0x6c, 0x6f] },
            name: 'test'
        };
        logger.info(LogAction.INBOUND('test'), data);

        const log = transport.getLastLog();
        const message = JSON.parse((log?.obj as any).message);
        expect(message._id).toBe('Hello');
    });

    it('should handle boolean data with masking rules (returns as-is)', () => {
        logger.info(
            LogAction.INBOUND('test'),
            true,
            [{ maskingField: 'email', maskingType: 'email' }]
        );

        const log = transport.getLastLog();
        expect((log?.obj as any).message).toBe('true');
    });

    it('should handle number data with masking rules (returns as-is)', () => {
        logger.info(
            LogAction.INBOUND('test'),
            12345,
            [{ maskingField: 'email', maskingType: 'email' }]
        );

        const log = transport.getLastLog();
        expect((log?.obj as any).message).toBe('12345');
    });

    it('should handle function data with masking rules (returns as-is)', () => {
        const fn = () => 'test';
        logger.info(
            LogAction.INBOUND('test'),
            fn,
            [{ maskingField: 'email', maskingType: 'email' }]
        );

        const log = transport.getLastLog();
        expect((log?.obj as any).message).toBe("() => 'test'");
    });

    it('should handle symbol data with masking rules (returns as-is)', () => {
        const sym = Symbol('test');
        logger.info(
            LogAction.INBOUND('test'),
            sym,
            [{ maskingField: 'email', maskingType: 'email' }]
        );

        const log = transport.getLastLog();
        expect((log?.obj as any).message).toBe('Symbol(test)');
    });
});

describe('DefaultTransport', () => {
    let originalStdoutWrite: typeof process.stdout.write;
    let originalStderrWrite: typeof process.stderr.write;
    let stdoutOutput: string[];
    let stderrOutput: string[];

    beforeEach(() => {
        stdoutOutput = [];
        stderrOutput = [];

        originalStdoutWrite = process.stdout.write;
        originalStderrWrite = process.stderr.write;

        process.stdout.write = ((chunk: string) => {
            stdoutOutput.push(chunk);
            return true;
        }) as any;

        process.stderr.write = ((chunk: string) => {
            stderrOutput.push(chunk);
            return true;
        }) as any;
    });

    afterEach(() => {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    });

    it('should write info log to stdout', () => {
        const logger = new CustomLogger(); // Uses DefaultTransport
        logger.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
        logger.info(LogAction.INBOUND('test'), { data: 'test' });

        expect(stdoutOutput.length).toBeGreaterThan(0);
        const logOutput = JSON.parse(stdoutOutput[0]!.trim());
        expect(logOutput.level).toBe('info');
    });

    it('should write debug log to stdout', () => {
        const logger = new CustomLogger({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
        logger.init({ sessionId: 's', transactionId: 't' });
        logger.debug(LogAction.INBOUND('test'), { data: 'debug' });

        expect(stdoutOutput.length).toBeGreaterThan(0);
        const logOutput = JSON.parse(stdoutOutput[0]!.trim());
        expect(logOutput.level).toBe('debug');
    });

    it('should write flush log to stdout', () => {
        const logger = new CustomLogger({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
        logger.init({ sessionId: 's', transactionId: 't' });
        logger.flush('success');

        expect(stdoutOutput.length).toBeGreaterThan(0);
        const logOutput = JSON.parse(stdoutOutput[0]!.trim());
        expect(logOutput.type).toBe('summary');
    });

    it('should write flushError log to stderr', () => {
        const logger = new CustomLogger({
            service: 'Test',
            version: '1.0.0',
            hostname: 'h',
        });
        logger.init({ sessionId: 's', transactionId: 't' });
        logger.flushError({ message: 'error' });

        expect(stderrOutput.length).toBeGreaterThan(0);
        const logOutput = JSON.parse(stderrOutput[0]!.trim());
        expect(logOutput.level).toBe('error');
    });

    it('should write warn log to stdout using DefaultTransport directly', () => {
        const transport = new DefaultTransport();
        transport.warn({ level: 'warn', message: 'warning message' });

        expect(stdoutOutput.length).toBeGreaterThan(0);
        const logOutput = JSON.parse(stdoutOutput[0]!.trim());
        expect(logOutput.level).toBe('warn');
    });

    it('should write error log to stderr using DefaultTransport directly', () => {
        const transport = new DefaultTransport();
        transport.error({ level: 'error', message: 'error message' });

        expect(stderrOutput.length).toBeGreaterThan(0);
        const logOutput = JSON.parse(stderrOutput[0]!.trim());
        expect(logOutput.level).toBe('error');
    });
});

describe('CustomLogger error method', () => {
    let transport: MockTransport;
    let logger: CustomLogger;

    beforeEach(() => {
        transport = new MockTransport();
        logger = new CustomLogger(undefined, { transport });
        logger.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
    });

    it('should log error with action and data', () => {
        logger.error(LogAction.EXCEPTION('Database error'), { error: 'Connection timeout' });

        const log = transport.getLastLog();
        expect(log).toBeDefined();
        expect((log?.obj as any).level).toBe('error');
        expect((log?.obj as any).type).toBe('detail');
        expect((log?.obj as any).action).toBe('[EXCEPTION]');
        expect((log?.obj as any).actionDescription).toBe('Database error');
        expect((log?.obj as any).message).toBe('{"error":"Connection timeout"}');
    });

    it('should apply masking rules to error data', () => {
        logger.error(
            LogAction.EXCEPTION('Sensitive error'),
            { password: 'secret123', error: 'auth failed' },
            [{ maskingField: 'password', maskingType: 'full' }]
        );

        const log = transport.getLastLog();
        const message = JSON.parse((log?.obj as any).message);
        expect(message.password).toBe('*********'); // full masking = same length as original
        expect(message.error).toBe('auth failed');
    });

    it('should return this for chaining', () => {
        const result = logger.error(LogAction.EXCEPTION('test'), {});
        expect(result).toBe(logger);
    });

    it('should clear metadata after error log', () => {
        logger.setDependencyMetadata({ dependency: 'db', resultCode: '50000' });
        logger.error(LogAction.EXCEPTION('db error'), {});

        // Log again to verify metadata was cleared
        logger.info(LogAction.INBOUND('next'), {});
        const log = transport.getLastLog();
        expect((log?.obj as any).dependency).toBeUndefined();
        expect((log?.obj as any).resultCode).toBeUndefined();
    });

    it('should use transport.info as fallback when transport.error is undefined', () => {
        const transportWithoutError: ILogTransport = {
            info: jest.fn(),
            debug: jest.fn(),
        };
        const loggerWithFallback = new CustomLogger(undefined, { transport: transportWithoutError });
        loggerWithFallback.init({ service: 'Test', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' });
        loggerWithFallback.error(LogAction.EXCEPTION('test'), { data: 'test' });

        expect(transportWithoutError.info).toHaveBeenCalled();
    });

    it('should mask user data with email and password fields', () => {
        const userData = {
            result: {
                _id: "69350d69770cd6f56182a4e9",
                name: "testuser",
                email: "testuser@example.com",
                password: "$2b$14$IsNC5ezeoVwGxVNpdmxHyuiprCxa91ROZEBOeJ7uIhtV7KqXHiAnS",
                createdAt: "2025-12-07T05:15:21.556Z",
                updatedAt: "2025-12-07T05:15:21.556Z"
            }
        };

        logger.info(
            LogAction.DB_RESPONSE(DBActionEnum.FIND, 'Get user by id'),
            userData,
            [
                { maskingField: 'result.email', maskingType: 'email' },
                { maskingField: 'result.password', maskingType: 'full' }
            ]
        );

        const log = transport.getLastLog();
        const message = JSON.parse((log?.obj as any).message);
        expect(message.result._id).toBe("69350d69770cd6f56182a4e9");
        expect(message.result.name).toBe("testuser");
        // email should be masked (pattern uses 'x' for masking: "000xx@xxx.xx.xx")
        expect(message.result.email).not.toBe("testuser@example.com");
        expect(message.result.email).toContain("@");
        expect(message.result.email).toContain("x"); // uses 'x' as mask char
        // password should be fully masked (all asterisks)
        expect(message.result.password).toMatch(/^\*+$/);
        expect(message.result.password).toHaveLength(60); // bcrypt hash length
        // other fields should remain unchanged
        expect(message.result.createdAt).toBe("2025-12-07T05:15:21.556Z");
        expect(message.result.updatedAt).toBe("2025-12-07T05:15:21.556Z");
    });

    it('should mask nested user data in error logs', () => {
        const errorData = {
            error: 'User creation failed',
            userData: {
                email: "admin@company.com",
                password: "plaintext123",
                apiKey: "sk-1234567890abcdef"
            }
        };

        logger.error(
            LogAction.EXCEPTION('Database insert error'),
            errorData,
            [
                { maskingField: 'userData.email', maskingType: 'email' },
                { maskingField: 'userData.password', maskingType: 'full' },
            ]
        );

        const log = transport.getLastLog();
        const message = JSON.parse((log?.obj as any).message);
        expect((log?.obj as any).level).toBe('error');
        expect(message.error).toBe('User creation failed');
        // email should be masked (pattern uses 'x' for masking)
        expect(message.userData.email).not.toBe("admin@company.com");
        expect(message.userData.email).toContain("x"); // uses 'x' as mask char
        // password should be fully masked
        expect(message.userData.password).toMatch(/^\*+$/);
    });
});

describe('MockLogger', () => {
    describe('constructor', () => {
        it('should create MockLogger instance', () => {
            const mockLogger = new MockLogger();
            expect(mockLogger).toBeInstanceOf(MockLogger);
        });

        it('should create MockLogger with dto and options', () => {
            const mockLogger = new MockLogger({ service: 'Test' }, { prettyPrint: true });
            expect(mockLogger).toBeInstanceOf(MockLogger);
        });
    });

    describe('info', () => {
        it('should be a jest mock function', () => {
            const mockLogger = createMockLogger();
            expect(jest.isMockFunction(mockLogger.info)).toBe(true);
        });

        it('should record info calls', () => {
            const mockLogger = createMockLogger();
            const action = { action: '[INBOUND]', description: 'test' };
            mockLogger.info(action, { data: 'test' });

            expect(mockLogger.info).toHaveBeenCalledWith(action, { data: 'test' });
            expect(mockLogger.calls.info).toHaveLength(1);
            expect(mockLogger.calls.info[0]?.action).toEqual(action);
        });

        it('should record info calls with masking rules', () => {
            const mockLogger = createMockLogger();
            const action = { action: '[INBOUND]', description: 'test' };
            const maskingRules = [{ maskingField: 'password', maskingType: 'full' as const }];
            mockLogger.info(action, { password: 'secret' }, maskingRules);

            expect(mockLogger.calls.info[0]?.maskingRules).toEqual(maskingRules);
        });

        it('should return this for chaining', () => {
            const mockLogger = createMockLogger();
            const result = mockLogger.info({ action: 'test' }, {});
            expect(result).toBe(mockLogger);
        });
    });

    describe('debug', () => {
        it('should be a jest mock function', () => {
            const mockLogger = createMockLogger();
            expect(jest.isMockFunction(mockLogger.debug)).toBe(true);
        });

        it('should record debug calls', () => {
            const mockLogger = createMockLogger();
            const action = { action: '[DEBUG]', description: 'debug test' };
            mockLogger.debug(action, { debug: 'data' });

            expect(mockLogger.debug).toHaveBeenCalledWith(action, { debug: 'data' });
            expect(mockLogger.calls.debug).toHaveLength(1);
        });

        it('should record debug calls with masking rules', () => {
            const mockLogger = createMockLogger();
            const maskingRules = [{ maskingField: 'token', maskingType: 'full' as const }];
            mockLogger.debug({ action: 'test' }, { token: 'abc' }, maskingRules);

            expect(mockLogger.calls.debug[0]?.maskingRules).toEqual(maskingRules);
        });
    });

    describe('error', () => {
        it('should be a jest mock function', () => {
            const mockLogger = createMockLogger();
            expect(jest.isMockFunction(mockLogger.error)).toBe(true);
        });

        it('should record error calls', () => {
            const mockLogger = createMockLogger();
            const action = { action: '[EXCEPTION]', description: 'error test' };
            mockLogger.error(action, { error: 'data' });

            expect(mockLogger.error).toHaveBeenCalledWith(action, { error: 'data' });
            expect(mockLogger.calls.error).toHaveLength(1);
        });

        it('should record error calls with masking rules', () => {
            const mockLogger = createMockLogger();
            const maskingRules = [{ maskingField: 'password', maskingType: 'full' as const }];
            mockLogger.error({ action: 'test' }, { password: 'secret' }, maskingRules);

            expect(mockLogger.calls.error[0]?.maskingRules).toEqual(maskingRules);
        });

        it('should return this for chaining', () => {
            const mockLogger = createMockLogger();
            const result = mockLogger.error({ action: 'test' }, {});
            expect(result).toBe(mockLogger);
        });
    });

    describe('flush', () => {
        it('should be a jest mock function', () => {
            const mockLogger = createMockLogger();
            expect(jest.isMockFunction(mockLogger.flush)).toBe(true);
        });

        it('should record flush calls without message', () => {
            const mockLogger = createMockLogger();
            mockLogger.flush();

            expect(mockLogger.flush).toHaveBeenCalled();
            expect(mockLogger.calls.flush).toHaveLength(1);
            expect(mockLogger.calls.flush[0]).toEqual({});
        });

        it('should record flush calls with message', () => {
            const mockLogger = createMockLogger();
            mockLogger.flush('Success');

            expect(mockLogger.flush).toHaveBeenCalledWith('Success');
            expect(mockLogger.calls.flush[0]?.msg).toBe('Success');
        });
    });

    describe('flushError', () => {
        it('should be a jest mock function', () => {
            const mockLogger = createMockLogger();
            expect(jest.isMockFunction(mockLogger.flushError)).toBe(true);
        });

        it('should record flushError calls', () => {
            const mockLogger = createMockLogger();
            const error = { message: 'Something went wrong', code: 500 };
            mockLogger.flushError(error);

            expect(mockLogger.flushError).toHaveBeenCalledWith(error);
            expect(mockLogger.calls.flushError).toHaveLength(1);
            expect(mockLogger.calls.flushError[0]?.stack).toEqual(error);
        });
    });

    describe('init', () => {
        it('should be a jest mock function', () => {
            const mockLogger = createMockLogger();
            expect(jest.isMockFunction(mockLogger.init)).toBe(true);
        });

        it('should record init calls and update dto', () => {
            const mockLogger = createMockLogger();
            const dto = { service: 'TestService', version: '1.0.0', hostname: 'h', sessionId: 's', transactionId: 't' };
            mockLogger.init(dto as any);

            expect(mockLogger.init).toHaveBeenCalledWith(dto);
            expect(mockLogger.calls.init).toHaveLength(1);
            expect(mockLogger.getDto().service).toBe('TestService');
        });

        it('should return this for chaining', () => {
            const mockLogger = createMockLogger();
            const result = mockLogger.init({ service: 'Test', version: '1.0', hostname: 'h', sessionId: 's', transactionId: 't' } as any);
            expect(result).toBe(mockLogger);
        });
    });

    describe('update', () => {
        it('should be a jest mock function', () => {
            const mockLogger = createMockLogger();
            expect(jest.isMockFunction(mockLogger.update)).toBe(true);
        });

        it('should record update calls and update dto', () => {
            const mockLogger = createMockLogger();
            mockLogger.update('userId', 'user-123');

            expect(mockLogger.update).toHaveBeenCalledWith('userId', 'user-123');
            expect(mockLogger.calls.update).toHaveLength(1);
            expect(mockLogger.getDto().userId).toBe('user-123');
        });

        it('should return this for chaining', () => {
            const mockLogger = createMockLogger();
            const result = mockLogger.update('module', 'TestModule');
            expect(result).toBe(mockLogger);
        });
    });

    describe('setDependencyMetadata', () => {
        it('should be a jest mock function', () => {
            const mockLogger = createMockLogger();
            expect(jest.isMockFunction(mockLogger.setDependencyMetadata)).toBe(true);
        });

        it('should record setDependencyMetadata calls', () => {
            const mockLogger = createMockLogger();
            const meta = { dependency: 'db', responseTime: 100 };
            mockLogger.setDependencyMetadata(meta);

            expect(mockLogger.setDependencyMetadata).toHaveBeenCalledWith(meta);
            expect(mockLogger.calls.setDependencyMetadata).toHaveLength(1);
            expect(mockLogger.calls.setDependencyMetadata[0]?.meta).toEqual(meta);
        });

        it('should return this for chaining', () => {
            const mockLogger = createMockLogger();
            const result = mockLogger.setDependencyMetadata({});
            expect(result).toBe(mockLogger);
        });
    });

    describe('setSummaryLogAdditionalInfo', () => {
        it('should be a jest mock function', () => {
            const mockLogger = createMockLogger();
            expect(jest.isMockFunction(mockLogger.setSummaryLogAdditionalInfo)).toBe(true);
        });

        it('should record setSummaryLogAdditionalInfo calls', () => {
            const mockLogger = createMockLogger();
            mockLogger.setSummaryLogAdditionalInfo('key', 'value');

            expect(mockLogger.setSummaryLogAdditionalInfo).toHaveBeenCalledWith('key', 'value');
            expect(mockLogger.calls.setSummaryLogAdditionalInfo).toHaveLength(1);
            expect(mockLogger.calls.setSummaryLogAdditionalInfo[0]).toEqual({ key: 'key', value: 'value' });
        });

        it('should return this for chaining', () => {
            const mockLogger = createMockLogger();
            const result = mockLogger.setSummaryLogAdditionalInfo('k', 'v');
            expect(result).toBe(mockLogger);
        });
    });

    describe('addCustomField', () => {
        it('should be a jest mock function', () => {
            const mockLogger = createMockLogger();
            expect(jest.isMockFunction(mockLogger.addCustomField)).toBe(true);
        });

        it('should record addCustomField calls', () => {
            const mockLogger = createMockLogger();
            mockLogger.addCustomField('customKey', 'customValue');

            expect(mockLogger.addCustomField).toHaveBeenCalledWith('customKey', 'customValue');
            expect(mockLogger.calls.addCustomField).toHaveLength(1);
            expect(mockLogger.calls.addCustomField[0]).toEqual({ key: 'customKey', value: 'customValue' });
        });

        it('should return this for chaining', () => {
            const mockLogger = createMockLogger();
            const result = mockLogger.addCustomField('k', 'v');
            expect(result).toBe(mockLogger);
        });
    });

    describe('reset', () => {
        it('should clear all call records', () => {
            const mockLogger = createMockLogger();
            mockLogger.info({ action: 'test' }, {});
            mockLogger.debug({ action: 'test' }, {});
            mockLogger.flush();

            mockLogger.reset();

            expect(mockLogger.calls.info).toHaveLength(0);
            expect(mockLogger.calls.debug).toHaveLength(0);
            expect(mockLogger.calls.flush).toHaveLength(0);
        });

        it('should clear dto', () => {
            const mockLogger = createMockLogger();
            mockLogger.init({ service: 'Test', version: '1.0', hostname: 'h', sessionId: 's', transactionId: 't' } as any);
            mockLogger.update('userId', 'user-123');

            mockLogger.reset();

            expect(mockLogger.getDto()).toEqual({});
        });

        it('should reset jest mock functions', () => {
            const mockLogger = createMockLogger();
            mockLogger.info({ action: 'test' }, {});

            mockLogger.reset();

            expect(mockLogger.info).not.toHaveBeenCalled();
        });
    });

    describe('helper methods', () => {
        it('wasInfoCalledWith should return true when action matches', () => {
            const mockLogger = createMockLogger();
            mockLogger.info({ action: '[INBOUND]', description: 'test' }, {});

            expect(mockLogger.wasInfoCalledWith('[INBOUND]')).toBe(true);
            expect(mockLogger.wasInfoCalledWith('[OUTBOUND]')).toBe(false);
        });

        it('wasDebugCalledWith should return true when action matches', () => {
            const mockLogger = createMockLogger();
            mockLogger.debug({ action: '[DEBUG]', description: 'test' }, {});

            expect(mockLogger.wasDebugCalledWith('[DEBUG]')).toBe(true);
            expect(mockLogger.wasDebugCalledWith('[INFO]')).toBe(false);
        });

        it('infoCallCount should return correct count', () => {
            const mockLogger = createMockLogger();
            expect(mockLogger.infoCallCount).toBe(0);

            mockLogger.info({ action: 'test' }, {});
            mockLogger.info({ action: 'test2' }, {});

            expect(mockLogger.infoCallCount).toBe(2);
        });

        it('debugCallCount should return correct count', () => {
            const mockLogger = createMockLogger();
            expect(mockLogger.debugCallCount).toBe(0);

            mockLogger.debug({ action: 'test' }, {});

            expect(mockLogger.debugCallCount).toBe(1);
        });

        it('wasFlushCalled should return true after flush', () => {
            const mockLogger = createMockLogger();
            expect(mockLogger.wasFlushCalled).toBe(false);

            mockLogger.flush();

            expect(mockLogger.wasFlushCalled).toBe(true);
        });

        it('wasFlushErrorCalled should return true after flushError', () => {
            const mockLogger = createMockLogger();
            expect(mockLogger.wasFlushErrorCalled).toBe(false);

            mockLogger.flushError({ message: 'error' });

            expect(mockLogger.wasFlushErrorCalled).toBe(true);
        });

        it('getDto should return copy of dto', () => {
            const mockLogger = createMockLogger();
            mockLogger.init({ service: 'Test', version: '1.0', hostname: 'h', sessionId: 's', transactionId: 't' } as any);

            const dto = mockLogger.getDto();
            dto.service = 'Modified';

            expect(mockLogger.getDto().service).toBe('Test');
        });
    });
});

describe('MockTransport', () => {
    describe('logging methods', () => {
        it('should store info logs', () => {
            const transport = createMockTransport();
            transport.info({ level: 'info', message: 'test' });

            expect(transport.logs).toHaveLength(1);
            expect(transport.logs[0]?.level).toBe('info');
        });

        it('should store debug logs', () => {
            const transport = createMockTransport();
            transport.debug({ level: 'debug', message: 'debug test' });

            expect(transport.logs).toHaveLength(1);
            expect(transport.logs[0]?.level).toBe('debug');
        });

        it('should store warn logs', () => {
            const transport = createMockTransport();
            transport.warn({ level: 'warn', message: 'warning' });

            expect(transport.logs).toHaveLength(1);
            expect(transport.logs[0]?.level).toBe('warn');
        });

        it('should store error logs', () => {
            const transport = createMockTransport();
            transport.error({ level: 'error', message: 'error' });

            expect(transport.logs).toHaveLength(1);
            expect(transport.logs[0]?.level).toBe('error');
        });
    });

    describe('helper methods', () => {
        it('clear should remove all logs', () => {
            const transport = createMockTransport();
            transport.info({ msg: 'test1' });
            transport.info({ msg: 'test2' });

            transport.clear();

            expect(transport.logs).toHaveLength(0);
        });

        it('getLastLog should return the most recent log', () => {
            const transport = createMockTransport();
            transport.info({ msg: 'first' });
            transport.debug({ msg: 'second' });
            transport.error({ msg: 'third' });

            const lastLog = transport.getLastLog();
            expect(lastLog?.level).toBe('error');
            expect((lastLog?.obj as any).msg).toBe('third');
        });

        it('getLastLog should return undefined when no logs', () => {
            const transport = createMockTransport();
            expect(transport.getLastLog()).toBeUndefined();
        });

        it('getLogsByLevel should filter logs by level', () => {
            const transport = createMockTransport();
            transport.info({ msg: 'info1' });
            transport.debug({ msg: 'debug1' });
            transport.info({ msg: 'info2' });
            transport.error({ msg: 'error1' });

            const infoLogs = transport.getLogsByLevel('info');
            expect(infoLogs).toHaveLength(2);
            expect((infoLogs[0] as any).msg).toBe('info1');
            expect((infoLogs[1] as any).msg).toBe('info2');
        });

        it('hasLogWithMessage should return true when message found', () => {
            const transport = createMockTransport();
            transport.info({ message: 'Hello World' });

            expect(transport.hasLogWithMessage('Hello World')).toBe(true);
            expect(transport.hasLogWithMessage('Goodbye')).toBe(false);
        });

        it('hasLogWithMessage should search in nested objects', () => {
            const transport = createMockTransport();
            transport.info({ data: { nested: { message: 'deep value' } } });

            expect(transport.hasLogWithMessage('deep value')).toBe(true);
        });
    });
});

describe('Factory functions', () => {
    it('createMockLogger should return MockLogger instance', () => {
        const mockLogger = createMockLogger();
        expect(mockLogger).toBeInstanceOf(MockLogger);
    });

    it('createMockTransport should return MockTransport instance', () => {
        const mockTransport = createMockTransport();
        expect(mockTransport).toBeInstanceOf(MockTransport);
    });
});

describe('mockLoggerModule', () => {
    it('should have CustomLogger as MockLogger', () => {
        expect(mockLoggerModule.CustomLogger).toBe(MockLogger);
    });

    describe('LogAction', () => {
        it('INBOUND should return correct action type', () => {
            const result = mockLoggerModule.LogAction.INBOUND('test description', 'subAction');
            expect(result).toEqual({
                action: '[INBOUND]',
                description: 'test description',
                subAction: 'subAction'
            });
        });

        it('OUTBOUND should return correct action type', () => {
            const result = mockLoggerModule.LogAction.OUTBOUND('outbound desc');
            expect(result).toEqual({
                action: '[OUTBOUND]',
                description: 'outbound desc',
                subAction: undefined
            });
        });

        it('DB_REQUEST should return correct action type', () => {
            const result = mockLoggerModule.LogAction.DB_REQUEST('FIND', 'query users');
            expect(result).toEqual({
                action: '[DB_REQUEST]',
                description: 'query users',
                subAction: 'FIND'
            });
        });

        it('DB_RESPONSE should return correct action type', () => {
            const result = mockLoggerModule.LogAction.DB_RESPONSE('INSERT', 'insert user');
            expect(result).toEqual({
                action: '[DB_RESPONSE]',
                description: 'insert user',
                subAction: 'INSERT'
            });
        });

        it('EXCEPTION should return correct action type', () => {
            const result = mockLoggerModule.LogAction.EXCEPTION('error occurred', 'db_error');
            expect(result).toEqual({
                action: '[EXCEPTION]',
                description: 'error occurred',
                subAction: 'db_error'
            });
        });
    });
});
