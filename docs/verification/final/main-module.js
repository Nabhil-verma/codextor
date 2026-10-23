import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false};import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=74bad9fa"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=74bad9fa"; const React = __vite__cjsImport1_react.__esModule ? __vite__cjsImport1_react.default : __vite__cjsImport1_react;
import __vite__cjsImport2_reactDom_client from "/node_modules/.vite/deps/react-dom_client.js?v=97861ec6"; const ReactDOM = __vite__cjsImport2_reactDom_client.__esModule ? __vite__cjsImport2_reactDom_client.default : __vite__cjsImport2_reactDom_client;
import App from "/src/App.tsx";
import { AccountProvider } from "/src/AccountProvider.tsx";
import ErrorBoundary from "/src/components/ErrorBoundary.tsx";
import "/src/index.css";
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
    });
  });
}
window.addEventListener("unhandledrejection", (e) => {
  console.error("[unhandledrejection]", e.reason);
});
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxDEV(React.StrictMode, { children: /* @__PURE__ */ jsxDEV(ErrorBoundary, { children: /* @__PURE__ */ jsxDEV(AccountProvider, { children: /* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
    fileName: "/workspace/chats/101b4a5ca56c23ee41b9852b/src/main.tsx",
    lineNumber: 27,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "/workspace/chats/101b4a5ca56c23ee41b9852b/src/main.tsx",
    lineNumber: 26,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/workspace/chats/101b4a5ca56c23ee41b9852b/src/main.tsx",
    lineNumber: 25,
    columnNumber: 5
  }, this) }, void 0, false, {
    fileName: "/workspace/chats/101b4a5ca56c23ee41b9852b/src/main.tsx",
    lineNumber: 24,
    columnNumber: 3
  }, this)
);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4udHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tIFwicmVhY3RcIjtcclxuaW1wb3J0IFJlYWN0RE9NIGZyb20gXCJyZWFjdC1kb20vY2xpZW50XCI7XHJcbmltcG9ydCBBcHAgZnJvbSBcIi4vQXBwXCI7XHJcbmltcG9ydCB7IEFjY291bnRQcm92aWRlciB9IGZyb20gXCIuL0FjY291bnRQcm92aWRlclwiO1xyXG5pbXBvcnQgRXJyb3JCb3VuZGFyeSBmcm9tIFwiLi9jb21wb25lbnRzL0Vycm9yQm91bmRhcnlcIjtcclxuaW1wb3J0IFwiLi9pbmRleC5jc3NcIjtcclxuXHJcbi8vIFJlZ2lzdGVyIHNlcnZpY2Ugd29ya2VyIGZvciBQV0Egb2ZmbGluZSBzdXBwb3J0IChwcm9kIG9ubHkpLlxyXG5pZiAoXCJzZXJ2aWNlV29ya2VyXCIgaW4gbmF2aWdhdG9yICYmIGltcG9ydC5tZXRhLmVudi5QUk9EKSB7XHJcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsICgpID0+IHtcclxuICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKFwiL3N3LmpzXCIpLmNhdGNoKCgpID0+IHtcclxuICAgICAgLy8gU1cgcmVnaXN0cmF0aW9uIGZhaWxlZCDigJQgbm9uLWNyaXRpY2FsLCBhcHAgc3RpbGwgd29ya3NcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vLyBTdXJmYWNlIGFzeW5jIGNyYXNoZXMgaW4gdGhlIGhvc3RlZCBwcmV2aWV3IGNvbnNvbGUgaW5zdGVhZCBvZiBkeWluZyBzaWxlbnRseS5cclxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJ1bmhhbmRsZWRyZWplY3Rpb25cIiwgKGUpID0+IHtcclxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxyXG4gIGNvbnNvbGUuZXJyb3IoXCJbdW5oYW5kbGVkcmVqZWN0aW9uXVwiLCBlLnJlYXNvbik7XHJcbn0pO1xyXG5cclxuUmVhY3RET00uY3JlYXRlUm9vdChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJvb3RcIikhKS5yZW5kZXIoXHJcbiAgPFJlYWN0LlN0cmljdE1vZGU+XHJcbiAgICA8RXJyb3JCb3VuZGFyeT5cclxuICAgICAgPEFjY291bnRQcm92aWRlcj5cclxuICAgICAgICA8QXBwIC8+XHJcbiAgICAgIDwvQWNjb3VudFByb3ZpZGVyPlxyXG4gICAgPC9FcnJvckJvdW5kYXJ5PlxyXG4gIDwvUmVhY3QuU3RyaWN0TW9kZT5cclxuKTtcclxuIl0sIm1hcHBpbmdzIjoiQUEwQlE7QUExQlIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sY0FBYztBQUNyQixPQUFPLFNBQVM7QUFDaEIsU0FBUyx1QkFBdUI7QUFDaEMsT0FBTyxtQkFBbUI7QUFDMUIsT0FBTztBQUdQLElBQUksbUJBQW1CLGFBQWEsWUFBWSxJQUFJLE1BQU07QUFDeEQsU0FBTyxpQkFBaUIsUUFBUSxNQUFNO0FBQ3BDLGNBQVUsY0FBYyxTQUFTLFFBQVEsRUFBRSxNQUFNLE1BQU07QUFBQSxJQUV2RCxDQUFDO0FBQUEsRUFDSCxDQUFDO0FBQ0g7QUFHQSxPQUFPLGlCQUFpQixzQkFBc0IsQ0FBQyxNQUFNO0FBRW5ELFVBQVEsTUFBTSx3QkFBd0IsRUFBRSxNQUFNO0FBQ2hELENBQUM7QUFFRCxTQUFTLFdBQVcsU0FBUyxlQUFlLE1BQU0sQ0FBRSxFQUFFO0FBQUEsRUFDcEQsdUJBQUMsTUFBTSxZQUFOLEVBQ0MsaUNBQUMsaUJBQ0MsaUNBQUMsbUJBQ0MsaUNBQUMsU0FBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQUssS0FEUDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBRUEsS0FIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBSUEsS0FMRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBTUE7QUFDRjsiLCJuYW1lcyI6W119