let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function calculateStats() {
    fetch('/rewrite-student-values')
    .then(response => response.json())
    .then(data => {
        const initials = data.student_name.split(' ').map(n => n[0]).join('');
        document.getElementById('studentName').textContent = data.student_name;
        document.getElementById('profileAvatar').textContent = initials;
        document.getElementById('profileName').textContent = data.student_name;
        document.getElementById('profileDetails').textContent = `Course: ${data.course} | Roll No: ${data.rollNo} | Semester:  ${data.semester} - ${data.section}`;
        document.getElementById('totalDays').textContent = data.total_count;
        document.getElementById('presentDays').textContent = data.present_count;
        document.getElementById('absentDays').textContent = data.absent_count;
        document.getElementById('attendancePercentage').textContent = data.attendance_per + '%';
        document.getElementById('progressFill').style.width = data.attendance_per + '%';
    })
}

// Render calendar (lecture-based)
function renderCalendar() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    document.getElementById('monthName').textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        emptyDay.style.visibility = 'hidden';
        grid.appendChild(emptyDay);
    }
    fetch('/attendance-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            month: currentMonth + 1, 
            year: currentYear
        })
    })
    .then(response => response.json())
    .then(data => {
        // Group attendance by date
        const attendanceByDate = {};

        data.records.forEach(rec => {
            const dateKey = rec.date;
            if (!attendanceByDate[dateKey]) {
                attendanceByDate[dateKey] = [];
            }
            attendanceByDate[dateKey].push(rec.status);
        });
 
        // Render calendar days
        for (let day = 1; day <= daysInMonth; day++) {

            const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';

            // Highlight today
            if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                dayElement.classList.add('today');
            }

            const dayRecords = attendanceByDate[date] || [];

            if (dayRecords.length > 0) {
                const presentCount = dayRecords.filter(s => s === 'present').length;

                if (presentCount === dayRecords.length) {
                    dayElement.classList.add('present');
                    dayElement.innerHTML = `
                        <div class="day-number">${day}</div>
                        <div class="day-status">✓</div>
                    `;
                } 
                else if (presentCount === 0) {
                    dayElement.classList.add('absent');
                    dayElement.innerHTML = `
                        <div class="day-number">${day}</div>
                        <div class="day-status">✗</div>
                    `;
                } 
                else {
                    dayElement.style.background = 'rgba(245, 158, 11, 0.1)';
                    dayElement.style.borderColor = 'var(--warning)';
                    dayElement.innerHTML = `
                        <div class="day-number">${day}</div>
                        <div class="day-status">${presentCount}/${dayRecords.length}</div>
                    `;
                }
            } 
            else {
                dayElement.innerHTML = `<div class="day-number">${day}</div>`;
            }

            grid.appendChild(dayElement);
        }
    });
    
}

// Change month
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

// Render recent attendance (lecture-wise)
function renderRecentAttendance() {
    const tbody = document.getElementById('recentAttendance');
    
    fetch('/recent-attendance')
    .then(res => res.json())
    .then(data => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        tbody.innerHTML = data.recent_attendance.map(lecture => {
            const dateObj = new Date(lecture.date);
            const dayName = dayNames[dateObj.getDay()];
            const status = lecture.status;
            
            return `
                <tr>
                    <td>
                        ${new Date(lecture.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        <br>
                        <small style="color: var(--text); opacity: 0.7;">${lecture.subject}</small>
                    </td>
                    <td>
                        ${dayName}
                    </td>
                    <td>
                        <span class="status-badge status-${status}">${status.toUpperCase()}</span>
                    </td>
                </tr>
            `;
        }).join('');

        if (data.recent_attendance.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 40px; color: var(--text); opacity: 0.5;">No lecture attendance recorded yet</td></tr>';
        }
    })

    // <br>
                        // <small style="color: var(--text); opacity: 0.7;">${formatTime(lecture.startTime)} - ${formatTime(lecture.endTime)}</small>
}

// Format time to 12-hour format
// function formatTime(time) {
//     const [hours, minutes] = time.split(':');
//     const hour = parseInt(hours);
//     const ampm = hour >= 12 ? 'PM' : 'AM';
//     const hour12 = hour % 12 || 12;
//     return `${hour12}:${minutes} ${ampm}`;
// }

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/logout';
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    calculateStats();
    renderCalendar();
    renderRecentAttendance();
});