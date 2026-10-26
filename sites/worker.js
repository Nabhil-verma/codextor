var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/react/cjs/react.production.min.js
var require_react_production_min = __commonJS({
  "node_modules/react/cjs/react.production.min.js"(exports) {
    "use strict";
    var l = Symbol.for("react.element");
    var n = Symbol.for("react.portal");
    var p = Symbol.for("react.fragment");
    var q = Symbol.for("react.strict_mode");
    var r = Symbol.for("react.profiler");
    var t = Symbol.for("react.provider");
    var u = Symbol.for("react.context");
    var v = Symbol.for("react.forward_ref");
    var w = Symbol.for("react.suspense");
    var x = Symbol.for("react.memo");
    var y = Symbol.for("react.lazy");
    var z = Symbol.iterator;
    function A(a) {
      if (null === a || "object" !== typeof a) return null;
      a = z && a[z] || a["@@iterator"];
      return "function" === typeof a ? a : null;
    }
    var B = { isMounted: function() {
      return false;
    }, enqueueForceUpdate: function() {
    }, enqueueReplaceState: function() {
    }, enqueueSetState: function() {
    } };
    var C = Object.assign;
    var D = {};
    function E(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    E.prototype.isReactComponent = {};
    E.prototype.setState = function(a, b) {
      if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, a, b, "setState");
    };
    E.prototype.forceUpdate = function(a) {
      this.updater.enqueueForceUpdate(this, a, "forceUpdate");
    };
    function F() {
    }
    F.prototype = E.prototype;
    function G(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    var H = G.prototype = new F();
    H.constructor = G;
    C(H, E.prototype);
    H.isPureReactComponent = true;
    var I = Array.isArray;
    var J = Object.prototype.hasOwnProperty;
    var K = { current: null };
    var L = { key: true, ref: true, __self: true, __source: true };
    function M(a, b, e) {
      var d, c = {}, k = null, h = null;
      if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
      var g = arguments.length - 2;
      if (1 === g) c.children = e;
      else if (1 < g) {
        for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
        c.children = f;
      }
      if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
      return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
    }
    function N(a, b) {
      return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
    }
    function O(a) {
      return "object" === typeof a && null !== a && a.$$typeof === l;
    }
    function escape(a) {
      var b = { "=": "=0", ":": "=2" };
      return "$" + a.replace(/[=:]/g, function(a2) {
        return b[a2];
      });
    }
    var P = /\/+/g;
    function Q(a, b) {
      return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
    }
    function R(a, b, e, d, c) {
      var k = typeof a;
      if ("undefined" === k || "boolean" === k) a = null;
      var h = false;
      if (null === a) h = true;
      else switch (k) {
        case "string":
        case "number":
          h = true;
          break;
        case "object":
          switch (a.$$typeof) {
            case l:
            case n:
              h = true;
          }
      }
      if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
        return a2;
      })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
      h = 0;
      d = "" === d ? "." : d + ":";
      if (I(a)) for (var g = 0; g < a.length; g++) {
        k = a[g];
        var f = d + Q(k, g);
        h += R(k, b, e, f, c);
      }
      else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
      else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
      return h;
    }
    function S(a, b, e) {
      if (null == a) return a;
      var d = [], c = 0;
      R(a, d, "", "", function(a2) {
        return b.call(e, a2, c++);
      });
      return d;
    }
    function T(a) {
      if (-1 === a._status) {
        var b = a._result;
        b = b();
        b.then(function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
        }, function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
        });
        -1 === a._status && (a._status = 0, a._result = b);
      }
      if (1 === a._status) return a._result.default;
      throw a._result;
    }
    var U = { current: null };
    var V = { transition: null };
    var W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
    function X() {
      throw Error("act(...) is not supported in production builds of React.");
    }
    exports.Children = { map: S, forEach: function(a, b, e) {
      S(a, function() {
        b.apply(this, arguments);
      }, e);
    }, count: function(a) {
      var b = 0;
      S(a, function() {
        b++;
      });
      return b;
    }, toArray: function(a) {
      return S(a, function(a2) {
        return a2;
      }) || [];
    }, only: function(a) {
      if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
      return a;
    } };
    exports.Component = E;
    exports.Fragment = p;
    exports.Profiler = r;
    exports.PureComponent = G;
    exports.StrictMode = q;
    exports.Suspense = w;
    exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
    exports.act = X;
    exports.cloneElement = function(a, b, e) {
      if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
      var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
      if (null != b) {
        void 0 !== b.ref && (k = b.ref, h = K.current);
        void 0 !== b.key && (c = "" + b.key);
        if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
        for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
      }
      var f = arguments.length - 2;
      if (1 === f) d.children = e;
      else if (1 < f) {
        g = Array(f);
        for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
        d.children = g;
      }
      return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
    };
    exports.createContext = function(a) {
      a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
      a.Provider = { $$typeof: t, _context: a };
      return a.Consumer = a;
    };
    exports.createElement = M;
    exports.createFactory = function(a) {
      var b = M.bind(null, a);
      b.type = a;
      return b;
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(a) {
      return { $$typeof: v, render: a };
    };
    exports.isValidElement = O;
    exports.lazy = function(a) {
      return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
    };
    exports.memo = function(a, b) {
      return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
    };
    exports.startTransition = function(a) {
      var b = V.transition;
      V.transition = {};
      try {
        a();
      } finally {
        V.transition = b;
      }
    };
    exports.unstable_act = X;
    exports.useCallback = function(a, b) {
      return U.current.useCallback(a, b);
    };
    exports.useContext = function(a) {
      return U.current.useContext(a);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(a) {
      return U.current.useDeferredValue(a);
    };
    exports.useEffect = function(a, b) {
      return U.current.useEffect(a, b);
    };
    exports.useId = function() {
      return U.current.useId();
    };
    exports.useImperativeHandle = function(a, b, e) {
      return U.current.useImperativeHandle(a, b, e);
    };
    exports.useInsertionEffect = function(a, b) {
      return U.current.useInsertionEffect(a, b);
    };
    exports.useLayoutEffect = function(a, b) {
      return U.current.useLayoutEffect(a, b);
    };
    exports.useMemo = function(a, b) {
      return U.current.useMemo(a, b);
    };
    exports.useReducer = function(a, b, e) {
      return U.current.useReducer(a, b, e);
    };
    exports.useRef = function(a) {
      return U.current.useRef(a);
    };
    exports.useState = function(a) {
      return U.current.useState(a);
    };
    exports.useSyncExternalStore = function(a, b, e) {
      return U.current.useSyncExternalStore(a, b, e);
    };
    exports.useTransition = function() {
      return U.current.useTransition();
    };
    exports.version = "18.3.1";
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    if (true) {
      module.exports = require_react_production_min();
    } else {
      module.exports = null;
    }
  }
});

// node_modules/jose/dist/webapi/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var strictDecoder = new TextDecoder("utf-8", { fatal: true });
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0), buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers)
    buf.set(buffer, i), i += buffer.length;
  return buf;
}
var NON_ASCII = /[^\x00-\x7f]/;
function encode(string) {
  if (typeof string == "string" && string.length >= 128) {
    if (NON_ASCII.test(string))
      throw new TypeError("non-ASCII string encountered in encode()");
    return encoder.encode(string);
  }
  const bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code > 127)
      throw new TypeError("non-ASCII string encountered in encode()");
    bytes[i] = code;
  }
  return bytes;
}
function decodeBase64(encoded, url = false) {
  if (Uint8Array.fromBase64)
    return Uint8Array.fromBase64(encoded, { alphabet: url ? "base64url" : "base64" });
  if (url) {
    if (encoded.includes("+") || encoded.includes("/"))
      throw new TypeError("Invalid base64url");
    encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  }
  const binary = atob(encoded), bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// node_modules/jose/dist/webapi/util/errors.js
var errors_exports = {};
__export(errors_exports, {
  JOSEAlgNotAllowed: () => JOSEAlgNotAllowed,
  JOSEError: () => JOSEError,
  JOSENotSupported: () => JOSENotSupported,
  JWEDecryptionFailed: () => JWEDecryptionFailed,
  JWEInvalid: () => JWEInvalid,
  JWKInvalid: () => JWKInvalid,
  JWKSInvalid: () => JWKSInvalid,
  JWKSMultipleMatchingKeys: () => JWKSMultipleMatchingKeys,
  JWKSNoMatchingKey: () => JWKSNoMatchingKey,
  JWKSTimeout: () => JWKSTimeout,
  JWSInvalid: () => JWSInvalid,
  JWSSignatureVerificationFailed: () => JWSSignatureVerificationFailed,
  JWTClaimValidationFailed: () => JWTClaimValidationFailed,
  JWTExpired: () => JWTExpired,
  JWTInvalid: () => JWTInvalid
});
var JOSEError = class extends Error {
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(message2, options) {
    super(message2, options), this.name = this.constructor.name, Error.captureStackTrace?.(this, this.constructor);
  }
};
var JWTClaimValidationFailed = class extends JOSEError {
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } }), this.claim = claim, this.reason = reason, this.payload = payload;
  }
};
var JWTExpired = class extends JOSEError {
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } }), this.claim = claim, this.reason = reason, this.payload = payload;
  }
};
var JOSEAlgNotAllowed = class extends JOSEError {
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
};
var JOSENotSupported = class extends JOSEError {
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
};
var JWEDecryptionFailed = class extends JOSEError {
  static code = "ERR_JWE_DECRYPTION_FAILED";
  code = "ERR_JWE_DECRYPTION_FAILED";
  constructor(message2 = "decryption operation failed", options) {
    super(message2, options);
  }
};
var JWEInvalid = class extends JOSEError {
  static code = "ERR_JWE_INVALID";
  code = "ERR_JWE_INVALID";
};
var JWSInvalid = class extends JOSEError {
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
};
var JWTInvalid = class extends JOSEError {
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
};
var JWKInvalid = class extends JOSEError {
  static code = "ERR_JWK_INVALID";
  code = "ERR_JWK_INVALID";
};
var JWKSInvalid = class extends JOSEError {
  static code = "ERR_JWKS_INVALID";
  code = "ERR_JWKS_INVALID";
};
var JWKSNoMatchingKey = class extends JOSEError {
  static code = "ERR_JWKS_NO_MATCHING_KEY";
  code = "ERR_JWKS_NO_MATCHING_KEY";
  constructor(message2 = "no applicable key found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSMultipleMatchingKeys = class extends JOSEError {
  [Symbol.asyncIterator] = async function* () {
  };
  static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  constructor(message2 = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSTimeout = class extends JOSEError {
  static code = "ERR_JWKS_TIMEOUT";
  code = "ERR_JWKS_TIMEOUT";
  constructor(message2 = "request timed out", options) {
    super(message2, options);
  }
};
var JWSSignatureVerificationFailed = class extends JOSEError {
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
  }
};

// node_modules/jose/dist/webapi/util/base64url.js
var invalid = "The input to be decoded is not correctly encoded.";
function decode(input) {
  try {
    return decodeBase64(typeof input == "string" ? input : decoder.decode(input), true);
  } catch (cause) {
    throw new TypeError(invalid, { cause });
  }
}

// node_modules/jose/dist/webapi/lib/validate.js
function isObject(input) {
  if (typeof input != "object" || input === null || Object.prototype.toString.call(input) !== "[object Object]")
    return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}
function isJwkSet(input) {
  return isObject(input) && Array.isArray(input.keys) && Array.from(input.keys).every(isObject);
}
function isDisjoint(...headers) {
  const parameters = /* @__PURE__ */ new Set();
  for (const header of headers)
    if (header)
      for (const parameter of Object.keys(header)) {
        if (parameters.has(parameter))
          return false;
        parameters.add(parameter);
      }
  return true;
}
function decodeBase64url(value, label, ErrorClass) {
  try {
    return decode(value);
  } catch {
    throw new ErrorClass(`Failed to base64url decode the ${label}`);
  }
}
function encodeBase64url(value, label, ErrorClass) {
  try {
    return encode(value);
  } catch {
    throw new ErrorClass(`The ${label} is not a valid base64url string`);
  }
}
function parseJoseHeader(b64, ErrorClass, message2) {
  let parsed;
  try {
    parsed = JSON.parse(strictDecoder.decode(decode(b64)));
  } catch {
    throw new ErrorClass(message2);
  }
  if (!isObject(parsed))
    throw new ErrorClass(message2);
  return parsed;
}
var JWS_RECOGNIZED = { __proto__: null, b64: true };
function validateAlgorithms(option, algorithms) {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s != "string")))
    throw new TypeError(`"${option}" option must be an array of strings`);
  return algorithms === void 0 ? void 0 : new Set(algorithms);
}
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0)
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  if (!protectedHeader || protectedHeader.crit === void 0)
    return [];
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input != "string" || input.length === 0))
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  const recognized = recognizedOption === void 0 ? recognizedDefault : { __proto__: null, ...recognizedOption, ...recognizedDefault };
  for (const parameter of protectedHeader.crit) {
    if (!(parameter in recognized))
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    if (!Object.hasOwn(joseHeader, parameter) || joseHeader[parameter] === void 0)
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    if (recognized[parameter] && (!Object.hasOwn(protectedHeader, parameter) || protectedHeader[parameter] === void 0))
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
  }
  return protectedHeader.crit;
}
function validateB64(protectedHeader, extensions) {
  if (extensions.includes("b64")) {
    const b64 = protectedHeader.b64;
    if (typeof b64 != "boolean")
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    return b64;
  }
  return true;
}

// node_modules/jose/dist/webapi/lib/key.js
var tag = (key) => key[Symbol.toStringTag];
var jwkMatchesOp = (entry, key, usage) => {
  const { alg } = entry;
  if (key.use !== void 0) {
    const expected = usage === "sign" || usage === "verify" ? "sig" : "enc";
    if (key.use !== expected)
      throw new TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
  }
  if (key.alg !== void 0 && key.alg !== alg)
    throw new TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
  if (Array.isArray(key.key_ops)) {
    const expectedKeyOp = usage === "encrypt" || usage === "decrypt" ? entry.ops?.[usage === "encrypt" ? 0 : 1] : usage;
    if (expectedKeyOp && !key.key_ops.includes(expectedKeyOp))
      throw new TypeError(`Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`);
  }
};
async function prepareKey(entry, key, usage) {
  const { alg, secret } = entry, privateKey = usage === "decrypt" || usage === "sign";
  if (secret && key instanceof Uint8Array)
    return key;
  let normalized, keyObject;
  if (isObject(key)) {
    if (normalized = normalizeJwk(key), typeof normalized.kty != "string")
      throw invalidKeyType(alg, key, secret);
    if (!(secret ? normalized.kty === "oct" && typeof normalized.k == "string" : normalized.kty !== "oct" && (privateKey ? normalized.kty === "AKP" && typeof normalized.priv == "string" || typeof normalized.d == "string" : normalized.d === void 0 && normalized.priv === void 0)))
      throw new TypeError(secret ? 'JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present' : `JSON Web Key for this operation must be a ${privateKey ? "private" : "public"} JWK`);
    if (jwkMatchesOp(entry, normalized, usage), normalized.kty === "oct")
      return decode(normalized.k);
    if (!Object.isFrozen(key)) {
      const { key_ops } = key;
      Array.isArray(key_ops) && Object.freeze(key_ops), Object.freeze(key);
    }
  } else {
    if (!isKeyLike(key))
      throw invalidKeyType(alg, key, secret);
    const expectedType = secret ? "secret" : privateKey ? "private" : "public";
    if (key.type !== expectedType && (secret || ["secret", "public", "private"].includes(key.type)))
      throw new TypeError(`${tag(key)} instances must be of type "${expectedType}" for the ${alg} algorithm`);
    if (isCryptoKey(key))
      return key;
    if (keyObject = key, keyObject.type === "secret")
      return keyObject.export();
  }
  cache ||= /* @__PURE__ */ new WeakMap();
  const cacheKey = key;
  let cached = cache.get(cacheKey);
  if (cached?.[alg])
    return cached[alg];
  if (cached || cache.set(cacheKey, cached = {}), keyObject && typeof keyObject.toCryptoKey == "function") {
    const isPublic = keyObject.type === "public", crv = nist[keyObject.asymmetricKeyDetails?.namedCurve], params = entry.resolve?.({ crv, asymmetricKeyType: keyObject.asymmetricKeyType }) ?? entry.subtle;
    return cached[alg] = keyObject.toCryptoKey(params, isPublic, entry.usages[isPublic ? 0 : 1]);
  }
  return normalized ??= keyObject.export({ format: "jwk" }), normalized.alg = alg, cached[alg] = await jwkToKey(entry, normalized);
}
var cache;
var nist = {
  __proto__: null,
  prime256v1: "P-256",
  secp384r1: "P-384",
  secp521r1: "P-521"
};
var isCryptoKey = (key) => {
  if (key?.[Symbol.toStringTag] === "CryptoKey")
    return true;
  try {
    return key instanceof CryptoKey;
  } catch {
    return false;
  }
};
var isKeyObject = (key) => key?.[Symbol.toStringTag] === "KeyObject";
var isKeyLike = (key) => isCryptoKey(key) || isKeyObject(key);
function message(msg, actual, ...types) {
  if (types.length > 2) {
    const last = types.pop();
    msg += `one of type ${types.join(", ")}, or ${last}.`;
  } else types.length === 2 ? msg += `one of type ${types[0]} or ${types[1]}.` : msg += `of type ${types[0]}.`;
  return actual == null ? msg += ` Received ${actual}` : typeof actual == "function" && actual.name ? msg += ` Received function ${actual.name}` : typeof actual == "object" && actual != null && actual.constructor?.name && (msg += ` Received an instance of ${actual.constructor.name}`), msg;
}
function invalidKeyType(alg, actual, secret) {
  const types = ["CryptoKey", "KeyObject", "JSON Web Key"];
  return secret && types.push("Uint8Array"), new TypeError(message(`Key for the ${alg} algorithm must be `, actual, ...types));
}
var unusable = (name, prop = "algorithm.name") => new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
function checkUsage(key, usage) {
  if (usage && !key.usages.includes(usage))
    throw new TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
}
function checkModulusLength(alg, key) {
  const { modulusLength } = key.algorithm;
  if (typeof modulusLength != "number" || modulusLength < 2048)
    throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
}
function checkCryptoKey(key, expected, usage) {
  const algorithm = key.algorithm;
  if (algorithm.name !== expected.name)
    throw unusable(expected.name);
  if (expected.hash && algorithm.hash?.name !== expected.hash)
    throw unusable(expected.hash, "algorithm.hash");
  if (expected.namedCurve && algorithm.namedCurve !== expected.namedCurve)
    throw unusable(expected.namedCurve, "algorithm.namedCurve");
  if (expected.length !== void 0 && algorithm.length !== expected.length)
    throw unusable(expected.length, "algorithm.length");
  checkUsage(key, usage);
}
function snapshotJwk(jwk) {
  return { __proto__: null, ...jwk };
}
function normalizeJwk(jwk) {
  const normalized = snapshotJwk(jwk);
  if (normalized.ext !== void 0 && typeof normalized.ext != "boolean")
    throw new TypeError('"ext" (Extractable) Parameter must be a boolean');
  if (normalized.key_ops !== void 0) {
    const value = normalized.key_ops, keyOps = Array.isArray(value) ? [...value] : void 0;
    if (!keyOps || keyOps.some((operation) => typeof operation != "string") || new Set(keyOps).size !== keyOps.length)
      throw new TypeError('"key_ops" (Key Operations) Parameter must be an array of unique strings');
    normalized.key_ops = keyOps;
  }
  return normalized;
}
async function jwkToKey(entry, jwk, extractable) {
  if (!entry.kty.includes(jwk.kty))
    throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
  const algorithm = entry.resolve?.({ kty: jwk.kty, crv: jwk.crv }) ?? entry.subtle, isPrivate = !!(jwk.d || jwk.priv), keyData = { ...jwk, ext: extractable ?? jwk.ext };
  return keyData.kty !== "AKP" && delete keyData.alg, delete keyData.use, crypto.subtle.importKey("jwk", keyData, algorithm, keyData.ext ?? !isPrivate, jwk.key_ops ?? entry.usages[isPrivate ? 1 : 0]);
}
async function rawKey(key, expected, usage, extractable = false) {
  return key instanceof Uint8Array && (key = await crypto.subtle.importKey("raw", key, expected, extractable, [usage])), checkCryptoKey(key, expected, usage), key;
}

