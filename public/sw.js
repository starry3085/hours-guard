const CACHE_NAME = 'hours-guard-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/mobile.css',
  '/css/desktop.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/i18n.js',
  '/js/export.js',
  '/js/utils.js',
  '/config.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// 安装事件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 激活事件
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 获取事件
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存中有，则返回缓存的响应
        if (response) {
          return response;
        }

        // 否则从网络获取
        return fetch(event.request).then(response => {
          // 检查是否收到有效的响应
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // 克隆响应
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // 离线时的回退策略
        if (event.request.destination === 'image') {
          return caches.match('/assets/icons/icon-192x192.png');
        }
        return caches.match('/index.html');
      })
  );
});

// 后台同步
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 推送通知
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: '查看详情',
          icon: '/assets/icons/checkmark.png'
        },
        {
          action: 'close',
          title: '关闭',
          icon: '/assets/icons/xmark.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
  console.log('Notification click received:', event);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 后台同步函数
async function doBackgroundSync() {
  try {
    // 这里可以添加数据同步逻辑
    console.log('Performing background sync...');
    
    // 获取本地存储的待同步数据
    const db = await openIndexedDB();
    const transaction = db.transaction(['records'], 'readonly');
    const store = transaction.objectStore('records');
    const pendingRecords = await store.getAll();
    
    if (pendingRecords.length > 0) {
      // 发送到服务器
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pendingRecords)
      });
      
      if (response.ok) {
        console.log('Successfully synced records');
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// 打开IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HoursGuardDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('records')) {
        db.createObjectStore('records', { keyPath: 'id' });
      }
    };
  });
}

// 消息处理
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 清理旧缓存
self.addEventListener('periodicsync', event => {
  if (event.tag === 'cleanup-cache') {
    event.waitUntil(cleanupCache());
  }
});

async function cleanupCache() {
  const cacheNames = await caches.keys();
  const validCacheNames = [CACHE_NAME];
  
  for (const cacheName of cacheNames) {
    if (!validCacheNames.includes(cacheName)) {
      console.log('Deleting old cache:', cacheName);
      await caches.delete(cacheName);
    }
  }
}