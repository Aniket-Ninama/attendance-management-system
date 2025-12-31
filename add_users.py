from models import User
from flask_bcrypt import Bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

def create_admin(app, db):
<<<<<<< HEAD
    bcrypt = Bcrypt(app)
    existing_admin = User.query.filter_by(email=os.getenv("MY_EMAIL"), role="admin").first()

    if existing_admin:
        print("Admin already exists")
        return
    
    raw_password = os.getenv("PROJECT_PASSWORD")
    hashed_password = bcrypt.generate_password_hash(raw_password).decode('utf-8')
    new_admin = User(
        username="Admin",
        email=os.getenv("MY_EMAIL"),
        password_hash=hashed_password,
        role="admin"
    )

    db.session.add(new_admin)
    db.session.commit()
    print("Admin created")
=======
    with app.app_context():
        bcrypt = Bcrypt(app)
        raw_password = os.getenv("PROJECT_PASSWORD")
        hashed_password = bcrypt.generate_password_hash(raw_password).decode('utf-8')
        existing_admin = User.query.filter_by(email=os.getenv("MY_EMAIL"), role="admin").first()
        if not existing_admin:
            new_admin = User(
                username="Admin",
                email=os.getenv("MY_EMAIL"),
                password_hash=hashed_password,
                role="admin"
            )
            db.session.add(new_admin)
            db.session.commit()
            print("Admin created")
        else:
            print("Admin already exists")
       
>>>>>>> f4172e61d50262398d86629161690a4b98a41488
