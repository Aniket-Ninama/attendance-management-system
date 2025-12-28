from models import User
from app import db, app
from flask_bcrypt import Bcrypt

with app.app_context():
    bcrypt = Bcrypt(app)
    raw_password = "kingdall"
    hashed_password = bcrypt.generate_password_hash(raw_password).decode('utf-8')

    new_teacher = User(
        username = "invincible",
        email="kdgaming814@gmail.com",
        password_hash=hashed_password,
        role = "student"
    )

    db.session.add(new_teacher)
    db.session.commit()
    print("Done")