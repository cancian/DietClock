﻿/////////
// IOS //
/////////
if (document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://')) {
	if ((/(iPhone|iPad|iPod)/i).test(navigator.userAgent)) {
		(function () {
			var CORDOVA_JS_BUILD_LABEL = '3.3.0';
			var require,
			define;
			(function () {
				var modules = {},
				requireStack = [],
				inProgressModules = {},
				SEPARATOR = ".";
				function build(module) {
					var factory = module.factory,
					localRequire = function (id) {
						var resultantId = id;
						if (id.charAt(0) === ".") {
							resultantId = module.id.slice(0, module.id.lastIndexOf(SEPARATOR)) + SEPARATOR + id.slice(2);
						}
						return require(resultantId);
					};
					module.exports = {};
					delete module.factory;
					factory(localRequire, module.exports, module);
					return module.exports;
				}
				require = function (id) {
					if (!modules[id]) {
						throw "module " + id + " not found";
					} else if (id in inProgressModules) {
						var cycle = requireStack.slice(inProgressModules[id]).join('->') + '->' + id;
						throw "Cycle in require graph: " + cycle;
					}
					if (modules[id].factory) {
						try {
							inProgressModules[id] = requireStack.length;
							requireStack.push(id);
							return build(modules[id]);
						}
						finally {
							delete inProgressModules[id];
							requireStack.pop();
						}
					}
					return modules[id].exports;
				};
				define = function (id, factory) {
					if (modules[id]) {
						throw "module " + id + " already defined";
					}
					modules[id] = {
						id : id,
						factory : factory
					};
				};
				define.remove = function (id) {
					delete modules[id];
				};
				define.moduleMap = modules;
			})();
			if (typeof module === "object" && typeof require === "function") {
				module.exports.require = require;
				module.exports.define = define;
			}
			define("cordova", function (require, exports, module) {
				var channel = require('cordova/channel');
				var platform = require('cordova/platform');
				var m_document_addEventListener = document.addEventListener;
				var m_document_removeEventListener = document.removeEventListener;
				var m_window_addEventListener = window.addEventListener;
				var m_window_removeEventListener = window.removeEventListener;
				var documentEventHandlers = {},
				windowEventHandlers = {};
				document.addEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof documentEventHandlers[e] != 'undefined') {
						documentEventHandlers[e].subscribe(handler);
					} else {
						m_document_addEventListener.call(document, evt, handler, capture);
					}
				};
				window.addEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof windowEventHandlers[e] != 'undefined') {
						windowEventHandlers[e].subscribe(handler);
					} else {
						m_window_addEventListener.call(window, evt, handler, capture);
					}
				};
				document.removeEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof documentEventHandlers[e] != "undefined") {
						documentEventHandlers[e].unsubscribe(handler);
					} else {
						m_document_removeEventListener.call(document, evt, handler, capture);
					}
				};
				window.removeEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof windowEventHandlers[e] != "undefined") {
						windowEventHandlers[e].unsubscribe(handler);
					} else {
						m_window_removeEventListener.call(window, evt, handler, capture);
					}
				};
				function createEvent(type, data) {
					var event = document.createEvent('Events');
					event.initEvent(type, false, false);
					if (data) {
						for (var i in data) {
							if (data.hasOwnProperty(i)) {
								event[i] = data[i];
							}
						}
					}
					return event;
				}
				var cordova = {
					define : define,
					require : require,
					version : CORDOVA_JS_BUILD_LABEL,
					platformId : platform.id,
					addWindowEventHandler : function (event) {
						return (windowEventHandlers[event] = channel.create(event));
					},
					addStickyDocumentEventHandler : function (event) {
						return (documentEventHandlers[event] = channel.createSticky(event));
					},
					addDocumentEventHandler : function (event) {
						return (documentEventHandlers[event] = channel.create(event));
					},
					removeWindowEventHandler : function (event) {
						delete windowEventHandlers[event];
					},
					removeDocumentEventHandler : function (event) {
						delete documentEventHandlers[event];
					},
					getOriginalHandlers : function () {
						return {
							'document' : {
								'addEventListener' : m_document_addEventListener,
								'removeEventListener' : m_document_removeEventListener
							},
							'window' : {
								'addEventListener' : m_window_addEventListener,
								'removeEventListener' : m_window_removeEventListener
							}
						};
					},
					fireDocumentEvent : function (type, data, bNoDetach) {
						var evt = createEvent(type, data);
						if (typeof documentEventHandlers[type] != 'undefined') {
							if (bNoDetach) {
								documentEventHandlers[type].fire(evt);
							} else {
								setTimeout(function () {
									if (type == 'deviceready') {
										document.dispatchEvent(evt);
									}
									documentEventHandlers[type].fire(evt);
								}, 0);
							}
						} else {
							document.dispatchEvent(evt);
						}
					},
					fireWindowEvent : function (type, data) {
						var evt = createEvent(type, data);
						if (typeof windowEventHandlers[type] != 'undefined') {
							setTimeout(function () {
								windowEventHandlers[type].fire(evt);
							}, 0);
						} else {
							window.dispatchEvent(evt);
						}
					},
					callbackId : Math.floor(Math.random() * 2000000000),
					callbacks : {},
					callbackStatus : {
						NO_RESULT : 0,
						OK : 1,
						CLASS_NOT_FOUND_EXCEPTION : 2,
						ILLEGAL_ACCESS_EXCEPTION : 3,
						INSTANTIATION_EXCEPTION : 4,
						MALFORMED_URL_EXCEPTION : 5,
						IO_EXCEPTION : 6,
						INVALID_ACTION : 7,
						JSON_EXCEPTION : 8,
						ERROR : 9
					},
					callbackSuccess : function (callbackId, args) {
						try {
							cordova.callbackFromNative(callbackId, true, args.status, [args.message], args.keepCallback);
						} catch (e) {
							console.log("Error in error callback: " + callbackId + " = " + e);
						}
					},
					callbackError : function (callbackId, args) {
						try {
							cordova.callbackFromNative(callbackId, false, args.status, [args.message], args.keepCallback);
						} catch (e) {
							console.log("Error in error callback: " + callbackId + " = " + e);
						}
					},
					callbackFromNative : function (callbackId, success, status, args, keepCallback) {
						var callback = cordova.callbacks[callbackId];
						if (callback) {
							if (success && status == cordova.callbackStatus.OK) {
								callback.success && callback.success.apply(null, args);
							} else if (!success) {
								callback.fail && callback.fail.apply(null, args);
							}
							if (!keepCallback) {
								delete cordova.callbacks[callbackId];
							}
						}
					},
					addConstructor : function (func) {
						channel.onCordovaReady.subscribe(function () {
							try {
								func();
							} catch (e) {
								console.log("Failed to run constructor: " + e);
							}
						});
					}
				};
				module.exports = cordova;
			});
			define("cordova/argscheck", function (require, exports, module) {
				var exec = require('cordova/exec');
				var utils = require('cordova/utils');
				var moduleExports = module.exports;
				var typeMap = {
					'A' : 'Array',
					'D' : 'Date',
					'N' : 'Number',
					'S' : 'String',
					'F' : 'Function',
					'O' : 'Object'
				};
				function extractParamName(callee, argIndex) {
					return (/.*?\((.*?)\)/).exec(callee)[1].split(', ')[argIndex];
				}
				function checkArgs(spec, functionName, args, opt_callee) {
					if (!moduleExports.enableChecks) {
						return;
					}
					var errMsg = null;
					var typeName;
					for (var i = 0; i < spec.length; ++i) {
						var c = spec.charAt(i),
						cUpper = c.toUpperCase(),
						arg = args[i];
						if (c == '*') {
							continue;
						}
						typeName = utils.typeName(arg);
						if ((arg === null || arg === undefined) && c == cUpper) {
							continue;
						}
						if (typeName != typeMap[cUpper]) {
							errMsg = 'Expected ' + typeMap[cUpper];
							break;
						}
					}
					if (errMsg) {
						errMsg += ', but got ' + typeName + '.';
						errMsg = 'Wrong type for parameter "' + extractParamName(opt_callee || args.callee, i) + '" of ' + functionName + ': ' + errMsg;
						if (typeof jasmine == 'undefined') {
							console.error(errMsg);
						}
						throw TypeError(errMsg);
					}
				}
				function getValue(value, defaultValue) {
					return value === undefined ? defaultValue : value;
				}
				moduleExports.checkArgs = checkArgs;
				moduleExports.getValue = getValue;
				moduleExports.enableChecks = true;
			});
			define("cordova/base64", function (require, exports, module) {
				var base64 = exports;
				base64.fromArrayBuffer = function (arrayBuffer) {
					var array = new Uint8Array(arrayBuffer);
					return uint8ToBase64(array);
				};
				var b64_6bit = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
				var b64_12bit;
				var b64_12bitTable = function () {
					b64_12bit = [];
					for (var i = 0; i < 64; i++) {
						for (var j = 0; j < 64; j++) {
							b64_12bit[i * 64 + j] = b64_6bit[i] + b64_6bit[j];
						}
					}
					b64_12bitTable = function () {
						return b64_12bit;
					};
					return b64_12bit;
				};
				function uint8ToBase64(rawData) {
					var numBytes = rawData.byteLength;
					var output = "";
					var segment;
					var table = b64_12bitTable();
					for (var i = 0; i < numBytes - 2; i += 3) {
						segment = (rawData[i] << 16) + (rawData[i + 1] << 8) + rawData[i + 2];
						output += table[segment >> 12];
						output += table[segment & 0xfff];
					}
					if (numBytes - i == 2) {
						segment = (rawData[i] << 16) + (rawData[i + 1] << 8);
						output += table[segment >> 12];
						output += b64_6bit[(segment & 0xfff) >> 6];
						output += '=';
					} else if (numBytes - i == 1) {
						segment = (rawData[i] << 16);
						output += table[segment >> 12];
						output += '==';
					}
					return output;
				}
			});
			define("cordova/builder", function (require, exports, module) {
				var utils = require('cordova/utils');
				function each(objects, func, context) {
					for (var prop in objects) {
						if (objects.hasOwnProperty(prop)) {
							func.apply(context, [objects[prop], prop]);
						}
					}
				}
				function clobber(obj, key, value) {
					exports.replaceHookForTesting(obj, key);
					obj[key] = value;
					if (obj[key] !== value) {
						utils.defineGetter(obj, key, function () {
							return value;
						});
					}
				}
				function assignOrWrapInDeprecateGetter(obj, key, value, message) {
					if (message) {
						utils.defineGetter(obj, key, function () {
							console.log(message);
							delete obj[key];
							clobber(obj, key, value);
							return value;
						});
					} else {
						clobber(obj, key, value);
					}
				}
				function include(parent, objects, clobber, merge) {
					each(objects, function (obj, key) {
						try {
							var result = obj.path ? require(obj.path) : {};
							if (clobber) {
								if (typeof parent[key] === 'undefined') {
									assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
								} else if (typeof obj.path !== 'undefined') {
									if (merge) {
										recursiveMerge(parent[key], result);
									} else {
										assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
									}
								}
								result = parent[key];
							} else {
								if (typeof parent[key] == 'undefined') {
									assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
								} else {
									result = parent[key];
								}
							}
							if (obj.children) {
								include(result, obj.children, clobber, merge);
							}
						} catch (e) {
							utils.alert('Exception building Cordova JS globals: ' + e + ' for key "' + key + '"');
						}
					});
				}
				function recursiveMerge(target, src) {
					for (var prop in src) {
						if (src.hasOwnProperty(prop)) {
							if (target.prototype && target.prototype.constructor === target) {
								clobber(target.prototype, prop, src[prop]);
							} else {
								if (typeof src[prop] === 'object' && typeof target[prop] === 'object') {
									recursiveMerge(target[prop], src[prop]);
								} else {
									clobber(target, prop, src[prop]);
								}
							}
						}
					}
				}
				exports.buildIntoButDoNotClobber = function (objects, target) {
					include(target, objects, false, false);
				};
				exports.buildIntoAndClobber = function (objects, target) {
					include(target, objects, true, false);
				};
				exports.buildIntoAndMerge = function (objects, target) {
					include(target, objects, true, true);
				};
				exports.recursiveMerge = recursiveMerge;
				exports.assignOrWrapInDeprecateGetter = assignOrWrapInDeprecateGetter;
				exports.replaceHookForTesting = function () {};
			});
			define("cordova/channel", function (require, exports, module) {
				var utils = require('cordova/utils'),
				nextGuid = 1;
				var Channel = function (type, sticky) {
					this.type = type;
					this.handlers = {};
					this.state = sticky ? 1 : 0;
					this.fireArgs = null;
					this.numHandlers = 0;
					this.onHasSubscribersChange = null;
				},
				channel = {
					join : function (h, c) {
						var len = c.length,
						i = len,
						f = function () {
							if (!(--i))
								h();
						};
						for (var j = 0; j < len; j++) {
							if (c[j].state === 0) {
								throw Error('Can only use join with sticky channels.');
							}
							c[j].subscribe(f);
						}
						if (!len)
							h();
					},
					create : function (type) {
						return channel[type] = new Channel(type, false);
					},
					createSticky : function (type) {
						return channel[type] = new Channel(type, true);
					},
					deviceReadyChannelsArray : [],
					deviceReadyChannelsMap : {},
					waitForInitialization : function (feature) {
						if (feature) {
							var c = channel[feature] || this.createSticky(feature);
							this.deviceReadyChannelsMap[feature] = c;
							this.deviceReadyChannelsArray.push(c);
						}
					},
					initializationComplete : function (feature) {
						var c = this.deviceReadyChannelsMap[feature];
						if (c) {
							c.fire();
						}
					}
				};
				function forceFunction(f) {
					if (typeof f != 'function')
						throw "Function required as first argument!";
				}
				Channel.prototype.subscribe = function (f, c) {
					forceFunction(f);
					if (this.state == 2) {
						f.apply(c || this, this.fireArgs);
						return;
					}
					var func = f,
					guid = f.observer_guid;
					if (typeof c == "object") {
						func = utils.close(c, f);
					}
					if (!guid) {
						guid = '' + nextGuid++;
					}
					func.observer_guid = guid;
					f.observer_guid = guid;
					if (!this.handlers[guid]) {
						this.handlers[guid] = func;
						this.numHandlers++;
						if (this.numHandlers == 1) {
							this.onHasSubscribersChange && this.onHasSubscribersChange();
						}
					}
				};
				Channel.prototype.unsubscribe = function (f) {
					forceFunction(f);
					var guid = f.observer_guid,
					handler = this.handlers[guid];
					if (handler) {
						delete this.handlers[guid];
						this.numHandlers--;
						if (this.numHandlers === 0) {
							this.onHasSubscribersChange && this.onHasSubscribersChange();
						}
					}
				};
				Channel.prototype.fire = function (e) {
					var fail = false,
					fireArgs = Array.prototype.slice.call(arguments);
					if (this.state == 1) {
						this.state = 2;
						this.fireArgs = fireArgs;
					}
					if (this.numHandlers) {
						var toCall = [];
						for (var item in this.handlers) {
							toCall.push(this.handlers[item]);
						}
						for (var i = 0; i < toCall.length; ++i) {
							toCall[i].apply(this, fireArgs);
						}
						if (this.state == 2 && this.numHandlers) {
							this.numHandlers = 0;
							this.handlers = {};
							this.onHasSubscribersChange && this.onHasSubscribersChange();
						}
					}
				};
				channel.createSticky('onDOMContentLoaded');
				channel.createSticky('onNativeReady');
				channel.createSticky('onCordovaReady');
				channel.createSticky('onPluginsReady');
				channel.createSticky('onDeviceReady');
				channel.create('onResume');
				channel.create('onPause');
				channel.createSticky('onDestroy');
				channel.waitForInitialization('onCordovaReady');
				channel.waitForInitialization('onDOMContentLoaded');
				module.exports = channel;
			});
			define("cordova/exec", function (require, exports, module) {
				var cordova = require('cordova'),
				channel = require('cordova/channel'),
				utils = require('cordova/utils'),
				base64 = require('cordova/base64'),
				jsToNativeModes = {
					IFRAME_NAV : 0,
					XHR_NO_PAYLOAD : 1,
					XHR_WITH_PAYLOAD : 2,
					XHR_OPTIONAL_PAYLOAD : 3
				},
				bridgeMode,
				execIframe,
				execXhr,
				requestCount = 0,
				vcHeaderValue = null,
				commandQueue = [],
				isInContextOfEvalJs = 0;
				function createExecIframe() {
					var iframe = document.createElement("iframe");
					iframe.style.display = 'none';
					document.body.appendChild(iframe);
					return iframe;
				}
				function shouldBundleCommandJson() {
					if (bridgeMode == jsToNativeModes.XHR_WITH_PAYLOAD) {
						return true;
					}
					if (bridgeMode == jsToNativeModes.XHR_OPTIONAL_PAYLOAD) {
						var payloadLength = 0;
						for (var i = 0; i < commandQueue.length; ++i) {
							payloadLength += commandQueue[i].length;
						}
						return payloadLength < 4500;
					}
					return false;
				}
				function massageArgsJsToNative(args) {
					if (!args || utils.typeName(args) != 'Array') {
						return args;
					}
					var ret = [];
					args.forEach(function (arg, i) {
						if (utils.typeName(arg) == 'ArrayBuffer') {
							ret.push({
								'CDVType' : 'ArrayBuffer',
								'data' : base64.fromArrayBuffer(arg)
							});
						} else {
							ret.push(arg);
						}
					});
					return ret;
				}
				function massageMessageNativeToJs(message) {
					if (message.CDVType == 'ArrayBuffer') {
						var stringToArrayBuffer = function (str) {
							var ret = new Uint8Array(str.length);
							for (var i = 0; i < str.length; i++) {
								ret[i] = str.charCodeAt(i);
							}
							return ret.buffer;
						};
						var base64ToArrayBuffer = function (b64) {
							return stringToArrayBuffer(atob(b64));
						};
						message = base64ToArrayBuffer(message.data);
					}
					return message;
				}
				function convertMessageToArgsNativeToJs(message) {
					var args = [];
					if (!message || !message.hasOwnProperty('CDVType')) {
						args.push(message);
					} else if (message.CDVType == 'MultiPart') {
						message.messages.forEach(function (e) {
							args.push(massageMessageNativeToJs(e));
						});
					} else {
						args.push(massageMessageNativeToJs(message));
					}
					return args;
				}
				function iOSExec() {
					if (bridgeMode === undefined) {
						bridgeMode = navigator.userAgent.indexOf(' 4_') == -1 ? jsToNativeModes.XHR_NO_PAYLOAD : jsToNativeModes.IFRAME_NAV;
					}
					var successCallback,
					failCallback,
					service,
					action,
					actionArgs,
					splitCommand;
					var callbackId = null;
					if (typeof arguments[0] !== "string") {
						successCallback = arguments[0];
						failCallback = arguments[1];
						service = arguments[2];
						action = arguments[3];
						actionArgs = arguments[4];
						callbackId = 'INVALID';
					} else {
						try {
							splitCommand = arguments[0].split(".");
							action = splitCommand.pop();
							service = splitCommand.join(".");
							actionArgs = Array.prototype.splice.call(arguments, 1);
							console.log('The old format of this exec call has been removed (deprecated since 2.1). Change to: ' + "cordova.exec(null, null, \"" + service + "\", \"" + action + "\"," + JSON.stringify(actionArgs) + ");");
							return;
						} catch (e) {}

					}
					if (successCallback || failCallback) {
						callbackId = service + cordova.callbackId++;
						cordova.callbacks[callbackId] = {
							success : successCallback,
							fail : failCallback
						};
					}
					actionArgs = massageArgsJsToNative(actionArgs);
					var command = [callbackId, service, action, actionArgs];
					commandQueue.push(JSON.stringify(command));
					if (!isInContextOfEvalJs && commandQueue.length == 1) {
						if (bridgeMode != jsToNativeModes.IFRAME_NAV) {
							if (execXhr && execXhr.readyState != 4) {
								execXhr = null;
							}
							execXhr = execXhr || new XMLHttpRequest();
							execXhr.open('HEAD', "/!gap_exec?" + (+new Date()), true);
							if (!vcHeaderValue) {
								vcHeaderValue = /.*\((.*)\)/.exec(navigator.userAgent)[1];
							}
							execXhr.setRequestHeader('vc', vcHeaderValue);
							execXhr.setRequestHeader('rc', ++requestCount);
							if (shouldBundleCommandJson()) {
								execXhr.setRequestHeader('cmds', iOSExec.nativeFetchMessages());
							}
							execXhr.send(null);
						} else {
							execIframe = execIframe || createExecIframe();
							execIframe.src = "gap://ready";
						}
					}
				}
				iOSExec.jsToNativeModes = jsToNativeModes;
				iOSExec.setJsToNativeBridgeMode = function (mode) {
					if (execIframe) {
						execIframe.parentNode.removeChild(execIframe);
						execIframe = null;
					}
					bridgeMode = mode;
				};
				iOSExec.nativeFetchMessages = function () {
					if (!commandQueue.length) {
						return '';
					}
					var json = '[' + commandQueue.join(',') + ']';
					commandQueue.length = 0;
					return json;
				};
				iOSExec.nativeCallback = function (callbackId, status, message, keepCallback) {
					return iOSExec.nativeEvalAndFetch(function () {
						var success = status === 0 || status === 1;
						var args = convertMessageToArgsNativeToJs(message);
						cordova.callbackFromNative(callbackId, success, status, args, keepCallback);
					});
				};
				iOSExec.nativeEvalAndFetch = function (func) {
					isInContextOfEvalJs++;
					try {
						func();
						return iOSExec.nativeFetchMessages();
					}
					finally {
						isInContextOfEvalJs--;
					}
				};
				module.exports = iOSExec;
			});
			define("cordova/exec/proxy", function (require, exports, module) {
				var CommandProxyMap = {};
				module.exports = {
					add : function (id, proxyObj) {
						console.log("adding proxy for " + id);
						CommandProxyMap[id] = proxyObj;
						return proxyObj;
					},
					remove : function (id) {
						var proxy = CommandProxyMap[id];
						delete CommandProxyMap[id];
						CommandProxyMap[id] = null;
						return proxy;
					},
					get : function (service, action) {
						return (CommandProxyMap[service] ? CommandProxyMap[service][action] : null);
					}
				};
			});
			define("cordova/init", function (require, exports, module) {
				var channel = require('cordova/channel');
				var cordova = require('cordova');
				var modulemapper = require('cordova/modulemapper');
				var platform = require('cordova/platform');
				var pluginloader = require('cordova/pluginloader');
				var platformInitChannelsArray = [channel.onNativeReady, channel.onPluginsReady];
				function logUnfiredChannels(arr) {
					for (var i = 0; i < arr.length; ++i) {
						if (arr[i].state != 2) {
							console.log('Channel not fired: ' + arr[i].type);
						}
					}
				}
				window.setTimeout(function () {
					if (channel.onDeviceReady.state != 2) {
						console.log('deviceready has not fired after 5 seconds.');
						logUnfiredChannels(platformInitChannelsArray);
						logUnfiredChannels(channel.deviceReadyChannelsArray);
					}
				}, 5000);
				function replaceNavigator(origNavigator) {
					var CordovaNavigator = function () {};
					CordovaNavigator.prototype = origNavigator;
					var newNavigator = new CordovaNavigator();
					if (CordovaNavigator.bind) {
						for (var key in origNavigator) {
							if (typeof origNavigator[key] == 'function') {
								newNavigator[key] = origNavigator[key].bind(origNavigator);
							}
						}
					}
					return newNavigator;
				}
				if (window.navigator) {
					window.navigator = replaceNavigator(window.navigator);
				}
				if (!window.console) {
					window.console = {
						log : function () {}

					};
				}
				if (!window.console.warn) {
					window.console.warn = function (msg) {
						this.log("warn: " + msg);
					};
				}
				channel.onPause = cordova.addDocumentEventHandler('pause');
				channel.onResume = cordova.addDocumentEventHandler('resume');
				channel.onDeviceReady = cordova.addStickyDocumentEventHandler('deviceready');
				if (document.readyState == 'complete' || document.readyState == 'interactive') {
					channel.onDOMContentLoaded.fire();
				} else {
					document.addEventListener('DOMContentLoaded', function () {
						channel.onDOMContentLoaded.fire();
					}, false);
				}
				if (window._nativeReady) {
					channel.onNativeReady.fire();
				}
				modulemapper.clobbers('cordova', 'cordova');
				modulemapper.clobbers('cordova/exec', 'cordova.exec');
				modulemapper.clobbers('cordova/exec', 'Cordova.exec');
				platform.bootstrap && platform.bootstrap();
				pluginloader.load(function () {
					channel.onPluginsReady.fire();
				});
				channel.join(function () {
					modulemapper.mapModules(window);
					platform.initialize && platform.initialize();
					channel.onCordovaReady.fire();
					channel.join(function () {
						require('cordova').fireDocumentEvent('deviceready');
					}, channel.deviceReadyChannelsArray);
				}, platformInitChannelsArray);
			});
			define("cordova/modulemapper", function (require, exports, module) {
				var builder = require('cordova/builder'),
				moduleMap = define.moduleMap,
				symbolList,
				deprecationMap;
				exports.reset = function () {
					symbolList = [];
					deprecationMap = {};
				};
				function addEntry(strategy, moduleName, symbolPath, opt_deprecationMessage) {
					if (!(moduleName in moduleMap)) {
						throw new Error('Module ' + moduleName + ' does not exist.');
					}
					symbolList.push(strategy, moduleName, symbolPath);
					if (opt_deprecationMessage) {
						deprecationMap[symbolPath] = opt_deprecationMessage;
					}
				}
				exports.clobbers = function (moduleName, symbolPath, opt_deprecationMessage) {
					addEntry('c', moduleName, symbolPath, opt_deprecationMessage);
				};
				exports.merges = function (moduleName, symbolPath, opt_deprecationMessage) {
					addEntry('m', moduleName, symbolPath, opt_deprecationMessage);
				};
				exports.defaults = function (moduleName, symbolPath, opt_deprecationMessage) {
					addEntry('d', moduleName, symbolPath, opt_deprecationMessage);
				};
				exports.runs = function (moduleName) {
					addEntry('r', moduleName, null);
				};
				function prepareNamespace(symbolPath, context) {
					if (!symbolPath) {
						return context;
					}
					var parts = symbolPath.split('.');
					var cur = context;
					for (var i = 0, part; part = parts[i]; ++i) {
						cur = cur[part] = cur[part] || {};
					}
					return cur;
				}
				exports.mapModules = function (context) {
					var origSymbols = {};
					context.CDV_origSymbols = origSymbols;
					for (var i = 0, len = symbolList.length; i < len; i += 3) {
						var strategy = symbolList[i];
						var moduleName = symbolList[i + 1];
						var module = require(moduleName);
						if (strategy == 'r') {
							continue;
						}
						var symbolPath = symbolList[i + 2];
						var lastDot = symbolPath.lastIndexOf('.');
						var namespace = symbolPath.substr(0, lastDot);
						var lastName = symbolPath.substr(lastDot + 1);
						var deprecationMsg = symbolPath in deprecationMap ? 'Access made to deprecated symbol: ' + symbolPath + '. ' + deprecationMsg : null;
						var parentObj = prepareNamespace(namespace, context);
						var target = parentObj[lastName];
						if (strategy == 'm' && target) {
							builder.recursiveMerge(target, module);
						} else if ((strategy == 'd' && !target) || (strategy != 'd')) {
							if (!(symbolPath in origSymbols)) {
								origSymbols[symbolPath] = target;
							}
							builder.assignOrWrapInDeprecateGetter(parentObj, lastName, module, deprecationMsg);
						}
					}
				};
				exports.getOriginalSymbol = function (context, symbolPath) {
					var origSymbols = context.CDV_origSymbols;
					if (origSymbols && (symbolPath in origSymbols)) {
						return origSymbols[symbolPath];
					}
					var parts = symbolPath.split('.');
					var obj = context;
					for (var i = 0; i < parts.length; ++i) {
						obj = obj && obj[parts[i]];
					}
					return obj;
				};
				exports.reset();
			});
			define("cordova/platform", function (require, exports, module) {
				module.exports = {
					id : 'ios',
					bootstrap : function () {
						require('cordova/channel').onNativeReady.fire();
					}
				};
			});
			define("cordova/pluginloader", function (require, exports, module) {
				var modulemapper = require('cordova/modulemapper');
				function injectScript(url, onload, onerror) {
					var script = document.createElement("script");
					script.onload = onload;
					script.onerror = onerror || onload;
					script.src = url;
					document.head.appendChild(script);
				}
				function onScriptLoadingComplete(moduleList, finishPluginLoading) {
					for (var i = 0, module; module = moduleList[i]; i++) {
						if (module) {
							try {
								if (module.clobbers && module.clobbers.length) {
									for (var j = 0; j < module.clobbers.length; j++) {
										modulemapper.clobbers(module.id, module.clobbers[j]);
									}
								}
								if (module.merges && module.merges.length) {
									for (var k = 0; k < module.merges.length; k++) {
										modulemapper.merges(module.id, module.merges[k]);
									}
								}
								if (module.runs && !(module.clobbers && module.clobbers.length) && !(module.merges && module.merges.length)) {
									modulemapper.runs(module.id);
								}
							} catch (err) {}

						}
					}
					finishPluginLoading();
				}
				function handlePluginsObject(path, moduleList, finishPluginLoading) {
					var scriptCounter = moduleList.length;
					if (!scriptCounter) {
						finishPluginLoading();
						return;
					}
					function scriptLoadedCallback() {
						if (!--scriptCounter) {
							onScriptLoadingComplete(moduleList, finishPluginLoading);
						}
					}
					for (var i = 0; i < moduleList.length; i++) {
						injectScript(path + moduleList[i].file, scriptLoadedCallback);
					}
				}
				function injectPluginScript(pathPrefix, finishPluginLoading) {
					injectScript(pathPrefix + 'cordova_plugins.js', function () {
						try {
							var moduleList = require("cordova/plugin_list");
							handlePluginsObject(pathPrefix, moduleList, finishPluginLoading);
						} catch (e) {
							finishPluginLoading();
						}
					}, finishPluginLoading);
				}
				function findCordovaPath() {
					var path = null;
					var scripts = document.getElementsByTagName('script');
					var term = 'cordova.js';
					for (var n = scripts.length - 1; n > -1; n--) {
						var src = scripts[n].src;
						if (src.indexOf(term) == (src.length - term.length)) {
							path = src.substring(0, src.length - term.length);
							break;
						}
					}
					return path;
				}
				exports.load = function (callback) {
					var pathPrefix = findCordovaPath();
					if (pathPrefix === null) {
						console.log('Could not find cordova.js script tag. Plugin loading may fail.');
						pathPrefix = '';
					}
					injectPluginScript(pathPrefix, callback);
				};
			});
			define("cordova/urlutil", function (require, exports, module) {
				var urlutil = exports;
				var anchorEl = document.createElement('a');
				urlutil.makeAbsolute = function (url) {
					anchorEl.href = url;
					return anchorEl.href;
				};
			});
			define("cordova/utils", function (require, exports, module) {
				var utils = exports;
				utils.defineGetterSetter = function (obj, key, getFunc, opt_setFunc) {
					if (Object.defineProperty) {
						var desc = {
							get : getFunc,
							configurable : true
						};
						if (opt_setFunc) {
							desc.set = opt_setFunc;
						}
						Object.defineProperty(obj, key, desc);
					} else {
						obj.__defineGetter__(key, getFunc);
						if (opt_setFunc) {
							obj.__defineSetter__(key, opt_setFunc);
						}
					}
				};
				utils.defineGetter = utils.defineGetterSetter;
				utils.arrayIndexOf = function (a, item) {
					if (a.indexOf) {
						return a.indexOf(item);
					}
					var len = a.length;
					for (var i = 0; i < len; ++i) {
						if (a[i] == item) {
							return i;
						}
					}
					return -1;
				};
				utils.arrayRemove = function (a, item) {
					var index = utils.arrayIndexOf(a, item);
					if (index != -1) {
						a.splice(index, 1);
					}
					return index != -1;
				};
				utils.typeName = function (val) {
					return Object.prototype.toString.call(val).slice(8, -1);
				};
				utils.isArray = function (a) {
					return utils.typeName(a) == 'Array';
				};
				utils.isDate = function (d) {
					return utils.typeName(d) == 'Date';
				};
				utils.clone = function (obj) {
					if (!obj || typeof obj == 'function' || utils.isDate(obj) || typeof obj != 'object') {
						return obj;
					}
					var retVal,
					i;
					if (utils.isArray(obj)) {
						retVal = [];
						for (i = 0; i < obj.length; ++i) {
							retVal.push(utils.clone(obj[i]));
						}
						return retVal;
					}
					retVal = {};
					for (i in obj) {
						if (!(i in retVal) || retVal[i] != obj[i]) {
							retVal[i] = utils.clone(obj[i]);
						}
					}
					return retVal;
				};
				utils.close = function (context, func, params) {
					if (typeof params == 'undefined') {
						return function () {
							return func.apply(context, arguments);
						};
					} else {
						return function () {
							return func.apply(context, params);
						};
					}
				};
				utils.createUUID = function () {
					return UUIDcreatePart(4) + '-' +
					UUIDcreatePart(2) + '-' +
					UUIDcreatePart(2) + '-' +
					UUIDcreatePart(2) + '-' +
					UUIDcreatePart(6);
				};
				utils.extend = (function () {
					var F = function () {};
					return function (Child, Parent) {
						F.prototype = Parent.prototype;
						Child.prototype = new F();
						Child.__super__ = Parent.prototype;
						Child.prototype.constructor = Child;
					};
				}
					());
				utils.alert = function (msg) {
					if (window.alert) {
						window.alert(msg);
					} else if (console && console.log) {
						console.log(msg);
					}
				};
				function UUIDcreatePart(length) {
					var uuidpart = "";
					for (var i = 0; i < length; i++) {
						var uuidchar = parseInt((Math.random() * 256), 10).toString(16);
						if (uuidchar.length == 1) {
							uuidchar = "0" + uuidchar;
						}
						uuidpart += uuidchar;
					}
					return uuidpart;
				}
			});
			window.cordova = require('cordova');
			require('cordova/init');
		})();
	}

