// 国际化模块
class I18nManager {
    constructor() {
        this.currentLang = this.detectLanguage();
        this.translations = {
            'zh-CN': {
                'app.title': '工时卫士',
                'app.description': '简单易用的工时记录工具',
                'clock.in': '上班打卡',
                'clock.out': '下班打卡',
                'clock.in.success': '上班打卡成功！',
                'clock.out.success': '下班打卡成功！',
                'clock.in.time': '上班时间',
                'clock.out.time': '下班时间',
                'work.duration': '工作时长',
                'today.stats': '今日统计',
                'history.records': '历史记录',
                'monthly.stats': '月度统计',
                'export.data': '导出数据',
                'export.csv': '导出CSV',
                'export.image': '导出图片',
                'status.ready': '准备就绪',
                'status.working': '工作中...',
                'status.completed': '今日工作已完成',
                'no.data': '暂无记录',
                'work.days': '工作天数',
                'average.duration': '平均工作时长',
                'total.duration': '本月总时长',
                'previous.month': '上个月',
                'next.month': '下个月',
                'toggle.history': '展开/收起',
                'install.app': '安装应用',
                'language.switch': '切换语言',
                'notification.success': '操作成功',
                'notification.error': '操作失败',
                'date.today': '今天',
                'date.yesterday': '昨天',
                'time.format': '24小时制',
                'confirm.clear': '确定要清除所有数据吗？',
                'data.cleared': '数据已清除',
                'data.exported': '数据已导出',
                'data.imported': '数据已导入',
                'invalid.data': '数据格式无效',
                'backup.created': '备份已创建',
                'backup.restored': '备份已恢复'
            },
            'en-US': {
                'app.title': 'Hours Guard',
                'app.description': 'Simple and easy-to-use work time tracking tool',
                'clock.in': 'Clock In',
                'clock.out': 'Clock Out',
                'clock.in.success': 'Clocked in successfully!',
                'clock.out.success': 'Clocked out successfully!',
                'clock.in.time': 'Clock In Time',
                'clock.out.time': 'Clock Out Time',
                'work.duration': 'Work Duration',
                'today.stats': 'Today\'s Statistics',
                'history.records': 'History Records',
                'monthly.stats': 'Monthly Statistics',
                'export.data': 'Export Data',
                'export.csv': 'Export CSV',
                'export.image': 'Export Image',
                'status.ready': 'Ready',
                'status.working': 'Working...',
                'status.completed': 'Today\'s work completed',
                'no.data': 'No records yet',
                'work.days': 'Work Days',
                'average.duration': 'Average Duration',
                'total.duration': 'Total Duration',
                'previous.month': 'Previous Month',
                'next.month': 'Next Month',
                'toggle.history': 'Toggle History',
                'install.app': 'Install App',
                'language.switch': 'Switch Language',
                'notification.success': 'Operation successful',
                'notification.error': 'Operation failed',
                'date.today': 'Today',
                'date.yesterday': 'Yesterday',
                'time.format': '24-hour format',
                'confirm.clear': 'Are you sure you want to clear all data?',
                'data.cleared': 'Data cleared',
                'data.exported': 'Data exported',
                'data.imported': 'Data imported',
                'invalid.data': 'Invalid data format',
                'backup.created': 'Backup created',
                'backup.restored': 'Backup restored'
            }
        };
    }

    detectLanguage() {
        // 检测浏览器语言
        const browserLang = navigator.language || navigator.userLanguage;
        
        // 支持的语言列表
        const supportedLangs = ['zh-CN', 'en-US'];
        
        // 精确匹配
        if (supportedLangs.includes(browserLang)) {
            return browserLang;
        }
        
        // 语言前缀匹配
        const langPrefix = browserLang.split('-')[0];
        const matchedLang = supportedLangs.find(lang => lang.startsWith(langPrefix));
        
        return matchedLang || 'zh-CN'; // 默认中文
    }

