/**
 * 👨‍🏫 Doctors page
 */

document.addEventListener('DOMContentLoaded', async () => {
  renderTopbar('doctors.html');
  document.getElementById('footerPlaceholder').outerHTML = renderFooter();

  const grid = document.getElementById('doctorsGrid');
  setLoading(grid);

  try {
    const data = await API.getDoctorWithSubjects();

    if (!data.length) {
      setEmpty(grid, 'No doctors');
      return;
    }

    grid.innerHTML = data.map(({ doctor, subjects }) => `
      <div class="subject-card" style="cursor:default">
        <span class="subject-icon">👤</span>
        <h3>${escapeHtml(doctor.name)}</h3>
        <p>${escapeHtml(doctor.academicDegree || '')}</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;justify-content:center">
          ${subjects.map(s => `
            <a href="subject.html?id=${encodeURIComponent(s.name)}" class="badge" style="text-decoration:none">
              📚 ${escapeHtml(s.name)}
            </a>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    setEmpty(grid, err.message || 'Failed to load doctors');
  }
});