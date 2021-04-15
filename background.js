// background.js
let alertText = '';
let activeTabId = null;

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
  // Send a message to the active tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    activeTabId = activeTab.id;

    chrome.tabs.sendMessage(
      activeTabId,
      { message: "clicked_browser_action" },
      function(response) {
        updateIcon(response);
      }
    );
  });
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === "monitoring_stopped") {
      if (alertText) alert(alertText);
      alertText = null;
    } else if (request.message === "summary_updated") {
      alertText = request.alertText;
    }
  }
);

chrome.tabs.onRemoved.addListener(function(tabId, removed) {
  if (tabId === activeTabId) {
    if (alertText) alert(alertText);
    alertText = null;
    updateIcon({ monitoring: false });
  }
});

function updateIcon(response) {
  if (response.monitoring) {
    chrome.browserAction.setBadgeBackgroundColor({ color: "red" });
    chrome.browserAction.setBadgeText({ text: "M" });
  } else {
    chrome.browserAction.setBadgeBackgroundColor({ color:[0, 0, 0, 0] });
    chrome.browserAction.setBadgeText({ text: "" });
  }
}