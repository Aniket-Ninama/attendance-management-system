// Get data from localStorage
let students = JSON.parse(localStorage.getItem('students')) || [];
let lectureAttendance = JSON.parse(localStorage.getItem('lectureAttendance')) || [];
let currentStudent = students[0] || { id: 1, name: 'John Doe', roll: 'R001', class: 'Semester 1 - Section A' };

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Initialize student profile
function initializeProfile() {
    const initials = currentStudent.name.split(' ').map(n => n[0]).join('');
    document.getElementById('studentName').textContent = currentStudent.name;
    document.getElementById('profileAvatar').textContent = initials;
    document.getElementById('profileName').textContent = currentStudent.name;
    document.getElementById('profileDetails').textContent = `Roll No: ${currentStudent.roll} | ${currentStudent.class}`;
}

// Calculate statistics from lecture-wise attendance
function calculateStats() {
    let totalLectures = 0;
    let attendedLectures = 0;

    // Filter lectures for current student's semester and section
    const studentLectures = lectureAttendance.filter(lecture => {
        return currentStudent.class.includes(`Semester ${lecture.semester}`) && 
               currentStudent.class.includes(`Section ${lecture.section}`);
    });

    studentLectures.forEach(lecture => {
        if (lecture.attendance[currentStudent.id]) {
            totalLectures++;
            if (lecture.attendance[currentStudent.id] === 'present') {
                attendedLectures++;
            }
        }
    });

    const missedLectures = totalLectures - attendedLectures;
    const percentage = totalLectures > 0 ? ((attendedLectures / totalLectures) * 100).toFixed(1) : 0;

    document.getElementById('totalDays').textContent = totalLectures;
    document.getElementById('presentDays').textContent = attendedLectures;
    document.getElementById('absentDays').textContent = missedLectures;
    document.getElementById('attendancePercentage').textContent = percentage + '%';
    document.getElementById('progressFill').style.width = percentage + '%';
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

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        emptyDay.style.visibility = 'hidden';
        grid.appendChild(emptyDay);
    }

    // Add days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';

        // Check if it's today
        if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dayElement.classList.add('today');
        }

        // Check lectures for this date
        const dayLectures = lectureAttendance.filter(lecture => {
            return lecture.date === date && 
                   currentStudent.class.includes(`Semester ${lecture.semester}`) && 
                   currentStudent.class.includes(`Section ${lecture.section}`);
        });

        if (dayLectures.length > 0) {
            const presentCount = dayLectures.filter(lecture => 
                lecture.attendance[currentStudent.id] === 'present'
            ).length;
            
            if (presentCount === dayLectures.length) {
                dayElement.classList.add('present');
                dayElement.innerHTML = `
                    <div class="day-number">${day}</div>
                    <div class="day-status">✓</div>
                `;
            } else if (presentCount === 0) {
                dayElement.classList.add('absent');
                dayElement.innerHTML = `
                    <div class="day-number">${day}</div>
                    <div class="day-status">✗</div>
                `;
            } else {
                dayElement.style.background = 'rgba(245, 158, 11, 0.1)';
                dayElement.style.borderColor = 'var(--warning)';
                dayElement.innerHTML = `
                    <div class="day-number">${day}</div>
                    <div class="day-status">${presentCount}/${dayLectures.length}</div>
                `;
            }
        } else {
            dayElement.innerHTML = `<div class="day-number">${day}</div>`;
        }

        grid.appendChild(dayElement);
    }
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
    
    // Get lectures for current student
    const studentLectures = lectureAttendance.filter(lecture => {
        return currentStudent.class.includes(`Semester ${lecture.semester}`) && 
               currentStudent.class.includes(`Section ${lecture.section}`);
    }).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    tbody.innerHTML = studentLectures.map(lecture => {
        const dateObj = new Date(lecture.date);
        const dayName = dayNames[dateObj.getDay()];
        const status = lecture.attendance[currentStudent.id] || 'absent';
        
        return `
            <tr>
                <td>
                    ${new Date(lecture.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    <br>
                    <small style="color: var(--text); opacity: 0.7;">${lecture.subject}</small>
                </td>
                <td>
                    ${dayName}
                    <br>
                    <small style="color: var(--text); opacity: 0.7;">${formatTime(lecture.startTime)} - ${formatTime(lecture.endTime)}</small>
                </td>
                <td>
                    <span class="status-badge status-${status}">${status.toUpperCase()}</span>
                </td>
            </tr>
        `;
    }).join('');

    if (studentLectures.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 40px; color: var(--text); opacity: 0.5;">No lecture attendance recorded yet</td></tr>';
    }
}

// Format time to 12-hour format
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/logout';
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    initializeProfile();
    calculateStats();
    renderCalendar();
    renderRecentAttendance();
});