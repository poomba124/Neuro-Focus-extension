chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get("adBlockEnabled", (data) => {
    const enabled = data.adBlockEnabled ?? true;
    updateAdBlockRules(enabled);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleAdBlock") {
    updateAdBlockRules(message.enabled);
    sendResponse({success: true});
  }
  return true;
});

function updateAdBlockRules(enabled) {
  if (enabled) {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ["ruleset_1"]
    }).catch(error => {
      console.error("Error enabling ad block rules:", error);
    });
  } else {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ["ruleset_1"]
    }).catch(error => {
      console.error("Error disabling ad block rules:", error);
    });
  }
}