/////////////
// ANDROID //
/////////////
else if ((/Android/i).test(navigator.userAgent)) {
		(function () {
			var CORDOVA_JS_BUILD_LABEL = '3.3.0';
			var require,
			define;
			(function () {
				var modules = {},
				requireStack = [],
				inProgressModules = {},
				SEPARATOR = ".";
				function build(module) {
					var factory = module.factory,
					localRequire = function (id) {
						var resultantId = id;
						if (id.charAt(0) === ".") {
							resultantId = module.id.slice(0, module.id.lastIndexOf(SEPARATOR)) + SEPARATOR + id.slice(2);
						}
						return require(resultantId);
					};
					module.exports = {};
					delete module.factory;
					factory(localRequire, module.exports, module);
					return module.exports;
				}
				require = function (id) {
					if (!modules[id]) {
						throw "module " + id + " not found";
					} else if (id in inProgressModules) {
						var cycle = requireStack.slice(inProgressModules[id]).join('->') + '->' + id;
						throw "Cycle in require graph: " + cycle;
					}
					if (modules[id].factory) {
						try {
							inProgressModules[id] = requireStack.length;
							requireStack.push(id);
							return build(modules[id]);
						}
						finally {
							delete inProgressModules[id];
							requireStack.pop();
						}
					}
					return modules[id].exports;
				};
				define = function (id, factory) {
					if (modules[id]) {
						throw "module " + id + " already defined";
					}
					modules[id] = {
						id : id,
						factory : factory
					};
				};
				define.remove = function (id) {
					delete modules[id];
				};
				define.moduleMap = modules;
			})();
			if (typeof module === "object" && typeof require === "function") {
				module.exports.require = require;
				module.exports.define = define;
			}
			define("cordova", function (require, exports, module) {
				var channel = require('cordova/channel');
				var platform = require('cordova/platform');
				var m_document_addEventListener = document.addEventListener;
				var m_document_removeEventListener = document.removeEventListener;
				var m_window_addEventListener = window.addEventListener;
				var m_window_removeEventListener = window.removeEventListener;
				var documentEventHandlers = {},
				windowEventHandlers = {};
				document.addEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof documentEventHandlers[e] != 'undefined') {
						documentEventHandlers[e].subscribe(handler);
					} else {
						m_document_addEventListener.call(document, evt, handler, capture);
					}
				};
				window.addEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof windowEventHandlers[e] != 'undefined') {
						windowEventHandlers[e].subscribe(handler);
					} else {
						m_window_addEventListener.call(window, evt, handler, capture);
					}
				};
				document.removeEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof documentEventHandlers[e] != "undefined") {
						documentEventHandlers[e].unsubscribe(handler);
					} else {
						m_document_removeEventListener.call(document, evt, handler, capture);
					}
				};
				window.removeEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof windowEventHandlers[e] != "undefined") {
						windowEventHandlers[e].unsubscribe(handler);
					} else {
						m_window_removeEventListener.call(window, evt, handler, capture);
					}
				};
				function createEvent(type, data) {
					var event = document.createEvent('Events');
					event.initEvent(type, false, false);
					if (data) {
						for (var i in data) {
							if (data.hasOwnProperty(i)) {
								event[i] = data[i];
							}
						}
					}
					return event;
				}
				var cordova = {
					define : define,
					require : require,
					version : CORDOVA_JS_BUILD_LABEL,
					platformId : platform.id,
					addWindowEventHandler : function (event) {
						return (windowEventHandlers[event] = channel.create(event));
					},
					addStickyDocumentEventHandler : function (event) {
						return (documentEventHandlers[event] = channel.createSticky(event));
					},
					addDocumentEventHandler : function (event) {
						return (documentEventHandlers[event] = channel.create(event));
					},
					removeWindowEventHandler : function (event) {
						delete windowEventHandlers[event];
					},
					removeDocumentEventHandler : function (event) {
						delete documentEventHandlers[event];
					},
					getOriginalHandlers : function () {
						return {
							'document' : {
								'addEventListener' : m_document_addEventListener,
								'removeEventListener' : m_document_removeEventListener
							},
							'window' : {
								'addEventListener' : m_window_addEventListener,
								'removeEventListener' : m_window_removeEventListener
							}
						};
					},
					fireDocumentEvent : function (type, data, bNoDetach) {
						var evt = createEvent(type, data);
						if (typeof documentEventHandlers[type] != 'undefined') {
							if (bNoDetach) {
								documentEventHandlers[type].fire(evt);
							} else {
								setTimeout(function () {
									if (type == 'deviceready') {
										document.dispatchEvent(evt);
									}
									documentEventHandlers[type].fire(evt);
								}, 0);
							}
						} else {
							document.dispatchEvent(evt);
						}
					},
					fireWindowEvent : function (type, data) {
						var evt = createEvent(type, data);
						if (typeof windowEventHandlers[type] != 'undefined') {
							setTimeout(function () {
								windowEventHandlers[type].fire(evt);
							}, 0);
						} else {
							window.dispatchEvent(evt);
						}
					},
					callbackId : Math.floor(Math.random() * 2000000000),
					callbacks : {},
					callbackStatus : {
						NO_RESULT : 0,
						OK : 1,
						CLASS_NOT_FOUND_EXCEPTION : 2,
						ILLEGAL_ACCESS_EXCEPTION : 3,
						INSTANTIATION_EXCEPTION : 4,
						MALFORMED_URL_EXCEPTION : 5,
						IO_EXCEPTION : 6,
						INVALID_ACTION : 7,
						JSON_EXCEPTION : 8,
						ERROR : 9
					},
					callbackSuccess : function (callbackId, args) {
						try {
							cordova.callbackFromNative(callbackId, true, args.status, [args.message], args.keepCallback);
						} catch (e) {
							console.log("Error in error callback: " + callbackId + " = " + e);
						}
					},
					callbackError : function (callbackId, args) {
						try {
							cordova.callbackFromNative(callbackId, false, args.status, [args.message], args.keepCallback);
						} catch (e) {
							console.log("Error in error callback: " + callbackId + " = " + e);
						}
					},
					callbackFromNative : function (callbackId, success, status, args, keepCallback) {
						var callback = cordova.callbacks[callbackId];
						if (callback) {
							if (success && status == cordova.callbackStatus.OK) {
								callback.success && callback.success.apply(null, args);
							} else if (!success) {
								callback.fail && callback.fail.apply(null, args);
							}
							if (!keepCallback) {
								delete cordova.callbacks[callbackId];
							}
						}
					},
					addConstructor : function (func) {
						channel.onCordovaReady.subscribe(function () {
							try {
								func();
							} catch (e) {
								console.log("Failed to run constructor: " + e);
							}
						});
					}
				};
				module.exports = cordova;
			});
			define("cordova/android/nativeapiprovider", function (require, exports, module) {
				var nativeApi = this._cordovaNative || require('cordova/android/promptbasednativeapi');
				var currentApi = nativeApi;
				module.exports = {
					get : function () {
						return currentApi;
					},
					setPreferPrompt : function (value) {
						currentApi = value ? require('cordova/android/promptbasednativeapi') : nativeApi;
					},
					set : function (value) {
						currentApi = value;
					}
				};
			});
			define("cordova/android/promptbasednativeapi", function (require, exports, module) {
				module.exports = {
					exec : function (service, action, callbackId, argsJson) {
						return prompt(argsJson, 'gap:' + JSON.stringify([service, action, callbackId]));
					},
					setNativeToJsBridgeMode : function (value) {
						prompt(value, 'gap_bridge_mode:');
					},
					retrieveJsMessages : function (fromOnlineEvent) {
						return prompt(+fromOnlineEvent, 'gap_poll:');
					}
				};
			});
			define("cordova/argscheck", function (require, exports, module) {
				var exec = require('cordova/exec');
				var utils = require('cordova/utils');
				var moduleExports = module.exports;
				var typeMap = {
					'A' : 'Array',
					'D' : 'Date',
					'N' : 'Number',
					'S' : 'String',
					'F' : 'Function',
					'O' : 'Object'
				};
				function extractParamName(callee, argIndex) {
					return (/.*?\((.*?)\)/).exec(callee)[1].split(', ')[argIndex];
				}
				function checkArgs(spec, functionName, args, opt_callee) {
					if (!moduleExports.enableChecks) {
						return;
					}
					var errMsg = null;
					var typeName;
					for (var i = 0; i < spec.length; ++i) {
						var c = spec.charAt(i),
						cUpper = c.toUpperCase(),
						arg = args[i];
						if (c == '*') {
							continue;
						}
						typeName = utils.typeName(arg);
						if ((arg === null || arg === undefined) && c == cUpper) {
							continue;
						}
						if (typeName != typeMap[cUpper]) {
							errMsg = 'Expected ' + typeMap[cUpper];
							break;
						}
					}
					if (errMsg) {
						errMsg += ', but got ' + typeName + '.';
						errMsg = 'Wrong type for parameter "' + extractParamName(opt_callee || args.callee, i) + '" of ' + functionName + ': ' + errMsg;
						if (typeof jasmine == 'undefined') {
							console.error(errMsg);
						}
						throw TypeError(errMsg);
					}
				}
				function getValue(value, defaultValue) {
					return value === undefined ? defaultValue : value;
				}
				moduleExports.checkArgs = checkArgs;
				moduleExports.getValue = getValue;
				moduleExports.enableChecks = true;
			});
			define("cordova/base64", function (require, exports, module) {
				var base64 = exports;
				base64.fromArrayBuffer = function (arrayBuffer) {
					var array = new Uint8Array(arrayBuffer);
					return uint8ToBase64(array);
				};
				var b64_6bit = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
				var b64_12bit;
				var b64_12bitTable = function () {
					b64_12bit = [];
					for (var i = 0; i < 64; i++) {
						for (var j = 0; j < 64; j++) {
							b64_12bit[i * 64 + j] = b64_6bit[i] + b64_6bit[j];
						}
					}
					b64_12bitTable = function () {
						return b64_12bit;
					};
					return b64_12bit;
				};
				function uint8ToBase64(rawData) {
					var numBytes = rawData.byteLength;
					var output = "";
					var segment;
					var table = b64_12bitTable();
					for (var i = 0; i < numBytes - 2; i += 3) {
						segment = (rawData[i] << 16) + (rawData[i + 1] << 8) + rawData[i + 2];
						output += table[segment >> 12];
						output += table[segment & 0xfff];
					}
					if (numBytes - i == 2) {
						segment = (rawData[i] << 16) + (rawData[i + 1] << 8);
						output += table[segment >> 12];
						output += b64_6bit[(segment & 0xfff) >> 6];
						output += '=';
					} else if (numBytes - i == 1) {
						segment = (rawData[i] << 16);
						output += table[segment >> 12];
						output += '==';
					}
					return output;
				}
			});
			define("cordova/builder", function (require, exports, module) {
				var utils = require('cordova/utils');
				function each(objects, func, context) {
					for (var prop in objects) {
						if (objects.hasOwnProperty(prop)) {
							func.apply(context, [objects[prop], prop]);
						}
					}
				}
				function clobber(obj, key, value) {
					exports.replaceHookForTesting(obj, key);
					obj[key] = value;
					if (obj[key] !== value) {
						utils.defineGetter(obj, key, function () {
							return value;
						});
					}
				}
				function assignOrWrapInDeprecateGetter(obj, key, value, message) {
					if (message) {
						utils.defineGetter(obj, key, function () {
							console.log(message);
							delete obj[key];
							clobber(obj, key, value);
							return value;
						});
					} else {
						clobber(obj, key, value);
					}
				}
				function include(parent, objects, clobber, merge) {
					each(objects, function (obj, key) {
						try {
							var result = obj.path ? require(obj.path) : {};
							if (clobber) {
								if (typeof parent[key] === 'undefined') {
									assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
								} else if (typeof obj.path !== 'undefined') {
									if (merge) {
										recursiveMerge(parent[key], result);
									} else {
										assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
									}
								}
								result = parent[key];
							} else {
								if (typeof parent[key] == 'undefined') {
									assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
								} else {
									result = parent[key];
								}
							}
							if (obj.children) {
								include(result, obj.children, clobber, merge);
							}
						} catch (e) {
							utils.alert('Exception building Cordova JS globals: ' + e + ' for key "' + key + '"');
						}
					});
				}
				function recursiveMerge(target, src) {
					for (var prop in src) {
						if (src.hasOwnProperty(prop)) {
							if (target.prototype && target.prototype.constructor === target) {
								clobber(target.prototype, prop, src[prop]);
							} else {
								if (typeof src[prop] === 'object' && typeof target[prop] === 'object') {
									recursiveMerge(target[prop], src[prop]);
								} else {
									clobber(target, prop, src[prop]);
								}
							}
						}
					}
				}
				exports.buildIntoButDoNotClobber = function (objects, target) {
					include(target, objects, false, false);
				};
				exports.buildIntoAndClobber = function (objects, target) {
					include(target, objects, true, false);
				};
				exports.buildIntoAndMerge = function (objects, target) {
					include(target, objects, true, true);
				};
				exports.recursiveMerge = recursiveMerge;
				exports.assignOrWrapInDeprecateGetter = assignOrWrapInDeprecateGetter;
				exports.replaceHookForTesting = function () {};
			});
			define("cordova/channel", function (require, exports, module) {
				var utils = require('cordova/utils'),
				nextGuid = 1;
				var Channel = function (type, sticky) {
					this.type = type;
					this.handlers = {};
					this.state = sticky ? 1 : 0;
					this.fireArgs = null;
					this.numHandlers = 0;
					this.onHasSubscribersChange = null;
				},
				channel = {
					join : function (h, c) {
						var len = c.length,
						i = len,
						f = function () {
							if (!(--i))
								h();
						};
						for (var j = 0; j < len; j++) {
							if (c[j].state === 0) {
								throw Error('Can only use join with sticky channels.');
							}
							c[j].subscribe(f);
						}
						if (!len)
							h();
					},
					create : function (type) {
						return channel[type] = new Channel(type, false);
					},
					createSticky : function (type) {
						return channel[type] = new Channel(type, true);
					},
					deviceReadyChannelsArray : [],
					deviceReadyChannelsMap : {},
					waitForInitialization : function (feature) {
						if (feature) {
							var c = channel[feature] || this.createSticky(feature);
							this.deviceReadyChannelsMap[feature] = c;
							this.deviceReadyChannelsArray.push(c);
						}
					},
					initializationComplete : function (feature) {
						var c = this.deviceReadyChannelsMap[feature];
						if (c) {
							c.fire();
						}
					}
				};
				function forceFunction(f) {
					if (typeof f != 'function')
						throw "Function required as first argument!";
				}
				Channel.prototype.subscribe = function (f, c) {
					forceFunction(f);
					if (this.state == 2) {
						f.apply(c || this, this.fireArgs);
						return;
					}
					var func = f,
					guid = f.observer_guid;
					if (typeof c == "object") {
						func = utils.close(c, f);
					}
					if (!guid) {
						guid = '' + nextGuid++;
					}
					func.observer_guid = guid;
					f.observer_guid = guid;
					if (!this.handlers[guid]) {
						this.handlers[guid] = func;
						this.numHandlers++;
						if (this.numHandlers == 1) {
							this.onHasSubscribersChange && this.onHasSubscribersChange();

						}
					}
				};
				Channel.prototype.unsubscribe = function (f) {
					forceFunction(f);
					var guid = f.observer_guid,
					handler = this.handlers[guid];
					if (handler) {
						delete this.handlers[guid];
						this.numHandlers--;
						if (this.numHandlers === 0) {
							this.onHasSubscribersChange && this.onHasSubscribersChange();
						}
					}
				};
				Channel.prototype.fire = function (e) {
					var fail = false,
					fireArgs = Array.prototype.slice.call(arguments);
					if (this.state == 1) {
						this.state = 2;
						this.fireArgs = fireArgs;
					}
					if (this.numHandlers) {
						var toCall = [];
						for (var item in this.handlers) {
							toCall.push(this.handlers[item]);
						}
						for (var i = 0; i < toCall.length; ++i) {
							toCall[i].apply(this, fireArgs);
						}
						if (this.state == 2 && this.numHandlers) {
							this.numHandlers = 0;
							this.handlers = {};
							this.onHasSubscribersChange && this.onHasSubscribersChange();
						}
					}
				};
				channel.createSticky('onDOMContentLoaded');
				channel.createSticky('onNativeReady');
				channel.createSticky('onCordovaReady');
				channel.createSticky('onPluginsReady');
				channel.createSticky('onDeviceReady');
				channel.create('onResume');
				channel.create('onPause');
				channel.createSticky('onDestroy');
				channel.waitForInitialization('onCordovaReady');
				channel.waitForInitialization('onDOMContentLoaded');
				module.exports = channel;
			});
			define("cordova/exec", function (require, exports, module) {
				var cordova = require('cordova'),
				nativeApiProvider = require('cordova/android/nativeapiprovider'),
				utils = require('cordova/utils'),
				base64 = require('cordova/base64'),
				jsToNativeModes = {
					PROMPT : 0,
					JS_OBJECT : 1,
					LOCATION_CHANGE : 2
				},
				nativeToJsModes = {
					POLLING : 0,
					LOAD_URL : 1,
					ONLINE_EVENT : 2,
					PRIVATE_API : 3
				},
				jsToNativeBridgeMode,
				nativeToJsBridgeMode = nativeToJsModes.ONLINE_EVENT,
				pollEnabled = false,
				messagesFromNative = [];
				function androidExec(success, fail, service, action, args) {
					if (jsToNativeBridgeMode === undefined) {
						androidExec.setJsToNativeBridgeMode(jsToNativeModes.JS_OBJECT);
					}
					for (var i = 0; i < args.length; i++) {
						if (utils.typeName(args[i]) == 'ArrayBuffer') {
							args[i] = base64.fromArrayBuffer(args[i]);
						}
					}
					var callbackId = service + cordova.callbackId++,
					argsJson = JSON.stringify(args);
					if (success || fail) {
						cordova.callbacks[callbackId] = {
							success : success,
							fail : fail
						};
					}
					if (jsToNativeBridgeMode == jsToNativeModes.LOCATION_CHANGE) {
						window.location = 'http://cdv_exec/' + service + '#' + action + '#' + callbackId + '#' + argsJson;
					} else {
						var messages = nativeApiProvider.get().exec(service, action, callbackId, argsJson);
						if (jsToNativeBridgeMode == jsToNativeModes.JS_OBJECT && messages === "@Null arguments.") {
							androidExec.setJsToNativeBridgeMode(jsToNativeModes.PROMPT);
							androidExec(success, fail, service, action, args);
							androidExec.setJsToNativeBridgeMode(jsToNativeModes.JS_OBJECT);
							return;
						} else {
							androidExec.processMessages(messages);
						}
					}
				}
				function pollOnceFromOnlineEvent() {
					pollOnce(true);
				}
				function pollOnce(opt_fromOnlineEvent) {
					var msg = nativeApiProvider.get().retrieveJsMessages(!!opt_fromOnlineEvent);
					androidExec.processMessages(msg);
				}
				function pollingTimerFunc() {
					if (pollEnabled) {
						pollOnce();
						setTimeout(pollingTimerFunc, 50);
					}
				}
				function hookOnlineApis() {
					function proxyEvent(e) {
						cordova.fireWindowEvent(e.type);
					}
					window.addEventListener('online', pollOnceFromOnlineEvent, false);
					window.addEventListener('offline', pollOnceFromOnlineEvent, false);
					cordova.addWindowEventHandler('online');
					cordova.addWindowEventHandler('offline');
					document.addEventListener('online', proxyEvent, false);
					document.addEventListener('offline', proxyEvent, false);
				}
				hookOnlineApis();
				androidExec.jsToNativeModes = jsToNativeModes;
				androidExec.nativeToJsModes = nativeToJsModes;
				androidExec.setJsToNativeBridgeMode = function (mode) {
					if (mode == jsToNativeModes.JS_OBJECT && !window._cordovaNative) {
						console.log('Falling back on PROMPT mode since _cordovaNative is missing. Expected for Android 3.2 and lower only.');
						mode = jsToNativeModes.PROMPT;
					}
					nativeApiProvider.setPreferPrompt(mode == jsToNativeModes.PROMPT);
					jsToNativeBridgeMode = mode;
				};
				androidExec.setNativeToJsBridgeMode = function (mode) {
					if (mode == nativeToJsBridgeMode) {
						return;
					}
					if (nativeToJsBridgeMode == nativeToJsModes.POLLING) {
						pollEnabled = false;
					}
					nativeToJsBridgeMode = mode;
					nativeApiProvider.get().setNativeToJsBridgeMode(mode);
					if (mode == nativeToJsModes.POLLING) {
						pollEnabled = true;
						setTimeout(pollingTimerFunc, 1);
					}
				};
				function processMessage(message) {
					try {
						var firstChar = message.charAt(0);
						if (firstChar == 'J') {
							eval(message.slice(1));
						} else if (firstChar == 'S' || firstChar == 'F') {
							var success = firstChar == 'S';
							var keepCallback = message.charAt(1) == '1';
							var spaceIdx = message.indexOf(' ', 2);
							var status = +message.slice(2, spaceIdx);
							var nextSpaceIdx = message.indexOf(' ', spaceIdx + 1);
							var callbackId = message.slice(spaceIdx + 1, nextSpaceIdx);
							var payloadKind = message.charAt(nextSpaceIdx + 1);
							var payload;
							if (payloadKind == 's') {
								payload = message.slice(nextSpaceIdx + 2);
							} else if (payloadKind == 't') {
								payload = true;
							} else if (payloadKind == 'f') {
								payload = false;
							} else if (payloadKind == 'N') {
								payload = null;
							} else if (payloadKind == 'n') {
								payload = +message.slice(nextSpaceIdx + 2);
							} else if (payloadKind == 'A') {
								var data = message.slice(nextSpaceIdx + 2);
								var bytes = window.atob(data);
								var arraybuffer = new Uint8Array(bytes.length);
								for (var i = 0; i < bytes.length; i++) {
									arraybuffer[i] = bytes.charCodeAt(i);
								}
								payload = arraybuffer.buffer;
							} else if (payloadKind == 'S') {
								payload = window.atob(message.slice(nextSpaceIdx + 2));
							} else {
								payload = JSON.parse(message.slice(nextSpaceIdx + 1));
							}
							cordova.callbackFromNative(callbackId, success, status, [payload], keepCallback);
						} else {
							console.log("processMessage failed: invalid message:" + message);
						}
					} catch (e) {
						console.log("processMessage failed: Message: " + message);
						console.log("processMessage failed: Error: " + e);
						console.log("processMessage failed: Stack: " + e.stack);
					}
				}
				androidExec.processMessages = function (messages) {
					if (messages) {
						messagesFromNative.push(messages);
						if (messagesFromNative.length > 1) {
							return;
						}
						while (messagesFromNative.length) {
							messages = messagesFromNative[0];
							if (messages == '*') {
								messagesFromNative.shift();
								window.setTimeout(pollOnce, 0);
								return;
							}
							var spaceIdx = messages.indexOf(' ');
							var msgLen = +messages.slice(0, spaceIdx);
							var message = messages.substr(spaceIdx + 1, msgLen);
							messages = messages.slice(spaceIdx + msgLen + 1);
							processMessage(message);
							if (messages) {
								messagesFromNative[0] = messages;
							} else {
								messagesFromNative.shift();
							}
						}
					}
				};
				module.exports = androidExec;
			});
			define("cordova/exec/proxy", function (require, exports, module) {
				var CommandProxyMap = {};
				module.exports = {
					add : function (id, proxyObj) {
						console.log("adding proxy for " + id);
						CommandProxyMap[id] = proxyObj;
						return proxyObj;
					},
					remove : function (id) {
						var proxy = CommandProxyMap[id];
						delete CommandProxyMap[id];
						CommandProxyMap[id] = null;
						return proxy;
					},
					get : function (service, action) {
						return (CommandProxyMap[service] ? CommandProxyMap[service][action] : null);
					}
				};
			});
			define("cordova/init", function (require, exports, module) {
				var channel = require('cordova/channel');
				var cordova = require('cordova');
				var modulemapper = require('cordova/modulemapper');
				var platform = require('cordova/platform');
				var pluginloader = require('cordova/pluginloader');
				var platformInitChannelsArray = [channel.onNativeReady, channel.onPluginsReady];
				function logUnfiredChannels(arr) {
					for (var i = 0; i < arr.length; ++i) {
						if (arr[i].state != 2) {
							console.log('Channel not fired: ' + arr[i].type);
						}
					}
				}
				window.setTimeout(function () {
					if (channel.onDeviceReady.state != 2) {
						console.log('deviceready has not fired after 5 seconds.');
						logUnfiredChannels(platformInitChannelsArray);
						logUnfiredChannels(channel.deviceReadyChannelsArray);
					}
				}, 5000);
				function replaceNavigator(origNavigator) {
					var CordovaNavigator = function () {};
					CordovaNavigator.prototype = origNavigator;
					var newNavigator = new CordovaNavigator();
					if (CordovaNavigator.bind) {
						for (var key in origNavigator) {
							if (typeof origNavigator[key] == 'function') {
								newNavigator[key] = origNavigator[key].bind(origNavigator);
							}
						}
					}
					return newNavigator;
				}
				if (window.navigator) {
					window.navigator = replaceNavigator(window.navigator);
				}
				if (!window.console) {
					window.console = {
						log : function () {}

					};
				}
				if (!window.console.warn) {
					window.console.warn = function (msg) {
						this.log("warn: " + msg);
					};
				}
				channel.onPause = cordova.addDocumentEventHandler('pause');
				channel.onResume = cordova.addDocumentEventHandler('resume');
				channel.onDeviceReady = cordova.addStickyDocumentEventHandler('deviceready');
				if (document.readyState == 'complete' || document.readyState == 'interactive') {
					channel.onDOMContentLoaded.fire();
				} else {
					document.addEventListener('DOMContentLoaded', function () {
						channel.onDOMContentLoaded.fire();
					}, false);
				}
				if (window._nativeReady) {
					channel.onNativeReady.fire();
				}
				modulemapper.clobbers('cordova', 'cordova');
				modulemapper.clobbers('cordova/exec', 'cordova.exec');
				modulemapper.clobbers('cordova/exec', 'Cordova.exec');
				platform.bootstrap && platform.bootstrap();
				pluginloader.load(function () {
					channel.onPluginsReady.fire();
				});
				channel.join(function () {
					modulemapper.mapModules(window);
					platform.initialize && platform.initialize();
					channel.onCordovaReady.fire();
					channel.join(function () {
						require('cordova').fireDocumentEvent('deviceready');
					}, channel.deviceReadyChannelsArray);
				}, platformInitChannelsArray);
			});
			define("cordova/modulemapper", function (require, exports, module) {
				var builder = require('cordova/builder'),
				moduleMap = define.moduleMap,
				symbolList,
				deprecationMap;
				exports.reset = function () {
					symbolList = [];
					deprecationMap = {};
				};
				function addEntry(strategy, moduleName, symbolPath, opt_deprecationMessage) {
					if (!(moduleName in moduleMap)) {
						throw new Error('Module ' + moduleName + ' does not exist.');
					}
					symbolList.push(strategy, moduleName, symbolPath);
					if (opt_deprecationMessage) {
						deprecationMap[symbolPath] = opt_deprecationMessage;
					}

				}
				exports.clobbers = function (moduleName, symbolPath, opt_deprecationMessage) {
					addEntry('c', moduleName, symbolPath, opt_deprecationMessage);
				};
				exports.merges = function (moduleName, symbolPath, opt_deprecationMessage) {
					addEntry('m', moduleName, symbolPath, opt_deprecationMessage);
				};
				exports.defaults = function (moduleName, symbolPath, opt_deprecationMessage) {
					addEntry('d', moduleName, symbolPath, opt_deprecationMessage);
				};
				exports.runs = function (moduleName) {
					addEntry('r', moduleName, null);
				};
				function prepareNamespace(symbolPath, context) {
					if (!symbolPath) {
						return context;
					}
					var parts = symbolPath.split('.');
					var cur = context;
					for (var i = 0, part; part = parts[i]; ++i) {
						cur = cur[part] = cur[part] || {};
					}
					return cur;
				}
				exports.mapModules = function (context) {
					var origSymbols = {};
					context.CDV_origSymbols = origSymbols;
					for (var i = 0, len = symbolList.length; i < len; i += 3) {
						var strategy = symbolList[i];
						var moduleName = symbolList[i + 1];
						var module = require(moduleName);
						if (strategy == 'r') {
							continue;
						}
						var symbolPath = symbolList[i + 2];
						var lastDot = symbolPath.lastIndexOf('.');
						var namespace = symbolPath.substr(0, lastDot);
						var lastName = symbolPath.substr(lastDot + 1);
						var deprecationMsg = symbolPath in deprecationMap ? 'Access made to deprecated symbol: ' + symbolPath + '. ' + deprecationMsg : null;
						var parentObj = prepareNamespace(namespace, context);
						var target = parentObj[lastName];
						if (strategy == 'm' && target) {
							builder.recursiveMerge(target, module);
						} else if ((strategy == 'd' && !target) || (strategy != 'd')) {
							if (!(symbolPath in origSymbols)) {
								origSymbols[symbolPath] = target;
							}
							builder.assignOrWrapInDeprecateGetter(parentObj, lastName, module, deprecationMsg);
						}
					}
				};
				exports.getOriginalSymbol = function (context, symbolPath) {
					var origSymbols = context.CDV_origSymbols;
					if (origSymbols && (symbolPath in origSymbols)) {
						return origSymbols[symbolPath];
					}
					var parts = symbolPath.split('.');
					var obj = context;
					for (var i = 0; i < parts.length; ++i) {
						obj = obj && obj[parts[i]];
					}
					return obj;
				};
				exports.reset();
			});
			define("cordova/platform", function (require, exports, module) {
				module.exports = {
					id : 'android',
					bootstrap : function () {
						var channel = require('cordova/channel'),
						cordova = require('cordova'),
						exec = require('cordova/exec'),
						modulemapper = require('cordova/modulemapper');
						exec(null, null, 'PluginManager', 'startup', []);
						channel.onNativeReady.fire();
						modulemapper.clobbers('cordova/plugin/android/app', 'navigator.app');
						var backButtonChannel = cordova.addDocumentEventHandler('backbutton');
						backButtonChannel.onHasSubscribersChange = function () {
							exec(null, null, "App", "overrideBackbutton", [this.numHandlers == 1]);
						};
						cordova.addDocumentEventHandler('menubutton');
						cordova.addDocumentEventHandler('searchbutton');
						channel.onCordovaReady.subscribe(function () {
							exec(null, null, "App", "show", []);
						});
					}
				};
			});
			define("cordova/plugin/android/app", function (require, exports, module) {
				var exec = require('cordova/exec');
				module.exports = {
					clearCache : function () {
						exec(null, null, "App", "clearCache", []);
					},
					loadUrl : function (url, props) {
						exec(null, null, "App", "loadUrl", [url, props]);
					},
					cancelLoadUrl : function () {
						exec(null, null, "App", "cancelLoadUrl", []);
					},
					clearHistory : function () {
						exec(null, null, "App", "clearHistory", []);
					},
					backHistory : function () {
						exec(null, null, "App", "backHistory", []);
					},
					overrideBackbutton : function (override) {
						exec(null, null, "App", "overrideBackbutton", [override]);
					},
					exitApp : function () {
						return exec(null, null, "App", "exitApp", []);
					}
				};
			});
			define("cordova/pluginloader", function (require, exports, module) {
				var modulemapper = require('cordova/modulemapper');
				function injectScript(url, onload, onerror) {
					var script = document.createElement("script");
					script.onload = onload;
					script.onerror = onerror || onload;
					script.src = url;
					document.head.appendChild(script);
				}
				function onScriptLoadingComplete(moduleList, finishPluginLoading) {
					for (var i = 0, module; module = moduleList[i]; i++) {
						if (module) {
							try {
								if (module.clobbers && module.clobbers.length) {
									for (var j = 0; j < module.clobbers.length; j++) {
										modulemapper.clobbers(module.id, module.clobbers[j]);
									}
								}
								if (module.merges && module.merges.length) {
									for (var k = 0; k < module.merges.length; k++) {
										modulemapper.merges(module.id, module.merges[k]);
									}
								}
								if (module.runs && !(module.clobbers && module.clobbers.length) && !(module.merges && module.merges.length)) {
									modulemapper.runs(module.id);
								}
							} catch (err) {}

						}
					}
					finishPluginLoading();
				}
				function handlePluginsObject(path, moduleList, finishPluginLoading) {
					var scriptCounter = moduleList.length;
					if (!scriptCounter) {
						finishPluginLoading();
						return;
					}
					function scriptLoadedCallback() {
						if (!--scriptCounter) {
							onScriptLoadingComplete(moduleList, finishPluginLoading);
						}
					}
					for (var i = 0; i < moduleList.length; i++) {
						injectScript(path + moduleList[i].file, scriptLoadedCallback);
					}
				}
				function injectPluginScript(pathPrefix, finishPluginLoading) {
					injectScript(pathPrefix + 'cordova_plugins.js', function () {
						try {
							var moduleList = require("cordova/plugin_list");
							handlePluginsObject(pathPrefix, moduleList, finishPluginLoading);
						} catch (e) {
							finishPluginLoading();
						}
					}, finishPluginLoading);
				}
				function findCordovaPath() {
					var path = null;
					var scripts = document.getElementsByTagName('script');
					var term = 'cordova.js';
					for (var n = scripts.length - 1; n > -1; n--) {
						var src = scripts[n].src;
						if (src.indexOf(term) == (src.length - term.length)) {
							path = src.substring(0, src.length - term.length);
							break;
						}
					}
					return path;
				}
				exports.load = function (callback) {
					var pathPrefix = findCordovaPath();
					if (pathPrefix === null) {
						console.log('Could not find cordova.js script tag. Plugin loading may fail.');
						pathPrefix = '';
					}
					injectPluginScript(pathPrefix, callback);
				};
			});
			define("cordova/urlutil", function (require, exports, module) {
				var urlutil = exports;
				var anchorEl = document.createElement('a');
				urlutil.makeAbsolute = function (url) {
					anchorEl.href = url;
					return anchorEl.href;
				};
			});
			define("cordova/utils", function (require, exports, module) {
				var utils = exports;
				utils.defineGetterSetter = function (obj, key, getFunc, opt_setFunc) {
					if (Object.defineProperty) {
						var desc = {
							get : getFunc,
							configurable : true
						};
						if (opt_setFunc) {
							desc.set = opt_setFunc;
						}
						Object.defineProperty(obj, key, desc);
					} else {
						obj.__defineGetter__(key, getFunc);
						if (opt_setFunc) {
							obj.__defineSetter__(key, opt_setFunc);
						}
					}
				};
				utils.defineGetter = utils.defineGetterSetter;
				utils.arrayIndexOf = function (a, item) {
					if (a.indexOf) {
						return a.indexOf(item);
					}
					var len = a.length;
					for (var i = 0; i < len; ++i) {
						if (a[i] == item) {
							return i;
						}
					}
					return -1;
				};
				utils.arrayRemove = function (a, item) {
					var index = utils.arrayIndexOf(a, item);
					if (index != -1) {
						a.splice(index, 1);
					}
					return index != -1;
				};
				utils.typeName = function (val) {
					return Object.prototype.toString.call(val).slice(8, -1);
				};
				utils.isArray = function (a) {
					return utils.typeName(a) == 'Array';
				};
				utils.isDate = function (d) {
					return utils.typeName(d) == 'Date';
				};
				utils.clone = function (obj) {
					if (!obj || typeof obj == 'function' || utils.isDate(obj) || typeof obj != 'object') {
						return obj;
					}
					var retVal,
					i;
					if (utils.isArray(obj)) {
						retVal = [];
						for (i = 0; i < obj.length; ++i) {
							retVal.push(utils.clone(obj[i]));
						}
						return retVal;
					}
					retVal = {};
					for (i in obj) {
						if (!(i in retVal) || retVal[i] != obj[i]) {
							retVal[i] = utils.clone(obj[i]);
						}
					}
					return retVal;
				};
				utils.close = function (context, func, params) {
					if (typeof params == 'undefined') {
						return function () {
							return func.apply(context, arguments);
						};
					} else {
						return function () {
							return func.apply(context, params);
						};
					}
				};
				utils.createUUID = function () {
					return UUIDcreatePart(4) + '-' +
					UUIDcreatePart(2) + '-' +
					UUIDcreatePart(2) + '-' +
					UUIDcreatePart(2) + '-' +
					UUIDcreatePart(6);
				};
				utils.extend = (function () {
					var F = function () {};
					return function (Child, Parent) {
						F.prototype = Parent.prototype;
						Child.prototype = new F();
						Child.__super__ = Parent.prototype;
						Child.prototype.constructor = Child;
					};
				}
					());
				utils.alert = function (msg) {
					if (window.alert) {
						window.alert(msg);
					} else if (console && console.log) {
						console.log(msg);
					}
				};
				function UUIDcreatePart(length) {
					var uuidpart = "";
					for (var i = 0; i < length; i++) {
						var uuidchar = parseInt((Math.random() * 256), 10).toString(16);
						if (uuidchar.length == 1) {
							uuidchar = "0" + uuidchar;
						}
						uuidpart += uuidchar;
					}
					return uuidpart;
				}
			});
			window.cordova = require('cordova');
			require('cordova/init');
		})();
	}

