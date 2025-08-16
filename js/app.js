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
        try {
            console.log('初始化工时卫士应用...');
            // Hook测试注释 - 第五次测试 - 多事件hook测试
            
            // 检查依赖
            if (!window.storageManager) {
                throw new Error('存储管理器未加载');
            }
            if (!window.errorHandler) {
                throw new Error('错误处理器未加载');
            }
            
            this.bindEvents();
            this.updateMonthLabel();
            this.loadTodayData();
            this.loadMonthlyData();
            this.loadWeeklyData();
            this.loadDailyRecords();
            
            console.log('工时卫士应用初始化完成');
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showNotification('应用初始化失败，请刷新页面重试', 'error');
            
            // 尝试基本功能
            this.bindEvents();
        }
    }



    updateMonthLabel() {
        const monthLabel = document.getElementById('currentMonth');
        if (monthLabel) {
            const year = this.currentMonthDate.getFullYear();
            const month = this.currentMonthDate.getMonth() + 1;
            monthLabel.textContent = `${year}年${month}月`;
        }
    }

    bindEvents() {
        // 主按钮事件
        const clockInBtn = document.getElementById('clockInBtn');
        if (clockInBtn) {
            clockInBtn.addEventListener('click', () => {
                this.handleMainButtonClick();
            });
        }

        // 日期选择事件
        const dateSelector = document.getElementById('dateSelector');
        if (dateSelector) {
            dateSelector.value = this.selectedDate;
            dateSelector.addEventListener('change', (e) => {
                this.selectedDate = e.target.value;
                this.isToday = this.selectedDate === this.getTodayString();
                this.loadTodayData();
            });
        }

        // 时间输入事件
        const clockInInput = document.getElementById('clockInInput');
        if (clockInInput) {
            clockInInput.addEventListener('change', (e) => {
                this.updateClockInTime(e.target.value);
            });
        }

        // 月份切换事件
        const prevMonth = document.getElementById('prevMonth');
        if (prevMonth) {
            prevMonth.addEventListener('click', () => {
                this.currentMonthDate.setMonth(this.currentMonthDate.getMonth() - 1);
                this.updateMonthLabel();
                this.loadMonthlyData();
                this.loadWeeklyData();
                this.loadDailyRecords();
            });
        }

        const nextMonth = document.getElementById('nextMonth');
        if (nextMonth) {
            nextMonth.addEventListener('click', () => {
                this.currentMonthDate.setMonth(this.currentMonthDate.getMonth() + 1);
                this.updateMonthLabel();
                this.loadMonthlyData();
                this.loadWeeklyData();
                this.loadDailyRecords();
            });
        }

        // 数据管理事件
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                console.log('导出按钮被点击');
                this.exportTextReport();
            });
        } else {
            console.error('未找到导出按钮元素');
        }


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
                this.loadMonthlyData();
                this.loadWeeklyData();
                this.loadDailyRecords();
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
        const clockInInput = document.getElementById('clockInInput');
        
        if (clockInInput) {
            if (this.todayRecord) {
                clockInInput.value = this.todayRecord.on || '';
            } else {
                clockInInput.value = '';
            }
        }
    }

    updateClockInTime(timeValue) {
        const records = this.getRecords();
        let todayRecord = records.find(r => r.date === this.selectedDate);
        
        if (todayRecord) {
            todayRecord.on = timeValue;
        } else {
            todayRecord = {
                date: this.selectedDate,
                on: timeValue
            };
            records.push(todayRecord);
        }
        
        this.saveRecords(records);
        this.todayRecord = todayRecord;
        this.loadMonthlyData();
        this.loadWeeklyData();
        this.loadDailyRecords();
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
                this.loadMonthlyData();
                this.loadWeeklyData();
                this.loadDailyRecords();
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
                this.loadMonthlyData();
                this.loadWeeklyData();
                this.loadDailyRecords();
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
                this.loadMonthlyData();
                this.loadWeeklyData();
                this.loadDailyRecords();
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
            const monthWorkDaysElement = document.getElementById('monthWorkDays');
            const monthTotalHoursElement = document.getElementById('monthTotalHours');
            const monthAvgHoursElement = document.getElementById('monthAvgHours');
            
            if (monthWorkDaysElement) {
                monthWorkDaysElement.textContent = `${totalDays}天`;
            }
            if (monthTotalHoursElement) {
                monthTotalHoursElement.textContent = `${totalHours}小时${totalMins}分钟`;
            }
            if (monthAvgHoursElement) {
                monthAvgHoursElement.textContent = `${avgHours}小时${avgMins}分钟`;
            }
        } catch (error) {
            console.error('Load monthly data error:', error);
        }
    }

    loadWeeklyData() {
        try {
            const records = this.getRecords();
            const today = new Date();
            
            // 获取本周的开始和结束日期
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() + 1); // 周一
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // 周日
            
            // 筛选本周记录
            const weekRecords = records.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= startOfWeek && recordDate <= endOfWeek;
            });
            
            const completedRecords = weekRecords.filter(r => r.on && r.off);
            
            // 计算统计数据
            let totalMinutes = 0;
            completedRecords.forEach(record => {
                const duration = this.calculateDuration(record.on, record.off);
                const [hours, minutes] = duration.split(':').map(Number);
                totalMinutes += hours * 60 + minutes;
            });
            
            const avgMinutes = completedRecords.length > 0 ? Math.round(totalMinutes / completedRecords.length) : 0;
            const totalHours = Math.floor(totalMinutes / 60);
            const totalMins = totalMinutes % 60;
            const avgHours = Math.floor(avgMinutes / 60);
            const avgMins = avgMinutes % 60;
            
            // 更新UI
            const weekPeriodElement = document.getElementById('weekPeriod');
            const weekTotalElement = document.getElementById('weekTotalHours');
            const weekAvgElement = document.getElementById('weekAvgHours');
            
            if (weekPeriodElement) {
                weekPeriodElement.textContent = `${startOfWeek.toISOString().split('T')[0]} 至 ${endOfWeek.toISOString().split('T')[0]}`;
            }
            if (weekTotalElement) {
                weekTotalElement.textContent = `${totalHours}小时${totalMins}分钟`;
            }
            if (weekAvgElement) {
                weekAvgElement.textContent = `${avgHours}小时${avgMins}分钟`;
            }
        } catch (error) {
            console.error('Load weekly data error:', error);
        }
    }

    loadDailyRecords() {
        try {
            const records = this.getRecords();
            const year = this.currentMonthDate.getFullYear();
            const month = this.currentMonthDate.getMonth();
            
            // 筛选指定月份记录
            const monthRecords = records.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.getFullYear() === year && recordDate.getMonth() === month;
            });
            
            // 按日期倒序排序
            const sortedRecords = monthRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            const dailyRecordsElement = document.getElementById('dailyRecords');
            if (!dailyRecordsElement) return;
            
            if (sortedRecords.length === 0) {
                dailyRecordsElement.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 20px;">暂无记录</p>';
                return;
            }
            
            dailyRecordsElement.innerHTML = '';
            sortedRecords.forEach(record => {
                const item = this.createDailyRecordItem(record);
                dailyRecordsElement.appendChild(item);
            });
        } catch (error) {
            console.error('Load daily records error:', error);
        }
    }

    createDailyRecordItem(record) {
        const div = document.createElement('div');
        div.className = 'daily-record';
        
        const date = new Date(record.date);
        const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        const duration = record.on && record.off ? this.calculateDuration(record.on, record.off) : '--:--';
        const [hours, minutes] = duration.split(':').map(Number);
        const durationText = duration !== '--:--' ? `${hours}小时${minutes}分钟` : '--:--';

        // 格式化时间范围显示
        const timeRange = (record.on && record.off) ? 
            `${record.on} - ${record.off}` : 
            '未打卡';

        div.innerHTML = `
            <div class="record-row">
                <div class="record-date">${dateStr}</div>
                <div class="record-time-range">${timeRange}</div>
                <div class="record-duration">${durationText}</div>
                <div class="record-actions">
                    <button class="record-action-btn edit-btn" data-date="${record.date}" title="编辑">✏️</button>
                    <button class="record-action-btn delete-btn" data-date="${record.date}" title="删除">🗑️</button>
                </div>
            </div>
        `;

        // 绑定事件
        this.bindDailyRecordEvents(div, record);

        return div;
    }

    bindDailyRecordEvents(itemElement, record) {
        // 编辑按钮事件
        const editBtn = itemElement.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => {
            this.editRecord(record.date);
        });

        // 删除按钮事件
        const deleteBtn = itemElement.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            this.deleteRecord(record.date);
        });
    }

    updateUI() {
        const clockInBtn = document.getElementById('clockInBtn');

        if (clockInBtn) {
            // 清除所有状态类
            clockInBtn.classList.remove('working', 'finished');

            switch (this.currentState) {
                case 'ready':
                    clockInBtn.disabled = false;
                    clockInBtn.textContent = '上班打卡';
                    break;
                case 'working':
                    clockInBtn.disabled = false;
                    clockInBtn.textContent = '下班打卡';
                    clockInBtn.classList.add('working');
                    break;
                case 'finished':
                    clockInBtn.disabled = false;
                    clockInBtn.textContent = '已完成';
                    clockInBtn.classList.add('finished');
                    break;
            }
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

    // 数据管理功能 - 直接导出文本报告

    // 导出文本报告（类似小程序版本）
    exportTextReport() {
        try {
            const records = this.getRecords();
            if (records.length === 0) {
                this.showNotification('暂无打卡数据', 'error');
                return;
            }

            // 生成文本内容
            const textContent = this.generateTextReport(records);
            
            // 显示预览模态框
            this.showTextPreview(textContent);
            
        } catch (error) {
            console.error('Export text report error:', error);
            this.showNotification('导出失败，请重试', 'error');
        }
    }

    // 生成文本报告
    generateTextReport(records) {
        const now = new Date();
        let content = `工时卫士 - 打卡记录报告\n`;
        content += `生成时间: ${now.toLocaleString('zh-CN')}\n`;
        content += `${'='.repeat(50)}\n\n`;

        // 按月份分组记录
        const recordsByMonth = this.groupRecordsByMonth(records);
        
        // 遍历每个月份的记录
        for (const [monthKey, monthRecords] of Object.entries(recordsByMonth)) {
            const [year, month] = monthKey.split('-');
            const monthTitle = `${year}年${month}月`;

            // 计算当前月份的工时统计
            const monthStats = this.calculateMonthStats(monthRecords);

            // 添加月份工时统计
            content += `${monthTitle}工时统计:\n`;
            content += `${'='.repeat(50)}\n`;
            content += `本月平均工时: ${monthStats.avgHours}\n`;
            content += `本月打卡天数: ${monthStats.workDays}天\n`;
            content += `本月总工时: ${monthStats.totalHours}\n`;
            content += `${'='.repeat(50)}\n\n`;

            // 添加当月详细记录
            content += `${monthTitle}详细记录:\n`;
            content += `${'='.repeat(50)}\n`;

            // 按日期排序（从早到晚）
            monthRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

            monthRecords.forEach(record => {
                const date = new Date(record.date);
                const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
                const weekday = `周${weekdays[date.getDay()]}`;

                content += `${record.date} (${weekday})\n`;
                content += `  上班时间: ${record.on || '未打卡'}\n`;
                content += `  下班时间: ${record.off || '未打卡'}\n`;

                // 计算日工时
                let dailyHours = '未知';
                if (record.on && record.off) {
                    const duration = this.calculateDuration(record.on, record.off);
                    const [hours, minutes] = duration.split(':').map(Number);
                    if (hours > 0 || minutes > 0) {
                        dailyHours = `${hours}小时${minutes}分钟`;
                    }
                }
                content += `  日工时: ${dailyHours}\n`;
                content += `${'-'.repeat(30)}\n`;
            });

            // 添加月份分隔符
            content += `\n`;
        }

        content += `数据说明: 所有数据仅保存在本机，请妥善保管备份。\n`;
        content += `导出工具: 工时卫士 Web版 - https://hours-guard.lightyearai.info`;

        return content;
    }

    // 按月份分组记录
    groupRecordsByMonth(records) {
        const recordsByMonth = {};

        records.forEach(record => {
            if (!record.date) return;

            // 提取年月作为分组键
            const date = new Date(record.date);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

            // 初始化月份分组
            if (!recordsByMonth[monthKey]) {
                recordsByMonth[monthKey] = [];
            }

            // 添加记录到对应月份
            recordsByMonth[monthKey].push(record);
        });

        return recordsByMonth;
    }

    // 计算月份统计
    calculateMonthStats(monthRecords) {
        const completedRecords = monthRecords.filter(r => r.on && r.off);
        const workDays = completedRecords.length;
        
        let totalMinutes = 0;
        completedRecords.forEach(record => {
            const duration = this.calculateDuration(record.on, record.off);
            const [hours, minutes] = duration.split(':').map(Number);
            totalMinutes += hours * 60 + minutes;
        });

        const avgMinutes = workDays > 0 ? Math.round(totalMinutes / workDays) : 0;
        const totalHours = Math.floor(totalMinutes / 60);
        const totalMins = totalMinutes % 60;
        const avgHours = Math.floor(avgMinutes / 60);
        const avgMins = avgMinutes % 60;

        return {
            workDays,
            totalHours: totalHours > 0 || totalMins > 0 ? `${totalHours}小时${totalMins}分钟` : '0小时',
            avgHours: avgHours > 0 || avgMins > 0 ? `${avgHours}小时${avgMins}分钟` : '0小时'
        };
    }

    // 显示文本预览
    showTextPreview(textContent) {
        const modal = document.getElementById('textPreviewModal');
        const textContentElement = document.getElementById('textContent');
        const copyBtn = document.getElementById('copyText');
        const downloadBtn = document.getElementById('downloadText');
        
        if (!modal || !textContentElement || !copyBtn || !downloadBtn) {
            console.error('文本预览模态框元素未找到');
            this.showNotification('预览功能暂不可用', 'error');
            return;
        }
        
        const closeBtn = modal.querySelector('.close');

        textContentElement.textContent = textContent;
        modal.style.display = 'block';

        const closeModal = () => {
            modal.style.display = 'none';
        };

        // 移除之前的事件监听器
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        const newCopyBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
        
        const newDownloadBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);

        // 绑定新的事件监听器
        newCloseBtn.addEventListener('click', closeModal);
        
        newCopyBtn.addEventListener('click', () => {
            this.copyToClipboard(textContent);
        });

        newDownloadBtn.addEventListener('click', () => {
            this.downloadTextFile(textContent);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // 复制到剪贴板
    copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('已复制到剪贴板');
            }).catch(err => {
                console.error('Copy failed:', err);
                this.fallbackCopyToClipboard(text);
            });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    }

    // 备用复制方法
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showNotification('已复制到剪贴板');
        } catch (err) {
            console.error('Fallback copy failed:', err);
            this.showNotification('复制失败，请手动复制', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    // 下载文本文件
    downloadTextFile(content) {
        try {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const filename = `工时记录_${dateStr}.txt`;
            
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification(`文件已下载：${filename}`);
        } catch (error) {
            console.error('Download failed:', error);
            this.showNotification('下载失败，请重试', 'error');
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



    loadStorageStats() {
        if (window.storageManager) {
            const stats = window.storageManager.getStorageStats();
            if (stats) {
                const statsElement = document.getElementById('storageStats');
                if (statsElement) {
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
                // 如果没有storageStats元素，就不显示统计信息，这是正常的
            }
        }
    }
}

// 应用类定义完成，等待HTML中的初始化调用