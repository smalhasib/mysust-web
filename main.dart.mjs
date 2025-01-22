// Returns whether the `js-string` built-in is supported.
function detectJsStringBuiltins() {
  let bytes = [
    0,   97,  115, 109, 1,   0,   0,  0,   1,   4,   1,   96,  0,
    0,   2,   23,  1,   14,  119, 97, 115, 109, 58,  106, 115, 45,
    115, 116, 114, 105, 110, 103, 4,  99,  97,  115, 116, 0,   0
  ];
  return WebAssembly.validate(
    new Uint8Array(bytes), {builtins: ['js-string']});
}

// Compiles a dart2wasm-generated main module from `source` which can then
// instantiatable via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = detectJsStringBuiltins()
      ? {builtins: ['js-string']} : {};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm modules from `bytes` which is then
// instantiatable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = detectJsStringBuiltins()
      ? {builtins: ['js-string']} : {};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export async function instantiate(modulePromise, importObjectPromise) {
  var moduleOrCompiledApp = await modulePromise;
  if (!(moduleOrCompiledApp instanceof CompiledApp)) {
    moduleOrCompiledApp = new CompiledApp(moduleOrCompiledApp);
  }
  const instantiatedApp = await moduleOrCompiledApp.instantiate(await importObjectPromise);
  return instantiatedApp.instantiatedModule;
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export const invoke = (moduleInstance, ...args) => {
  moduleInstance.exports.$invokeMain(args);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredWasm` is a JS function that takes a module name matching a
  //   wasm file produced by the dart2wasm compiler and returns the bytes to
  //   load the module. These bytes can be in either a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`.
  async instantiate(additionalImports, {loadDeferredWasm} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + js;
    }

    // Converts a Dart List to a JS array. Any Dart objects will be converted, but
    // this will be cheap for JSValues.
    function arrayFromDartList(constructor, list) {
      const exports = dartInstance.exports;
      const read = exports.$listRead;
      const length = exports.$listLength(list);
      const array = new constructor(length);
      for (let i = 0; i < length; i++) {
        array[i] = read(list, i);
      }
      return array;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {

      _1: (x0,x1,x2) => x0.set(x1,x2),
      _2: (x0,x1,x2) => x0.set(x1,x2),
      _3: (x0,x1) => x0.transferFromImageBitmap(x1),
      _4: x0 => x0.arrayBuffer(),
      _5: (x0,x1) => x0.transferFromImageBitmap(x1),
      _6: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._6(f,arguments.length,x0) }),
      _7: x0 => new window.FinalizationRegistry(x0),
      _8: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      _9: (x0,x1) => x0.unregister(x1),
      _10: (x0,x1,x2) => x0.slice(x1,x2),
      _11: (x0,x1) => x0.decode(x1),
      _12: (x0,x1) => x0.segment(x1),
      _13: () => new TextDecoder(),
      _14: x0 => x0.buffer,
      _15: x0 => x0.wasmMemory,
      _16: () => globalThis.window._flutter_skwasmInstance,
      _17: x0 => x0.rasterStartMilliseconds,
      _18: x0 => x0.rasterEndMilliseconds,
      _19: x0 => x0.imageBitmaps,
      _192: x0 => x0.select(),
      _193: (x0,x1) => x0.append(x1),
      _194: x0 => x0.remove(),
      _197: x0 => x0.unlock(),
      _202: x0 => x0.getReader(),
      _211: x0 => new MutationObserver(x0),
      _220: (x0,x1) => new OffscreenCanvas(x0,x1),
      _222: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _223: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _226: x0 => new ResizeObserver(x0),
      _229: (x0,x1) => new Intl.Segmenter(x0,x1),
      _230: x0 => x0.next(),
      _231: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      _308: x0 => x0.close(),
      _309: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      _310: x0 => new window.ImageDecoder(x0),
      _311: x0 => x0.close(),
      _312: x0 => ({frameIndex: x0}),
      _313: (x0,x1) => x0.decode(x1),
      _316: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._316(f,arguments.length,x0) }),
      _317: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._317(f,arguments.length,x0) }),
      _318: (x0,x1) => ({addView: x0,removeView: x1}),
      _319: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._319(f,arguments.length,x0) }),
      _320: f => finalizeWrapper(f, function() { return dartInstance.exports._320(f,arguments.length) }),
      _321: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      _322: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._322(f,arguments.length,x0) }),
      _323: x0 => ({runApp: x0}),
      _324: x0 => new Uint8Array(x0),
      _326: x0 => x0.preventDefault(),
      _327: x0 => x0.stopPropagation(),
      _328: (x0,x1) => x0.addListener(x1),
      _329: (x0,x1) => x0.removeListener(x1),
      _330: (x0,x1) => x0.prepend(x1),
      _331: x0 => x0.remove(),
      _332: x0 => x0.disconnect(),
      _333: (x0,x1) => x0.addListener(x1),
      _334: (x0,x1) => x0.removeListener(x1),
      _336: (x0,x1) => x0.append(x1),
      _337: x0 => x0.remove(),
      _338: x0 => x0.stopPropagation(),
      _342: x0 => x0.preventDefault(),
      _343: (x0,x1) => x0.append(x1),
      _344: x0 => x0.remove(),
      _345: x0 => x0.preventDefault(),
      _350: (x0,x1) => x0.removeChild(x1),
      _351: (x0,x1) => x0.appendChild(x1),
      _352: (x0,x1,x2) => x0.insertBefore(x1,x2),
      _353: (x0,x1) => x0.appendChild(x1),
      _354: (x0,x1) => x0.transferFromImageBitmap(x1),
      _356: (x0,x1) => x0.append(x1),
      _357: (x0,x1) => x0.append(x1),
      _358: (x0,x1) => x0.append(x1),
      _359: x0 => x0.remove(),
      _360: x0 => x0.remove(),
      _361: x0 => x0.remove(),
      _362: (x0,x1) => x0.appendChild(x1),
      _363: (x0,x1) => x0.appendChild(x1),
      _364: x0 => x0.remove(),
      _365: (x0,x1) => x0.append(x1),
      _366: (x0,x1) => x0.append(x1),
      _367: x0 => x0.remove(),
      _368: (x0,x1) => x0.append(x1),
      _369: (x0,x1) => x0.append(x1),
      _370: (x0,x1,x2) => x0.insertBefore(x1,x2),
      _371: (x0,x1) => x0.append(x1),
      _372: (x0,x1,x2) => x0.insertBefore(x1,x2),
      _373: x0 => x0.remove(),
      _374: x0 => x0.remove(),
      _375: (x0,x1) => x0.append(x1),
      _376: x0 => x0.remove(),
      _377: (x0,x1) => x0.append(x1),
      _378: x0 => x0.remove(),
      _379: x0 => x0.remove(),
      _380: x0 => x0.getBoundingClientRect(),
      _381: x0 => x0.remove(),
      _394: (x0,x1) => x0.append(x1),
      _395: x0 => x0.remove(),
      _396: (x0,x1) => x0.append(x1),
      _397: (x0,x1,x2) => x0.insertBefore(x1,x2),
      _398: x0 => x0.preventDefault(),
      _399: x0 => x0.preventDefault(),
      _400: x0 => x0.preventDefault(),
      _401: x0 => x0.preventDefault(),
      _402: x0 => x0.remove(),
      _403: (x0,x1) => x0.observe(x1),
      _404: x0 => x0.disconnect(),
      _405: (x0,x1) => x0.appendChild(x1),
      _406: (x0,x1) => x0.appendChild(x1),
      _407: (x0,x1) => x0.appendChild(x1),
      _408: (x0,x1) => x0.append(x1),
      _409: x0 => x0.remove(),
      _410: (x0,x1) => x0.append(x1),
      _412: (x0,x1) => x0.appendChild(x1),
      _413: (x0,x1) => x0.append(x1),
      _414: x0 => x0.remove(),
      _415: (x0,x1) => x0.append(x1),
      _419: (x0,x1) => x0.appendChild(x1),
      _420: x0 => x0.remove(),
      _979: () => globalThis.window.flutterConfiguration,
      _980: x0 => x0.assetBase,
      _985: x0 => x0.debugShowSemanticsNodes,
      _986: x0 => x0.hostElement,
      _987: x0 => x0.multiViewEnabled,
      _988: x0 => x0.nonce,
      _990: x0 => x0.fontFallbackBaseUrl,
      _991: x0 => x0.useColorEmoji,
      _996: x0 => x0.console,
      _997: x0 => x0.devicePixelRatio,
      _998: x0 => x0.document,
      _999: x0 => x0.history,
      _1000: x0 => x0.innerHeight,
      _1001: x0 => x0.innerWidth,
      _1002: x0 => x0.location,
      _1003: x0 => x0.navigator,
      _1004: x0 => x0.visualViewport,
      _1005: x0 => x0.performance,
      _1008: (x0,x1) => x0.dispatchEvent(x1),
      _1009: (x0,x1) => x0.matchMedia(x1),
      _1011: (x0,x1) => x0.getComputedStyle(x1),
      _1012: x0 => x0.screen,
      _1013: (x0,x1) => x0.requestAnimationFrame(x1),
      _1014: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1014(f,arguments.length,x0) }),
      _1019: (x0,x1) => x0.warn(x1),
      _1022: () => globalThis.window,
      _1023: () => globalThis.Intl,
      _1024: () => globalThis.Symbol,
      _1027: x0 => x0.clipboard,
      _1028: x0 => x0.maxTouchPoints,
      _1029: x0 => x0.vendor,
      _1030: x0 => x0.language,
      _1031: x0 => x0.platform,
      _1032: x0 => x0.userAgent,
      _1033: x0 => x0.languages,
      _1034: x0 => x0.documentElement,
      _1035: (x0,x1) => x0.querySelector(x1),
      _1038: (x0,x1) => x0.createElement(x1),
      _1039: (x0,x1) => x0.execCommand(x1),
      _1043: (x0,x1) => x0.createTextNode(x1),
      _1044: (x0,x1) => x0.createEvent(x1),
      _1048: x0 => x0.head,
      _1049: x0 => x0.body,
      _1050: (x0,x1) => x0.title = x1,
      _1053: x0 => x0.activeElement,
      _1055: x0 => x0.visibilityState,
      _1057: x0 => x0.hasFocus(),
      _1058: () => globalThis.document,
      _1059: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _1060: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _1063: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1063(f,arguments.length,x0) }),
      _1064: x0 => x0.target,
      _1066: x0 => x0.timeStamp,
      _1067: x0 => x0.type,
      _1069: x0 => x0.preventDefault(),
      _1071: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      _1078: x0 => x0.firstChild,
      _1083: x0 => x0.parentElement,
      _1085: x0 => x0.parentNode,
      _1088: (x0,x1) => x0.removeChild(x1),
      _1089: (x0,x1) => x0.removeChild(x1),
      _1090: x0 => x0.isConnected,
      _1091: (x0,x1) => x0.textContent = x1,
      _1093: (x0,x1) => x0.contains(x1),
      _1099: x0 => x0.firstElementChild,
      _1101: x0 => x0.nextElementSibling,
      _1102: x0 => x0.clientHeight,
      _1103: x0 => x0.clientWidth,
      _1104: x0 => x0.offsetHeight,
      _1105: x0 => x0.offsetWidth,
      _1106: x0 => x0.id,
      _1107: (x0,x1) => x0.id = x1,
      _1110: (x0,x1) => x0.spellcheck = x1,
      _1111: x0 => x0.tagName,
      _1112: x0 => x0.style,
      _1114: (x0,x1) => x0.append(x1),
      _1115: (x0,x1) => x0.getAttribute(x1),
      _1116: x0 => x0.getBoundingClientRect(),
      _1119: (x0,x1) => x0.closest(x1),
      _1122: (x0,x1) => x0.querySelectorAll(x1),
      _1124: x0 => x0.remove(),
      _1125: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _1126: (x0,x1) => x0.removeAttribute(x1),
      _1127: (x0,x1) => x0.tabIndex = x1,
      _1129: (x0,x1) => x0.focus(x1),
      _1130: x0 => x0.scrollTop,
      _1131: (x0,x1) => x0.scrollTop = x1,
      _1132: x0 => x0.scrollLeft,
      _1133: (x0,x1) => x0.scrollLeft = x1,
      _1134: x0 => x0.classList,
      _1135: (x0,x1) => x0.className = x1,
      _1140: (x0,x1) => x0.getElementsByClassName(x1),
      _1142: x0 => x0.click(),
      _1144: (x0,x1) => x0.hasAttribute(x1),
      _1147: (x0,x1) => x0.attachShadow(x1),
      _1152: (x0,x1) => x0.getPropertyValue(x1),
      _1154: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      _1156: (x0,x1) => x0.removeProperty(x1),
      _1158: x0 => x0.offsetLeft,
      _1159: x0 => x0.offsetTop,
      _1160: x0 => x0.offsetParent,
      _1162: (x0,x1) => x0.name = x1,
      _1163: x0 => x0.content,
      _1164: (x0,x1) => x0.content = x1,
      _1182: (x0,x1) => x0.nonce = x1,
      _1187: x0 => x0.now(),
      _1189: (x0,x1) => x0.width = x1,
      _1191: (x0,x1) => x0.height = x1,
      _1196: (x0,x1) => x0.getContext(x1),
      _1267: x0 => x0.width,
      _1268: x0 => x0.height,
      _1273: (x0,x1) => x0.fetch(x1),
      _1274: x0 => x0.status,
      _1275: x0 => x0.headers,
      _1276: x0 => x0.body,
      _1278: x0 => x0.arrayBuffer(),
      _1281: (x0,x1) => x0.get(x1),
      _1283: x0 => x0.read(),
      _1284: x0 => x0.value,
      _1285: x0 => x0.done,
      _1287: x0 => x0.name,
      _1288: x0 => x0.x,
      _1289: x0 => x0.y,
      _1292: x0 => x0.top,
      _1293: x0 => x0.right,
      _1294: x0 => x0.bottom,
      _1295: x0 => x0.left,
      _1304: x0 => x0.height,
      _1305: x0 => x0.width,
      _1306: (x0,x1) => x0.value = x1,
      _1308: (x0,x1) => x0.placeholder = x1,
      _1309: (x0,x1) => x0.name = x1,
      _1310: x0 => x0.selectionDirection,
      _1311: x0 => x0.selectionStart,
      _1312: x0 => x0.selectionEnd,
      _1315: x0 => x0.value,
      _1317: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _1321: x0 => x0.readText(),
      _1322: (x0,x1) => x0.writeText(x1),
      _1323: x0 => x0.altKey,
      _1324: x0 => x0.code,
      _1325: x0 => x0.ctrlKey,
      _1326: x0 => x0.key,
      _1327: x0 => x0.keyCode,
      _1328: x0 => x0.location,
      _1329: x0 => x0.metaKey,
      _1330: x0 => x0.repeat,
      _1331: x0 => x0.shiftKey,
      _1332: x0 => x0.isComposing,
      _1333: (x0,x1) => x0.getModifierState(x1),
      _1335: x0 => x0.state,
      _1336: (x0,x1) => x0.go(x1),
      _1338: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      _1339: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      _1340: x0 => x0.pathname,
      _1341: x0 => x0.search,
      _1342: x0 => x0.hash,
      _1346: x0 => x0.state,
      _1352: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1352(f,arguments.length,x0,x1) }),
      _1354: (x0,x1,x2) => x0.observe(x1,x2),
      _1357: x0 => x0.attributeName,
      _1358: x0 => x0.type,
      _1359: x0 => x0.matches,
      _1362: x0 => x0.matches,
      _1364: x0 => x0.relatedTarget,
      _1365: x0 => x0.clientX,
      _1366: x0 => x0.clientY,
      _1367: x0 => x0.offsetX,
      _1368: x0 => x0.offsetY,
      _1371: x0 => x0.button,
      _1372: x0 => x0.buttons,
      _1373: x0 => x0.ctrlKey,
      _1374: (x0,x1) => x0.getModifierState(x1),
      _1377: x0 => x0.pointerId,
      _1378: x0 => x0.pointerType,
      _1379: x0 => x0.pressure,
      _1380: x0 => x0.tiltX,
      _1381: x0 => x0.tiltY,
      _1382: x0 => x0.getCoalescedEvents(),
      _1384: x0 => x0.deltaX,
      _1385: x0 => x0.deltaY,
      _1386: x0 => x0.wheelDeltaX,
      _1387: x0 => x0.wheelDeltaY,
      _1388: x0 => x0.deltaMode,
      _1394: x0 => x0.changedTouches,
      _1396: x0 => x0.clientX,
      _1397: x0 => x0.clientY,
      _1399: x0 => x0.data,
      _1402: (x0,x1) => x0.disabled = x1,
      _1403: (x0,x1) => x0.type = x1,
      _1404: (x0,x1) => x0.max = x1,
      _1405: (x0,x1) => x0.min = x1,
      _1406: (x0,x1) => x0.value = x1,
      _1407: x0 => x0.value,
      _1408: x0 => x0.disabled,
      _1409: (x0,x1) => x0.disabled = x1,
      _1410: (x0,x1) => x0.placeholder = x1,
      _1411: (x0,x1) => x0.name = x1,
      _1412: (x0,x1) => x0.autocomplete = x1,
      _1413: x0 => x0.selectionDirection,
      _1414: x0 => x0.selectionStart,
      _1415: x0 => x0.selectionEnd,
      _1419: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _1424: (x0,x1) => x0.add(x1),
      _1427: (x0,x1) => x0.noValidate = x1,
      _1428: (x0,x1) => x0.method = x1,
      _1429: (x0,x1) => x0.action = x1,
      _1435: (x0,x1) => x0.getContext(x1),
      _1437: x0 => x0.convertToBlob(),
      _1454: x0 => x0.orientation,
      _1455: x0 => x0.width,
      _1456: x0 => x0.height,
      _1457: (x0,x1) => x0.lock(x1),
      _1475: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1475(f,arguments.length,x0,x1) }),
      _1486: x0 => x0.length,
      _1487: (x0,x1) => x0.item(x1),
      _1488: x0 => x0.length,
      _1489: (x0,x1) => x0.item(x1),
      _1490: x0 => x0.iterator,
      _1491: x0 => x0.Segmenter,
      _1492: x0 => x0.v8BreakIterator,
      _1495: x0 => x0.done,
      _1496: x0 => x0.value,
      _1497: x0 => x0.index,
      _1501: (x0,x1) => x0.adoptText(x1),
      _1502: x0 => x0.first(),
      _1503: x0 => x0.next(),
      _1504: x0 => x0.current(),
      _1516: x0 => x0.hostElement,
      _1517: x0 => x0.viewConstraints,
      _1519: x0 => x0.maxHeight,
      _1520: x0 => x0.maxWidth,
      _1521: x0 => x0.minHeight,
      _1522: x0 => x0.minWidth,
      _1523: x0 => x0.loader,
      _1524: () => globalThis._flutter,
      _1525: (x0,x1) => x0.didCreateEngineInitializer(x1),
      _1526: (x0,x1,x2) => x0.call(x1,x2),
      _1527: () => globalThis.Promise,
      _1528: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1528(f,arguments.length,x0,x1) }),
      _1532: x0 => x0.length,
      _1535: x0 => x0.tracks,
      _1539: x0 => x0.image,
      _1544: x0 => x0.codedWidth,
      _1545: x0 => x0.codedHeight,
      _1548: x0 => x0.duration,
      _1552: x0 => x0.ready,
      _1553: x0 => x0.selectedTrack,
      _1554: x0 => x0.repetitionCount,
      _1555: x0 => x0.frameCount,
      _1617: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _1618: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      _1619: (x0,x1) => x0.createElement(x1),
      _1633: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1634: () => ({}),
      _1635: x0 => globalThis.pdfjsLib.getDocument(x0),
      _1636: (x0,x1) => x0.getPage(x1),
      _1637: (x0,x1) => x0.getViewport(x1),
      _1638: (x0,x1) => x0.getPage(x1),
      _1639: (x0,x1) => x0.getViewport(x1),
      _1640: (x0,x1) => x0.getPage(x1),
      _1641: (x0,x1) => x0.getViewport(x1),
      _1642: (x0,x1) => x0.getPage(x1),
      _1643: (x0,x1) => x0.getViewport(x1),
      _1644: (x0,x1) => x0.getViewport(x1),
      _1645: (x0,x1) => x0.render(x1),
      _1646: (x0,x1,x2,x3,x4) => x0.getImageData(x1,x2,x3,x4),
      _1647: x0 => x0.destroy(),
      _1648: (x0,x1) => x0.getViewport(x1),
      _1649: (x0,x1) => x0.getViewport(x1),
      _1650: (x0,x1) => x0.render(x1),
      _1651: x0 => ({scale: x0}),
      _1655: (x0,x1) => x0.removeItem(x1),
      _1656: (x0,x1) => x0.getItem(x1),
      _1657: (x0,x1,x2) => x0.setItem(x1,x2),
      _1658: x0 => x0.deviceMemory,
      _1668: () => new Array(),
      _1669: x0 => new Array(x0),
      _1671: x0 => x0.length,
      _1673: (x0,x1) => x0[x1],
      _1674: (x0,x1,x2) => x0[x1] = x2,
      _1677: (x0,x1,x2) => new DataView(x0,x1,x2),
      _1679: x0 => new Int8Array(x0),
      _1680: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      _1681: x0 => new Uint8Array(x0),
      _1689: x0 => new Int32Array(x0),
      _1691: x0 => new Uint32Array(x0),
      _1693: x0 => new Float32Array(x0),
      _1695: x0 => new Float64Array(x0),
      _1696: (o, t) => typeof o === t,
      _1697: (o, c) => o instanceof c,
      _1698: (x0,x1,x2,x3,x4,x5) => x0.call(x1,x2,x3,x4,x5),
      _1701: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1701(f,arguments.length,x0) }),
      _1702: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1702(f,arguments.length,x0) }),
      _1703: (x0,x1,x2) => x0.call(x1,x2),
      _1705: (x0,x1) => x0.call(x1),
      _1717: (o, a) => o == a,
      _1728: (decoder, codeUnits) => decoder.decode(codeUnits),
      _1729: () => new TextDecoder("utf-8", {fatal: true}),
      _1730: () => new TextDecoder("utf-8", {fatal: false}),
      _1731: x0 => new WeakRef(x0),
      _1732: x0 => x0.deref(),
      _1733: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1733(f,arguments.length,x0) }),
      _1734: x0 => new FinalizationRegistry(x0),
      _1735: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      _1737: (x0,x1) => x0.unregister(x1),
      _1738: Date.now,
      _1740: s => new Date(s * 1000).getTimezoneOffset() * 60,
      _1741: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      _1742: () => {
        let stackString = new Error().stack.toString();
        let frames = stackString.split('\n');
        let drop = 2;
        if (frames[0] === 'Error') {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      _1743: () => typeof dartUseDateNowForTicks !== "undefined",
      _1744: () => 1000 * performance.now(),
      _1745: () => Date.now(),
      _1746: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      _1747: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      _1748: () => new WeakMap(),
      _1749: (map, o) => map.get(o),
      _1750: (map, o, v) => map.set(o, v),
      _1751: () => globalThis.WeakRef,
      _1755: () => globalThis.FinalizationRegistry,
      _1761: s => JSON.stringify(s),
      _1762: s => printToConsole(s),
      _1763: a => a.join(''),
      _1764: (o, a, b) => o.replace(a, b),
      _1765: (o, p, r) => o.split(p).join(r),
      _1766: (s, t) => s.split(t),
      _1767: s => s.toLowerCase(),
      _1768: s => s.toUpperCase(),
      _1769: s => s.trim(),
      _1770: s => s.trimLeft(),
      _1771: s => s.trimRight(),
      _1773: (s, p, i) => s.indexOf(p, i),
      _1774: (s, p, i) => s.lastIndexOf(p, i),
      _1775: (s) => s.replace(/\$/g, "$$$$"),
      _1776: Object.is,
      _1777: s => s.toUpperCase(),
      _1778: s => s.toLowerCase(),
      _1779: (a, i) => a.push(i),
      _1782: (a, l) => a.length = l,
      _1783: a => a.pop(),
      _1784: (a, i) => a.splice(i, 1),
      _1786: (a, s) => a.join(s),
      _1787: (a, s, e) => a.slice(s, e),
      _1788: (a, s, e) => a.splice(s, e),
      _1789: (a, b) => a == b ? 0 : (a > b ? 1 : -1),
      _1790: a => a.length,
      _1791: (a, l) => a.length = l,
      _1792: (a, i) => a[i],
      _1793: (a, i, v) => a[i] = v,
      _1795: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      _1796: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      _1797: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      _1798: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      _1799: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      _1800: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      _1801: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      _1802: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      _1804: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      _1805: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      _1806: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      _1807: (t, s) => t.set(s),
      _1808: l => new DataView(new ArrayBuffer(l)),
      _1809: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      _1810: o => o.byteLength,
      _1811: o => o.buffer,
      _1812: o => o.byteOffset,
      _1813: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      _1814: (b, o) => new DataView(b, o),
      _1815: (b, o, l) => new DataView(b, o, l),
      _1816: Function.prototype.call.bind(DataView.prototype.getUint8),
      _1817: Function.prototype.call.bind(DataView.prototype.setUint8),
      _1818: Function.prototype.call.bind(DataView.prototype.getInt8),
      _1819: Function.prototype.call.bind(DataView.prototype.setInt8),
      _1820: Function.prototype.call.bind(DataView.prototype.getUint16),
      _1821: Function.prototype.call.bind(DataView.prototype.setUint16),
      _1822: Function.prototype.call.bind(DataView.prototype.getInt16),
      _1823: Function.prototype.call.bind(DataView.prototype.setInt16),
      _1824: Function.prototype.call.bind(DataView.prototype.getUint32),
      _1825: Function.prototype.call.bind(DataView.prototype.setUint32),
      _1826: Function.prototype.call.bind(DataView.prototype.getInt32),
      _1827: Function.prototype.call.bind(DataView.prototype.setInt32),
      _1830: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      _1831: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      _1832: Function.prototype.call.bind(DataView.prototype.getFloat32),
      _1833: Function.prototype.call.bind(DataView.prototype.setFloat32),
      _1834: Function.prototype.call.bind(DataView.prototype.getFloat64),
      _1835: Function.prototype.call.bind(DataView.prototype.setFloat64),
      _1848: (x0,x1) => x0.postMessage(x1),
      _1850: x0 => new Worker(x0),
      _1853: x0 => ({create: x0}),
      _1854: (x0,x1,x2) => x0.getFileHandle(x1,x2),
      _1862: (x0,x1,x2) => x0.open(x1,x2),
      _1876: (x0,x1) => new SharedWorker(x0,x1),
      _1877: x0 => x0.start(),
      _1878: (x0,x1,x2) => x0.postMessage(x1,x2),
      _1879: (x0,x1,x2) => x0.postMessage(x1,x2),
      _1880: x0 => x0.close(),
      _1881: x0 => x0.terminate(),
      _1882: () => new MessageChannel(),
      _1888: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1888(f,arguments.length,x0) }),
      _1889: x0 => x0.close(),
      _1890: x0 => new BroadcastChannel(x0),
      _1891: x0 => globalThis.Array.isArray(x0),
      _1892: (x0,x1) => x0.postMessage(x1),
      _1895: (x0,x1) => ({kind: x0,table: x1}),
      _1896: x0 => x0.kind,
      _1897: x0 => x0.table,
      _1898: (x0,x1) => ({i: x0,p: x1}),
      _1899: (x0,x1) => ({c: x0,r: x1}),
      _1900: x0 => x0.i,
      _1901: x0 => x0.p,
      _1902: x0 => x0.c,
      _1903: x0 => x0.r,
      _1905: () => new XMLHttpRequest(),
      _1906: (x0,x1,x2) => x0.open(x1,x2),
      _1907: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      _1908: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      _1909: x0 => x0.abort(),
      _1910: x0 => x0.abort(),
      _1911: x0 => x0.abort(),
      _1912: x0 => x0.abort(),
      _1913: (x0,x1) => x0.send(x1),
      _1914: x0 => x0.send(),
      _1916: x0 => x0.getAllResponseHeaders(),
      _1917: (o, t) => o instanceof t,
      _1919: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1919(f,arguments.length,x0) }),
      _1920: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1920(f,arguments.length,x0) }),
      _1921: o => Object.keys(o),
      _1922: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      _1923: (handle) => clearTimeout(handle),
      _1924: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      _1925: (handle) => clearInterval(handle),
      _1926: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      _1927: () => Date.now(),
      _1931: x0 => new URL(x0),
      _1932: (x0,x1) => new URL(x0,x1),
      _1933: (x0,x1) => globalThis.fetch(x0,x1),
      _1934: (x0,x1,x2,x3) => x0.call(x1,x2,x3),
      _1935: x0 => ({initial: x0}),
      _1936: x0 => new WebAssembly.Memory(x0),
      _1937: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1937(f,arguments.length,x0) }),
      _1938: f => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return dartInstance.exports._1938(f,arguments.length,x0,x1,x2,x3,x4) }),
      _1939: f => finalizeWrapper(f, function(x0,x1,x2) { return dartInstance.exports._1939(f,arguments.length,x0,x1,x2) }),
      _1940: f => finalizeWrapper(f, function(x0,x1,x2,x3) { return dartInstance.exports._1940(f,arguments.length,x0,x1,x2,x3) }),
      _1941: f => finalizeWrapper(f, function(x0,x1,x2,x3) { return dartInstance.exports._1941(f,arguments.length,x0,x1,x2,x3) }),
      _1942: f => finalizeWrapper(f, function(x0,x1,x2) { return dartInstance.exports._1942(f,arguments.length,x0,x1,x2) }),
      _1943: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1943(f,arguments.length,x0,x1) }),
      _1944: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1944(f,arguments.length,x0,x1) }),
      _1945: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1945(f,arguments.length,x0) }),
      _1946: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1946(f,arguments.length,x0) }),
      _1947: f => finalizeWrapper(f, function(x0,x1,x2,x3) { return dartInstance.exports._1947(f,arguments.length,x0,x1,x2,x3) }),
      _1948: f => finalizeWrapper(f, function(x0,x1,x2,x3) { return dartInstance.exports._1948(f,arguments.length,x0,x1,x2,x3) }),
      _1949: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1949(f,arguments.length,x0,x1) }),
      _1950: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1950(f,arguments.length,x0,x1) }),
      _1951: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1951(f,arguments.length,x0,x1) }),
      _1952: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1952(f,arguments.length,x0,x1) }),
      _1953: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1953(f,arguments.length,x0,x1) }),
      _1954: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1954(f,arguments.length,x0,x1) }),
      _1955: f => finalizeWrapper(f, function(x0,x1,x2) { return dartInstance.exports._1955(f,arguments.length,x0,x1,x2) }),
      _1956: f => finalizeWrapper(f, function(x0,x1,x2) { return dartInstance.exports._1956(f,arguments.length,x0,x1,x2) }),
      _1957: f => finalizeWrapper(f, function(x0,x1,x2) { return dartInstance.exports._1957(f,arguments.length,x0,x1,x2) }),
      _1958: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1958(f,arguments.length,x0) }),
      _1959: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1959(f,arguments.length,x0) }),
      _1960: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1960(f,arguments.length,x0) }),
      _1961: f => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return dartInstance.exports._1961(f,arguments.length,x0,x1,x2,x3,x4) }),
      _1962: f => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return dartInstance.exports._1962(f,arguments.length,x0,x1,x2,x3,x4) }),
      _1963: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1963(f,arguments.length,x0) }),
      _1964: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1964(f,arguments.length,x0) }),
      _1965: (x0,x1,x2,x3,x4,x5,x6) => x0.call(x1,x2,x3,x4,x5,x6),
      _1966: (x0,x1,x2,x3,x4,x5,x6,x7) => x0.call(x1,x2,x3,x4,x5,x6,x7),
      _1967: (x0,x1,x2,x3,x4) => x0.call(x1,x2,x3,x4),
      _1968: x0 => x0.continue(),
      _1969: () => globalThis.indexedDB,
      _1971: x0 => x0.arrayBuffer(),
      _1972: x0 => new SharedArrayBuffer(x0),
      _1973: x0 => new SharedArrayBuffer(x0),
      _1974: x0 => ({at: x0}),
      _1982: x0 => x0.synchronizationBuffer,
      _1983: x0 => x0.communicationBuffer,
      _1984: (x0,x1,x2,x3) => ({clientVersion: x0,root: x1,synchronizationBuffer: x2,communicationBuffer: x3}),
      _1985: x0 => new SharedArrayBuffer(x0),
      _1986: (x0,x1) => globalThis.IDBKeyRange.bound(x0,x1),
      _1987: x0 => ({autoIncrement: x0}),
      _1988: (x0,x1,x2) => x0.createObjectStore(x1,x2),
      _1989: x0 => ({unique: x0}),
      _1990: (x0,x1,x2,x3) => x0.createIndex(x1,x2,x3),
      _1991: (x0,x1) => x0.createObjectStore(x1),
      _1992: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1992(f,arguments.length,x0) }),
      _1993: (x0,x1,x2) => x0.transaction(x1,x2),
      _1994: (x0,x1) => x0.objectStore(x1),
      _1995: x0 => new Blob(x0),
      _1996: (x0,x1,x2) => x0.add(x1,x2),
      _1997: (x0,x1) => x0.get(x1),
      _1998: x0 => x0.abort(),
      _1999: x0 => x0.close(),
      _2002: (x0,x1) => x0.objectStore(x1),
      _2003: (x0,x1) => x0.index(x1),
      _2004: x0 => x0.openKeyCursor(),
      _2005: (x0,x1) => x0.objectStore(x1),
      _2006: (x0,x1) => x0.index(x1),
      _2007: (x0,x1) => x0.getKey(x1),
      _2008: (x0,x1) => x0.objectStore(x1),
      _2009: (x0,x1) => ({name: x0,length: x1}),
      _2010: (x0,x1) => x0.put(x1),
      _2011: (x0,x1) => x0.objectStore(x1),
      _2012: (x0,x1) => x0.get(x1),
      _2013: (x0,x1) => x0.objectStore(x1),
      _2014: (x0,x1) => x0.openCursor(x1),
      _2016: (x0,x1) => x0.objectStore(x1),
      _2017: x0 => globalThis.IDBKeyRange.only(x0),
      _2018: (x0,x1,x2) => x0.put(x1,x2),
      _2019: (x0,x1) => x0.update(x1),
      _2020: (x0,x1) => x0.objectStore(x1),
      _2021: (x0,x1) => x0.update(x1),
      _2022: (x0,x1) => x0.objectStore(x1),
      _2023: (x0,x1) => x0.objectStore(x1),
      _2024: (x0,x1) => x0.delete(x1),
      _2025: (x0,x1) => x0.update(x1),
      _2026: (x0,x1) => x0.objectStore(x1),
      _2027: (x0,x1) => x0.delete(x1),
      _2028: (x0,x1) => x0.objectStore(x1),
      _2029: (x0,x1) => x0.delete(x1),
      _2032: x0 => x0.name,
      _2033: x0 => x0.length,
      _2035: x0 => x0.createSyncAccessHandle(),
      _2036: (x0,x1) => x0.truncate(x1),
      _2037: (x0,x1) => x0.truncate(x1),
      _2038: x0 => x0.close(),
      _2039: x0 => x0.close(),
      _2040: x0 => x0.flush(),
      _2041: x0 => x0.getSize(),
      _2042: x0 => x0.flush(),
      _2043: (x0,x1) => x0.truncate(x1),
      _2045: x0 => globalThis.BigInt(x0),
      _2046: x0 => globalThis.Number(x0),
      _2049: x0 => globalThis.Object.keys(x0),
      _2054: (x0,x1) => globalThis.WebAssembly.instantiateStreaming(x0,x1),
      _2055: x0 => x0.call(),
      _2056: x0 => x0.exports,
      _2057: x0 => x0.instance,
      _2061: x0 => x0.buffer,
      _2062: () => globalThis.WebAssembly.Global,
      _2065: () => globalThis.navigator,
      _2066: x0 => x0.getDirectory(),
      _2067: (x0,x1) => x0.read(x1),
      _2068: (x0,x1,x2) => x0.read(x1,x2),
      _2069: (x0,x1) => x0.write(x1),
      _2070: (x0,x1,x2) => x0.write(x1,x2),
      _2071: x0 => ({create: x0}),
      _2072: (x0,x1,x2) => x0.getDirectoryHandle(x1,x2),
      _2073: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      _2074: (x0,x1,x2) => x0.fetch(x1,x2),
      _2075: (x0,x1) => x0.get(x1),
      _2076: f => finalizeWrapper(f, function(x0,x1,x2) { return dartInstance.exports._2076(f,arguments.length,x0,x1,x2) }),
      _2077: (x0,x1) => x0.forEach(x1),
      _2078: x0 => x0.abort(),
      _2079: () => new AbortController(),
      _2080: x0 => x0.getReader(),
      _2081: x0 => x0.read(),
      _2082: x0 => x0.cancel(),
      _2090: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._2090(f,arguments.length,x0) }),
      _2091: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._2091(f,arguments.length,x0) }),
      _2097: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _2098: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _2099: x0 => x0.preventDefault(),
      _2100: x0 => x0.preventDefault(),
      _2101: x0 => x0.preventDefault(),
      _2102: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._2102(f,arguments.length,x0) }),
      _2103: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._2103(f,arguments.length,x0) }),
      _2106: (x0,x1) => x0.data = x1,
      _2107: (x0,x1) => x0.scale = x1,
      _2108: (x0,x1) => x0.canvasContext = x1,
      _2109: (x0,x1) => x0.viewport = x1,
      _2110: (x0,x1) => x0.annotationMode = x1,
      _2111: (x0,x1) => x0.offsetX = x1,
      _2112: (x0,x1) => x0.offsetY = x1,
      _2113: x0 => x0.promise,
      _2115: x0 => x0.numPages,
      _2121: x0 => x0.width,
      _2122: x0 => x0.height,
      _2123: x0 => x0.promise,
      _2124: (x0,x1) => x0.key(x1),
      _2130: (x0,x1) => x0.getContext(x1),
      _2140: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      _2141: (x0,x1) => x0.exec(x1),
      _2142: (x0,x1) => x0.test(x1),
      _2143: (x0,x1) => x0.exec(x1),
      _2144: (x0,x1) => x0.exec(x1),
      _2145: x0 => x0.pop(),
      _2147: o => o === undefined,
      _2166: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      _2168: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      _2169: o => o instanceof RegExp,
      _2170: (l, r) => l === r,
      _2171: o => o,
      _2172: o => o,
      _2173: o => o,
      _2174: b => !!b,
      _2175: o => o.length,
      _2178: (o, i) => o[i],
      _2179: f => f.dartFunction,
      _2180: l => arrayFromDartList(Int8Array, l),
      _2181: l => arrayFromDartList(Uint8Array, l),
      _2182: l => arrayFromDartList(Uint8ClampedArray, l),
      _2183: l => arrayFromDartList(Int16Array, l),
      _2184: l => arrayFromDartList(Uint16Array, l),
      _2185: l => arrayFromDartList(Int32Array, l),
      _2186: l => arrayFromDartList(Uint32Array, l),
      _2187: l => arrayFromDartList(Float32Array, l),
      _2188: l => arrayFromDartList(Float64Array, l),
      _2189: x0 => new ArrayBuffer(x0),
      _2190: (data, length) => {
        const getValue = dartInstance.exports.$byteDataGetUint8;
        const view = new DataView(new ArrayBuffer(length));
        for (let i = 0; i < length; i++) {
          view.setUint8(i, getValue(data, i));
        }
        return view;
      },
      _2191: l => arrayFromDartList(Array, l),
      _2192: (s, length) => {
        if (length == 0) return '';
      
        const read = dartInstance.exports.$stringRead1;
        let result = '';
        let index = 0;
        const chunkLength = Math.min(length - index, 500);
        let array = new Array(chunkLength);
        while (index < length) {
          const newChunkLength = Math.min(length - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(s, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      _2193: (s, length) => {
        if (length == 0) return '';
      
        const read = dartInstance.exports.$stringRead2;
        let result = '';
        let index = 0;
        const chunkLength = Math.min(length - index, 500);
        let array = new Array(chunkLength);
        while (index < length) {
          const newChunkLength = Math.min(length - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(s, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      _2194: (s) => {
        let length = s.length;
        let range = 0;
        for (let i = 0; i < length; i++) {
          range |= s.codePointAt(i);
        }
        const exports = dartInstance.exports;
        if (range < 256) {
          if (length <= 10) {
            if (length == 1) {
              return exports.$stringAllocate1_1(s.codePointAt(0));
            }
            if (length == 2) {
              return exports.$stringAllocate1_2(s.codePointAt(0), s.codePointAt(1));
            }
            if (length == 3) {
              return exports.$stringAllocate1_3(s.codePointAt(0), s.codePointAt(1), s.codePointAt(2));
            }
            if (length == 4) {
              return exports.$stringAllocate1_4(s.codePointAt(0), s.codePointAt(1), s.codePointAt(2), s.codePointAt(3));
            }
            if (length == 5) {
              return exports.$stringAllocate1_5(s.codePointAt(0), s.codePointAt(1), s.codePointAt(2), s.codePointAt(3), s.codePointAt(4));
            }
            if (length == 6) {
              return exports.$stringAllocate1_6(s.codePointAt(0), s.codePointAt(1), s.codePointAt(2), s.codePointAt(3), s.codePointAt(4), s.codePointAt(5));
            }
            if (length == 7) {
              return exports.$stringAllocate1_7(s.codePointAt(0), s.codePointAt(1), s.codePointAt(2), s.codePointAt(3), s.codePointAt(4), s.codePointAt(5), s.codePointAt(6));
            }
            if (length == 8) {
              return exports.$stringAllocate1_8(s.codePointAt(0), s.codePointAt(1), s.codePointAt(2), s.codePointAt(3), s.codePointAt(4), s.codePointAt(5), s.codePointAt(6), s.codePointAt(7));
            }
            if (length == 9) {
              return exports.$stringAllocate1_9(s.codePointAt(0), s.codePointAt(1), s.codePointAt(2), s.codePointAt(3), s.codePointAt(4), s.codePointAt(5), s.codePointAt(6), s.codePointAt(7), s.codePointAt(8));
            }
            if (length == 10) {
              return exports.$stringAllocate1_10(s.codePointAt(0), s.codePointAt(1), s.codePointAt(2), s.codePointAt(3), s.codePointAt(4), s.codePointAt(5), s.codePointAt(6), s.codePointAt(7), s.codePointAt(8), s.codePointAt(9));
            }
          }
          const dartString = exports.$stringAllocate1(length);
          const write = exports.$stringWrite1;
          for (let i = 0; i < length; i++) {
            write(dartString, i, s.codePointAt(i));
          }
          return dartString;
        } else {
          const dartString = exports.$stringAllocate2(length);
          const write = exports.$stringWrite2;
          for (let i = 0; i < length; i++) {
            write(dartString, i, s.charCodeAt(i));
          }
          return dartString;
        }
      },
      _2195: () => ({}),
      _2196: () => [],
      _2197: l => new Array(l),
      _2198: () => globalThis,
      _2199: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      _2200: (o, p) => p in o,
      _2201: (o, p) => o[p],
      _2202: (o, p, v) => o[p] = v,
      _2203: (o, m, a) => o[m].apply(o, a),
      _2205: o => String(o),
      _2206: (p, s, f) => p.then(s, f),
      _2207: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        return 17;
      },
      _2208: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _2209: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _2212: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _2213: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _2214: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _2215: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _2216: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _2217: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _2218: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      _2220: x0 => x0.input,
      _2221: x0 => x0.index,
      _2222: x0 => x0.groups,
      _2225: (x0,x1) => x0.exec(x1),
      _2227: x0 => x0.flags,
      _2228: x0 => x0.multiline,
      _2229: x0 => x0.ignoreCase,
      _2230: x0 => x0.unicode,
      _2231: x0 => x0.dotAll,
      _2232: (x0,x1) => x0.lastIndex = x1,
      _2233: (o, p) => p in o,
      _2234: (o, p) => o[p],
      _2235: (o, p, v) => o[p] = v,
      _2237: (x0,x1,x2) => globalThis.Atomics.wait(x0,x1,x2),
      _2239: (x0,x1,x2) => globalThis.Atomics.notify(x0,x1,x2),
      _2240: (x0,x1,x2) => globalThis.Atomics.store(x0,x1,x2),
      _2241: (x0,x1) => globalThis.Atomics.load(x0,x1),
      _2242: () => globalThis.Int32Array,
      _2244: () => globalThis.Uint8Array,
      _2246: () => globalThis.DataView,
      _2249: x0 => x0.byteLength,
      _2254: v => v.toString(),
      _2255: (d, digits) => d.toFixed(digits),
      _2256: d => d.toExponential(),
      _2257: (d, f) => d.toExponential(f),
      _2259: x0 => x0.random(),
      _2260: x0 => x0.random(),
      _2261: (x0,x1) => x0.getRandomValues(x1),
      _2262: () => globalThis.crypto,
      _2264: () => globalThis.Math,
      _2360: x0 => x0.readyState,
      _2362: (x0,x1) => x0.timeout = x1,
      _2364: (x0,x1) => x0.withCredentials = x1,
      _2365: x0 => x0.upload,
      _2366: x0 => x0.responseURL,
      _2367: x0 => x0.status,
      _2368: x0 => x0.statusText,
      _2370: (x0,x1) => x0.responseType = x1,
      _2371: x0 => x0.response,
      _2385: x0 => x0.loaded,
      _2386: x0 => x0.total,
      _3743: (x0,x1) => x0.width = x1,
      _3745: (x0,x1) => x0.height = x1,
      _3877: x0 => x0.data,
      _4183: () => globalThis.window,
      _4225: x0 => x0.document,
      _4247: x0 => x0.navigator,
      _4511: x0 => x0.localStorage,
      _4625: x0 => x0.maxTouchPoints,
      _4632: x0 => x0.appCodeName,
      _4633: x0 => x0.appName,
      _4634: x0 => x0.appVersion,
      _4635: x0 => x0.platform,
      _4636: x0 => x0.product,
      _4637: x0 => x0.productSub,
      _4638: x0 => x0.userAgent,
      _4639: x0 => x0.vendor,
      _4640: x0 => x0.vendorSub,
      _4642: x0 => x0.language,
      _4643: x0 => x0.languages,
      _4649: x0 => x0.hardwareConcurrency,
      _4651: x0 => x0.storage,
      _4689: x0 => x0.data,
      _4720: x0 => x0.port1,
      _4721: x0 => x0.port2,
      _4727: (x0,x1) => x0.onmessage = x1,
      _4813: x0 => x0.port,
      _4854: x0 => x0.length,
      _6881: x0 => x0.signal,
      _6960: () => globalThis.document,
      _7853: x0 => x0.ctrlKey,
      _7856: x0 => x0.metaKey,
      _7860: x0 => x0.keyCode,
      _8785: x0 => x0.value,
      _8787: x0 => x0.done,
      _9500: x0 => x0.url,
      _9502: x0 => x0.status,
      _9504: x0 => x0.statusText,
      _9505: x0 => x0.headers,
      _9506: x0 => x0.body,
      _10979: x0 => x0.result,
      _10980: x0 => x0.error,
      _10991: (x0,x1) => x0.onupgradeneeded = x1,
      _10993: x0 => x0.oldVersion,
      _11083: x0 => x0.key,
      _11084: x0 => x0.primaryKey,
      _11086: x0 => x0.value,

    };

    const baseImports = {
      dart2wasm: dart2wasm,


      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
    };

    const deferredLibraryHelper = {
      "loadModule": async (moduleName) => {
        if (!loadDeferredWasm) {
          throw "No implementation of loadDeferredWasm provided.";
        }
        const source = await Promise.resolve(loadDeferredWasm(moduleName));
        const module = await ((source instanceof Response)
            ? WebAssembly.compileStreaming(source, this.builtins)
            : WebAssembly.compile(source, this.builtins));
        return await WebAssembly.instantiate(module, {
          ...baseImports,
          ...additionalImports,
          "wasm:js-string": jsStringPolyfill,
          "module0": dartInstance.exports,
        });
      },
    };

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      "deferredLibraryHelper": deferredLibraryHelper,
      "wasm:js-string": jsStringPolyfill,
    });

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}

