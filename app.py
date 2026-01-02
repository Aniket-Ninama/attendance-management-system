from flask import Flask, request, jsonify, session, render_template, url_for, redirect
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
from datetime import date, datetime
from add_users import create_admin
from config import Config
from sqlalchemy.exc import IntegrityError
from sqlalchemy import extract, func, case
from models import db ,User, Teacher, Student, Attendance
from flask_mail import Mail, Message
import os, random, string
from threading import Thread
from email_service import send_email


load_dotenv()

app = Flask(__name__)

app.config.from_object(Config)
db.init_app(app=app)
my_email = os.getenv("MY_EMAIL")
my_password = os.getenv("EMAIL_PASSWORD")
app.config.update(
    MAIL_SERVER="smtp.gmail.com",
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME=my_email,
    MAIL_DEFAULT_SENDER=my_email,
    MAIL_PASSWORD=my_password  # Use App Password for Gmail
)

mail = Mail(app)
app.secret_key = os.getenv("SECRET_KEY")
bcrypt = Bcrypt(app=app)

@app.route("/logout")
def logout():
    session.clear()  
    return redirect(url_for('start'))

# Student-dashboard
@app.route('/recent-attendance')
def recent_attendance():
    user_id = session.get("user_id")
    user_role = session.get("userRole")

    user = User.query.filter_by(id=user_id, role=user_role).first()
    student = Student.query.filter_by(email=user.email).first()

    records = (
        Attendance.query
        .filter_by(student_id=student.id)
        .order_by(Attendance.date.desc())
        .limit(10)
        .all()
    )

    result = []
    for r in records:
        result.append({
            "date": r.date.strftime("%Y-%m-%d"),
            "subject": r.subject,
            "status": r.status
        })

    return jsonify({"success": True, "recent_attendance": result})

@app.route('/attendance-calendar', methods=["POST"])
def attendance_calendar():
    month = request.json['month']
    year = int(request.json['year'])
    user_id = session.get("user_id")
    user_role = session.get('userRole')
    user_details = User.query.filter_by(id=user_id, role=user_role).first()
    student_details = Student.query.filter_by(email=user_details.email).first()
    total_attendance_count = Attendance.query.filter(Attendance.student_id == student_details.id).count()
    present_count = Attendance.query.filter(Attendance.student_id == student_details.id, Attendance.status == "present").count()
    absent_count = Attendance.query.filter(Attendance.student_id == student_details.id, Attendance.status == "absent").count()
    month_record = Attendance.query.filter(Attendance.student_id == student_details.id, extract("month", Attendance.date) == month, extract("year", Attendance.date) == year).all()
    if not month_record:
        return jsonify({"success":False, "records": [], "present_count": 0, "absent_count": 0, "total_count": 0}), 201

    records = []
    for attendance in month_record:
        records.append({
            "date": attendance.date.strftime("%Y-%m-%d"),
            "status": attendance.status,
            "subject": attendance.subject
        })
    return jsonify({"success":True, "records": records, "present_count": present_count, "absent_count": absent_count, "total_count": total_attendance_count}), 201

@app.route("/rewrite-student-values")
def rewrite_student_values():
    user_role = session.get('userRole')
    user_id = session.get("user_id")
    user_details = User.query.filter_by(id=user_id, role=user_role).first()
    student_details = Student.query.filter_by(email=user_details.email).first()
    student_id = student_details.id
    total_attendance_count = Attendance.query.filter(Attendance.student_id == student_id).count()
    present_count = Attendance.query.filter(Attendance.student_id == student_id, Attendance.status == "present").count()
    absent_count = Attendance.query.filter(Attendance.student_id == student_id, Attendance.status == "absent").count()
    attendance_percentage = (present_count / total_attendance_count) * 100 if total_attendance_count > 0 else 0
    attendance_percentage = round(attendance_percentage , 2)
    if not student_details:
        return jsonify({"success": False, "message": "Student cannot found!"})
    return jsonify({"total_count": total_attendance_count, "present_count": present_count, "absent_count": absent_count, "attendance_per": attendance_percentage , "student_name": student_details.name.capitalize(), "rollNo": student_details.roll_no, "semester": student_details.semester, "section": student_details.section.upper(), "course": student_details.course_name.upper(), "success": True})

# Teacher-dashboard
@app.route('/save-attendance', methods=["POST"])
def save_attendance():
    data = request.json

    present_ids = set(data.get('presentStudents', []))
    absent_ids = set(data.get('absentStudents', []))
    # Remove duplicates
    absent_ids -= present_ids

    all_ids = present_ids.union(absent_ids)
    subject = data['subject']
    py_date = datetime.strptime(data['date'], "%Y-%m-%d").date()

    existing_records = Attendance.query.filter_by(date=py_date, subject=subject).all()
    existing_ids = {record.student_id for record in existing_records}

    # Check if that day is sunday:
    if py_date.weekday() == 6:
        return jsonify({
            "success": False,
            "message": "Attendance cannot be taken on Sunday (Holiday)"
        }), 400

    # Check if any of the new IDs already exist
    duplicates = all_ids.intersection(existing_ids)
    if duplicates:
        return jsonify({
            "success": False,
            "message": "Attendance already taken for this date & subject!"
        }), 409


    for sid in present_ids:
        db.session.add(Attendance(
            student_id=sid,
            date=py_date,
            status="present",
            subject=subject
        ))

    for sid in absent_ids:
        db.session.add(Attendance(
            student_id=sid,
            date=py_date,
            status="absent",
            subject=subject
        ))

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Attendance saved successfully"
    }), 201

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