// node_modules/jose/dist/webapi/lib/key_descriptor.js
function table(entries) {
  const out = { __proto__: null };
  for (const alg in entries)
    out[alg] = { ...entries[alg], alg };
  return out;
}

// node_modules/jose/dist/webapi/lib/jws_algorithms.js
var sig = [["verify"], ["sign"]];
function hmac(bits) {
  const subtle = { name: "HMAC", hash: `SHA-${bits}` };
  return { kty: ["oct"], secret: true, subtle, signing: subtle, usages: sig };
}
function rsa(bits, saltLength) {
  const subtle = { name: saltLength ? "RSA-PSS" : "RSASSA-PKCS1-v1_5", hash: `SHA-${bits}` };
  return {
    kty: ["RSA"],
    subtle,
    signing: saltLength ? { ...subtle, saltLength } : subtle,
    usages: sig,
    minRsaBits: 2048
  };
}
function ecdsa(crv, bits) {
  return {
    kty: ["EC"],
    crv,
    subtle: { name: "ECDSA", namedCurve: crv },
    signing: { name: "ECDSA", hash: `SHA-${bits}` },
    usages: sig
  };
}
function eddsa() {
  const subtle = { name: "Ed25519" };
  return {
    kty: ["OKP"],
    crv: "Ed25519",
    subtle,
    signing: subtle,
    usages: sig
  };
}
function mldsa(bits) {
  const subtle = { name: `ML-DSA-${bits}` };
  return {
    kty: ["AKP"],
    subtle,
    signing: subtle,
    usages: sig
  };
}
var JWS = table({
  HS256: hmac(256),
  HS384: hmac(384),
  HS512: hmac(512),
  RS256: rsa(256),
  RS384: rsa(384),
  RS512: rsa(512),
  PS256: rsa(256, 32),
  PS384: rsa(384, 48),
  PS512: rsa(512, 64),
  ES256: ecdsa("P-256", 256),
  ES384: ecdsa("P-384", 384),
  ES512: ecdsa("P-521", 512),
  EdDSA: eddsa(),
  Ed25519: eddsa(),
  "ML-DSA-44": mldsa(44),
  "ML-DSA-65": mldsa(65),
  "ML-DSA-87": mldsa(87)
});
function jwsAlgorithm(alg) {
  const entry = typeof alg == "string" ? JWS[alg] : void 0;
  if (!entry)
    throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  return entry;
}

// node_modules/jose/dist/webapi/lib/jws_verify.js
function prepareVerify(options) {
  return [options && validateAlgorithms("algorithms", options.algorithms), options?.crit];
}
function parseProtectedHeader(encodedProtected) {
  return encodedProtected === void 0 ? {} : parseJoseHeader(encodedProtected, JWSInvalid, "JWS Protected Header is invalid");
}
function encodeCompactUnencodedPayload(payload) {
  try {
    return encode(payload);
  } catch {
    throw new JWSInvalid("JWS Compact Serialization payload must use only ASCII characters");
  }
}
async function verifySignature(jws, shared, key, encodeUnencodedPayload, parsedProtected) {
  const { protected: encodedProtected, header, payload: inputPayload } = jws, parsedProt = parsedProtected ?? parseProtectedHeader(encodedProtected);
  if (!isDisjoint(parsedProt, header))
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  const joseHeader = { ...parsedProt, ...header }, b64 = validateB64(parsedProt, validateCrit(JWSInvalid, JWS_RECOGNIZED, shared[1], parsedProt, joseHeader)), { alg } = joseHeader;
  if (typeof alg != "string" || !alg)
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  if (shared[0] && !shared[0].has(alg))
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  if (b64) {
    if (typeof inputPayload != "string")
      throw new JWSInvalid("JWS Payload must be a string");
  } else if (typeof inputPayload != "string" && !(inputPayload instanceof Uint8Array))
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  const signingPayload = b64 || typeof inputPayload != "string" ? inputPayload : encodeUnencodedPayload(inputPayload);
  let resolvedKey = false;
  typeof key == "function" && (key = await key(parsedProt, jws), resolvedKey = true);
  const entry = jwsAlgorithm(alg), data = concat(encodedProtected !== void 0 ? encode(encodedProtected) : new Uint8Array(), encode("."), typeof signingPayload == "string" ? shared[2] ??= encodeBase64url(signingPayload, "payload", JWSInvalid) : signingPayload), signature = decodeBase64url(jws.signature, "signature", JWSInvalid), k = await prepareKey(entry, key, "verify"), cryptoKey = await rawKey(k, entry.subtle, "verify");
  entry.minRsaBits && checkModulusLength(entry.alg, cryptoKey);
  let verified = false;
  try {
    verified = await crypto.subtle.verify(entry.signing, cryptoKey, signature, data);
  } catch {
  }
  if (!verified)
    throw new JWSSignatureVerificationFailed();
  const result = { payload: typeof signingPayload == "string" ? decodeBase64url(signingPayload, "payload", JWSInvalid) : signingPayload };
  return encodedProtected !== void 0 && (result.protectedHeader = parsedProt), header !== void 0 && (result.unprotectedHeader = header), resolvedKey ? [{ ...result, key: k }, b64] : [result, b64];
}
async function verifyCompact(jws, shared, key) {
  if (jws instanceof Uint8Array && (jws = decoder.decode(jws)), typeof jws != "string")
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3)
    throw new JWSInvalid("Invalid Compact JWS");
  return verifySignature({ payload, protected: protectedHeader, signature }, shared, key, encodeCompactUnencodedPayload);
}

// node_modules/jose/dist/webapi/lib/jwt_claims_set.js
var epoch = (date) => Math.floor(date.getTime() / 1e3);
var multipliers = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
  y: 31557600
};
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var checkFailed = "check_failed";
function invalidDuration() {
  throw new TypeError("Invalid time period format");
}
function secs(str) {
  typeof str != "string" && invalidDuration();
  const matched = REGEX.exec(str);
  (!matched || matched[4] && matched[1]) && invalidDuration();
  const value = parseFloat(matched[2]), numericDate2 = Math.round(value * multipliers[matched[3][0].toLowerCase()]);
  return Number.isFinite(numericDate2) || invalidDuration(), matched[1] === "-" || matched[4] === "ago" ? -numericDate2 : numericDate2;
}
function validateInput(label, input) {
  if (!Number.isFinite(input))
    throw new TypeError(`Invalid ${label} input`);
  return input;
}
var normalizeTyp = (value) => {
  const normalized = value.toLowerCase();
  return value.includes("/") ? normalized : `application/${normalized}`;
};
var checkAudiencePresence = (audPayload, audOption) => typeof audPayload == "string" ? audOption.includes(audPayload) : Array.isArray(audPayload) ? audOption.some((aud) => audPayload.includes(aud)) : false;
function validateNumericDate(payload, claim, required = false) {
  const value = payload[claim];
  if (!(value === void 0 && !required)) {
    if (typeof value != "number")
      throw new JWTClaimValidationFailed(`"${claim}" claim must be a number`, payload, claim, "invalid");
    return value;
  }
}
function unexpectedClaim(payload, claim) {
  throw new JWTClaimValidationFailed(`unexpected "${claim}" claim value`, payload, claim, checkFailed);
}
function validateClaimsSet(protectedHeader, encodedPayload, options = {}) {
  let payload;
  try {
    payload = JSON.parse(strictDecoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload))
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  const { typ } = options;
  if (typ !== void 0 && (typeof protectedHeader.typ != "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ)))
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", checkFailed);
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options, presenceCheck = [...requiredClaims];
  maxTokenAge !== void 0 && presenceCheck.push("iat"), audience !== void 0 && presenceCheck.push("aud"), subject !== void 0 && presenceCheck.push("sub"), issuer !== void 0 && presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse()))
    if (!Object.hasOwn(payload, claim))
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
  issuer !== void 0 && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss) && unexpectedClaim(payload, "iss"), subject !== void 0 && payload.sub !== subject && unexpectedClaim(payload, "sub"), audience !== void 0 && !checkAudiencePresence(payload.aud, typeof audience == "string" ? [audience] : audience) && unexpectedClaim(payload, "aud");
  const { clockTolerance } = options;
  let tolerance = 0;
  if (typeof clockTolerance == "string")
    tolerance = secs(clockTolerance);
  else if (clockTolerance !== void 0) {
    if (typeof clockTolerance != "number")
      throw new TypeError("Invalid clockTolerance option type");
    tolerance = clockTolerance;
  }
  validateInput("clockTolerance option", tolerance);
  const { currentDate } = options, now = validateInput("currentDate option", epoch(currentDate === void 0 ? /* @__PURE__ */ new Date() : currentDate)), iat = validateNumericDate(payload, "iat", maxTokenAge !== void 0), nbf = validateNumericDate(payload, "nbf");
  if (nbf !== void 0 && nbf > now + tolerance)
    throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", checkFailed);
  const exp = validateNumericDate(payload, "exp");
  if (exp !== void 0 && exp <= now - tolerance)
    throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", checkFailed);
  if (maxTokenAge !== void 0) {
    const age = now - iat, max = validateInput("maxTokenAge option", typeof maxTokenAge == "number" ? maxTokenAge : secs(maxTokenAge));
    if (age - tolerance > max)
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", checkFailed);
    if (age < -tolerance)
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", checkFailed);
  }
  return payload;
}

// node_modules/jose/dist/webapi/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const [verified, b64] = await verifyCompact(jwt, prepareVerify(options), key);
  if (!b64)
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  const payload = validateClaimsSet(verified.protectedHeader, verified.payload, options);
  return { ...verified, payload };
}

// node_modules/jose/dist/webapi/jwks/local.js
function isUsableJWK(jwk, entry, alg, kid) {
  const { kty, key_ops: keyOps, ext, kid: jwkKid, alg: jwkAlg, use, crv } = jwk;
  return (ext === void 0 || typeof ext == "boolean") && (keyOps === void 0 || Array.isArray(keyOps) && keyOps.every((operation, index) => typeof operation == "string" && keyOps.indexOf(operation) === index) && keyOps.includes("verify")) && entry.kty.includes(kty) && (kid === void 0 || typeof kid == "string" && kid === jwkKid) && (jwkAlg === void 0 ? kty !== "AKP" : alg === jwkAlg) && (use === void 0 || use === "sig") && (!entry.crv || crv === entry.crv);
}
async function importWithAlgCache(cache2, jwk, entry) {
  const cached = cache2.get(jwk) || cache2.set(jwk, {}).get(jwk), { alg } = entry;
  if (cached[alg] === void 0) {
    const pending = jwkToKey(entry, jwk, true).then((key) => {
      if (key.type !== "public")
        throw new JWKSInvalid("JSON Web Key Set members must be public keys");
      return cached[alg] = key, key;
    }).catch((error) => {
      throw cached[alg] === pending && delete cached[alg], error;
    });
    cached[alg] = pending;
  }
  return cached[alg];
}
function createLocalJWKSet(jwks) {
  let snapshot;
  try {
    snapshot = structuredClone(jwks);
  } catch {
  }
  if (!isJwkSet(snapshot))
    throw new JWKSInvalid("JSON Web Key Set malformed");
  const metadata = snapshot.keys.map((jwk) => {
    const normalized = snapshotJwk(jwk);
    return Array.isArray(normalized.key_ops) && (normalized.key_ops = [...normalized.key_ops]), normalized;
  }), cached = /* @__PURE__ */ new WeakMap();
  return Object.defineProperty(async (protectedHeader, token) => {
    const { alg, kid } = { ...protectedHeader, ...token?.header }, entry = typeof alg == "string" ? JWS[alg] : void 0;
    if (!entry || entry.secret)
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
    const candidates = snapshot.keys.filter((_, index) => isUsableJWK(metadata[index], entry, alg, kid)), { 0: jwk, length } = candidates;
    if (!length)
      throw new JWKSNoMatchingKey();
    if (length !== 1) {
      const error = new JWKSMultipleMatchingKeys();
      throw error[Symbol.asyncIterator] = async function* () {
        for (const jwk2 of candidates)
          try {
            yield await importWithAlgCache(cached, jwk2, entry);
          } catch {
          }
      }, error;
    }
    return importWithAlgCache(cached, jwk, entry);
  }, "jwks", {
    value: () => structuredClone(snapshot)
  });
}

// node_modules/jose/dist/webapi/jwks/remote.js
function isCloudflareWorkers() {
  return typeof WebSocketPair < "u" || typeof navigator < "u" && navigator.userAgent === "Cloudflare-Workers" || typeof EdgeRuntime < "u" && EdgeRuntime === "vercel";
}
var USER_AGENT;
(typeof navigator > "u" || !navigator.userAgent?.startsWith?.("Mozilla/5.0 ")) && (USER_AGENT = "jose/v6.2.12");
var customFetch = /* @__PURE__ */ Symbol();
async function fetchJwks(url, headers, signal, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "GET",
    signal,
    redirect: "manual",
    headers
  }).catch((err) => {
    throw err.name === "TimeoutError" ? new JWKSTimeout() : err;
  });
  if (response.status !== 200)
    throw new JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response");
  try {
    return await response.json();
  } catch {
    throw new JOSEError("Failed to parse the JSON Web Key Set HTTP response as JSON");
  }
}
var jwksCache = /* @__PURE__ */ Symbol();
function isFreshFor(timestamp, duration) {
  return Number.isFinite(timestamp) && Date.now() < timestamp + duration;
}
function validateDuration(value, fallback, option) {
  if (Number.isNaN(value))
    throw new TypeError(`"${option}" option must not be NaN`);
  return typeof value == "number" ? value : fallback;
}
function createRemoteJWKSet(url, options) {
  if (!(url instanceof URL))
    throw new TypeError("url must be an instance of URL");
  const href = new URL(url.href).href, opts = options ?? {}, timeoutOption = opts.timeoutDuration;
  if (typeof timeoutOption == "number" && (!Number.isInteger(timeoutOption) || timeoutOption < 0))
    throw new TypeError('"timeoutDuration" option must be a non-negative integer');
  const timeoutDuration = typeof timeoutOption == "number" ? timeoutOption : 5e3, cooldownDuration = validateDuration(opts.cooldownDuration, 3e4, "cooldownDuration"), cacheMaxAge = validateDuration(opts.cacheMaxAge, 6e5, "cacheMaxAge"), headers = new Headers(opts.headers);
  USER_AGENT && !headers.has("User-Agent") && headers.set("User-Agent", USER_AGENT), headers.has("accept") || headers.set("accept", "application/json, application/jwk-set+json");
  const fetchImpl = opts[customFetch], cache2 = opts[jwksCache];
  let jwksTimestamp, pendingFetch, reloadSequence = 0, appliedSequence = 0, local;
  if (cache2 && typeof cache2 == "object") {
    const { uat, jwks } = cache2;
    isFreshFor(uat, cacheMaxAge) && isJwkSet(jwks) && (jwksTimestamp = uat, local = createLocalJWKSet(jwks));
  }
  const reload = async () => {
    if (pendingFetch && isCloudflareWorkers() && (pendingFetch = void 0), !pendingFetch) {
      const sequence = ++reloadSequence, current = pendingFetch = fetchJwks(href, headers, AbortSignal.timeout(timeoutDuration), fetchImpl).then((json3) => {
        const next = createLocalJWKSet(json3);
        if (sequence <= appliedSequence)
          return;
        local = next;
        const updatedAt = Date.now();
        cache2 && (cache2.uat = updatedAt, cache2.jwks = json3), jwksTimestamp = updatedAt, appliedSequence = sequence;
      }).finally(() => {
        pendingFetch === current && (pendingFetch = void 0);
      });
    }
    await pendingFetch;
  };
  return Object.defineProperties(async (protectedHeader, token) => {
    (!local || !isFreshFor(jwksTimestamp, cacheMaxAge)) && await reload();
    try {
      return await local(protectedHeader, token);
    } catch (err) {
      if (err instanceof JWKSNoMatchingKey && !isFreshFor(jwksTimestamp, cooldownDuration))
        return await reload(), local(protectedHeader, token);
      throw err;
    }
  }, {
    coolingDown: {
      get: () => isFreshFor(jwksTimestamp, cooldownDuration),
      enumerable: true
    },
    fresh: {
      get: () => isFreshFor(jwksTimestamp, cacheMaxAge),
      enumerable: true
    },
    reload: {
      value: reload,
      enumerable: true
    },
    reloading: {
      get: () => !!pendingFetch,
      enumerable: true
    },
    jwks: {
      value: () => local?.jwks(),
      enumerable: true
    }
  });
}

