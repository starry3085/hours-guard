// 存储管理器 - 与小程序版功能对等
class StorageManager {
    constructor() {
        this.storageKeys = {
            records: 'hoursGuard_records',
            backup: 'hoursGuard_backup',
            lastBackupTime: 'hoursGuard_lastBackupTime',
            settings: 'hoursGuard_settings'
        };
        this.maxBackups = 5;
        this.backupInterval = 7 * 24 * 60 * 60 * 1000; // 7天
    }

    // 获取记录数据
    getRecords() {
        try {
            const data = localStorage.getItem(this.storageKeys.records);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get records:', error);
            window.errorHandler?.handleError(error, 'Storage Get Records');
            return this.recoverFromBackup() || [];
        }
    }

    // 保存记录数据
    saveRecords(records) {
        try {
            const data = JSON.stringify(records);
            localStorage.setItem(this.storageKeys.records, data);
            
            // 自动备份检查
            this.checkAutoBackup();
            
            return true;
        } catch (error) {
            console.error('Failed to save records:', error);
            window.errorHandler?.handleError(error, 'Storage Save Records');
            return false;
        }
    }

    // 创建备份
    createBackup(description = '') {
        try {
            const records = this.getRecords();
            const backup = {
                timestamp: new Date().toISOString(),
                description: description || `自动备份 - ${new Date().toLocaleString('zh-CN')}`,
                data: records,
                version: '1.0.0',
                recordCount: records.length
            };

            // 获取现有备份
            const backups = this.getBackups();
            backups.unshift(backup);

            // 保持备份数量限制
            if (backups.length > this.maxBackups) {
                backups.splice(this.maxBackups);
            }

            // 保存备份
            localStorage.setItem(this.storageKeys.backup, JSON.stringify(backups));
            localStorage.setItem(this.storageKeys.lastBackupTime, new Date().toISOString());

            return {
                success: true,
                backup: backup,
                totalBackups: backups.length
            };
        } catch (error) {
            console.error('Failed to create backup:', error);
            window.errorHandler?.handleError(error, 'Storage Create Backup');
            return { success: false, error: error.message };
        }
    }

    // 获取所有备份
    getBackups() {
        try {
            const data = localStorage.getItem(this.storageKeys.backup);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get backups:', error);
            return [];
        }
    }

    // 从备份恢复
    restoreFromBackup(backupIndex = 0) {
        try {
            const backups = this.getBackups();
            if (backupIndex >= backups.length) {
                throw new Error('备份索引无效');
            }

            const backup = backups[backupIndex];
            const success = this.saveRecords(backup.data);

            if (success) {
                return {
                    success: true,
                    backup: backup,
                    recordCount: backup.data.length
                };
            } else {
                throw new Error('恢复数据时保存失败');
            }
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            window.errorHandler?.handleError(error, 'Storage Restore Backup');
            return { success: false, error: error.message };
        }
    }

    // 从损坏数据中恢复
    recoverFromBackup() {
        try {
            const backups = this.getBackups();
            if (backups.length > 0) {
                const latestBackup = backups[0];
                console.log('Recovering from latest backup:', latestBackup.timestamp);
                return latestBackup.data;
            }
            return null;
        } catch (error) {
            console.error('Failed to recover from backup:', error);
            return null;
        }
    }

    // 检查自动备份
    checkAutoBackup() {
        try {
            const lastBackupTime = localStorage.getItem(this.storageKeys.lastBackupTime);
            if (!lastBackupTime) {
                // 首次使用，创建初始备份
                this.createBackup('初始备份');
                return;
            }

            const lastBackup = new Date(lastBackupTime);
            const now = new Date();
            const timeDiff = now - lastBackup;

            if (timeDiff > this.backupInterval) {
                this.createBackup('定期自动备份');
            }
        } catch (error) {
            console.error('Auto backup check failed:', error);
        }
    }

