enum BOOLEAN_VALUES {
    TRUE = 'TRUE',
    FALSE = 'FALSE',
};

enum SERIALISATION_KEYS {
    USER = 'USER',
    DEVICE = 'DEVICE',
    EMAIL = 'EMAIL',
    COUNTRY_CODE = 'COUNTRY_CODE',
    PHONE_NUMBER = 'PHONE_NUMBER',
};

enum DB_TIMEOUTS {
    CONNECTION_TIMEOUT = 5000,
    QUERY_TIMEOUT = 10000,
    LOCK_TIMEOUT = 10000,
    IDLE_TIMEOUT = 10000,
    CACHE_DB_REDIS_TIMEOUT = 600,
    QUEUE_DB_REDIS_TIMEOUT = 10000,
};

enum DB_COMMANDS {
    BEGIN = 'BEGIN',
    SELECT = 'SELECT',
    INSERT = 'INSERT',
    UPDATE = 'UPDATE',
    COMMIT = 'COMMIT',
    ROLLBACK = 'ROLLBACK',
};

enum DB_ERRORS {
    DEFAULT_ERROR = 'DB OPERATION FAILED',
    INSERTION_FAILED = 'INSERTION FAILED',
    UPDATED_FAILED = 'UPDATED FAILED',
    READ_FAILURE = 'UNABLE TO READ DATA',
};

enum STATUS_CODES {
    CONTINUE = 100,                           // Request received, please continue.
    SWITCHING_PROTOCOLS = 101,                // Server switching protocols as requested.
    PROCESSING = 102,                         // (WebDAV) Request is being processed.
    EARLY_HINTS = 103,                        // Preliminary headers; final response pending.

    OK = 200,                                 // Request succeeded.
    CREATED = 201,                            // Resource successfully created.
    ACCEPTED = 202,                           // Request accepted for processing (not complete).
    NON_AUTHORITATIVE_INFORMATION = 203,      // Returned meta-information is not from the origin server.
    NO_CONTENT = 204,                         // Request succeeded; no content returned.
    RESET_CONTENT = 205,                      // Client should reset view (e.g., form reset).
    PARTIAL_CONTENT = 206,                    // Partial data returned due to range header.
    MULTI_STATUS = 207,                       // (WebDAV) Multiple status codes for multiple resources.
    ALREADY_REPORTED = 208,                   // (WebDAV) Already reported in a previous response.
    IM_USED = 226,                            // Instance manipulation applied; response represents the result.

    MULTIPLE_CHOICES = 300,                   // Multiple options for the resource.
    MOVED_PERMANENTLY = 301,                  // Resource permanently moved to a new URL.
    FOUND = 302,                              // Resource temporarily located at a different URL.
    SEE_OTHER = 303,                          // Response can be found under a different URL with GET.
    NOT_MODIFIED = 304,                       // Resource not modified since last request.
    USE_PROXY = 305,                          // (Deprecated) Must access through the specified proxy.
    TEMPORARY_REDIRECT = 307,                 // Request should be repeated with a different URL.
    PERMANENT_REDIRECT = 308,                 // Resource permanently moved; use new URL in future.

    BAD_REQUEST = 400,                        // Malformed request syntax.
    UNAUTHORIZED = 401,                       // Authentication is required or failed.
    PAYMENT_REQUIRED = 402,                   // Reserved for future use.
    FORBIDDEN = 403,                          // Client does not have permission.
    NOT_FOUND = 404,                          // Resource not found.
    METHOD_NOT_ALLOWED = 405,                 // Request method is not supported.
    NOT_ACCEPTABLE = 406,                     // Content not acceptable according to Accept header.
    PROXY_AUTHENTICATION_REQUIRED = 407,      // Authentication with proxy is required.
    REQUEST_TIMEOUT = 408,                    // Request timed out.
    CONFLICT = 409,                           // Request conflicts with current server state.
    GONE = 410,                               // Resource is permanently removed.
    LENGTH_REQUIRED = 411,                    // Missing Content-Length header.
    PRECONDITION_FAILED = 412,                // Preconditions in the request header not met.
    PAYLOAD_TOO_LARGE = 413,                  // Request entity too large.
    URI_TOO_LONG = 414,                       // URI exceeds maximum length.
    UNSUPPORTED_MEDIA_TYPE = 415,             // Media type not supported.
    RANGE_NOT_SATISFIABLE = 416,              // Requested range not available.
    EXPECTATION_FAILED = 417,                 // Server cannot meet the Expect header.
    IM_A_TEAPOT = 418,                        // I'm a teapot (RFC 2324, humorous code).
    MISDIRECTED_REQUEST = 421,                // Request directed to a server that cannot produce a response.
    UNPROCESSABLE_ENTITY = 422,               // (WebDAV) Well-formed but semantic errors.
    LOCKED = 423,                             // (WebDAV) Resource is locked.
    FAILED_DEPENDENCY = 424,                  // (WebDAV) Dependency failure.
    TOO_EARLY = 425,                          // Server unwilling to risk processing a replayed request.
    UPGRADE_REQUIRED = 426,                   // Client should switch protocols.
    PRECONDITION_REQUIRED = 428,              // Request must be conditional.
    TOO_MANY_REQUESTS = 429,                  // Rate limit exceeded.
    REQUEST_HEADER_FIELDS_TOO_LARGE = 431,    // Request header fields too large.
    UNAVAILABLE_FOR_LEGAL_REASONS = 451,      // Resource unavailable due to legal reasons.

