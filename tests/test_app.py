from fastapi.testclient import TestClient

def test_root_endpoint(client: TestClient):
    """Test that root endpoint redirects to static/index.html"""
    response = client.get("/")
    assert response.status_code == 200 or response.status_code == 307
    
def test_get_activities(client: TestClient):
    """Test getting the list of activities"""
    response = client.get("/activities")
    assert response.status_code == 200
    activities = response.json()
    assert isinstance(activities, dict)
    assert len(activities) > 0
    
    # Check activity structure
    for name, details in activities.items():
        assert isinstance(name, str)
        assert isinstance(details, dict)
        assert "description" in details
        assert "schedule" in details
        assert "max_participants" in details
        assert "participants" in details
        assert isinstance(details["participants"], list)
        
def test_signup_for_activity(client: TestClient):
    """Test signing up for an activity"""
    # Get the first activity name
    activities = client.get("/activities").json()
    activity_name = list(activities.keys())[0]
    
    # Try signing up
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": "test@mergington.edu"}
    )
    assert response.status_code == 200
    assert "message" in response.json()
    
    # Verify student was added
    activities = client.get("/activities").json()
    assert "test@mergington.edu" in activities[activity_name]["participants"]
    
def test_duplicate_signup_prevented(client: TestClient):
    """Test that duplicate signups are prevented"""
    # Get the first activity name
    activities = client.get("/activities").json()
    activity_name = list(activities.keys())[0]
    
    # Sign up first time
    email = "duplicate@mergington.edu"
    client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email}
    )
    
    # Try signing up again
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email}
    )
    assert response.status_code == 400
    assert "already signed up" in response.json()["detail"].lower()
    
def test_unregister_from_activity(client: TestClient):
    """Test unregistering from an activity"""
    # Get the first activity name
    activities = client.get("/activities").json()
    activity_name = list(activities.keys())[0]
    email = "unregister@mergington.edu"
    
    # First sign up
    client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email}
    )
    
    # Then unregister
    response = client.post(
        f"/activities/{activity_name}/unregister",
        params={"email": email}
    )
    assert response.status_code == 200
    assert "message" in response.json()
    
    # Verify student was removed
    activities = client.get("/activities").json()
    assert email not in activities[activity_name]["participants"]
    
def test_unregister_not_signed_up(client: TestClient):
    """Test unregistering when not signed up"""
    # Get the first activity name
    activities = client.get("/activities").json()
    activity_name = list(activities.keys())[0]
    
    response = client.post(
        f"/activities/{activity_name}/unregister",
        params={"email": "notregistered@mergington.edu"}
    )
    assert response.status_code == 400
    assert "not signed up" in response.json()["detail"].lower()

def test_invalid_activity(client: TestClient):
    """Test accessing an invalid activity"""
    response = client.post(
        "/activities/NonexistentActivity/signup",
        params={"email": "test@mergington.edu"}
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()