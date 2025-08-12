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
                historyList.innerHTML = '<div class="no-data">暂无记录</div>';
                return;
            }

            // 按日期倒序排序，显示最近7天
            const recentRecords = records
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 7);

            historyList.innerHTML = recentRecords.map(record => `
                <div class="history-item">
                    <div class="history-date">
                        ${this.formatDate(record.date)}
                    </div>
                    <div class="history-times">
                        <span>上班: ${record.clockIn ? new Date(record.clockIn).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                        <span>下班: ${record.clockOut ? new Date(record.clockOut).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                        ${record.duration ? `<span class="history-duration">${record.duration}</span>` : ''}
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Load history data error:', error);
        }
    }

    async loadMonthlyData() {
        try {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            
            const records = await Storage.getRecordsByRange(
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            this.updateMonthlyStats(records, year, month);
            
        } catch (error) {
            console.error('Load monthly data error:', error);
        }
    }

    updateMonthlyStats(records, year, month) {
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                           '七月', '八月', '九月', '十月', '十一月', '十二月'];
        
        document.getElementById('currentMonth').textContent = `${year}年${monthNames[month]}`;

        const completedRecords = records.filter(r => r.clockOut && r.duration);
        const totalDays = completedRecords.length;
        
        let totalMinutes = 0;
        completedRecords.forEach(record => {
            const [hours, minutes] = record.duration.split(':').map(Number);
            totalMinutes += hours * 60 + minutes;
        });

        const avgMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
        const avgHours = Math.floor(avgMinutes / 60);
        const avgMins = avgMinutes % 60;

        const totalHours = Math.floor(totalMinutes / 60);
        const totalMins = totalMinutes % 60;

        const monthSummary = document.getElementById('monthSummary');
        monthSummary.innerHTML = `
            <div class="summary-card">
                <h3>工作天数</h3>
                <div class="value">${totalDays}</div>
            </div>
            <div class="summary-card">
                <h3>平均工作时长</h3>
                <div class="value">${avgHours}:${avgMins.toString().padStart(2, '0')}</div>
            </div>
            <div class="summary-card">
                <h3>本月总时长</h3>
                <div class="value">${totalHours}:${totalMins.toString().padStart(2, '0')}</div>
            </div>
        `;
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