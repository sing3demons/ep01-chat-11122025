import { ICustomLogger, LogAction, SummaryError } from "../logger/logger";
import { MaskingRule } from "../logger/masking";
import { type Response, type Request } from "express";

class ResponseToClient {
    private res: Response;
    private logger: ICustomLogger;
    constructor(res: Response, req: Request, logger: ICustomLogger, masking?: Array<MaskingRule>) {
        this.res = res;
        logger.info(LogAction.INBOUND(`client -> ${logger.getModule()}`), {
            headers: req.headers,
            query: req.query,
            body: req.body,
            path: req.path,
            method: req.method
        }, masking);

        this.logger = logger;

    }
    json<T>(statusCode: number, data: T, msg: string = "success", stack?: unknown) {
        this.res.status(statusCode).json(data);

        this.logger.info(LogAction.OUTBOUND(`response -> client`), {
            headers: this.res.getHeaders(),
            body: data,
            statusCode: statusCode
        });

        if (stack) {
            this.logger.flushError(SummaryError.fromError(stack));
            return;
        }

        this.logger.flush(statusCode, msg ? msg : 'error');
    }

    jsonError<T>(statusCode: number, data: T, error: unknown) {
        this.res.status(statusCode).json(data);

        this.logger.info(LogAction.OUTBOUND(`response -> client`), {
            headers: this.res.getHeaders(),
            body: data,
            statusCode: statusCode
        });

        this.logger.flushError(SummaryError.fromError(error));
    }

    static json<T>(res: Response, logger: ICustomLogger, statusCode: number, data: T) {
        res.status(statusCode).json(data);
        logger.info(LogAction.OUTBOUND(`response -> client`), {
            headers: res.getHeaders(),
            body: data,
            statusCode: statusCode
        });
    }
}
export { ResponseToClient };