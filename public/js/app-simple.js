// 简化版Hours Guard应用 - 与小程序功能保持一致
class HoursGuardApp {
    constructor() {
        this.currentState = 'ready'; // ready, working, finished
        this.todayRecord = null;
        this.selectedDate = this.getTodayString();
        this.isToday = true;
        this.currentMonthDate = new Date(); // 当前查看的月份
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.startClock();
        this.updateDateLabel();
        this.updateMonthLabel();
        this.loadTodayData();
        this.loadHistoryData();
        this.loadMonthlyData();
        this.loadStorageStats();
    }

    updateDateLabel() {
        const dateLabel = document.getElementById('dateLabel');
        if (this.isToday) {
            dateLabel.textContent = '今天';
            dateLabel.className = 'date-label today';
        } else {
            const selectedDate = new Date(this.selectedDate);
            dateLabel.textContent = selectedDate.toLocaleDateString('zh-CN');
            dateLabel.className = 'date-label historical';
        }
    }

    updateMonthLabel() {
        const monthLabel = document.getElementById('currentMonth');
        const year = this.currentMonthDate.getFullYear();
        const month = this.currentMonthDate.getMonth() + 1;
        monthLabel.textContent = `${year}年${month}月`;
    }

    bindEvents() {
        // 主按钮事件
        document.getElementById('clockInBtn').addEventListener('click', () => {
            this.handleMainButtonClick();
        });

        // 日期选择事件
        const dateSelector = document.getElementById('dateSelector');
        dateSelector.value = this.selectedDate;
        dateSelector.addEventListener('change', (e) => {
            this.selectedDate = e.target.value;
            this.isToday = this.selectedDate === this.getTodayString();
            this.updateDateLabel();
            this.loadTodayData();
        });

        // 月份切换事件
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonthDate.setMonth(this.currentMonthDate.getMonth() - 1);
            this.updateMonthLabel();
            this.loadMonthlyData();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonthDate.setMonth(this.currentMonthDate.getMonth() + 1);
            this.updateMonthLabel();
            this.loadMonthlyData();
        });

        // 数据管理事件
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.showExportModal();
        });

        document.getElementById('backupBtn').addEventListener('click', () => {
            this.createBackup();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importData(e.target.files[0]);
            }
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
                <span class="time-input" data-type="on" data-date="${record.date}">${record.on || '--:--'}</span>
                <span class="time-input" data-type="off" data-date="${record.date}">${record.off || '--:--'}</span>
                <span class="duration">${duration}</span>
            </div>
            <div class="history-actions">
                <button class="btn-edit" data-date="${record.date}">编辑</button>
                <button class="btn-delete" data-date="${record.date}">删除</button>
            </div>
        `;

        // 绑定编辑和删除事件
        this.bindHistoryItemEvents(div, record);

        return div;
    }

    bindHistoryItemEvents(itemElement, record) {
        // 编辑按钮事件
        const editBtn = itemElement.querySelector('.btn-edit');
        editBtn.addEventListener('click', () => {
            this.editRecord(record.date);
        });

        // 删除按钮事件
        const deleteBtn = itemElement.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', () => {
            this.deleteRecord(record.date);
        });

        // 时间点击编辑事件
        const timeInputs = itemElement.querySelectorAll('.time-input');
        timeInputs.forEach(input => {
            input.addEventListener('click', () => {
                const type = input.dataset.type;
                const date = input.dataset.date;
                this.editTimeInline(input, date, type);
            });
        });
    }

    editRecord(date) {
        const records = this.getRecords();
        const record = records.find(r => r.date === date);
        if (!record) return;

        // 创建编辑模态框
        this.showEditModal(record);
    }

    showEditModal(record) {
        // 创建模态框HTML
        const modalHTML = `
            <div id="editModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h3>编辑记录 - ${new Date(record.date).toLocaleDateString('zh-CN')}</h3>
                    <div class="edit-form">
                        <div class="form-group">
                            <label>上班时间:</label>
                            <input type="time" id="editOnTime" value="${record.on || ''}" />
                        </div>
                        <div class="form-group">
                            <label>下班时间:</label>
                            <input type="time" id="editOffTime" value="${record.off || ''}" />
                        </div>
                        <div class="form-actions">
                            <button id="saveEdit" class="btn-primary">保存</button>
                            <button id="cancelEdit" class="btn-secondary">取消</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById('editModal');
        modal.style.display = 'block';

        // 绑定事件
        const closeBtn = modal.querySelector('.close');
        const saveBtn = modal.querySelector('#saveEdit');
        const cancelBtn = modal.querySelector('#cancelEdit');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        saveBtn.addEventListener('click', () => {
            const onTime = document.getElementById('editOnTime').value;
            const offTime = document.getElementById('editOffTime').value;
            
            if (this.saveEditedRecord(record.date, onTime, offTime)) {
                this.showNotification('记录已更新');
                this.loadTodayData();
                this.loadHistoryData();
                this.loadMonthlyData();
                closeModal();
            }
        });

        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    editTimeInline(element, date, type) {
        const currentValue = element.textContent === '--:--' ? '' : element.textContent;
        
        // 创建时间输入框
        const input = document.createElement('input');
        input.type = 'time';
        input.value = currentValue;
        input.className = 'inline-time-input';
        
        // 替换显示元素
        element.style.display = 'none';
        element.parentNode.insertBefore(input, element.nextSibling);
        input.focus();

        const saveInlineEdit = () => {
            const newValue = input.value;
            if (this.updateRecordTime(date, type, newValue)) {
                element.textContent = newValue || '--:--';
                this.loadTodayData();
                this.loadHistoryData();
                this.loadMonthlyData();
                this.showNotification('时间已更新');
            }
            
            input.remove();
            element.style.display = '';
        };

        const cancelInlineEdit = () => {
            input.remove();
            element.style.display = '';
        };

        // 绑定事件
        input.addEventListener('blur', saveInlineEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveInlineEdit();
            } else if (e.key === 'Escape') {
                cancelInlineEdit();
            }
        });
    }

    updateRecordTime(date, type, newValue) {
        try {
            const records = this.getRecords();
            const recordIndex = records.findIndex(r => r.date === date);
            
            if (recordIndex >= 0) {
                records[recordIndex][type] = newValue;
                this.saveRecords(records);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Update record time error:', error);
            return false;
        }
    }

    saveEditedRecord(date, onTime, offTime) {
        try {
            const records = this.getRecords();
            const recordIndex = records.findIndex(r => r.date === date);
            
            if (recordIndex >= 0) {
                records[recordIndex].on = onTime;
                records[recordIndex].off = offTime;
                this.saveRecords(records);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Save edited record error:', error);
            return false;
        }
    }

    deleteRecord(date) {
        // 显示确认对话框
        this.showDeleteConfirmModal(date);
    }

    showDeleteConfirmModal(date) {
        const dateStr = new Date(date).toLocaleDateString('zh-CN');
        const modalHTML = `
            <div id="deleteModal" class="modal">
                <div class="modal-content">
                    <h3>确认删除</h3>
                    <p>确定要删除 ${dateStr} 的打卡记录吗？</p>
                    <div class="form-actions">
                        <button id="confirmDelete" class="btn-danger">删除</button>
                        <button id="cancelDelete" class="btn-secondary">取消</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById('deleteModal');
        modal.style.display = 'block';

        const confirmBtn = modal.querySelector('#confirmDelete');
        const cancelBtn = modal.querySelector('#cancelDelete');

        const closeModal = () => {
            modal.remove();
        };

        confirmBtn.addEventListener('click', () => {
            if (this.performDeleteRecord(date)) {
                this.showNotification('记录已删除');
                this.loadTodayData();
                this.loadHistoryData();
                this.loadMonthlyData();
            }
            closeModal();
        });

        cancelBtn.addEventListener('click', closeModal);

        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    performDeleteRecord(date) {
        try {
            const records = this.getRecords();
            const filteredRecords = records.filter(r => r.date !== date);
            this.saveRecords(filteredRecords);
            return true;
        } catch (error) {
            console.error('Delete record error:', error);
            return false;
        }
    }

    loadMonthlyData() {
        try {
            const records = this.getRecords();
            const year = this.currentMonthDate.getFullYear();
            const month = this.currentMonthDate.getMonth();
            
            // 筛选指定月份记录
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
                    <span>总时长</span>
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

    // 存储相关方法 - 使用StorageManager
    getRecords() {
        return window.storageManager ? window.storageManager.getRecords() : [];
    }

    saveRecords(records) {
        return window.storageManager ? window.storageManager.saveRecords(records) : false;
    }

    getTodayString() {
        return new Date().toISOString().split('T')[0];
    }

    showNotification(message, type = 'success') {
        if (window.errorHandler) {
            window.errorHandler.showUserFriendlyMessage(message, type);
        } else {
            // 备用通知方法
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = message;
            
            Object.assign(notification.style, {
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '12px 24px',
                borderRadius: '8px',
                backgroundColor: type === 'error' ? '#ef4444' : 'var(--success)',
                color: 'white',
                fontWeight: '500',
                zIndex: '1001',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                opacity: '0',
                transition: 'opacity 0.3s ease'
            });

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.opacity = '1';
            }, 100);

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

    // 数据管理功能
    showExportModal() {
        const modalHTML = `
            <div id="exportDataModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h3>导出数据</h3>
                    <div class="export-options">
                        <button id="exportJSON" class="btn-primary">导出JSON</button>
                        <button id="exportCSV" class="btn-secondary">导出CSV</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById('exportDataModal');
        modal.style.display = 'block';

        const closeBtn = modal.querySelector('.close');
        const exportJSONBtn = modal.querySelector('#exportJSON');
        const exportCSVBtn = modal.querySelector('#exportCSV');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        
        exportJSONBtn.addEventListener('click', () => {
            this.exportData('json');
            closeModal();
        });

        exportCSVBtn.addEventListener('click', () => {
            this.exportData('csv');
            closeModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    exportData(format) {
        if (window.storageManager) {
            const result = window.storageManager.exportData(format);
            if (result.success) {
                this.showNotification(`数据已导出：${result.filename}`);
            } else {
                this.showNotification(`导出失败：${result.error}`, 'error');
            }
        }
    }

    createBackup() {
        if (window.storageManager) {
            const result = window.storageManager.createBackup('手动备份');
            if (result.success) {
                this.showNotification(`备份已创建，共${result.totalBackups}个备份`);
                this.loadStorageStats();
            } else {
                this.showNotification(`备份失败：${result.error}`, 'error');
            }
        }
    }

    async importData(file) {
        if (window.storageManager) {
            try {
                const result = await window.storageManager.importData(file);
                if (result.success) {
                    this.showNotification(`导入成功：${result.imported}条记录，总计${result.total}条`);
                    this.loadTodayData();
                    this.loadHistoryData();
                    this.loadMonthlyData();
                    this.loadStorageStats();
                } else {
                    this.showNotification(`导入失败：${result.error}`, 'error');
                }
            } catch (error) {
                this.showNotification(`导入失败：${error.error || error.message}`, 'error');
            }
        }
        
        // 清空文件输入
        document.getElementById('importFile').value = '';
    }

    loadStorageStats() {
        if (window.storageManager) {
            const stats = window.storageManager.getStorageStats();
            if (stats) {
                const statsElement = document.getElementById('storageStats');
                statsElement.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span>记录数量</span>
                            <span>${stats.recordCount}条</span>
                        </div>
                        <div class="stat-item">
                            <span>备份数量</span>
                            <span>${stats.backupCount}个</span>
                        </div>
                        <div class="stat-item">
                            <span>存储大小</span>
                            <span>${Math.round(stats.totalSize / 1024)}KB</span>
                        </div>
                    </div>
                `;
            }
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new HoursGuardApp();
});