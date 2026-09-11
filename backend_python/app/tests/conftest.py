import os
import sys
import pytest

# Ensure backend_python is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.db.database import db

@pytest.fixture(autouse=True)
def setup_test_db(request):
    if 'clean_db' in request.keywords:
        db.clear()
    else:
        if "comp-techflow" not in db.companies:
            db.seed_demo_data()
    yield
    if 'clean_db' in request.keywords:
        db.seed_demo_data()
