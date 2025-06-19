document.addEventListener('DOMContentLoaded', () => {
  loadWorkouts();
  loadProgress();
  loadBadges();
});

async function loadWorkouts() {
  const container = document.getElementById('workoutList');
  try {
    const res = await fetch('/api/workouts');
    const plans = await res.json();
    container.innerHTML = plans
      .map(
        (p) => `
        <div class="card">
          <h3>${p.name}</h3>
          <p>${p.focusArea}</p>
        </div>`
      )
      .join('');
  } catch (err) {
    container.innerHTML = '<p>Unable to load workouts.</p>';
  }
}

async function loadProgress() {
  const ctx = document.getElementById('progressChart').getContext('2d');
  try {
    const res = await fetch('/api/progress/demo');
    const data = await res.json();
    const dist = data.focusDistribution || { Strength: 1, Cardio: 1, Mobility: 1 };
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(dist),
        datasets: [
          {
            data: Object.values(dist),
            backgroundColor: ['#B30000', '#0033B3', '#00B34D'],
          },
        ],
      },
      options: { plugins: { legend: { position: 'bottom' } } },
    });
  } catch (err) {
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Strength', 'Cardio', 'Mobility'],
        datasets: [
          {
            data: [1, 1, 1],
            backgroundColor: ['#B30000', '#0033B3', '#00B34D'],
          },
        ],
      },
    });
  }
}

async function loadBadges() {
  const container = document.getElementById('badgeList');
  try {
    const res = await fetch('/api/badges');
    const badges = await res.json();
    container.innerHTML = badges
      .map(
        (b) => `
        <div class="badge ${b.isEarned ? 'earned' : ''}">
          <i class="fa-solid fa-dumbbell"></i>
          <span>${b.name}</span>
        </div>`
      )
      .join('');
  } catch (err) {
    container.innerHTML = '<p>No badges yet.</p>';
  }
}
