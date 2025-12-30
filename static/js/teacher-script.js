// Set today's date
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('lectureDate').value = today;
}

// Start lecture
function startLecture() {
    const course = document.getElementById('course').value;
    const semester = document.getElementById('semester').value;
    const section = document.getElementById('section').value;
    const subject = document.getElementById('subject').value;
    const date = document.getElementById('lectureDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    // Validation
    if (!course || !semester || !section || !startTime || !endTime) {
        alert('Please fill in all fields to start the lecture!');
        return;
    }

    if (startTime >= endTime) {
        alert('End time must be after start time!');
        return;
    }

    // Set current lecture
    currentLecture = {
        course,
        semester,
        section,
        subject,
        date,
        startTime,
        endTime,
        timestamp: new Date().toISOString()
    };

    fetch('/start-attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentLecture
            })
        }
    )
    .then(response => response.json())
    .then(data => {
        if (data.success){
            displayLectureInfo(semester, section, subject, date, startTime, endTime);
            document.getElementById('attendanceSection').style.display = 'block';
            document.getElementById('lectureInfo').classList.add('active');
            document.getElementById('statsSummary').classList.add('active');
            document.getElementById('bulkActions').classList.add('active');
            document.getElementById('attendanceGrid').classList.add('active');
            document.getElementById('saveSection').classList.add('active');
            renderAttendanceGrid(data.students_data);
            updateStats(data.students_data);
            // Scroll to attendance section
            document.getElementById('attendanceSection').scrollIntoView({ behavior: 'smooth' });
        }
        else{
            alert(`Students are not found for semester ${semester} - section ${section}!`);
        }
    })
    

    
}

// Display lecture information
function displayLectureInfo(semester, section, subject, date, startTime, endTime) {
    document.getElementById('displaySemester').textContent = `Semester ${semester}`;
    document.getElementById('displaySection').textContent = `Section ${section}`;
    document.getElementById('displaySubject').textContent = subject;
    document.getElementById('displayDate').textContent = new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    document.getElementById('displayTime').textContent = `${formatTime(startTime)} - ${formatTime(endTime)}`;
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
function renderAttendanceGrid(studentsData) {
    const grid = document.getElementById('attendanceGrid');

    let total_students = studentsData.map(student => student.id);

    grid.innerHTML = studentsData.map(student => {
        const initials = student.name.split(' ').map(n => n[0]).join('');
        
        return `
            <div class="student-card" data-id="${student.id}" onclick="toggleAttendance(${student.id})">
                <div class="student-header">
                    <div class="student-avatar">${initials}</div>
                    <div class="status-indicator" data-id="${student.id}"></div>
                </div>
                <div class="student-name">${student.name}</div>
                <div class="student-details">
                    Roll: ${student.roll} | ${student.email}
                </div>
            </div>
        `;
    }).join('');
    localStorage.setItem("total_students", JSON.stringify(total_students));
}

// Toggle attendance
function toggleAttendance(studentId) {
    const card = document.querySelector(`.student-card[data-id="${studentId}"]`);
    const sign = document.querySelector(`.status-indicator[data-id="${studentId}"]`);
    let presentStudents = JSON.parse(localStorage.getItem("present_students")) || [];
    if (presentStudents.includes(studentId)) {
        presentStudents = presentStudents.filter(id => id !== studentId);
        card.classList.remove("present"); 
        sign.classList.remove("present");
        sign.classList.add("absent");
        card.classList.add("absent");
        sign.textContent = '✗'; 
    } else {
        presentStudents.push(studentId);
        card.classList.remove("absent"); 
        sign.classList.remove("absent");
        card.classList.add("present"); 
        sign.classList.add("present");
        sign.textContent = '✓';
    }
    let total_student = Number(document.getElementById('totalStudents').innerHTML);
    let updated_att = (presentStudents.length / total_student) * 100; 
    document.getElementById('attendanceRate').textContent = updated_att + '%';
    document.getElementById('presentCount').textContent = presentStudents.length;
    document.getElementById('absentCount').textContent = total_student - presentStudents.length;
    localStorage.setItem("present_students", JSON.stringify(presentStudents));

}

// Mark all present
function markAllPresent() {
    let totalStudents = JSON.parse(localStorage.getItem("total_students"));
    localStorage.setItem("present_students", JSON.stringify(totalStudents));
    totalStudents.forEach(studentId => {
        let card = document.querySelector(`.student-card[data-id="${studentId}"]`);
        let sign = document.querySelector(`.status-indicator[data-id="${studentId}"]`);
        if (card && sign) {
            sign.textContent = "✓"; 
            sign.classList.remove("absent");
            card.classList.remove("absent"); 
            sign.classList.add("present");
            card.classList.add("present"); 
        }
    });
    let total_student = totalStudents.length
    let updated_att = (total_student / total_student) * 100; 
    document.getElementById('attendanceRate').textContent = updated_att + '%';
    document.getElementById('presentCount').textContent = total_student;
    document.getElementById('absentCount').textContent = 0;

}

// Mark all absent
function markAllAbsent() {
    let totalStudents = JSON.parse(localStorage.getItem("total_students"));
    localStorage.setItem("present_students", JSON.stringify([]));
    totalStudents.forEach(studentId => {
        let card = document.querySelector(`.student-card[data-id="${studentId}"]`);
        let sign = document.querySelector(`.status-indicator[data-id="${studentId}"]`);
        if (card && sign) {
            sign.textContent = "✗"; 
            sign.classList.remove("present");
            card.classList.remove("present");
            sign.classList.add("absent");
            card.classList.add("absent"); 
        }
    });
    let total_student = totalStudents.length
    document.getElementById('attendanceRate').textContent = 0 + '%';
    document.getElementById('presentCount').textContent = 0;
    document.getElementById('absentCount').textContent = total_student;
}

// Update statistics
function updateStats(studentsData) {
    const totalStudents = studentsData.length;
    const presentCount = "0";
    const absentCount = "0"
    const rate = 0;
    
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('absentCount').textContent = absentCount;
    document.getElementById('attendanceRate').textContent = rate + '%';
}

// Save attendance
function saveAttendance() {
    let presentStudents = JSON.parse(localStorage.getItem("present_students")) || [];
    let totalStudents = JSON.parse(localStorage.getItem("total_students")) || [];
    let absentStudents = totalStudents.filter(student => !presentStudents.includes(student));
    let subject = document.getElementById('subject').value;
    let date = document.getElementById('lectureDate').value;

    if (confirm("Are you sure you want to save the attendance?")) {
        fetch('/save-attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                presentStudents,
                absentStudents,
                subject,
                date,
                course,
                semester,
                section
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                alert(data.message);
            }
            localStorage.setItem("present_students", JSON.stringify([]));
            localStorage.setItem("total_students", JSON.stringify([]));
            resetLecture();
        })
        .catch(error => {
            alert("Something went wrong while saving attendance.");
        });
    }
}

// Reset lecture
function resetLecture() {
    // Hide sections
    document.getElementById('attendanceSection').style.display = 'none';
    document.getElementById('lectureInfo').classList.remove('active');
    
    // Clear form
    document.getElementById('course').value = '';
    document.getElementById('semester').value = '';
    document.getElementById('section').value = '';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Logout
function logout() {    
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/logout';
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    fetch('/rewrite-teacher-values')
    .then(response => response.json())
    .then(data => {
        if (data.success){
            document.getElementById('subject').value = data.subject;
            document.querySelector('.user-name').textContent = data.teacher_name;
        }
    })
    
    setTodayDate();
    
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
    }
});