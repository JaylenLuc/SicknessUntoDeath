window.addEventListener("message", (event) => {
  if (event.data?.type === "GET_SESSION") {
    chrome.runtime.sendMessage({ type: "GET_SESSION" }, (session) => {
      window.postMessage(
        { type: "SESSION_DATA", session },
        "*"
      )
    })
  }
})