// Глобальные переменные
let currentEmployeeId = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadEmployees();
    loadSalaryHistory();
    loadStatistics();
    
    // Установка текущей даты в поле даты
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Добавление обработчиков событий
    setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Поиск сотрудников
    const searchInput = document.getElementById('search-employee');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filterEmployees(e.target.value);
        });
    }
}

// Переключение между вкладками
function switchTab(tabName) {
    // Скрыть все вкладки
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Убрать активный класс со всех кнопок
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Показать выбранную вкладку
    document.getElementById(tabName).classList.add('active');
    
    // Активировать соответствующую кнопку
    const activeButton = Array.from(tabButtons).find(button => 
        button.textContent.includes(getTabTitle(tabName))
    );
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Обновить данные при переключении на определенные вкладки
    if (tabName === 'employees') {
        loadEmployees();
    } else if (tabName === 'history') {
        loadSalaryHistory();
    } else if (tabName === 'statistics') {
        loadStatistics();
    }
}

// Получение заголовка вкладки по ID
function getTabTitle(tabId) {
    const titles = {
        'quick-calc': 'Быстрый расчет',
        'employees': 'Сотрудники',
        'history': 'История расчетов',
        'statistics': 'Статистика'
    };
    return titles[tabId] || tabId;
}

// ========== БЫСТРЫЙ РАСЧЕТ ==========
async function calculateQuick() {
    const rate = parseFloat(document.getElementById('rate').value);
    const hours = parseFloat(document.getElementById('hours').value);
    const bonus = parseFloat(document.getElementById('bonus').value) || 0;
    const deductions = parseFloat(document.getElementById('deductions').value) || 0;
    const taxRate = parseFloat(document.getElementById('tax-rate').value) || 13;
    
    // Валидация
    if (!rate || !hours || rate <= 0 || hours <= 0) {
        showMessage('Введите корректные значения ставки и часов', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/quick_calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                rate: rate,
                hours: hours,
                bonus: bonus,
                deductions: deductions,
                tax_rate: taxRate
            })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка расчета');
        }
        
        const result = await response.json();
        displayQuickResult(result);
        
    } catch (error) {
        showMessage('Ошибка при расчете: ' + error.message, 'error');
    }
}

