from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import json

app = FastAPI(title="АИС Расчет заработной платы")

# Модели данных
class Employee(BaseModel):
    id: int
    name: str
    position: str
    rate: float  # Ставка в час
    hours_worked: float
    bonus: float = 0
    tax_rate: float = 13  # Стандартный НДФЛ 13%
    deductions: float = 0  # Вычеты

class SalaryCalculation(BaseModel):
    employee_id: int
    gross_salary: float  # Начислено всего
    tax_amount: float    # НДФЛ
    net_salary: float    # К выплате
    bonus: float         # Премия

# "База данных" в памяти
employees_db = []
salary_history = []
next_id = 1

# Подключаем статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()

# API для сотрудников
@app.get("/api/employees")
async def get_employees():
    return JSONResponse(content=employees_db)

@app.get("/api/employees/{employee_id}")
async def get_employee(employee_id: int):
    for emp in employees_db:
        if emp["id"] == employee_id:
            return emp
    raise HTTPException(status_code=404, detail="Сотрудник не найден")

@app.post("/api/employees")
async def create_employee(employee: dict):
    global next_id
    employee["id"] = next_id
    next_id += 1
    employees_db.append(employee)
    return {"message": "Сотрудник создан", "employee": employee}

@app.put("/api/employees/{employee_id}")
async def update_employee(employee_id: int, employee_data: dict):
    for i, emp in enumerate(employees_db):
        if emp["id"] == employee_id:
            employee_data["id"] = employee_id
            employees_db[i] = employee_data
            return {"message": "Сотрудник обновлен", "employee": employee_data}
    raise HTTPException(status_code=404, detail="Сотрудник не найден")

@app.delete("/api/employees/{employee_id}")
async def delete_employee(employee_id: int):
    global employees_db
    new_employees = [emp for emp in employees_db if emp["id"] != employee_id]
    if len(new_employees) == len(employees_db):
        raise HTTPException(status_code=404, detail="Сотрудник не найден")
    employees_db = new_employees
    return {"message": "Сотрудник удален"}

# Расчет зарплаты
@app.post("/api/calculate_salary/{employee_id}")
async def calculate_salary(employee_id: int):
    employee = None
    for emp in employees_db:
        if emp["id"] == employee_id:
            employee = emp
            break
    
    if not employee:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")
    
    # Расчеты
    base_salary = employee["rate"] * employee["hours_worked"]
    bonus = employee.get("bonus", 0)
    gross_salary = base_salary + bonus
    deductions = employee.get("deductions", 0)
    
    # НДФЛ
    tax_base = gross_salary - deductions
    if tax_base < 0:
        tax_base = 0
    tax_amount = tax_base * (employee.get("tax_rate", 13) / 100)
    
    # Чистая зарплата
    net_salary = gross_salary - tax_amount
    
    calculation = {
        "employee_id": employee_id,
        "employee_name": employee["name"],
        "gross_salary": round(gross_salary, 2),
        "base_salary": round(base_salary, 2),
        "bonus": round(bonus, 2),
        "deductions": round(deductions, 2),
        "tax_amount": round(tax_amount, 2),
        "tax_rate": employee.get("tax_rate", 13),
        "net_salary": round(net_salary, 2)
    }
    
    # Сохраняем в историю
    salary_history.append(calculation)
    
    return calculation

@app.get("/api/salary_history")
async def get_salary_history():
    return JSONResponse(content=salary_history)

@app.get("/api/statistics")
async def get_statistics():
    if not employees_db:
        return {}
    
    total_employees = len(employees_db)
    total_salaries = sum(emp["rate"] * emp["hours_worked"] for emp in employees_db)
    avg_salary = total_salaries / total_employees if total_employees > 0 else 0
    
    # Расчет по последним начислениям
    recent_calculations = salary_history[-10:] if len(salary_history) > 10 else salary_history
    total_taxes = sum(calc["tax_amount"] for calc in recent_calculations)
    total_net = sum(calc["net_salary"] for calc in recent_calculations)
    
    return {
        "total_employees": total_employees,
        "total_salaries": round(total_salaries, 2),
        "average_salary": round(avg_salary, 2),
        "total_taxes": round(total_taxes, 2),
        "total_net_salary": round(total_net, 2),
        "recent_calculations": len(recent_calculations)
    }

# Быстрый расчет без сохранения сотрудника
@app.post("/api/quick_calculate")
async def quick_calculate(data: dict):
    try:
        rate = float(data["rate"])
        hours = float(data["hours"])
        bonus = float(data.get("bonus", 0))
        tax_rate = float(data.get("tax_rate", 13))
        deductions = float(data.get("deductions", 0))
        
        base_salary = rate * hours
        gross_salary = base_salary + bonus
        
        tax_base = gross_salary - deductions
        if tax_base < 0:
            tax_base = 0
        tax_amount = tax_base * (tax_rate / 100)
        
        net_salary = gross_salary - tax_amount
        
        return {
            "base_salary": round(base_salary, 2),
            "gross_salary": round(gross_salary, 2),
            "bonus": round(bonus, 2),
            "deductions": round(deductions, 2),
            "tax_amount": round(tax_amount, 2),
            "tax_rate": tax_rate,
            "net_salary": round(net_salary, 2),
            "detailed": f"Начислено: {round(gross_salary, 2)} руб. - НДФЛ ({tax_rate}%): {round(tax_amount, 2)} руб. = {round(net_salary, 2)} руб."
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка расчета: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)