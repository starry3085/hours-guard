// 主应用逻辑
class HoursGuardApp {
    constructor() {
        this.currentState = 'ready'; // ready, clockedIn, clockedOut
        this.currentRecord = null;
        this.isUpdating = false;
        
        this.init();
    }

    async init() {
        await this.loadTranslations();
        this.bindEvents();
        this.startClock();
        this.loadTodayData();
        this.loadHistoryData();
        this.loadMonthlyData();
        
        // 初始化PWA提示
        this.initPWAInstallPrompt();
    }

    async loadTranslations() {
        // 等待i18n.js加载完成
        if (typeof i18n === 'undefined') {
            await new Promise(resolve => {
                const checkI18n = () => {
                    if (typeof i18n !== 'undefined') {
                        resolve();
                    } else {
                        setTimeout(checkI18n, 100);
                    }
                };
                checkI18n();
            });
        }
        
        // 应用翻译
        this.applyTranslations();
    }

    applyTranslations() {
        // 翻译UI元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = i18n.t(key);
            if (translation) {
                if (element.tagName === 'INPUT') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });
    }

    bindEvents() {
        // 打卡按钮
        document.getElementById('clockInBtn').addEventListener('click', () => this.handleClockIn());
        document.getElementById('clockOutBtn').addEventListener('click', () => this.handleClockOut());

        // 导出按钮
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        document.getElementById('exportCSV').addEventListener('click', () => this.exportData('csv'));
        document.getElementById('exportImage').addEventListener('click', () => this.exportData('image'));

        // 语言切换
        document.getElementById('langToggle').addEventListener('click', () => this.toggleLanguage());

        // 历史记录切换
        document.getElementById('toggleHistory').addEventListener('click', () => this.toggleHistory());

        // 月份导航
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));

        // 模态框关闭
        document.querySelector('.close').addEventListener('click', () => this.closeExportModal());
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('exportModal')) {
                this.closeExportModal();
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'e':
                        e.preventDefault();
                        this.showExportModal();
                        break;
                    case 'i':
                        e.preventDefault();
                        if (this.currentState === 'ready') {
                            this.handleClockIn();
                        }
                        break;
                    case 'o':
                        e.preventDefault();
                        if (this.currentState === 'clockedIn') {
                            this.handleClockOut();
                        }
                        break;
                }
            }
        });
    }

    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('zh-CN', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            document.getElementById('currentTime').textContent = timeString;
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    async handleClockIn() {
        if (this.currentState !== 'ready') return;

        try {
            const now = new Date();
            const record = {
                id: Date.now().toString(),
                date: now.toISOString().split('T')[0],
                clockIn: now.toISOString(),
                clockOut: null,
                duration: null,
                createdAt: now.toISOString()
            };

            await Storage.saveRecord(record);
            this.currentRecord = record;
            this.currentState = 'clockedIn';
            
            this.updateUI();
            this.showNotification('上班打卡成功！', 'success');
            
        } catch (error) {
            console.error('Clock in error:', error);
            this.showNotification('打卡失败，请重试', 'error');
        }
    }

    async handleClockOut() {
        if (this.currentState !== 'clockedIn' || !this.currentRecord) return;

        try {
            const now = new Date();
            this.currentRecord.clockOut = now.toISOString();
            this.currentRecord.duration = this.calculateDuration(
                this.currentRecord.clockIn, 
                this.currentRecord.clockOut
            );

            await Storage.updateRecord(this.currentRecord);
            this.currentState = 'clockedOut';
            
            this.updateUI();
            this.loadHistoryData();
            this.loadMonthlyData();
            this.showNotification('下班打卡成功！', 'success');
            
            // 重置状态
            setTimeout(() => {
                this.currentState = 'ready';
                this.currentRecord = null;
                this.updateUI();
            }, 3000);
            
        } catch (error) {
            console.error('Clock out error:', error);
            this.showNotification('打卡失败，请重试', 'error');
        }
    }

    calculateDuration(start, end) {
        const startTime = new Date(start);
        const endTime = new Date(end);
        const diffMs = endTime - startTime;
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    async loadTodayData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const records = await Storage.getRecordsByDate(today);
            
            if (records.length > 0) {
                const latestRecord = records[records.length - 1];
                if (!latestRecord.clockOut) {
                    this.currentRecord = latestRecord;
                    this.currentState = 'clockedIn';
                }
            }
            
            this.updateTodayStats(records);
            this.updateUI();
            
        } catch (error) {
            console.error('Load today data error:', error);
        }
    }

    updateTodayStats(records) {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = records.filter(r => r.date === today);
        
        if (todayRecords.length > 0) {
            const latestRecord = todayRecords[todayRecords.length - 1];
            
            document.getElementById('clockInTime').textContent = 
                latestRecord.clockIn ? new Date(latestRecord.clockIn).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--';
            
            document.getElementById('clockOutTime').textContent = 
                latestRecord.clockOut ? new Date(latestRecord.clockOut).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--';
            
            document.getElementById('workDuration').textContent = 
                latestRecord.duration || '--:--';
        }
    }

    async loadHistoryData() {
        try {
            const records = await Storage.getAllRecords();
            const historyList = document.getElementById('historyList');
            
            if (records.length === 0) {
                historyList.innerHTML = `<p data-i18n="no.data">暂无记录</p>`;
                return;
            }

            // 按日期倒序排序
            const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            historyList.innerHTML = '';
            sortedRecords.forEach(record => {
                const item = this.createHistoryItem(record);
                historyList.appendChild(item);
            });
        } catch (error) {
            console.error('Load history error:', error);
        }
    }

    createHistoryItem(record) {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const date = new Date(record.date);
        const clockInTime = record.clockIn ? new Date(record.clockIn) : null;
        const clockOutTime = record.clockOut ? new Date(record.clockOut) : null;
        
        const dateStr = date.toLocaleDateString();
        const clockInStr = clockInTime ? clockInTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
        const clockOutStr = clockOutTime ? clockOutTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
        const duration = record.duration || '--:--';

        div.innerHTML = `
            <div class="history-date">${dateStr}</div>
            <div class="history-times">
                <span>⏰ ${clockInStr}</span>
                <span>🏠 ${clockOutStr}</span>
                <span>⏱️ ${duration}</span>
            </div>
        `;

        return div;
    }

    async loadMonthlyData() {
        try {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
            
            const records = await Storage.getRecordsByRange(startDate, endDate);
            const completedRecords = records.filter(r => r.clockIn && r.clockOut);
            
            // 更新月份显示
            const monthNames = {
                'zh-CN': ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
                'en-US': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
            };
            
            const currentLang = i18n.currentLang;
            const monthName = monthNames[currentLang][month];
            document.getElementById('currentMonth').textContent = `${year}年${monthName}`;
            
            // 计算统计数据
            const totalDays = completedRecords.length;
            const totalMinutes = completedRecords.reduce((total, record) => {
                if (record.clockIn && record.clockOut) {
                    const durationMs = new Date(record.clockOut) - new Date(record.clockIn);
                    return total + Math.round(durationMs / (1000 * 60));
                }
                return total;
            }, 0);
            
            const avgMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
            const totalHours = Math.floor(totalMinutes / 60);
            const totalMins = totalMinutes % 60;
            const avgHours = Math.floor(avgMinutes / 60);
            const avgMins = avgMinutes % 60;
            
            // 更新UI
            const monthSummary = document.getElementById('monthSummary');
            monthSummary.innerHTML = `
                <div class="summary-item">
                    <span data-i18n="work.days">工作天数</span>: ${totalDays}
                </div>
                <div class="summary-item">
                    <span data-i18n="total.duration">本月总时长</span>: ${totalHours}h ${totalMins}m
                </div>
                <div class="summary-item">
                    <span data-i18n="average.duration">平均工作时长</span>: ${avgHours}h ${avgMins}m
                </div>
            `;
        } catch (error) {
            console.error('Load monthly data error:', error);
        }
    }

    toggleHistory() {
        const historyList = document.getElementById('historyList');
        const toggleBtn = document.getElementById('toggleHistory');
        
        if (historyList.style.display === 'none') {
            historyList.style.display = 'block';
            this.loadHistoryData();
        } else {
            historyList.style.display = 'none';
        }
    }

    changeMonth(direction) {
        // 这里可以实现月份切换功能
        // 由于当前是单页面应用，可以添加月份状态管理
        console.log('Month change:', direction);
    }

    updateUI() {
        const clockInBtn = document.getElementById('clockInBtn');
        const clockOutBtn = document.getElementById('clockOutBtn');
        const statusDisplay = document.getElementById('statusDisplay');

        switch (this.currentState) {
            case 'ready':
                clockInBtn.disabled = false;
                clockOutBtn.disabled = true;
                statusDisplay.textContent = '准备就绪';
                break;
            case 'clockedIn':
                clockInBtn.disabled = true;
                clockOutBtn.disabled = false;
                statusDisplay.textContent = '工作中...';
                break;
            case 'clockedOut':
                clockInBtn.disabled = true;
                clockOutBtn.disabled = true;
                statusDisplay.textContent = '今日工作已完成';
                break;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return '今天';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return '昨天';
        } else {
            return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        }
    }

    showExportModal() {
        document.getElementById('exportModal').style.display = 'block';
    }

    closeExportModal() {
        document.getElementById('exportModal').style.display = 'none';
    }

    async exportData(format) {
        try {
            const records = await Storage.getAllRecords();
            
            if (format === 'csv') {
                await exportManager.exportToCSV(records);
            } else if (format === 'image') {
                await exportManager.exportToImage(records);
            }
            
            this.closeExportModal();
            this.showNotification('导出成功！', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('导出失败，请重试', 'error');
        }
    }

    toggleLanguage() {
        if (typeof i18n !== 'undefined') {
            i18n.toggleLanguage();
            this.applyTranslations();
        }
    }

    toggleHistory() {
        const historyList = document.getElementById('historyList');
        historyList.classList.toggle('hidden');
    }

    changeMonth(direction) {
        // 实现月份切换逻辑
        console.log('Month change:', direction);
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1001',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        // 根据类型设置背景色
        const colors = {
            success: '#34C759',
            error: '#FF3B30',
            warning: '#FF9500',
            info: '#007AFF'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // 动画显示
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自动移除
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    initPWAInstallPrompt() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // 显示安装提示
            this.showInstallPrompt(deferredPrompt);
        });

        window.addEventListener('appinstalled', () => {
            this.showNotification('应用已成功安装！', 'success');
        });
    }

    showInstallPrompt(deferredPrompt) {
        const installBanner = document.createElement('div');
        installBanner.innerHTML = `
            <div style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--surface); padding: 1rem 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); display: flex; align-items: center; gap: 1rem; z-index: 1001;">
                <span>将工时卫士安装到桌面</span>
                <button id="installBtn" class="btn-primary" style="margin: 0;">安装</button>
                <button id="dismissInstall" class="btn-text" style="margin: 0;">稍后</button>
            </div>
        `;

        document.body.appendChild(installBanner);

        installBanner.querySelector('#installBtn').addEventListener('click', async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            installBanner.remove();
        });

        installBanner.querySelector('#dismissInstall').addEventListener('click', () => {
            installBanner.remove();
        });

        // 自动移除
        setTimeout(() => {
            if (installBanner.parentNode) {
                installBanner.remove();
            }
        }, 10000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new HoursGuardApp();
});

