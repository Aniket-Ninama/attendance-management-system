# 📊 Attendance Management System

A **Flask-based Attendance Management System** that allows admins/teachers to take, view, and manage student attendance efficiently. The system supports subject-wise attendance, calendar-based views, and role-based access.

---

## 🚀 Features

* 👤 **User Authentication** (Admin / Teacher /Student)
* 🧑‍🏫 **Admin Dashboard**
* 🧑‍🏫 **Teacher Dashboard**
* 🧑‍🎓 **Student Management**
* 🗓️ **Calendar-based Attendance View**
* 📚 **Subject-wise Attendance**
* 📅 **Monthly Attendance Tracking**
* 🚫 **Attendance Disabled on Sundays**
* 📊 **Present / Absent Statistics**
* 🔍 **Search & Filter Attendance Records**

---

## 🛠️ Tech Stack

**Frontend**

* HTML5
* CSS3
* JavaScript

**Backend**

* Python
* Flask
* Flask-Mail
* SQLAlchemy

**Database**

* PostgreSQL

---

## 📂 Project Structure

```text
attendance-system/
│
├── app.py
├── models.py
├── requirements.txt
├── static/
│   ├── css/
│   ├── js/
│
├── templates/
│   ├── admin/
│   ├── teacher/
│   └── student/
│
├── venv/
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/Aniket-Ninama/attendance-management-system.git
cd attendance-management-system
```

### 2️⃣ Create & activate virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / Mac
source venv/bin/activate
```

### 3️⃣ Install dependencies

```bash
pip install -r requirements.txt
```

### 4️⃣ Configure Database

Update your **PostgreSQL credentials** in `app.py`:

```python
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://username:password@localhost/dbname'
```

### 5️⃣ Run migrations (if any)

```bash
flask db upgrade
```

### 6️⃣ Run the application

```bash
python app.py
```

Open browser:

```
http://127.0.0.1:5000
```

---

## 🗓️ Attendance Rules

* ❌ Attendance **cannot be taken on Sundays**
* ✅ Attendance allowed **Monday to Saturday**
* 📌 Duplicate attendance for the same student, date & subject is restricted

---

## 📌 API Endpoints (Sample)

| Method | Route                  | Description             |
| ------ | ---------------------- | ----------------------- |
| POST   | `/save-attendance`     | Save attendance         |
| POST   | `/view-attendance`     | View attendance         |
| POST   | `/attendance-calendar` | Monthly attendance data |

---

## 🧪 Sample `.env` (Optional)

```env
SECRET_KEY=your_secret_key
DATABASE_URL=postgresql://username:password@localhost/dbname
```

---

## 🧑‍💻 Author

**Aniket Ninama**
📍 Gujarat, India
📧 [aniketninama5@gmail.com](mailto:aniketninama5@gmail.com)

---

## 📜 License

This project is for **educational purposes**.

---

## ⭐ Acknowledgements

* Flask Documentation
* PostgreSQL

---

If you like this project, don’t forget to ⭐ the repository!
