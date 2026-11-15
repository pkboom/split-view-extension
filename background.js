const NONE = chrome.tabs.SPLIT_VIEW_ID_NONE;

chrome.action.onClicked.addListener(async (tab) => {
  // Clicking on a split view separates it. Checked first because Chrome
  // highlights both tabs of a split, which would look like a 2-tab selection.
  if (tab.splitViewId > NONE) {
    await chrome.tabs.unsplit(tab.splitViewId);
    return;
  }

  const highlighted = await chrome.tabs.query({ windowId: tab.windowId, highlighted: true });
  if (highlighted.length === 2) {
    await split(tab, highlighted.find((t) => t.id !== tab.id));
    return;
  }

  // Otherwise pair with the tab on the left (or the right, for the first tab).
  const [neighbor] = await chrome.tabs.query({
    windowId: tab.windowId,
    index: tab.index > 0 ? tab.index - 1 : tab.index + 1,
  });
  if (neighbor) await split(tab, neighbor);
});

// Puts `other` next to `tab` and splits them, keeping `tab` where it is.
async function split(tab, other) {
  for (const id of new Set([tab.splitViewId, other.splitViewId])) {
    if (id !== NONE) await chrome.tabs.unsplit(id);
  }

  // createSplit requires matching pinned and group states.
  if (other.pinned !== tab.pinned) {
    other = await chrome.tabs.update(other.id, { pinned: tab.pinned });
  }

  // Keep `other` on whichever side of `tab` it was. The move index is counted
  // after `other` leaves its old spot, so "just left of tab" is tab.index - 1.
  tab = await chrome.tabs.get(tab.id);
  other = await chrome.tabs.get(other.id);
  if (Math.abs(other.index - tab.index) !== 1) {
    const index = other.index < tab.index ? tab.index - 1 : tab.index + 1;
    await chrome.tabs.move(other.id, { index });
  }

  // createSplit also requires matching groups.
  if (tab.groupId !== -1 && other.groupId !== tab.groupId) {
    await chrome.tabs.group({ groupId: tab.groupId, tabIds: other.id });
  } else if (tab.groupId === -1 && other.groupId !== -1) {
    await chrome.tabs.ungroup(other.id);
  }

  await chrome.tabs.createSplit([tab.id, other.id]);
  await chrome.tabs.update(tab.id, { active: true });
}
