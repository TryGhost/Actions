/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 8572:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { IncomingWebhook } = __nccwpck_require__(63);

function getStatusColor(statusInput) {
    if (statusInput === 'cancelled') {
        return 'warning';
    }

    if (statusInput === 'failure') {
        return 'danger';
    }

    return 'good';
}

function buildSlackMessage(statusInput, env = process.env) {
    const githubRepo = env.GITHUB_REPOSITORY;
    const githubSha = env.GITHUB_SHA || 'unknown';
    const githubActor = env.GITHUB_ACTOR;
    const githubRef = env.GITHUB_REF || 'unknown';
    const githubRunId = env.GITHUB_RUN_ID;

    const commitUrl = `https://github.com/${githubRepo}/commit/${githubSha}`;
    const linkifiedGithubRepo = `<https://github.com/${githubRepo}|${githubRepo}>`;
    const linkifiedCommitUrl = `<${commitUrl}|${githubSha.substring(0, 10)}>`;
    const branchParts = githubRef.split('/');
    const branch = branchParts[branchParts.length - 1];

    const openLink = `<https://github.com/${githubRepo}/actions/runs/${githubRunId}/|view>`;

    let actorLink = githubActor;

    const githubActorToSlackId = {
        ErisDS: 'U02563SGY',
        'sam-lord': 'U017YUER0HL',
        JoeeGrigg: 'U02LNNXJKGA',
        aileen: 'U04D59TH6',
        peterzimon: 'U7L3K6GM7',
        allouis: 'UCCEPHM39',
        vershwal: 'U05N8BNBAQ3',
        mike182uk: 'U052YFMMJQL',
        cmraible: 'U04ETKA5E3D',
        minimaluminium: 'U019YHN4WSG',
        '9larsons': 'U04HMKJDA79',
        kevinansfield: 'U051KGJR2',
        sagzy: 'U04RLV7E6F8',
        EvanHahn: 'U0A7KLGCHEW',
        troyciesco: 'U090DT54Y4B',
        'rob-ghost': 'U09E99K63JN',
        jonatansberg: 'U099U6NCFCN',
    };

    if (githubActorToSlackId[githubActor]) {
        actorLink = `<@${githubActorToSlackId[githubActor]}>`;
    }

    return {
        attachments: [
            {
                color: getStatusColor(statusInput),
                text: `Test ${statusInput} at ${linkifiedCommitUrl} on \`${branch}\` of ${linkifiedGithubRepo} by ${actorLink} - ${openLink}`,
            },
        ],
    };
}

async function getCore() {
    const coreModule = await __nccwpck_require__.e(/* import() */ 77).then(__nccwpck_require__.bind(__nccwpck_require__, 77));

    return coreModule.default ?? coreModule;
}

async function run(options = {}) {
    const env = options.env || process.env;
    const loadCore = options.getCore || getCore;
    const core = options.core || (await loadCore());
    if (!env.SLACK_WEBHOOK_URL) {
        throw new Error('SLACK_WEBHOOK_URL is required');
    }
    const Webhook = options.IncomingWebhook || IncomingWebhook;
    const webhook = new Webhook(env.SLACK_WEBHOOK_URL);
    const statusInput = core.getInput('status', { required: true });

    await webhook.send(buildSlackMessage(statusInput, env));
}

if (process.env.NODE_ENV !== 'testing') {
    run();
}

module.exports = {
    buildSlackMessage,
    getStatusColor,
    run,
};


/***/ }),

/***/ 4298:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IncomingWebhook = void 0;
const p_retry_1 = __importStar(__nccwpck_require__(8602));
const errors_1 = __nccwpck_require__(9736);
const instrument_1 = __nccwpck_require__(4662);
/**
 * A client for Slack's Incoming Webhooks
 */