// node_modules/@freebuff/auth/dist/index.js
var DEFAULT_ISSUER = "https://freebuff.com/oidc";
var AUTH_ROUTE_PREFIX = "/auth/freebuff";
var TRANSACTION_TTL = 600;
var SESSION_COOKIE_TTL = 30 * 86400;
var REFRESH_SKEW_SECONDS = 30;
var MAX_COOKIE_LENGTH = 4e3;
var FETCH_TIMEOUT_MS = 8e3;
var LOOPBACK = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "[::1]"]);
var ALL_SCOPES = ["openid", "email", "profile"];
var PROMPTS = /* @__PURE__ */ new Set(["login", "consent", "select_account"]);
var NO_STORE = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};
function checkedUrl(value, allowLoopback, what) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${what} must be an absolute URL.`);
  }
  const loopbackHttp = allowLoopback && LOOPBACK.has(url.hostname) && url.protocol === "http:";
  if (url.protocol !== "https:" && !loopbackHttp || url.username || url.password || url.search || url.hash) {
    throw new Error(`${what} must be an https URL without credentials, query or fragment (http is allowed only for localhost with allowInsecureLocalhost).`);
  }
  return url;
}
function base64url(bytes) {
  let binary = "";
  for (const byte of bytes)
    binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}
async function pkceChallenge(verifier) {
  const bytes = new TextEncoder().encode(verifier);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)));
}
function isSameOriginRequest(request, origin) {
  const header = request.headers.get("origin");
  if (header && header !== "null")
    return header === origin;
  return request.headers.get("sec-fetch-site") === "same-origin";
}
function timingSafeEqual(left, right) {
  if (left.length !== right.length)
    return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++)
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
function readCookie(header, name) {
  const values = (header ?? "").split(";").map((part) => part.trim()).filter((part) => part.startsWith(`${name}=`));
  if (values.length !== 1)
    return null;
  const value = values[0].slice(name.length + 1);
  return value && value.length <= MAX_COOKIE_LENGTH ? value : null;
}
function safeReturnTo(value) {
  if (!value || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return "/";
  }
  const base = "https://return-to.invalid";
  let url;
  try {
    url = new URL(value, base);
  } catch {
    return "/";
  }
  if (url.origin !== base || url.pathname === AUTH_ROUTE_PREFIX || url.pathname.startsWith(`${AUTH_ROUTE_PREFIX}/`)) {
    return "/";
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
function userFrom(claims, scopes) {
  if (typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 255)
    return null;
  const user = { sub: claims.sub };
  if (scopes.includes("email")) {
    if (typeof claims.email === "string" && claims.email.length <= 320)
      user.email = claims.email;
    if (typeof claims.email_verified === "boolean")
      user.email_verified = claims.email_verified;
  }
  if (scopes.includes("profile")) {
    if (typeof claims.name === "string" && claims.name.length <= 200)
      user.name = claims.name;
    if (typeof claims.picture === "string" && claims.picture.startsWith("https://") && claims.picture.length <= 1024) {
      user.picture = claims.picture;
    }
  }
  return user;
}
function json(body, status = 200, cookies = []) {
  const headers = new Headers({ ...NO_STORE, "Content-Type": "application/json; charset=utf-8" });
  for (const cookie of cookies)
    headers.append("Set-Cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}
function redirect(location, cookies = []) {
  const headers = new Headers({ ...NO_STORE, Location: location });
  for (const cookie of cookies)
    headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}
function problem(status, message2, cookies = []) {
  const headers = new Headers({ ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" });
  for (const cookie of cookies)
    headers.append("Set-Cookie", cookie);
  return new Response(message2, { status, headers });
}
async function readJson(response) {
  const text = await response.text();
  if (text.length > 65536)
    throw new Error("Freebuff response too large");
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Unexpected Freebuff response");
  return value;
}
function createFreebuffAuth(options) {
  const allowLoopback = options.allowInsecureLocalhost === true;
  const issuer = (options.issuer ?? DEFAULT_ISSUER).replace(/\/$/, "");
  const issuerUrl = checkedUrl(issuer, allowLoopback, "issuer");
  const base = checkedUrl(options.baseUrl, allowLoopback, "baseUrl");
  if (base.pathname !== "/")
    throw new Error("baseUrl must be an origin, without a path.");
  const origin = base.origin;
  const clientId = options.clientId;
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(clientId ?? "")) {
    throw new Error("clientId is missing or malformed; use the ID from Freebuff provisioning.");
  }
  const scopes = ALL_SCOPES.filter((scope) => scope === "openid" || (options.scopes ?? ALL_SCOPES).includes(scope));
  const now = options.now ?? Date.now;
  const fetcher = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const secure = base.protocol === "https:";
  const cookiePrefix = secure ? "__Host-" : "";
  const sessionCookie = `${cookiePrefix}freebuff_session`;
  const transactionCookie = (state) => `${cookiePrefix}freebuff_txn-${state.slice(0, 16)}`;
  const callbackUrl = `${origin}${AUTH_ROUTE_PREFIX}/callback`;
  const setCookie = (name, value, maxAge) => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
  const clearCookie = (name) => setCookie(name, "", 0);
  const sessionCookieFor = (session) => {
    const value = `v1~${session.accessToken}~${session.refreshToken}`;
    if (value.length > MAX_COOKIE_LENGTH)
      throw new Error("Freebuff session is too large for a cookie");
    return setCookie(sessionCookie, value, SESSION_COOKIE_TTL);
  };
  async function freebuffFetch(input, init = {}) {
    const response = await fetcher(input, {
      ...init,
      // Workers rejects redirect: 'error'. Never follow redirects carrying codes
      // or refresh tokens; reject them explicitly on every provider request.
      redirect: "manual",
      credentials: "omit",
      signal: init.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new Error("Freebuff endpoint returned a redirect");
    }
    return response;
  }
  let discovery;
  function endpoints2() {
    discovery ??= (async () => {
      const response = await freebuffFetch(`${issuer}/.well-known/openid-configuration`, {
        headers: { accept: "application/json" }
      });
      if (!response.ok)
        throw new Error(`Freebuff discovery failed: ${response.status}`);
      const document = await readJson(response);
      if (document.issuer !== issuer)
        throw new Error("Freebuff discovery named a different issuer");
      const endpoint = (name, required = true) => {
        const value = document[name];
        if (typeof value !== "string") {
          if (required)
            throw new Error(`Freebuff discovery is missing ${name}`);
          return null;
        }
        const url = checkedUrl(value, allowLoopback, name);
        if (url.origin !== issuerUrl.origin)
          throw new Error(`Freebuff ${name} left the issuer origin`);
        return url.href;
      };
      return {
        authorization: endpoint("authorization_endpoint"),
        token: endpoint("token_endpoint"),
        revocation: endpoint("revocation_endpoint", false),
        keys: createRemoteJWKSet(new URL(endpoint("jwks_uri")), {
          [customFetch]: (url, init) => freebuffFetch(url, init),
          timeoutDuration: FETCH_TIMEOUT_MS
        })
      };
    })().catch((error) => {
      discovery = void 0;
      throw error;
    });
    return discovery;
  }
  function readSession(request) {
    const value = readCookie(request.headers.get("cookie"), sessionCookie);
    const match = value ? /^v1~([A-Za-z0-9._-]+)~(fbrt_[A-Za-z0-9_-]+)$/.exec(value) : null;
    return match ? { accessToken: match[1], refreshToken: match[2] } : null;
  }
  async function verifyAccessToken(token) {
    try {
      const { payload } = await jwtVerify(token, (await endpoints2()).keys, {
        issuer,
        audience: clientId,
        algorithms: ["RS256"],
        typ: "at+jwt",
        requiredClaims: ["sub", "exp", "iat", "client_id"],
        clockTolerance: 5,
        currentDate: new Date(now())
      });
      if (payload.client_id !== clientId)
        return null;
      const user = userFrom(payload, scopes);
      if (!user)
        return null;
      if (payload.exp <= Math.floor(now() / 1e3) + REFRESH_SKEW_SECONDS)
        return "expired";
      return { user, expiresAt: payload.exp };
    } catch (error) {
      return error instanceof errors_exports.JWTExpired ? "expired" : null;
    }
  }
  async function refresh(refreshToken) {
    let response;
    try {
      response = await freebuffFetch((await endpoints2()).token, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken })
      });
    } catch {
      return "unavailable";
    }
    const body = await readJson(response).catch(() => null);
    if (!response.ok) {
      return body?.error === "invalid_grant" || body?.error === "invalid_client" ? "invalid" : "unavailable";
    }
    if (typeof body?.access_token !== "string" || typeof body.refresh_token !== "string")
      return "unavailable";
    const verified = await verifyAccessToken(body.access_token);
    if (!verified || verified === "expired")
      return "unavailable";
    return { accessToken: body.access_token, refreshToken: body.refresh_token, user: verified.user };
  }
  async function authenticate(request) {
    const session = readSession(request);
    if (!session)
      return { user: null, cookies: [] };
    const verified = await verifyAccessToken(session.accessToken);
    if (verified && verified !== "expired")
      return { user: verified.user, cookies: [] };
    if (verified === null) {
      return { user: null, cookies: [] };
    }
    const refreshed = await refresh(session.refreshToken);
    if (refreshed === "invalid")
      return { user: null, cookies: [clearCookie(sessionCookie)] };
    if (refreshed === "unavailable")
      return { user: null, cookies: [] };
    return { user: refreshed.user, cookies: [sessionCookieFor(refreshed)] };
  }
  const contexts = /* @__PURE__ */ new WeakMap();
  async function getUser(request) {
    const context = contexts.get(request);
    if (context) {
      context.result ??= authenticate(request);
      return (await context.result).user;
    }
    const session = readSession(request);
    if (!session)
      return null;
    const verified = await verifyAccessToken(session.accessToken);
    return verified && verified !== "expired" ? verified.user : null;
  }
  async function signIn(url) {
    let authorization;
    try {
      authorization = (await endpoints2()).authorization;
    } catch {
      return problem(503, "Sign in with Freebuff is temporarily unavailable. Please try again.");
    }
    const state = randomToken();
    const nonce = randomToken();
    const verifier = randomToken();
    const target = new URL(authorization);
    target.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: scopes.join(" "),
      state,
      nonce,
      code_challenge: await pkceChallenge(verifier),
      code_challenge_method: "S256"
    }).toString();
    const prompt = url.searchParams.get("prompt");
    if (prompt && PROMPTS.has(prompt))
      target.searchParams.set("prompt", prompt);
    const transaction = base64url(new TextEncoder().encode(JSON.stringify({ s: state, n: nonce, v: verifier, r: safeReturnTo(url.searchParams.get("returnTo")) })));
    return redirect(target.href, [setCookie(transactionCookie(state), transaction, TRANSACTION_TTL)]);
  }
  function readTransaction(request, state) {
    const raw = readCookie(request.headers.get("cookie"), transactionCookie(state));
    if (!raw)
      return null;
    try {
      const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))));
      if (typeof decoded.s !== "string" || typeof decoded.n !== "string" || typeof decoded.v !== "string" || !timingSafeEqual(decoded.s, state)) {
        return null;
      }
      return { nonce: decoded.n, verifier: decoded.v, returnTo: safeReturnTo(typeof decoded.r === "string" ? decoded.r : "/") };
    } catch {
      return null;
    }
  }
  async function callback(request, url) {
    const params = url.searchParams;
    const state = params.get("state") ?? "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(state) || [...params.keys()].some((key) => params.getAll(key).length > 1)) {
      return problem(400, "This sign-in link is invalid. Please sign in again.");
    }
    const transaction = readTransaction(request, state);
    const clearTransaction = clearCookie(transactionCookie(state));
    if (!transaction) {
      return problem(400, "This sign-in expired or was started in another browser. Please sign in again.", [clearTransaction]);
    }
    if (params.get("iss") !== issuer) {
      return problem(400, "Sign-in response came from an unexpected issuer.", [clearTransaction]);
    }
    const error = params.get("error");
    if (error) {
      if (error === "access_denied")
        return redirect(transaction.returnTo, [clearTransaction]);
      return problem(400, "Sign in with Freebuff did not complete. Please try again.", [clearTransaction]);
    }
    const code = params.get("code");
    if (!code || code.length > 512) {
      return problem(400, "This sign-in link is invalid. Please sign in again.", [clearTransaction]);
    }
    try {
      const { token, keys } = await endpoints2();
      const response = await freebuffFetch(token, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          code,
          redirect_uri: callbackUrl,
          code_verifier: transaction.verifier
        })
      });
      const tokens = await readJson(response);
      if (!response.ok || typeof tokens.id_token !== "string" || typeof tokens.access_token !== "string" || typeof tokens.refresh_token !== "string") {
        throw new Error("token exchange failed");
      }
      const { payload } = await jwtVerify(tokens.id_token, keys, {
        issuer,
        audience: clientId,
        algorithms: ["RS256"],
        requiredClaims: ["sub", "exp", "iat", "nonce"],
        maxTokenAge: TRANSACTION_TTL,
        clockTolerance: 5,
        currentDate: new Date(now())
      });
      if (typeof payload.nonce !== "string" || !timingSafeEqual(payload.nonce, transaction.nonce) || payload.azp !== void 0 && payload.azp !== clientId) {
        throw new Error("ID token is not bound to this sign-in");
      }
      const access = await verifyAccessToken(tokens.access_token);
      if (!access || access === "expired" || access.user.sub !== payload.sub) {
        throw new Error("access token does not match the ID token");
      }
      return redirect(transaction.returnTo, [
        sessionCookieFor({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }),
        clearTransaction
      ]);
    } catch {
      return problem(400, "Sign in with Freebuff could not be completed. Please try again.", [clearTransaction]);
    }
  }
  async function signOut(request, url) {
    if (!isSameOriginRequest(request, origin)) {
      return problem(403, "Sign-out must be submitted from this site.");
    }
    const session = readSession(request);
    if (session) {
      try {
        const { revocation } = await endpoints2();
        if (revocation) {
          await freebuffFetch(revocation, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ client_id: clientId, token: session.refreshToken, token_type_hint: "refresh_token" })
          });
        }
      } catch {
      }
    }
    let returnTo = url.searchParams.get("returnTo");
    const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!returnTo && type === "application/x-www-form-urlencoded") {
      const text = await request.text().catch(() => "");
      if (text.length <= 4096)
        returnTo = new URLSearchParams(text).get("returnTo");
    }
    return redirect(safeReturnTo(returnTo), [clearCookie(sessionCookie)]);
  }
  async function handle(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${AUTH_ROUTE_PREFIX}/`))
      return null;
    const route = url.pathname.slice(AUTH_ROUTE_PREFIX.length);
    const method = request.method;
    switch (route) {
      case "/signin":
        return method === "GET" ? signIn(url) : problem(405, "Use GET.");
      case "/callback":
        return method === "GET" ? callback(request, url) : problem(405, "Use GET.");
      case "/signout":
        return method === "POST" ? signOut(request, url) : problem(405, "Use POST.");
      case "/session": {
        if (method !== "GET")
          return problem(405, "Use GET.");
        const { user, cookies } = await authenticate(request);
        return json({ user }, 200, cookies);
      }
      default:
        return null;
    }
  }
  function wrap(handler) {
    return async (request, ...rest) => {
      const own = await handle(request);
      if (own)
        return own;
      const context = {};
      contexts.set(request, context);
      const response = await handler(request, ...rest);
      const cookies = context.result ? (await context.result).cookies : [];
      if (cookies.length === 0 || response.status === 101)
        return response;
      const headers = new Headers(response.headers);
      for (const cookie of cookies)
        headers.append("Set-Cookie", cookie);
      headers.set("Cache-Control", "private, no-store");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    };
  }
  return { issuer, clientId, handle, authenticate, getUser, wrap };
}

// sites/api/context.ts
var ApiError = class extends Error {
  status;
  constructor(message2, status = 400) {
    super(message2);
    this.name = "ApiError";
    this.status = status;
  }
};
function requireUser(ctx) {
  if (!ctx.userId) throw new ApiError("Sign in to do that.", 401);
  return ctx.userId;
}
function cleanText(raw, max) {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, max);
}
function count(raw, hi = 1e7) {
  const n = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : 0;
  return Math.min(hi, Math.max(0, n));
}
function todayKey() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}

// sites/api/accounts.ts
var MAX_DISPLAY_NAME = 40;
function toAccount(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    picture: row.picture,
    createdAt: row.created_at
  };
}
async function ensureAccount(db, user) {
  const existing = await db.first(
    "SELECT id, name, email, picture, created_at FROM accounts WHERE id = ?",
    [user.sub]
  );
  const now = Date.now();
  const seeded = cleanText(user.name, MAX_DISPLAY_NAME);
  if (!existing) {
    await db.run(
      "INSERT INTO accounts (id, name, email, picture, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [user.sub, seeded, user.email ?? null, user.picture ?? null, now, now]
    );
    return {
      id: user.sub,
      name: seeded,
      email: user.email ?? null,
      picture: user.picture ?? null,
      createdAt: now
    };
  }
  const name = existing.name || seeded;
  const email = user.email ?? existing.email;
  const picture = user.picture ?? existing.picture;
  if (name !== existing.name || email !== existing.email || picture !== existing.picture) {
    await db.run("UPDATE accounts SET name = ?, email = ?, picture = ?, updated_at = ? WHERE id = ?", [
      name,
      email,
      picture,
      now,
      user.sub
    ]);
  }
  return { ...toAccount(existing), name, email, picture };
}
function accountName(account) {
  const name = cleanText(account?.name, MAX_DISPLAY_NAME);
  if (name) return name;
  const email = account?.email ?? "";
  const local = email.includes("@") ? email.slice(0, email.indexOf("@")) : "";
  return cleanText(local, MAX_DISPLAY_NAME) || "Learner";
}
async function me(ctx) {
  if (!ctx.account) return null;
  return {
    handle: ctx.account.id,
    name: ctx.account.name,
    email: ctx.account.email,
    picture: ctx.account.picture
  };
}
async function setName(ctx, args) {
  const userId = requireUser(ctx);
  const name = cleanText(args?.name, MAX_DISPLAY_NAME);
  if (name.length < 2) throw new ApiError("Pick a display name with at least 2 characters.");
  await ctx.db.run("UPDATE accounts SET name = ?, updated_at = ? WHERE id = ?", [
    name,
    Date.now(),
    userId
  ]);
  return null;
}

// sites/api/d1.ts
function d1(db) {
  return {
    async all(sql, params = []) {
      const statement = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
      const result = await statement.all();
      return result.results ?? [];
    },
    async first(sql, params = []) {
      const statement = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
      return await statement.first() ?? null;
    },
    async run(sql, params = []) {
      const statement = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
      await statement.run();
    }
  };
}

// src/data/roadmap-lanes.ts
var LANES = [
  {
    id: "junior-frontend",
    title: "Junior frontend",
    blurb: "HTML, CSS, JavaScript and React, with the API and state basics a first frontend job asks for.",
    weeksHint: "8\u201312 weeks",
    trackIds: ["web", "react", "tailwind", "api", "state"],
    milestoneIds: ["m-shell", "m-style", "m-interactive", "m-data"]
  },
  {
    id: "fullstack-agents",
    title: "Full-stack + agents",
    blurb: "Front end, backend and TypeScript, plus the skills to direct a coding agent and verify its work.",
    weeksHint: "12\u201316 weeks",
    trackIds: ["web", "react", "backend", "typescript", "git", "agents"],
    milestoneIds: ["m-interactive", "m-data", "m-persist", "m-ship"]
  },
  {
    id: "school-project-4w",
    title: "4-week school project",
    blurb: "A focused four weeks: a semantic page, a styled component and one working data flow.",
    weeksHint: "4 weeks",
    trackIds: ["web", "react", "tailwind"],
    milestoneIds: ["m-shell", "m-style", "m-interactive"]
  },
  {
    id: "interview-prep",
    title: "Interview prep",
    blurb: "Data structures, JavaScript and TypeScript, and the written work that interviewers and reviewers read.",
    weeksHint: "6\u20138 weeks",
    trackIds: ["dsa", "typescript", "testing", "workflow"],
    milestoneIds: ["m-interactive", "m-persist"]
  }
];