///////////
// MSAPP //
///////////
else if ((/MSApp/i).test(navigator.userAgent)) {
		(function () {
			var CORDOVA_JS_BUILD_LABEL = '3.4.0';
			var require,
			define;
			(function () {
				var modules = {},
				requireStack = [],
				inProgressModules = {},
				SEPARATOR = ".";
				function build(module) {
					var factory = module.factory,
					localRequire = function (id) {
						var resultantId = id;
						if (id.charAt(0) === ".") {
							resultantId = module.id.slice(0, module.id.lastIndexOf(SEPARATOR)) + SEPARATOR + id.slice(2);
						}
						return require(resultantId);
					};
					module.exports = {};
					delete module.factory;
					factory(localRequire, module.exports, module);
					return module.exports;
				}
				require = function (id) {
					if (!modules[id]) {
						throw "module " + id + " not found";
					} else if (id in inProgressModules) {
						var cycle = requireStack.slice(inProgressModules[id]).join('->') + '->' + id;
						throw "Cycle in require graph: " + cycle;
					}
					if (modules[id].factory) {
						try {
							inProgressModules[id] = requireStack.length;
							requireStack.push(id);
							return build(modules[id]);
						}
						finally {
							delete inProgressModules[id];
							requireStack.pop();
						}
					}
					return modules[id].exports;
				};
				define = function (id, factory) {
					if (modules[id]) {
						throw "module " + id + " already defined";
					}
					modules[id] = {
						id : id,
						factory : factory
					};
				};
				define.remove = function (id) {
					delete modules[id];
				};
				define.moduleMap = modules;
			})();
			if (typeof module === "object" && typeof require === "function") {
				module.exports.require = require;
				module.exports.define = define;
			}
			define("cordova", function (require, exports, module) {
				var channel = require('cordova/channel');
				var platform = require('cordova/platform');
				var m_document_addEventListener = document.addEventListener;
				var m_document_removeEventListener = document.removeEventListener;
				var m_window_addEventListener = window.addEventListener;
				var m_window_removeEventListener = window.removeEventListener;
				var documentEventHandlers = {},
				windowEventHandlers = {};
				document.addEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof documentEventHandlers[e] != 'undefined') {
						documentEventHandlers[e].subscribe(handler);
					} else {
						m_document_addEventListener.call(document, evt, handler, capture);
					}
				};
				window.addEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof windowEventHandlers[e] != 'undefined') {
						windowEventHandlers[e].subscribe(handler);
					} else {
						m_window_addEventListener.call(window, evt, handler, capture);
					}
				};
				document.removeEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof documentEventHandlers[e] != "undefined") {
						documentEventHandlers[e].unsubscribe(handler);
					} else {
						m_document_removeEventListener.call(document, evt, handler, capture);
					}
				};
				window.removeEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof windowEventHandlers[e] != "undefined") {
						windowEventHandlers[e].unsubscribe(handler);
					} else {
						m_window_removeEventListener.call(window, evt, handler, capture);
					}
				};
				function createEvent(type, data) {
					var event = document.createEvent('Events');
					event.initEvent(type, false, false);
					if (data) {
						for (var i in data) {
							if (data.hasOwnProperty(i)) {
								event[i] = data[i];
							}
						}
					}
					return event;
				}
				var cordova = {
					define : define,
					require : require,
					version : CORDOVA_JS_BUILD_LABEL,
					platformId : platform.id,
					addWindowEventHandler : function (event) {
						return (windowEventHandlers[event] = channel.create(event));
					},
					addStickyDocumentEventHandler : function (event) {
						return (documentEventHandlers[event] = channel.createSticky(event));
					},
					addDocumentEventHandler : function (event) {
						return (documentEventHandlers[event] = channel.create(event));
					},
					removeWindowEventHandler : function (event) {
						delete windowEventHandlers[event];
					},
					removeDocumentEventHandler : function (event) {
						delete documentEventHandlers[event];
					},
					getOriginalHandlers : function () {
						return {
							'document' : {
								'addEventListener' : m_document_addEventListener,
								'removeEventListener' : m_document_removeEventListener
							},
							'window' : {
								'addEventListener' : m_window_addEventListener,
								'removeEventListener' : m_window_removeEventListener
							}
						};
					},
					fireDocumentEvent : function (type, data, bNoDetach) {
						var evt = createEvent(type, data);
						if (typeof documentEventHandlers[type] != 'undefined') {
							if (bNoDetach) {
								documentEventHandlers[type].fire(evt);
							} else {
								setTimeout(function () {
									if (type == 'deviceready') {
										document.dispatchEvent(evt);
									}
									documentEventHandlers[type].fire(evt);
								}, 0);
							}
						} else {
							document.dispatchEvent(evt);
						}
					},
					fireWindowEvent : function (type, data) {
						var evt = createEvent(type, data);
						if (typeof windowEventHandlers[type] != 'undefined') {
							setTimeout(function () {
								windowEventHandlers[type].fire(evt);
							}, 0);
						} else {
							window.dispatchEvent(evt);
						}
					},
					callbackId : Math.floor(Math.random() * 2000000000),
					callbacks : {},
					callbackStatus : {
						NO_RESULT : 0,
						OK : 1,
						CLASS_NOT_FOUND_EXCEPTION : 2,
						ILLEGAL_ACCESS_EXCEPTION : 3,
						INSTANTIATION_EXCEPTION : 4,
						MALFORMED_URL_EXCEPTION : 5,
						IO_EXCEPTION : 6,
						INVALID_ACTION : 7,
						JSON_EXCEPTION : 8,
						ERROR : 9
					},
					callbackSuccess : function (callbackId, args) {
						try {
							cordova.callbackFromNative(callbackId, true, args.status, [args.message], args.keepCallback);
						} catch (e) {
							console.log("Error in error callback: " + callbackId + " = " + e);
						}
					},
					callbackError : function (callbackId, args) {
						try {
							cordova.callbackFromNative(callbackId, false, args.status, [args.message], args.keepCallback);
						} catch (e) {
							console.log("Error in error callback: " + callbackId + " = " + e);
						}
					},
					callbackFromNative : function (callbackId, success, status, args, keepCallback) {
						var callback = cordova.callbacks[callbackId];
						if (callback) {
							if (success && status == cordova.callbackStatus.OK) {
								callback.success && callback.success.apply(null, args);
							} else if (!success) {
								callback.fail && callback.fail.apply(null, args);
							}
							if (!keepCallback) {
								delete cordova.callbacks[callbackId];
							}
						}
					},
					addConstructor : function (func) {
						channel.onCordovaReady.subscribe(function () {
							try {
								func();
							} catch (e) {
								console.log("Failed to run constructor: " + e);
							}
						});
					}
				};
				module.exports = cordova;
			});
			define("cordova/argscheck", function (require, exports, module) {
				var exec = require('cordova/exec');
				var utils = require('cordova/utils');
				var moduleExports = module.exports;
				var typeMap = {
					'A' : 'Array',
					'D' : 'Date',
					'N' : 'Number',
					'S' : 'String',
					'F' : 'Function',
					'O' : 'Object'
				};
				function extractParamName(callee, argIndex) {
					return (/.*?\((.*?)\)/).exec(callee)[1].split(', ')[argIndex];
				}
				function checkArgs(spec, functionName, args, opt_callee) {
					if (!moduleExports.enableChecks) {
						return;
					}
					var errMsg = null;
					var typeName;
					for (var i = 0; i < spec.length; ++i) {
						var c = spec.charAt(i),
						cUpper = c.toUpperCase(),
						arg = args[i];
						if (c == '*') {
							continue;
						}
						typeName = utils.typeName(arg);
						if ((arg === null || arg === undefined) && c == cUpper) {
							continue;
						}
						if (typeName != typeMap[cUpper]) {
							errMsg = 'Expected ' + typeMap[cUpper];
							break;
						}
					}
					if (errMsg) {
						errMsg += ', but got ' + typeName + '.';
						errMsg = 'Wrong type for parameter "' + extractParamName(opt_callee || args.callee, i) + '" of ' + functionName + ': ' + errMsg;
						if (typeof jasmine == 'undefined') {
							console.error(errMsg);
						}
						throw TypeError(errMsg);
					}
				}
				function getValue(value, defaultValue) {
					return value === undefined ? defaultValue : value;
				}
				moduleExports.checkArgs = checkArgs;
				moduleExports.getValue = getValue;
				moduleExports.enableChecks = true;
			});
			define("cordova/base64", function (require, exports, module) {
				var base64 = exports;
				base64.fromArrayBuffer = function (arrayBuffer) {
					var array = new Uint8Array(arrayBuffer);
					return uint8ToBase64(array);
				};
				var b64_6bit = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
				var b64_12bit;
				var b64_12bitTable = function () {
					b64_12bit = [];
					for (var i = 0; i < 64; i++) {
						for (var j = 0; j < 64; j++) {
							b64_12bit[i * 64 + j] = b64_6bit[i] + b64_6bit[j];
						}
					}
					b64_12bitTable = function () {
						return b64_12bit;
					};
					return b64_12bit;
				};
				function uint8ToBase64(rawData) {
					var numBytes = rawData.byteLength;
					var output = "";
					var segment;
					var table = b64_12bitTable();
					for (var i = 0; i < numBytes - 2; i += 3) {
						segment = (rawData[i] << 16) + (rawData[i + 1] << 8) + rawData[i + 2];
						output += table[segment >> 12];
						output += table[segment & 0xfff];
					}
					if (numBytes - i == 2) {
						segment = (rawData[i] << 16) + (rawData[i + 1] << 8);
						output += table[segment >> 12];
						output += b64_6bit[(segment & 0xfff) >> 6];
						output += '=';
					} else if (numBytes - i == 1) {
						segment = (rawData[i] << 16);
						output += table[segment >> 12];
						output += '==';
					}
					return output;
				}
			});
			define("cordova/builder", function (require, exports, module) {
				var utils = require('cordova/utils');
				function each(objects, func, context) {
					for (var prop in objects) {
						if (objects.hasOwnProperty(prop)) {
							func.apply(context, [objects[prop], prop]);
						}
					}
				}
				function clobber(obj, key, value) {
					exports.replaceHookForTesting(obj, key);
					obj[key] = value;
					if (obj[key] !== value) {
						utils.defineGetter(obj, key, function () {
							return value;
						});
					}
				}
				function assignOrWrapInDeprecateGetter(obj, key, value, message) {
					if (message) {
						utils.defineGetter(obj, key, function () {
							console.log(message);
							delete obj[key];
							clobber(obj, key, value);
							return value;
						});
					} else {
						clobber(obj, key, value);
					}
				}
				function include(parent, objects, clobber, merge) {
					each(objects, function (obj, key) {
						try {
							var result = obj.path ? require(obj.path) : {};
							if (clobber) {
								if (typeof parent[key] === 'undefined') {
									assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
								} else if (typeof obj.path !== 'undefined') {
									if (merge) {
										recursiveMerge(parent[key], result);
									} else {
										assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
									}
								}
								result = parent[key];
							} else {
								if (typeof parent[key] == 'undefined') {
									assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
								} else {
									result = parent[key];
								}
							}
							if (obj.children) {
								include(result, obj.children, clobber, merge);
							}
						} catch (e) {
							utils.alert('Exception building Cordova JS globals: ' + e + ' for key "' + key + '"');
						}
					});
				}
				function recursiveMerge(target, src) {
					for (var prop in src) {
						if (src.hasOwnProperty(prop)) {
							if (target.prototype && target.prototype.constructor === target) {
								clobber(target.prototype, prop, src[prop]);
							} else {
								if (typeof src[prop] === 'object' && typeof target[prop] === 'object') {
									recursiveMerge(target[prop], src[prop]);
								} else {
									clobber(target, prop, src[prop]);
								}
							}
						}
					}
				}
				exports.buildIntoButDoNotClobber = function (objects, target) {
					include(target, objects, false, false);
				};
				exports.buildIntoAndClobber = function (objects, target) {
					include(target, objects, true, false);
				};
				exports.buildIntoAndMerge = function (objects, target) {
					include(target, objects, true, true);
				};
				exports.recursiveMerge = recursiveMerge;
				exports.assignOrWrapInDeprecateGetter = assignOrWrapInDeprecateGetter;
				exports.replaceHookForTesting = function () {};
			});
			define("cordova/channel", function (require, exports, module) {
				var utils = require('cordova/utils'),
				nextGuid = 1;
				var Channel = function (type, sticky) {
					this.type = type;
					this.handlers = {};
					this.state = sticky ? 1 : 0;
					this.fireArgs = null;
					this.numHandlers = 0;
					this.onHasSubscribersChange = null;
				},
				channel = {
					join : function (h, c) {

						var len = c.length,
						i = len,
						f = function () {
							if (!(--i))
								h();
						};
						for (var j = 0; j < len; j++) {
							if (c[j].state === 0) {
								throw Error('Can only use join with sticky channels.');
							}
							c[j].subscribe(f);
						}
						if (!len)
							h();
					},
					create : function (type) {
						return channel[type] = new Channel(type, false);
					},
					createSticky : function (type) {
						return channel[type] = new Channel(type, true);
					},
					deviceReadyChannelsArray : [],
					deviceReadyChannelsMap : {},
					waitForInitialization : function (feature) {
						if (feature) {
							var c = channel[feature] || this.createSticky(feature);
							this.deviceReadyChannelsMap[feature] = c;
							this.deviceReadyChannelsArray.push(c);
						}
					},
					initializationComplete : function (feature) {
						var c = this.deviceReadyChannelsMap[feature];
						if (c) {
							c.fire();
						}
					}
				};
				function forceFunction(f) {
					if (typeof f != 'function')
						throw "Function required as first argument!";
				}
				Channel.prototype.subscribe = function (f, c) {
					forceFunction(f);
					if (this.state == 2) {
						f.apply(c || this, this.fireArgs);
						return;
					}
					var func = f,
					guid = f.observer_guid;
					if (typeof c == "object") {
						func = utils.close(c, f);
					}
					if (!guid) {
						guid = '' + nextGuid++;
					}
					func.observer_guid = guid;
					f.observer_guid = guid;
					if (!this.handlers[guid]) {
						this.handlers[guid] = func;
						this.numHandlers++;
						if (this.numHandlers == 1) {
							this.onHasSubscribersChange && this.onHasSubscribersChange();
						}
					}
				};
				Channel.prototype.unsubscribe = function (f) {
					forceFunction(f);
					var guid = f.observer_guid,
					handler = this.handlers[guid];
					if (handler) {
						delete this.handlers[guid];
						this.numHandlers--;
						if (this.numHandlers === 0) {
							this.onHasSubscribersChange && this.onHasSubscribersChange();
						}
					}
				};
				Channel.prototype.fire = function (e) {
					var fail = false,
					fireArgs = Array.prototype.slice.call(arguments);
					if (this.state == 1) {
						this.state = 2;
						this.fireArgs = fireArgs;
					}
					if (this.numHandlers) {
						var toCall = [];
						for (var item in this.handlers) {
							toCall.push(this.handlers[item]);
						}
						for (var i = 0; i < toCall.length; ++i) {
							toCall[i].apply(this, fireArgs);
						}
						if (this.state == 2 && this.numHandlers) {
							this.numHandlers = 0;
							this.handlers = {};
							this.onHasSubscribersChange && this.onHasSubscribersChange();
						}
					}
				};
				channel.createSticky('onDOMContentLoaded');
				channel.createSticky('onNativeReady');
				channel.createSticky('onCordovaReady');
				channel.createSticky('onPluginsReady');
				channel.createSticky('onDeviceReady');
				channel.create('onResume');
				channel.create('onPause');
				channel.createSticky('onDestroy');
				channel.waitForInitialization('onCordovaReady');
				channel.waitForInitialization('onDOMContentLoaded');
				module.exports = channel;
			});
			define("cordova/exec", function (require, exports, module) {
				var cordova = require('cordova');
				var execProxy = require('cordova/exec/proxy');
				module.exports = function (success, fail, service, action, args) {
					var proxy = execProxy.get(service, action),
					callbackId,
					onSuccess,
					onError;
					if (proxy) {
						callbackId = service + cordova.callbackId++;
						if (typeof success === "function" || typeof fail === "function") {
							cordova.callbacks[callbackId] = {
								success : success,
								fail : fail
							};
						}
						try {
							onSuccess = function (result, callbackOptions) {
								callbackOptions = callbackOptions || {};
								cordova.callbackSuccess(callbackOptions.callbackId || callbackId, {
									status : callbackOptions.status || cordova.callbackStatus.OK,
									message : result,
									keepCallback : callbackOptions.keepCallback || false
								});
							};
							onError = function (err, callbackOptions) {
								callbackOptions = callbackOptions || {};
								cordova.callbackError(callbackOptions.callbackId || callbackId, {
									status : callbackOptions.status || cordova.callbackStatus.ERROR,
									message : err,
									keepCallback : callbackOptions.keepCallback || false
								});
							};
							proxy(onSuccess, onError, args);
						} catch (e) {
							console.log("Exception calling native with command :: " + service + " :: " + action + " ::exception=" + e);
						}
					} else {
						if (typeof fail === "function") {
							fail("Missing Command Error");
						}
					}
				};
			});
			define("cordova/exec/proxy", function (require, exports, module) {
				var CommandProxyMap = {};
				module.exports = {
					add : function (id, proxyObj) {
						console.log("adding proxy for " + id);
						CommandProxyMap[id] = proxyObj;
						return proxyObj;
					},
					remove : function (id) {
						var proxy = CommandProxyMap[id];
						delete CommandProxyMap[id];
						CommandProxyMap[id] = null;
						return proxy;
					},
					get : function (service, action) {
						return (CommandProxyMap[service] ? CommandProxyMap[service][action] : null);
					}
				};
			});
			define("cordova/init", function (require, exports, module) {
				var channel = require('cordova/channel');
				var cordova = require('cordova');
				var modulemapper = require('cordova/modulemapper');
				var platform = require('cordova/platform');
				var pluginloader = require('cordova/pluginloader');
				var platformInitChannelsArray = [channel.onNativeReady, channel.onPluginsReady];
				function logUnfiredChannels(arr) {
					for (var i = 0; i < arr.length; ++i) {
						if (arr[i].state != 2) {
							console.log('Channel not fired: ' + arr[i].type);
						}
					}
				}
				window.setTimeout(function () {
					if (channel.onDeviceReady.state != 2) {
						console.log('deviceready has not fired after 5 seconds.');
						logUnfiredChannels(platformInitChannelsArray);
						logUnfiredChannels(channel.deviceReadyChannelsArray);
					}
				}, 5000);
				function replaceNavigator(origNavigator) {
					var CordovaNavigator = function () {};
					CordovaNavigator.prototype = origNavigator;
					var newNavigator = new CordovaNavigator();
					if (CordovaNavigator.bind) {
						for (var key in origNavigator) {
							if (typeof origNavigator[key] == 'function') {
								newNavigator[key] = origNavigator[key].bind(origNavigator);
							}
						}
					}
					return newNavigator;
				}
				if (window.navigator) {
					window.navigator = replaceNavigator(window.navigator);
				}
				if (!window.console) {
					window.console = {
						log : function () {}

					};
				}
				if (!window.console.warn) {
					window.console.warn = function (msg) {
						this.log("warn: " + msg);
					};
				}
				channel.onPause = cordova.addDocumentEventHandler('pause');
				channel.onResume = cordova.addDocumentEventHandler('resume');
				channel.onDeviceReady = cordova.addStickyDocumentEventHandler('deviceready');
				if (document.readyState == 'complete' || document.readyState == 'interactive') {
					channel.onDOMContentLoaded.fire();
				} else {
					document.addEventListener('DOMContentLoaded', function () {
						channel.onDOMContentLoaded.fire();
					}, false);
				}
				if (window._nativeReady) {
					channel.onNativeReady.fire();
				}
				modulemapper.clobbers('cordova', 'cordova');
				modulemapper.clobbers('cordova/exec', 'cordova.exec');
				modulemapper.clobbers('cordova/exec', 'Cordova.exec');
				platform.bootstrap && platform.bootstrap();
				pluginloader.load(function () {
					channel.onPluginsReady.fire();
				});
				channel.join(function () {
					modulemapper.mapModules(window);
					platform.initialize && platform.initialize();
					channel.onCordovaReady.fire();
					channel.join(function () {
						require('cordova').fireDocumentEvent('deviceready');
					}, channel.deviceReadyChannelsArray);
				}, platformInitChannelsArray);
			});
			define("cordova/modulemapper", function (require, exports, module) {
				var builder = require('cordova/builder'),
				moduleMap = define.moduleMap,
				symbolList,
				deprecationMap;
				exports.reset = function () {
					symbolList = [];
					deprecationMap = {};
				};
				function addEntry(strategy, moduleName, symbolPath, opt_deprecationMessage) {
					if (!(moduleName in moduleMap)) {
						throw new Error('Module ' + moduleName + ' does not exist.');
					}
					symbolList.push(strategy, moduleName, symbolPath);
					if (opt_deprecationMessage) {
						deprecationMap[symbolPath] = opt_deprecationMessage;
					}
				}
				exports.clobbers = function (moduleName, symbolPath, opt_deprecationMessage) {
					addEntry('c', moduleName, symbolPath, opt_deprecationMessage);
				};
				exports.merges = function (moduleName, symbolPath, opt_deprecationMessage) {
					addEntry('m', moduleName, symbolPath, opt_deprecationMessage);
				};
				exports.defaults = function (moduleName, symbolPath, opt_deprecationMessage) {
					addEntry('d', moduleName, symbolPath, opt_deprecationMessage);
				};
				exports.runs = function (moduleName) {
					addEntry('r', moduleName, null);
				};
				function prepareNamespace(symbolPath, context) {
					if (!symbolPath) {
						return context;
					}
					var parts = symbolPath.split('.');
					var cur = context;
					for (var i = 0, part; part = parts[i]; ++i) {
						cur = cur[part] = cur[part] || {};
					}
					return cur;
				}
				exports.mapModules = function (context) {
					var origSymbols = {};
					context.CDV_origSymbols = origSymbols;
					for (var i = 0, len = symbolList.length; i < len; i += 3) {
						var strategy = symbolList[i];
						var moduleName = symbolList[i + 1];
						var module = require(moduleName);
						if (strategy == 'r') {
							continue;
						}
						var symbolPath = symbolList[i + 2];
						var lastDot = symbolPath.lastIndexOf('.');
						var namespace = symbolPath.substr(0, lastDot);
						var lastName = symbolPath.substr(lastDot + 1);
						var deprecationMsg = symbolPath in deprecationMap ? 'Access made to deprecated symbol: ' + symbolPath + '. ' + deprecationMsg : null;
						var parentObj = prepareNamespace(namespace, context);
						var target = parentObj[lastName];
						if (strategy == 'm' && target) {
							builder.recursiveMerge(target, module);
						} else if ((strategy == 'd' && !target) || (strategy != 'd')) {
							if (!(symbolPath in origSymbols)) {
								origSymbols[symbolPath] = target;
							}
							builder.assignOrWrapInDeprecateGetter(parentObj, lastName, module, deprecationMsg);
						}
					}
				};
				exports.getOriginalSymbol = function (context, symbolPath) {
					var origSymbols = context.CDV_origSymbols;
					if (origSymbols && (symbolPath in origSymbols)) {
						return origSymbols[symbolPath];
					}
					var parts = symbolPath.split('.');
					var obj = context;
					for (var i = 0; i < parts.length; ++i) {
						obj = obj && obj[parts[i]];
					}
					return obj;
				};
				exports.reset();
			});
			define("cordova/platform", function (require, exports, module) {
				module.exports = {
					id : 'windows8',
					bootstrap : function () {
						var cordova = require('cordova'),
						exec = require('cordova/exec'),
						channel = cordova.require('cordova/channel'),
						modulemapper = require('cordova/modulemapper');
						modulemapper.clobbers('cordova/exec/proxy', 'cordova.commandProxy');
						channel.onNativeReady.fire();
						var onWinJSReady = function () {
							var app = WinJS.Application;
							var checkpointHandler = function checkpointHandler() {
								cordova.fireDocumentEvent('pause');
							};
							var resumingHandler = function resumingHandler() {
								cordova.fireDocumentEvent('resume');
							};
							app.addEventListener("checkpoint", checkpointHandler);
							Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", resumingHandler, false);
							app.start();
						};
						if (!window.WinJS) {
							var scriptElem = document.createElement("script");
							scriptElem.src = "//Microsoft.WinJS.1.0/js/base.js";
							scriptElem.addEventListener("load", onWinJSReady);
							document.head.appendChild(scriptElem);
							console.log("added WinJS ... ");
						} else {
							onWinJSReady();
						}
					}
				};
			});
			define("cordova/pluginloader", function (require, exports, module) {
				var modulemapper = require('cordova/modulemapper');
				var urlutil = require('cordova/urlutil');
				function injectScript(url, onload, onerror) {
					var script = document.createElement("script");
					script.onload = onload;
					script.onerror = onerror || onload;
					script.src = url;
					document.head.appendChild(script);
				}
				function onScriptLoadingComplete(moduleList, finishPluginLoading) {
					for (var i = 0, module; module = moduleList[i]; i++) {
						if (module) {
							try {
								if (module.clobbers && module.clobbers.length) {
									for (var j = 0; j < module.clobbers.length; j++) {
										modulemapper.clobbers(module.id, module.clobbers[j]);
									}
								}
								if (module.merges && module.merges.length) {
									for (var k = 0; k < module.merges.length; k++) {
										modulemapper.merges(module.id, module.merges[k]);
									}
								}
								if (module.runs && !(module.clobbers && module.clobbers.length) && !(module.merges && module.merges.length)) {
									modulemapper.runs(module.id);
								}
							} catch (err) {}

						}
					}
					finishPluginLoading();
				}
				function handlePluginsObject(path, moduleList, finishPluginLoading) {
					var scriptCounter = moduleList.length;
					if (!scriptCounter) {
						finishPluginLoading();
						return;
					}
					function scriptLoadedCallback() {
						if (!--scriptCounter) {
							onScriptLoadingComplete(moduleList, finishPluginLoading);
						}
					}
					for (var i = 0; i < moduleList.length; i++) {
						injectScript(path + moduleList[i].file, scriptLoadedCallback);
					}
				}
				function injectPluginScript(pathPrefix, finishPluginLoading) {
					var pluginPath = pathPrefix + 'cordova_plugins.js';
					injectScript(pluginPath, function () {
						try {
							var moduleList = require("cordova/plugin_list");
							handlePluginsObject(pathPrefix, moduleList, finishPluginLoading);
						} catch (e) {
							finishPluginLoading();
						}
					}, finishPluginLoading);
				}
				function findCordovaPath() {
					var path = null;
					var scripts = document.getElementsByTagName('script');
					var term = 'cordova.js';
					for (var n = scripts.length - 1; n > -1; n--) {
						var src = scripts[n].src;
						if (src.indexOf(term) == (src.length - term.length)) {
							path = src.substring(0, src.length - term.length);
							break;
						}
					}
					return path;
				}
				exports.load = function (callback) {
					var pathPrefix = findCordovaPath();
					if (pathPrefix === null) {
						console.log('Could not find cordova.js script tag. Plugin loading may fail.');
						pathPrefix = '';
					}
					injectPluginScript(pathPrefix, callback);
				};
			});
			define("cordova/urlutil", function (require, exports, module) {
				exports.makeAbsolute = function makeAbsolute(url) {
					var anchorEl = document.createElement('a');
					anchorEl.href = url;
					return anchorEl.href;
				};
			});
			define("cordova/utils", function (require, exports, module) {
				var utils = exports;
				utils.defineGetterSetter = function (obj, key, getFunc, opt_setFunc) {
					if (Object.defineProperty) {
						var desc = {
							get : getFunc,
							configurable : true
						};
						if (opt_setFunc) {
							desc.set = opt_setFunc;
						}
						Object.defineProperty(obj, key, desc);
					} else {
						obj.__defineGetter__(key, getFunc);
						if (opt_setFunc) {
							obj.__defineSetter__(key, opt_setFunc);
						}
					}
				};
				utils.defineGetter = utils.defineGetterSetter;
				utils.arrayIndexOf = function (a, item) {
					if (a.indexOf) {
						return a.indexOf(item);
					}
					var len = a.length;
					for (var i = 0; i < len; ++i) {
						if (a[i] == item) {
							return i;
						}
					}
					return -1;
				};
				utils.arrayRemove = function (a, item) {
					var index = utils.arrayIndexOf(a, item);
					if (index != -1) {
						a.splice(index, 1);
					}
					return index != -1;
				};
				utils.typeName = function (val) {
					return Object.prototype.toString.call(val).slice(8, -1);
				};
				utils.isArray = function (a) {
					return utils.typeName(a) == 'Array';
				};
				utils.isDate = function (d) {
					return utils.typeName(d) == 'Date';
				};
				utils.clone = function (obj) {
					if (!obj || typeof obj == 'function' || utils.isDate(obj) || typeof obj != 'object') {
						return obj;
					}
					var retVal,
					i;
					if (utils.isArray(obj)) {
						retVal = [];
						for (i = 0; i < obj.length; ++i) {
							retVal.push(utils.clone(obj[i]));
						}
						return retVal;
					}
					retVal = {};
					for (i in obj) {
						if (!(i in retVal) || retVal[i] != obj[i]) {
							retVal[i] = utils.clone(obj[i]);
						}
					}
					return retVal;
				};
				utils.close = function (context, func, params) {
					if (typeof params == 'undefined') {
						return function () {
							return func.apply(context, arguments);
						};
					} else {
						return function () {
							return func.apply(context, params);
						};
					}
				};
				utils.createUUID = function () {
					return UUIDcreatePart(4) + '-' +
					UUIDcreatePart(2) + '-' +
					UUIDcreatePart(2) + '-' +
					UUIDcreatePart(2) + '-' +
					UUIDcreatePart(6);
				};
				utils.extend = (function () {
					var F = function () {};
					return function (Child, Parent) {
						F.prototype = Parent.prototype;
						Child.prototype = new F();
						Child.__super__ = Parent.prototype;
						Child.prototype.constructor = Child;
					};
				}
					());
				utils.alert = function (msg) {
					if (window.alert) {
						window.alert(msg);
					} else if (console && console.log) {
						console.log(msg);
					}
				};
				function UUIDcreatePart(length) {
					var uuidpart = "";
					for (var i = 0; i < length; i++) {
						var uuidchar = parseInt((Math.random() * 256), 10).toString(16);
						if (uuidchar.length == 1) {
							uuidchar = "0" + uuidchar;
						}
						uuidpart += uuidchar;
					}
					return uuidpart;
				}
			});
			define("cordova/windows8/commandProxy", function (require, exports, module) {
				console.log('WARNING: please require cordova/exec/proxy instead');
				module.exports = require('cordova/exec/proxy');
			});
			window.cordova = require('cordova');
			require('cordova/init');
		})();
	}