// Отображение результата быстрого расчета
function displayQuickResult(result) {
    const resultContainer = document.getElementById('quick-result');
    const detailsContainer = document.getElementById('quick-result-details');
    
    const html = `
        <div class="salary-breakdown">
            <div class="salary-item">
                <div class="salary-label">Базовая зарплата</div>
                <div class="salary-value">${result.base_salary.toFixed(2)} руб.</div>
            </div>
            <div class="salary-item">
                <div class="salary-label">Премия</div>
                <div class="salary-value positive">+ ${result.bonus.toFixed(2)} руб.</div>
            </div>
            <div class="salary-item">
                <div class="salary-label">Вычеты</div>
                <div class="salary-value negative">- ${result.deductions.toFixed(2)} руб.</div>
            </div>
            <div class="salary-item">
                <div class="salary-label">Начислено всего</div>
                <div class="salary-value">${result.gross_salary.toFixed(2)} руб.</div>
            </div>
            <div class="salary-item">
                <div class="salary-label">НДФЛ (${result.tax_rate}%)</div>
                <div class="salary-value negative">- ${result.tax_amount.toFixed(2)} руб.</div>
            </div>
            <div class="salary-item">
                <div class="salary-label">К выплате</div>
                <div class="salary-value positive" style="font-size: 1.5rem;">${result.net_salary.toFixed(2)} руб.</div>
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px; padding: 15px; background: #e8f4fc; border-radius: 8px;">
            <strong>Итого:</strong> ${result.detailed}
        </div>
    `;
    
    detailsContainer.innerHTML = html;
    resultContainer.style.display = 'block';
    
    // Прокрутка к результатам
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// ========== СОТРУДНИКИ ==========
// Загрузка списка сотрудников
async function loadEmployees() {
    const container = document.getElementById('employees-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Загрузка сотрудников...</div>';
    
    try {
        const response = await fetch('/api/employees');
        if (!response.ok) throw new Error('Ошибка загрузки сотрудников');
        
        const employees = await response.json();
        displayEmployees(employees);
        
    } catch (error) {
        container.innerHTML = `
            <div class="message error">
                Ошибка загрузки сотрудников: ${error.message}
            </div>
        `;
    }
}

// Отображение списка сотрудников
function displayEmployees(employees) {
    const container = document.getElementById('employees-container');
    
    if (!employees || employees.length === 0) {
        container.innerHTML = `
            <div class="message info">
                <i class="fas fa-info-circle"></i> Сотрудники не найдены. Добавьте первого сотрудника.
            </div>
        `;
        return;
    }
    
    let html = '';
    employees.forEach(employee => {
        const monthlySalary = employee.rate * employee.hours_worked;
        
        html += `
            <div class="employee-card" id="employee-${employee.id}">
                <div class="employee-header">
                    <div>
                        <div class="employee-name">${employee.name}</div>
                        <div class="employee-position">${employee.position}</div>
                    </div>
                    <div class="employee-actions">
                        <button onclick="calculateEmployeeSalary(${employee.id})" class="btn btn-primary">
                            <i class="fas fa-calculator"></i> Рассчитать
                        </button>
                        <button onclick="editEmployee(${employee.id})" class="btn btn-warning">
                            <i class="fas fa-edit"></i> Редактировать
                        </button>
                        <button onclick="deleteEmployee(${employee.id})" class="btn btn-danger">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </div>
                <div class="employee-details">
                    <div class="detail-item">
                        <span class="detail-label">Ставка в час:</span>
                        <span class="detail-value">${employee.rate.toFixed(2)} руб.</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Отработано часов:</span>
                        <span class="detail-value">${employee.hours_worked} ч.</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Премия:</span>
                        <span class="detail-value">${employee.bonus ? employee.bonus.toFixed(2) : '0.00'} руб.</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Примерная зарплата:</span>
                        <span class="detail-value">${monthlySalary.toFixed(2)} руб.</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Фильтрация сотрудников
function filterEmployees(searchTerm) {
    const employees = document.querySelectorAll('.employee-card');
    searchTerm = searchTerm.toLowerCase();
    
    employees.forEach(employee => {
        const name = employee.querySelector('.employee-name').textContent.toLowerCase();
        const position = employee.querySelector('.employee-position').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || position.includes(searchTerm)) {
            employee.style.display = 'block';
        } else {
            employee.style.display = 'none';
        }
    });
}

// Показать форму добавления сотрудника
function showAddEmployeeForm() {
    document.getElementById('employee-form-container').style.display = 'block';
    document.getElementById('form-title').textContent = 'Добавить нового сотрудника';
    document.getElementById('save-btn').innerHTML = '<i class="fas fa-save"></i> Сохранить';
    document.getElementById('emp-id').value = '';
    
    // Очистить поля формы
    document.getElementById('emp-name').value = '';
    document.getElementById('emp-position').value = 'Менеджер';
    document.getElementById('emp-rate').value = '500';
    document.getElementById('emp-hours').value = '160';
    document.getElementById('emp-bonus').value = '0';
    document.getElementById('emp-deductions').value = '0';
    document.getElementById('emp-tax-rate').value = '13';
    
    // Прокрутить к форме
    document.getElementById('employee-form-container').scrollIntoView({ behavior: 'smooth' });
}

// Редактирование сотрудника
async function editEmployee(employeeId) {
    try {
        const response = await fetch(`/api/employees/${employeeId}`);
        if (!response.ok) throw new Error('Ошибка загрузки данных сотрудника');
        
        const employee = await response.json();
        
        // Заполнить форму данными сотрудника
        document.getElementById('emp-id').value = employee.id;
        document.getElementById('emp-name').value = employee.name;
        document.getElementById('emp-position').value = employee.position;
        document.getElementById('emp-rate').value = employee.rate;
        document.getElementById('emp-hours').value = employee.hours_worked;
        document.getElementById('emp-bonus').value = employee.bonus || 0;
        document.getElementById('emp-deductions').value = employee.deductions || 0;
        document.getElementById('emp-tax-rate').value = employee.tax_rate || 13;
        
        document.getElementById('form-title').textContent = 'Редактировать сотрудника';
        document.getElementById('save-btn').innerHTML = '<i class="fas fa-save"></i> Обновить';
        document.getElementById('employee-form-container').style.display = 'block';
        
        // Прокрутить к форме
        document.getElementById('employee-form-container').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        showMessage('Ошибка при загрузке данных сотрудника: ' + error.message, 'error');
    }
}

// Сохранение сотрудника
async function saveEmployee() {
    const employeeId = document.getElementById('emp-id').value;
    const employee = {
        name: document.getElementById('emp-name').value,
        position: document.getElementById('emp-position').value,
        rate: parseFloat(document.getElementById('emp-rate').value),
        hours_worked: parseFloat(document.getElementById('emp-hours').value),
        bonus: parseFloat(document.getElementById('emp-bonus').value) || 0,
        deductions: parseFloat(document.getElementById('emp-deductions').value) || 0,
        tax_rate: parseFloat(document.getElementById('emp-tax-rate').value) || 13
    };
    
    // Валидация
    if (!employee.name || !employee.position) {
        showMessage('Заполните ФИО и должность', 'error');
        return;
    }
    
    if (employee.rate <= 0 || employee.hours_worked <= 0) {
        showMessage('Ставка и количество часов должны быть положительными числами', 'error');
        return;
    }
    
    try {
        let response;
        if (employeeId) {
            // Обновление существующего сотрудника
            response = await fetch(`/api/employees/${employeeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(employee)
            });
        } else {
            // Создание нового сотрудника
            response = await fetch('/api/employees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(employee)
            });
        }
        
        if (!response.ok) {
            throw new Error('Ошибка сохранения сотрудника');
        }
        
        const result = await response.json();
        showMessage(
            employeeId ? 'Сотрудник успешно обновлен!' : 'Сотрудник успешно добавлен!',
            'success'
        );
        
        // Закрыть форму и обновить список
        cancelEmployeeForm();
        loadEmployees();
        
    } catch (error) {
        showMessage('Ошибка при сохранении сотрудника: ' + error.message, 'error');
    }
}