class HoursGuardApp {
    constructor() {
        this.storage = new StorageManager();
        this.exportManager = new ExportManager();
        this.currentTime = null;
        this.todayRecord = null;
        this.historyRecords = [];
        this.monthlyData = [];
        this.currentMonth = new Date().toISOString().slice(0, 7);
        
        this.init();
    }

    async init() {
        await this.storage.init();
        this.setupEventListeners();
        this.startClock();
        await this.loadData();
        this.updateUI();
        
        // 初始化国际化
        if (window.i18n) {
            window.i18n.updateUI();
        }
    }

    setupEventListeners() {
        // 打卡按钮
        document.getElementById('clockInBtn')?.addEventListener('click', () => this.clockIn());
        document.getElementById('clockOutBtn')?.addEventListener('click', () => this.clockOut());

        // 语言切换
        document.getElementById('languageToggle')?.addEventListener('click', () => this.toggleLanguage());

        // 导出功能
        document.getElementById('exportBtn')?.addEventListener('click', () => this.showExportModal());
        document.getElementById('exportCsvBtn')?.addEventListener('click', () => this.exportToCsv());
        document.getElementById('exportImageBtn')?.addEventListener('click', () => this.exportToImage());
        document.getElementById('closeExportModal')?.addEventListener('click', () => this.hideExportModal());

        // 月份选择
        document.getElementById('monthSelect')?.addEventListener('change', (e) => {
            this.currentMonth = e.target.value;
            this.loadMonthlyData();
        });

        // 点击模态框外部关闭
        document.getElementById('exportModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'exportModal') {
                this.hideExportModal();
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'i':
                        e.preventDefault();
                        this.clockIn();
                        break;
                    case 'o':
                        e.preventDefault();
                        this.clockOut();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.showExportModal();
                        break;
                }
            }
        });

        // 监听语言切换
        window.addEventListener('languageChanged', () => {
            this.updateUI();
        });
    }

    startClock() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    updateClock() {
        this.currentTime = new Date();
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = this.currentTime.toLocaleTimeString();
        }
    }

    async loadData() {
        try {
            const today = new Date().toISOString().slice(0, 10);
            this.todayRecord = await this.storage.getTodayRecord(today);
            this.historyRecords = await this.storage.getHistoryRecords(30);
            await this.loadMonthlyData();
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showNotification(window.i18n?.t('error.storage') || 'Data loading error', 'error');
        }
    }

    async loadMonthlyData() {
        try {
            this.monthlyData = await this.storage.getMonthlyRecords(this.currentMonth);
            this.updateMonthlyStats();
        } catch (error) {
            console.error('Failed to load monthly data:', error);
        }
    }

    updateUI() {
        this.updateTodayStats();
        this.updateClockButtons();
        this.updateHistoryList();
        this.updateMonthlyStats();
    }

    updateClockButtons() {
        const clockInBtn = document.getElementById('clockInBtn');
        const clockOutBtn = document.getElementById('clockOutBtn');
        const statusDisplay = document.getElementById('statusDisplay');

        if (!clockInBtn || !clockOutBtn || !statusDisplay) return;

        if (!this.todayRecord) {
            clockInBtn.disabled = false;
            clockOutBtn.disabled = true;
            statusDisplay.textContent = window.i18n?.t('status.ready') || 'Ready';
            statusDisplay.className = 'status-display status-ready';
        } else if (!this.todayRecord.endTime) {
            clockInBtn.disabled = true;
            clockOutBtn.disabled = false;
            statusDisplay.textContent = window.i18n?.t('status.working') || 'Working';
            statusDisplay.className = 'status-display status-working';
        } else {
            clockInBtn.disabled = true;
            clockOutBtn.disabled = true;
            statusDisplay.textContent = window.i18n?.t('status.finished') || 'Finished';
            statusDisplay.className = 'status-display status-finished';
        }
    }

    async clockIn() {
        if (!confirm(window.i18n?.t('clock.confirmIn') || 'Confirm clock in?')) return;

        try {
            const record = {
                date: new Date().toISOString().slice(0, 10),
                startTime: new Date().toISOString(),
                endTime: null,
                duration: 0
            };

            await this.storage.addRecord(record);
            this.todayRecord = record;
            this.updateUI();
            this.showNotification(window.i18n?.t('clock.in') + ' ' + window.i18n?.t('notification.success') || 'Clock in successful');
        } catch (error) {
            console.error('Failed to clock in:', error);
            this.showNotification(window.i18n?.t('error.storage') || 'Clock in failed', 'error');
        }
    }

    async clockOut() {
        if (!this.todayRecord || this.todayRecord.endTime) return;
        if (!confirm(window.i18n?.t('clock.confirmOut') || 'Confirm clock out?')) return;

        try {
            const endTime = new Date().toISOString();
            const duration = new Date(endTime) - new Date(this.todayRecord.startTime);
            
            this.todayRecord.endTime = endTime;
            this.todayRecord.duration = duration;

            await this.storage.updateRecord(this.todayRecord);
            this.updateUI();
            this.showNotification(window.i18n?.t('clock.out') + ' ' + window.i18n?.t('notification.success') || 'Clock out successful');
        } catch (error) {
            console.error('Failed to clock out:', error);
            this.showNotification(window.i18n?.t('error.storage') || 'Clock out failed', 'error');
        }
    }

    updateTodayStats() {
        const startTimeEl = document.getElementById('todayStartTime');
        const endTimeEl = document.getElementById('todayEndTime');
        const durationEl = document.getElementById('todayDuration');

        if (!this.todayRecord) {
            if (startTimeEl) startTimeEl.textContent = window.i18n?.t('today.noRecord') || 'No records';
            if (endTimeEl) endTimeEl.textContent = window.i18n?.t('today.noRecord') || 'No records';
            if (durationEl) durationEl.textContent = window.i18n?.t('today.noRecord') || 'No records';
            return;
        }

        if (startTimeEl) {
            startTimeEl.textContent = new Date(this.todayRecord.startTime).toLocaleTimeString();
        }
        if (endTimeEl) {
            endTimeEl.textContent = this.todayRecord.endTime ? 
                new Date(this.todayRecord.endTime).toLocaleTimeString() : 
                window.i18n?.t('status.working') || 'Working';
        }
        if (durationEl) {
            const duration = this.todayRecord.endTime ? this.todayRecord.duration : 
                (new Date() - new Date(this.todayRecord.startTime));
            durationEl.textContent = this.formatDuration(duration);
        }
    }

    updateHistoryList() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        if (this.historyRecords.length === 0) {
            historyList.innerHTML = `<div class="history-empty">${window.i18n?.t('history.noData') || 'No history records'}</div>`;
            return;
        }

        historyList.innerHTML = this.historyRecords.map(record => this.createHistoryItem(record)).join('');
    }

    createHistoryItem(record) {
        const date = new Date(record.date);
        const startTime = new Date(record.startTime);
        const endTime = record.endTime ? new Date(record.endTime) : null;
        const duration = record.endTime ? record.duration : 0;

        return `
            <div class="history-item" data-id="${record.id}">
                <div class="history-summary">
                    <div class="history-date">
                        ${window.i18n?.formatTime ? window.i18n.formatTime(date, 'time.shortFormat') : date.toLocaleDateString()}
                        <span class="history-weekday">${window.i18n?.getWeekday ? window.i18n.getWeekday(date) : ''}</span>
                    </div>
                    <div class="history-times">
                        <span>${startTime.toLocaleTimeString()}</span>
                        ${endTime ? `<span> - ${endTime.toLocaleTimeString()}</span>` : ''}
                    </div>
                    <div class="history-duration">
                        ${record.endTime ? this.formatDuration(duration) : window.i18n?.t('status.working') || 'Working'}
                    </div>
                    <button class="btn-icon history-toggle" onclick="app.toggleHistory(${record.id})" title="${window.i18n?.t('history.expand') || 'Expand'}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="history-details" id="history-details-${record.id}" style="display: none;">
                    <div class="history-detail-item">
                        <strong>${window.i18n?.t('history.date') || 'Date'}:</strong>
                        ${window.i18n?.formatTime ? window.i18n.formatTime(date) : date.toLocaleDateString()}
                    </div>
                    <div class="history-detail-item">
                        <strong>${window.i18n?.t('history.start') || 'Start'}:</strong>
                        ${startTime.toLocaleTimeString()}
                    </div>
                    ${endTime ? `
                        <div class="history-detail-item">
                            <strong>${window.i18n?.t('history.end') || 'End'}:</strong>
                            ${endTime.toLocaleTimeString()}
                        </div>
                        <div class="history-detail-item">
                            <strong>${window.i18n?.t('history.duration') || 'Duration'}:</strong>
                            ${this.formatDuration(duration)}
                        </div>
                    ` : ''}
                    <button class="btn-danger" onclick="app.deleteRecord(${record.id})">
                        ${window.i18n?.t('history.delete') || 'Delete'}
                    </button>
                </div>
            </div>
        `;
    }

    toggleHistory(id) {
        const details = document.getElementById(`history-details-${id}`);
        const button = document.querySelector(`[onclick="app.toggleHistory(${id})"]`);
        
        if (details && button) {
            const isVisible = details.style.display !== 'none';
            details.style.display = isVisible ? 'none' : 'block';
            
            const svg = button.querySelector('svg');
            if (svg) {
                svg.style.transform = isVisible ? '' : 'rotate(180deg)';
            }
            
            button.title = isVisible ? 
                (window.i18n?.t('history.expand') || 'Expand') : 
                (window.i18n?.t('history.collapse') || 'Collapse');
        }
    }

    async deleteRecord(id) {
        if (!confirm(window.i18n?.t('history.deleteConfirm') || 'Confirm delete this record?')) return;

        try {
            await this.storage.deleteRecord(id);
            await this.loadData();
            this.updateUI();
            this.showNotification(window.i18n?.t('notification.success') || 'Record deleted successfully');
        } catch (error) {
            console.error('Failed to delete record:', error);
            this.showNotification(window.i18n?.t('error.storage') || 'Delete failed', 'error');
        }
    }

    updateMonthlyStats() {
        const workDaysEl = document.getElementById('monthlyWorkDays');
        const totalHoursEl = document.getElementById('monthlyTotalHours');
        const avgHoursEl = document.getElementById('monthlyAvgHours');
        const overtimeDaysEl = document.getElementById('monthlyOvertimeDays');

        if (this.monthlyData.length === 0) {
            [workDaysEl, totalHoursEl, avgHoursEl, overtimeDaysEl].forEach(el => {
                if (el) el.textContent = window.i18n?.t('monthly.noData') || 'No data';
            });
            return;
        }

        const workDays = this.monthlyData.filter(r => r.endTime).length;
        const totalHours = this.monthlyData
            .filter(r => r.endTime)
            .reduce((sum, r) => sum + r.duration, 0) / (1000 * 60 * 60);
        const avgHours = workDays > 0 ? totalHours / workDays : 0;
        const overtimeDays = this.monthlyData.filter(r => r.endTime && r.duration > 8 * 60 * 60 * 1000).length;

        if (workDaysEl) workDaysEl.textContent = workDays;
        if (totalHoursEl) totalHoursEl.textContent = totalHours.toFixed(1);
        if (avgHoursEl) avgHoursEl.textContent = avgHours.toFixed(1);
        if (overtimeDaysEl) overtimeDaysEl.textContent = overtimeDays;
    }

    formatDuration(ms) {
        const totalMinutes = Math.floor(ms / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0) {
            return `${hours}${window.i18n?.t('time.hour') || 'h'} ${minutes}${window.i18n?.t('time.minute') || 'm'}`;
        } else {
            return `${minutes}${window.i18n?.t('time.minute') || 'm'}`;
        }
    }

    toggleLanguage() {
        const newLang = window.i18n?.currentLang === 'zh' ? 'en' : 'zh';
        window.i18n?.setLanguage(newLang);
        this.updateUI();
    }

    showExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
        }
    }

    hideExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    }

    async exportToCsv() {
        try {
            const records = await this.storage.getAllRecords();
            await this.exportManager.exportToCsv(records);
            this.hideExportModal();
            this.showNotification(window.i18n?.t('export.success') || 'Export successful');
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification(window.i18n?.t('export.error') || 'Export failed', 'error');
        }
    }

    async exportToImage() {
        try {
            await this.exportManager.exportToImage();
            this.hideExportModal();
            this.showNotification(window.i18n?.t('export.success') || 'Export successful');
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification(window.i18n?.t('export.error') || 'Export failed', 'error');
        }
    }

    showNotification(message, type = 'success') {
        // 简单的通知实现
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            ${type === 'success' ? 'background: var(--success)' : 'background: var(--danger)'}
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HoursGuardApp();
});

