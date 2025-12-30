from models import User
from app import db, app
from flask_bcrypt import Bcrypt
import os
from dotenv import load_dotenv
load_dotenv

with app.app_context():
    bcrypt = Bcrypt(app)
    raw_password = os.getenv("PROJECT_PASSWORD")
    hashed_password = bcrypt.generate_password_hash(raw_password).decode('utf-8')

    new_admin = User(
        username = "Aniket",
        email=os.getenv("MY_EMAIL"),
        password_hash=hashed_password,
        role = "admin"
    )

    db.session.add(new_admin)
    db.session.commit()
    print("Done")