// src/lib/atlasInterview.ts
function sanitizeAtlasAnswers(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw;
  const out = {};
  for (const question of INTERVIEW_QUESTIONS) {
    const value = record[question.id];
    if (typeof value !== "string") continue;
    if (question.kind === "choice" && !question.options.some((o) => o.id === value)) continue;
    out[question.id] = value.slice(0, 200);
  }
  return out;
}
function mergeAtlasState(a, b) {
  if (a.revision !== b.revision) return a.revision > b.revision ? a : b;
  const serial = (state) => JSON.stringify(
    Object.entries(state.answers).filter(([, value]) => value !== void 0).sort(([x], [y]) => x.localeCompare(y))
  );
  return serial(a) >= serial(b) ? a : b;
}
var INTERVIEW_QUESTIONS = [
  // Start: asked once, before the first plan.
  {
    id: "goal",
    group: "start",
    kind: "choice",
    prompt: "What is your goal?",
    options: LANES.map((lane) => ({ id: lane.id, label: lane.title }))
  },
  {
    id: "level",
    group: "start",
    kind: "choice",
    prompt: "Have you written a web page before?",
    options: [
      { id: "never", label: "Never" },
      { id: "some", label: "A little" },
      { id: "comfortable", label: "Comfortably" }
    ]
  },
  {
    id: "hours",
    group: "start",
    kind: "choice",
    prompt: "Hours per week?",
    options: [
      { id: "1-3", label: "1\u20133" },
      { id: "4-7", label: "4\u20137" },
      { id: "8-12", label: "8\u201312" },
      { id: "13+", label: "13+" }
    ]
  },
  {
    id: "deadline",
    group: "start",
    kind: "choice",
    prompt: "Do you have a deadline?",
    options: [
      { id: "none", label: "No deadline" },
      { id: "weeks", label: "Within a few weeks" },
      { id: "months", label: "Within a few months" }
    ]
  },
  {
    id: "device",
    group: "start",
    kind: "choice",
    prompt: "What will you learn on?",
    options: [
      { id: "laptop", label: "Laptop" },
      { id: "desktop", label: "Desktop" },
      { id: "phone", label: "Phone" },
      { id: "tablet", label: "Tablet" }
    ]
  },
  {
    id: "stack",
    group: "start",
    kind: "choice",
    prompt: "Favourite stack?",
    options: [
      { id: "react", label: "React" },
      { id: "plain", label: "Plain JavaScript" },
      { id: "python", label: "Python" },
      { id: "none", label: "No preference" }
    ]
  },
  {
    id: "ship",
    group: "start",
    kind: "text",
    prompt: "What do you want to ship? (optional)"
  },
  // After each planet.
  {
    id: "hard",
    group: "planet",
    kind: "text",
    prompt: "What was hard?"
  },
  {
    id: "still-want",
    group: "planet",
    kind: "choice",
    prompt: "Do you still want this goal?",
    options: [
      { id: "yes", label: "Yes" },
      { id: "unsure", label: "Not sure" },
      { id: "change", label: "Change my goal" }
    ]
  },
  // Weekly retro.
  {
    id: "pace",
    group: "weekly",
    kind: "choice",
    prompt: "How was this week?",
    options: [
      { id: "ahead", label: "Ahead" },
      { id: "on-pace", label: "On pace" },
      { id: "behind", label: "Behind" }
    ]
  },
  {
    id: "change-next",
    group: "weekly",
    kind: "text",
    prompt: "One thing to change next week? (optional)"
  }
];
var DEFAULT_LANE = LANES[0];

// sites/api/atlas.ts
async function get(ctx) {
  if (!ctx.userId) return null;
  const row = await ctx.db.first(
    "SELECT answers, revision FROM atlas WHERE user_id = ?",
    [ctx.userId]
  );
  let answers = {};
  try {
    answers = row ? JSON.parse(row.answers) : {};
  } catch {
    answers = {};
  }
  return { answers: sanitizeAtlasAnswers(answers), revision: row?.revision ?? 0 };
}
async function save(ctx, args) {
  if (!ctx.userId) return null;
  const userId = ctx.userId;
  const revision = args?.revision === void 0 ? 0 : args.revision;
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 0) {
    throw new Error("Invalid plan revision.");
  }
  const incoming = { answers: sanitizeAtlasAnswers(args?.answers), revision };
  const row = await ctx.db.first(
    "SELECT answers, revision FROM atlas WHERE user_id = ?",
    [userId]
  );
  let next = incoming;
  if (row) {
    let stored = {};
    try {
      stored = JSON.parse(row.answers);
    } catch {
      stored = {};
    }
    next = mergeAtlasState(
      { answers: sanitizeAtlasAnswers(stored), revision: row.revision },
      incoming
    );
  }
  await ctx.db.run(
    `INSERT INTO atlas (user_id, answers, revision, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET
       answers = excluded.answers, revision = excluded.revision, updated_at = excluded.updated_at`,
    [userId, JSON.stringify(next.answers), next.revision, Date.now()]
  );
  return null;
}

// src/lib/curriculum.generated.ts
var TOTAL_LESSONS = 118;
var TRACK_TITLES = {
  "web": "Web Development Foundations",
  "git": "Git, GitHub & Workflows",
  "testing": "Testing & Debugging",
  "agents": "Working with Coding Agents",
  "workflow": "Professional Workflow",
  "security": "Web Security & OWASP",
  "typescript": "TypeScript for Real Projects",
  "backend": "Backend Systems & APIs",
  "react": "Modern Frontend: React",
  "api": "API Integration & Data Fetching",
  "dsa": "Data Structures & Algorithms",
  "python": "Python & Data Fundamentals",
  "devops": "DevOps, Linux CLI & Cloud",
  "architecture": "System Design & Architecture",
  "tailwind": "UI Engineering with Tailwind CSS",
  "state": "Advanced React State Management",
  "performance": "Web Performance & Accessibility"
};
var TRACK_LESSON_KEYS = {
  "web": [
    "web/html-semantic",
    "web/box-model-deep",
    "web/responsive-deep",
    "web/css-layout",
    "web/scope-context",
    "web/es6-syntax",
    "web/dom-events",
    "web/async-promises",
    "web/fetch-api",
    "web/capstone-utility-belt"
  ],
  "git": [
    "git/git-basics",
    "git/git-branches",
    "git/git-workflow-lab",
    "git/git-ci"
  ],
  "testing": [
    "testing/testing-why",
    "testing/debugging-method",
    "testing/tdd-mocking",
    "testing/debug-the-bug",
    "testing/prod-traces",
    "testing/prod-logs",
    "testing/incident-timeline"
  ],
  "agents": [
    "agents/agentic-loop-zero",
    "agents/specs-and-prompts",
    "agents/codebase-archaeology",
    "agents/managing-context",
    "agents/instruction-files",
    "agents/plan-before-code",
    "agents/enforceable-rules",
    "agents/permissions-and-sandbox",
    "agents/headless-and-scheduled-agents",
    "agents/verifying-agent-output",
    "agents/when-not-to-use-agents",
    "agents/characterization-tests",
    "agents/review-generated-migration",
    "agents/rollback-drills",
    "agents/lockfile-is-an-artifact",
    "agents/runtime-evidence",
    "agents/version-reality",
    "agents/decomposition-contracts",
    "agents/approval-gates",
    "agents/failing-test-loop",
    "agents/definition-of-done",
    "agents/write-the-catching-test",
    "agents/capstone-agent-loop"
  ],
  "workflow": [
    "workflow/pull-requests",
    "workflow/reviewing-diffs",
    "workflow/vague-request-ticket",
    "workflow/decision-records"
  ],
  "security": [
    "security/agent-guardrails",
    "security/xss",
    "security/sqli",
    "security/csrf-auth",
    "security/cors-headers",
    "security/rate-limit-secrets",
    "security/data-boundaries"
  ],
  "typescript": [
    "typescript/annotations",
    "typescript/narrowing",
    "typescript/generics",
    "typescript/interfaces-types",
    "typescript/unknown-errors",
    "typescript/capstone-type-layer"
  ],
  "backend": [
    "backend/node-event-loop",
    "backend/express-middleware",
    "backend/rest-auth",
    "backend/databases",
    "backend/api-security"
  ],
  "react": [
    "react/jsx-vdom",
    "react/props-state",
    "react/hooks-effect",
    "react/react-styling-routing"
  ],
  "api": [
    "api/http-verbs",
    "api/fetch-async",
    "api/loading-errors",
    "api/abort-races",
    "api/optimistic",
    "api/capstone-api-client"
  ],
  "dsa": [
    "dsa/big-o",
    "dsa/hash-maps",
    "dsa/linked-lists-stacks-queues",
    "dsa/trees-recursion",
    "dsa/sorting",
    "dsa/patterns-two-pointer",
    "dsa/graphs-bfs-dfs",
    "dsa/dp-intro"
  ],
  "python": [
    "python/python-syntax",
    "python/python-oop",
    "python/pandas-numpy",
    "python/python-llm-api"
  ],
  "devops": [
    "devops/bash-basics",
    "devops/bash-scripting",
    "devops/file-permissions",
    "devops/processes-services",
    "devops/docker-dockerfile",
    "devops/nginx-ssl-ci"
  ],
  "architecture": [
    "architecture/monolith-vs-microservices",
    "architecture/caching-and-redis",
    "architecture/load-balancing",
    "architecture/websockets-realtime",
    "architecture/sharding-and-queues",
    "architecture/capstone-system-design"
  ],
  "tailwind": [
    "tailwind/utility-first",
    "tailwind/layout-flex-grid",
    "tailwind/responsive-dark",
    "tailwind/states-motion",
    "tailwind/design-tokens",
    "tailwind/capstone-ui-kit"
  ],
  "state": [
    "state/state-shapes",
    "state/usereducer",
    "state/context",
    "state/external-stores",
    "state/server-state",
    "state/capstone-state-machine"
  ],
  "performance": [
    "performance/web-vitals",
    "performance/layout-shift",
    "performance/contrast",
    "performance/keyboard-focus",
    "performance/critical-rendering",
    "performance/capstone-audit"
  ]
};

// sites/api/certificates.ts
var CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var CODE_PATTERN = /^[A-HJ-NP-Z2-9]{12}$/;
var MAX_NAME = 60;
function publicCertificate(row) {
  return {
    code: row.code,
    trackId: row.track_id,
    trackTitle: row.track_title,
    displayName: row.display_name,
    issuedAt: row.issued_at
  };
}
function randomCode() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}
function missingLessons(completed, keys) {
  let missing = 0;
  for (const key of keys) {
    let best = 0;
    for (const [entry, score] of Object.entries(completed)) {
      if (typeof score !== "number") continue;
      if (entry === key || entry.startsWith(key + "!")) best = Math.max(best, score);
    }
    if (best < 1) missing += 1;
  }
  return missing;
}
async function issue(ctx, args) {
  const userId = requireUser(ctx);
  const trackId = String(args?.trackId ?? "");
  const keys = Object.prototype.hasOwnProperty.call(TRACK_LESSON_KEYS, trackId) ? TRACK_LESSON_KEYS[trackId] : void 0;
  const trackTitle = Object.prototype.hasOwnProperty.call(TRACK_TITLES, trackId) ? TRACK_TITLES[trackId] : void 0;
  if (!keys || !trackTitle) throw new Error("That track does not exist.");
  const existing = await ctx.db.first(
    `SELECT code, track_id, track_title, display_name, issued_at
       FROM certificates WHERE user_id = ? AND track_id = ?`,
    [userId, trackId]
  );
  if (existing) return publicCertificate(existing);
  const progress = await ctx.db.first(
    "SELECT data FROM progress WHERE user_id = ?",
    [userId]
  );
  let completed = {};
  try {
    completed = progress?.data ? JSON.parse(progress.data) : {};
  } catch {
    completed = {};
  }
  const missing = missingLessons(completed, keys);
  if (missing > 0) {
    throw new Error(
      `Not finished yet: ${missing} lesson${missing === 1 ? "" : "s"} left in ${trackTitle}.`
    );
  }
  const chosen = cleanText(args?.displayName, MAX_NAME);
  const displayName = chosen || cleanText(ctx.account?.name, MAX_NAME) || accountName(ctx.account);
  const issuedAt = Date.now();
  const code = randomCode();
  await ctx.db.run(
    `INSERT INTO certificates (id, user_id, track_id, track_title, code, display_name, issued_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), userId, trackId, trackTitle, code, displayName, issuedAt]
  );
  return { code, trackId, trackTitle, displayName, issuedAt };
}
async function verify(ctx, args) {
  const clean = String(args?.code ?? "").trim().toUpperCase();
  if (!CODE_PATTERN.test(clean)) return { valid: false };
  const row = await ctx.db.first(
    `SELECT code, track_id, track_title, display_name, issued_at FROM certificates WHERE code = ?`,
    [clean]
  );
  if (!row) return { valid: false };
  return { valid: true, ...publicCertificate(row) };
}
async function certificatesOf(ctx, userId) {
  const rows = await ctx.db.all(
    `SELECT code, track_id, track_title, display_name, issued_at
       FROM certificates WHERE user_id = ? ORDER BY issued_at DESC LIMIT 50`,
    [userId]
  );
  return rows.map(publicCertificate);
}
async function listForProfile(ctx, args) {
  const profile = await ctx.db.first(
    "SELECT user_id FROM profiles WHERE id = ?",
    [String(args?.profileId ?? "")]
  );
  if (!profile) return [];
  return certificatesOf(ctx, profile.user_id);
}
async function mine(ctx) {
  if (!ctx.userId) return [];
  return certificatesOf(ctx, ctx.userId);
}

// src/lib/xpRules.ts
var XP_PER_LEVEL = 250;
var LESSON_XP_BASE = 50;
var LESSON_XP_FLAWLESS_BONUS = 25;
var MAX_XP_PER_LESSON = LESSON_XP_BASE + LESSON_XP_FLAWLESS_BONUS;
var BONUS_XP_PER_LESSON = 40;
var BONUS_XP_FLAT = 2e3;
var MAX_XP_PER_HOUR = 2e3;
var MERGE_GRACE_XP = 3e3;
var MAX_SYNCS_PER_MINUTE = 20;
var MAX_ASCENSION = 999;
function levelForXp(xp) {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}
function maxBonusXp(lessonsDone) {
  return lessonsDone * BONUS_XP_PER_LESSON + BONUS_XP_FLAT;
}
function maxXpFor(lessonsDone) {
  const lessons = Math.min(Math.max(0, Math.floor(lessonsDone)), TOTAL_LESSONS);
  return lessons * MAX_XP_PER_LESSON + maxBonusXp(lessons);
}
function clampProfile(input) {
  const reasons = [];
  const clamp = (value, max, code) => {
    if (value > max) {
      reasons.push(code);
      return max;
    }
    return value;
  };
  const lessonsDone = clamp(input.lessonsDone, TOTAL_LESSONS, "lessons>total");
  let xp = clamp(input.xp, maxXpFor(lessonsDone), "xp>curriculum");
  if (input.previous) {
    const elapsedHours = Math.max((input.now - input.previous.updatedAt) / 36e5, 1 / 60);
    const ceiling = input.previous.xp + MERGE_GRACE_XP + Math.ceil(MAX_XP_PER_HOUR * elapsedHours);
    xp = clamp(xp, ceiling, "xp>hourly-gain");
  }
  let xpMonth = clamp(input.xpMonth, xp, "xpMonth>xp");
  let xpWeek = clamp(input.xpWeek, xpMonth, "xpWeek>xpMonth");
  xpMonth = Math.max(0, xpMonth);
  xpWeek = Math.max(0, xpWeek);
  const curveMax = Math.min(levelForXp(xp), MAX_ASCENSION);
  const level = clamp(input.level, curveMax, "level>curve");
  const maxStreak = Math.max(1, Math.floor(input.accountAgeDays) + 1);
  const streakCurrent = clamp(input.streakCurrent, maxStreak, "streak>account-age");
  const streakLongest = Math.max(input.streakLongest, streakCurrent);
  return {
    xp,
    xpWeek,
    xpMonth,
    level,
    lessonsDone,
    streakCurrent,
    streakLongest,
    reasons
  };
}

// sites/api/profiles.ts
var MAX_NAME2 = 40;
var MAX_TITLE = 24;
var SYNC_WINDOW_MS = 6e4;
var CLAMPS_ENFORCED = true;
var COLUMNS = `id, user_id, name, xp, xp_week, xp_month, level, ascension, title,
  streak_current, streak_longest, last_active_day, member_role, lessons_done, clan_id,
  updated_at, clamped_at, clamp_log, sync_window_start, sync_count`;
async function profileForUser(ctx, userId) {
  return ctx.db.first(`SELECT ${COLUMNS} FROM profiles WHERE user_id = ?`, [userId]);
}
async function postEvent(ctx, clanId, actorId, kind, text) {
  await ctx.db.run(
    "INSERT INTO clan_events (id, clan_id, actor_id, kind, text, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [crypto.randomUUID(), clanId, actorId, kind, text, Date.now()]
  );
}
async function sync(ctx, args) {
  if (!ctx.userId) return null;
  const userId = ctx.userId;
  const now = Date.now();
  const name = accountName(ctx.account);
  const existing = await profileForUser(ctx, userId);
  const inWindow = existing?.sync_window_start != null && now - existing.sync_window_start < SYNC_WINDOW_MS;
  const syncCount = inWindow ? (existing?.sync_count ?? 0) + 1 : 1;
  if (inWindow && syncCount > MAX_SYNCS_PER_MINUTE) {
    console.warn(`profiles.sync: rate limit hit for ${userId}`);
    if (CLAMPS_ENFORCED && existing) {
      await ctx.db.run(
        "UPDATE profiles SET sync_count = ?, clamped_at = ?, clamp_log = ? WHERE id = ?",
        [syncCount, now, JSON.stringify(["rate-limit"]), existing.id]
      );
      return existing.id;
    }
  }
  const syncWindowStart = inWindow && existing?.sync_window_start != null ? existing.sync_window_start : now;
  const raw = {
    xp: count(args?.xp),
    xpWeek: count(args?.xpWeek),
    xpMonth: count(args?.xpMonth),
    level: Math.max(1, count(args?.level, 999)),
    ascension: cleanText(args?.ascension, MAX_TITLE) || "initiate",
    streakCurrent: count(args?.streakCurrent, 1e4),
    streakLongest: count(args?.streakLongest, 1e4),
    lastActiveDay: typeof args?.lastActiveDay === "string" ? args.lastActiveDay.slice(0, 10) : null,
    lessonsDone: count(args?.lessonsDone, 1e5)
  };
  const createdAt = ctx.account?.createdAt ?? now;
  const clamped = clampProfile({
    ...raw,
    accountAgeDays: Math.max(0, (now - createdAt) / 864e5),
    previous: existing ? {
      xp: existing.xp,
      xpWeek: existing.xp_week,
      xpMonth: existing.xp_month,
      updatedAt: existing.updated_at
    } : void 0,
    now
  });
  if (clamped.reasons.length) {
    console.warn(`profiles.sync: clamped [${clamped.reasons.join(", ")}] for ${userId}`);
  }
  const stored = CLAMPS_ENFORCED ? {
    xp: clamped.xp,
    xpWeek: clamped.xpWeek,
    xpMonth: clamped.xpMonth,
    level: clamped.level,
    streakCurrent: clamped.streakCurrent,
    streakLongest: clamped.streakLongest,
    lessonsDone: clamped.lessonsDone
  } : raw;
  const next = {
    ...stored,
    name: cleanText(name, MAX_NAME2) || "Learner",
    ascension: raw.ascension,
    lastActiveDay: raw.lastActiveDay,
    updatedAt: now,
    clampedAt: clamped.reasons.length ? now : null,
    clampLog: clamped.reasons.length ? JSON.stringify(clamped.reasons) : null
  };
  if (!existing) {
    if (next.xp === 0 && next.lessonsDone === 0) return null;
    const id = crypto.randomUUID();
    await ctx.db.run(
      `INSERT INTO profiles (id, user_id, name, xp, xp_week, xp_month, level, ascension, title,
         streak_current, streak_longest, last_active_day, member_role, lessons_done, clan_id,
         updated_at, clamped_at, clamp_log, sync_window_start, sync_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, ?, NULL, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        next.name,
        next.xp,
        next.xpWeek,
        next.xpMonth,
        next.level,
        next.ascension,
        next.streakCurrent,
        next.streakLongest,
        next.lastActiveDay,
        next.lessonsDone,
        now,
        next.clampedAt,
        next.clampLog,
        syncWindowStart,
        syncCount
      ]
    );
    return id;
  }
  const sourceDay = typeof args?.sourceDay === "string" ? args.sourceDay : null;
  if (next.level > existing.level && next.xp >= existing.xp && sourceDay !== null && sourceDay !== existing.last_active_day && existing.clan_id) {
    await postEvent(ctx, existing.clan_id, userId, "level-up", `${next.name} reached level ${next.level}`);
  }
  const unchanged = existing.xp === next.xp && existing.xp_week === next.xpWeek && existing.xp_month === next.xpMonth && existing.level === next.level && existing.ascension === next.ascension && existing.streak_current === next.streakCurrent && existing.streak_longest === next.streakLongest && existing.last_active_day === next.lastActiveDay && existing.lessons_done === next.lessonsDone && existing.name === next.name;
  if (unchanged && !clamped.reasons.length) return existing.id;
  await ctx.db.run(
    `UPDATE profiles SET name = ?, xp = ?, xp_week = ?, xp_month = ?, level = ?, ascension = ?,
       streak_current = ?, streak_longest = ?, last_active_day = ?, lessons_done = ?,
       updated_at = ?, clamped_at = ?, clamp_log = ?, sync_window_start = ?, sync_count = ?
     WHERE id = ?`,
    [
      next.name,
      next.xp,
      next.xpWeek,
      next.xpMonth,
      next.level,
      next.ascension,
      next.streakCurrent,
      next.streakLongest,
      next.lastActiveDay,
      next.lessonsDone,
      now,
      next.clampedAt,
      next.clampLog,
      syncWindowStart,
      syncCount,
      existing.id
    ]
  );
  return existing.id;
}
async function me2(ctx) {
  if (!ctx.userId) return null;
  const profile = await profileForUser(ctx, ctx.userId);
  if (!profile) return null;
  const clan = profile.clan_id ? await ctx.db.first(
    "SELECT id, name, tag, owner_id FROM clans WHERE id = ?",
    [profile.clan_id]
  ) : null;
  const role = clan ? clan.owner_id === ctx.userId ? "owner" : profile.member_role === "officer" ? "officer" : "member" : "none";
  return {
    name: profile.name,
    xp: profile.xp,
    xpWeek: profile.xp_week,
    xpMonth: profile.xp_month,
    level: profile.level,
    ascension: profile.ascension,
    title: profile.title,
    streakCurrent: profile.streak_current,
    streakLongest: profile.streak_longest,
    lessonsDone: profile.lessons_done,
    clan: clan ? { id: clan.id, name: clan.name, tag: clan.tag } : null,
    clanRole: role
  };
}
async function setTitle(ctx, args) {
  if (!ctx.userId) return null;
  const title = cleanText(args?.title, MAX_TITLE);
  await ctx.db.run("UPDATE profiles SET title = ? WHERE user_id = ?", [
    title || null,
    ctx.userId
  ]);
  return null;
}
async function publicCard(ctx, args) {
  const profile = await ctx.db.first(`SELECT ${COLUMNS} FROM profiles WHERE id = ?`, [
    String(args?.profileId ?? "")
  ]);
  if (!profile) return null;
  const clan = profile.clan_id ? await ctx.db.first(
    "SELECT name, tag FROM clans WHERE id = ?",
    [profile.clan_id]
  ) : null;
  return {
    name: profile.name,
    level: profile.level,
    ascension: profile.ascension,
    title: profile.title,
    xp: profile.xp,
    streakLongest: profile.streak_longest,
    lessonsDone: profile.lessons_done,
    clan: clan ? { name: clan.name, tag: clan.tag } : null
  };
}
async function ensureProfile(ctx, userId) {
  const existing = await profileForUser(ctx, userId);
  if (existing) return existing;
  const name = cleanText(accountName(ctx.account), MAX_NAME2) || "Learner";
  const id = crypto.randomUUID();
  const now = Date.now();
  await ctx.db.run(
    `INSERT INTO profiles (id, user_id, name, xp, xp_week, xp_month, level, ascension, title,
       streak_current, streak_longest, last_active_day, member_role, lessons_done, clan_id,
       updated_at, clamped_at, clamp_log, sync_window_start, sync_count)
     VALUES (?, ?, ?, 0, 0, 0, 1, 'initiate', NULL, 0, 0, NULL, NULL, 0, NULL, ?, NULL, NULL, NULL, 0)`,
    [id, userId, name, now]
  );
  const created = await profileForUser(ctx, userId);
  if (!created) throw new Error("Could not create your player card.");
  return created;
}