    // 存储健康检查
    checkStorageHealth() {
        const health = {
            isHealthy: true,
            issues: [],
            suggestions: [],
            stats: {}
        };

        try {
            // 检查存储可用性
            const testKey = 'hoursGuard_test';
            const testValue = 'test';
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);

            if (retrieved !== testValue) {
                health.isHealthy = false;
                health.issues.push('存储读写异常');
                health.suggestions.push('清理浏览器缓存');
            }

            // 检查数据完整性
            const records = this.getRecords();
            const invalidRecords = records.filter(record => 
                !record.date || typeof record.date !== 'string'
            );

            if (invalidRecords.length > 0) {
                health.isHealthy = false;
                health.issues.push(`发现${invalidRecords.length}条无效记录`);
                health.suggestions.push('清理无效数据');
            }

            // 检查存储使用情况
            let totalSize = 0;
            for (let key in localStorage) {
                if (key.startsWith('hoursGuard_')) {
                    totalSize += localStorage[key].length;
                }
            }

            health.stats = {
                recordCount: records.length,
                storageSize: totalSize,
                backupCount: this.getBackups().length,
                lastBackupTime: localStorage.getItem(this.storageKeys.lastBackupTime)
            };

            // 检查存储大小
            if (totalSize > 1024 * 1024) { // 1MB
                health.issues.push('存储使用量过高');
                health.suggestions.push('删除旧备份或导出数据');
            }

        } catch (error) {
            health.isHealthy = false;
            health.issues.push('存储系统异常');
            health.suggestions.push('重启浏览器或清理缓存');
            console.error('Storage health check failed:', error);
        }