class HoursGuardApp {
    constructor() {
        this.currentState = 'ready'; // ready, clockedIn, clockedOut
        this.currentRecord = null;
        this.isUpdating = false;
        
        this.init();
    }

    async init() {
        await this.loadTranslations();
        this.bindEvents();
        this.startClock();
        this.loadTodayData();
        this.loadHistoryData();
        this.loadMonthlyData();
        
        // 初始化PWA提示
        this.initPWAInstallPrompt();
    }

    async loadTranslations() {
        // 等待i18n.js加载完成
        if (typeof i18n === 'undefined') {
            await new Promise(resolve => {
                const checkI18n = () => {
                    if (typeof i18n !== 'undefined') {
                        resolve();
                    } else {
                        setTimeout(checkI18n, 100);
                    }
                };
                checkI18n();
            });
        }
        
        // 应用翻译
        this.applyTranslations();
    }

    applyTranslations() {
        // 翻译UI元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = i18n.t(key);
            if (translation) {
                if (element.tagName === 'INPUT') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });
    }

    bindEvents() {
        // 打卡按钮
        document.getElementById('clockInBtn').addEventListener('click', () => this.handleClockIn());
        document.getElementById('clockOutBtn').addEventListener('click', () => this.handleClockOut());

        // 导出按钮
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        document.getElementById('exportCSV').addEventListener('click', () => this.exportData('csv'));
        document.getElementById('exportImage').addEventListener('click', () => this.exportData('image'));

        // 语言切换
        document.getElementById('langToggle').addEventListener('click', () => this.toggleLanguage());

        // 历史记录切换
        document.getElementById('toggleHistory').addEventListener('click', () => this.toggleHistory());

        // 月份导航
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));

        // 模态框关闭
        document.querySelector('.close').addEventListener('click', () => this.closeExportModal());
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('exportModal')) {
                this.closeExportModal();
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'e':
                        e.preventDefault();
                        this.showExportModal();
                        break;
                    case 'i':
                        e.preventDefault();
                        if (this.currentState === 'ready') {
                            this.handleClockIn();
                        }
                        break;
                    case 'o':
                        e.preventDefault();
                        if (this.currentState === 'clockedIn') {
                            this.handleClockOut();
                        }
                        break;
                }
            }
        });
    }

    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('zh-CN', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            document.getElementById('currentTime').textContent = timeString;
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    async handleClockIn() {
        if (this.currentState !== 'ready') return;

        try {
            const now = new Date();
            const record = {
                id: Date.now().toString(),
                date: now.toISOString().split('T')[0],
                clockIn: now.toISOString(),
                clockOut: null,
                duration: null,
                createdAt: now.toISOString()
            };

            await Storage.saveRecord(record);
            this.currentRecord = record;
            this.currentState = 'clockedIn';
            
            this.updateUI();
            this.showNotification('上班打卡成功！', 'success');
            
        } catch (error) {
            console.error('Clock in error:', error);
            this.showNotification('打卡失败，请重试', 'error');
        }
    }

    async handleClockOut() {
        if (this.currentState !== 'clockedIn' || !this.currentRecord) return;

        try {
            const now = new Date();
            this.currentRecord.clockOut = now.toISOString();
            this.currentRecord.duration = this.calculateDuration(
                this.currentRecord.clockIn, 
                this.currentRecord.clockOut
            );

            await Storage.updateRecord(this.currentRecord);
            this.currentState = 'clockedOut';
            
            this.updateUI();
            this.loadHistoryData();
            this.loadMonthlyData();
            this.showNotification('下班打卡成功！', 'success');
            
            // 重置状态
            setTimeout(() => {
                this.currentState = 'ready';
                this.currentRecord = null;
                this.updateUI();
            }, 3000);
            
        } catch (error) {
            console.error('Clock out error:', error);
            this.showNotification('打卡失败，请重试', 'error');
        }
    }

    calculateDuration(start, end) {
        const startTime = new Date(start);
        const endTime = new Date(end);
        const diffMs = endTime - startTime;
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    async loadTodayData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const records = await Storage.getRecordsByDate(today);
            
            if (records.length > 0) {
                const latestRecord = records[records.length - 1];
                if (!latestRecord.clockOut) {
                    this.currentRecord = latestRecord;
                    this.currentState = 'clockedIn';
                }
            }
            
            this.updateTodayStats(records);
            this.updateUI();
            
        } catch (error) {
            console.error('Load today data error:', error);
        }
    }

    updateTodayStats(records) {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = records.filter(r => r.date === today);
        
        if (todayRecords.length > 0) {
            const latestRecord = todayRecords[todayRecords.length - 1];
            
            document.getElementById('clockInTime').textContent = 
                latestRecord.clockIn ? new Date(latestRecord.clockIn).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--';
            
            document.getElementById('clockOutTime').textContent = 
                latestRecord.clockOut ? new Date(latestRecord.clockOut).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--';
            
            document.getElementById('workDuration').textContent = 
                latestRecord.duration || '--:--';
        }
    }

    async loadHistoryData() {
        try {
            const records = await Storage.getAllRecords();
            const historyList = document.getElementById('historyList');
            
            if (records.length === 0) {
                historyList.innerHTML = `<p data-i18n="no.data">暂无记录</p>`;
                return;
            }

            // 按日期倒序排序
            const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            historyList.innerHTML = '';
            sortedRecords.forEach(record => {
                const item = this.createHistoryItem(record);
                historyList.appendChild(item);
            });
        } catch (error) {
            console.error('Load history error:', error);
        }
    }

    createHistoryItem(record) {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const date = new Date(record.date);
        const clockInTime = record.clockIn ? new Date(record.clockIn) : null;
        const clockOutTime = record.clockOut ? new Date(record.clockOut) : null;
        
        const dateStr = date.toLocaleDateString();
        const clockInStr = clockInTime ? clockInTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
        const clockOutStr = clockOutTime ? clockOutTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
        const duration = record.duration || '--:--';

        div.innerHTML = `
            <div class="history-date">${dateStr}</div>
            <div class="history-times">
                <span>⏰ ${clockInStr}</span>
                <span>🏠 ${clockOutStr}</span>
                <span>⏱️ ${duration}</span>
            </div>
        `;

        return div;
    }

    async loadMonthlyData() {
        try {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
            
            const records = await Storage.getRecordsByRange(startDate, endDate);
            const completedRecords = records.filter(r => r.clockIn && r.clockOut);
            
            // 更新月份显示
            const monthNames = {
                'zh-CN': ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
                'en-US': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
            };
            
            const currentLang = i18n.currentLang;
            const monthName = monthNames[currentLang][month];
            document.getElementById('currentMonth').textContent = `${year}年${monthName}`;
            
            // 计算统计数据
            const totalDays = completedRecords.length;
            const totalMinutes = completedRecords.reduce((total, record) => {
                if (record.clockIn && record.clockOut) {
                    const durationMs = new Date(record.clockOut) - new Date(record.clockIn);
                    return total + Math.round(durationMs / (1000 * 60));
                }
                return total;
            }, 0);
            
            const avgMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
            const totalHours = Math.floor(totalMinutes / 60);
            const totalMins = totalMinutes % 60;
            const avgHours = Math.floor(avgMinutes / 60);
            const avgMins = avgMinutes % 60;
            
            // 更新UI
            const monthSummary = document.getElementById('monthSummary');
            monthSummary.innerHTML = `
                <div class="summary-item">
                    <span data-i18n="work.days">工作天数</span>: ${totalDays}
                </div>
                <div class="summary-item">
                    <span data-i18n="total.duration">本月总时长</span>: ${totalHours}h ${totalMins}m
                </div>
                <div class="summary-item">
                    <span data-i18n="average.duration">平均工作时长</span>: ${avgHours}h ${avgMins}m
                </div>
            `;
        } catch (error) {
            console.error('Load monthly data error:', error);
        }
    }

    toggleHistory() {
        const historyList = document.getElementById('historyList');
        const toggleBtn = document.getElementById('toggleHistory');
        
        if (historyList.style.display === 'none') {
            historyList.style.display = 'block';
            this.loadHistoryData();
        } else {
            historyList.style.display = 'none';
        }
    }

    changeMonth(direction) {
        // 这里可以实现月份切换功能
        // 由于当前是单页面应用，可以添加月份状态管理
        console.log('Month change:', direction);
    }

    updateUI() {
        const clockInBtn = document.getElementById('clockInBtn');
        const clockOutBtn = document.getElementById('clockOutBtn');
        const statusDisplay = document.getElementById('statusDisplay');

        switch (this.currentState) {
            case 'ready':
                clockInBtn.disabled = false;
                clockOutBtn.disabled = true;
                statusDisplay.textContent = '准备就绪';
                break;
            case 'clockedIn':
                clockInBtn.disabled = true;
                clockOutBtn.disabled = false;
                statusDisplay.textContent = '工作中...';
                break;
            case 'clockedOut':
                clockInBtn.disabled = true;
                clockOutBtn.disabled = true;
                statusDisplay.textContent = '今日工作已完成';
                break;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return '今天';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return '昨天';
        } else {
            return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        }
    }

    showExportModal() {
        document.getElementById('exportModal').style.display = 'block';
    }

    closeExportModal() {
        document.getElementById('exportModal').style.display = 'none';
    }

    async exportData(format) {
        try {
            const records = await Storage.getAllRecords();
            
            if (format === 'csv') {
                await exportManager.exportToCSV(records);
            } else if (format === 'image') {
                await exportManager.exportToImage(records);
            }
            
            this.closeExportModal();
            this.showNotification('导出成功！', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('导出失败，请重试', 'error');
        }
    }

    toggleLanguage() {
        if (typeof i18n !== 'undefined') {
            i18n.toggleLanguage();
            this.applyTranslations();
        }
    }

    toggleHistory() {
        const historyList = document.getElementById('historyList');
        historyList.classList.toggle('hidden');
    }

    changeMonth(direction) {
        // 实现月份切换逻辑
        console.log('Month change:', direction);
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1001',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        // 根据类型设置背景色
        const colors = {
            success: '#34C759',
            error: '#FF3B30',
            warning: '#FF9500',
            info: '#007AFF'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // 动画显示
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自动移除
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    initPWAInstallPrompt() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // 显示安装提示
            this.showInstallPrompt(deferredPrompt);
        });

        window.addEventListener('appinstalled', () => {
            this.showNotification('应用已成功安装！', 'success');
        });
    }

    showInstallPrompt(deferredPrompt) {
        const installBanner = document.createElement('div');
        installBanner.innerHTML = `
            <div style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--surface); padding: 1rem 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); display: flex; align-items: center; gap: 1rem; z-index: 1001;">
                <span>将工时卫士安装到桌面</span>
                <button id="installBtn" class="btn-primary" style="margin: 0;">安装</button>
                <button id="dismissInstall" class="btn-text" style="margin: 0;">稍后</button>
            </div>
        `;

        document.body.appendChild(installBanner);

        installBanner.querySelector('#installBtn').addEventListener('click', async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            installBanner.remove();
        });

        installBanner.querySelector('#dismissInstall').addEventListener('click', () => {
            installBanner.remove();
        });

        // 自动移除
        setTimeout(() => {
            if (installBanner.parentNode) {
                installBanner.remove();
            }
        }, 10000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new HoursGuardApp();
});

