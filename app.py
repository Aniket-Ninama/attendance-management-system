from flask import Flask, request, jsonify, session, render_template, url_for, redirect
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
from datetime import date
from config import Config
from sqlalchemy.exc import IntegrityError
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

@app.route('/logout')
def logout():
    session.clear()  
    return redirect(url_for('commence'))

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
    data = request.json
    update_teacher = db.session.query(Teacher).filter_by(email=data['email']).first()
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
    update_student = db.session.query(Student).filter_by(roll_no=data['roll']).first()
    if not update_student:
        return jsonify({"message": "Student not found!"}), 404
    update_student.name = data['student_name']
    update_student.email = data['email']
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
    required_fields = ['name', 'email', 'semester', 'section', 'roll']
    for field in required_fields:
        if field not in student_data or not student_data[field]:
            return jsonify({"message": f"{field} is required"}), 400
        
    new_student = Student(
        name=student_data['name'],
        email=student_data['email'],
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
            "email": s.email,
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
    present_stud = Attendance.query.filter_by(date=today, status="Present").count()
    absent_stud = Attendance.query.filter_by(date=today, status="Absent").count()
    todays_att =  (present_stud / total_students) * 100 if total_students > 0 else 0
    return jsonify({"Total_students": total_students, "Total_teachers": total_teachers, "Todays_att": todays_att, "Absent_stud": absent_stud})

@app.route("/admin-dashboard")
def admin_dashboard():
    if session.get('userRole') != 'admin':
        return redirect(url_for('login'))
    return render_template("admin-dashboard.html")

@app.route("/login", methods=['POST'])
def login():
    data = request.json
    email = data.get("username")
    password = data.get("password")
    role = data.get("role")
    if role == "admin":
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify(success=False, message="User not found"), 401
        elif not  bcrypt.check_password_hash(user.password_hash, password):
            return jsonify(success=False, message="Incorrect password"), 401
        session["userRole"] = role
        session["user_id"] = user.id
        return jsonify({"success": True, "role": user.role})
    
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route("/")
def commence():
    return render_template("login.html")


if __name__ == "__main__":
    app.run(debug=True)

