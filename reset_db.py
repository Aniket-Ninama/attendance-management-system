from models import User, Attendance, Student, Teacher
from app import db, app
from sqlalchemy import text

# This will wipe all rows and reset IDs back to 1
with app.app_context():
    db.session.execute(
        text('TRUNCATE TABLE attendance, users, students, teachers RESTART IDENTITY CASCADE;')
    )
    db.session.commit()
    print("RESET")