// src/lib/guild.ts
var GUILD_TIERS = [
  { id: "band", name: "Band", minXp: 0, perk: "Shared guild banner" },
  { id: "company", name: "Company", minXp: 500, perk: "+1 guild streak shield" },
  { id: "order", name: "Order", minXp: 2e3, perk: "Guild aura on the leaderboard" },
  { id: "coterie", name: "Coterie", minXp: 6e3, perk: "Custom guild reward tag" },
  { id: "legend", name: "Legend", minXp: 15e3, perk: "Gilded guild crest + title" }
];
var MAX_GUILD_MEMBERS = 25;
function guildTierFor(totalXp) {
  let tier = GUILD_TIERS[0];
  for (const t of GUILD_TIERS) if (totalXp >= t.minXp) tier = t;
  const idx = GUILD_TIERS.indexOf(tier);
  const next = GUILD_TIERS[idx + 1] ?? null;
  return {
    tier,
    next,
    toNext: next ? next.minXp - totalXp : 0,
    pct: next ? Math.round((totalXp - tier.minXp) / (next.minXp - tier.minXp) * 100) : 100
  };
}
var CLAN_QUESTS = [
  {
    id: "war-party",
    title: "War Party",
    detail: "The guild clears lessons together \u2014 every member's completions count.",
    metric: "lessons",
    baseTarget: 6,
    perMember: 2,
    rewardXp: 600
  },
  {
    id: "xp-tithe",
    title: "The Tithe",
    detail: "Pooled weekly XP. Quest bonuses and consistency XP count too.",
    metric: "xp",
    baseTarget: 600,
    perMember: 80,
    rewardXp: 800
  },
  {
    id: "perfect-vanguard",
    title: "Perfect Vanguard",
    detail: "Flawless 100% quiz runs, pooled across the whole guild.",
    metric: "flawless",
    baseTarget: 3,
    perMember: 1,
    rewardXp: 900
  },
  {
    id: "night-watch",
    title: "Night Watch",
    detail: "A long march: pooled lessons with a stretch goal for big guilds.",
    metric: "lessons",
    baseTarget: 10,
    perMember: 3,
    rewardXp: 1100
  }
];
function isoWeekKey(day) {
  const d = /* @__PURE__ */ new Date(day + "T00:00:00Z");
  const dayNr = (d.getUTCDay() + 6) % 7;
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const ftDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ftDayNr + 3);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 864e5));
  return thursday.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
}
function questDefForWeek(weekKey) {
  let h = 0;
  for (let i = 0; i < weekKey.length; i++) {
    h = h * 31 + weekKey.charCodeAt(i) >>> 0;
  }
  return CLAN_QUESTS[h % CLAN_QUESTS.length];
}
function questTargetFor(def, memberCount) {
  return def.baseTarget + def.perMember * Math.max(1, memberCount);
}

// sites/api/clans.ts
var MAX_NAME3 = 28;
var MAX_BLURB = 140;
var PROFILE_COLUMNS = `id, user_id, name, xp, xp_week, xp_month, level, ascension, title,
  streak_current, streak_longest, member_role`;
async function clanFor(ctx, clanId) {
  return ctx.db.first("SELECT * FROM clans WHERE id = ?", [clanId]);
}
async function membersOf(ctx, clanId) {
  return ctx.db.all(
    `SELECT ${PROFILE_COLUMNS} FROM profiles WHERE clan_id = ? ORDER BY xp DESC LIMIT ?`,
    [clanId, MAX_GUILD_MEMBERS + 5]
  );
}
function roleOf(profile, clan) {
  if (clan.owner_id === profile.user_id) return "owner";
  return profile.member_role === "officer" ? "officer" : "member";
}
function view(clan, members, meId) {
  const sorted = [...members].sort((a, b) => b.xp - a.xp);
  const totalXp = sorted.reduce((n, m) => n + m.xp, 0);
  const mine3 = meId === null ? void 0 : sorted.find((m) => m.user_id === meId);
  const seesIds = mine3 !== void 0;
  return {
    id: clan.id,
    name: clan.name,
    tag: clan.tag,
    blurb: clan.blurb,
    memberCount: sorted.length,
    totalXp,
    weekXp: sorted.reduce((n, m) => n + m.xp_week, 0),
    tier: guildTierFor(totalXp).tier.name,
    tierPerk: guildTierFor(totalXp).tier.perk,
    isMine: mine3 !== void 0,
    isOwner: meId !== null && clan.owner_id === meId,
    myRole: mine3 ? roleOf(mine3, clan) : "member",
    members: sorted.slice(0, 12).map((m) => ({
      profileId: m.id,
      userId: seesIds ? m.user_id : null,
      name: m.name,
      xp: m.xp,
      level: m.level,
      ascension: m.ascension,
      role: roleOf(m, clan),
      isMe: meId !== null && m.user_id === meId
    }))
  };
}
async function list(ctx) {
  const meId = ctx.userId;
  const clans = await ctx.db.all("SELECT * FROM clans LIMIT 40");
  const out = [];
  for (const clan of clans) out.push(view(clan, await membersOf(ctx, clan.id), meId));
  out.sort((a, b) => b.totalXp - a.totalXp || b.weekXp - a.weekXp);
  return out;
}
async function mine2(ctx) {
  if (!ctx.userId) return null;
  const profile = await profileForUser(ctx, ctx.userId);
  if (!profile?.clan_id) return null;
  const clan = await clanFor(ctx, profile.clan_id);
  if (!clan) return null;
  return view(clan, await membersOf(ctx, clan.id), ctx.userId);
}
async function create(ctx, args) {
  const userId = requireUser(ctx);
  const name = cleanText(args?.name, MAX_NAME3);
  const tag2 = cleanText(args?.tag, 5).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (name.length < 3) throw new Error("Guild name needs at least 3 characters.");
  if (tag2.length < 2) throw new Error("Guild tag needs 2\u20135 letters or numbers.");
  const profile = await ensureProfile(ctx, userId);
  if (profile.clan_id) throw new Error("Leave your current guild first.");
  const nameTaken = await ctx.db.first("SELECT id FROM clans WHERE name = ?", [name]);
  if (nameTaken) throw new Error("That guild name is taken.");
  const tagTaken = await ctx.db.first("SELECT id FROM clans WHERE tag = ?", [tag2]);
  if (tagTaken) throw new Error("That guild tag is taken.");
  const clanId = crypto.randomUUID();
  await ctx.db.run(
    "INSERT INTO clans (id, name, tag, blurb, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [clanId, name, tag2, cleanText(args?.blurb, MAX_BLURB) || "No motto yet \u2014 recruiting builders.", userId, Date.now()]
  );
  await ctx.db.run("UPDATE profiles SET clan_id = ?, member_role = NULL WHERE id = ?", [
    clanId,
    profile.id
  ]);
  await postEvent(ctx, clanId, userId, "join", `${profile.name} founded the guild`);
  return clanId;
}
async function join(ctx, args) {
  const userId = requireUser(ctx);
  const clan = await clanFor(ctx, String(args?.clanId ?? ""));
  if (!clan) throw new Error("That guild no longer exists.");
  const profile = await ensureProfile(ctx, userId);
  if (profile.clan_id === clan.id) return null;
  const members = await membersOf(ctx, clan.id);
  if (members.length >= MAX_GUILD_MEMBERS) throw new Error("That guild is full.");
  await ctx.db.run("UPDATE profiles SET clan_id = ?, member_role = NULL WHERE id = ?", [
    clan.id,
    profile.id
  ]);
  await postEvent(ctx, clan.id, userId, "join", `${profile.name} joined the guild`);
  return null;
}
async function leave(ctx) {
  const userId = requireUser(ctx);
  const profile = await profileForUser(ctx, userId);
  if (!profile?.clan_id) return null;
  const clan = await clanFor(ctx, profile.clan_id);
  await ctx.db.run("UPDATE profiles SET clan_id = NULL, member_role = NULL WHERE id = ?", [profile.id]);
  if (!clan) return null;
  await postEvent(ctx, clan.id, userId, "leave", `${profile.name} left the guild`);
  const remaining = await membersOf(ctx, clan.id);
  if (remaining.length === 0) {
    await ctx.db.run("DELETE FROM clans WHERE id = ?", [clan.id]);
    await ctx.db.run("DELETE FROM clan_quests WHERE clan_id = ?", [clan.id]);
    await ctx.db.run("DELETE FROM clan_events WHERE clan_id = ?", [clan.id]);
    return null;
  }
  if (clan.owner_id === userId) {
    const heir = [...remaining].sort((a, b) => b.xp - a.xp)[0];
    await ctx.db.run("UPDATE clans SET owner_id = ? WHERE id = ?", [heir.user_id, clan.id]);
    await ctx.db.run("UPDATE profiles SET member_role = NULL WHERE id = ?", [heir.id]);
  }
  return null;
}
async function questFor(ctx, clanId, weekKey) {
  return ctx.db.first(
    "SELECT * FROM clan_quests WHERE clan_id = ? AND week_key = ?",
    [clanId, weekKey]
  );
}
async function questProgressRows(ctx, questId) {
  return ctx.db.all(
    `SELECT user_id, contribution, user_name, user_level, user_ascension
       FROM clan_quest_progress WHERE quest_id = ? ORDER BY contribution DESC`,
    [questId]
  );
}
async function questViewFor(ctx, clanId, meId) {
  const quest = await questFor(ctx, clanId, isoWeekKey(todayKey()));
  if (!quest) return null;
  const rows = await questProgressRows(ctx, quest.id);
  return {
    questId: quest.id,
    title: quest.title,
    detail: quest.detail,
    metric: quest.metric,
    target: quest.target,
    pooled: rows.reduce((n, r) => n + r.contribution, 0),
    status: quest.status,
    rewardXp: quest.reward_xp,
    weekKey: quest.week_key,
    isComplete: quest.status === "complete",
    contributors: rows.slice(0, 12).map((r) => ({
      userId: r.user_id,
      name: r.user_name,
      level: r.user_level,
      ascension: r.user_ascension,
      contribution: r.contribution,
      isMe: r.user_id === meId
    }))
  };
}
async function questView(ctx) {
  if (!ctx.userId) return null;
  const me3 = await profileForUser(ctx, ctx.userId);
  if (!me3?.clan_id) return null;
  return questViewFor(ctx, me3.clan_id, ctx.userId);
}
async function activeQuest(ctx) {
  return questView(ctx);
}
async function ensureActiveQuest(ctx) {
  const userId = requireUser(ctx);
  const me3 = await profileForUser(ctx, userId);
  if (!me3?.clan_id) return null;
  const weekKey = isoWeekKey(todayKey());
  const existing = await questFor(ctx, me3.clan_id, weekKey);
  if (existing) return existing.id;
  const clan = await clanFor(ctx, me3.clan_id);
  if (!clan) return null;
  const def = questDefForWeek(weekKey);
  const memberCount = (await membersOf(ctx, clan.id)).length;
  const id = crypto.randomUUID();
  await ctx.db.run(
    `INSERT INTO clan_quests
       (id, clan_id, week_key, title, detail, metric, target, reward_xp, status, created_by, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, NULL)`,
    [
      id,
      clan.id,
      weekKey,
      def.title,
      def.detail,
      def.metric,
      questTargetFor(def, memberCount),
      def.rewardXp,
      userId,
      Date.now()
    ]
  );
  return id;
}
async function reportContribution(ctx, args) {
  if (!ctx.userId) return null;
  const me3 = await profileForUser(ctx, ctx.userId);
  if (!me3?.clan_id) return null;
  const quest = await questFor(ctx, me3.clan_id, isoWeekKey(todayKey()));
  if (!quest || quest.status !== "active") return null;
  const value = quest.metric === "lessons" ? args?.lessons : quest.metric === "xp" ? args?.xp : args?.flawless;
  const amount = Math.max(0, Math.floor(typeof value === "number" && Number.isFinite(value) ? value : 0));
  if (amount <= 0) return null;
  const existing = await ctx.db.first(
    "SELECT contribution FROM clan_quest_progress WHERE quest_id = ? AND user_id = ?",
    [quest.id, ctx.userId]
  );
  if (existing && existing.contribution >= amount) return null;
  await ctx.db.run(
    `INSERT INTO clan_quest_progress
       (quest_id, user_id, contribution, updated_at, user_name, user_level, user_ascension)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (quest_id, user_id) DO UPDATE SET
       contribution = excluded.contribution,
       updated_at = excluded.updated_at,
       user_level = excluded.user_level,
       user_ascension = excluded.user_ascension`,
    [quest.id, ctx.userId, amount, Date.now(), me3.name, me3.level, me3.ascension]
  );
  const rows = await questProgressRows(ctx, quest.id);
  const pooled = rows.reduce((n, r) => n + r.contribution, 0);
  if (pooled >= quest.target) {
    await ctx.db.run("UPDATE clan_quests SET status = 'complete', completed_at = ? WHERE id = ?", [
      Date.now(),
      quest.id
    ]);
    await postEvent(
      ctx,
      quest.clan_id,
      ctx.userId,
      "quest-done",
      `${me3.name} completed the last leg of \u201C${quest.title}\u201D`
    );
  }
  return null;
}
async function questClaims(ctx) {
  if (!ctx.userId) return [];
  return ctx.db.all(
    "SELECT week_key AS weekKey, xp FROM clan_quest_claims WHERE user_id = ? ORDER BY claimed_at DESC LIMIT 60",
    [ctx.userId]
  );
}
async function claimQuestReward(ctx) {
  const userId = requireUser(ctx);
  const me3 = await profileForUser(ctx, userId);
  if (!me3?.clan_id) throw new Error("Join a guild first.");
  const weekKey = isoWeekKey(todayKey());
  const quest = await questFor(ctx, me3.clan_id, weekKey);
  if (!quest || quest.status !== "complete") throw new Error("This week's quest is not complete yet.");
  const claimed = await ctx.db.first(
    "SELECT week_key FROM clan_quest_claims WHERE user_id = ? AND week_key = ?",
    [userId, weekKey]
  );
  if (claimed) throw new Error("You already claimed this reward.");
  const contributors = await questProgressRows(ctx, quest.id);
  const share = Math.floor(quest.reward_xp / Math.max(1, contributors.length));
  await ctx.db.run(
    "INSERT INTO clan_quest_claims (user_id, week_key, xp, claimed_at) VALUES (?, ?, ?, ?)",
    [userId, weekKey, share, Date.now()]
  );
  return share;
}
async function setRole(ctx, args) {
  const meId = requireUser(ctx);
  const me3 = await profileForUser(ctx, meId);
  if (!me3?.clan_id) throw new Error("You're not in a guild.");
  const clan = await clanFor(ctx, me3.clan_id);
  if (!clan) throw new Error("That guild no longer exists.");
  if (clan.owner_id !== meId) throw new Error("Only the founder can manage roles.");
  const targetId = String(args?.userId ?? "");
  if (targetId === meId) throw new Error("You already own this guild.");
  const target = await profileForUser(ctx, targetId);
  if (!target || target.clan_id !== clan.id) throw new Error("That learner isn't in your guild.");
  if (args?.officer === true) {
    await ctx.db.run("UPDATE profiles SET member_role = 'officer' WHERE id = ?", [target.id]);
    await postEvent(ctx, clan.id, meId, "promotion", `${target.name} was promoted to officer`);
  } else {
    await ctx.db.run("UPDATE profiles SET member_role = NULL WHERE id = ?", [target.id]);
    await postEvent(ctx, clan.id, meId, "demotion", `${target.name} is a member again`);
  }
  return null;
}
async function kick(ctx, args) {
  const meId = requireUser(ctx);
  const me3 = await profileForUser(ctx, meId);
  if (!me3?.clan_id) throw new Error("You're not in a guild.");
  const clan = await clanFor(ctx, me3.clan_id);
  if (!clan) throw new Error("That guild no longer exists.");
  const myRole = roleOf(me3, clan);
  if (myRole === "member") throw new Error("Only the founder or an officer can do that.");
  const targetId = String(args?.userId ?? "");
  const target = await profileForUser(ctx, targetId);
  if (!target || target.clan_id !== clan.id) throw new Error("That learner isn't in your guild.");
  if (targetId === meId) throw new Error("Use \u201CLeave guild\u201D instead.");
  if (roleOf(target, clan) !== "member" && myRole !== "owner") {
    throw new Error("Officers can only remove regular members.");
  }
  await ctx.db.run("UPDATE profiles SET clan_id = NULL, member_role = NULL WHERE id = ?", [target.id]);
  await postEvent(ctx, clan.id, meId, "kick", `${target.name} was removed from the guild`);
  return null;
}
async function feed(ctx) {
  if (!ctx.userId) return [];
  const me3 = await profileForUser(ctx, ctx.userId);
  if (!me3?.clan_id) return [];
  const events = await ctx.db.all(
    `SELECT id, actor_id, kind, text, created_at FROM clan_events
      WHERE clan_id = ? ORDER BY created_at DESC LIMIT 15`,
    [me3.clan_id]
  );
  const actors = /* @__PURE__ */ new Map();
  const out = [];
  for (const event of events) {
    let actor = actors.get(event.actor_id);
    if (!actor) {
      const profile = await profileForUser(ctx, event.actor_id);
      actor = profile ? { name: profile.name, ascension: profile.ascension, level: profile.level } : { name: "A former member", ascension: null, level: 1 };
      actors.set(event.actor_id, actor);
    }
    out.push({
      _id: event.id,
      kind: event.kind,
      text: event.text,
      createdAt: event.created_at,
      actorName: actor.name,
      actorAscension: actor.ascension,
      actorLevel: actor.level,
      isMe: event.actor_id === ctx.userId
    });
  }
  return out;
}

