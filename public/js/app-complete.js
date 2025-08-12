// 完整的HoursGuard应用
class HoursGuardApp {
    constructor() {
        this.currentState = 'ready';
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
        this.initPWAInstallPrompt();
        this.showWelcomeNotification();
    }

    async loadTranslations() {
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
        this.applyTranslations();
    }

    applyTranslations() {
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

        const metaElements = document.querySelectorAll('[data-i18n-meta]');
        metaElements.forEach(element => {
            const key = element.getAttribute('data-i18n-meta');
            const translation = i18n.t(key);
            if (translation) {
                if (element.tagName === 'META') {
                    element.content = translation;
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
            if (e.key === 'Escape') {
                this.closeExportModal();
            }
        });
    }

    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString(i18n.currentLang === 'zh' ? 'zh-CN' : 'en-US', { 
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

    showNotification(message, type = 'info') {
        if (window.notificationManager) {
            window.notificationManager.show(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
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
                latestRecord.clockIn ? new Date(latestRecord.clockIn).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--';
            
            document.getElementById('clockOutTime').textContent = 
                latestRecord.clockOut ? new Date(latestRecord.clockOut).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--';
            
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
            
            const monthNames = {
                'zh': ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
                'en': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
            };
            
            const monthName = monthNames[i18n.currentLang][month];
            document.getElementById('currentMonth').textContent = 
                i18n.currentLang === 'zh' ? `${year}年${monthName}` : `${monthName} ${year}`;
            
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
            
            const monthSummary = document.getElementById('monthSummary');
            monthSummary.innerHTML = `
                <div class="summary-item">
                    <span data-i18n="work.days">${i18n.t('work.days')}</span>: ${totalDays}
                </div>
                <div class="summary-item">
                    <span data-i18n="total.duration">${i18n.t('total.duration')}</span>: ${totalHours}h ${totalMins}m
                </div>
                <div class="summary-item">
                    <span data-i18n="average.duration">${i18n.t('average.duration')}</span>: ${avgHours}h ${avgMins}m
                </div>
            `;
        } catch (error) {
            console.error('Load monthly data error:', error);
        }
    }

    toggleHistory() {
        const historyList = document.getElementById('historyList');
        const toggleBtn = document.getElementById('toggleHistory');
        
        if (historyList.style.display === 'none' || !historyList.style.display) {
            historyList.style.display = 'block';
            this.loadHistoryData();
        } else {
            historyList.style.display = 'none';
        }
    }

    changeMonth(direction) {
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
                statusDisplay.textContent = i18n.t('status.ready');
                statusDisplay.className = 'status-ready';
                break;
            case 'clockedIn':
                clockInBtn.disabled = true;
                clockOutBtn.disabled = false;
                statusDisplay.textContent = i18n.t('status.working');
                statusDisplay.className = 'status-working';
                break;
            case 'clockedOut':
                clockInBtn.disabled = true;
                clockOutBtn.disabled = true;
                statusDisplay.textContent = i18n.t('status.finished');
                statusDisplay.className = 'status-finished';
                break;
        }
    }

    showExportModal() {
        document.getElementById('exportModal').classList.add('show');
    }

    closeExportModal() {
        document.getElementById('exportModal').classList.remove('show');
    }

    async toggleLanguage() {
        const currentLang = i18n.currentLang;
        const newLang = currentLang === 'zh' ? 'en' : 'zh';
        
        await i18n.setLanguage(newLang);
        this.applyTranslations();
        this.loadMonthlyData();
        this.showNotification(
            newLang === 'zh' ? '已切换到中文' : 'Switched to English',
            'info'
        );
    }

    async exportData(format) {
        try {
            const records = await Storage.getAllRecords();
            if (records.length === 0) {
                this.showNotification(i18n.t('export.noData'), 'warning');
                return;
            }

            if (format === 'csv') {
                const csvContent = this.generateCSV(records);
                this.downloadFile(csvContent, 'hours-guard-data.csv', 'text/csv');
                this.showNotification(i18n.t('export.csvSuccess'), 'success');
            } else if (format === 'image') {
                await this.exportToImage(records);
                this.showNotification(i18n.t('export.imageSuccess'), 'success');
            }
            
            this.closeExportModal();
            
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification(i18n.t('export.error'), 'error');
        }
    }

    generateCSV(records) {
        const headers = [
            i18n.t('date'),
            i18n.t('clock.in'),
            i18n.t('clock.out'),
            i18n.t('duration')
        ];
        
        const rows = records.map(record => [
            record.date,
            record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '',
            record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : '',
            record.duration || '0'
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async exportToImage(records) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 200 + records.length * 40;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Hours Guard - ' + i18n.t('app.title'), 50, 50);
        
        ctx.font = '16px Arial';
        ctx.fillText(`${i18n.t('total.records')}: ${records.length}`, 50, 80);
        
        ctx.font = 'bold 14px Arial';
        const headers = [i18n.t('date'), i18n.t('clock.in'), i18n.t('clock.out'), i18n.t('duration')];
        headers.forEach((header, index) => {
            ctx.fillText(header, 50 + index * 180, 120);
        });
        
        ctx.font = '14px Arial';
        records.forEach((record, index) => {
            const y = 160 + index * 40;
            ctx.fillText(record.date, 50, y);
            ctx.fillText(
                record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '-',
                230, y
            );
            ctx.fillText(
                record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : '-',
                410, y
            );
            ctx.fillText(record.duration || '-', 590, y);
        });
        
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'hours-guard-records.png';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    initPWAInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            window.deferredPrompt = e;
            
            setTimeout(() => {
                this.showNotification(
                    i18n.currentLang === 'zh' ? 
                        '点击安装按钮将应用添加到主屏幕' : 
                        'Click install to add this app to your home screen',
                    'info',
                    5000
                );
            }, 3000);
        });
    }

    showWelcomeNotification() {
        if (!localStorage.getItem('welcomeShown')) {
            setTimeout(() => {
                this.showNotification(
                    i18n.currentLang === 'zh' ? 
                        '欢迎使用Hours Guard！按Ctrl+E导出数据' : 
                        'Welcome to Hours Guard! Press Ctrl+E to export data',
                    'success',
                    4000
                );
                localStorage.setItem('welcomeShown', 'true');
            }, 2000);
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new HoursGuardApp();
});