///////////////////
// WINDOWS PHONE //
///////////////////
else if ((/IEMobile/i).test(navigator.userAgent)) {
		(function () {
			var CORDOVA_JS_BUILD_LABEL = '3.5.0';
			var require,
			define;
			(function () {
				var modules = {},
				requireStack = [],
				inProgressModules = {},
				SEPARATOR = ".";
				function build(module) {
					var factory = module.factory,
					localRequire = function (id) {
						var resultantId = id;
						if (id.charAt(0) === ".") {
							resultantId = module.id.slice(0, module.id.lastIndexOf(SEPARATOR)) + SEPARATOR + id.slice(2);
						}
						return require(resultantId);
					};
					module.exports = {};
					delete module.factory;
					factory(localRequire, module.exports, module);
					return module.exports;
				}
				require = function (id) {
					if (!modules[id]) {
						throw "module " + id + " not found";
					} else if (id in inProgressModules) {
						var cycle = requireStack.slice(inProgressModules[id]).join('->') + '->' + id;
						throw "Cycle in require graph: " + cycle;
					}
					if (modules[id].factory) {
						try {
							inProgressModules[id] = requireStack.length;
							requireStack.push(id);
							return build(modules[id]);
						}
						finally {
							delete inProgressModules[id];
							requireStack.pop();
						}
					}
					return modules[id].exports;
				};
				define = function (id, factory) {
					if (modules[id]) {
						throw "module " + id + " already defined";
					}
					modules[id] = {
						id : id,
						factory : factory
					};
				};
				define.remove = function (id) {
					delete modules[id];
				};
				define.moduleMap = modules;
			})();
			if (typeof module === "object" && typeof require === "function") {
				module.exports.require = require;
				module.exports.define = define;
			}
			define("cordova", function (require, exports, module) {
				var channel = require('cordova/channel');
				var platform = require('cordova/platform');
				var m_document_addEventListener = document.addEventListener;
				var m_document_removeEventListener = document.removeEventListener;
				var m_window_addEventListener = window.addEventListener;
				var m_window_removeEventListener = window.removeEventListener;
				var documentEventHandlers = {},
				windowEventHandlers = {};
				document.addEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof documentEventHandlers[e] != 'undefined') {
						documentEventHandlers[e].subscribe(handler);
					} else {
						m_document_addEventListener.call(document, evt, handler, capture);
					}
				};
				window.addEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof windowEventHandlers[e] != 'undefined') {
						windowEventHandlers[e].subscribe(handler);
					} else {
						m_window_addEventListener.call(window, evt, handler, capture);
					}
				};
				document.removeEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof documentEventHandlers[e] != "undefined") {
						documentEventHandlers[e].unsubscribe(handler);
					} else {
						m_document_removeEventListener.call(document, evt, handler, capture);
					}
				};
				window.removeEventListener = function (evt, handler, capture) {
					var e = evt.toLowerCase();
					if (typeof windowEventHandlers[e] != "undefined") {
						windowEventHandlers[e].unsubscribe(handler);
					} else {
						m_window_removeEventListener.call(window, evt, handler, capture);
					}
				};
				function createEvent(type, data) {
					var event = document.createEvent('Events');
					event.initEvent(type, false, false);
					if (data) {
						for (var i in data) {
							if (data.hasOwnProperty(i)) {
								event[i] = data[i];
							}
						}
					}
					return event;
				}
				var cordova = {
					define : define,
					require : require,
					version : CORDOVA_JS_BUILD_LABEL,
					platformId : platform.id,
					addWindowEventHandler : function (event) {
						return (windowEventHandlers[event] = channel.create(event));
					},
					addStickyDocumentEventHandler : function (event) {
						return (documentEventHandlers[event] = channel.createSticky(event));
					},
					addDocumentEventHandler : function (event) {
						return (documentEventHandlers[event] = channel.create(event));
					},
					removeWindowEventHandler : function (event) {
						delete windowEventHandlers[event];
					},
					removeDocumentEventHandler : function (event) {
						delete documentEventHandlers[event];
					},
					getOriginalHandlers : function () {
						return {
							'document' : {
								'addEventListener' : m_document_addEventListener,
								'removeEventListener' : m_document_removeEventListener
							},
							'window' : {
								'addEventListener' : m_window_addEventListener,
								'removeEventListener' : m_window_removeEventListener
							}
						};
					},
					fireDocumentEvent : function (type, data, bNoDetach) {
						var evt = createEvent(type, data);
						if (typeof documentEventHandlers[type] != 'undefined') {
							if (bNoDetach) {
								documentEventHandlers[type].fire(evt);
							} else {
								setTimeout(function () {
									if (type == 'deviceready') {
										document.dispatchEvent(evt);
									}
									documentEventHandlers[type].fire(evt);
								}, 0);
							}
						} else {
							document.dispatchEvent(evt);
						}
					},
					fireWindowEvent : function (type, data) {
						var evt = createEvent(type, data);
						if (typeof windowEventHandlers[type] != 'undefined') {
							setTimeout(function () {
								windowEventHandlers[type].fire(evt);
							}, 0);
						} else {
							window.dispatchEvent(evt);
						}
					},
					callbackId : Math.floor(Math.random() * 2000000000),
					callbacks : {},
					callbackStatus : {
						NO_RESULT : 0,
						OK : 1,
						CLASS_NOT_FOUND_EXCEPTION : 2,
						ILLEGAL_ACCESS_EXCEPTION : 3,
						INSTANTIATION_EXCEPTION : 4,
						MALFORMED_URL_EXCEPTION : 5,
						IO_EXCEPTION : 6,
						INVALID_ACTION : 7,
						JSON_EXCEPTION : 8,
						ERROR : 9
					},
					callbackSuccess : function (callbackId, args) {
						try {
							cordova.callbackFromNative(callbackId, true, args.status, [args.message], args.keepCallback);
						} catch (e) {
							console.log("Error in error callback: " + callbackId + " = " + e);
						}
					},
					callbackError : function (callbackId, args) {
						try {
							cordova.callbackFromNative(callbackId, false, args.status, [args.message], args.keepCallback);
						} catch (e) {
							console.log("Error in error callback: " + callbackId + " = " + e);
						}
					},
					callbackFromNative : function (callbackId, success, status, args, keepCallback) {
						var callback = cordova.callbacks[callbackId];
						if (callback) {
							if (success && status == cordova.callbackStatus.OK) {
								callback.success && callback.success.apply(null, args);
							} else if (!success) {
								callback.fail && callback.fail.apply(null, args);
							}
							if (!keepCallback) {
								delete cordova.callbacks[callbackId];
							}
						}
					},
					addConstructor : function (func) {
						channel.onCordovaReady.subscribe(function () {
							try {
								func();
							} catch (e) {
								console.log("Failed to run constructor: " + e);
							}
						});
					}
				};
				module.exports = cordova;
			});
			define("cordova/argscheck", function (require, exports, module) {
				var exec = require('cordova/exec');
				var utils = require('cordova/utils');
				var moduleExports = module.exports;
				var typeMap = {
					'A' : 'Array',
					'D' : 'Date',
					'N' : 'Number',
					'S' : 'String',
					'F' : 'Function',
					'O' : 'Object'
				};
				function extractParamName(callee, argIndex) {
					return (/.*?\((.*?)\)/).exec(callee)[1].split(', ')[argIndex];
				}
				function checkArgs(spec, functionName, args, opt_callee) {
					if (!moduleExports.enableChecks) {
						return;
					}
					var errMsg = null;
					var typeName;
					for (var i = 0; i < spec.length; ++i) {
						var c = spec.charAt(i),
						cUpper = c.toUpperCase(),
						arg = args[i];
						if (c == '*') {
							continue;
						}
						typeName = utils.typeName(arg);
						if ((arg === null || arg === undefined) && c == cUpper) {
							continue;
						}
						if (typeName != typeMap[cUpper]) {
							errMsg = 'Expected ' + typeMap[cUpper];
							break;
						}
					}
					if (errMsg) {
						errMsg += ', but got ' + typeName + '.';
						errMsg = 'Wrong type for parameter "' + extractParamName(opt_callee || args.callee, i) + '" of ' + functionName + ': ' + errMsg;
						if (typeof jasmine == 'undefined') {
							console.error(errMsg);
						}
						throw TypeError(errMsg);
					}
				}
				function getValue(value, defaultValue) {
					return value === undefined ? defaultValue : value;
				}
				moduleExports.checkArgs = checkArgs;
				moduleExports.getValue = getValue;
				moduleExports.enableChecks = true;
			});
			define("cordova/base64", function (require, exports, module) {
				var base64 = exports;
				base64.fromArrayBuffer = function (arrayBuffer) {
					var array = new Uint8Array(arrayBuffer);
					return uint8ToBase64(array);
				};
				base64.toArrayBuffer = function (str) {
					var decodedStr = typeof atob != 'undefined' ? atob(str) : new Buffer(str, 'base64').toString('binary');
					var arrayBuffer = new ArrayBuffer(decodedStr.length);
					var array = new Uint8Array(arrayBuffer);
					for (var i = 0, len = decodedStr.length; i < len; i++) {
						array[i] = decodedStr.charCodeAt(i);
					}
					return arrayBuffer;
				};
				var b64_6bit = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
				var b64_12bit;
				var b64_12bitTable = function () {
					b64_12bit = [];
					for (var i = 0; i < 64; i++) {
						for (var j = 0; j < 64; j++) {
							b64_12bit[i * 64 + j] = b64_6bit[i] + b64_6bit[j];
						}
					}
					b64_12bitTable = function () {
						return b64_12bit;
					};
					return b64_12bit;
				};
				function uint8ToBase64(rawData) {
					var numBytes = rawData.byteLength;
					var output = "";
					var segment;
					var table = b64_12bitTable();
					for (var i = 0; i < numBytes - 2; i += 3) {
						segment = (rawData[i] << 16) + (rawData[i + 1] << 8) + rawData[i + 2];
						output += table[segment >> 12];
						output += table[segment & 0xfff];
					}
					if (numBytes - i == 2) {
						segment = (rawData[i] << 16) + (rawData[i + 1] << 8);
						output += table[segment >> 12];
						output += b64_6bit[(segment & 0xfff) >> 6];
						output += '=';
					} else if (numBytes - i == 1) {
						segment = (rawData[i] << 16);
						output += table[segment >> 12];
						output += '==';
					}
					return output;
				}
			});
			define("cordova/builder", function (require, exports, module) {
				var utils = require('cordova/utils');
				function each(objects, func, context) {
					for (var prop in objects) {
						if (objects.hasOwnProperty(prop)) {
							func.apply(context, [objects[prop], prop]);
						}
					}
				}
				function clobber(obj, key, value) {
					exports.replaceHookForTesting(obj, key);
					obj[key] = value;
					if (obj[key] !== value) {
						utils.defineGetter(obj, key, function () {
							return value;
						});
					}
				}
				function assignOrWrapInDeprecateGetter(obj, key, value, message) {
					if (message) {
						utils.defineGetter(obj, key, function () {
							console.log(message);
							delete obj[key];
							clobber(obj, key, value);
							return value;
						});
					} else {
						clobber(obj, key, value);
					}
				}
				function include(parent, objects, clobber, merge) {
					each(objects, function (obj, key) {
						try {
							var result = obj.path ? require(obj.path) : {};
							if (clobber) {
								if (typeof parent[key] === 'undefined') {
									assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
								} else if (typeof obj.path !== 'undefined') {
									if (merge) {
										recursiveMerge(parent[key], result);
									} else {
										assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
									}
								}
								result = parent[key];
							} else {
								if (typeof parent[key] == 'undefined') {
									assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
								} else {
									result = parent[key];
								}
							}
							if (obj.children) {
								include(result, obj.children, clobber, merge);
							}
						} catch (e) {
							utils.alert('Exception building Cordova JS globals: ' + e + ' for key "' + key + '"');
						}
					});
				}
				function recursiveMerge(target, src) {
					for (var prop in src) {
						if (src.hasOwnProperty(prop)) {
							if (target.prototype && target.prototype.constructor === target) {
								clobber(target.prototype, prop, src[prop]);
							} else {
								if (typeof src[prop] === 'object' && typeof target[prop] === 'object') {
									recursiveMerge(target[prop], src[prop]);
								} else {
									clobber(target, prop, src[prop]);
								}
							}
						}
					}
				}
				exports.buildIntoButDoNotClobber = function (objects, target) {
					include(target, objects, false, false);
				};
				exports.buildIntoAndClobber = function (objects, target) {
					include(target, objects, true, false);
				};
				exports.buildIntoAndMerge = function (objects, target) {
					include(target, objects, true, true);
				};
				exports.recursiveMerge = recursiveMerge;
				exports.assignOrWrapInDeprecateGetter = assignOrWrapInDeprecateGetter;
				exports.replaceHookForTesting = function () {};
			});
			define("cordova/channel", function (require, exports, module) {
				var utils = require('cordova/utils'),
				nextGuid = 1;
				var Channel = function (type, sticky) {
					this.type = type;
					this.handlers = {};
					this.state = sticky ? 1 : 0;
					this.fireArgs = null;
					this.numHandlers = 0;
					this.onHasSubscribersChange = null;
				},
				channel = {
					join : function (h, c) {
						var len = c.length,
						i = len,
						f = function () {
							if (!(--i))
								h();
						};
						for (var j = 0; j < len; j++) {
							if (c[j].state === 0) {
								throw Error('Can only use join with sticky channels.');
							}
							c[j].subscribe(f);
						}
						if (!len)
							h();
					},
					create : function (type) {
						return channel[type] = new Channel(type, false);
					},
					createSticky : function (type) {
						return channel[type] = new Channel(type, true);
					},
					deviceReadyChannelsArray : [],
					deviceReadyChannelsMap : {},
					waitForInitialization : function (feature) {
						if (feature) {
							var c = channel[feature] || this.createSticky(feature);
							this.deviceReadyChannelsMap[feature] = c;
							this.deviceReadyChannelsArray.push(c);
						}
					},
					initializationComplete : function (feature) {
						var c = this.deviceReadyChannelsMap[feature];
						if (c) {
							c.fire();
						}
					}
				};
				function forceFunction(f) {
					if (typeof f != 'function')
						throw "Function required as first argument!";
				}
				Channel.prototype.subscribe = function (f, c) {
					forceFunction(f);
					if (this.state == 2) {
						f.apply(c || this, this.fireArgs);
						return;
					}
					var func = f,
					guid = f.observer_guid;
					if (typeof c == "object") {
						func = utils.close(c, f);
					}
					if (!guid) {
						guid = '' + nextGuid++;
					}
					func.observer_guid = guid;
					f.observer_guid = guid;
					if (!this.handlers[guid]) {
						this.handlers[guid] = func;
						this.numHandlers++;
						if (this.numHandlers == 1) {
							this.onHasSubscribersChange && this.onHasSubscribersChange();
						}
					}
				};
				Channel.prototype.unsubscribe = function (f) {
					forceFunction(f);
					var guid = f.observer_guid,
					handler = this.handlers[guid];
					if (handler) {
						delete this.handlers[guid];
						this.numHandlers--;
						if (this.numHandlers === 0) {
							this.onHasSubscribersChange && this.onHasSubscribersChange();
						}
					}
				};
				Channel.prototype.fire = function (e) {
					var fail = false,
					fireArgs = Array.prototype.slice.call(arguments);
					if (this.state == 1) {
						this.state = 2;
						this.fireArgs = fireArgs;
					}
					if (this.numHandlers) {
						var toCall = [];
						for (var item in this.handlers) {
							toCall.push(this.handlers[item]);
						}
						for (var i = 0; i < toCall.length; ++i) {
							toCall[i].apply(this, fireArgs);
						}
						if (this.state == 2 && this.numHandlers) {
							this.numHandlers = 0;
							this.handlers = {};
							this.onHasSubscribersChange && this.onHasSubscribersChange();
						}
					}
				};
				channel.createSticky('onDOMContentLoaded');
				channel.createSticky('onNativeReady');
				channel.createSticky('onCordovaReady');

				channel.createSticky('onPluginsReady');
				channel.createSticky('onDeviceReady');
				channel.create('onResume');
				channel.create('onPause');
				channel.createSticky('onDestroy');
				channel.waitForInitialization('onCordovaReady');
				channel.waitForInitialization('onDOMContentLoaded');
				module.exports = channel;
			});
			define("cordova/exec", function (require, exports, module) {
				var cordova = require('cordova'),
				base64 = require('cordova/base64');
				module.exports = function (success, fail, service, action, args) {
					var callbackId = service + cordova.callbackId++;
					if (typeof success == "function" || typeof fail == "function") {
						cordova.callbacks[callbackId] = {
							success : success,
							fail : fail
						};
					}
					for (var n = 0; n < args.length; n++) {
						if (typeof ArrayBuffer !== "undefined" && args[n]instanceof ArrayBuffer) {
							args[n] = base64.fromArrayBuffer(args[n]);
						}
						if (typeof args[n] !== "string") {
							args[n] = JSON.stringify(args[n]);
						}
					}
					var command = service + "/" + action + "/" + callbackId + "/" + JSON.stringify(args);
					try {
						if (window.external) {
							window.external.Notify(command);
						} else {
							console.log("window.external not available :: command=" + command);
						}
					} catch (e) {
						console.log("Exception calling native with command :: " + command + " :: exception=" + e);
					}
				};
			});
			define("cordova/exec/proxy", function (require, exports, module) {
				var CommandProxyMap = {};
				module.exports = {
					add : function (id, proxyObj) {
						console.log("adding proxy for " + id);
						CommandProxyMap[id] = proxyObj;
						return proxyObj;
					},
					remove : function (id) {
						var proxy = CommandProxyMap[id];
						delete CommandProxyMap[id];
						CommandProxyMap[id] = null;
						return proxy;
					},
					get : function (service, action) {
						return (CommandProxyMap[service] ? CommandProxyMap[service][action] : null);
					}
				};
			});
			define("cordova/init", function (require, exports, module) {
				var channel = require('cordova/channel');
				var cordova = require('cordova');
				var modulemapper = require('cordova/modulemapper');
				var platform = require('cordova/platform');
				var pluginloader = require('cordova/pluginloader');
				var platformInitChannelsArray = [channel.onNativeReady, channel.onPluginsReady];
				function logUnfiredChannels(arr) {
					for (var i = 0; i < arr.length; ++i) {
						if (arr[i].state != 2) {
							console.log('Channel not fired: ' + arr[i].type);
						}
					}
				}
				window.setTimeout(function () {
					if (channel.onDeviceReady.state != 2) {
						console.log('deviceready has not fired after 5 seconds.');
						logUnfiredChannels(platformInitChannelsArray);
						logUnfiredChannels(channel.deviceReadyChannelsArray);
					}
				}, 5000);
				function replaceNavigator(origNavigator) {
					var CordovaNavigator = function () {};
					CordovaNavigator.prototype = origNavigator;
					var newNavigator = new CordovaNavigator();
					if (CordovaNavigator.bind) {
						for (var key in origNavigator) {
							if (typeof origNavigator[key] == 'function') {
								newNavigator[key] = origNavigator[key].bind(origNavigator);
							}
						}
					}
					return newNavigator;
				}
				if (window.navigator) {
					window.navigator = replaceNavigator(window.navigator);
				}
				if (!window.console) {
					window.console = {
						log : function () {}

					};
				}
				if (!window.console.warn) {
					window.console.warn = function (msg) {
						this.log("warn: " + msg);
					};
				}
				channel.onPause = cordova.addDocumentEventHandler('pause');
				channel.onResume = cordova.addDocumentEventHandler('resume');
				channel.onDeviceReady = cordova.addStickyDocumentEventHandler('deviceready');
				if (document.readyState == 'complete' || document.readyState == 'interactive') {
					channel.onDOMContentLoaded.fire();
				} else {
					document.addEventListener('DOMContentLoaded', function () {
						channel.onDOMContentLoaded.fire();
					}, false);
				}
				if (window._nativeReady) {
					channel.onNativeReady.fire();
				}
				modulemapper.clobbers('cordova', 'cordova');
				modulemapper.clobbers('cordova/exec', 'cordova.exec');
				modulemapper.clobbers('cordova/exec', 'Cordova.exec');
				platform.bootstrap && platform.bootstrap();
				setTimeout(function () {
					pluginloader.load(function () {
						channel.onPluginsReady.fire();
					});
				}, 0);
				channel.join(function () {
					modulemapper.mapModules(window);
					platform.initialize && platform.initialize();
					channel.onCordovaReady.fire();
					channel.join(function () {
						require('cordova').fireDocumentEvent('deviceready');
					}, channel.deviceReadyChannelsArray);
				}, platformInitChannelsArray);
			});
			define("cordova/init_b", function (require, exports, module) {
				var channel = require('cordova/channel');
				var cordova = require('cordova');
				var platform = require('cordova/platform');
				var platformInitChannelsArray = [channel.onDOMContentLoaded, channel.onNativeReady];
				cordova.exec = require('cordova/exec');
				function logUnfiredChannels(arr) {
					for (var i = 0; i < arr.length; ++i) {
						if (arr[i].state != 2) {
							console.log('Channel not fired: ' + arr[i].type);
						}
					}
				}
				window.setTimeout(function () {
					if (channel.onDeviceReady.state != 2) {
						console.log('deviceready has not fired after 5 seconds.');
						logUnfiredChannels(platformInitChannelsArray);
						logUnfiredChannels(channel.deviceReadyChannelsArray);
					}
				}, 5000);
				function replaceNavigator(origNavigator) {
					var CordovaNavigator = function () {};
					CordovaNavigator.prototype = origNavigator;
					var newNavigator = new CordovaNavigator();
					if (CordovaNavigator.bind) {
						for (var key in origNavigator) {
							if (typeof origNavigator[key] == 'function') {
								newNavigator[key] = origNavigator[key].bind(origNavigator);
							}
						}
					}
					return newNavigator;
				}
				if (window.navigator) {
					window.navigator = replaceNavigator(window.navigator);
				}
				if (!window.console) {
					window.console = {
						log : function () {}

					};
				}
				if (!window.console.warn) {
					window.console.warn = function (msg) {
						this.log("warn: " + msg);
					};
				}
				channel.onPause = cordova.addDocumentEventHandler('pause');
				channel.onResume = cordova.addDocumentEventHandler('resume');
				channel.onDeviceReady = cordova.addStickyDocumentEventHandler('deviceready');
				if (document.readyState == 'complete' || document.readyState == 'interactive') {
					channel.onDOMContentLoaded.fire();
				} else {
					document.addEventListener('DOMContentLoaded', function () {
						channel.onDOMContentLoaded.fire();
					}, false);
				}
				if (window._nativeReady) {
					channel.onNativeReady.fire();
				}
				platform.bootstrap && platform.bootstrap();
				channel.join(function () {
					platform.initialize && platform.initialize();
					channel.onCordovaReady.fire();
					channel.join(function () {
						require('cordova').fireDocumentEvent('deviceready');
					}, channel.deviceReadyChannelsArray);
				}, platformInitChannelsArray);
			});
			define("cordova/modulemapper", function (require, exports, module) {
				var builder = require('cordova/builder'),
				moduleMap = define.moduleMap,
				symbolList,
				deprecationMap;
				exports.reset = function () {
					symbolList = [];
					deprecationMap = {};
				};
				function addEntry(strategy, moduleName, symbolPath, opt_deprecationMessage) {
					if (!(moduleName in moduleMap)) {
						throw new Error('Module ' + moduleName + ' does not exist.');
					}
					symbolList.push(strategy, moduleName, symbolPath);
					if (opt_deprecationMessage) {
						deprecationMap[symbolPath] = opt_deprecationMessage;
					}
				}
				exports.clobbers = function (moduleName, symbolPath, opt_deprecationMessage) {
					addEntry('c', moduleName, symbolPath, opt_deprecationMessage);
				};
				exports.merges = function (moduleName, symbolPath, opt_deprecationMessage) {
					addEntry('m', moduleName, symbolPath, opt_deprecationMessage);
				};
				exports.defaults = function (moduleName, symbolPath, opt_deprecationMessage) {
					addEntry('d', moduleName, symbolPath, opt_deprecationMessage);
				};
				exports.runs = function (moduleName) {
					addEntry('r', moduleName, null);
				};
				function prepareNamespace(symbolPath, context) {
					if (!symbolPath) {
						return context;
					}
					var parts = symbolPath.split('.');
					var cur = context;
					for (var i = 0, part; part = parts[i]; ++i) {
						cur = cur[part] = cur[part] || {};
					}
					return cur;
				}
				exports.mapModules = function (context) {
					var origSymbols = {};
					context.CDV_origSymbols = origSymbols;
					for (var i = 0, len = symbolList.length; i < len; i += 3) {
						var strategy = symbolList[i];
						var moduleName = symbolList[i + 1];
						var module = require(moduleName);
						if (strategy == 'r') {
							continue;
						}
						var symbolPath = symbolList[i + 2];
						var lastDot = symbolPath.lastIndexOf('.');
						var namespace = symbolPath.substr(0, lastDot);
						var lastName = symbolPath.substr(lastDot + 1);
						var deprecationMsg = symbolPath in deprecationMap ? 'Access made to deprecated symbol: ' + symbolPath + '. ' + deprecationMsg : null;
						var parentObj = prepareNamespace(namespace, context);
						var target = parentObj[lastName];
						if (strategy == 'm' && target) {
							builder.recursiveMerge(target, module);
						} else if ((strategy == 'd' && !target) || (strategy != 'd')) {
							if (!(symbolPath in origSymbols)) {
								origSymbols[symbolPath] = target;
							}
							builder.assignOrWrapInDeprecateGetter(parentObj, lastName, module, deprecationMsg);
						}
					}
				};
				exports.getOriginalSymbol = function (context, symbolPath) {
					var origSymbols = context.CDV_origSymbols;
					if (origSymbols && (symbolPath in origSymbols)) {
						return origSymbols[symbolPath];
					}
					var parts = symbolPath.split('.');
					var obj = context;
					for (var i = 0; i < parts.length; ++i) {
						obj = obj && obj[parts[i]];
					}
					return obj;
				};
				exports.reset();
			});
			define("cordova/platform", function (require, exports, module) {
				module.exports = {
					id : 'windowsphone',
					bootstrap : function () {
						var cordova = require('cordova'),
						exec = require('cordova/exec');
						var backButtonChannel = cordova.addDocumentEventHandler('backbutton');
						backButtonChannel.onHasSubscribersChange = function () {
							exec(null, null, "CoreEvents", "overridebackbutton", [this.numHandlers == 1]);
						};
					}
				};
			});
			define("cordova/pluginloader", function (require, exports, module) {
				var modulemapper = require('cordova/modulemapper');
				var urlutil = require('cordova/urlutil');
				exports.injectScript = function (url, onload, onerror) {
					var script = document.createElement("script");
					script.onload = onload;
					script.onerror = onerror;
					script.src = url;
					document.head.appendChild(script);
				};
				function injectIfNecessary(id, url, onload, onerror) {
					onerror = onerror || onload;
					if (id in define.moduleMap) {
						onload();
					} else {
						exports.injectScript(url, function () {
							if (id in define.moduleMap) {
								onload();
							} else {
								onerror();
							}
						}, onerror);
					}
				}
				function onScriptLoadingComplete(moduleList, finishPluginLoading) {
					for (var i = 0, module; module = moduleList[i]; i++) {
						if (module.clobbers && module.clobbers.length) {
							for (var j = 0; j < module.clobbers.length; j++) {
								modulemapper.clobbers(module.id, module.clobbers[j]);
							}
						}
						if (module.merges && module.merges.length) {
							for (var k = 0; k < module.merges.length; k++) {
								modulemapper.merges(module.id, module.merges[k]);
							}
						}
						if (module.runs) {
							modulemapper.runs(module.id);
						}
					}
					finishPluginLoading();
				}
				function handlePluginsObject(path, moduleList, finishPluginLoading) {
					var scriptCounter = moduleList.length;
					if (!scriptCounter) {
						finishPluginLoading();
						return;
					}
					function scriptLoadedCallback() {
						if (!--scriptCounter) {
							onScriptLoadingComplete(moduleList, finishPluginLoading);
						}
					}
					for (var i = 0; i < moduleList.length; i++) {
						injectIfNecessary(moduleList[i].id, path + moduleList[i].file, scriptLoadedCallback);
					}
				}
				function findCordovaPath() {
					var path = null;
					var scripts = document.getElementsByTagName('script');
					var term = 'cordova.js';
					for (var n = scripts.length - 1; n > -1; n--) {
						var src = scripts[n].src.replace(/\?.*$/, '');
						if (src.indexOf(term) == (src.length - term.length)) {
							path = src.substring(0, src.length - term.length);
							break;
						}
					}
					return path;
				}
				exports.load = function (callback) {
					var pathPrefix = findCordovaPath();
					if (pathPrefix === null) {
						console.log('Could not find cordova.js script tag. Plugin loading may fail.');
						pathPrefix = '';
					}
					injectIfNecessary('cordova/plugin_list', pathPrefix + 'cordova_plugins.js', function () {
						var moduleList = require("cordova/plugin_list");
						handlePluginsObject(pathPrefix, moduleList, callback);
					}, callback);
				};
			});
			define("cordova/urlutil", function (require, exports, module) {
				exports.makeAbsolute = function makeAbsolute(url) {
					var anchorEl = document.createElement('a');
					anchorEl.href = url;
					return anchorEl.href;
				};
			});
			define("cordova/utils", function (require, exports, module) {
				var utils = exports;
				utils.defineGetterSetter = function (obj, key, getFunc, opt_setFunc) {
					if (Object.defineProperty) {
						var desc = {
							get : getFunc,
							configurable : true
						};
						if (opt_setFunc) {
							desc.set = opt_setFunc;
						}
						Object.defineProperty(obj, key, desc);
					} else {
						obj.__defineGetter__(key, getFunc);
						if (opt_setFunc) {
							obj.__defineSetter__(key, opt_setFunc);
						}
					}
				};
				utils.defineGetter = utils.defineGetterSetter;
				utils.arrayIndexOf = function (a, item) {
					if (a.indexOf) {
						return a.indexOf(item);
					}
					var len = a.length;
					for (var i = 0; i < len; ++i) {
						if (a[i] == item) {
							return i;
						}
					}
					return -1;
				};
				utils.arrayRemove = function (a, item) {
					var index = utils.arrayIndexOf(a, item);
					if (index != -1) {
						a.splice(index, 1);
					}
					return index != -1;
				};
				utils.typeName = function (val) {
					return Object.prototype.toString.call(val).slice(8, -1);
				};
				utils.isArray = function (a) {
					return utils.typeName(a) == 'Array';
				};
				utils.isDate = function (d) {
					return utils.typeName(d) == 'Date';
				};
				utils.clone = function (obj) {
					if (!obj || typeof obj == 'function' || utils.isDate(obj) || typeof obj != 'object') {
						return obj;
					}
					var retVal,
					i;
					if (utils.isArray(obj)) {
						retVal = [];
						for (i = 0; i < obj.length; ++i) {
							retVal.push(utils.clone(obj[i]));
						}
						return retVal;
					}
					retVal = {};
					for (i in obj) {
						if (!(i in retVal) || retVal[i] != obj[i]) {
							retVal[i] = utils.clone(obj[i]);
						}
					}
					return retVal;
				};
				utils.close = function (context, func, params) {
					if (typeof params == 'undefined') {
						return function () {
							return func.apply(context, arguments);
						};
					} else {
						return function () {
							return func.apply(context, params);
						};
					}
				};
				utils.createUUID = function () {
					return UUIDcreatePart(4) + '-' +
					UUIDcreatePart(2) + '-' +
					UUIDcreatePart(2) + '-' +
					UUIDcreatePart(2) + '-' +
					UUIDcreatePart(6);
				};
				utils.extend = (function () {
					var F = function () {};
					return function (Child, Parent) {
						F.prototype = Parent.prototype;
						Child.prototype = new F();
						Child.__super__ = Parent.prototype;
						Child.prototype.constructor = Child;
					};
				}
					());
				utils.alert = function (msg) {
					if (window.alert) {
						window.alert(msg);
					} else if (console && console.log) {
						console.log(msg);
					}
				};
				function UUIDcreatePart(length) {
					var uuidpart = "";
					for (var i = 0; i < length; i++) {
						var uuidchar = parseInt((Math.random() * 256), 10).toString(16);
						if (uuidchar.length == 1) {
							uuidchar = "0" + uuidchar;
						}
						uuidpart += uuidchar;
					}
					return uuidpart;
				}
			});
			window.cordova = require('cordova');
			require('cordova/init');
		})();
	}
}
////////////////
// BLACKBERRY //
////////////////
else if ((/BlackBerry/i).test(navigator.userAgent)) {

// Platform: blackberry10
// 3.4.0
/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at
 
     http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
*/
;(function() {
var CORDOVA_JS_BUILD_LABEL = '3.4.0';
// file: src/scripts/require.js

/*jshint -W079 */
/*jshint -W020 */

var require,
    define;

(function () {
    var modules = {},
    // Stack of moduleIds currently being built.
        requireStack = [],
    // Map of module ID -> index into requireStack of modules currently being built.
        inProgressModules = {},
        SEPARATOR = ".";



    function build(module) {
        var factory = module.factory,
            localRequire = function (id) {
                var resultantId = id;
                //Its a relative path, so lop off the last portion and add the id (minus "./")
                if (id.charAt(0) === ".") {
                    resultantId = module.id.slice(0, module.id.lastIndexOf(SEPARATOR)) + SEPARATOR + id.slice(2);
                }
                return require(resultantId);
            };
        module.exports = {};
        delete module.factory;
        factory(localRequire, module.exports, module);
        return module.exports;
    }

    require = function (id) {
        if (!modules[id]) {
            throw "module " + id + " not found";
        } else if (id in inProgressModules) {
            var cycle = requireStack.slice(inProgressModules[id]).join('->') + '->' + id;
            throw "Cycle in require graph: " + cycle;
        }
        if (modules[id].factory) {
            try {
                inProgressModules[id] = requireStack.length;
                requireStack.push(id);
                return build(modules[id]);
            } finally {
                delete inProgressModules[id];
                requireStack.pop();
            }
        }
        return modules[id].exports;
    };

    define = function (id, factory) {
        if (modules[id]) {
            throw "module " + id + " already defined";
        }

        modules[id] = {
            id: id,
            factory: factory
        };
    };

    define.remove = function (id) {
        delete modules[id];
    };

    define.moduleMap = modules;
})();

//Export for use in node
if (typeof module === "object" && typeof require === "function") {
    module.exports.require = require;
    module.exports.define = define;
}

// file: src/cordova.js
define("cordova", function(require, exports, module) {


var channel = require('cordova/channel');
var platform = require('cordova/platform');

/**
 * Intercept calls to addEventListener + removeEventListener and handle deviceready,
 * resume, and pause events.
 */
var m_document_addEventListener = document.addEventListener;
var m_document_removeEventListener = document.removeEventListener;
var m_window_addEventListener = window.addEventListener;
var m_window_removeEventListener = window.removeEventListener;

/**
 * Houses custom event handlers to intercept on document + window event listeners.
 */
var documentEventHandlers = {},
    windowEventHandlers = {};

document.addEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    if (typeof documentEventHandlers[e] != 'undefined') {
        documentEventHandlers[e].subscribe(handler);
    } else {
        m_document_addEventListener.call(document, evt, handler, capture);
    }
};

window.addEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    if (typeof windowEventHandlers[e] != 'undefined') {
        windowEventHandlers[e].subscribe(handler);
    } else {
        m_window_addEventListener.call(window, evt, handler, capture);
    }
};

document.removeEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    // If unsubscribing from an event that is handled by a plugin
    if (typeof documentEventHandlers[e] != "undefined") {
        documentEventHandlers[e].unsubscribe(handler);
    } else {
        m_document_removeEventListener.call(document, evt, handler, capture);
    }
};

window.removeEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    // If unsubscribing from an event that is handled by a plugin
    if (typeof windowEventHandlers[e] != "undefined") {
        windowEventHandlers[e].unsubscribe(handler);
    } else {
        m_window_removeEventListener.call(window, evt, handler, capture);
    }
};

function createEvent(type, data) {
    var event = document.createEvent('Events');
    event.initEvent(type, false, false);
    if (data) {
        for (var i in data) {
            if (data.hasOwnProperty(i)) {
                event[i] = data[i];
            }
        }
    }
    return event;
}


var cordova = {
    define:define,
    require:require,
    version:CORDOVA_JS_BUILD_LABEL,
    platformId:platform.id,
    /**
     * Methods to add/remove your own addEventListener hijacking on document + window.
     */
    addWindowEventHandler:function(event) {
        return (windowEventHandlers[event] = channel.create(event));
    },
    addStickyDocumentEventHandler:function(event) {
        return (documentEventHandlers[event] = channel.createSticky(event));
    },
    addDocumentEventHandler:function(event) {
        return (documentEventHandlers[event] = channel.create(event));
    },
    removeWindowEventHandler:function(event) {
        delete windowEventHandlers[event];
    },
    removeDocumentEventHandler:function(event) {
        delete documentEventHandlers[event];
    },
    /**
     * Retrieve original event handlers that were replaced by Cordova
     *
     * @return object
     */
    getOriginalHandlers: function() {
        return {'document': {'addEventListener': m_document_addEventListener, 'removeEventListener': m_document_removeEventListener},
        'window': {'addEventListener': m_window_addEventListener, 'removeEventListener': m_window_removeEventListener}};
    },
    /**
     * Method to fire event from native code
     * bNoDetach is required for events which cause an exception which needs to be caught in native code
     */
    fireDocumentEvent: function(type, data, bNoDetach) {
        var evt = createEvent(type, data);
        if (typeof documentEventHandlers[type] != 'undefined') {
            if( bNoDetach ) {
                documentEventHandlers[type].fire(evt);
            }
            else {
                setTimeout(function() {
                    // Fire deviceready on listeners that were registered before cordova.js was loaded.
                    if (type == 'deviceready') {
                        document.dispatchEvent(evt);
                    }
                    documentEventHandlers[type].fire(evt);
                }, 0);
            }
        } else {
            document.dispatchEvent(evt);
        }
    },
    fireWindowEvent: function(type, data) {
        var evt = createEvent(type,data);
        if (typeof windowEventHandlers[type] != 'undefined') {
            setTimeout(function() {
                windowEventHandlers[type].fire(evt);
            }, 0);
        } else {
            window.dispatchEvent(evt);
        }
    },

    /**
     * Plugin callback mechanism.
     */
    // Randomize the starting callbackId to avoid collisions after refreshing or navigating.
    // This way, it's very unlikely that any new callback would get the same callbackId as an old callback.
    callbackId: Math.floor(Math.random() * 2000000000),
    callbacks:  {},
    callbackStatus: {
        NO_RESULT: 0,
        OK: 1,
        CLASS_NOT_FOUND_EXCEPTION: 2,
        ILLEGAL_ACCESS_EXCEPTION: 3,
        INSTANTIATION_EXCEPTION: 4,
        MALFORMED_URL_EXCEPTION: 5,
        IO_EXCEPTION: 6,
        INVALID_ACTION: 7,
        JSON_EXCEPTION: 8,
        ERROR: 9
    },

    /**
     * Called by native code when returning successful result from an action.
     */
    callbackSuccess: function(callbackId, args) {
        try {
            cordova.callbackFromNative(callbackId, true, args.status, [args.message], args.keepCallback);
        } catch (e) {
            console.log("Error in error callback: " + callbackId + " = "+e);
        }
    },

    /**
     * Called by native code when returning error result from an action.
     */
    callbackError: function(callbackId, args) {
        // TODO: Deprecate callbackSuccess and callbackError in favour of callbackFromNative.
        // Derive success from status.
        try {
            cordova.callbackFromNative(callbackId, false, args.status, [args.message], args.keepCallback);
        } catch (e) {
            console.log("Error in error callback: " + callbackId + " = "+e);
        }
    },

    /**
     * Called by native code when returning the result from an action.
     */
    callbackFromNative: function(callbackId, success, status, args, keepCallback) {
        var callback = cordova.callbacks[callbackId];
        if (callback) {
            if (success && status == cordova.callbackStatus.OK) {
                callback.success && callback.success.apply(null, args);
            } else if (!success) {
                callback.fail && callback.fail.apply(null, args);
            }

            // Clear callback if not expecting any more results
            if (!keepCallback) {
                delete cordova.callbacks[callbackId];
            }
        }
    },
    addConstructor: function(func) {
        channel.onCordovaReady.subscribe(function() {
            try {
                func();
            } catch(e) {
                console.log("Failed to run constructor: " + e);
            }
        });
    }
};


module.exports = cordova;

});