class HoursGuardApp {
    constructor() {
        this.currentState = 'ready'; // ready, clockedIn, clockedOut
        this.currentRecord = null;
        this.isUpdating = false;
        
        this.init();
    }

    async init() {
        await this.loadTranslations();
        this.bindEvents();
        this.startClock();
        this.loadTodayData();
        this.loadHistoryData();
        this.loadMonthlyData();
        
        // 初始化PWA提示
        this.initPWAInstallPrompt();
    }

    async loadTranslations() {
        // 等待i18n.js加载完成
        if (typeof i18n === 'undefined') {
            await new Promise(resolve => {
                const checkI18n = () => {
                    if (typeof i18n !== 'undefined') {
                        resolve();
                    } else {
                        setTimeout(checkI18n, 100);
                    }
                };
                checkI18n();
            });
        }
        
        // 应用翻译
        this.applyTranslations();
    }

    applyTranslations() {
        // 翻译UI元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = i18n.t(key);
            if (translation) {
                if (element.tagName === 'INPUT') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });
    }

    bindEvents() {
        // 打卡按钮
        document.getElementById('clockInBtn').addEventListener('click', () => this.handleClockIn());
        document.getElementById('clockOutBtn').addEventListener('click', () => this.handleClockOut());

        // 导出按钮
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        document.getElementById('exportCSV').addEventListener('click', () => this.exportData('csv'));
        document.getElementById('exportImage').addEventListener('click', () => this.exportData('image'));

        // 语言切换
        document.getElementById('langToggle').addEventListener('click', () => this.toggleLanguage());

        // 历史记录切换
        document.getElementById('toggleHistory').addEventListener('click', () => this.toggleHistory());

        // 月份导航
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));

        // 模态框关闭
        document.querySelector('.close').addEventListener('click', () => this.closeExportModal());
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('exportModal')) {
                this.closeExportModal();
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'e':
                        e.preventDefault();
                        this.showExportModal();
                        break;
                    case 'i':
                        e.preventDefault();
                        if (this.currentState === 'ready') {
                            this.handleClockIn();
                        }
                        break;
                    case 'o':
                        e.preventDefault();
                        if (this.currentState === 'clockedIn') {
                            this.handleClockOut();
                        }
                        break;
                }
            }
        });
    }

    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('zh-CN', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            document.getElementById('currentTime').textContent = timeString;
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    async handleClockIn() {
        if (this.currentState !== 'ready') return;

        try {
            const now = new Date();
            const record = {
                id: Date.now().toString(),
                date: now.toISOString().split('T')[0],
                clockIn: now.toISOString(),
                clockOut: null,
                duration: null,
                createdAt: now.toISOString()
            };

            await Storage.saveRecord(record);
            this.currentRecord = record;
            this.currentState = 'clockedIn';
            
            this.updateUI();
            this.showNotification('上班打卡成功！', 'success');
            
        } catch (error) {
            console.error('Clock in error:', error);
            this.showNotification('打卡失败，请重试', 'error');
        }
    }

    async handleClockOut() {
        if (this.currentState !== 'clockedIn' || !this.currentRecord) return;

        try {
            const now = new Date();
            this.currentRecord.clockOut = now.toISOString();
            this.currentRecord.duration = this.calculateDuration(
                this.currentRecord.clockIn, 
                this.currentRecord.clockOut
            );

            await Storage.updateRecord(this.currentRecord);
            this.currentState = 'clockedOut';
            
            this.updateUI();
            this.loadHistoryData();
            this.loadMonthlyData();
            this.showNotification('下班打卡成功！', 'success');
            
            // 重置状态
            setTimeout(() => {
                this.currentState = 'ready';
                this.currentRecord = null;
                this.updateUI();
            }, 3000);
            
        } catch (error) {
            console.error('Clock out error:', error);
            this.showNotification('打卡失败，请重试', 'error');
        }
    }

    calculateDuration(start, end) {
        const startTime = new Date(start);
        const endTime = new Date(end);
        const diffMs = endTime - startTime;
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    async loadTodayData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const records = await Storage.getRecordsByDate(today);
            
            if (records.length > 0) {
                const latestRecord = records[records.length - 1];
                if (!latestRecord.clockOut) {
                    this.currentRecord = latestRecord;
                    this.currentState = 'clockedIn';
                }
            }
            
            this.updateTodayStats(records);
            this.updateUI();
            
        } catch (error) {
            console.error('Load today data error:', error);
        }
    }

    updateTodayStats(records) {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = records.filter(r => r.date === today);
        
        if (todayRecords.length > 0) {
            const latestRecord = todayRecords[todayRecords.length - 1];
            
            document.getElementById('clockInTime').textContent = 
                latestRecord.clockIn ? new Date(latestRecord.clockIn).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--';
            
            document.getElementById('clockOutTime').textContent = 
                latestRecord.clockOut ? new Date(latestRecord.clockOut).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--';
            
            document.getElementById('workDuration').textContent = 
                latestRecord.duration || '--:--';
        }
    }

    async loadHistoryData() {
        try {
            const records = await Storage.getAllRecords();
            const historyList = document.getElementById('historyList');
            
            if (records.length === 0) {
                historyList.innerHTML = `<p data-i18n="no.data">暂无记录</p>`;
                return;
            }

            // 按日期倒序排序
            const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            historyList.innerHTML = '';
            sortedRecords.forEach(record => {
                const item = this.createHistoryItem(record);
                historyList.appendChild(item);
            });
        } catch (error) {
            console.error('Load history error:', error);
        }
    }

    createHistoryItem(record) {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const date = new Date(record.date);
        const clockInTime = record.clockIn ? new Date(record.clockIn) : null;
        const clockOutTime = record.clockOut ? new Date(record.clockOut) : null;
        
        const dateStr = date.toLocaleDateString();
        const clockInStr = clockInTime ? clockInTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
        const clockOutStr = clockOutTime ? clockOutTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
        const duration = record.duration || '--:--';

        div.innerHTML = `
            <div class="history-date">${dateStr}</div>
            <div class="history-times">
                <span>⏰ ${clockInStr}</span>
                <span>🏠 ${clockOutStr}</span>
                <span>⏱️ ${duration}</span>
            </div>
        `;

        return div;
    }

    async loadMonthlyData() {
        try {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
            
            const records = await Storage.getRecordsByRange(startDate, endDate);
            const completedRecords = records.filter(r => r.clockIn && r.clockOut);
            
            // 更新月份显示
            const monthNames = {
                'zh-CN': ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
                'en-US': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
            };
            
            const currentLang = i18n.currentLang;
            const monthName = monthNames[currentLang][month];
            document.getElementById('currentMonth').textContent = `${year}年${monthName}`;
            
            // 计算统计数据
            const totalDays = completedRecords.length;
            const totalMinutes = completedRecords.reduce((total, record) => {
                if (record.clockIn && record.clockOut) {
                    const durationMs = new Date(record.clockOut) - new Date(record.clockIn);
                    return total + Math.round(durationMs / (1000 * 60));
                }
                return total;
            }, 0);
            
            const avgMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
            const totalHours = Math.floor(totalMinutes / 60);
            const totalMins = totalMinutes % 60;
            const avgHours = Math.floor(avgMinutes / 60);
            const avgMins = avgMinutes % 60;
            
            // 更新UI
            const monthSummary = document.getElementById('monthSummary');
            monthSummary.innerHTML = `
                <div class="summary-item">
                    <span data-i18n="work.days">工作天数</span>: ${totalDays}
                </div>
                <div class="summary-item">
                    <span data-i18n="total.duration">本月总时长</span>: ${totalHours}h ${totalMins}m
                </div>
                <div class="summary-item">
                    <span data-i18n="average.duration">平均工作时长</span>: ${avgHours}h ${avgMins}m
                </div>
            `;
        } catch (error) {
            console.error('Load monthly data error:', error);
        }
    }

    toggleHistory() {
        const historyList = document.getElementById('historyList');
        const toggleBtn = document.getElementById('toggleHistory');
        
        if (historyList.style.display === 'none') {
            historyList.style.display = 'block';
            this.loadHistoryData();
        } else {
            historyList.style.display = 'none';
        }
    }

    changeMonth(direction) {
        // 这里可以实现月份切换功能
        // 由于当前是单页面应用，可以添加月份状态管理
        console.log('Month change:', direction);
    }

    updateUI() {
        const clockInBtn = document.getElementById('clockInBtn');
        const clockOutBtn = document.getElementById('clockOutBtn');
        const statusDisplay = document.getElementById('statusDisplay');

        switch (this.currentState) {
            case 'ready':
                clockInBtn.disabled = false;
                clockOutBtn.disabled = true;
                statusDisplay.textContent = '准备就绪';
                break;
            case 'clockedIn':
                clockInBtn.disabled = true;
                clockOutBtn.disabled = false;
                statusDisplay.textContent = '工作中...';
                break;
            case 'clockedOut':
                clockInBtn.disabled = true;
                clockOutBtn.disabled = true;
                statusDisplay.textContent = '今日工作已完成';
                break;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return '今天';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return '昨天';
        } else {
            return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        }
    }

    showExportModal() {
        document.getElementById('exportModal').style.display = 'block';
    }

    closeExportModal() {
        document.getElementById('exportModal').style.display = 'none';
    }

    async exportData(format) {
        try {
            const records = await Storage.getAllRecords();
            
            if (format === 'csv') {
                await exportManager.exportToCSV(records);
            } else if (format === 'image') {
                await exportManager.exportToImage(records);
            }
            
            this.closeExportModal();
            this.showNotification('导出成功！', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('导出失败，请重试', 'error');
        }
    }

    toggleLanguage() {
        if (typeof i18n !== 'undefined') {
            i18n.toggleLanguage();
            this.applyTranslations();
        }
    }

    toggleHistory() {
        const historyList = document.getElementById('historyList');
        historyList.classList.toggle('hidden');
    }

    changeMonth(direction) {
        // 实现月份切换逻辑
        console.log('Month change:', direction);
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1001',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        // 根据类型设置背景色
        const colors = {
            success: '#34C759',
            error: '#FF3B30',
            warning: '#FF9500',
            info: '#007AFF'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // 动画显示
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        //