class IncomingWebhook {
    /**
     * The webhook URL
     */
    url;
    /**
     * Default arguments for posting messages with this webhook
     */
    defaults;
    /**
     * The fetch function used for HTTP requests
     */
    fetchFn;
    /**
     * Request timeout in milliseconds
     */
    timeout;
    /**
     * Default headers sent with every request
     */
    headers;
    /**
     * Retry policy applied to each send. Defaults to no retries.
     */
    retryConfig;
    constructor(url, defaults = {
        timeout: 0,
    }) {
        if (url === undefined) {
            throw new Error('Incoming webhook URL is required');
        }
        this.url = url;
        this.fetchFn = defaults.fetch ?? globalThis.fetch;
        this.timeout = defaults.timeout ?? 0;
        this.retryConfig = defaults.retryConfig ?? { retries: 0 };
        this.headers = {
            'User-Agent': (0, instrument_1.getUserAgent)(),
        };
        // Remove transport options so they don't leak into payloads
        const { fetch: _fetch, timeout: _timeout, retryConfig: _retryConfig, ...messageDefaults } = defaults;
        this.defaults = messageDefaults;
    }
    /**
     * Send a notification to a conversation
     * @param message - the message (a simple string, or an object describing the message)
     */
    async send(message) {
        let payload = { ...this.defaults };
        if (typeof message === 'string') {
            payload.text = message;
        }
        else {
            payload = Object.assign(payload, message);
        }
        return (0, p_retry_1.default)(async () => {
            const signal = this.timeout > 0 ? AbortSignal.timeout(this.timeout) : undefined;
            try {
                const response = await this.fetchFn(this.url, {
                    method: 'POST',
                    headers: {
                        ...this.headers,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                    redirect: 'error',
                    signal,
                });
                if (!response.ok) {
                    const body = await response.text();
                    const httpError = new errors_1.IncomingWebhookHTTPError(response.status, response.statusText, body);
                    // Only server errors (5xx) are transient; client errors (4xx), including rate limits (429), fail immediately.
                    throw response.status >= 500 ? httpError : new p_retry_1.AbortError(httpError);
                }
                return await this.buildResult(response);
            }
            catch (error) {
                // Non-retryable signals (AbortError) and already-wrapped errors pass through untouched.
                if (error instanceof p_retry_1.AbortError || error instanceof errors_1.SlackWebhookError) {
                    throw error;
                }
                // No response received (network/timeout): retryable.
                throw new errors_1.IncomingWebhookRequestError(error instanceof Error ? error : new Error(String(error)));
            }
        }, this.retryConfig);
    }
    /**
     * Processes an HTTP response into an IncomingWebhookResult.
     */
    async buildResult(response) {
        return {
            text: await response.text(),
        };
    }
}
exports.IncomingWebhook = IncomingWebhook;
//# sourceMappingURL=IncomingWebhook.js.map

/***/ }),

/***/ 2016:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WebhookTrigger = void 0;
const p_retry_1 = __importStar(__nccwpck_require__(8602));
const errors_1 = __nccwpck_require__(9736);
const instrument_1 = __nccwpck_require__(4662);
/**
 * A client for Slack's Workflow Builder webhook triggers
 * @see {@link https://slack.com/help/articles/360041352714-Build-a-workflow--Create-a-workflow-that-starts-outside-of-Slack}
 */
