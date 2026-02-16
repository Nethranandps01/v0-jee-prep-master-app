import pytest


@pytest.mark.anyio
async def test_dashboard(async_client, admin_headers: dict[str, str]) -> None:
    response = await async_client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_students" in data
    assert "departments" in data


@pytest.mark.anyio
async def test_users_filter_create_and_toggle(async_client, admin_headers: dict[str, str]) -> None:
    listed = await async_client.get(
        "/api/v1/admin/users",
        params={"role": "teacher", "page": 1, "limit": 10},
        headers=admin_headers,
    )
    assert listed.status_code == 200
    assert listed.json()["items"]

    created = await async_client.post(
        "/api/v1/admin/users",
        json={
            "name": "Ananya Das",
            "email": "ananya@example.com",
            "password": "password123",
            "role": "student",
            "year": "11th",
        },
        headers=admin_headers,
    )
    assert created.status_code == 201
    user = created.json()
    assert user["status"] == "active"

    toggled = await async_client.patch(
        f"/api/v1/admin/users/{user['id']}/status",
        json={"status": "inactive"},
        headers=admin_headers,
    )
    assert toggled.status_code == 200
    assert toggled.json()["status"] == "inactive"


@pytest.mark.anyio
async def test_users_search_is_case_and_punctuation_tolerant(
    async_client,
    admin_headers: dict[str, str],
) -> None:
    listed = await async_client.get(
        "/api/v1/admin/users",
        params={"search": "DR SHARma", "page": 1, "limit": 50},
        headers=admin_headers,
    )
    assert listed.status_code == 200
    names = [item.get("name", "") for item in listed.json()["items"]]
    assert any(name == "Dr. Sharma" for name in names)


@pytest.mark.anyio
async def test_content_moderation_transition(async_client, admin_headers: dict[str, str]) -> None:
    listed = await async_client.get(
        "/api/v1/admin/content-items",
        params={"status": "pending"},
        headers=admin_headers,
    )
    assert listed.status_code == 200
    pending_item = listed.json()["items"][0]

    approved = await async_client.patch(
        f"/api/v1/admin/content-items/{pending_item['id']}/status",
        json={"status": "approved"},
        headers=admin_headers,
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    second_transition = await async_client.patch(
        f"/api/v1/admin/content-items/{pending_item['id']}/status",
        json={"status": "rejected"},
        headers=admin_headers,
    )
    assert second_transition.status_code == 409


@pytest.mark.anyio
async def test_reports_and_csv_export(async_client, admin_headers: dict[str, str]) -> None:
    analytics = await async_client.get("/api/v1/admin/reports/analytics", headers=admin_headers)
    assert analytics.status_code == 200
    assert "monthly_usage" in analytics.json()

    billing = await async_client.get("/api/v1/admin/reports/billing", headers=admin_headers)
    assert billing.status_code == 200
    assert billing.json()["plan"] == "Institution Pro"

    exported = await async_client.get(
        "/api/v1/admin/reports/export",
        params={"section": "analytics", "format": "csv"},
        headers=admin_headers,
    )
    assert exported.status_code == 200
    assert "text/csv" in exported.headers["content-type"]
    assert "metric,value" in exported.text
