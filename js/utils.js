// 工具函数模块
class Utils {
    constructor() {
        // 工具类，不需要初始化
    }

    // 防抖函数
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 格式化时间
    static formatTime(date, format = 'HH:mm:ss') {
        if (!date || !(date instanceof Date)) return '';
        
        const pad = (num) => num.toString().padStart(2, '0');
        
        const replacements = {
            'YYYY': date.getFullYear(),
            'MM': pad(date.getMonth() + 1),
            'DD': pad(date.getDate()),
            'HH': pad(date.getHours()),
            'mm': pad(date.getMinutes()),
            'ss': pad(date.getSeconds())
        };

        let formatted = format;
        Object.keys(replacements).forEach(key => {
            formatted = formatted.replace(key, replacements[key]);
        });

        return formatted;
    }

    // 解析时间字符串
    static parseTime(timeString) {
        if (!timeString) return null;
        
        const parts = timeString.split(':');
        if (parts.length < 2) return null;
        
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
        
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
        
        return { hours, minutes, seconds };
    }

    // 计算时间差
    static calculateTimeDiff(start, end) {
        if (!start || !end) return null;
        
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
        
        const diffMs = endDate - startDate;
        
        if (diffMs < 0) return null;
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        return {
            hours,
            minutes,
            seconds,
            totalMinutes: Math.floor(diffMs / (1000 * 60)),
            totalSeconds: Math.floor(diffMs / 1000)
        };
    }

    // 格式化时间差
    static formatDuration(hours, minutes, seconds = 0) {
        const pad = (num) => num.toString().padStart(2, '0');
        
        if (hours !== undefined && minutes !== undefined) {
            return `${pad(hours)}:${pad(minutes)}${seconds > 0 ? `:${pad(seconds)}` : ''}`;
        }
        
        return '';
    }

    // 获取今天的日期字符串
    static getTodayDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    // 获取当前时间字符串
    static getCurrentTime() {
        const now = new Date();
        return this.formatTime(now, 'HH:mm:ss');
    }

    // 判断是否为工作日
    static isWorkday(date) {
        if (!date) date = new Date();
        if (!(date instanceof Date)) date = new Date(date);
        
        const day = date.getDay();
        return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
    }

    // 获取月份的天数
    static getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    // 深拷贝对象
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    }

    // 生成唯一ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 验证数据格式
    static validateRecord(record) {
        if (!record || typeof record !== 'object') return false;
        
        const requiredFields = ['id', 'date'];
        for (const field of requiredFields) {
            if (!record[field]) return false;
        }
        
        // 验证日期格式
        if (!this.isValidDate(record.date)) return false;
        
        // 验证时间格式
        if (record.clockIn && !this.isValidTime(record.clockIn)) return false;
        if (record.clockOut && !this.isValidTime(record.clockOut)) return false;
        
        return true;
    }

    // 验证日期格式
    static isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }

    // 验证时间格式
    static isValidTime(timeString) {
        const date = new Date(timeString);
        return date instanceof Date && !isNaN(date.getTime());
    }

    // 本地存储操作
    static setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('LocalStorage set error:', error);
            return false;
        }
    }

    static getLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('LocalStorage get error:', error);
            return defaultValue;
        }
    }

    static removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('LocalStorage remove error:', error);
            return false;
        }
    }

    // 会话存储操作
    static setSessionStorage(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('SessionStorage set error:', error);
            return false;
        }
    }

    static getSessionStorage(key, defaultValue = null) {
        try {
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('SessionStorage get error:', error);
            return defaultValue;
        }
    }

    // 颜色操作
    static generateRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // 文件操作
    static downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    static readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsText(file);
        });
    }

    // 网络检测
    static isOnline() {
        return navigator.onLine;
    }

    static getConnectionInfo() {
        if ('connection' in navigator) {
            return {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            };
        }
        return null;
    }

    // 设备检测
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    static isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    }

    static isAndroid() {
        return /Android/.test(navigator.userAgent);
    }

    // 浏览器检测
    static getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';

        if (ua.indexOf('Chrome') > -1) {
            browser = 'Chrome';
            version = ua.match(/Chrome\/(\d+)/)[1];
        } else if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
            version = ua.match(/Firefox\/(\d+)/)[1];
        } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
            browser = 'Safari';
            version = ua.match(/Version\/(\d+)/)[1];
        } else if (ua.indexOf('Edge') > -1) {
            browser = 'Edge';
            version = ua.match(/Edge\/(\d+)/)[1];
        }

        return { browser, version, userAgent: ua };
    }

    // 性能监控
    static measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`${name} took ${(end - start).toFixed(2)} milliseconds`);
        return { result, duration: end - start };
    }

    // 错误处理
    static handleError(error, context = '') {
        console.error(`Error${context ? ` in ${context}` : ''}:`, error);
        
        // 可以在这里添加错误上报逻辑
        if (window.app && window.app.showNotification) {
            window.app.showNotification('操作失败，请重试', 'error');
        }
    }

    // 数据转换
    static recordsToCSV(records) {
        if (!records || records.length === 0) return '';

        const headers = ['ID', '日期', '上班时间', '下班时间', '工作时长', '创建时间'];
        const rows = [headers.join(',')];

        records.forEach(record => {
            const row = [
                record.id,
                record.date,
                record.clockIn || '',
                record.clockOut || '',
                record.duration || '',
                record.createdAt || ''
            ];
            rows.push(row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
        });

        return rows.join('\n');
    }

    // 随机字符串生成
    static randomString(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 等待函数
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 获取当前时间戳
    static timestamp() {
        return Date.now();
    }

    // 格式化文件大小
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 创建工具类实例
window.Utils = Utils;