class WebhookTrigger {
    /**
     * The webhook trigger URL
     */
    url;
    /**
     * The fetch function used for HTTP requests
     */
    fetchFn;
    /**
     * Request timeout in milliseconds
     */
    timeout;
    /**
     * Default headers sent with every request
     */
    headers;
    /**
     * Retry policy applied to each send. Defaults to no retries.
     */
    retryConfig;
    constructor(url, defaults = {
        timeout: 0,
    }) {
        if (!url) {
            throw new Error('Webhook trigger URL is required');
        }
        this.url = url;
        this.fetchFn = defaults.fetch ?? globalThis.fetch;
        this.timeout = defaults.timeout ?? 0;
        this.retryConfig = defaults.retryConfig ?? { retries: 0 };
        this.headers = {
            'User-Agent': (0, instrument_1.getUserAgent)(),
        };
    }
    /**
     * Send a payload to the webhook trigger
     * @param payload - arbitrary key-value data to send to the trigger
     */
    async send(payload = {}) {
        return (0, p_retry_1.default)(async () => {
            const signal = this.timeout > 0 ? AbortSignal.timeout(this.timeout) : undefined;
            try {
                const response = await this.fetchFn(this.url, {
                    method: 'POST',
                    headers: {
                        ...this.headers,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                    redirect: 'error',
                    signal,
                });
                if (!response.ok) {
                    const body = await response.text();
                    const httpError = new errors_1.WebhookTriggerHTTPError(response.status, response.statusText, body);
                    // Only server errors (5xx) are transient; client errors (4xx), including rate limits (429), fail immediately.
                    throw response.status >= 500 ? httpError : new p_retry_1.AbortError(httpError);
                }
                return await this.buildResult(response);
            }
            catch (error) {
                // Non-retryable signals (AbortError) and already-wrapped errors pass through untouched.
                if (error instanceof p_retry_1.AbortError || error instanceof errors_1.SlackWebhookError) {
                    throw error;
                }
                // No response received (network/timeout): retryable.
                throw new errors_1.WebhookTriggerRequestError(error instanceof Error ? error : new Error(String(error)));
            }
        }, this.retryConfig);
    }
    async buildResult(response) {
        const text = await response.text();
        try {
            if (!text) {
                return { ok: true };
            }
            return JSON.parse(text);
        }
        catch {
            return { ok: true };
        }
    }
}
exports.WebhookTrigger = WebhookTrigger;
//# sourceMappingURL=WebhookTrigger.js.map

/***/ }),

/***/ 9736:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WebhookTriggerHTTPError = exports.WebhookTriggerRequestError = exports.IncomingWebhookHTTPError = exports.IncomingWebhookRequestError = exports.SlackWebhookError = exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["RequestError"] = "slack_webhook_request_error";
    ErrorCode["HTTPError"] = "slack_webhook_http_error";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class SlackWebhookError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.SlackWebhookError = SlackWebhookError;
class IncomingWebhookRequestError extends SlackWebhookError {
    code = ErrorCode.RequestError;
    original;
    constructor(original) {
        super(`A request error occurred: ${original.message}`, { cause: original });
        this.original = original;
    }
}
exports.IncomingWebhookRequestError = IncomingWebhookRequestError;
class IncomingWebhookHTTPError extends SlackWebhookError {
    code = ErrorCode.HTTPError;
    statusCode;
    statusMessage;
    body;
    constructor(statusCode, statusMessage, body) {
        super(`An HTTP protocol error occurred: statusCode = ${statusCode}`);
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
        this.body = body;
    }
}
exports.IncomingWebhookHTTPError = IncomingWebhookHTTPError;
class WebhookTriggerRequestError extends SlackWebhookError {
    code = ErrorCode.RequestError;
    original;
    constructor(original) {
        super(`A request error occurred: ${original.message}`, { cause: original });
        this.original = original;
    }
}
exports.WebhookTriggerRequestError = WebhookTriggerRequestError;
class WebhookTriggerHTTPError extends SlackWebhookError {
    code = ErrorCode.HTTPError;
    statusCode;
    statusMessage;
    body;
    constructor(statusCode, statusMessage, body) {
        super(`An HTTP protocol error occurred: statusCode = ${statusCode}`);
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
        this.body = body;
    }
}
exports.WebhookTriggerHTTPError = WebhookTriggerHTTPError;
//# sourceMappingURL=errors.js.map

/***/ }),

/***/ 63:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

