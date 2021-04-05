// background.js

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
  // Send a message to the active tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(
      activeTab.id,
      { message: "clicked_browser_action" },
      function(response) {
        updateIcon(response);
      }
    );
  });
});

function updateIcon(response) {
  console.log(response);
  if (response.monitoring) {
    chrome.browserAction.setBadgeBackgroundColor({ color: "red" });
    chrome.browserAction.setBadgeText({ text: "M" });
  } else {
    chrome.browserAction.setBadgeBackgroundColor({ color:[0, 0, 0, 0] });
    chrome.browserAction.setBadgeText({ text: "" });
  }
}