@app.route('/rewrite-teacher-values')
def rewrite_teacher_values():
    user_role = session.get('userRole')
    user_id = session.get("user_id")
    user_details = User.query.filter_by(id=user_id, role=user_role).first()
    teacher_details = Teacher.query.filter_by(email=user_details.email).first()
    if not teacher_details:
        return jsonify({"success": False, "message": "Cannot found!"})
    return jsonify({"subject": teacher_details.subject, "teacher_name": teacher_details.name.capitalize(), "success": True})

# Admin-dashboard
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
    if len(all_students) < 1: 
        return jsonify({"message": "Student attendance cannot be found in this month!", "success": False}), 404
    overall_attendance = (all_students_present / all_students_total_classes) * 100
    overall_attendance = round(overall_attendance , 2)
    return jsonify({"data": all_students, "overall_attendance": overall_attendance, "message": "Monthly report retrive successfully.", "success": True}), 201

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
    if len(all_students) < 1:
        return jsonify({"message": "Students attendance cannot be found at this date!", "success": False}), 404
    present_stud = Attendance.query.filter_by(date=py_date, status="present").count()
    absent_stud = Attendance.query.filter_by(date=py_date, status="absent").count()
    todays_att =  (present_stud / len(all_students)) * 100 if len(all_students) > 0 else 0
    todays_att = round(todays_att, 2)
    return jsonify({"success": True,"data": all_students, "attendancePercent": todays_att, "presentStudents": present_stud, "absentStudents": absent_stud, "message": "Daily report retrive successfully."}), 201

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
    semester = int(data['semester'])
    date = data['date']
    subject = data['subject']
    py_date = datetime.strptime(date, "%Y-%m-%d").date()
    # Query attendance with filters
    records = (
        db.session.query(Attendance, Student)
        .join(Student, Attendance.student_id == Student.id)
        .filter(Student.course_name.ilike(course.strip()))
        .filter(Student.semester == semester)
        .filter(Student.section == section)
        .filter(Attendance.date == py_date)
        .filter(Attendance.subject.ilike(subject.strip()))
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
            "status": attendance.status,
            "subject": attendance.subject
        })

    return jsonify(result), 201

@app.route('/get-subjects')
def get_subjects():
    subjects = db.session.query(Teacher.subject).distinct().all()
    if not subjects:
        return jsonify({"success": False, "message": "Cannot retrieve subjects!"}), 404
    subject_list = [s[0] for s in subjects]
    return jsonify({"success": True, "subjects": subject_list})

@app.route("/delete-teacher-data", methods=["POST"])
def delete_teacher_data():
    data = request.json
    teacher_id = data['id']
    teacher = db.session.get(Teacher, teacher_id)
    user_teacher = db.session.query(User).filter_by(email=teacher.email).first()
    if not teacher and not user_teacher:
        return jsonify({"message": "Teacher not found!"}), 404
    db.session.delete(teacher)
    db.session.delete(user_teacher)
    db.session.commit()
    return jsonify({"message": "Teacher data deleted successfully!"}), 201

@app.route("/save-teacher-data", methods=["POST"])
def save_teacher_data():
    teacher_data = request.json
    data = teacher_data['editTeacher']
    update_teacher = db.session.query(Teacher).filter_by(id=data['teacher_id']).first()
    if not update_teacher:
        return jsonify({"message": "Student not found!"}), 404
    update_teacher.name = data['teacher_name'].capitalize()
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
    if not data or "newTeacher" not in data:
        return jsonify({"message": "Invalid request body!"}), 400

    teacher_data = data["newTeacher"]
    required_fields = ['name', 'email', 'subject', 'phone']
    for field in required_fields:
        if not teacher_data.get(field):
            return jsonify({"message": f"{field} is required"}), 400

    # Generate password
    userName = teacher_data['name'].lower()
    random_digits = ''.join(random.choices(string.digits, k=3))
    user_password = userName + random_digits

    new_teacher = Teacher(
        name=teacher_data['name'].capitalize(),
        email=teacher_data['email'],
        subject=teacher_data['subject'],
        phone=teacher_data['phone'],
    )

    new_user = User(
        username=new_teacher.name.capitalize(),
        email=new_teacher.email,
        password_hash=bcrypt.generate_password_hash(user_password).decode('utf-8'),
        role="teacher"
    )

    try:
        db.session.add(new_teacher)
        db.session.add(new_user)
        db.session.commit()

        msg = Message(
            subject="Welcome to Attendease!",
            sender=app.config["MAIL_USERNAME"],
            recipients=[new_teacher.email]
        )

        html_content = f"""
            <h3>Welcome to Attendease 🎉</h3>
            <p>Hi {new_teacher.name},</p>

            <p>You have been added as a faculty member.</p>

            <p><b>Subject:</b> {new_teacher.subject}</p>

            <p><b>Login Credentials:</b><br>
            Username: {new_user.username}<br>
            Email: {new_teacher.email}<br>
            Password: {user_password}</p>

            <p>Regards,<br>Attendease Team</p>
            """

        # 🔥 Send email asynchronously (IMPORTANT for Render)
        Thread(
            target=send_email,
            args=(new_teacher.email, "Welcome to Attendease", html_content)
        ).start()

        return jsonify({"message": "Teacher added successfully and email sent!"}), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Teacher already exists!"}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500

    
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
    user_student = db.session.query(User).filter_by(email=student.email).first()
    if not student or not user_student:
        return jsonify({"message": "Student not found!"}), 404
    db.session.delete(student)
    db.session.delete(user_student)
    db.session.commit()
    return jsonify({"message": "Student data deleted successfully!"}), 201

