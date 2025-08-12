class I18nManager {
    constructor() {
        this.currentLang = this.detectLanguage();
        this.translations = {
            'zh': {
                'app.title': '工时守护',
                'app.description': '简单高效的上下班打卡工具，帮助您记录工作时间',
                'header.title': '工时守护',
                'header.language': '切换语言',
                'header.export': '导出数据',
                
                'clock.currentTime': '当前时间',
                'clock.in': '上班打卡',
                'clock.out': '下班打卡',
                'clock.alreadyIn': '今日已打卡上班',
                'clock.alreadyOut': '今日已打卡下班',
                'clock.confirmIn': '确认上班打卡？',
                'clock.confirmOut': '确认下班打卡？',
                
                'status.ready': '准备就绪',
                'status.working': '工作中',
                'status.finished': '今日工作已完成',
                'status.rest': '休息中',
                
                'today.title': '今日统计',
                'today.startTime': '上班时间',
                'today.endTime': '下班时间',
                'today.duration': '工作时长',
                'today.noRecord': '今日暂无记录',
                
                'history.title': '历史记录',
                'history.date': '日期',
                'history.start': '开始',
                'history.end': '结束',
                'history.duration': '时长',
                'history.status': '状态',
                'history.expand': '展开',
                'history.collapse': '收起',
                'history.noData': '暂无历史记录',
                'history.delete': '删除',
                'history.deleteConfirm': '确认删除这条记录？',
                
                'monthly.title': '月度统计',
                'monthly.selectMonth': '选择月份',
                'monthly.workDays': '工作天数',
                'monthly.totalHours': '总工作时长',
                'monthly.avgHours': '平均工作时长',
                'monthly.overtimeDays': '加班天数',
                'monthly.noData': '本月暂无数据',
                
                'export.title': '导出数据',
                'export.csv': '导出CSV',
                'export.image': '导出图片',
                'export.downloading': '正在生成...',
                'export.success': '导出成功',
                'export.error': '导出失败',
                
                'error.network': '网络连接错误',
                'error.storage': '数据存储错误',
                'error.unknown': '未知错误',
                
                'time.hour': '小时',
                'time.minute': '分钟',
                'time.second': '秒',
                'time.format': 'YYYY年MM月DD日 HH:mm',
                'time.shortFormat': 'MM月DD日',
                
                'weekday.mon': '周一',
                'weekday.tue': '周二',
                'weekday.wed': '周三',
                'weekday.thu': '周四',
                'weekday.fri': '周五',
                'weekday.sat': '周六',
                'weekday.sun': '周日'
            },
            'en': {
                'app.title': 'Hours Guard',
                'app.description': 'Simple and efficient work time tracking tool to help you record working hours',
                'header.title': 'Hours Guard',
                'header.language': 'Switch Language',
                'header.export': 'Export Data',
                
                'clock.currentTime': 'Current Time',
                'clock.in': 'Clock In',
                'clock.out': 'Clock Out',
                'clock.alreadyIn': 'Already clocked in today',
                'clock.alreadyOut': 'Already clocked out today',
                'clock.confirmIn': 'Confirm clock in?',
                'clock.confirmOut': 'Confirm clock out?',
                
                'status.ready': 'Ready',
                'status.working': 'Working',
                'status.finished': 'Work finished today',
                'status.rest': 'Resting',
                
                'today.title': 'Today\'s Statistics',
                'today.startTime': 'Start Time',
                'today.endTime': 'End Time',
                'today.duration': 'Duration',
                'today.noRecord': 'No records today',
                
                'history.title': 'History Records',
                'history.date': 'Date',
                'history.start': 'Start',
                'history.end': 'End',
                'history.duration': 'Duration',
                'history.status': 'Status',
                'history.expand': 'Expand',
                'history.collapse': 'Collapse',
                'history.noData': 'No history records',
                'history.delete': 'Delete',
                'history.deleteConfirm': 'Confirm delete this record?',
                
                'monthly.title': 'Monthly Statistics',
                'monthly.selectMonth': 'Select Month',
                'monthly.workDays': 'Work Days',
                'monthly.totalHours': 'Total Hours',
                'monthly.avgHours': 'Average Hours',
                'monthly.overtimeDays': 'Overtime Days',
                'monthly.noData': 'No data this month',
                
                'export.title': 'Export Data',
                'export.csv': 'Export CSV',
                'export.image': 'Export Image',
                'export.downloading': 'Generating...',
                'export.success': 'Export successful',
                'export.error': 'Export failed',
                
                'error.network': 'Network connection error',
                'error.storage': 'Data storage error',
                'error.unknown': 'Unknown error',
                
                'time.hour': 'hour',
                'time.minute': 'minute',
                'time.second': 'second',
                'time.format': 'YYYY-MM-DD HH:mm',
                'time.shortFormat': 'MM-DD',
                
                'weekday.mon': 'Mon',
                'weekday.tue': 'Tue',
                'weekday.wed': 'Wed',
                'weekday.thu': 'Thu',
                'weekday.fri': 'Fri',
                'weekday.sat': 'Sat',
                'weekday.sun': 'Sun'
            }
        };
    }

    detectLanguage() {
        const saved = localStorage.getItem('language');
        if (saved && this.translations[saved]) {
            return saved;
        }
        
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
        return langCode;
    }

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            this.updateUI();
            document.documentElement.lang = lang;
        }
    }

    t(key, params = {}) {
        let text = this.translations[this.currentLang][key] || key;
        
        // 替换参数
        Object.keys(params).forEach(param => {
            text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
        });
        
        return text;
    }

    updateUI() {
        // 更新文本内容
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = this.t(key);
            if (element.tagName === 'INPUT' && element.type !== 'button') {
                element.placeholder = text;
            } else {
                element.textContent = text;
            }
        });

        // 更新title属性
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // 更新meta标签
        document.querySelectorAll('[data-i18n-meta]').forEach(element => {
            const key = element.getAttribute('data-i18n-meta');
            const content = this.t(key);
            if (element.tagName === 'META' && element.name === 'description') {
                element.content = content;
            }
        });

        // 更新页面标题
        const titleKey = document.title.includes('工时守护') || document.title.includes('Hours Guard') ? 'app.title' : null;
        if (titleKey) {
            document.title = this.t(titleKey);
        }
    }

    formatTime(date, format = 'time.format') {
        const d = new Date(date);
        const formatStr = this.t(format);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        
        return formatStr
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes);
    }

    formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}${this.t('time.hour')} ${minutes}${this.t('time.minute')}`;
        } else if (minutes > 0) {
            return `${minutes}${this.t('time.minute')} ${seconds}${this.t('time.second')}`;
        } else {
            return `${seconds}${this.t('time.second')}`;
        }
    }

    getWeekday(date) {
        const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayIndex = new Date(date).getDay();
        return this.t(`weekday.${weekdays[dayIndex]}`);
    }
}

// 创建全局实例
window.i18n = new I18nManager();

// 初始化语言
document.addEventListener('DOMContentLoaded', () => {
    i18n.setLanguage(i18n.detectLanguage());
});