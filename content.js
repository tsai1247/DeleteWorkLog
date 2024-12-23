const QUERY_BUTTON_SELECTOR = 'button.fr-btn-text[data-role="none"]';
const RETRY_INTERVAL = 1000; // 1秒

function getBasicAuth() {
  return localStorage.getItem('basicAuth') || '';
}

function addDeleteButtons() {
  try {
    console.log('addDeleteButtons');
    // 清除既有的刪除按鈕
    document.querySelectorAll('.delete-btn').forEach(btn => btn.remove());
    
    // 找出所有符合條件的表格列
    // td, cef 為 E2
    const issueNumberCells = document.querySelectorAll('td[cef="E2"]');
    // 建立一個陣列，存的式所有的 issueNumber，根據rowspan的數量來決定要重複幾次，沒有的話是1
    const issueNumbers = [];
    for (const cell of issueNumberCells) {
      const issueNumber = cell.textContent.trim();
      const rowspan = cell.getAttribute('rowspan') || 1;
      for (let j = 0; j < rowspan; j++) {
        issueNumbers.push(issueNumber);
      }
    }


    // 取得所有的 F2
    const workLogNumberCells = document.querySelectorAll('td[cef="F2"]');
    console.log('find ', workLogNumberCells.length, 'work log(s)');

    // 取得所有的 G2
    const workTagCells = document.querySelectorAll('td[cef="G2"]');

    // 取得所有的 H2
    const workContentCells = document.querySelectorAll('td[cef="H2"]');

    // 取得所有的 J2
    const timeCells = document.querySelectorAll('td[cef="J2"]');

    if(workLogNumberCells.length !== issueNumbers.length || workLogNumberCells.length !== timeCells.length) {
      console.error('Something went wrong');
      return;
    }

    workLogNumberCells.forEach((cell, index) => {
      // 建立刪除按鈕
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Del';
      const syncloudId = issueNumbers[index];
      const numberId = cell.textContent.trim();
      const workTag = workTagCells[index].textContent.trim();
      const workContent = workContentCells[index].textContent.trim();
      
      // 如果時間為 0:00，將 cell 加上刪除線，並且不加入刪除按鈕
      const time = timeCells[index].textContent.trim();
      if (time === '0:00') {
        cell.style.textDecoration = 'line-through';
        workTagCells[index].style.textDecoration = 'line-through';
        workContentCells[index].style.textDecoration = 'line-through';
        timeCells[index].style.textDecoration = 'line-through';

        // 並且顏色變成淺灰色
        cell.style.color = '#999';
        workTagCells[index].style.color = '#999';
        workContentCells[index].style.color = '#999';
        timeCells[index].style.color = '#999';

        return;
      }

      // 處理點擊事件
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // 防止事件冒泡
        
        if (confirm(`Delete ${syncloudId}[${workTag}]：\n ${workContent}\n WorklogID: ${numberId}`)) {
          try {
            const BasicAuth = getBasicAuth();
            const payload = {
              issueID: syncloudId,
              workLogID: numberId,
              BasicAuth: BasicAuth,
            };
            console.log('payload', payload);
            const response = await fetch('https://www.syntecclub.com:9392/SyntecIT/api/v1/Open/JIRA_Related/Worklogger/DeleteJiraWorkLog', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload)
            });
            console.log('response', response);
            if (response.ok) {
              // cell.parentElement.remove();
              // cell 加上刪除線
              cell.style.textDecoration = 'line-through';
              // cell 中的 delete 按鈕變成 disabled
              deleteBtn.remove();

              
              alert('Delete Successfully');
            }
            else {
              alert('Delete Failed' + response.statusText);
            }
          } catch (error) {
            alert('發生錯誤：' + error.message);
          }
        }
      });
      
      // 插入按鈕，在cell內已經有的div內
      cell.querySelector('div').insertBefore(deleteBtn, cell.querySelector('div').firstChild);

    });
  } catch (error) {
    console.error('Search error:', error);
  }
}

function setupQueryButtonListener() {
  let retryCount = 0;
  const intervalId = setInterval(() => {
    const queryButton = Array.from(document.querySelectorAll(QUERY_BUTTON_SELECTOR)).find((button) => button.textContent === '查詢');
    
    if (queryButton) {
      clearInterval(intervalId);
      queryButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'QUERY_BUTTON_CLICKED' });
      });
      chrome.runtime.sendMessage({ type: 'QUERY_BUTTON_CLICKED' });
    } else if (retryCount >= 5) {
      clearInterval(intervalId);
    }
    retryCount++;
  }, RETRY_INTERVAL);
}

// 監聽來自背景腳本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ADD_DELETE_BUTTONS') {
    // 等待直到存在任何 'td[cef="E2"]' 或嘗試30次，間隔500ms
    let retryCount2 = 0;
    const intervalId2 = setInterval(() => {
      if (document.querySelector('td[cef="E2"]')) {
        clearInterval(intervalId2);
        addDeleteButtons();
      } else if (retryCount2 >= 30) {
        clearInterval(intervalId2);
        console.log('已達最大重試次數，停止尋找查詢按鈕');
      }
      retryCount2++;
    }, 500);
  }
});

// 初始化
async function initialize() {
  setupQueryButtonListener();
}


initialize();