@app.route("/save-student-data", methods=["POST"])
def save_student_data():
    data = request.json
    update_student = db.session.query(Student).filter_by(id=data['student_id']).first()
    if not update_student:
        return jsonify({"message": "Student not found!"}), 404
    update_student.name = data['student_name'].capitalize()
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
    if not data or "newStudent" not in data:
        return jsonify({"message": "Invalid request body!"}), 400

    student_data = data["newStudent"]
    required_fields = ['name', 'email', 'course_name', 'semester', 'section', 'roll']
    for field in required_fields:
        if not student_data.get(field):
            return jsonify({"message": f"{field} is required"}), 400

    # Generate password
    userName = student_data['name'].lower()
    random_digits = ''.join(random.choices(string.digits, k=3))
    user_password = userName + random_digits

    new_student = Student(
        name=student_data['name'].capitalize(),
        email=student_data['email'],
        course_name=student_data['course_name'],
        roll_no=student_data['roll'],
        semester=student_data['semester'],
        section=student_data['section']
    )

    new_user = User(
        username=new_student.name,
        email=new_student.email,
        password_hash=bcrypt.generate_password_hash(user_password).decode('utf-8'),
        role="student"
    )

    try:
        db.session.add(new_student)
        db.session.add(new_user)
        db.session.commit()

        # Prepare email
        msg = Message(
            subject="Welcome to the Course!",
            sender=app.config["MAIL_USERNAME"],
            recipients=[new_student.email]
        )

        html_content = f"""
        <h3>Welcome to Attendease 🎉</h3>
        <p>Hi {new_student.name},</p>

        <p>You have been successfully registered.</p>

        <p><b>Roll No:</b> {new_student.roll_no}<br>
        <b>Semester:</b> {new_student.semester}<br>
        <b>Section:</b> {new_student.section}</p>

        <p><b>Login Credentials:</b><br>
        Username: {new_user.username}<br>
        Email: {new_student.email}<br>
        Password: {user_password}</p>

        <p>Regards,<br>Attendease Team</p>
        """

        Thread(
            target=send_email,
            args=(new_student.email, "Welcome to Attendease", html_content)
        ).start()

        return jsonify({
            "message": "Student added successfully. Email will be sent shortly."
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Student already exists!"}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500


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
    todays_att = round(todays_att, 2)
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

@app.route('/rewrite-admin-values')
def rewrite_admin_values():
    user_role = session.get('userRole')
    user_id = session.get("user_id")
    user_details = User.query.filter_by(id=user_id, role=user_role).first()
    if not user_details:
        return jsonify({"success": False, "message": "Cannot found!"})
    return jsonify({"admin_name": user_details.username.capitalize(), "success": True})

@app.route("/login", methods=['POST','GET'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    role = data.get("role")
    if role == "admin":
        user = User.query.filter_by(email=username, role=role).first() or User.query.filter_by(username=username.capitalize(), role=role).first()
        if not user:
            return jsonify(success=False, message="User not found. Check your selected role!"), 401
        elif not  bcrypt.check_password_hash(user.password_hash, password):
            return jsonify(success=False, message="Incorrect password"), 401
        session["userRole"] = role
        session["user_id"] = user.id
        return jsonify({"success": True, "role": user.role})
    elif role == "teacher":
        teacher = User.query.filter_by(email=username, role=role).first() or User.query.filter_by(username=username.capitalize(), role=role).first()
        if not teacher:
            return jsonify(success=False, message="User not found. Check your selected role!"), 401
        elif not  bcrypt.check_password_hash(teacher.password_hash, password):
            return jsonify(success=False, message="Incorrect password"), 401
        session["userRole"] = role
        session["user_id"] = teacher.id
        return jsonify({"success": True, "role": teacher.role})
    elif role == "student":
        student = User.query.filter_by(email=username, role=role).first() or User.query.filter_by(username=username.capitalize(), role=role).first()
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
    app.run()

