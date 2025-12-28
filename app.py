from flask import Flask, request, jsonify, session, render_template, url_for, redirect
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
from datetime import date, datetime
from config import Config
from sqlalchemy.exc import IntegrityError
from sqlalchemy import extract, func, case
from models import db ,User, Teacher, Student, Attendance
import os

load_dotenv()

app = Flask(__name__)

app.config.from_object(Config)
db.init_app(app=app)

app.secret_key = os.getenv("SECRET_KEY")
bcrypt = Bcrypt(app=app)

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD_HASH = bcrypt.generate_password_hash(
    os.getenv("ADMIN_PASSWORD")
).decode()

@app.route("/logout")
def logout():
    session.clear()  
    return redirect(url_for('start'))

@app.route('/save-attendance', methods=["POST"])
def save_attendance():
    present_student_id = request.json['presentStudents']
    absent_student_id = request.json['absentStudents']
    date = request.json['date']
    subject = request.json['subject']
    py_date = datetime.strptime(date, "%Y-%m-%d").date()

    # Add present students
    if present_student_id:
        for id in present_student_id:
            new_attendance = Attendance(
                student_id=id,
                date=py_date,
                status="present",
                subject=subject
            )
            db.session.add(new_attendance)

    # Add absent students
    if absent_student_id:
        for id in absent_student_id:
            new_attendance = Attendance(
                student_id=id,
                date=py_date,
                status="absent",
                subject=subject
            )
            db.session.add(new_attendance)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"success": False, "message": "Student attendance is already stored!"}), 503

    return jsonify({"success": True}), 201

@app.route('/start-attendance', methods=["POST"])
def start_attendance():
    data = request.json['currentLecture']
    students_details = Student.query.filter_by(course_name=data['course'], semester=data['semester'], section=data['section']).all()
    if not students_details:
        return jsonify({"success": False})
    records = []
    for student in students_details:
        records.append({
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "course": student.course_name,
            "semester": student.semester,
            "section": student.section,
            "roll": student.roll_no
        })
    return jsonify({"success": True, "students_data": records})

@app.route('/rewrite-values')
def rewrite_values():
    user_role = session.get('userRole')
    user_id = session.get("user_id")
    user_details = User.query.filter_by(id=user_id, role=user_role).first()
    teacher_details = Teacher.query.filter_by(email=user_details.email).first()
    if not teacher_details:
        return jsonify({"success": False, "message": "Cannot found!"})
    return jsonify({"subject": teacher_details.subject, "success": True})

@app.route("/monthly-report", methods=["POST"])
def monthly_report():
    data = request.json
    year_month = data['month']
    date_obj = datetime.strptime(year_month, "%Y-%m")
    month = date_obj.strftime("%m")
    year = date_obj.strftime("%Y")
    
    records = (
        db.session.query(
            Student.name.label("student_name"),
            Student.roll_no,
            func.sum(case((Attendance.status == "present", 1), else_=0)).label("present_count"),
            func.count(Attendance.id).label("total_classes")
        )
        .join(Student, Student.id == Attendance.student_id)
        .filter(extract('month', Attendance.date) == month)   # e.g. 12 for December
        .filter(extract('year', Attendance.date) == year)     # to avoid mixing years
        .group_by(Student.id, Student.name, Student.roll_no)
        .all()
    )

    all_students = []
    all_students_present = 0
    all_students_total_classes = 0
    for student in records:
        all_students_present += student.present_count
        all_students_total_classes += student.total_classes
        all_students.append({
        "student_name": student.student_name,
        "roll_no": student.roll_no,
        "present_count": student.present_count,
        "total_classes": student.total_classes,
        "attendance_rate": (student.present_count / student.total_classes) * 100
        })
    overall_attendance = (all_students_present / all_students_total_classes) * 100
    if len(all_students) < 1: 
        return jsonify({"message": "Student cannot be found!"}), 503
    return jsonify({"data": all_students, "overall_attendance": overall_attendance, "message": "Daily report retrive successfully."}), 201

@app.route("/daily-report", methods=["POST"])
def daily_report():
    data = request.json
    date = data['date']
    py_date = datetime.strptime(date, "%Y-%m-%d").date()

    records = (
        db.session.query(Attendance,Student)
        .join(Student, Student.id == Attendance.student_id)
        .filter(Attendance.date == py_date)
        .all()
    )
    all_students = []
    for attendance, student in records:
        all_students.append({
            "student_name": student.name,
            "roll_no": student.roll_no,
            "semester": student.semester,
            "section": student.section,
            "status": attendance.status
        })
    present_stud = Attendance.query.filter_by(date=py_date, status="present").count()
    absent_stud = Attendance.query.filter_by(date=py_date, status="absent").count()
    todays_att =  (present_stud / len(all_students)) * 100 if len(all_students) > 0 else 0

    if len(all_students) < 1:
        return jsonify({"message": "Students not found!"}), 503
    return jsonify({"data": all_students, "attendancePercent": todays_att, "presentStudents": present_stud, "absentStudents": absent_stud, "message": "Daily report retrive successfully."}), 201