// file: src/common/argscheck.js
define("cordova/argscheck", function(require, exports, module) {

var exec = require('cordova/exec');
var utils = require('cordova/utils');

var moduleExports = module.exports;

var typeMap = {
    'A': 'Array',
    'D': 'Date',
    'N': 'Number',
    'S': 'String',
    'F': 'Function',
    'O': 'Object'
};

function extractParamName(callee, argIndex) {
    return (/.*?\((.*?)\)/).exec(callee)[1].split(', ')[argIndex];
}

function checkArgs(spec, functionName, args, opt_callee) {
    if (!moduleExports.enableChecks) {
        return;
    }
    var errMsg = null;
    var typeName;
    for (var i = 0; i < spec.length; ++i) {
        var c = spec.charAt(i),
            cUpper = c.toUpperCase(),
            arg = args[i];
        // Asterix means allow anything.
        if (c == '*') {
            continue;
        }
        typeName = utils.typeName(arg);
        if ((arg === null || arg === undefined) && c == cUpper) {
            continue;
        }
        if (typeName != typeMap[cUpper]) {
            errMsg = 'Expected ' + typeMap[cUpper];
            break;
        }
    }
    if (errMsg) {
        errMsg += ', but got ' + typeName + '.';
        errMsg = 'Wrong type for parameter "' + extractParamName(opt_callee || args.callee, i) + '" of ' + functionName + ': ' + errMsg;
        // Don't log when running unit tests.
        if (typeof jasmine == 'undefined') {
            console.error(errMsg);
        }
        throw TypeError(errMsg);
    }
}

function getValue(value, defaultValue) {
    return value === undefined ? defaultValue : value;
}

moduleExports.checkArgs = checkArgs;
moduleExports.getValue = getValue;
moduleExports.enableChecks = true;


});

