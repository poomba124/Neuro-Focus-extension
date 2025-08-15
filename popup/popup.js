document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggle");
  const readingModeBtn = document.getElementById("readingModeBtn");
  const adBlockStatus = document.getElementById("adBlockStatus");
  const fontFamily = document.getElementById("fontFamily");
  const increaseFont = document.getElementById("increaseFont");
  const decreaseFont = document.getElementById("decreaseFont");
  const fontSizeDisplay = document.getElementById("fontSizeDisplay");
  const fontPreview = document.getElementById("fontPreview");
  const rulerBtn = document.getElementById("rulerBtn");
  const rulerControls = document.getElementById("rulerControls");
  const colorOptions = document.querySelectorAll(".color-option");
  const restoreBtn = document.getElementById("restoreBtn");

  let currentFontSize = 18;
  let currentFontFamily = "Georgia, serif";
  let rulerEnabled = false;
  let rulerColor = "#ffeb3b";

  chrome.storage.sync.get([
    "adBlockEnabled",
    "fontSize",
    "fontFamily",
    "dyslexiaRulerEnabled",
    "rulerColor"
  ], (data) => {
    const adBlockEnabled = data.adBlockEnabled ?? true;
    toggle.checked = adBlockEnabled;
    updateAdBlockStatus(adBlockEnabled);

    currentFontSize = data.fontSize || 18;
    currentFontFamily = data.fontFamily || "Georgia, serif";  //Set default settings here
    fontSizeDisplay.textContent = currentFontSize + "px";
    fontFamily.value = currentFontFamily;
    updateFontPreview();

    rulerEnabled = data.dyslexiaRulerEnabled || false;
    rulerColor = data.rulerColor || "#ffeb3b";
    updateRulerUI();
    updateColorSelection();
  });

  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;

    chrome.storage.sync.set({ adBlockEnabled: enabled }, () => {
      chrome.runtime.sendMessage({
        action: "toggleAdBlock",
        enabled
      }, (response) => {
        if (response && response.success) {
          updateAdBlockStatus(enabled);
        }
      });
    });
  });

  fontFamily.addEventListener("change", () => {
    currentFontFamily = fontFamily.value;
    chrome.storage.sync.set({ fontFamily: currentFontFamily });
    updateFontPreview();
  });

  increaseFont.addEventListener("click", () => {
    if (currentFontSize < 32) {
      currentFontSize += 2;
      updateFontSize();
    }
  });

  decreaseFont.addEventListener("click", () => {
    if (currentFontSize > 12) {
      currentFontSize -= 2;
      updateFontSize();
    }
  });

  rulerBtn.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        showRulerError("Cannot use ruler on browser pages");
        return;
      }

      rulerEnabled = !rulerEnabled;
      chrome.storage.sync.set({
        dyslexiaRulerEnabled: rulerEnabled,
        rulerColor: rulerColor
      });

      chrome.tabs.sendMessage(tab.id, {
        action: "toggleDyslexiaRuler",
        enabled: rulerEnabled,
        color: rulerColor
      }, (response) => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["dyslexiaRuler.js"]
          }).then(() => {
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, {
                action: "toggleDyslexiaRuler",
                enabled: rulerEnabled,
                color: rulerColor
              });
            }, 100);
          });
        }
      });

      updateRulerUI();

    } catch (error) {
      console.error("Error toggling dyslexia ruler:", error);
      showRulerError("Could not toggle ruler");
    }
  });

  colorOptions.forEach(colorOption => {
    colorOption.addEventListener("click", async () => {
      const newColor = colorOption.dataset.color;
      rulerColor = newColor;

      chrome.storage.sync.set({ rulerColor: rulerColor });
      updateColorSelection();

      if (rulerEnabled) {
        try {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
          });

          chrome.tabs.sendMessage(tab.id, {
            action: "updateRulerColor",
            color: rulerColor
          });
        } catch (error) {
          console.error("Error updating ruler color:", error);
        }
      }
    });
  });

  readingModeBtn.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        showError("Cannot apply reading mode to browser pages");
        return;
      }

      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["readingMode.css"]
      });

      const customCSS = `
        html, body {
          font-family: ${currentFontFamily} !important;
          font-size: ${currentFontSize}px !important;
        }

        main, article, .article, .post, .content, [role="main"] {
          font-family: ${currentFontFamily} !important;
          font-size: ${currentFontSize}px !important;
        }

        p, div, span, li {
          font-family: ${currentFontFamily} !important;
          font-size: ${currentFontSize}px !important;
        }
      `;

      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        css: customCSS
      });

      readingModeBtn.textContent = "✅ Focus Mode Applied!";
      readingModeBtn.style.background = "#27ae60";

      setTimeout(() => {
        readingModeBtn.textContent = "📖 Enable Focus Mode";
        readingModeBtn.style.background = "#4CAF50";
      }, 2000);

    } catch (error) {
      console.error("Error applying reading mode:", error);
      showError("Could not apply reading mode");
    }
  });

  restoreBtn.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        showRestoreError("Cannot restore browser pages");
        return;
      }

      chrome.tabs.sendMessage(tab.id, {
        action: "restorePage"
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error restoring page:", chrome.runtime.lastError);
          showRestoreError("Could not restore page");
        } else {
          restoreBtn.textContent = "✅ Page Restored!";
          restoreBtn.style.background = "#27ae60";

          setTimeout(() => {
            restoreBtn.textContent = "🔄 Restore Page";
            restoreBtn.style.background = "#e74c3c";
          }, 2000);
        }
      });

    } catch (error) {
      console.error("Error restoring page:", error);
      showRestoreError("Could not restore page");
    }
  });

  function updateFontSize() {
    fontSizeDisplay.textContent = currentFontSize + "px";
    chrome.storage.sync.set({ fontSize: currentFontSize });
    updateFontPreview();
  }

  function updateFontPreview() {
    fontPreview.style.fontFamily = currentFontFamily;
    fontPreview.style.fontSize = currentFontSize + "px";
  }

  function updateAdBlockStatus(enabled) {
    adBlockStatus.textContent = enabled ? "✅ Active" : "❌ Disabled";
    adBlockStatus.style.color = enabled ? "#27ae60" : "#e74c3c";
  }

  function updateRulerUI() {
    if (rulerEnabled) {
      rulerBtn.textContent = "✅ Ruler Active";
      rulerBtn.classList.add("active");
      rulerControls.classList.add("active");
    } else {
      rulerBtn.textContent = "📏 Enable Reading Ruler";
      rulerBtn.classList.remove("active");
      rulerControls.classList.remove("active");
    }
  }

  function updateColorSelection() {
    colorOptions.forEach(option => {
      if (option.dataset.color === rulerColor) {
        option.classList.add("selected");
      } else {
        option.classList.remove("selected");
      }
    });
  }

  function showError(message) {
    readingModeBtn.textContent = "❌ " + message;
    readingModeBtn.style.background = "#e74c3c";
    setTimeout(() => {
      readingModeBtn.textContent = "📖 Enable Focus Mode";
      readingModeBtn.style.background = "#4CAF50";
    }, 3000);
  }

  function showRulerError(message) {
    rulerBtn.textContent = "❌ " + message;
    rulerBtn.style.background = "#e74c3c";
    setTimeout(() => {
      updateRulerUI();
      rulerBtn.style.background = rulerEnabled ? "#27ae60" : "#9b59b6";
    }, 3000);
  }

  function showRestoreError(message) {
    restoreBtn.textContent = "❌ " + message;
    restoreBtn.style.background = "#c0392b";
    setTimeout(() => {
      restoreBtn.textContent = "🔄 Restore Page";
      restoreBtn.style.background = "#e74c3c";
    }, 3000);
  }
});