@app.route("/toggle-attendance", methods=["POST"])
def toggle_attendance():
    data = request.json
    student_id = data['studentId']
    date = data['date']
    status = data['status']
    py_date = datetime.strptime(date, "%Y-%m-%d").date()
    student_att = db.session.query(Attendance).filter_by(student_id = student_id, date=py_date).first()
    if not student_att:
        return jsonify({"message": "Student attendance not found!"}), 404
    student_att.status = 'present' if status == 'absent' else 'absent'
    db.session.commit()
    return jsonify({"message": "Attendance toggled successfully."}), 201

@app.route("/view-attendance", methods=["POST"])
def view_attendance():
    data = request.json
    course = data['course']
    section = data['section']
    semester = data['semester']
    date = data['date']
    py_date = datetime.strptime(date, "%Y-%m-%d").date()

    # Query attendance with filters
    records = (
        db.session.query(Attendance, Student)
        .join(Student, Attendance.student_id == Student.id)
        .filter(Student.course_name == course)
        .filter(Student.semester == semester)
        .filter(Student.section == section)
        .filter(Attendance.date == py_date)
    )

    if data.get('searchTerm'):
        records = records.filter(Student.name.ilike(f"{data['searchTerm']}%"))

    querys = records.all()

    # Format response
    result = []
    for attendance, student in querys:
        result.append({
            "student_id": attendance.student_id,
            "student_name": student.name,
            "course_name": student.course_name,
            "roll_no": student.roll_no,
            "semester": student.semester,
            "section": student.section,
            "date": attendance.date.strftime("%Y-%m-%d"),
            "status": attendance.status
        })

    return jsonify(result), 201

@app.route("/delete-teacher-data", methods=["POST"])
def delete_teacher_data():
    data = request.json
    teacher_id = data['id']
    teacher = db.session.get(Teacher, teacher_id)
    if not teacher:
        return jsonify({"message": "Teacher not found!"}), 404
    db.session.delete(teacher)
    db.session.commit()
    return jsonify({"message": "Teacher data deleted successfully!"}), 201

@app.route("/save-teacher-data", methods=["POST"])
def save_teacher_data():
    teacher_data = request.json
    data = teacher_data['editTeacher']
    update_teacher = db.session.query(Teacher).filter_by(id=data['teacher_id']).first()
    if not update_teacher:
        return jsonify({"message": "Student not found!"}), 404
    update_teacher.name = data['teacher_name']
    update_teacher.email = data['email']
    update_teacher.subject = data['subject']
    update_teacher.phone = data['phone']
    db.session.commit()
    return jsonify({"message": "Teacher data updated successfully"}), 201

@app.route("/get-teacher-data", methods=["POST"])
def get_teacher_data():
    data = request.json
    teacher_id = data['id']
    teacher = db.session.get(Teacher, teacher_id)
    if teacher:
        return jsonify({
            "name": teacher.name,
            "email": teacher.email,
            "subject": teacher.subject,
            "phone": teacher.phone
        })
    return jsonify({"message": "Teacher cannot be found."}), 503

@app.route("/add-teacher", methods=["POST"])
def add_teacher():
    data = request.json
    if not "newTeacher" in data or not data:
        return jsonify({"message": "Invalid request body!"}), 400
    
    teacher_data = data["newTeacher"]
    required_fields = ['name', 'email', 'subject', 'phone']
    for field in required_fields:
        if field not in teacher_data or not teacher_data[field]:
            return jsonify({"message": f"{field} is required"}), 400
        
    new_teacher = Teacher(
        name=teacher_data['name'],
        email=teacher_data['email'],
        subject=teacher_data['subject'],
        phone=teacher_data['phone'],
    )

    try:
        db.session.add(new_teacher)
        db.session.commit()
        return jsonify({"message": "Teacher added successfully!"}), 201

    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"message": "Teacher already added!"}), 400  # Bad Request

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500  # General server error
    
@app.route("/render-teachers")
def render_teachers():
    teachers = Teacher.query.all()
    
    teachers_data = [
        {
            "id": t.id,
            "name": t.name,
            "email": t.email,
            "subject": t.subject,
            "phone": t.phone
        } for t in teachers
    ]
    return jsonify(teachers_data)

@app.route("/delete-student-data", methods=["POST"])
def delete_student_data():
    data = request.json
    student_id = data['id']
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"message": "Student not found!"}), 404
    db.session.delete(student)
    db.session.commit()
    return jsonify({"message": "Student data deleted successfully!"}), 201