// file: src/common/base64.js
define("cordova/base64", function(require, exports, module) {

var base64 = exports;

base64.fromArrayBuffer = function(arrayBuffer) {
    var array = new Uint8Array(arrayBuffer);
    return uint8ToBase64(array);
};

//------------------------------------------------------------------------------

/* This code is based on the performance tests at http://jsperf.com/b64tests
 * This 12-bit-at-a-time algorithm was the best performing version on all
 * platforms tested.
 */

var b64_6bit = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var b64_12bit;

var b64_12bitTable = function() {
    b64_12bit = [];
    for (var i=0; i<64; i++) {
        for (var j=0; j<64; j++) {
            b64_12bit[i*64+j] = b64_6bit[i] + b64_6bit[j];
        }
    }
    b64_12bitTable = function() { return b64_12bit; };
    return b64_12bit;
};

function uint8ToBase64(rawData) {
    var numBytes = rawData.byteLength;
    var output="";
    var segment;
    var table = b64_12bitTable();
    for (var i=0;i<numBytes-2;i+=3) {
        segment = (rawData[i] << 16) + (rawData[i+1] << 8) + rawData[i+2];
        output += table[segment >> 12];
        output += table[segment & 0xfff];
    }
    if (numBytes - i == 2) {
        segment = (rawData[i] << 16) + (rawData[i+1] << 8);
        output += table[segment >> 12];
        output += b64_6bit[(segment & 0xfff) >> 6];
        output += '=';
    } else if (numBytes - i == 1) {
        segment = (rawData[i] << 16);
        output += table[segment >> 12];
        output += '==';
    }
    return output;
}

});

