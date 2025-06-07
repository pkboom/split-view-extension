chrome.action.onClicked.addListener(() => {
  chrome.system.display.getInfo((displays) => {
    // Use the primary display
    const primary = displays.find((d) => d.isPrimary) || displays[0];
    const screenWidth = primary.workArea.width;
    const screenHeight = primary.workArea.height;
    const left = primary.workArea.left;
    const top = primary.workArea.top;
    const halfWidth = Math.floor(screenWidth / 2);

    // Get the current window and its active tab's URL
    chrome.windows.getCurrent({}, (currentWindow) => {
      chrome.tabs.query({ active: true, windowId: currentWindow.id }, (tabs) => {
        const currentTab = tabs[0];
        const currentUrl = currentTab?.url || "https://www.google.com";

        // Resize the current window to the left half
        chrome.windows.update(
          currentWindow.id,
          {
            left: left,
            top: top,
            width: halfWidth,
            height: screenHeight,
            focused: true,
          },
          () => {
            // Create new window on the right half with the current URL
            chrome.windows.create(
              {
                url: currentUrl,
                left: left + halfWidth,
                top: top,
                width: screenWidth - halfWidth,
                height: screenHeight,
                focused: false,
              },
              () => {
                // Close the current tab after the new window is created
                if (currentTab && currentTab.id) {
                  chrome.tabs.remove(currentTab.id);
                }
              }
            );
          }
        );
      });
    });
  });
});