/// <reference lib="es2017" />
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WebhookTrigger = exports.retryPolicies = exports.addAppMetadata = exports.IncomingWebhook = exports.WebhookTriggerRequestError = exports.WebhookTriggerHTTPError = exports.SlackWebhookError = exports.IncomingWebhookRequestError = exports.IncomingWebhookHTTPError = exports.ErrorCode = void 0;
var errors_1 = __nccwpck_require__(9736);
Object.defineProperty(exports, "ErrorCode", ({ enumerable: true, get: function () { return errors_1.ErrorCode; } }));
Object.defineProperty(exports, "IncomingWebhookHTTPError", ({ enumerable: true, get: function () { return errors_1.IncomingWebhookHTTPError; } }));
Object.defineProperty(exports, "IncomingWebhookRequestError", ({ enumerable: true, get: function () { return errors_1.IncomingWebhookRequestError; } }));
Object.defineProperty(exports, "SlackWebhookError", ({ enumerable: true, get: function () { return errors_1.SlackWebhookError; } }));
Object.defineProperty(exports, "WebhookTriggerHTTPError", ({ enumerable: true, get: function () { return errors_1.WebhookTriggerHTTPError; } }));
Object.defineProperty(exports, "WebhookTriggerRequestError", ({ enumerable: true, get: function () { return errors_1.WebhookTriggerRequestError; } }));
var IncomingWebhook_1 = __nccwpck_require__(4298);
Object.defineProperty(exports, "IncomingWebhook", ({ enumerable: true, get: function () { return IncomingWebhook_1.IncomingWebhook; } }));
var instrument_1 = __nccwpck_require__(4662);
Object.defineProperty(exports, "addAppMetadata", ({ enumerable: true, get: function () { return instrument_1.addAppMetadata; } }));
var retry_policies_1 = __nccwpck_require__(216);
Object.defineProperty(exports, "retryPolicies", ({ enumerable: true, get: function () { return __importDefault(retry_policies_1).default; } }));
var WebhookTrigger_1 = __nccwpck_require__(2016);
Object.defineProperty(exports, "WebhookTrigger", ({ enumerable: true, get: function () { return WebhookTrigger_1.WebhookTrigger; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 4662:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addAppMetadata = addAppMetadata;
exports.getUserAgent = getUserAgent;
const os = __importStar(__nccwpck_require__(8161));
const packageJson = __nccwpck_require__(1612);
/**
 * Replaces occurrences of '/' with ':' in a string, since '/' is meaningful inside User-Agent strings as a separator.
 */
function replaceSlashes(s) {
    return s.replace('/', ':');
}
const baseUserAgent = `${replaceSlashes(packageJson.name)}/${packageJson.version} ` +
    `node/${process.version.replace('v', '')} ` +
    `${os.platform()}/${os.release()}`;
const appMetadata = {};
/**
 * Appends the app metadata into the User-Agent value
 * @param appMetadata.name name of tool to be counted in instrumentation
 * @param appMetadata.version version of tool to be counted in instrumentation
 */
function addAppMetadata({ name, version }) {
    appMetadata[replaceSlashes(name)] = version;
}
/**
 * Returns the current User-Agent value for instrumentation
 */
function getUserAgent() {
    const appIdentifier = Object.entries(appMetadata)
        .map(([name, version]) => `${name}/${version}`)
        .join(' ');
    // only prepend the appIdentifier when it's not empty
    return (appIdentifier.length > 0 ? `${appIdentifier} ` : '') + baseUserAgent;
}
//# sourceMappingURL=instrument.js.map

/***/ }),

/***/ 216:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.rapidRetryPolicy = exports.fiveRetriesInFiveMinutes = exports.tenRetriesInAboutThirtyMinutes = void 0;
/**
 * The default retry policy. Retry up to 10 times, over the span of about 30 minutes. It's not exact because
 * randomization has been added to prevent a stampeding herd problem (if all instances in your application are retrying
 * a request at the exact same intervals, they are more likely to cause failures for each other).
 */
exports.tenRetriesInAboutThirtyMinutes = {
    retries: 10,
    factor: 1.96821,
    randomize: true,
};
/**
 * Short & sweet, five retries in five minutes and then bail.
 */
exports.fiveRetriesInFiveMinutes = {
    retries: 5,
    factor: 3.86,
};
/**
 * This policy is just to keep the tests running fast.
 */
exports.rapidRetryPolicy = {
    minTimeout: 0,
    maxTimeout: 1,
};
const policies = {
    tenRetriesInAboutThirtyMinutes: exports.tenRetriesInAboutThirtyMinutes,
    fiveRetriesInFiveMinutes: exports.fiveRetriesInFiveMinutes,
    rapidRetryPolicy: exports.rapidRetryPolicy,
};
exports["default"] = policies;
//# sourceMappingURL=retry-policies.js.map

/***/ }),

