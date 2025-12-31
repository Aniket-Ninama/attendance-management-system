import os
from dotenv import load_dotenv

# load_dotenv()  # Only used locally, Render will use environment variables

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")

    # Fix Render DATABASE_URL if it starts with postgres://
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace(
            "postgres://", "postgresql://", 1
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False