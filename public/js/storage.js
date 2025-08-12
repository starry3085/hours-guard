// 存储管理模块
class StorageManager {
    constructor() {
        this.dbName = 'HoursGuardDB';
        this.version = 1;
        this.storeName = 'attendance';
        this.initDB();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    async saveRecord(record) {
        try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.add(record);
                request.onsuccess = () => resolve(record);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Save record error:', error);
            throw error;
        }
    }

    async updateRecord(record) {
        try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.put(record);
                request.onsuccess = () => resolve(record);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Update record error:', error);
            throw error;
        }
    }

    async getRecord(id) {
        try {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Get record error:', error);
            throw error;
        }
    }

    async getAllRecords() {
        try {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Get all records error:', error);
            throw error;
        }
    }

    async getRecordsByDate(date) {
        try {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('date');
            
            return new Promise((resolve, reject) => {
                const request = index.getAll(date);
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Get records by date error:', error);
            throw error;
        }
    }

    async getRecordsByRange(startDate, endDate) {
        try {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('date');
            
            return new Promise((resolve, reject) => {
                const records = [];
                const range = IDBKeyRange.bound(startDate, endDate);
                const request = index.openCursor(range);
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        records.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(records);
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Get records by range error:', error);
            throw error;
        }
    }

    async deleteRecord(id) {
        try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Delete record error:', error);
            throw error;
        }
    }

    async clearAllData() {
        try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Clear all data error:', error);
            throw error;
        }
    }

    async exportData() {
        try {
            const records = await this.getAllRecords();
            return {
                version: this.version,
                exportedAt: new Date().toISOString(),
                records: records,
                totalRecords: records.length
            };
        } catch (error) {
            console.error('Export data error:', error);
            throw error;
        }
    }

    async importData(data) {
        try {
            if (!data.records || !Array.isArray(data.records)) {
                throw new Error('Invalid data format');
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            // 清空现有数据
            await new Promise((resolve, reject) => {
                const clearRequest = store.clear();
                clearRequest.onsuccess = () => resolve();
                clearRequest.onerror = () => reject(clearRequest.error);
            });

            // 导入新数据
            const importPromises = data.records.map(record => {
                return new Promise((resolve, reject) => {
                    const request = store.add(record);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            });

            await Promise.all(importPromises);
            return true;
        } catch (error) {
            console.error('Import data error:', error);
            throw error;
        }
    }

    // 备份到本地存储（降级方案）
    backupToLocalStorage() {
        try {
            return this.getAllRecords().then(records => {
                const backup = {
                    version: this.version,
                    timestamp: new Date().toISOString(),
                    records: records
                };
                localStorage.setItem('hoursGuard_backup', JSON.stringify(backup));
                return true;
            });
        } catch (error) {
            console.error('Backup to localStorage error:', error);
            return false;
        }
    }

    // 从本地存储恢复
    restoreFromLocalStorage() {
        try {
            const backup = localStorage.getItem('hoursGuard_backup');
            if (!backup) return false;

            const data = JSON.parse(backup);
            if (data.records && Array.isArray(data.records)) {
                return this.importData(data);
            }
            return false;
        } catch (error) {
            console.error('Restore from localStorage error:', error);
            return false;
        }
    }

    // 获取数据库统计信息
    async getStats() {
        try {
            const records = await this.getAllRecords();
            const completedRecords = records.filter(r => r.clockOut && r.duration);
            
            let totalMinutes = 0;
            completedRecords.forEach(record => {
                if (record.duration) {
                    const [hours, minutes] = record.duration.split(':').map(Number);
                    totalMinutes += hours * 60 + minutes;
                }
            });

            return {
                totalRecords: records.length,
                completedRecords: completedRecords.length,
                totalHours: Math.floor(totalMinutes / 60),
                totalMinutes: totalMinutes % 60,
                dateRange: {
                    earliest: records.length > 0 ? records.reduce((min, r) => 
                        new Date(r.date) < new Date(min.date) ? r : min).date : null,
                    latest: records.length > 0 ? records.reduce((max, r) => 
                        new Date(r.date) > new Date(max.date) ? r : max).date : null
                }
            };
        } catch (error) {
            console.error('Get stats error:', error);
            throw error;
        }
    }
}

// 创建全局存储实例
const Storage = new StorageManager();