// file: src/common/builder.js
define("cordova/builder", function(require, exports, module) {

var utils = require('cordova/utils');

function each(objects, func, context) {
    for (var prop in objects) {
        if (objects.hasOwnProperty(prop)) {
            func.apply(context, [objects[prop], prop]);
        }
    }
}

function clobber(obj, key, value) {
    exports.replaceHookForTesting(obj, key);
    obj[key] = value;
    // Getters can only be overridden by getters.
    if (obj[key] !== value) {
        utils.defineGetter(obj, key, function() {
            return value;
        });
    }
}

function assignOrWrapInDeprecateGetter(obj, key, value, message) {
    if (message) {
        utils.defineGetter(obj, key, function() {
            console.log(message);
            delete obj[key];
            clobber(obj, key, value);
            return value;
        });
    } else {
        clobber(obj, key, value);
    }
}

function include(parent, objects, clobber, merge) {
    each(objects, function (obj, key) {
        try {
            var result = obj.path ? require(obj.path) : {};

            if (clobber) {
                // Clobber if it doesn't exist.
                if (typeof parent[key] === 'undefined') {
                    assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
                } else if (typeof obj.path !== 'undefined') {
                    // If merging, merge properties onto parent, otherwise, clobber.
                    if (merge) {
                        recursiveMerge(parent[key], result);
                    } else {
                        assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
                    }
                }
                result = parent[key];
            } else {
                // Overwrite if not currently defined.
                if (typeof parent[key] == 'undefined') {
                    assignOrWrapInDeprecateGetter(parent, key, result, obj.deprecated);
                } else {
                    // Set result to what already exists, so we can build children into it if they exist.
                    result = parent[key];
                }
            }

            if (obj.children) {
                include(result, obj.children, clobber, merge);
            }
        } catch(e) {
            utils.alert('Exception building Cordova JS globals: ' + e + ' for key "' + key + '"');
        }
    });
}

/**
 * Merge properties from one object onto another recursively.  Properties from
 * the src object will overwrite existing target property.
 *
 * @param target Object to merge properties into.
 * @param src Object to merge properties from.
 */
function recursiveMerge(target, src) {
    for (var prop in src) {
        if (src.hasOwnProperty(prop)) {
            if (target.prototype && target.prototype.constructor === target) {
                // If the target object is a constructor override off prototype.
                clobber(target.prototype, prop, src[prop]);
            } else {
                if (typeof src[prop] === 'object' && typeof target[prop] === 'object') {
                    recursiveMerge(target[prop], src[prop]);
                } else {
                    clobber(target, prop, src[prop]);
                }
            }
        }
    }
}

exports.buildIntoButDoNotClobber = function(objects, target) {
    include(target, objects, false, false);
};
exports.buildIntoAndClobber = function(objects, target) {
    include(target, objects, true, false);
};
exports.buildIntoAndMerge = function(objects, target) {
    include(target, objects, true, true);
};
exports.recursiveMerge = recursiveMerge;
exports.assignOrWrapInDeprecateGetter = assignOrWrapInDeprecateGetter;
exports.replaceHookForTesting = function() {};

});

// file: src/common/channel.js
define("cordova/channel", function(require, exports, module) {

var utils = require('cordova/utils'),
    nextGuid = 1;

/**
 * Custom pub-sub "channel" that can have functions subscribed to it
 * This object is used to define and control firing of events for
 * cordova initialization, as well as for custom events thereafter.
 *
 * The order of events during page load and Cordova startup is as follows:
 *
 * onDOMContentLoaded*         Internal event that is received when the web page is loaded and parsed.
 * onNativeReady*              Internal event that indicates the Cordova native side is ready.
 * onCordovaReady*             Internal event fired when all Cordova JavaScript objects have been created.
 * onDeviceReady*              User event fired to indicate that Cordova is ready
 * onResume                    User event fired to indicate a start/resume lifecycle event
 * onPause                     User event fired to indicate a pause lifecycle event
 * onDestroy*                  Internal event fired when app is being destroyed (User should use window.onunload event, not this one).
 *
 * The events marked with an * are sticky. Once they have fired, they will stay in the fired state.
 * All listeners that subscribe after the event is fired will be executed right away.
 *
 * The only Cordova events that user code should register for are:
 *      deviceready           Cordova native code is initialized and Cordova APIs can be called from JavaScript
 *      pause                 App has moved to background
 *      resume                App has returned to foreground
 *
 * Listeners can be registered as:
 *      document.addEventListener("deviceready", myDeviceReadyListener, false);
 *      document.addEventListener("resume", myResumeListener, false);
 *      document.addEventListener("pause", myPauseListener, false);
 *
 * The DOM lifecycle events should be used for saving and restoring state
 *      window.onload
 *      window.onunload
 *
 */

/**
 * Channel
 * @constructor
 * @param type  String the channel name
 */
var Channel = function(type, sticky) {
    this.type = type;
    // Map of guid -> function.
    this.handlers = {};
    // 0 = Non-sticky, 1 = Sticky non-fired, 2 = Sticky fired.
    this.state = sticky ? 1 : 0;
    // Used in sticky mode to remember args passed to fire().
    this.fireArgs = null;
    // Used by onHasSubscribersChange to know if there are any listeners.
    this.numHandlers = 0;
    // Function that is called when the first listener is subscribed, or when
    // the last listener is unsubscribed.
    this.onHasSubscribersChange = null;
},
    channel = {
        /**
         * Calls the provided function only after all of the channels specified
         * have been fired. All channels must be sticky channels.
         */
        join: function(h, c) {
            var len = c.length,
                i = len,
                f = function() {
                    if (!(--i)) h();
                };
            for (var j=0; j<len; j++) {
                if (c[j].state === 0) {
                    throw Error('Can only use join with sticky channels.');
                }
                c[j].subscribe(f);
            }
            if (!len) h();
        },
        create: function(type) {
            return channel[type] = new Channel(type, false);
        },
        createSticky: function(type) {
            return channel[type] = new Channel(type, true);
        },

        /**
         * cordova Channels that must fire before "deviceready" is fired.
         */
        deviceReadyChannelsArray: [],
        deviceReadyChannelsMap: {},

        /**
         * Indicate that a feature needs to be initialized before it is ready to be used.
         * This holds up Cordova's "deviceready" event until the feature has been initialized
         * and Cordova.initComplete(feature) is called.
         *
         * @param feature {String}     The unique feature name
         */
        waitForInitialization: function(feature) {
            if (feature) {
                var c = channel[feature] || this.createSticky(feature);
                this.deviceReadyChannelsMap[feature] = c;
                this.deviceReadyChannelsArray.push(c);
            }
        },

        /**
         * Indicate that initialization code has completed and the feature is ready to be used.
         *
         * @param feature {String}     The unique feature name
         */
        initializationComplete: function(feature) {
            var c = this.deviceReadyChannelsMap[feature];
            if (c) {
                c.fire();
            }
        }
    };

function forceFunction(f) {
    if (typeof f != 'function') throw "Function required as first argument!";
}

/**
 * Subscribes the given function to the channel. Any time that
 * Channel.fire is called so too will the function.
 * Optionally specify an execution context for the function
 * and a guid that can be used to stop subscribing to the channel.
 * Returns the guid.
 */
Channel.prototype.subscribe = function(f, c) {
    // need a function to call
    forceFunction(f);
    if (this.state == 2) {
        f.apply(c || this, this.fireArgs);
        return;
    }

    var func = f,
        guid = f.observer_guid;
    if (typeof c == "object") { func = utils.close(c, f); }

    if (!guid) {
        // first time any channel has seen this subscriber
        guid = '' + nextGuid++;
    }
    func.observer_guid = guid;
    f.observer_guid = guid;

    // Don't add the same handler more than once.
    if (!this.handlers[guid]) {
        this.handlers[guid] = func;
        this.numHandlers++;
        if (this.numHandlers == 1) {
            this.onHasSubscribersChange && this.onHasSubscribersChange();
        }
    }
};

/**
 * Unsubscribes the function with the given guid from the channel.
 */
Channel.prototype.unsubscribe = function(f) {
    // need a function to unsubscribe
    forceFunction(f);

    var guid = f.observer_guid,
        handler = this.handlers[guid];
    if (handler) {
        delete this.handlers[guid];
        this.numHandlers--;
        if (this.numHandlers === 0) {
            this.onHasSubscribersChange && this.onHasSubscribersChange();
        }
    }
};

/**
 * Calls all functions subscribed to this channel.
 */
Channel.prototype.fire = function(e) {
    var fail = false,
        fireArgs = Array.prototype.slice.call(arguments);
    // Apply stickiness.
    if (this.state == 1) {
        this.state = 2;
        this.fireArgs = fireArgs;
    }
    if (this.numHandlers) {
        // Copy the values first so that it is safe to modify it from within
        // callbacks.
        var toCall = [];
        for (var item in this.handlers) {
            toCall.push(this.handlers[item]);
        }
        for (var i = 0; i < toCall.length; ++i) {
            toCall[i].apply(this, fireArgs);
        }
        if (this.state == 2 && this.numHandlers) {
            this.numHandlers = 0;
            this.handlers = {};
            this.onHasSubscribersChange && this.onHasSubscribersChange();
        }
    }
};


// defining them here so they are ready super fast!
// DOM event that is received when the web page is loaded and parsed.
channel.createSticky('onDOMContentLoaded');

// Event to indicate the Cordova native side is ready.
channel.createSticky('onNativeReady');

// Event to indicate that all Cordova JavaScript objects have been created
// and it's time to run plugin constructors.
channel.createSticky('onCordovaReady');

// Event to indicate that all automatically loaded JS plugins are loaded and ready.
channel.createSticky('onPluginsReady');

// Event to indicate that Cordova is ready
channel.createSticky('onDeviceReady');

// Event to indicate a resume lifecycle event
channel.create('onResume');

// Event to indicate a pause lifecycle event
channel.create('onPause');

// Event to indicate a destroy lifecycle event
channel.createSticky('onDestroy');

// Channels that must fire before "deviceready" is fired.
channel.waitForInitialization('onCordovaReady');
channel.waitForInitialization('onDOMContentLoaded');

module.exports = channel;

});

