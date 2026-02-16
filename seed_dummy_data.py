import requests
import io

BASE_URL = "https://jpm-backend.onrender.com/api/v1"
# BASE_URL = "http://localhost:8000/api/v1" # For local testing if needed

def login_user(email, password):
    print(f"Logging in: {email}...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    return None

def register_user(name, email, password, role, subject=None, year=None):
    # Try login first
    token = login_user(email, password)
    if token:
        print(f"User {email} already exists and logged in.")
        return token

    if role == "admin":
        print(f"Skipping registration for admin {email} as it's restricted.")
        return None

    print(f"Registering {role}: {email}...")
    payload = {
        "name": name,
        "email": email,
        "password": password,
        "role": role
    }
    if subject: payload["subject"] = subject
    if year: payload["year"] = year
    
    resp = requests.post(f"{BASE_URL}/auth/register", json=payload)
    if resp.status_code in [201, 200]:
        return resp.json()["access_token"]
    else:
        print(f"Failed to register {email}: {resp.text}")
        return None

def main():
    # Credentials from auth-screen.tsx
    ADMIN = {"email": "admin@jpee.com", "password": "admin12345"}
    TEACHERS = [
        {"name": "Dr. Sharma", "email": "sharma@example.com", "password": "password123", "subject": "Physics"},
        {"name": "Dr. Gupta", "email": "gupta@example.com", "password": "password123", "subject": "Chemistry"},
        {"name": "Prof. Verma", "email": "verma@example.com", "password": "password123", "subject": "Mathematics"},
    ]
    STUDENTS = [
        {"name": "Rahul Kumar", "email": "rahul@example.com", "password": "password123", "year": "12th"},
        {"name": "Priya Singh", "email": "priya@example.com", "password": "password123", "year": "12th"},
        {"name": "Amit Verma", "email": "amit@example.com", "password": "password123", "year": "11th"},
    ]

    # 1. Login Admin
    admin_token = login_user(ADMIN["email"], ADMIN["password"])
    if not admin_token:
        print("CRITICAL: Could not login as Admin. Check credentials.")

    # 2. Teachers
    teacher_tokens = []
    for t in TEACHERS:
        token = register_user(t["name"], t["email"], t["password"], "teacher", subject=t["subject"])
        if token:
            teacher_tokens.append((t, token))

    # 3. Students
    student_info = []
    for s in STUDENTS:
        token = register_user(s["name"], s["email"], s["password"], "student", year=s["year"])
        if token:
            # Get ID
            r = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {token}"})
            me = r.json()
            student_info.append({"id": me["id"], "year": me["year"], "email": s["email"]})

    # 4. Create Classes and Assign Students
    if len(teacher_tokens) >= 2 and len(student_info) >= 3:
        # Physics Teacher creates a class
        t1_info, t1_token = teacher_tokens[0]
        print(f"Creating class for {t1_info['name']}...")
        c1_resp = requests.post(
            f"{BASE_URL}/teacher/classes",
            headers={"Authorization": f"Bearer {t1_token}"},
            json={"name": "JEE Alpha (12th)", "year": "12th", "subject": "Physics"}
        )
        if c1_resp.status_code == 201:
            c1_id = c1_resp.json()["id"]
            # Assign 12th graders
            s_12th = [s["id"] for s in student_info if s["year"] == "12th"]
            requests.put(
                f"{BASE_URL}/teacher/classes/{c1_id}/students",
                headers={"Authorization": f"Bearer {t1_token}"},
                json={"student_ids": s_12th}
            )
            print(f"Assigned {len(s_12th)} students to Physics class.")
        else:
            print(f"Failed to create Physics class: {c1_resp.text}")

        # Chemistry Teacher creates a class
        t2_info, t2_token = teacher_tokens[1]
        print(f"Creating class for {t2_info['name']}...")
        c2_resp = requests.post(
            f"{BASE_URL}/teacher/classes",
            headers={"Authorization": f"Bearer {t2_token}"},
            json={"name": "JEE Beta (11th)", "year": "11th", "subject": "Chemistry"}
        )
        if c2_resp.status_code == 201:
            c2_id = c2_resp.json()["id"]
            # Assign 11th graders
            s_11th = [s["id"] for s in student_info if s["year"] == "11th"]
            requests.put(
                f"{BASE_URL}/teacher/classes/{c2_id}/students",
                headers={"Authorization": f"Bearer {t2_token}"},
                json={"student_ids": s_11th}
            )
            print(f"Assigned {len(s_11th)} students to Chemistry class.")
        else:
            print(f"Failed to create Chemistry class: {c2_resp.text}")

    # 5. Upload Materials
    dummy_file = io.BytesIO(b"This is dummy study material content for functional testing.")
    for t_info, token in teacher_tokens:
        print(f"Uploading material for {t_info['name']}...")
        dummy_file.seek(0)
        requests.post(
            f"{BASE_URL}/teacher/library-items/upload",
            headers={"Authorization": f"Bearer {token}"},
            data={
                "title": f"{t_info['subject']} Foundation",
                "subject": t_info['subject'],
                "type": "PDF",
                "chapters": 10,
                "year": "12th" if t_info['subject'] == "Physics" else "11th",
                "publish_now": "true"
            },
            files={"file": (f"{t_info['subject'].lower()}_notes.pdf", dummy_file, "application/pdf")}
        )

    print("\nSuccessfully seeded dummy data using demo credentials! 🚀")

if __name__ == "__main__":
    main()