// Отмена формы сотрудника
function cancelEmployeeForm() {
    document.getElementById('employee-form-container').style.display = 'none';
    document.getElementById('emp-id').value = '';
}

// Удаление сотрудника
async function deleteEmployee(employeeId) {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/employees/${employeeId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Ошибка удаления сотрудника');
        
        showMessage('Сотрудник успешно удален!', 'success');
        loadEmployees();
        
    } catch (error) {
        showMessage('Ошибка при удалении сотрудника: ' + error.message, 'error');
    }
}

// Расчет зарплаты сотрудника
async function calculateEmployeeSalary(employeeId) {
    try {
        const response = await fetch(`/api/calculate_salary/${employeeId}`, {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error('Ошибка расчета зарплаты');
        
        const result = await response.json();
        showSalaryModal(result);
        
        // Обновить историю расчетов
        loadSalaryHistory();
        loadStatistics();
        
    } catch (error) {
        showMessage('Ошибка при расчете зарплаты: ' + error.message, 'error');
    }
}

// ========== ИСТОРИЯ РАСЧЕТОВ ==========
// Загрузка истории расчетов
async function loadSalaryHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Загрузка истории расчетов...</div>';
    
    try {
        const response = await fetch('/api/salary_history');
        if (!response.ok) throw new Error('Ошибка загрузки истории');
        
        const history = await response.json();
        displaySalaryHistory(history);
        
    } catch (error) {
        container.innerHTML = `
            <div class="message error">
                Ошибка загрузки истории: ${error.message}
            </div>
        `;
    }
}

// Отображение истории расчетов
function displaySalaryHistory(history) {
    const container = document.getElementById('history-container');
    
    if (!history || history.length === 0) {
        container.innerHTML = `
            <div class="message info">
                <i class="fas fa-info-circle"></i> История расчетов пуста.
            </div>
        `;
        return;
    }
    
    // Сортировка по убыванию (последние расчеты первыми)
    history.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
            return new Date(b.timestamp) - new Date(a.timestamp);
        }
        return 0;
    });
    
    let html = '';
    history.forEach((item, index) => {
        const date = item.timestamp ? 
            new Date(item.timestamp).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'Дата не указана';
        
        html += `
            <div class="history-item">
                <div class="history-header">
                    <div>
                        <strong>${item.employee_name || 'Сотрудник'}</strong>
                        <div class="history-date">${date}</div>
                    </div>
                    <div class="salary-value positive">${item.net_salary ? item.net_salary.toFixed(2) : '0.00'} руб.</div>
                </div>
                <div class="salary-breakdown" style="margin-top: 15px;">
                    <div class="salary-item">
                        <div class="salary-label">Начислено</div>
                        <div class="salary-value">${item.gross_salary ? item.gross_salary.toFixed(2) : '0.00'} руб.</div>
                    </div>
                    <div class="salary-item">
                        <div class="salary-label">НДФЛ (${item.tax_rate || 13}%)</div>
                        <div class="salary-value negative">${item.tax_amount ? item.tax_amount.toFixed(2) : '0.00'} руб.</div>
                    </div>
                    <div class="salary-item">
                        <div class="salary-label">Премия</div>
                        <div class="salary-value positive">${item.bonus ? item.bonus.toFixed(2) : '0.00'} руб.</div>
                    </div>
                    <div class="salary-item">
                        <div class="salary-label">Вычеты</div>
                        <div class="salary-value negative">${item.deductions ? item.deductions.toFixed(2) : '0.00'} руб.</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ========== СТАТИСТИКА ==========
// Загрузка статистики
async function loadStatistics() {
    const container = document.getElementById('stats-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Загрузка статистики...</div>';
    
    try {
        const response = await fetch('/api/statistics');
        if (!response.ok) throw new Error('Ошибка загрузки статистики');
        
        const stats = await response.json();
        displayStatistics(stats);
        
    } catch (error) {
        container.innerHTML = `
            <div class="message error">
                Ошибка загрузки статистики: ${error.message}
            </div>
        `;
    }
}

// Отображение статистики
function displayStatistics(stats) {
    const container = document.getElementById('stats-container');
    
    if (!stats || Object.keys(stats).length === 0) {
        container.innerHTML = `
            <div class="message info">
                <i class="fas fa-info-circle"></i> Статистика недоступна.
            </div>
        `;
        return;
    }
    
    const html = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Всего сотрудников</div>
                <div class="stat-value">${stats.total_employees || 0}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Общая сумма зарплат</div>
                <div class="stat-value">${(stats.total_salaries || 0).toFixed(2)} руб.</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Средняя зарплата</div>
                <div class="stat-value">${(stats.average_salary || 0).toFixed(2)} руб.</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Уплачено налогов</div>
                <div class="stat-value">${(stats.total_taxes || 0).toFixed(2)} руб.</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Выплачено сотрудникам</div>
                <div class="stat-value positive">${(stats.total_net_salary || 0).toFixed(2)} руб.</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Расчетов в истории</div>
                <div class="stat-value">${stats.recent_calculations || 0}</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// ========== МОДАЛЬНОЕ ОКНО ==========
// Показать модальное окно с расчетом зарплаты
function showSalaryModal(result) {
    const modalContent = document.getElementById('modal-content');
    
    const html = `
        <h3>Расчет зарплаты для ${result.employee_name}</h3>
        <div class="salary-breakdown">
            <div class="salary-item">
                <div class="salary-label">Базовая зарплата</div>
                <div class="salary-value">${result.base_salary.toFixed(2)} руб.</div>
            </div>
            <div class="salary-item">
                <div class="salary-label">Премия</div>
                <div class="salary-value positive">+ ${result.bonus.toFixed(2)} руб.</div>
            </div>
            <div class="salary-item">
                <div class="salary-label">Вычеты</div>
                <div class="salary-value negative">- ${result.deductions.toFixed(2)} руб.</div>
            </div>
            <div class="salary-item">
                <div class="salary-label">Начислено всего</div>
                <div class="salary-value">${result.gross_salary.toFixed(2)} руб.</div>
            </div>
            <div class="salary-item">
                <div class="salary-label">НДФЛ (${result.tax_rate}%)</div>
                <div class="salary-value negative">- ${result.tax_amount.toFixed(2)} руб.</div>
            </div>
        </div>
        <div style="text-align: center; margin: 25px 0; padding: 20px; background: #e8f4fc; border-radius: 10px;">
            <div style="font-size: 1.2rem; margin-bottom: 10px;">Итоговая сумма к выплате:</div>
            <div style="font-size: 2rem; font-weight: 700; color: #27ae60;">
                ${result.net_salary.toFixed(2)} руб.
            </div>
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button onclick="closeModal()" class="btn btn-primary">
                <i class="fas fa-check"></i> Закрыть
            </button>
        </div>
    `;
    
    modalContent.innerHTML = html;
    document.getElementById('salaryModal').style.display = 'block';
}

// Закрыть модальное окно
function closeModal() {
    document.getElementById('salaryModal').style.display = 'none';
}

// Закрыть модальное окно при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('salaryModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
// Показать сообщение
function showMessage(text, type = 'info') {
    // Удалить предыдущие сообщения
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Создать новое сообщение
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.innerHTML = `
        <i class="fas fa-${getMessageIcon(type)}"></i> ${text}
    `;
    
    // Добавить сообщение в начало контейнера
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(message, container.firstChild);
        
        // Автоматически скрыть через 5 секунд
        setTimeout(() => {
            if (message.parentNode) {
                message.style.opacity = '0';
                message.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    if (message.parentNode) {
                        message.remove();
                    }
                }, 500);
            }
        }, 5000);
    }
}

// Получить иконку для типа сообщения
function getMessageIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Форматирование числа с разделителями тысяч
function formatNumber(num) {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Экспорт данных в CSV
function exportToCSV(data, filename) {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}