// file: src/blackberry10/exec.js
define("cordova/exec", function(require, exports, module) {

var cordova = require('cordova'),
    execProxy = require('cordova/exec/proxy');

function RemoteFunctionCall(functionUri) {
    var params = {};

    function composeUri() {
        return "http://localhost:8472/" + functionUri;
    }

    function createXhrRequest(uri, isAsync) {
        var request = new XMLHttpRequest();
        request.open("POST", uri, isAsync);
        request.setRequestHeader("Content-Type", "application/json");
        return request;
    }

    this.addParam = function (name, value) {
        params[name] = encodeURIComponent(JSON.stringify(value));
    };

    this.makeAsyncCall = function () {
        var requestUri = composeUri(),
            request = new XMLHttpRequest(),
            didSucceed,
            response,
            fail = function () {
                var callbackId = JSON.parse(decodeURIComponent(params.callbackId));
                response = JSON.parse(decodeURIComponent(request.responseText) || "null");
                cordova.callbacks[callbackId].fail && cordova.callbacks[callbackId].fail(response.msg, response);
                delete cordova.callbacks[callbackId];
            };

        request.open("POST", requestUri, true /* async */);
        request.setRequestHeader("Content-Type", "application/json");
        request.timeout = 1000; // Timeout in 1000ms
        request.ontimeout = fail;
        request.onerror = fail;

        request.onload = function () {
            response = JSON.parse(decodeURIComponent(request.responseText) || "null");
            if (request.status === 200) {
                didSucceed = response.code === cordova.callbackStatus.OK || response.code === cordova.callbackStatus.NO_RESULT;
                cordova.callbackFromNative(
                        JSON.parse(decodeURIComponent(params.callbackId)),
                        didSucceed,
                        response.code,
                        [ didSucceed ? response.data : response.msg ],
                        !!response.keepCallback
                        );
            } else {
                fail();
            }
        };

        request.send(JSON.stringify(params));
    };

    this.makeSyncCall = function () {
        var requestUri = composeUri(),
        request = createXhrRequest(requestUri, false),
        response;
        request.send(JSON.stringify(params));
        response = JSON.parse(decodeURIComponent(request.responseText) || "null");
        return response;
    };

}

module.exports = function (success, fail, service, action, args, sync) {
    var uri = service + "/" + action,
    request = new RemoteFunctionCall(uri),
    callbackId = service + cordova.callbackId++,
    proxy,
    response,
    name,
    didSucceed;

    cordova.callbacks[callbackId] = {
        success: success,
        fail: fail
    };

    proxy = execProxy.get(service, action);

    if (proxy) {
        proxy(success, fail, args);
    }

    else {

        request.addParam("callbackId", callbackId);

        for (name in args) {
            if (Object.hasOwnProperty.call(args, name)) {
                request.addParam(name, args[name]);
            }
        }

        if (sync !== undefined && !sync) {
            request.makeAsyncCall();
            return;
        }

        response = request.makeSyncCall();

        if (response.code < 0) {
            if (fail) {
                fail(response.msg, response);
            }
            delete cordova.callbacks[callbackId];
        } else {
            didSucceed = response.code === cordova.callbackStatus.OK || response.code === cordova.callbackStatus.NO_RESULT;
            cordova.callbackFromNative(
                callbackId,
                didSucceed,
                response.code,
                [ didSucceed ? response.data : response.msg ],
                !!response.keepCallback
            );
        }
    }

};

});

// file: src/common/exec/proxy.js
define("cordova/exec/proxy", function(require, exports, module) {


// internal map of proxy function
var CommandProxyMap = {};

module.exports = {

    // example: cordova.commandProxy.add("Accelerometer",{getCurrentAcceleration: function(successCallback, errorCallback, options) {...},...);
    add:function(id,proxyObj) {
        console.log("adding proxy for " + id);
        CommandProxyMap[id] = proxyObj;
        return proxyObj;
    },

    // cordova.commandProxy.remove("Accelerometer");
    remove:function(id) {
        var proxy = CommandProxyMap[id];
        delete CommandProxyMap[id];
        CommandProxyMap[id] = null;
        return proxy;
    },

    get:function(service,action) {
        return ( CommandProxyMap[service] ? CommandProxyMap[service][action] : null );
    }
};
});

// file: src/common/init.js
define("cordova/init", function(require, exports, module) {

var channel = require('cordova/channel');
var cordova = require('cordova');
var modulemapper = require('cordova/modulemapper');
var platform = require('cordova/platform');
var pluginloader = require('cordova/pluginloader');

var platformInitChannelsArray = [channel.onNativeReady, channel.onPluginsReady];

function logUnfiredChannels(arr) {
    for (var i = 0; i < arr.length; ++i) {
        if (arr[i].state != 2) {
            console.log('Channel not fired: ' + arr[i].type);
        }
    }
}

window.setTimeout(function() {
    if (channel.onDeviceReady.state != 2) {
        console.log('deviceready has not fired after 5 seconds.');
        logUnfiredChannels(platformInitChannelsArray);
        logUnfiredChannels(channel.deviceReadyChannelsArray);
    }
}, 5000);

// Replace navigator before any modules are required(), to ensure it happens as soon as possible.
// We replace it so that properties that can't be clobbered can instead be overridden.
function replaceNavigator(origNavigator) {
    var CordovaNavigator = function() {};
    CordovaNavigator.prototype = origNavigator;
    var newNavigator = new CordovaNavigator();
    // This work-around really only applies to new APIs that are newer than Function.bind.
    // Without it, APIs such as getGamepads() break.
    if (CordovaNavigator.bind) {
        for (var key in origNavigator) {
            if (typeof origNavigator[key] == 'function') {
                newNavigator[key] = origNavigator[key].bind(origNavigator);
            }
        }
    }
    return newNavigator;
}
if (window.navigator) {
    window.navigator = replaceNavigator(window.navigator);
}

if (!window.console) {
    window.console = {
        log: function(){}
    };
}
if (!window.console.warn) {
    window.console.warn = function(msg) {
        this.log("warn: " + msg);
    };
}

// Register pause, resume and deviceready channels as events on document.
channel.onPause = cordova.addDocumentEventHandler('pause');
channel.onResume = cordova.addDocumentEventHandler('resume');
channel.onDeviceReady = cordova.addStickyDocumentEventHandler('deviceready');

// Listen for DOMContentLoaded and notify our channel subscribers.
if (document.readyState == 'complete' || document.readyState == 'interactive') {
    channel.onDOMContentLoaded.fire();
} else {
    document.addEventListener('DOMContentLoaded', function() {
        channel.onDOMContentLoaded.fire();
    }, false);
}

// _nativeReady is global variable that the native side can set
// to signify that the native code is ready. It is a global since
// it may be called before any cordova JS is ready.
if (window._nativeReady) {
    channel.onNativeReady.fire();
}

modulemapper.clobbers('cordova', 'cordova');
modulemapper.clobbers('cordova/exec', 'cordova.exec');
modulemapper.clobbers('cordova/exec', 'Cordova.exec');

// Call the platform-specific initialization.
platform.bootstrap && platform.bootstrap();

pluginloader.load(function() {
    channel.onPluginsReady.fire();
});

/**
 * Create all cordova objects once native side is ready.
 */
channel.join(function() {
    modulemapper.mapModules(window);

    platform.initialize && platform.initialize();

    // Fire event to notify that all objects are created
    channel.onCordovaReady.fire();

    // Fire onDeviceReady event once page has fully loaded, all
    // constructors have run and cordova info has been received from native
    // side.
    channel.join(function() {
        require('cordova').fireDocumentEvent('deviceready');
    }, channel.deviceReadyChannelsArray);

}, platformInitChannelsArray);


});

// file: src/common/modulemapper.js
define("cordova/modulemapper", function(require, exports, module) {

var builder = require('cordova/builder'),
    moduleMap = define.moduleMap,
    symbolList,
    deprecationMap;

exports.reset = function() {
    symbolList = [];
    deprecationMap = {};
};

function addEntry(strategy, moduleName, symbolPath, opt_deprecationMessage) {
    if (!(moduleName in moduleMap)) {
        throw new Error('Module ' + moduleName + ' does not exist.');
    }
    symbolList.push(strategy, moduleName, symbolPath);
    if (opt_deprecationMessage) {
        deprecationMap[symbolPath] = opt_deprecationMessage;
    }
}

// Note: Android 2.3 does have Function.bind().
exports.clobbers = function(moduleName, symbolPath, opt_deprecationMessage) {
    addEntry('c', moduleName, symbolPath, opt_deprecationMessage);
};

exports.merges = function(moduleName, symbolPath, opt_deprecationMessage) {
    addEntry('m', moduleName, symbolPath, opt_deprecationMessage);
};

exports.defaults = function(moduleName, symbolPath, opt_deprecationMessage) {
    addEntry('d', moduleName, symbolPath, opt_deprecationMessage);
};

exports.runs = function(moduleName) {
    addEntry('r', moduleName, null);
};

function prepareNamespace(symbolPath, context) {
    if (!symbolPath) {
        return context;
    }
    var parts = symbolPath.split('.');
    var cur = context;
    for (var i = 0, part; part = parts[i]; ++i) {
        cur = cur[part] = cur[part] || {};
    }
    return cur;
}

exports.mapModules = function(context) {
    var origSymbols = {};
    context.CDV_origSymbols = origSymbols;
    for (var i = 0, len = symbolList.length; i < len; i += 3) {
        var strategy = symbolList[i];
        var moduleName = symbolList[i + 1];
        var module = require(moduleName);
        // <runs/>
        if (strategy == 'r') {
            continue;
        }
        var symbolPath = symbolList[i + 2];
        var lastDot = symbolPath.lastIndexOf('.');
        var namespace = symbolPath.substr(0, lastDot);
        var lastName = symbolPath.substr(lastDot + 1);

        var deprecationMsg = symbolPath in deprecationMap ? 'Access made to deprecated symbol: ' + symbolPath + '. ' + deprecationMsg : null;
        var parentObj = prepareNamespace(namespace, context);
        var target = parentObj[lastName];

        if (strategy == 'm' && target) {
            builder.recursiveMerge(target, module);
        } else if ((strategy == 'd' && !target) || (strategy != 'd')) {
            if (!(symbolPath in origSymbols)) {
                origSymbols[symbolPath] = target;
            }
            builder.assignOrWrapInDeprecateGetter(parentObj, lastName, module, deprecationMsg);
        }
    }
};

exports.getOriginalSymbol = function(context, symbolPath) {
    var origSymbols = context.CDV_origSymbols;
    if (origSymbols && (symbolPath in origSymbols)) {
        return origSymbols[symbolPath];
    }
    var parts = symbolPath.split('.');
    var obj = context;
    for (var i = 0; i < parts.length; ++i) {
        obj = obj && obj[parts[i]];
    }
    return obj;
};

exports.reset();


});

// file: src/blackberry10/platform.js
define("cordova/platform", function(require, exports, module) {

module.exports = {

    id: "blackberry10",

    bootstrap: function() {

        var channel = require('cordova/channel'),
            addEventListener = document.addEventListener;

        //ready as soon as the plugins are
        channel.onPluginsReady.subscribe(function () {
            channel.onNativeReady.fire();
        });

        //pass document online/offline event listeners to window
        document.addEventListener = function (type) {
            if (type === "online" || type === "offline") {
                window.addEventListener.apply(window, arguments);
            } else {
                addEventListener.apply(document, arguments);
            }
        };

        //map blackberry.event to document
        if (!window.blackberry) {
            window.blackberry = {};
        }
        window.blackberry.event =
        {
            addEventListener: document.addEventListener,
            removeEventListener: document.removeEventListener
        };

    }

};

});

// file: src/common/pluginloader.js
define("cordova/pluginloader", function(require, exports, module) {

var modulemapper = require('cordova/modulemapper');
var urlutil = require('cordova/urlutil');

// Helper function to inject a <script> tag.
function injectScript(url, onload, onerror) {
    var script = document.createElement("script");
    // onload fires even when script fails loads with an error.
    script.onload = onload;
    script.onerror = onerror || onload;
    script.src = url;
    document.head.appendChild(script);
}

function onScriptLoadingComplete(moduleList, finishPluginLoading) {
    // Loop through all the plugins and then through their clobbers and merges.
    for (var i = 0, module; module = moduleList[i]; i++) {
        if (module) {
            try {
                if (module.clobbers && module.clobbers.length) {
                    for (var j = 0; j < module.clobbers.length; j++) {
                        modulemapper.clobbers(module.id, module.clobbers[j]);
                    }
                }

                if (module.merges && module.merges.length) {
                    for (var k = 0; k < module.merges.length; k++) {
                        modulemapper.merges(module.id, module.merges[k]);
                    }
                }

                // Finally, if runs is truthy we want to simply require() the module.
                // This can be skipped if it had any merges or clobbers, though,
                // since the mapper will already have required the module.
                if (module.runs && !(module.clobbers && module.clobbers.length) && !(module.merges && module.merges.length)) {
                    modulemapper.runs(module.id);
                }
            }
            catch(err) {
                // error with module, most likely clobbers, should we continue?
            }
        }
    }

    finishPluginLoading();
}

// Handler for the cordova_plugins.js content.
// See plugman's plugin_loader.js for the details of this object.
// This function is only called if the really is a plugins array that isn't empty.
// Otherwise the onerror response handler will just call finishPluginLoading().
function handlePluginsObject(path, moduleList, finishPluginLoading) {
    // Now inject the scripts.
    var scriptCounter = moduleList.length;

    if (!scriptCounter) {
        finishPluginLoading();
        return;
    }
    function scriptLoadedCallback() {
        if (!--scriptCounter) {
            onScriptLoadingComplete(moduleList, finishPluginLoading);
        }
    }

    for (var i = 0; i < moduleList.length; i++) {
        injectScript(path + moduleList[i].file, scriptLoadedCallback);
    }
}

function injectPluginScript(pathPrefix, finishPluginLoading) {
    var pluginPath = pathPrefix + 'cordova_plugins.js';

    injectScript(pluginPath, function() {
        try {
            var moduleList = require("cordova/plugin_list");
            handlePluginsObject(pathPrefix, moduleList, finishPluginLoading);
        }
        catch (e) {
            // Error loading cordova_plugins.js, file not found or something
            // this is an acceptable error, pre-3.0.0, so we just move on.
            finishPluginLoading();
        }
    }, finishPluginLoading); // also, add script load error handler for file not found
}

function findCordovaPath() {
    var path = null;
    var scripts = document.getElementsByTagName('script');
    var term = 'cordova.js';
    for (var n = scripts.length-1; n>-1; n--) {
        var src = scripts[n].src;
        if (src.indexOf(term) == (src.length - term.length)) {
            path = src.substring(0, src.length - term.length);
            break;
        }
    }
    return path;
}

// Tries to load all plugins' js-modules.
// This is an async process, but onDeviceReady is blocked on onPluginsReady.
// onPluginsReady is fired when there are no plugins to load, or they are all done.
exports.load = function(callback) {
    var pathPrefix = findCordovaPath();
    if (pathPrefix === null) {
        console.log('Could not find cordova.js script tag. Plugin loading may fail.');
        pathPrefix = '';
    }
    injectPluginScript(pathPrefix, callback);
};


});

// file: src/common/urlutil.js
define("cordova/urlutil", function(require, exports, module) {


/**
 * For already absolute URLs, returns what is passed in.
 * For relative URLs, converts them to absolute ones.
 */
exports.makeAbsolute = function makeAbsolute(url) {
    var anchorEl = document.createElement('a');
    anchorEl.href = url;
    return anchorEl.href;
};


});

// file: src/common/utils.js
define("cordova/utils", function(require, exports, module) {

var utils = exports;

/**
 * Defines a property getter / setter for obj[key].
 */
utils.defineGetterSetter = function(obj, key, getFunc, opt_setFunc) {
    if (Object.defineProperty) {
        var desc = {
            get: getFunc,
            configurable: true
        };
        if (opt_setFunc) {
            desc.set = opt_setFunc;
        }
        Object.defineProperty(obj, key, desc);
    } else {
        obj.__defineGetter__(key, getFunc);
        if (opt_setFunc) {
            obj.__defineSetter__(key, opt_setFunc);
        }
    }
};

/**
 * Defines a property getter for obj[key].
 */
utils.defineGetter = utils.defineGetterSetter;

utils.arrayIndexOf = function(a, item) {
    if (a.indexOf) {
        return a.indexOf(item);
    }
    var len = a.length;
    for (var i = 0; i < len; ++i) {
        if (a[i] == item) {
            return i;
        }
    }
    return -1;
};

/**
 * Returns whether the item was found in the array.
 */
utils.arrayRemove = function(a, item) {
    var index = utils.arrayIndexOf(a, item);
    if (index != -1) {
        a.splice(index, 1);
    }
    return index != -1;
};

utils.typeName = function(val) {
    return Object.prototype.toString.call(val).slice(8, -1);
};

/**
 * Returns an indication of whether the argument is an array or not
 */
utils.isArray = function(a) {
    return utils.typeName(a) == 'Array';
};

/**
 * Returns an indication of whether the argument is a Date or not
 */
utils.isDate = function(d) {
    return utils.typeName(d) == 'Date';
};

/**
 * Does a deep clone of the object.
 */
utils.clone = function(obj) {
    if(!obj || typeof obj == 'function' || utils.isDate(obj) || typeof obj != 'object') {
        return obj;
    }

    var retVal, i;

    if(utils.isArray(obj)){
        retVal = [];
        for(i = 0; i < obj.length; ++i){
            retVal.push(utils.clone(obj[i]));
        }
        return retVal;
    }

    retVal = {};
    for(i in obj){
        if(!(i in retVal) || retVal[i] != obj[i]) {
            retVal[i] = utils.clone(obj[i]);
        }
    }
    return retVal;
};

/**
 * Returns a wrapped version of the function
 */
utils.close = function(context, func, params) {
    if (typeof params == 'undefined') {
        return function() {
            return func.apply(context, arguments);
        };
    } else {
        return function() {
            return func.apply(context, params);
        };
    }
};

/**
 * Create a UUID
 */
utils.createUUID = function() {
    return UUIDcreatePart(4) + '-' +
        UUIDcreatePart(2) + '-' +
        UUIDcreatePart(2) + '-' +
        UUIDcreatePart(2) + '-' +
        UUIDcreatePart(6);
};

/**
 * Extends a child object from a parent object using classical inheritance
 * pattern.
 */
utils.extend = (function() {
    // proxy used to establish prototype chain
    var F = function() {};
    // extend Child from Parent
    return function(Child, Parent) {
        F.prototype = Parent.prototype;
        Child.prototype = new F();
        Child.__super__ = Parent.prototype;
        Child.prototype.constructor = Child;
    };
}());

/**
 * Alerts a message in any available way: alert or console.log.
 */
utils.alert = function(msg) {
    if (window.alert) {
        window.alert(msg);
    } else if (console && console.log) {
        console.log(msg);
    }
};


//------------------------------------------------------------------------------
function UUIDcreatePart(length) {
    var uuidpart = "";
    for (var i=0; i<length; i++) {
        var uuidchar = parseInt((Math.random() * 256), 10).toString(16);
        if (uuidchar.length == 1) {
            uuidchar = "0" + uuidchar;
        }
        uuidpart += uuidchar;
    }
    return uuidpart;
}


});

window.cordova = require('cordova');
// file: src/scripts/bootstrap.js

require('cordova/init');

})();
	
}