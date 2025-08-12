// 导出功能模块
class ExportManager {
    constructor() {
        this.csvSeparator = ',';
        this.csvQuote = '"';
    }

    async exportToCSV(records) {
        try {
            if (!records || records.length === 0) {
                throw new Error('No records to export');
            }

            // CSV头部
            const headers = [
                '日期',
                '上班时间',
                '下班时间',
                '工作时长（小时）',
                '工作时长（分钟）',
                '星期'
            ];

            // 生成CSV内容
            const csvRows = [headers.join(this.csvSeparator)];

            records.forEach(record => {
                if (record.clockIn && record.clockOut) {
                    const date = new Date(record.date);
                    const clockInTime = new Date(record.clockIn);
                    const clockOutTime = new Date(record.clockOut);
                    
                    // 计算工作时长
                    const durationMs = clockOutTime - clockInTime;
                    const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);
                    const durationMinutes = Math.round(durationMs / (1000 * 60));
                    
                    // 星期
                    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                    const weekday = weekdays[date.getDay()];

                    const row = [
                        this.escapeCSV(record.date),
                        this.escapeCSV(clockInTime.toLocaleTimeString('zh-CN', { hour12: false })),
                        this.escapeCSV(clockOutTime.toLocaleTimeString('zh-CN', { hour12: false })),
                        durationHours,
                        durationMinutes,
                        this.escapeCSV(weekday)
                    ];

                    csvRows.push(row.join(this.csvSeparator));
                }
            });

            const csvContent = csvRows.join('\n');
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            
            this.downloadFile(blob, `工时记录_${this.getCurrentDate()}.csv`);
            
        } catch (error) {
            console.error('CSV export error:', error);
            throw error;
        }
    }

    async exportToImage(records) {
        try {
            if (!records || records.length === 0) {
                throw new Error('No records to export');
            }

            // 创建画布
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 设置画布尺寸
            const padding = 40;
            const rowHeight = 40;
            const headerHeight = 60;
            const width = 800;
            const height = padding * 2 + headerHeight + (Math.min(records.length, 20) * rowHeight) + 60;
            
            canvas.width = width;
            canvas.height = height;

            // 设置背景
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            // 标题
            ctx.fillStyle = '#007AFF';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('工时记录汇总', width / 2, padding + 20);

            // 统计信息
            const completedRecords = records.filter(r => r.clockIn && r.clockOut);
            const totalHours = completedRecords.reduce((total, record) => {
                if (record.clockIn && record.clockOut) {
                    const duration = new Date(record.clockOut) - new Date(record.clockIn);
                    return total + (duration / (1000 * 60 * 60));
                }
                return total;
            }, 0);

            ctx.fillStyle = '#666666';
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`总记录数: ${records.length}`, padding, padding + 50);
            ctx.fillText(`完成记录: ${completedRecords.length}`, padding + 150, padding + 50);
            ctx.fillText(`总工时: ${totalHours.toFixed(1)}小时`, padding + 300, padding + 50);
            ctx.fillText(`导出日期: ${this.getCurrentDate()}`, padding + 450, padding + 50);

            // 表格标题
            const headers = ['日期', '上班时间', '下班时间', '工作时长', '星期'];
            const colWidths = [120, 100, 100, 80, 60];
            let x = padding;
            
            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(padding, padding + headerHeight - 10, width - padding * 2, 30);

            ctx.fillStyle = '#333333';
            ctx.font = 'bold 14px Arial';
            headers.forEach((header, index) => {
                ctx.fillText(header, x, padding + headerHeight + 10);
                x += colWidths[index];
            });

            // 表格内容
            const displayRecords = completedRecords.slice(0, 20); // 最多显示20条
            ctx.font = '14px Arial';
            
            displayRecords.forEach((record, index) => {
                const y = padding + headerHeight + 30 + (index * rowHeight);
                x = padding;
                
                // 背景条纹
                if (index % 2 === 0) {
                    ctx.fillStyle = '#fafafa';
                    ctx.fillRect(padding, y - 15, width - padding * 2, rowHeight);
                }

                ctx.fillStyle = '#333333';
                
                // 日期
                const date = new Date(record.date);
                const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                const weekday = weekdays[date.getDay()];
                
                ctx.fillText(record.date, x, y);
                x += colWidths[0];
                
                // 上班时间
                const clockInTime = new Date(record.clockIn);
                ctx.fillText(clockInTime.toLocaleTimeString('zh-CN', { hour12: false }), x, y);
                x += colWidths[1];
                
                // 下班时间
                const clockOutTime = new Date(record.clockOut);
                ctx.fillText(clockOutTime.toLocaleTimeString('zh-CN', { hour12: false }), x, y);
                x += colWidths[2];
                
                // 工作时长
                const durationMs = clockOutTime - clockInTime;
                const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(1);
                ctx.fillText(`${durationHours}h`, x, y);
                x += colWidths[3];
                
                // 星期
                ctx.fillText(weekday, x, y);
            });

            // 添加水印
            if (displayRecords.length === completedRecords.length) {
                ctx.fillStyle = '#cccccc';
                ctx.font = '12px Arial';
                ctx.textAlign = 'right';
                ctx.fillText('工时卫士 - Hours Guard', width - padding, height - 20);
            } else {
                ctx.fillStyle = '#666666';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`仅显示前20条记录，共${completedRecords.length}条`, width / 2, height - 20);
            }

            // 转换为图片并下载
            canvas.toBlob(blob => {
                this.downloadFile(blob, `工时记录_${this.getCurrentDate()}.png`);
            }, 'image/png');
            
        } catch (error) {
            console.error('Image export error:', error);
            throw error;
        }
    }

    escapeCSV(value) {
        if (typeof value !== 'string') {
            value = String(value);
        }
        
        // 如果包含特殊字符，需要加引号
        if (value.includes(this.csvSeparator) || value.includes('\n') || value.includes('\r') || value.includes(this.csvQuote)) {
            value = value.replace(/"/g, '""');
            return `${this.csvQuote}${value}${this.csvQuote}`;
        }
        
        return value;
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 清理URL对象
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    }

    async exportToJSON(records) {
        try {
            const exportData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                totalRecords: records.length,
                records: records.map(record => ({
                    ...record,
                    formattedDate: new Date(record.date).toLocaleDateString('zh-CN'),
                    formattedClockIn: record.clockIn ? new Date(record.clockIn).toLocaleTimeString('zh-CN') : null,
                    formattedClockOut: record.clockOut ? new Date(record.clockOut).toLocaleTimeString('zh-CN') : null
                }))
            };

            const jsonContent = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            
            this.downloadFile(blob, `工时记录_${this.getCurrentDate()}.json`);
            
        } catch (error) {
            console.error('JSON export error:', error);
            throw error;
        }
    }

    async exportToExcel(records) {
        try {
            // 创建简单的HTML表格用于Excel导入
            const table = document.createElement('table');
            table.style.borderCollapse = 'collapse';
            table.style.width = '100%';

            // 表头
            const thead = document.createElement('thead');
            const headers = ['日期', '上班时间', '下班时间', '工作时长（小时）', '工作时长（分钟）', '星期'];
            const headerRow = document.createElement('tr');
            
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                th.style.border = '1px solid #ddd';
                th.style.padding = '8px';
                th.style.backgroundColor = '#f2f2f2';
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // 表体
            const tbody = document.createElement('tbody');
            records.forEach(record => {
                if (record.clockIn && record.clockOut) {
                    const row = document.createElement('tr');
                    
                    const date = new Date(record.date);
                    const clockInTime = new Date(record.clockIn);
                    const clockOutTime = new Date(record.clockOut);
                    
                    const durationMs = clockOutTime - clockInTime;
                    const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);
                    const durationMinutes = Math.round(durationMs / (1000 * 60));
                    
                    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                    const weekday = weekdays[date.getDay()];

                    const values = [
                        record.date,
                        clockInTime.toLocaleTimeString('zh-CN', { hour12: false }),
                        clockOutTime.toLocaleTimeString('zh-CN', { hour12: false }),
                        durationHours,
                        durationMinutes,
                        weekday
                    ];

                    values.forEach(value => {
                        const td = document.createElement('td');
                        td.textContent = value;
                        td.style.border = '1px solid #ddd';
                        td.style.padding = '8px';
                        row.appendChild(td);
                    });

                    tbody.appendChild(row);
                }
            });

            table.appendChild(tbody);

            // 转换为HTML并下载
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>工时记录</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #333; text-align: center; }
                        .info { margin-bottom: 20px; color: #666; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>工时记录汇总</h1>
                    <div class="info">
                        <p>导出日期: ${this.getCurrentDate()}</p>
                        <p>总记录数: ${records.length}</p>
                        <p>完成记录: ${records.filter(r => r.clockIn && r.clockOut).length}</p>
                    </div>
                    ${table.outerHTML}
                </body>
                </html>
            `;

            const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            this.downloadFile(blob, `工时记录_${this.getCurrentDate()}.xls`);
            
        } catch (error) {
            console.error('Excel export error:', error);
            throw error;
        }
    }

    async printRecords(records) {
        try {
            const printWindow = window.open('', '_blank');
            
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>工时记录 - 打印</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #333; text-align: center; margin-bottom: 10px; }
                        .info { margin-bottom: 20px; color: #666; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        @media print {
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h1>工时记录汇总</h1>
                    <div class="info">
                        <p>导出日期: ${this.getCurrentDate()}</p>
                        <p>总记录数: ${records.length}</p>
                        <p>完成记录: ${records.filter(r => r.clockIn && r.clockOut).length}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>日期</th>
                                <th>上班时间</th>
                                <th>下班时间</th>
                                <th>工作时长</th>
                                <th>星期</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(record => {
                                if (record.clockIn && record.clockOut) {
                                    const date = new Date(record.date);
                                    const clockInTime = new Date(record.clockIn);
                                    const clockOutTime = new Date(record.clockOut);
                                    const durationMs = clockOutTime - clockInTime;
                                    const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(1);
                                    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                                    const weekday = weekdays[date.getDay()];
                                    
                                    return `
                                        <tr>
                                            <td>${record.date}</td>
                                            <td>${clockInTime.toLocaleTimeString('zh-CN', { hour12: false })}</td>
                                            <td>${clockOutTime.toLocaleTimeString('zh-CN', { hour12: false })}</td>
                                            <td>${durationHours}小时</td>
                                            <td>${weekday}</td>
                                        </tr>
                                    `;
                                }
                                return '';
                            }).join('')}
                        </tbody>
                    </table>
                    <div class="no-print" style="text-align: center; margin-top: 20px;">
                        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
                            打印
                        </button>
                        <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">
                            关闭
                        </button>
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
        } catch (error) {
            console.error('Print error:', error);
            throw error;
        }
    }
}

// 创建全局导出管理器实例
const exportManager = new ExportManager();