/***/ 8602:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const retry = __nccwpck_require__(3945);

const networkErrorMsgs = [
	'Failed to fetch', // Chrome
	'NetworkError when attempting to fetch resource.', // Firefox
	'The Internet connection appears to be offline.', // Safari
	'Network request failed' // `cross-fetch`
];

class AbortError extends Error {
	constructor(message) {
		super();

		if (message instanceof Error) {
			this.originalError = message;
			({message} = message);
		} else {
			this.originalError = new Error(message);
			this.originalError.stack = this.stack;
		}

		this.name = 'AbortError';
		this.message = message;
	}
}

const decorateErrorWithCounts = (error, attemptNumber, options) => {
	// Minus 1 from attemptNumber because the first attempt does not count as a retry
	const retriesLeft = options.retries - (attemptNumber - 1);

	error.attemptNumber = attemptNumber;
	error.retriesLeft = retriesLeft;
	return error;
};

const isNetworkError = errorMessage => networkErrorMsgs.includes(errorMessage);

const pRetry = (input, options) => new Promise((resolve, reject) => {
	options = {
		onFailedAttempt: () => {},
		retries: 10,
		...options
	};

	const operation = retry.operation(options);

	operation.attempt(async attemptNumber => {
		try {
			resolve(await input(attemptNumber));
		} catch (error) {
			if (!(error instanceof Error)) {
				reject(new TypeError(`Non-error was thrown: "${error}". You should only throw errors.`));
				return;
			}

			if (error instanceof AbortError) {
				operation.stop();
				reject(error.originalError);
			} else if (error instanceof TypeError && !isNetworkError(error.message)) {
				operation.stop();
				reject(error);
			} else {
				decorateErrorWithCounts(error, attemptNumber, options);

				try {
					await options.onFailedAttempt(error);
				} catch (error) {
					reject(error);
					return;
				}

				if (!operation.retry(error)) {
					reject(operation.mainError());
				}
			}
		}
	});
});

module.exports = pRetry;
// TODO: remove this in the next major version
module.exports["default"] = pRetry;

module.exports.AbortError = AbortError;


/***/ }),

/***/ 3945:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports = __nccwpck_require__(7159);

/***/ }),

/***/ 7159:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

var RetryOperation = __nccwpck_require__(7297);

exports.operation = function(options) {
  var timeouts = exports.timeouts(options);
  return new RetryOperation(timeouts, {
      forever: options && (options.forever || options.retries === Infinity),
      unref: options && options.unref,
      maxRetryTime: options && options.maxRetryTime
  });
};

exports.timeouts = function(options) {
  if (options instanceof Array) {
    return [].concat(options);
  }

  var opts = {
    retries: 10,
    factor: 2,
    minTimeout: 1 * 1000,
    maxTimeout: Infinity,
    randomize: false
  };
  for (var key in options) {
    opts[key] = options[key];
  }

  if (opts.minTimeout > opts.maxTimeout) {
    throw new Error('minTimeout is greater than maxTimeout');
  }

  var timeouts = [];
  for (var i = 0; i < opts.retries; i++) {
    timeouts.push(this.createTimeout(i, opts));
  }

  if (options && options.forever && !timeouts.length) {
    timeouts.push(this.createTimeout(i, opts));
  }

  // sort the array numerically ascending
  timeouts.sort(function(a,b) {
    return a - b;
  });

  return timeouts;
};

