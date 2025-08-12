// 简化版Hours Guard应用 - 与小程序功能保持一致
class HoursGuardApp {
    constructor() {
        this.currentState = 'ready'; // ready, working, finished
        this.todayRecord = null;
        this.selectedDate = this.getTodayString();
        this.isToday = true;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.startClock();
        this.loadTodayData();
        this.loadHistoryData();
        this.loadMonthlyData();
    }

    bindEvents() {
        // 主按钮事件
        document.getElementById('clockInBtn').addEventListener('click', () => {
            this.handleMainButtonClick();
        });
    }

    startClock() {
        // 移除时间显示功能，保持方法以避免错误
        // 时间显示已从UI中移除
    }

    handleMainButtonClick() {
        switch (this.currentState) {
            case 'ready':
                this.clockIn();
                break;
            case 'working':
                this.clockOut();
                break;
            case 'finished':
                this.showTodaySummary();
                break;
        }
    }

    async clockIn() {
        try {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('zh-CN', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });

            // 获取现有记录
            const records = this.getRecords();
            
            // 查找今日记录
            let todayRecord = records.find(r => r.date === this.selectedDate);
            
            if (todayRecord) {
                todayRecord.on = timeStr;
            } else {
                todayRecord = {
                    date: this.selectedDate,
                    on: timeStr
                };
                records.push(todayRecord);
            }

            // 保存记录
            this.saveRecords(records);
            this.todayRecord = todayRecord;
            this.currentState = 'working';
            
            this.updateUI();
            this.showNotification('上班打卡成功！');
            
        } catch (error) {
            console.error('Clock in error:', error);
            this.showNotification('打卡失败，请重试');
        }
    }

    async clockOut() {
        if (!this.todayRecord || !this.todayRecord.on) {
            this.showNotification('请先上班打卡');
            return;
        }

        try {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('zh-CN', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });

            // 更新记录
            const records = this.getRecords();
            const recordIndex = records.findIndex(r => r.date === this.selectedDate);
            
            if (recordIndex >= 0) {
                records[recordIndex].off = timeStr;
                this.saveRecords(records);
                this.todayRecord = records[recordIndex];
                this.currentState = 'finished';
                
                this.updateUI();
                this.loadHistoryData();
                this.loadMonthlyData();
                this.showNotification('下班打卡成功！');
                
                // 3秒后重置状态
                setTimeout(() => {
                    this.currentState = 'ready';
                    this.updateUI();
                }, 3000);
            }
            
        } catch (error) {
            console.error('Clock out error:', error);
            this.showNotification('打卡失败，请重试');
        }
    }

    showTodaySummary() {
        if (this.todayRecord && this.todayRecord.on && this.todayRecord.off) {
            const duration = this.calculateDuration(this.todayRecord.on, this.todayRecord.off);
            this.showNotification(`今日工作时长：${duration}`);
        } else {
            this.showNotification('今日工作已完成！');
        }
    }

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

    loadTodayData() {
        try {
            const records = this.getRecords();
            this.todayRecord = records.find(r => r.date === this.selectedDate) || null;
            
            // 确定当前状态
            if (!this.todayRecord || !this.todayRecord.on) {
                this.currentState = 'ready';
            } else if (!this.todayRecord.off) {
                this.currentState = 'working';
            } else {
                this.currentState = 'finished';
            }
            
            this.updateTodayStats();
            this.updateUI();
            
        } catch (error) {
            console.error('Load today data error:', error);
        }
    }

    updateTodayStats() {
        if (this.todayRecord) {
            document.getElementById('clockInTime').textContent = this.todayRecord.on || '--:--';
            document.getElementById('clockOutTime').textContent = this.todayRecord.off || '--:--';
            
            if (this.todayRecord.on && this.todayRecord.off) {
                const duration = this.calculateDuration(this.todayRecord.on, this.todayRecord.off);
                document.getElementById('workDuration').textContent = duration;
            } else {
                document.getElementById('workDuration').textContent = '--:--';
            }
        } else {
            document.getElementById('clockInTime').textContent = '--:--';
            document.getElementById('clockOutTime').textContent = '--:--';
            document.getElementById('workDuration').textContent = '--:--';
        }
    }

    loadHistoryData() {
        try {
            const records = this.getRecords();
            const historyList = document.getElementById('historyList');
            
            if (records.length === 0) {
                historyList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">暂无记录</p>';
                return;
            }

            // 按日期倒序排序
            const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            historyList.innerHTML = '';
            sortedRecords.slice(0, 10).forEach(record => { // 只显示最近10条
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
        const dateStr = date.toLocaleDateString('zh-CN');
        const duration = record.on && record.off ? this.calculateDuration(record.on, record.off) : '--:--';

        div.innerHTML = `
            <div class="history-date">${dateStr}</div>
            <div class="history-times">
                <span>${record.on || '--:--'}</span>
                <span>${record.off || '--:--'}</span>
                <span>${duration}</span>
            </div>
        `;

        return div;
    }

    loadMonthlyData() {
        try {
            const records = this.getRecords();
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // 筛选本月记录
            const monthRecords = records.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.getFullYear() === year && recordDate.getMonth() === month;
            });
            
            const completedRecords = monthRecords.filter(r => r.on && r.off);
            
            // 计算统计数据
            const totalDays = completedRecords.length;
            let totalMinutes = 0;
            
            completedRecords.forEach(record => {
                const duration = this.calculateDuration(record.on, record.off);
                const [hours, minutes] = duration.split(':').map(Number);
                totalMinutes += hours * 60 + minutes;
            });
            
            const avgMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
            const totalHours = Math.floor(totalMinutes / 60);
            const totalMins = totalMinutes % 60;
            const avgHours = Math.floor(avgMinutes / 60);
            const avgMins = avgMinutes % 60;
            
            // 更新UI
            const monthSummary = document.getElementById('monthSummary');
            monthSummary.innerHTML = `
                <div class="summary-item">
                    <span>工作天数</span>
                    <span>${totalDays}天</span>
                </div>
                <div class="summary-item">
                    <span>本月总时长</span>
                    <span>${totalHours}小时${totalMins}分钟</span>
                </div>
                <div class="summary-item">
                    <span>平均工作时长</span>
                    <span>${avgHours}小时${avgMins}分钟</span>
                </div>
            `;
        } catch (error) {
            console.error('Load monthly data error:', error);
        }
    }

    updateUI() {
        const clockInBtn = document.getElementById('clockInBtn');

        // 清除所有状态类
        clockInBtn.classList.remove('working', 'finished');

        switch (this.currentState) {
            case 'ready':
                clockInBtn.disabled = false;
                clockInBtn.textContent = '开始工作';
                clockInBtn.style.background = '';
                break;
            case 'working':
                clockInBtn.disabled = false;
                clockInBtn.textContent = '结束工作';
                clockInBtn.classList.add('working');
                clockInBtn.style.background = '';
                break;
            case 'finished':
                clockInBtn.disabled = false;
                clockInBtn.textContent = '查看详情';
                clockInBtn.classList.add('finished');
                clockInBtn.style.background = '';
                break;
        }
    }

    // 存储相关方法
    getRecords() {
        try {
            const records = localStorage.getItem('hoursGuard_records');
            return records ? JSON.parse(records) : [];
        } catch (error) {
            console.error('Get records error:', error);
            return [];
        }
    }

    saveRecords(records) {
        try {
            localStorage.setItem('hoursGuard_records', JSON.stringify(records));
            return true;
        } catch (error) {
            console.error('Save records error:', error);
            return false;
        }
    }

    getTodayString() {
        return new Date().toISOString().split('T')[0];
    }

    showNotification(message) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // 样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: '8px',
            backgroundColor: 'var(--success)',
            color: 'white',
            fontWeight: '500',
            zIndex: '1001',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

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
        }, 2000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new HoursGuardApp();
});