    t(key, params = {}) {
        const translation = this.translations[this.currentLang][key] || key;
        
        // 简单的参数替换
        return translation.replace(/\{(\w+)\}/g, (match, param) => {
            return params[param] !== undefined ? params[param] : match;
        });
    }

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('hoursGuard_language', lang);
            this.updateDocumentLang();
            this.updateUIText();
            return true;
        }
        return false;
    }

    getLanguage() {
        return this.currentLang;
    }

    toggleLanguage() {
        const newLang = this.currentLang === 'zh-CN' ? 'en-US' : 'zh-CN';
        this.setLanguage(newLang);
    }

    updateDocumentLang() {
        document.documentElement.lang = this.currentLang;
        
        // 更新页面标题
        document.title = this.t('app.title');
        
        // 更新meta描述
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = this.t('app.description');
        }
    }

    updateUIText() {
        // 更新所有带有data-i18n属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: this.currentLang } 
        }));
    }

    // 获取当前语言的日期格式
    getDateFormat() {
        const formats = {
            'zh-CN': {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            },
            'en-US': {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            }
        };
        return formats[this.currentLang] || formats['zh-CN'];
    }

    // 获取当前语言的时间格式
    getTimeFormat() {
        const formats = {
            'zh-CN': {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            },
            'en-US': {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }
        };
        return formats[this.currentLang] || formats['zh-CN'];
    }

    // 格式化日期
    formatDate(date, options = {}) {
        const defaultOptions = this.getDateFormat();
        return new Date(date).toLocaleDateString(this.currentLang, { ...defaultOptions, ...options });
    }

    // 格式化时间
    formatTime(date, options = {}) {
        const defaultOptions = this.getTimeFormat();
        return new Date(date).toLocaleTimeString(this.currentLang, { ...defaultOptions, ...options });
    }

    // 格式化日期时间
    formatDateTime(date, options = {}) {
        return this.formatDate(date, options) + ' ' + this.formatTime(date, options);
    }

    // 获取相对时间描述
    getRelativeTimeDescription(date) {
        const now = new Date();
        const target = new Date(date);
        const diffMs = now - target;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return this.t('date.today');
        } else if (diffDays === 1) {
            return this.t('date.yesterday');
        } else if (diffDays < 7) {
            return `${diffDays} ${this.currentLang === 'zh-CN' ? '天前' : 'days ago'}`;
        } else {
            return this.formatDate(date);
        }
    }

    // 获取月份名称
    getMonthName(monthIndex) {
        const monthNames = {
            'zh-CN': ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
            'en-US': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        };
        return monthNames[this.currentLang][monthIndex];
    }

    // 获取星期名称
    getWeekdayName(dayIndex) {
        const weekdayNames = {
            'zh-CN': ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
            'en-US': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        };
        return weekdayNames[this.currentLang][dayIndex];
    }

    // 获取支持的语言列表
    getSupportedLanguages() {
        return Object.keys(this.translations);
    }

    // 获取语言显示名称
    getLanguageDisplayName(lang) {
        const displayNames = {
            'zh-CN': '简体中文',
            'en-US': 'English'
        };
        return displayNames[lang] || lang;
    }

    // 初始化语言
    initializeLanguage() {
        // 从本地存储恢复语言设置
        const savedLang = localStorage.getItem('hoursGuard_language');
        if (savedLang && this.translations[savedLang]) {
            this.currentLang = savedLang;
        }
        
        this.updateDocumentLang();
    }

    // 添加新语言
    addLanguage(lang, translations) {
        if (!this.translations[lang]) {
            this.translations[lang] = translations;
            return true;
        }
        return false;
    }

    // 更新翻译
    updateTranslation(lang, key, value) {
        if (this.translations[lang]) {
            this.translations[lang][key] = value;
            return true;
        }
        return false;
    }
}

// 创建全局国际化实例
const i18n = new I18nManager();

// 初始化语言
document.addEventListener('DOMContentLoaded', () => {
    i18n.initializeLanguage();
});