exports.createTimeout = function(attempt, opts) {
  var random = (opts.randomize)
    ? (Math.random() + 1)
    : 1;

  var timeout = Math.round(random * Math.max(opts.minTimeout, 1) * Math.pow(opts.factor, attempt));
  timeout = Math.min(timeout, opts.maxTimeout);

  return timeout;
};

exports.wrap = function(obj, options, methods) {
  if (options instanceof Array) {
    methods = options;
    options = null;
  }

  if (!methods) {
    methods = [];
    for (var key in obj) {
      if (typeof obj[key] === 'function') {
        methods.push(key);
      }
    }
  }

  for (var i = 0; i < methods.length; i++) {
    var method   = methods[i];
    var original = obj[method];

    obj[method] = function retryWrapper(original) {
      var op       = exports.operation(options);
      var args     = Array.prototype.slice.call(arguments, 1);
      var callback = args.pop();

      args.push(function(err) {
        if (op.retry(err)) {
          return;
        }
        if (err) {
          arguments[0] = op.mainError();
        }
        callback.apply(this, arguments);
      });

      op.attempt(function() {
        original.apply(obj, args);
      });
    }.bind(obj, original);
    obj[method].options = options;
  }
};


/***/ }),

/***/ 7297:
/***/ ((module) => {

function RetryOperation(timeouts, options) {
  // Compatibility for the old (timeouts, retryForever) signature
  if (typeof options === 'boolean') {
    options = { forever: options };
  }

  this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
  this._timeouts = timeouts;
  this._options = options || {};
  this._maxRetryTime = options && options.maxRetryTime || Infinity;
  this._fn = null;
  this._errors = [];
  this._attempts = 1;
  this._operationTimeout = null;
  this._operationTimeoutCb = null;
  this._timeout = null;
  this._operationStart = null;
  this._timer = null;

  if (this._options.forever) {
    this._cachedTimeouts = this._timeouts.slice(0);
  }
}
module.exports = RetryOperation;

RetryOperation.prototype.reset = function() {
  this._attempts = 1;
  this._timeouts = this._originalTimeouts.slice(0);
}

RetryOperation.prototype.stop = function() {
  if (this._timeout) {
    clearTimeout(this._timeout);
  }
  if (this._timer) {
    clearTimeout(this._timer);
  }

  this._timeouts       = [];
  this._cachedTimeouts = null;
};

RetryOperation.prototype.retry = function(err) {
  if (this._timeout) {
    clearTimeout(this._timeout);
  }

  if (!err) {
    return false;
  }
  var currentTime = new Date().getTime();
  if (err && currentTime - this._operationStart >= this._maxRetryTime) {
    this._errors.push(err);
    this._errors.unshift(new Error('RetryOperation timeout occurred'));
    return false;
  }

  this._errors.push(err);

  var timeout = this._timeouts.shift();
  if (timeout === undefined) {
    if (this._cachedTimeouts) {
      // retry forever, only keep last error
      this._errors.splice(0, this._errors.length - 1);
      timeout = this._cachedTimeouts.slice(-1);
    } else {
      return false;
    }
  }

  var self = this;
  this._timer = setTimeout(function() {
    self._attempts++;

    if (self._operationTimeoutCb) {
      self._timeout = setTimeout(function() {
        self._operationTimeoutCb(self._attempts);
      }, self._operationTimeout);

      if (self._options.unref) {
          self._timeout.unref();
      }
    }

    self._fn(self._attempts);
  }, timeout);

  if (this._options.unref) {
      this._timer.unref();
  }

  return true;
};

RetryOperation.prototype.attempt = function(fn, timeoutOps) {
  this._fn = fn;

  if (timeoutOps) {
    if (timeoutOps.timeout) {
      this._operationTimeout = timeoutOps.timeout;
    }
    if (timeoutOps.cb) {
      this._operationTimeoutCb = timeoutOps.cb;
    }
  }

  var self = this;
  if (this._operationTimeoutCb) {
    this._timeout = setTimeout(function() {
      self._operationTimeoutCb();
    }, self._operationTimeout);
  }

  this._operationStart = new Date().getTime();

  this._fn(this._attempts);
};

RetryOperation.prototype.try = function(fn) {
  console.log('Using RetryOperation.try() is deprecated');
  this.attempt(fn);
};

RetryOperation.prototype.start = function(fn) {
  console.log('Using RetryOperation.start() is deprecated');
  this.attempt(fn);
};

RetryOperation.prototype.start = RetryOperation.prototype.try;

RetryOperation.prototype.errors = function() {
  return this._errors;
};

RetryOperation.prototype.attempts = function() {
  return this._attempts;
};

RetryOperation.prototype.mainError = function() {
  if (this._errors.length === 0) {
    return null;
  }

  var counts = {};
  var mainError = null;
  var mainErrorCount = 0;

  for (var i = 0; i < this._errors.length; i++) {
    var error = this._errors[i];
    var message = error.message;
    var count = (counts[message] || 0) + 1;

    counts[message] = count;

    if (count >= mainErrorCount) {
      mainError = error;
      mainErrorCount = count;
    }
  }

  return mainError;
};


/***/ }),

