import { NextFunction, RequestHandler, Request, Response } from 'express';
import createHttpError from 'http-errors';

const asyncRequestHandler = (requestHandler: RequestHandler) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => {
            if (err instanceof createHttpError.HttpError) {
                next(err);
            } else if (err instanceof Error) {
                next(createHttpError(500, err.message));
            } else {
                next(createHttpError(500, 'Internal Server Error'));
            }
        });
    };
};

export default asyncRequestHandler;
