let sessionId = crypto.randomUUID();

let session = {
  nodes: {},
  urlToNodeId: {},
  edges: [],
  cursor: null,
  step: 0
};

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;

  const url = details.url;

  let nodeId;
  if (url in session.urlToNodeId) {
    nodeId = session.urlToNodeId[url];
  } else {
    nodeId = Object.keys(session.nodes).length;
    session.urlToNodeId[url] = nodeId;
    session.nodes[nodeId] = { url };
  }

  if (
    session.cursor !== null &&
    session.cursor !== nodeId &&
    !session.edges.some(e => e.from === session.cursor && e.to === nodeId && e.step !== session.step)
  ) {
    session.edges.push({
      from: session.cursor,
      to: nodeId,
      step: session.step++
    });
  }

  session.cursor = nodeId;
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_SESSION") {
    sendResponse(session);
  }
  if (msg.type === "CLEAR_SESSION") {
    session = {
      nodes: {},
      urlToNodeId: {},
      edges: [],
      cursor: null,
      step: 0
    }
    sendResponse({ ok: true })
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: " https://sickness-unto-death.vercel.app/gnostikos_session"
  });
});
// PROD : https://sickness-unto-death.vercel.app/gnostikos_session
// DEV "https://effective-disco-xq46q7rqqp53pvpw-3000.app.github.dev/gnostikos_session"