@app.route("/save-student-data", methods=["POST"])
def save_student_data():
    data = request.json
    update_student = db.session.query(Student).filter_by(id=data['student_id']).first()
    if not update_student:
        return jsonify({"message": "Student not found!"}), 404
    update_student.name = data['student_name']
    update_student.email = data['email']
    update_student.course_name = data['course_name']
    update_student.semester = data['semester']
    update_student.roll_no = data['roll']
    update_student.section = data['section']
    db.session.commit()
    return jsonify({"message": "Student data updated successfully"}), 201


@app.route("/get-student-data", methods=["POST"])
def get_student_data():
    data = request.json
    student_id = data['id']
    student = db.session.get(Student, student_id)
    if student:
        return jsonify({
            "name": student.name,
            "email": student.email,
            "course_name": student.course_name,
            "semester": student.semester,
            "section": student.section,
            "roll": student.roll_no
        })
    return jsonify({"message": "Student cannot be found."}), 503

@app.route("/add-student", methods=["POST"])
def add_student():
    data = request.json
    if not "newStudent" in data or not data:
        return jsonify({"message": "Invalid request body!"}), 400
    
    student_data = data["newStudent"]
    required_fields = ['name', 'email', 'course_name', 'semester', 'section', 'roll']
    for field in required_fields:
        if field not in student_data or not student_data[field]:
            return jsonify({"message": f"{field} is required"}), 400
        
    new_student = Student(
        name=student_data['name'],
        email=student_data['email'],
        course_name=student_data['course_name'],
        roll_no=student_data['roll'],
        semester=student_data['semester'],
        section=student_data['section']
    )

    try:
        db.session.add(new_student)
        db.session.commit()
        return jsonify({"message": "Student added successfully!"}), 201

    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"message": "Student already added!"}), 400  # Bad Request

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500  # General server error


@app.route("/render-students")
def render_students():
    students = Student.query.all()
    
    students_data = [
        {
            "id": s.id,
            "name": s.name,
            "course_name": s.course_name,
            "roll": s.roll_no,
            "semester": s.semester,
            "section": s.section
        } for s in students
    ]
    return jsonify(students_data)

@app.route("/render-dashboard")
def render_dashboard():
    total_students = Student.query.count() 
    total_teachers = Teacher.query.count()
    today = date.today()
    present_stud = Attendance.query.filter_by(date=today, status="present").count()
    absent_stud = Attendance.query.filter_by(date=today, status="absent").count()
    todays_att =  (present_stud / total_students) * 100 if total_students > 0 else 0
    return jsonify({"Total_students": total_students, "Total_teachers": total_teachers, "Todays_att": todays_att, "Absent_stud": absent_stud})

@app.route("/student-dashboard")
def student_dashboard():
    if session.get('userRole') != 'student':
        return redirect(url_for('login'))
    return render_template("student-dashboard.html")

@app.route("/teacher-dashboard")
def teacher_dashboard():
    if session.get('userRole') != 'teacher':
        return redirect(url_for('login'))
    return render_template("teacher-dashboard.html")

@app.route("/admin-dashboard")
def admin_dashboard():
    if session.get('userRole') != 'admin':
        return redirect(url_for('login'))
    return render_template("admin-dashboard.html")

@app.route("/login", methods=['POST','GET'])
def login():
    data = request.json
    email = data.get("username")
    password = data.get("password")
    role = data.get("role")
    if role == "admin":
        user = User.query.filter_by(email=email, role=role).first()
        if not user:
            return jsonify(success=False, message="User not found. Check your selected role!"), 401
        elif not  bcrypt.check_password_hash(user.password_hash, password):
            return jsonify(success=False, message="Incorrect password"), 401
        session["userRole"] = role
        session["user_id"] = user.id
        return jsonify({"success": True, "role": user.role})
    elif role == "teacher":
        teacher = User.query.filter_by(email=email, role=role).first()
        if not teacher:
            return jsonify(success=False, message="User not found. Check your selected role!"), 401
        elif not  bcrypt.check_password_hash(teacher.password_hash, password):
            return jsonify(success=False, message="Incorrect password"), 401
        session["userRole"] = role
        session["user_id"] = teacher.id
        return jsonify({"success": True, "role": teacher.role})
    elif role == "student":
        student = User.query.filter_by(email=email, role=role).first()
        if not student:
            return jsonify(success=False, message="User not found. Check your selected role!"), 401
        elif not  bcrypt.check_password_hash(student.password_hash, password):
            return jsonify(success=False, message="Incorrect password"), 401
        session["userRole"] = role
        session["user_id"] = student.id
        return jsonify({"success": True, "role": student.role})
    
    
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route("/")
def start():
    return render_template("login.html")


if __name__ == "__main__":
    app.run(port=5000, debug=True)