// sites/api/leaderboard.ts
var SCAN_CAP = 500;
var COLUMN = {
  week: "xp_week",
  month: "xp_month",
  all: "xp"
};
var COLUMNS2 = `id, user_id, name, xp, xp_week, xp_month, level, ascension, title,
  streak_current, streak_longest, lessons_done`;
function bracketOf(raw) {
  return raw === "week" || raw === "month" ? raw : "all";
}
async function topProfiles(ctx, bracket, cap) {
  return ctx.db.all(
    `SELECT ${COLUMNS2} FROM profiles ORDER BY ${COLUMN[bracket]} DESC, updated_at ASC LIMIT ?`,
    [cap]
  );
}
async function aheadOf(ctx, bracket, xp) {
  const rows = await ctx.db.all(
    `SELECT id FROM profiles WHERE ${COLUMN[bracket]} > ? LIMIT ?`,
    [xp, SCAN_CAP]
  );
  return rows.length < SCAN_CAP ? rows.length : null;
}
function xpOf(profile, bracket) {
  if (bracket === "week") return profile.xp_week;
  if (bracket === "month") return profile.xp_month;
  return profile.xp;
}
function toRow(profile, rank, bracket, meId) {
  return {
    rank,
    profileId: profile.id,
    name: profile.name,
    xp: xpOf(profile, bracket),
    level: profile.level,
    ascension: profile.ascension,
    title: profile.title,
    streak: profile.streak_current,
    isMe: meId !== null && profile.user_id === meId
  };
}
async function top(ctx, args) {
  const bracket = bracketOf(args?.bracket);
  const limit = typeof args?.limit === "number" && Number.isFinite(args.limit) ? args.limit : 20;
  const cap = Math.min(Math.max(Math.floor(limit), 1), 100);
  const meId = ctx.userId;
  const rows = await topProfiles(ctx, bracket, cap);
  const board = rows.map((row, i) => toRow(row, i + 1, bracket, meId));
  let me3 = null;
  if (meId) {
    const mine3 = board.find((row) => row.isMe);
    if (mine3) {
      me3 = mine3;
    } else {
      const profile = await ctx.db.first(
        `SELECT ${COLUMNS2} FROM profiles WHERE user_id = ?`,
        [meId]
      );
      if (profile) {
        const ahead = await aheadOf(ctx, bracket, xpOf(profile, bracket));
        me3 = toRow(profile, ahead === null ? null : ahead + 1, bracket, meId);
      }
    }
  }
  return { bracket, board, me: me3 };
}
async function podium(ctx) {
  const meId = ctx.userId;
  const out = { week: [], month: [], all: [] };
  for (const bracket of ["week", "month", "all"]) {
    const rows = await topProfiles(ctx, bracket, 3);
    out[bracket] = rows.map((row, i) => toRow(row, i + 1, bracket, meId));
  }
  return out;
}

// sites/api/preferences.ts
async function get2(ctx) {
  if (!ctx.userId) return null;
  const row = await ctx.db.first(
    "SELECT theme_style FROM preferences WHERE user_id = ?",
    [ctx.userId]
  );
  return { themeStyle: row?.theme_style === "minimal" ? "minimal" : row?.theme_style === "glass" ? "glass" : null };
}
async function save2(ctx, args) {
  if (!ctx.userId) return null;
  const themeStyle = args?.themeStyle === "minimal" ? "minimal" : args?.themeStyle === "glass" ? "glass" : null;
  if (!themeStyle) throw new Error("Unknown appearance style.");
  await ctx.db.run(
    `INSERT INTO preferences (user_id, theme_style, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET theme_style = excluded.theme_style, updated_at = excluded.updated_at`,
    [ctx.userId, themeStyle, Date.now()]
  );
  return null;
}

// src/data/bug-taxonomy.ts
var BUG_TAXONOMY = [
  {
    code: "RC",
    label: "Race condition / concurrency",
    blurb: "Timing decides the outcome \u2014 stale responses overwrite fresh ones, or two writes interleave."
  },
  {
    code: "EC",
    label: "Missing or mishandled edge case",
    blurb: "The happy path works; empty input, zero, or a missing field does not."
  },
  {
    code: "HA",
    label: "Invented / hallucinated API",
    blurb: "The method or option does not exist \u2014 it fails the moment the line runs."
  },
  {
    code: "ID",
    label: "Insecure default",
    blurb: "Permissive CORS, a disabled certificate check, weak crypto, secrets reaching a bundle."
  },
  {
    code: "SL",
    label: "Silently wrong logic",
    blurb: "It runs cleanly and looks plausible, but the behaviour is wrong on real input."
  },
  {
    code: "CX",
    label: "Bad complexity",
    blurb: "Correct results, accidentally quadratic \u2014 the cost grows faster than the input."
  },
  {
    code: "SC",
    label: "Scope creep / unrelated change",
    blurb: "The diff quietly touches files or behaviour the task never mentioned."
  },
  {
    code: "TG",
    label: "Missing or vacuous test",
    blurb: 'The change ships without a test \u2014 or with a "test" that asserts nothing.'
  },
  {
    code: "NM",
    label: "Misleading name / comment drift",
    blurb: "The identifier or comment now says something false about behaviour."
  },
  {
    code: "DL",
    label: "Leftover debug / dead code",
    blurb: "A stray log, commented-out block, or dead flag. Blocks only when it leaks data or bypasses a guard."
  }
];
var BY_CODE = new Map(BUG_TAXONOMY.map((e) => [e.code, e]));
var EXECUTED_CODES = BUG_TAXONOMY.filter(
  (e) => !e.reviewOnly
).map((e) => e.code);
var REVIEW_CODES = BUG_TAXONOMY.map((e) => e.code);

// src/lib/localStore.ts
var import_react = __toESM(require_react(), 1);
function createLocalStore(key, parse2, serialize = JSON.stringify) {
  const listeners = /* @__PURE__ */ new Set();
  const emit = () => {
    for (const fn of listeners) fn();
  };
  const read = () => {
    try {
      return parse2(localStorage.getItem(key));
    } catch {
      return parse2(null);
    }
  };
  return {
    key,
    get: read,
    set(value) {
      try {
        localStorage.setItem(key, serialize(value));
      } catch {
      }
      emit();
    },
    reset() {
      try {
        localStorage.removeItem(key);
      } catch {
      }
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
function readRecord(raw) {
  if (raw === null || raw === "") return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed;
}

// src/lib/progress.ts
var KEY = "clr-progress-v2";
var LEGACY_KEYS = ["clr-progress-v1", "clr-progress"];
function sanitizeScores(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw)) {
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(n)) out[key] = Math.min(1, Math.max(0, n));
  }
  return out;
}
function migrateV1(completed) {
  const out = {};
  for (const [k, v] of Object.entries(completed)) {
    out[k.includes("!") ? k : k + "!"] = v;
  }
  return out;
}
function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function parseProgress(raw) {
  try {
    if (raw !== null) {
      const stored = readRecord(raw);
      if (stored.completed !== void 0) return { completed: sanitizeScores(stored.completed) };
    }
    for (const legacy of LEGACY_KEYS) {
      const old = readRaw(legacy);
      if (old === null) continue;
      const stored = readRecord(old);
      if (stored.completed !== void 0) {
        return { completed: migrateV1(sanitizeScores(stored.completed)) };
      }
    }
  } catch {
  }
  return { completed: {} };
}
var store = createLocalStore(KEY, parseProgress);

