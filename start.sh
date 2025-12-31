#!/bin/bash

# Set environment variables (if not already set in Render)
export FLASK_APP=app.py
export FLASK_ENV=production

# Create database tables
python - <<END
from app import db, app
from add_users import create_admin
with app.app_context():
    db.create_all()
    create_admin(app, db)
END

# Start Gunicorn
exec gunicorn app:app --bind 0.0.0.0:$PORT