import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def get_token():
    payload = {
        "email": "admin@jpee.com",
        "password": "admin12345"
    }
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload)
        if response.status_code == 200:
            data = response.json()
            print(data["access_token"])
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    get_token()