// src/lib/milestones.ts
var MILESTONES = [
  {
    id: "m-shell",
    title: "Semantic Page Shell",
    phase: "Phase 1 \xB7 Structure",
    icon: "\u2B1A",
    brief: "Start the project as a real document: landmarks, a heading hierarchy that makes sense, and no accessibility shortcuts.",
    skills: ["web/html-semantic", "web/box-model-deep"],
    deliverables: [
      "A working index.html with header, nav, main and footer landmarks",
      "Exactly one h1, with no skipped heading levels below it",
      "Descriptive alt text on every image and discernible text on every link",
      "Opens in a browser with an empty console"
    ],
    artifact: {
      task: "Convert the shell to semantic landmarks and add a skip link",
      noteMust: "the missed heading level or focus trap the agent introduced",
      testCatches: "a DOM assertion (heading order, skip-link target exists)"
    },
    xp: 150,
    badge: {
      id: "ms-shell",
      icon: "\u2B1A",
      title: "Foundation Layer",
      description: "Shipped a semantic page shell for the portfolio."
    },
    proof: {
      kind: "preview",
      brief: "Build the document skeleton here first \u2014 it's graded on structure, so get the landmarks right before styling anything.",
      spec: {
        goal: "Write a header containing a nav, a main containing an h1, and a footer \u2014 all as direct children of the body.",
        brief: "The bones of your portfolio. Structure is verified; styling comes in the next milestone.",
        html: `<!-- Build the page shell:
       <header> with a <nav> inside
       <main> with one <h1>
       <footer>
     All three are direct children of <body>. -->

`,
        requires: ["body > header", "header > nav", "main > h1", "body > footer"]
      }
    }
  },
  {
    id: "m-style",
    title: "Design System Layer",
    phase: "Phase 2 \xB7 Style",
    icon: "\u25E7",
    brief: "Style the shell with utilities and your own tokens: responsive from 320px up, legible in dark mode, and every interactive element visibly focusable.",
    skills: [
      "tailwind/utility-first",
      "tailwind/layout-flex-grid",
      "tailwind/responsive-dark",
      "tailwind/design-tokens"
    ],
    deliverables: [
      "Brand colours, fonts and shadows defined as tokens in tailwind.config",
      "A responsive card grid: one column on phones, three from md upward",
      "Every interactive element has a focus-visible treatment",
      "Dark mode is readable \u2014 AA contrast on body copy in both themes",
      "Spacing comes from the scale, with no one-off pixel values"
    ],
    artifact: {
      task: "Apply the token system to the card grid, responsive from 320px",
      noteMust: "the breakpoint or dark-mode regression the agent left",
      testCatches: "a selector assertion (sm/md classes, dark variant present)"
    },
    xp: 250,
    badge: {
      id: "ms-style",
      icon: "\u25E7",
      title: "Design System",
      description: "Styled the portfolio with a token-based utility system."
    },
    proof: {
      kind: "preview",
      brief: "Rebuild your card grid in isolation and apply the layout, dark-mode and focus classes. The preview re-renders as you type.",
      spec: {
        goal: "Give .grid the classes grid, gap-6 and md:grid-cols-3, add at least two .card children, apply dark:bg-slate-900 to the cards, and focus-visible:ring-2 to the button.",
        brief: "The responsive, dark-mode-aware card grid \u2014 graded on the classes you actually apply.",
        framework: "tailwind",
        html: `<main class="min-h-screen bg-white p-8 dark:bg-slate-950">
  <div class="grid mx-auto max-w-4xl">
    <article class="card rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="font-semibold">Project one</h2>
      <p class="text-slate-600">What it does and why it exists.</p>
      <button class="mt-4 rounded-full px-4 py-2">View</button>
    </article>
    <article class="card rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="font-semibold">Project two</h2>
      <p class="text-slate-600">The stack you chose and why.</p>
      <button class="mt-4 rounded-full px-4 py-2">View</button>
    </article>
  </div>
</main>`,
        requires: [
          ".grid.md\\:grid-cols-3",
          ".grid.gap-6",
          ".card.dark\\:bg-slate-900",
          "button.focus-visible\\:ring-2"
        ]
      }
    }
  },
  {
    id: "m-interactive",
    title: "Interactive Component",
    phase: "Phase 3 \xB7 Interactivity",
    icon: "\u25C8",
    brief: "Add the first piece of real behaviour: a stateful component the visitor can actually operate, with correct immutable updates underneath.",
    skills: [
      "react/jsx-vdom",
      "react/props-state",
      "react/hooks-effect",
      "web/dom-events"
    ],
    deliverables: [
      "One React component with local state",
      "A controlled input wired to value + onChange",
      "A list rendered with stable keys, not array indexes",
      "Every immutable update goes through a copied data structure",
      "No React warnings or key errors in the console"
    ],
    artifact: {
      task: "Add immutable add/toggle/remove plus a controlled input",
      noteMust: "the mutation, stale closure, or key bug the agent wrote",
      testCatches: "the unit test that fails on the agent's draft (a mutation incident)"
    },
    xp: 300,
    badge: {
      id: "ms-interactive",
      icon: "\u25C8",
      title: "Interactive",
      description: "Built a stateful component with correct immutable updates."
    },
    proof: {
      kind: "code",
      brief: "The logic inside that component, isolated. Immutable add / toggle / remove \u2014 the part that breaks in real apps.",
      starter: `// The data logic behind your interactive component.
// Every operation must return a NEW array and leave the input untouched.
function add(todos, text) {
  // TODO: return a new array with { id, text, done: false } appended
  return todos;
}

function toggle(todos, id) {
  // TODO: return a new array with the matching todo's done flipped
  return todos;
}

function remove(todos, id) {
  // TODO: return a new array with the matching todo removed
  return todos;
}

const start = [{ id: 1, text: "read", done: false }];

const added = add(start, "ship");
console.log("after add:", added.length, added[1] && added[1].text);
console.log("original untouched:", start.length);

const toggled = toggle(added, 1);
console.log("toggled:", toggled[0].done, "untouched:", added[0].done);

const removed = remove(toggled, 1);
console.log("after remove:", removed.length, removed.map((t) => t.text).join(","));`,
      check: {
        expr: 'output.includes("after add: 2 ship") && output.includes("original untouched: 1") && output.includes("toggled: true untouched: false") && output.includes("after remove: 1 ship")',
        hint: "Spread the array for add, map for toggle, filter for remove. The original array must never change.",
        hints: [
          { tier: 1, text: "Returning the input means nothing changed. Each function hands back a brand-new array." },
          { tier: 2, text: "add \u2192 `[...todos, newTodo]`. toggle \u2192 `map` with a spread on the match. remove \u2192 `filter` by id." },
          { tier: 3, text: "toggle: `todos.map((t) => t.id === id ? { ...t, done: !t.done } : t)`." }
        ]
      }
    }
  },
  {
    id: "m-data",
    title: "Live Data Layer",
    phase: "Phase 4 \xB7 Data",
    icon: "\u25C9",
    brief: "Make the portfolio dynamic: pull real content from an API and handle every state a network can put you in.",
    skills: [
      "api/http-verbs",
      "api/fetch-async",
      "api/loading-errors",
      "api/abort-races"
    ],
    deliverables: [
      "Data loaded with fetch, with res.ok checked before parsing",
      "All four states handled: loading, error, empty and ready",
      "Cached content stays on screen when a background refetch fails",
      "In-flight requests aborted on unmount",
      "Failures show human copy with a retry, never a raw error string"
    ],
    artifact: {
      task: "Fetch content and handle loading/error/empty/ready, aborting on unmount",
      noteMust: "the unawaited value, missing res.ok check, or abort gap",
      testCatches: "the test that reproduces the stale-or-error path"
    },
    xp: 300,
    badge: {
      id: "ms-data",
      icon: "\u25C9",
      title: "Live Data",
      description: "Wired the portfolio to a real API with all four states handled."
    },
    proof: {
      kind: "code",
      brief: "The render decision for your data-backed view. Getting the order right is what stops a failed refetch from blanking the screen.",
      starter: `// Decide what a data-backed view should render.
// Return exactly one of: "loading" | "error" | "empty" | "ready".
//
// Rules:
//  - no data yet + an error        \u2192 "error"
//  - no data yet + still loading   \u2192 "loading"
//  - data present but empty ([])   \u2192 "empty"
//  - data present and non-empty    \u2192 "ready"
//  - a background refetch (loading OR error) with data already
//    present must still render "ready" \u2014 never blank the screen.
function viewState({ loading, error, data }) {
  // TODO
  return "ready";
}

console.log("first load:", viewState({ loading: true, error: null, data: null }));
console.log("hard error:", viewState({ loading: false, error: "boom", data: null }));
console.log("empty result:", viewState({ loading: false, error: null, data: [] }));
console.log("ready:", viewState({ loading: false, error: null, data: [1] }));

const cached = [1];
console.log("refetching, cached:", viewState({ loading: true, error: null, data: cached }));
console.log("refetch failed, cached:", viewState({ loading: false, error: "boom", data: cached }));`,
      check: {
        expr: 'output.includes("first load: loading") && output.includes("hard error: error") && output.includes("empty result: empty") && output.includes("ready: ready") && output.includes("refetching, cached: ready") && output.includes("refetch failed, cached: ready")',
        hint: "Check `data` first: with no data, an error wins over loading. With data, only an empty array changes the answer \u2014 a failed refetch keeps showing what you have.",
        hints: [
          { tier: 1, text: "The presence of `data` is the first fork. Everything else branches from there." },
          { tier: 2, text: `No data: return "error" if there's an error, otherwise "loading". Data present: "empty" when the length is 0, otherwise "ready".` },
          { tier: 3, text: '`if (!data) return error ? "error" : "loading"; return data.length ? "ready" : "empty";`' }
        ]
      }
    }
  },
  {
    id: "m-persist",
    title: "Persistent State",
    phase: "Phase 5 \xB7 State",
    icon: "\u27F3",
    brief: "Give the visitor something that survives a refresh \u2014 theme choice, saved items, a draft \u2014 via a store you control rather than prop-drilling.",
    skills: [
      "state/state-shapes",
      "state/usereducer",
      "state/external-stores"
    ],
    deliverables: [
      "An external store exposing getState / setState / subscribe",
      "State persisted to localStorage and restored on load",
      "setState bails out when nothing actually changed",
      "Components unsubscribe on unmount \u2014 no leaked listeners",
      "A refresh leaves the UI exactly as the visitor left it"
    ],
    artifact: {
      task: "Add a store with getState/setState/subscribe, persisted to localStorage",
      noteMust: "the needless notify, overwritten persist, or lost unsubscribe",
      testCatches: "the test that fails when setState over-notifies"
    },
    xp: 350,
    badge: {
      id: "ms-persist",
      icon: "\u27F3",
      title: "Persistent",
      description: "Built an external store that survives a refresh."
    },
    proof: {
      kind: "code",
      brief: "The store underneath your persistence layer: merge, persist, notify \u2014 and only when something genuinely changed.",
      starter: `// A store that persists through an injected storage adapter.
function createStore(initial, storage) {
  let state = initial;
  const listeners = new Set();

  return {
    getState: () => state,

    setState(partial) {
      // TODO: merge \`partial\` into state, write it through storage.set,
      // and notify listeners ONLY when a value actually changed.
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

const writes = [];
const storage = { set: (json) => writes.push(json) };

const store = createStore({ count: 0 }, storage);
let notifications = 0;
const unsubscribe = store.subscribe(() => {
  notifications += 1;
});

store.setState({ count: 1 });
store.setState({ count: 1 }); // identical \u2014 must not notify or persist
store.setState({ count: 2 });

unsubscribe();
store.setState({ count: 3 }); // nobody is listening now

console.log("notifications:", notifications);
console.log("storage writes:", writes.length);
console.log("final count:", store.getState().count);`,
      check: {
        expr: 'output.includes("notifications: 2") && output.includes("storage writes: 3") && output.includes("final count: 3")',
        hint: "Two real changes call the listeners twice. Every real change persists, including the last one \u2014 it has no listener, but it still belongs in storage, so expect three writes. The identical write touches neither.",
        hints: [
          { tier: 1, text: "Build the next state, compare it with the current one, and only then do the storing and notifying." },
          { tier: 2, text: "Compare the merged result against the existing state before committing: if every field matches, return early." },
          { tier: 3, text: "`const next = { ...state, ...partial }; if (JSON.stringify(next) === JSON.stringify(state)) return; state = next; storage.set(JSON.stringify(next)); for (const fn of listeners) fn();`" }
        ]
      }
    }
  },
  {
    id: "m-ship",
    title: "Ship It",
    phase: "Phase 6 \xB7 Delivery",
    icon: "\u25B2",
    brief: "Publish it. A public repository with a history that reads like a professional's, a README a stranger can follow, and a live URL you can send to anyone.",
    skills: ["git/git-basics", "git/git-branches", "git/git-workflow-lab"],
    deliverables: [
      "A public repository with a real commit history, not one bulk commit",
      "Work done on a feature branch and merged \u2014 not straight to main",
      "A README covering what it is, why it exists and how to run it",
      "Deployed at a live URL that loads without errors",
      "That URL is on your CV, your GitHub profile and your LinkedIn"
    ],
    artifact: {
      task: "Generate the README and a changelog from the commit history",
      noteMust: "the fabricated claim or dropped evidence in the agent's text",
      testCatches: "a truthfulness test (claims map to commits or scripts that exist)"
    },
    xp: 400,
    badge: {
      id: "ms-ship",
      icon: "\u25B2",
      title: "Shipped",
      description: "Deployed the portfolio project and published the repo."
    },
    proof: {
      kind: "code",
      brief: "Your commit history is part of the work you're showing. Grade a sample the way a reviewer would.",
      starter: `// A reviewer skims your log before they read your code.
// A message is WELL-FORMED when it has at least 3 space-separated
// words AND contains no placeholder word (case-insensitive, ignoring
// a trailing colon) from PLACEHOLDERS.
const PLACEHOLDERS = [
  "wip", "update", "final", "stuff", "temp", "asdf", "asdfasdf",
  "todo", "misc", "changes", "fixes",
];

const COMMITS = [
  "add hero section markup",
  "fix: guard against empty data in the list",
  "wip",
  "update",
  "feat: add project milestones page",
  "final final v2",
];

function qualityCount(messages) {
  // TODO: count how many messages are well-formed.
  return 0;
}

console.log("well-formed commits:", qualityCount(COMMITS));
console.log("of total:", COMMITS.length);`,
      check: {
        expr: 'output.includes("well-formed commits: 3") && output.includes("of total: 6")',
        hint: "Exactly three of the six read like a professional history: two are placeholders and one is too short.",
        hints: [
          { tier: 1, text: "Two independent conditions: word count, and placeholder-free. A message must satisfy both." },
          { tier: 2, text: "Split on whitespace for the word count. For placeholders, lowercase each word and strip a trailing colon before comparing." },
          { tier: 3, text: '`messages.filter((m) => { const words = m.trim().split(/\\s+/); if (words.length < 3) return false; return !words.some((w) => PLACEHOLDERS.includes(w.toLowerCase().replace(/:$/, ""))); }).length`' }
        ]
      }
    }
  }
];
var PORTFOLIO_XP = MILESTONES.reduce((sum, m) => sum + m.xp, 0);
function mergeClaims(a, b) {
  const out = { ...a };
  for (const [id, claim] of Object.entries(b)) {
    const mine3 = out[id];
    if (!mine3) {
      out[id] = claim;
      continue;
    }
    const claimTicks = claim.deliverables.length;
    const mineTicks = mine3.deliverables.length;
    if (claimTicks > mineTicks) {
      out[id] = claim;
    } else if (claimTicks === mineTicks) {
      const claimHasArtifacts = Boolean(claim.artifacts);
      const mineHasArtifacts = Boolean(mine3.artifacts);
      if (claimHasArtifacts !== mineHasArtifacts) {
        if (claimHasArtifacts) out[id] = claim;
      } else if (claim.at < mine3.at) {
        out[id] = claim;
      }
    }
  }
  return out;
}

// sites/api/progress.ts
var MAX_PROGRESS_ENTRIES = 2e3;
var MAX_CLAIMS = 64;
var MAX_ATTEMPTS = 2e3;
var MAX_KEY_LENGTH = 120;
var REVIEW_CODES2 = ["RC", "EC", "HA", "ID", "SL", "CX", "SC", "TG", "NM", "DL"];
var MAX_ARTIFACT_NOTE = 4e3;
var MAX_ARTIFACT_CODE = 4e3;
var MAX_ARTIFACT_TASK = 300;
function sanitizeProgress(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_PROGRESS_ENTRIES) break;
    if (key.length > MAX_KEY_LENGTH) continue;
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(n)) out[key] = Math.min(1, Math.max(0, n));
  }
  return out;
}
function sanitizeArtifacts(raw) {
  if (!raw || typeof raw !== "object") return void 0;
  const { task, note, noteCategory, proof } = raw;
  if (typeof task !== "string" || typeof note !== "string") return void 0;
  if (typeof noteCategory !== "string" || !REVIEW_CODES2.includes(noteCategory)) return void 0;
  if (!proof || typeof proof !== "object") return void 0;
  const { buggy, test, fixed } = proof;
  const code = (value) => typeof value === "string" && value.trim().length > 0 ? value.slice(0, MAX_ARTIFACT_CODE) : null;
  const b = code(buggy);
  const t = code(test);
  const f = code(fixed);
  if (!b || !t || !f) return void 0;
  const trimmed = note.slice(0, MAX_ARTIFACT_NOTE);
  if (trimmed.trim().length === 0) return void 0;
  return {
    task: task.slice(0, MAX_ARTIFACT_TASK),
    note: trimmed,
    noteCategory,
    proof: { buggy: b, test: t, fixed: f }
  };
}
function sanitizeClaims(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, value] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_CLAIMS) break;
    if (id.length > MAX_KEY_LENGTH) continue;
    if (!value || typeof value !== "object") continue;
    const { at, deliverables, artifacts } = value;
    if (typeof at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(at)) continue;
    if (!Array.isArray(deliverables)) continue;
    const ticks = [
      ...new Set(
        deliverables.map((n) => typeof n === "number" ? n : Number(n)).filter((n) => Number.isInteger(n) && n >= 0)
      )
    ].sort((a, b) => a - b);
    if (ticks.length === 0) continue;
    const clean = sanitizeArtifacts(artifacts);
    out[id] = clean ? { at, deliverables: ticks, artifacts: clean } : { at, deliverables: ticks };
  }
  return out;
}
function sanitizeAttempts(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_ATTEMPTS) break;
    if (key.length === 0 || key.length > MAX_KEY_LENGTH) continue;
    if (!value || typeof value !== "object") continue;
    const { first, best, attempts, at, firstAt } = value;
    const f = typeof first === "number" ? first : Number(first);
    const b = typeof best === "number" ? best : Number(best);
    const n = typeof attempts === "number" ? attempts : Number(attempts);
    const t = typeof at === "number" ? at : Number(at);
    const fa = typeof firstAt === "number" ? firstAt : Number(firstAt);
    if (!Number.isFinite(f) || !Number.isFinite(b)) continue;
    if (!Number.isFinite(n) || n < 1) continue;
    const last = Number.isFinite(t) ? t : 0;
    out[key] = {
      first: Math.min(1, Math.max(0, f)),
      best: Math.min(1, Math.max(0, b)),
      attempts: Math.min(1e5, Math.floor(n)),
      at: last,
      firstAt: Number.isFinite(fa) ? fa : last
    };
  }
  return out;
}
function mergeAttempts(a, b) {
  const out = { ...a };
  for (const [key, next] of Object.entries(b)) {
    const mine3 = out[key];
    if (!mine3) {
      out[key] = next;
      continue;
    }
    out[key] = {
      first: next.firstAt < mine3.firstAt ? next.first : mine3.first,
      best: Math.max(mine3.best, next.best),
      attempts: Math.max(mine3.attempts, next.attempts),
      at: Math.max(mine3.at, next.at),
      firstAt: Math.min(mine3.firstAt, next.firstAt)
    };
  }
  return out;
}
async function rowFor(db, userId) {
  return db.first("SELECT data, claims, attempts FROM progress WHERE user_id = ?", [
    userId
  ]);
}
async function ensureRow(db, userId) {
  await db.run(
    "INSERT OR IGNORE INTO progress (user_id, data, claims, attempts, updated_at) VALUES (?, '{}', '{}', '{}', ?)",
    [userId, Date.now()]
  );
}
function parse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
async function get3(ctx) {
  if (!ctx.userId) return null;
  const row = await rowFor(ctx.db, ctx.userId);
  return sanitizeProgress(parse(row?.data ?? "{}", {}));
}
async function getClaims(ctx) {
  if (!ctx.userId) return null;
  const row = await rowFor(ctx.db, ctx.userId);
  return sanitizeClaims(parse(row?.claims ?? "{}", {}));
}
async function getAttempts(ctx) {
  if (!ctx.userId) return null;
  const row = await rowFor(ctx.db, ctx.userId);
  return sanitizeAttempts(parse(row?.attempts ?? "{}", {}));
}
async function save3(ctx, args) {
  if (!ctx.userId) return null;
  const incoming = sanitizeProgress(args?.data);
  const row = await rowFor(ctx.db, ctx.userId);
  if (!row) {
    await ctx.db.run(
      "INSERT INTO progress (user_id, data, claims, attempts, updated_at) VALUES (?, ?, '{}', '{}', ?)",
      [ctx.userId, JSON.stringify(incoming), Date.now()]
    );
    return null;
  }
  const stored = sanitizeProgress(parse(row.data, {}));
  for (const [key, score] of Object.entries(incoming)) {
    stored[key] = Math.max(stored[key] ?? 0, score);
  }
  await ctx.db.run("UPDATE progress SET data = ?, updated_at = ? WHERE user_id = ?", [
    JSON.stringify(stored),
    Date.now(),
    ctx.userId
  ]);
  return null;
}
async function saveClaims(ctx, args) {
  if (!ctx.userId) return null;
  const incoming = sanitizeClaims(args?.claims);
  if (Object.keys(incoming).length === 0) return null;
  await ensureRow(ctx.db, ctx.userId);
  const row = await rowFor(ctx.db, ctx.userId);
  const stored = sanitizeClaims(parse(row?.claims ?? "{}", {}));
  await ctx.db.run("UPDATE progress SET claims = ?, updated_at = ? WHERE user_id = ?", [
    JSON.stringify(mergeClaims(stored, incoming)),
    Date.now(),
    ctx.userId
  ]);
  return null;
}
async function saveAttempts(ctx, args) {
  if (!ctx.userId) return null;
  const incoming = sanitizeAttempts(args?.attempts);
  if (Object.keys(incoming).length === 0) return null;
  await ensureRow(ctx.db, ctx.userId);
  const row = await rowFor(ctx.db, ctx.userId);
  const stored = sanitizeAttempts(parse(row?.attempts ?? "{}", {}));
  await ctx.db.run("UPDATE progress SET attempts = ?, updated_at = ? WHERE user_id = ?", [
    JSON.stringify(mergeAttempts(stored, incoming)),
    Date.now(),
    ctx.userId
  ]);
  return null;
}
async function wipe(ctx) {
  const userId = requireUser(ctx);
  await ctx.db.run("DELETE FROM progress WHERE user_id = ?", [userId]);
  await ctx.db.run("DELETE FROM unseen_attempts WHERE user_id = ?", [userId]);
  await ctx.db.run("DELETE FROM reviewer_certificates WHERE user_id = ?", [userId]);
  return null;
}

// sites/api/reviewerBank.ts
var REVIEW_BANK_VERSION = 1;
var REVIEW_BANK = [
  { id: "review-v1-a", items: [
    { category: "EC", prompt: "Contract: empty input must return 0. Review the draft.", code: "const average = xs => xs.reduce((n,x)=>n+x,0) / xs.length;", options: ["Approve", "Block: empty input divides by zero", "Block: arrow functions are forbidden"], answer: 1, defective: true },
    { category: "SL", prompt: "Contract: preserve first occurrence order without mutating input.", code: "const unique = xs => [...new Set(xs)];", options: ["Block: must sort", "Block: Set changes the input", "Approve"], answer: 2, defective: false },
    { category: "ID", prompt: "Contract: missing authority denies deletion.", code: "const allowed = user => (user.role ?? 'admin') === 'admin';", options: ["Block: missing role elevates privilege", "Approve", "Block: use a shorter name"], answer: 0, defective: true }
  ] },
  { id: "review-v1-b", items: [
    { category: "EC", prompt: "Contract: only retry server failures; a 400 must stop.", code: "if (!response.ok) return retry(request);", options: ["Approve", "Block: also retries invalid client requests", "Block: retry is too short a name"], answer: 1, defective: true },
    { category: "ID", prompt: "Contract: absent user or guest denies; admin permits.", code: "const allowed = user => user?.role === 'admin';", options: ["Approve", "Block: optional chaining permits guests", "Block: add a debug bypass"], answer: 0, defective: false },
    { category: "RC", prompt: "Contract: keep the newest response when requests finish out of order.", code: "fetchUser(id).then(setUser);", options: ["Block: promises never work", "Approve", "Block: no stale-response guard"], answer: 2, defective: true }
  ] },
  { id: "review-v1-c", items: [
    { category: "TG", prompt: "Contract: total([2,4]) must equal 6. Review the test.", code: "test('total', () => { total([2,4]); });", options: ["Approve", "Block: no assertion checks the value", "Block: need a longer title"], answer: 1, defective: true },
    { category: "SL", prompt: "Contract: zero remains zero; only null/undefined use the default.", code: "const count = input ?? 10;", options: ["Block: use || instead", "Block: zero is falsy", "Approve"], answer: 2, defective: false },
    { category: "ID", prompt: "Contract: no credentials may appear in logs.", code: "console.log('request config', {apiKey, retryCount});", options: ["Block: emits credential into logs", "Approve", "Block: remove only the label"], answer: 0, defective: true }
  ] }
];
function publicReviewItem(exerciseId, index) {
  const item = REVIEW_BANK.find((x) => x.id === exerciseId)?.items[index];
  if (!item) throw new Error("unknown assessment item");
  return { prompt: item.prompt, code: item.code, options: item.options, index, total: 3 };
}

