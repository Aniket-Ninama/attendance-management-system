// Get data from localStorage
let students = JSON.parse(localStorage.getItem('students')) || [];
let lectureAttendance = JSON.parse(localStorage.getItem('lectureAttendance')) || [];

let currentLecture = null;
let currentAttendance = {};

// Set today's date
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('lectureDate').value = today;
}

// Start lecture
function startLecture() {
    const semester = document.getElementById('semester').value;
    const section = document.getElementById('section').value;
    const subject = document.getElementById('subject').value;
    const date = document.getElementById('lectureDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    // Validation
    if (!semester || !section || !subject || !date || !startTime || !endTime) {
        alert('Please fill in all fields to start the lecture!');
        return;
    }

    if (startTime >= endTime) {
        alert('End time must be after start time!');
        return;
    }

    // Set current lecture
    currentLecture = {
        semester,
        section,
        subject,
        date,
        startTime,
        endTime,
        timestamp: new Date().toISOString()
    };

    // Filter students by semester and section
    const filteredStudents = students.filter(s => {
        // Assuming student class format is "Semester X - Section Y"
        return s.class.includes(`Semester ${semester}`) && s.class.includes(`Section ${section}`);
    });

    if (filteredStudents.length === 0) {
        alert(`No students found for Semester ${semester}, Section ${section}. Please add students first from Admin panel.`);
        return;
    }

    // Initialize attendance for filtered students
    currentAttendance = {};
    filteredStudents.forEach(student => {
        currentAttendance[student.id] = 'absent';
    });

    // Display lecture info
    displayLectureInfo();
    
    // Show attendance section
    document.getElementById('attendanceSection').style.display = 'block';
    document.getElementById('lectureInfo').classList.add('active');
    document.getElementById('statsSummary').classList.add('active');
    document.getElementById('bulkActions').classList.add('active');
    document.getElementById('attendanceGrid').classList.add('active');
    document.getElementById('saveSection').classList.add('active');

    // Render attendance grid
    renderAttendanceGrid(filteredStudents);
    updateStats(filteredStudents);

    // Scroll to attendance section
    document.getElementById('attendanceSection').scrollIntoView({ behavior: 'smooth' });
}

// Display lecture information
function displayLectureInfo() {
    document.getElementById('displaySemester').textContent = `Semester ${currentLecture.semester}`;
    document.getElementById('displaySection').textContent = `Section ${currentLecture.section}`;
    document.getElementById('displaySubject').textContent = currentLecture.subject;
    document.getElementById('displayDate').textContent = new Date(currentLecture.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    document.getElementById('displayTime').textContent = `${formatTime(currentLecture.startTime)} - ${formatTime(currentLecture.endTime)}`;
}

// Format time to 12-hour format
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Render attendance grid
function renderAttendanceGrid(filteredStudents) {
    const grid = document.getElementById('attendanceGrid');
    
    grid.innerHTML = filteredStudents.map(student => {
        const status = currentAttendance[student.id] || 'absent';
        const initials = student.name.split(' ').map(n => n[0]).join('');
        
        return `
            <div class="student-card ${status}" onclick="toggleAttendance(${student.id})">
                <div class="student-header">
                    <div class="student-avatar">${initials}</div>
                    <div class="status-indicator ${status}">
                        ${status === 'present' ? '✓' : '✗'}
                    </div>
                </div>
                <div class="student-name">${student.name}</div>
                <div class="student-details">
                    Roll: ${student.roll} | ${student.email}
                </div>
            </div>
        `;
    }).join('');
}

// Toggle attendance
function toggleAttendance(studentId) {
    currentAttendance[studentId] = currentAttendance[studentId] === 'present' ? 'absent' : 'present';
    
    const filteredStudents = students.filter(s => {
        return s.class.includes(`Semester ${currentLecture.semester}`) && 
               s.class.includes(`Section ${currentLecture.section}`);
    });
    
    renderAttendanceGrid(filteredStudents);
    updateStats(filteredStudents);
}

// Mark all present
function markAllPresent() {
    Object.keys(currentAttendance).forEach(id => {
        currentAttendance[id] = 'present';
    });
    
    const filteredStudents = students.filter(s => {
        return s.class.includes(`Semester ${currentLecture.semester}`) && 
               s.class.includes(`Section ${currentLecture.section}`);
    });
    
    renderAttendanceGrid(filteredStudents);
    updateStats(filteredStudents);
}

// Mark all absent
function markAllAbsent() {
    Object.keys(currentAttendance).forEach(id => {
        currentAttendance[id] = 'absent';
    });
    
    const filteredStudents = students.filter(s => {
        return s.class.includes(`Semester ${currentLecture.semester}`) && 
               s.class.includes(`Section ${currentLecture.section}`);
    });
    
    renderAttendanceGrid(filteredStudents);
    updateStats(filteredStudents);
}

// Update statistics
function updateStats(filteredStudents) {
    const totalStudents = filteredStudents.length;
    const presentCount = Object.values(currentAttendance).filter(status => status === 'present').length;
    const absentCount = totalStudents - presentCount;
    const rate = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : 0;
    
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('absentCount').textContent = absentCount;
    document.getElementById('attendanceRate').textContent = rate + '%';
}

// Save attendance
function saveAttendance() {
    if (!currentLecture) {
        alert('No lecture in progress!');
        return;
    }

    // Create lecture record
    const lectureRecord = {
        ...currentLecture,
        attendance: { ...currentAttendance },
        savedAt: new Date().toISOString()
    };

    // Add to lecture attendance array
    lectureAttendance.push(lectureRecord);
    
    // Save to localStorage
    localStorage.setItem('lectureAttendance', JSON.stringify(lectureAttendance));
    
    alert(`✅ Attendance saved successfully!\n\nLecture: ${currentLecture.subject}\nSemester: ${currentLecture.semester}\nSection: ${currentLecture.section}\nDate: ${currentLecture.date}\nTime: ${formatTime(currentLecture.startTime)} - ${formatTime(currentLecture.endTime)}`);
    
    // Reset
    resetLecture();
}

// Reset lecture
function resetLecture() {
    currentLecture = null;
    currentAttendance = {};
    
    // Hide sections
    document.getElementById('attendanceSection').style.display = 'none';
    document.getElementById('lectureInfo').classList.remove('active');
    
    // Clear form
    document.getElementById('semester').value = '';
    document.getElementById('section').value = '';
    document.getElementById('subject').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Logout
function logout() {
    if (currentLecture) {
        if (!confirm('You have unsaved attendance! Are you sure you want to logout?')) {
            return;
        }
    }
    
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        window.location.href = 'login.html';
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'teacher') {
        window.location.href = 'login.html';
    }
    
    setTodayDate();
    
    // Set default times (common class timings)
    const now = new Date();
    const currentHour = now.getHours();
    
    // Suggest current slot timing
    if (currentHour >= 8 && currentHour < 10) {
        document.getElementById('startTime').value = '08:00';
        document.getElementById('endTime').value = '10:00';
    } else if (currentHour >= 10 && currentHour < 12) {
        document.getElementById('startTime').value = '10:00';
        document.getElementById('endTime').value = '12:00';
    } else if (currentHour >= 12 && currentHour < 14) {
        document.getElementById('startTime').value = '12:00';
        document.getElementById('endTime').value = '14:00';
    } else if (currentHour >= 14 && currentHour < 16) {
        document.getElementById('startTime').value = '14:00';
        document.getElementById('endTime').value = '16:00';
    } else {
        document.getElementById('startTime').value = '09:00';
        document.getElementById('endTime').value = '11:00';
    }
});