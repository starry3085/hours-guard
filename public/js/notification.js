// 通知管理器
class NotificationManager {
    constructor() {
        this.container = null;
        this.createContainer();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        this.container.appendChild(notification);
        
        // 触发动画
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease';
        }, 10);
        
        // 自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
        
        // 点击移除
        notification.addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }

    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    error(message, duration = 3000) {
        this.show(message, 'error', duration);
    }

    warning(message, duration = 3000) {
        this.show(message, 'warning', duration);
    }

    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }
}

// 全局通知实例
window.notificationManager = new NotificationManager();