/***/ 2613:
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ 5317:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 6982:
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ 4434:
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ 9896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 8611:
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ 5692:
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ 9278:
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ 4589:
/***/ ((module) => {

"use strict";
module.exports = require("node:assert");

/***/ }),

/***/ 6698:
/***/ ((module) => {

"use strict";
module.exports = require("node:async_hooks");

/***/ }),

/***/ 4573:
/***/ ((module) => {

"use strict";
module.exports = require("node:buffer");

/***/ }),

/***/ 7540:
/***/ ((module) => {

"use strict";
module.exports = require("node:console");

/***/ }),

/***/ 7598:
/***/ ((module) => {

"use strict";
module.exports = require("node:crypto");

/***/ }),

/***/ 3053:
/***/ ((module) => {

"use strict";
module.exports = require("node:diagnostics_channel");

/***/ }),

/***/ 610:
/***/ ((module) => {

"use strict";
module.exports = require("node:dns");

/***/ }),

/***/ 8474:
/***/ ((module) => {

"use strict";
module.exports = require("node:events");

/***/ }),

/***/ 7067:
/***/ ((module) => {

"use strict";
module.exports = require("node:http");

/***/ }),

/***/ 2467:
/***/ ((module) => {

"use strict";
module.exports = require("node:http2");

/***/ }),

/***/ 7030:
/***/ ((module) => {

"use strict";
module.exports = require("node:net");

/***/ }),

/***/ 8161:
/***/ ((module) => {

"use strict";
module.exports = require("node:os");

/***/ }),

/***/ 643:
/***/ ((module) => {

"use strict";
module.exports = require("node:perf_hooks");

/***/ }),

/***/ 1792:
/***/ ((module) => {

"use strict";
module.exports = require("node:querystring");

/***/ }),

/***/ 7075:
/***/ ((module) => {

"use strict";
module.exports = require("node:stream");

/***/ }),

/***/ 1692:
/***/ ((module) => {

"use strict";
module.exports = require("node:tls");

/***/ }),

/***/ 3136:
/***/ ((module) => {

"use strict";
module.exports = require("node:url");

/***/ }),

/***/ 7975:
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ }),

/***/ 3429:
/***/ ((module) => {

"use strict";
module.exports = require("node:util/types");

/***/ }),

