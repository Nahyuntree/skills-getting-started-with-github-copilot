document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Cache for activities data
  let activitiesCache = null;
  let lastFetchTime = 0;
  const CACHE_DURATION = 60000; // 1 minute cache

  // Function to fetch activities from API
  async function fetchActivities() {
    // Return cached data if still valid
    if (activitiesCache && (Date.now() - lastFetchTime) < CACHE_DURATION) {
      return activitiesCache;
    }

    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      activitiesCache = activities;
      lastFetchTime = Date.now();
      return activities;
    } catch (error) {
      console.error("Error fetching activities:", error);
      throw error;
    }
  }

  // Optimized rendering function
  async function renderActivities() {
    try {
      const activities = await fetchActivities();
      
      // Use DocumentFragment for better performance
      const fragment = document.createDocumentFragment();
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <p class="participants-header">Current Participants:</p>
          <ul class="participants-list">
            ${details.participants.length > 0 
              ? details.participants.map(email => `
                <li>
                  ${email}
                  <button class="delete-participant" data-activity="${name}" data-email="${email}">❌</button>
                </li>`).join('')
              : '<li>No participants yet</li>'
            }
          </ul>
        `;

        fragment.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      activitiesList.innerHTML = "";
      activitiesList.appendChild(fragment);
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle participant unregistration
  activitiesList.addEventListener("click", async (event) => {
    if (event.target.classList.contains("delete-participant")) {
      const activity = event.target.dataset.activity;
      const email = event.target.dataset.email;
      
      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
          {
            method: "POST"
          }
        );

        const result = await response.json();

        if (response.ok) {
          messageDiv.textContent = result.message;
          messageDiv.className = "success";
          // Immediately update the UI
          await renderActivities();
        } else {
          messageDiv.textContent = result.detail || "An error occurred";
          messageDiv.className = "error";
        }

        messageDiv.classList.remove("hidden");

        // Hide message after 5 seconds
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 5000);

      } catch (error) {
        messageDiv.textContent = "Failed to unregister. Please try again.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        console.error("Error unregistering:", error);
      }
    }
  });

  // Initialize app with optimized rendering
  renderActivities();

  // Refresh data periodically
  setInterval(renderActivities, CACHE_DURATION);
});
