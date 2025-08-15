// 错误处理系统 - 与小程序版功能对等
class ErrorHandler {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1秒
        this.errorLog = [];
        this.init();
    }

    init() {
        // 全局错误监听
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'Global Error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'Unhandled Promise Rejection');
        });
    }

    async handleError(error, context = 'Unknown') {
        const errorInfo = {
            message: error.message || error.toString(),
            stack: error.stack || '',
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // 记录错误日志
        this.logError(errorInfo);

        // 根据错误类型决定处理策略
        const strategy = this.getErrorStrategy(error, context);
        
        switch (strategy.type) {
            case 'retry':
                return await this.retryOperation(strategy.operation, strategy.maxRetries);
            case 'fallback':
                return this.executeFallback(strategy.fallback);
            case 'notify':
                this.showUserFriendlyMessage(strategy.message);
                break;
            case 'silent':
                // 静默处理，只记录日志
                break;
        }

        return { type: 'error', message: errorInfo.message };
    }

    getErrorStrategy(error, context) {
        const errorMessage = error.message || error.toString();

        // 存储相关错误
        if (context.includes('storage') || errorMessage.includes('localStorage')) {
            return {
                type: 'fallback',
                fallback: () => this.useMemoryStorage()
            };
        }

        // 网络相关错误
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
            return {
                type: 'notify',
                message: '网络连接异常，请检查网络设置'
            };
        }

        // 数据解析错误
        if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
            return {
                type: 'fallback',
                fallback: () => this.resetCorruptedData()
            };
        }

        // 时间计算错误
        if (context.includes('time') || context.includes('duration')) {
            return {
                type: 'fallback',
                fallback: () => ({ hours: 0, minutes: 0 })
            };
        }

        // 默认策略
        return {
            type: 'notify',
            message: '操作失败，请重试'
        };
    }

    async retryOperation(operation, maxRetries = this.maxRetries) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                if (attempt > 1) {
                    this.showUserFriendlyMessage(`操作成功（第${attempt}次尝试）`);
                }
                return result;
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }

        // 所有重试都失败了
        this.showUserFriendlyMessage(`操作失败，已重试${maxRetries}次`);
        throw lastError;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    logError(errorInfo) {
        // 添加到内存日志
        this.errorLog.push(errorInfo);
        
        // 保持日志数量在合理范围内
        if (this.errorLog.length > 100) {
            this.errorLog = this.errorLog.slice(-50);
        }

        // 尝试持久化到localStorage
        try {
            const existingLogs = JSON.parse(localStorage.getItem('hoursGuard_errorLog') || '[]');
            existingLogs.push(errorInfo);
            
            // 只保留最近50条错误日志
            const recentLogs = existingLogs.slice(-50);
            localStorage.setItem('hoursGuard_errorLog', JSON.stringify(recentLogs));
        } catch (e) {
            // 如果localStorage也有问题，只能记录到控制台
            console.error('Failed to save error log:', e);
        }

        // 开发环境下输出到控制台
        if (this.isDevelopment()) {
            console.error(`[${errorInfo.context}]`, errorInfo);
        }
    }

    useMemoryStorage() {
        // 当localStorage不可用时的内存存储方案
        if (!window.memoryStorage) {
            window.memoryStorage = new Map();
        }
        
        return {
            getItem: (key) => window.memoryStorage.get(key) || null,
            setItem: (key, value) => window.memoryStorage.set(key, value),
            removeItem: (key) => window.memoryStorage.delete(key),
            clear: () => window.memoryStorage.clear()
        };
    }

    resetCorruptedData() {
        try {
            // 备份当前数据
            const corruptedData = localStorage.getItem('hoursGuard_records');
            if (corruptedData) {
                localStorage.setItem('hoursGuard_records_corrupted_backup', corruptedData);
            }
            
            // 重置为空数组
            localStorage.setItem('hoursGuard_records', '[]');
            
            this.showUserFriendlyMessage('数据已重置，已备份损坏的数据');
            return [];
        } catch (e) {
            return [];
        }
    }

    showUserFriendlyMessage(message, type = 'error') {
        // 创建用户友好的通知
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1001',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            opacity: '0',
            transition: 'opacity 0.3s ease',
            maxWidth: '90%',
            textAlign: 'center'
        });

        // 根据类型设置背景色
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
                break;
            case 'warning':
                notification.style.background = 'linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%)';
                break;
            case 'error':
            default:
                notification.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                break;
        }

        document.body.appendChild(notification);

        // 动画显示
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);

        // 自动移除
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 系统诊断功能
    async systemDiagnosis() {
        const diagnosis = {
            timestamp: new Date().toISOString(),
            systemInfo: this.getSystemInfo(),
            storageInfo: this.getStorageInfo(),
            networkInfo: await this.getNetworkInfo(),
            errorStats: this.getErrorStats(),
            issues: [],
            suggestions: []
        };

        // 检查存储健康状态
        if (diagnosis.storageInfo.available < 1024 * 1024) { // 小于1MB
            diagnosis.issues.push('存储空间不足');
            diagnosis.suggestions.push('清理浏览器缓存或删除不必要的数据');
        }

        // 检查错误频率
        const recentErrors = this.errorLog.filter(log => 
            new Date() - new Date(log.timestamp) < 24 * 60 * 60 * 1000 // 24小时内
        );
        
        if (recentErrors.length > 10) {
            diagnosis.issues.push('错误频率过高');
            diagnosis.suggestions.push('请刷新页面或重启浏览器');
        }

        // 检查浏览器兼容性
        if (!this.checkBrowserCompatibility()) {
            diagnosis.issues.push('浏览器版本过旧');
            diagnosis.suggestions.push('请更新到最新版本的浏览器');
        }

        return diagnosis;
    }

    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }

    getStorageInfo() {
        try {
            // 估算localStorage使用情况
            let used = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    used += localStorage[key].length + key.length;
                }
            }

            return {
                used: used,
                available: 5 * 1024 * 1024 - used, // 假设5MB限制
                supported: typeof Storage !== 'undefined'
            };
        } catch (e) {
            return {
                used: 0,
                available: 0,
                supported: false,
                error: e.message
            };
        }
    }

    async getNetworkInfo() {
        return {
            onLine: navigator.onLine,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }

    getErrorStats() {
        const now = new Date();
        const last24h = this.errorLog.filter(log => 
            now - new Date(log.timestamp) < 24 * 60 * 60 * 1000
        );
        
        const errorTypes = {};
        last24h.forEach(log => {
            errorTypes[log.context] = (errorTypes[log.context] || 0) + 1;
        });

        return {
            total: this.errorLog.length,
            last24h: last24h.length,
            types: errorTypes
        };
    }

    checkBrowserCompatibility() {
        // 检查关键API支持
        const requiredFeatures = [
            'localStorage' in window,
            'JSON' in window,
            'Promise' in window,
            'fetch' in window || 'XMLHttpRequest' in window
        ];

        return requiredFeatures.every(feature => feature);
    }

    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    }

    // 获取错误日志
    getErrorLog() {
        return this.errorLog.slice(); // 返回副本
    }

    // 清除错误日志
    clearErrorLog() {
        this.errorLog = [];
        try {
            localStorage.removeItem('hoursGuard_errorLog');
        } catch (e) {
            console.warn('Failed to clear error log from localStorage:', e);
        }
    }

    // 导出错误日志
    exportErrorLog() {
        const logs = this.getErrorLog();
        const data = JSON.stringify(logs, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `hours-guard-error-log-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 创建全局错误处理器实例
window.errorHandler = new ErrorHandler();