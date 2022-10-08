// background.js

// Called when the user clicks on the browser action.
chrome.action.onClicked.addListener(function(tab) {
  // Send a message to the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    var activeTab = tabs[0];
    activeTabId = activeTab.id;
    chrome.storage.local.set({ activeTabId })

    chrome.tabs.sendMessage(
      activeTabId,
      { message: "clicked_browser_action" },
      function(response) {
        updateIcon(response);
      }
    );
  });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.audible !== undefined && tab.active) {
    chrome.tabs.sendMessage(
      tabId,
      { message: "meet_started" },
      function(response) {
        updateIcon(response);
      }
    );
  }
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    const { alertText, message } = request;

    if (message === "monitoring_stopped") {
      clearData();
    } else if (message === "summary_updated") {
      chrome.storage.local.set({ alertText });
    }

    return true;
  }
);

chrome.tabs.onRemoved.addListener(function(tabId, removed) {
  chrome.storage.local.get('activeTabId', function(data) {
    if (tabId === data.activeTabId) clearData();
  })
});

function clearData() {
  chrome.storage.local.remove(['activeTabId']);
  chrome.storage.local.remove(['alertText']);
  updateIcon({ monitoring: false });
};

function updateIcon(response) {
  if (response && response.monitoring) {
    chrome.action.setBadgeBackgroundColor({ color: "red" });
    chrome.action.setBadgeText({ text: "M" });
  } else {
    chrome.action.setBadgeBackgroundColor({ color:[0, 0, 0, 0] });
    chrome.action.setBadgeText({ text: "" });
  }
}