    INTERNAL_SERVER_ERROR = 500,              // Generic server error.
    NOT_IMPLEMENTED = 501,                    // Server does not support the functionality.
    BAD_GATEWAY = 502,                        // Invalid response from upstream server.
    SERVICE_UNAVAILABLE = 503,                // Server overloaded or under maintenance.
    GATEWAY_TIMEOUT = 504,                    // Upstream server did not respond in time.
    HTTP_VERSION_NOT_SUPPORTED = 505,         // HTTP version not supported by the server.
    VARIANT_ALSO_NEGOTIATES = 506,            // Circular reference in content negotiation.
    INSUFFICIENT_STORAGE = 507,               // (WebDAV) Server cannot store the requested representation.
    LOOP_DETECTED = 508,                      // (WebDAV) Infinite loop detected.
    NOT_EXTENDED = 510,                       // Further extensions required for the request.
    NETWORK_AUTHENTICATION_REQUIRED = 511,    // Client must authenticate to gain network access.
};

enum SIGNUP_MESSAGE {
    EMPTY_TOKEN = '',
    PROCESSING = 'Processing',
    CREATED = 'Account has been created successfully',
    EXISTING_USER = 'Account already exists',
    FAILED = 'Account creation failed',
    NO_CONTENT = 'Account do not exists',
};

enum LOGIN_MESSAGE {
    EMPTY_TOKEN = '',
    PROCESSING = 'Processing',
    NOT_VERIFIED = 'Please verify email',
    NO_CONTENT = 'Account do not exists',
    EMAIL_DO_NOT_EXISTS = 'Email do not exists',
    WRONG_AUTHENTICATION = 'Wrong Password',
    SUCCESS = 'Logging In',
    FAILED = 'Server Error',
};

enum REDIS_MESSAGE {
    FAILED = 'Redis Failure',
    NO_CONTENT = 'No Data In Redis',
};

enum JWT_CONFIG { 
    EXPIRY = '1d',
    ALGORITHM = 'ES256'
};

enum DB {
    SAVE_IN_REDIS = 'saveInRedis',
    SAVE_IN_DB = 'saveInDB',
    AUTHENTICATION_QUEUE_DB = 'authentication-queue-db',
};

enum QUEUE_DB {
    MAX_ATTEMPTS = 3,
    BACKOFF_EXPONENTIAL = 'exponential',
    STALLED_TIMEOUT_INTERVAL = 300000,
    GUARD_TIMEOUT_INTERVAL = 5000,
    DRAIN_DELAY_TIMEOUT = 300,
    BACKOFF_DELAY = 5000,
    JOB_TIMEOUT = 10000,
    LOCK_DURATION = 10000,
    CONCURRENCY = 5,
};

enum AUTH_TABLES {
    USER_TABLE = 'users',
    DEVICE_TABLE = 'device'
};

enum DEV_CONTROLLER {
    SWTICH_OFF_REDIS = 'true'
};

export class Constants {
    static readonly PORT = process.env.port;
    static readonly DB_PORT = '5432';
    static readonly SERVER_URL = `127.0.0.1:${this.PORT}`;
    static readonly CURRENT_TIME = Date.now();
    static readonly AUTH_TABLES = AUTH_TABLES;
    static readonly BOOLEAN_VALUES = BOOLEAN_VALUES;
    static readonly SERIALISATION_KEYS = SERIALISATION_KEYS;
    static readonly DB_TIMEOUTS = DB_TIMEOUTS;
    static readonly DB_COMMANDS = DB_COMMANDS;
    static readonly DB_ERRORS = DB_ERRORS;
    static readonly STATUS_CODES = STATUS_CODES;
    static readonly SIGNUP_MESSAGE = SIGNUP_MESSAGE;
    static readonly LOGIN_MESSAGE = LOGIN_MESSAGE;
    static readonly REDIS_MESSAGE = REDIS_MESSAGE;
    static readonly JWT_CONFIG = JWT_CONFIG;
    static readonly DB = DB;
    static readonly QUEUE_DB = QUEUE_DB;
    static readonly DEV_CONTROLLER = DEV_CONTROLLER;
};