        return health;
    }

    // 优化存储
    optimizeStorage() {
        try {
            const results = {
                cleaned: 0,
                optimized: 0,
                errors: []
            };

            // 清理无效记录
            const records = this.getRecords();
            const validRecords = records.filter(record => {
                return record.date && 
                       typeof record.date === 'string' &&
                       /^\d{4}-\d{2}-\d{2}$/.test(record.date);
            });

            if (validRecords.length !== records.length) {
                this.saveRecords(validRecords);
                results.cleaned = records.length - validRecords.length;
            }

            // 清理过期备份
            const backups = this.getBackups();
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - 3); // 保留3个月内的备份

            const validBackups = backups.filter(backup => 
                new Date(backup.timestamp) > cutoffDate
            ).slice(0, this.maxBackups);

            if (validBackups.length !== backups.length) {
                localStorage.setItem(this.storageKeys.backup, JSON.stringify(validBackups));
                results.optimized = backups.length - validBackups.length;
            }

            return results;
        } catch (error) {
            console.error('Storage optimization failed:', error);
            window.errorHandler?.handleError(error, 'Storage Optimization');
            return { cleaned: 0, optimized: 0, errors: [error.message] };
        }
    }

    // 导出数据
    exportData(format = 'json') {
        try {
            const records = this.getRecords();
            const exportData = {
                exportTime: new Date().toISOString(),
                version: '1.0.0',
                recordCount: records.length,
                records: records
            };

            let content, filename, mimeType;

            switch (format.toLowerCase()) {
                case 'json':
                    content = JSON.stringify(exportData, null, 2);
                    filename = `hours-guard-data-${new Date().toISOString().split('T')[0]}.json`;
                    mimeType = 'application/json';
                    break;

                case 'csv':
                    content = this.convertToCSV(records);
                    filename = `hours-guard-data-${new Date().toISOString().split('T')[0]}.csv`;
                    mimeType = 'text/csv';
                    break;

                default:
                    throw new Error('不支持的导出格式');
            }

            // 创建下载
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return { success: true, filename, recordCount: records.length };
        } catch (error) {
            console.error('Export failed:', error);
            window.errorHandler?.handleError(error, 'Storage Export');
            return { success: false, error: error.message };
        }
    }

    // 导入数据
    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    let importedRecords;

                    if (file.name.endsWith('.json')) {
                        const data = JSON.parse(content);
                        importedRecords = data.records || data;
                    } else if (file.name.endsWith('.csv')) {
                        importedRecords = this.parseCSV(content);
                    } else {
                        throw new Error('不支持的文件格式');
                    }

                    // 验证数据格式
                    if (!Array.isArray(importedRecords)) {
                        throw new Error('数据格式无效');
                    }

                    // 创建当前数据备份
                    this.createBackup('导入前备份');

                    // 合并数据（避免重复）
                    const existingRecords = this.getRecords();
                    const mergedRecords = this.mergeRecords(existingRecords, importedRecords);

                    // 保存合并后的数据
                    if (this.saveRecords(mergedRecords)) {
                        resolve({
                            success: true,
                            imported: importedRecords.length,
                            total: mergedRecords.length,
                            duplicates: existingRecords.length + importedRecords.length - mergedRecords.length
                        });
                    } else {
                        throw new Error('保存导入数据失败');
                    }
                } catch (error) {
                    console.error('Import failed:', error);
                    window.errorHandler?.handleError(error, 'Storage Import');
                    reject({ success: false, error: error.message });
                }
            };

            reader.onerror = () => {
                reject({ success: false, error: '文件读取失败' });
            };

            reader.readAsText(file);
        });
    }

    // 转换为CSV格式
    convertToCSV(records) {
        const headers = ['日期', '上班时间', '下班时间', '工作时长'];
        const rows = [headers.join(',')];

        records.forEach(record => {
            const duration = record.on && record.off ? 
                this.calculateDuration(record.on, record.off) : '';
            
            const row = [
                record.date,
                record.on || '',
                record.off || '',
                duration
            ];
            rows.push(row.join(','));
        });

        return rows.join('\n');
    }

    // 解析CSV格式
    parseCSV(content) {
        const lines = content.split('\n');
        const records = [];

        // 跳过标题行
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const [date, on, off] = line.split(',');
            if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                const record = { date };
                if (on) record.on = on;
                if (off) record.off = off;
                records.push(record);
            }
        }

        return records;
    }

    // 合并记录（去重）
    mergeRecords(existing, imported) {
        const merged = [...existing];
        const existingDates = new Set(existing.map(r => r.date));

        imported.forEach(record => {
            if (!existingDates.has(record.date)) {
                merged.push(record);
                existingDates.add(record.date);
            }
        });

        // 按日期排序
        return merged.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // 计算工作时长
    calculateDuration(startTime, endTime) {
        try {
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            
            let diffMinutes = endMinutes - startMinutes;
            if (diffMinutes < 0) {
                diffMinutes += 24 * 60; // 跨日处理
            }
            
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;
            
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } catch (error) {
            return '00:00';
        }
    }

    // 清理所有数据
    clearAllData() {
        try {
            // 创建最终备份
            this.createBackup('清理前最终备份');

            // 清理主要数据
            Object.values(this.storageKeys).forEach(key => {
                localStorage.removeItem(key);
            });

            return { success: true };
        } catch (error) {
            console.error('Clear all data failed:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取存储统计信息
    getStorageStats() {
        try {
            const records = this.getRecords();
            const backups = this.getBackups();
            
            let totalSize = 0;
            for (let key in localStorage) {
                if (key.startsWith('hoursGuard_')) {
                    totalSize += localStorage[key].length;
                }
            }

            return {
                recordCount: records.length,
                backupCount: backups.length,
                totalSize: totalSize,
                lastBackupTime: localStorage.getItem(this.storageKeys.lastBackupTime),
                oldestRecord: records.length > 0 ? records[0].date : null,
                newestRecord: records.length > 0 ? records[records.length - 1].date : null
            };
        } catch (error) {
            console.error('Get storage stats failed:', error);
            return null;
        }
    }
}

// 创建全局存储管理器实例
window.storageManager = new StorageManager();