// src/lib/reviewerCertificate.ts
var MIN_DECISION_MS = 4e3;
var MIN_ATTEMPT_MS_PER_ITEM = 2e4;
function reviewerMetrics(decisions) {
  if (decisions.length === 0) return { accuracy: 0, medianMs: 0, count: 0 };
  const correct = decisions.filter((d) => d.correct).length;
  const times = decisions.map((d) => d.decidedAtMs - d.shownAtMs).sort((a, b) => a - b);
  const mid = Math.floor(times.length / 2);
  const medianMs = times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
  return { accuracy: correct / decisions.length, medianMs, count: decisions.length };
}
function plausibilityIssues(a) {
  const issues = [];
  if (!Number.isFinite(a.score) || a.score < 0 || a.score > 1) issues.push("invalid score");
  const accuracy = reviewerMetrics(a.decisions).accuracy;
  if (a.decisions.length && Math.abs(accuracy - a.score) > 1e-6) issues.push("score disagrees with decisions");
  const elapsed = a.finishedAtMs - a.startedAtMs;
  if (a.decisions.length === 0) issues.push("no decisions recorded");
  if (elapsed < MIN_ATTEMPT_MS_PER_ITEM * Math.max(1, a.decisions.length)) issues.push("finished faster than a human could read the items");
  for (const d of a.decisions) {
    if (d.decidedAtMs - d.shownAtMs < MIN_DECISION_MS) {
      issues.push("a decision was made faster than the minimum reading time");
      break;
    }
  }
  for (const d of a.decisions) {
    if (!Number.isFinite(d.shownAtMs) || !Number.isFinite(d.decidedAtMs) || d.shownAtMs < a.startedAtMs || d.decidedAtMs < d.shownAtMs || d.decidedAtMs > a.finishedAtMs) {
      issues.push("decision timestamps fall outside the attempt");
      break;
    }
  }
  return issues;
}

// sites/api/reviewer.ts
var MAX_ATTEMPTS2 = 100;
function parseDecisions(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d) => typeof d === "object" && d !== null && typeof d.correct === "boolean" && typeof d.shownAtMs === "number" && typeof d.decidedAtMs === "number"
    );
  } catch {
    return [];
  }
}
async function attemptsFor(ctx, userId) {
  return ctx.db.all(
    `SELECT id, exercise_id, seen_before, started_at, finished_at, score, bank_version,
            item_index, shown_at, decisions, accepted, issues
       FROM unseen_attempts WHERE user_id = ? ORDER BY started_at ASC LIMIT ?`,
    [userId, MAX_ATTEMPTS2 + 1]
  );
}
async function certificateFor(ctx, userId) {
  const row = await ctx.db.first(
    "SELECT id, issued_at, score FROM reviewer_certificates WHERE user_id = ?",
    [userId]
  );
  return row ? { id: row.id, issuedAt: row.issued_at, score: row.score } : null;
}
async function startUnseenExercise(ctx) {
  const userId = requireUser(ctx);
  const rows = await attemptsFor(ctx, userId);
  const active = rows.find((r) => r.bank_version === REVIEW_BANK_VERSION && r.finished_at === null);
  if (active) {
    return {
      attemptId: active.id,
      seenBefore: active.seen_before === 1,
      item: publicReviewItem(active.exercise_id, active.item_index),
      minReadMs: MIN_ATTEMPT_MS_PER_ITEM
    };
  }
  if (rows.length >= MAX_ATTEMPTS2) {
    throw new Error("Assessment history limit reached; reset progress to clear it.");
  }
  const exercise = REVIEW_BANK.find((e) => !rows.some((r) => r.exercise_id === e.id)) ?? REVIEW_BANK[0];
  const seenBefore = rows.some((r) => r.exercise_id === exercise.id);
  const now = Date.now();
  const attemptId = crypto.randomUUID();
  await ctx.db.run(
    `INSERT INTO unseen_attempts
       (id, user_id, exercise_id, seen_before, started_at, finished_at, score, bank_version,
        item_index, shown_at, decisions, accepted, issues)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 0, ?, '[]', NULL, NULL)`,
    [attemptId, userId, exercise.id, seenBefore ? 1 : 0, now, REVIEW_BANK_VERSION, now]
  );
  return {
    attemptId,
    seenBefore,
    item: publicReviewItem(exercise.id, 0),
    minReadMs: MIN_ATTEMPT_MS_PER_ITEM
  };
}
async function finishUnseenExercise(ctx, args) {
  const userId = requireUser(ctx);
  const owned = await ctx.db.first(
    `SELECT id, exercise_id, seen_before, started_at, finished_at, score, bank_version,
            item_index, shown_at, decisions, accepted, issues
       FROM unseen_attempts WHERE id = ? AND user_id = ?`,
    [String(args?.attemptId ?? ""), userId]
  );
  if (!owned) {
    const exists = await ctx.db.first(
      "SELECT user_id FROM unseen_attempts WHERE id = ?",
      [String(args?.attemptId ?? "")]
    );
    throw new Error(exists ? "Not your attempt." : "That assessment could not be found.");
  }
  if (owned.finished_at !== null) throw new Error("This attempt is already finished.");
  const exercise = REVIEW_BANK.find((e) => e.id === owned.exercise_id);
  if (!exercise || owned.bank_version !== REVIEW_BANK_VERSION) {
    throw new Error("This assessment version expired; start a new assessment.");
  }
  const itemIndex = Number(args?.itemIndex);
  const answer = Number(args?.answer);
  if (itemIndex !== owned.item_index) throw new Error("That question is out of date; reload.");
  const item = exercise.items[itemIndex];
  if (!item || !Number.isInteger(answer) || answer < 0 || answer >= item.options.length) {
    throw new Error("That answer is not one of the options.");
  }
  const now = Date.now();
  const shownAt = owned.shown_at ?? owned.started_at;
  if (now - shownAt < MIN_ATTEMPT_MS_PER_ITEM) {
    throw new Error("Read the item before submitting; minimum 20 seconds per item.");
  }
  const decisions = [
    ...parseDecisions(owned.decisions),
    { correct: answer === item.answer, shownAtMs: shownAt, decidedAtMs: now }
  ];
  if (decisions.length !== itemIndex + 1) throw new Error("Invalid assessment history.");
  if (itemIndex + 1 < exercise.items.length) {
    await ctx.db.run(
      "UPDATE unseen_attempts SET decisions = ?, item_index = ?, shown_at = ? WHERE id = ?",
      [JSON.stringify(decisions), itemIndex + 1, now, owned.id]
    );
    return {
      done: false,
      item: publicReviewItem(owned.exercise_id, itemIndex + 1),
      minReadMs: MIN_ATTEMPT_MS_PER_ITEM
    };
  }
  const metrics = reviewerMetrics(decisions);
  const attempt = {
    exerciseId: owned.exercise_id,
    seenBefore: owned.seen_before === 1,
    score: metrics.accuracy,
    startedAtMs: owned.started_at,
    finishedAtMs: now,
    decisions
  };
  const issues = plausibilityIssues(attempt);
  const accepted = issues.length === 0;
  await ctx.db.run(
    `UPDATE unseen_attempts
        SET finished_at = ?, score = ?, decisions = ?, accepted = ?, issues = ?
      WHERE id = ?`,
    [now, metrics.accuracy, JSON.stringify(decisions), accepted ? 1 : 0, JSON.stringify(issues), owned.id]
  );
  let certificate = await certificateFor(ctx, userId);
  if (!certificate && accepted && owned.seen_before === 0 && metrics.accuracy >= 0.8) {
    const id = crypto.randomUUID();
    await ctx.db.run(
      `INSERT INTO reviewer_certificates (id, user_id, attempt_id, bank_version, issued_at, score)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, owned.id, REVIEW_BANK_VERSION, now, metrics.accuracy]
    );
    certificate = { id, issuedAt: now, score: metrics.accuracy };
  }
  return {
    done: true,
    accepted,
    issues,
    metrics,
    score: metrics.accuracy,
    certificate
  };
}
async function reviewerStatus(ctx) {
  if (!ctx.userId) return null;
  const rows = await attemptsFor(ctx, ctx.userId);
  const graded = rows.filter((r) => r.bank_version === REVIEW_BANK_VERSION && r.finished_at !== null);
  const decisions = graded.flatMap((r) => parseDecisions(r.decisions));
  let defects = 0;
  let caught = 0;
  let clean = 0;
  let falseAlarms = 0;
  const byCode = {};
  for (const row of graded) {
    const exercise = REVIEW_BANK.find((e) => e.id === row.exercise_id);
    for (const [i, decision] of parseDecisions(row.decisions).entries()) {
      const item = exercise?.items[i];
      if (!item) continue;
      const group = byCode[item.category] ??= {
        defects: 0,
        caught: 0,
        clean: 0,
        falseAlarms: 0,
        times: []
      };
      group.times.push(Math.max(0, decision.decidedAtMs - decision.shownAtMs));
      if (item.defective) {
        defects++;
        group.defects++;
        if (decision.correct) {
          caught++;
          group.caught++;
        }
      } else {
        clean++;
        group.clean++;
        if (!decision.correct) {
          falseAlarms++;
          group.falseAlarms++;
        }
      }
    }
  }
  return {
    metrics: {
      ...reviewerMetrics(decisions),
      catchRate: defects ? caught / defects : null,
      falseAlarmRate: clean ? falseAlarms / clean : null
    },
    certificate: await certificateFor(ctx, ctx.userId),
    byCode: Object.entries(byCode).map(([code, group]) => ({
      code,
      count: group.times.length,
      catchRate: group.defects ? group.caught / group.defects : null,
      falseAlarmRate: group.clean ? group.falseAlarms / group.clean : null,
      meanDecisionMs: group.times.reduce((a, b) => a + b, 0) / group.times.length
    })),
    attempts: graded.length
  };
}

// sites/api/registry.ts
var endpoints = {
  "users.me": me,
  "users.setName": setName,
  "progress.get": get3,
  "progress.save": save3,
  "progress.getClaims": getClaims,
  "progress.saveClaims": saveClaims,
  "progress.getAttempts": getAttempts,
  "progress.saveAttempts": saveAttempts,
  "progress.wipe": wipe,
  "progress.startUnseenExercise": startUnseenExercise,
  "progress.finishUnseenExercise": finishUnseenExercise,
  "progress.reviewerStatus": reviewerStatus,
  "profiles.sync": sync,
  "profiles.me": me2,
  "profiles.setTitle": setTitle,
  "profiles.publicCard": publicCard,
  "leaderboard.top": top,
  "leaderboard.podium": podium,
  "clans.list": list,
  "clans.mine": mine2,
  "clans.create": create,
  "clans.join": join,
  "clans.leave": leave,
  "clans.activeQuest": activeQuest,
  "clans.ensureActiveQuest": ensureActiveQuest,
  "clans.questView": questView,
  "clans.reportContribution": reportContribution,
  "clans.questClaims": questClaims,
  "clans.claimQuestReward": claimQuestReward,
  "clans.setRole": setRole,
  "clans.kick": kick,
  "clans.feed": feed,
  "certificates.issue": issue,
  "certificates.verify": verify,
  "certificates.listForProfile": listForProfile,
  "certificates.mine": mine,
  "preferences.get": get2,
  "preferences.save": save2,
  "atlas.get": get,
  "atlas.save": save
};

// sites/api/schema.ts
var SCHEMA = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT,
    picture TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS progress (
    user_id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}',
    claims TEXT NOT NULL DEFAULT '{}',
    attempts TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS atlas (
    user_id TEXT PRIMARY KEY,
    answers TEXT NOT NULL DEFAULT '{}',
    revision INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    xp_week INTEGER NOT NULL DEFAULT 0,
    xp_month INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    ascension TEXT NOT NULL DEFAULT 'initiate',
    title TEXT,
    streak_current INTEGER NOT NULL DEFAULT 0,
    streak_longest INTEGER NOT NULL DEFAULT 0,
    last_active_day TEXT,
    member_role TEXT,
    lessons_done INTEGER NOT NULL DEFAULT 0,
    clan_id TEXT,
    updated_at INTEGER NOT NULL,
    clamped_at INTEGER,
    clamp_log TEXT,
    sync_window_start INTEGER,
    sync_count INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS profiles_xp ON profiles (xp DESC)`,
  `CREATE INDEX IF NOT EXISTS profiles_xp_week ON profiles (xp_week DESC)`,
  `CREATE INDEX IF NOT EXISTS profiles_xp_month ON profiles (xp_month DESC)`,
  `CREATE INDEX IF NOT EXISTS profiles_clan ON profiles (clan_id)`,
  `CREATE TABLE IF NOT EXISTS clans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL UNIQUE,
    blurb TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS clan_quests (
    id TEXT PRIMARY KEY,
    clan_id TEXT NOT NULL,
    week_key TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    metric TEXT NOT NULL,
    target INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    UNIQUE (clan_id, week_key)
  )`,
  `CREATE TABLE IF NOT EXISTS clan_quest_progress (
    quest_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    contribution INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    user_level INTEGER NOT NULL,
    user_ascension TEXT NOT NULL,
    PRIMARY KEY (quest_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS clan_quest_claims (
    user_id TEXT NOT NULL,
    week_key TEXT NOT NULL,
    xp INTEGER NOT NULL,
    claimed_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, week_key)
  )`,
  `CREATE TABLE IF NOT EXISTS clan_events (
    id TEXT PRIMARY KEY,
    clan_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS clan_events_clan ON clan_events (clan_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS preferences (
    user_id TEXT PRIMARY KEY,
    theme_style TEXT,
    updated_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    track_title TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    issued_at INTEGER NOT NULL,
    UNIQUE (user_id, track_id)
  )`,
  `CREATE INDEX IF NOT EXISTS certificates_code ON certificates (code)`,
  `CREATE TABLE IF NOT EXISTS unseen_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    seen_before INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    score REAL,
    bank_version INTEGER NOT NULL,
    item_index INTEGER NOT NULL,
    shown_at INTEGER,
    decisions TEXT NOT NULL DEFAULT '[]',
    accepted INTEGER,
    issues TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS unseen_attempts_user ON unseen_attempts (user_id)`,
  `CREATE TABLE IF NOT EXISTS reviewer_certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    attempt_id TEXT NOT NULL,
    bank_version INTEGER NOT NULL,
    issued_at INTEGER NOT NULL,
    score REAL NOT NULL
  )`
];
async function ensureSchema(db) {
  for (const statement of SCHEMA) await db.run(statement);
}

// sites/api/worker.ts
var authByEnv = /* @__PURE__ */ new WeakMap();
var schemaByDb = /* @__PURE__ */ new WeakMap();
function isLoopback(origin) {
  return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
}
function authFor(env) {
  let auth = authByEnv.get(env);
  if (!auth) {
    if (!env.FREEBUFF_CLIENT_ID || !env.APP_ORIGIN) {
      throw new Error("Sign-in is not configured for this environment.");
    }
    auth = createFreebuffAuth({
      clientId: env.FREEBUFF_CLIENT_ID,
      issuer: env.FREEBUFF_ISSUER,
      baseUrl: env.APP_ORIGIN,
      allowInsecureLocalhost: isLoopback(env.APP_ORIGIN)
    });
    authByEnv.set(env, auth);
  }
  return auth;
}
function json2(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Personalized answers must never sit in a shared cache.
      "cache-control": "private, no-store"
    }
  });
}
var MAX_BODY_BYTES = 512 * 1024;
async function rpc(request, env, auth) {
  if (request.method !== "POST") return json2({ error: { message: "Use POST." } }, 405);
  if (!isSameOriginRequest(request, env.APP_ORIGIN ?? "")) {
    return json2({ error: { message: "Cross-origin request refused." } }, 403);
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json2({ error: { message: "That request is too large." } }, 413);
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json2({ error: { message: "Malformed request." } }, 400);
  }
  const name = typeof body.fn === "string" ? body.fn : "";
  const handler = endpoints[name];
  if (!handler) return json2({ error: { message: "Unknown endpoint." } }, 404);
  if (!env.DB) return json2({ error: { message: "The database is not configured." } }, 503);
  let ready = schemaByDb.get(env.DB);
  if (!ready) {
    ready = ensureSchema(d1(env.DB));
    schemaByDb.set(env.DB, ready);
  }
  await ready;
  const db = d1(env.DB);
  const user = await auth.getUser(request);
  const account = user ? await ensureAccount(db, user) : null;
  const ctx = { db, userId: user?.sub ?? null, account };
  try {
    const result = await handler(ctx, body.args ?? {});
    return json2({ result: result === void 0 ? null : result });
  } catch (error) {
    if (error instanceof ApiError) {
      return json2({ error: { message: error.message } }, error.status);
    }
    const message2 = error instanceof Error && error.message ? error.message : "That request failed.";
    console.warn(`api ${name} failed: ${message2}`);
    return json2({ error: { message: message2 } }, 400);
  }
}
function wantsDocument(request, pathname) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  return !last.includes(".");
}
async function serveAsset(request, env) {
  if (!env.ASSETS) {
    return new Response("ASSETS binding missing", { status: 500 });
  }
  const response = await env.ASSETS.fetch(request);
  const url = new URL(request.url);
  if (response.status !== 404 || !wantsDocument(request, url.pathname)) return response;
  const page = await env.ASSETS.fetch(
    new Request(new URL("/", url.origin), { method: request.method, headers: request.headers })
  );
  if (!page.ok) return response;
  return new Response(page.body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // The shell is the same for everyone; the data behind it is not.
      "cache-control": "no-cache"
    }
  });
}
var worker_default = {
  async fetch(request, env) {
    try {
      const auth = authFor(env);
      const handler = auth.wrap(async (req) => {
        const url = new URL(req.url);
        if (url.pathname === "/api/rpc") return rpc(req, env, auth);
        if (url.pathname.startsWith("/api/")) {
          return json2({ error: { message: "Unknown endpoint." } }, 404);
        }
        return serveAsset(req, env);
      });
      return await handler(request);
    } catch (error) {
      console.error("unhandled", error);
      const message2 = isLoopback(env.APP_ORIGIN ?? "") ? error instanceof Error ? error.message : String(error) : "Something went wrong on the server.";
      return json2({ error: { message: message2 } }, 500);
    }
  }
};
export {
  worker_default as default
};
