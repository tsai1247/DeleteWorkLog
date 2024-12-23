chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'QUERY_BUTTON_CLICKED') {
      chrome.tabs.sendMessage(sender.tab.id, { type: 'ADD_DELETE_BUTTONS' });
    }
  });