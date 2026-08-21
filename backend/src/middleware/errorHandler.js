/**
 * asyncHandler — wraps async route handlers to forward errors
 * to Express's global error handler. Eliminates repetitive try/catch
 * in every controller method.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handler — catches all unhandled errors.
 * Always returns JSON. Includes stack trace only in development.
 */
const errorHandler = (err, req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`❌ [${req.method}] ${req.originalUrl} → ${statusCode}: ${message}`);

    if (process.env.NODE_ENV !== "production") {
        console.error(err.stack);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
};

module.exports = { asyncHandler, errorHandler };