/***/ 5919:
/***/ ((module) => {

"use strict";
module.exports = require("node:worker_threads");

/***/ }),

/***/ 8522:
/***/ ((module) => {

"use strict";
module.exports = require("node:zlib");

/***/ }),

/***/ 857:
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ 6928:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 3193:
/***/ ((module) => {

"use strict";
module.exports = require("string_decoder");

/***/ }),

/***/ 3557:
/***/ ((module) => {

"use strict";
module.exports = require("timers");

/***/ }),

/***/ 4756:
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ 9023:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ 1612:
/***/ ((module) => {

"use strict";
module.exports = /*#__PURE__*/JSON.parse('{"name":"@slack/webhook","version":"8.0.2","description":"Official library for using the Slack Platform\'s Incoming Webhooks","author":"Slack Technologies, LLC","license":"MIT","keywords":["slack","request","client","http","api","proxy"],"main":"dist/index.js","types":"./dist/index.d.ts","files":["dist/**/*"],"engines":{"node":">= 20","npm":">=9.6.4"},"repository":{"type":"git","url":"git+https://github.com/slackapi/node-slack-sdk.git"},"homepage":"https://docs.slack.dev/tools/node-slack-sdk/webhook/","publishConfig":{"access":"public"},"bugs":{"url":"https://github.com/slackapi/node-slack-sdk/issues"},"scripts":{"build":"npm run build:clean && tsc","build:clean":"shx rm -rf ./dist","docs":"npx typedoc --plugin typedoc-plugin-markdown","prepack":"npm run build","test":"npm run build && node --test-reporter=spec --test-reporter-destination=stdout --test-reporter=junit --test-reporter-destination=test-results.xml --import tsx --test src/IncomingWebhook.test.ts src/WebhookTrigger.test.ts src/instrument.test.ts src/retry-policies.test.ts","test:coverage":"npm run build && node --experimental-test-coverage --test-reporter=spec --test-reporter-destination=stdout --test-reporter=lcov --test-reporter-destination=lcov.info --test-reporter=junit --test-reporter-destination=test-results.xml --import tsx --test src/IncomingWebhook.test.ts src/WebhookTrigger.test.ts src/instrument.test.ts src/retry-policies.test.ts"},"dependencies":{"@slack/types":"^3.1.0","@types/node":">=20","@types/retry":"0.12.5","p-retry":"^4.6.2","retry":"^0.13.1"},"devDependencies":{"nock":"^14.0.17"}}');

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__nccwpck_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__nccwpck_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__nccwpck_require__.r(ns);
/******/ 			var def = {};
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; typeof current == 'object' && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 			}
/******/ 			def['default'] = () => (value);
/******/ 			__nccwpck_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__nccwpck_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__nccwpck_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__nccwpck_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__nccwpck_require__.f).reduce((promises, key) => {
/******/ 				__nccwpck_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__nccwpck_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".index.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__nccwpck_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/******/ 	/* webpack/runtime/require chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "loaded", otherwise not loaded yet
/******/ 		var installedChunks = {
/******/ 			792: 1
/******/ 		};
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		var installChunk = (chunk) => {
/******/ 			var moreModules = chunk.modules, chunkIds = chunk.ids, runtime = chunk.runtime;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__nccwpck_require__.o(moreModules, moduleId)) {
/******/ 					__nccwpck_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__nccwpck_require__);
/******/ 			for(var i = 0; i < chunkIds.length; i++)
/******/ 				installedChunks[chunkIds[i]] = 1;
/******/ 		
/******/ 		};
/******/ 		
/******/ 		// require() chunk loading for javascript
/******/ 		__nccwpck_require__.f.require = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					installChunk(require("./" + __nccwpck_require__.u(chunkId)));
/******/ 				} else installedChunks[chunkId] = 1;
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		// no external install chunk
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(8572);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;