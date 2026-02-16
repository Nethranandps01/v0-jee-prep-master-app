import pytest


@pytest.mark.anyio
async def test_register_student_and_me(async_client) -> None:
    register = await async_client.post(
        "/api/v1/auth/register",
        json={
            "name": "New Student",
            "email": "new-student@example.com",
            "password": "password123",
            "role": "student",
            "year": "12th",
        },
    )
    assert register.status_code == 201

    payload = register.json()
    assert payload["access_token"]
    assert payload["refresh_token"]

    me = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {payload['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["role"] == "student"
    assert me.json()["email"] == "new-student@example.com"


@pytest.mark.anyio
async def test_register_teacher_requires_subject(async_client) -> None:
    response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "name": "New Teacher",
            "email": "new-teacher@example.com",
            "password": "password123",
            "role": "teacher",
        },
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_register_duplicate_email_conflict(async_client) -> None:
    response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "name": "Duplicate Admin",
            "email": "admin@jpee.com",
            "password": "password123",
            "role": "student",
            "year": "12th",
        },
    )
    assert response.status_code == 409


@pytest.mark.anyio
async def test_login_and_me(async_client) -> None:
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@jpee.com", "password": "admin12345"},
    )
    assert login.status_code == 200

    payload = login.json()
    assert payload["access_token"]
    assert payload["refresh_token"]

    me = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {payload['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["role"] == "admin"
    assert me.json()["email"] == "admin@jpee.com"


@pytest.mark.anyio
async def test_login_invalid_password(async_client) -> None:
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@jpee.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


@pytest.mark.anyio
async def test_refresh_rotates_token(async_client) -> None:
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@jpee.com", "password": "admin12345"},
    )
    refresh_token = login.json()["refresh_token"]

    refreshed = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refreshed.status_code == 200
    new_refresh_token = refreshed.json()["refresh_token"]
    assert new_refresh_token != refresh_token

    reused = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert reused.status_code == 401
