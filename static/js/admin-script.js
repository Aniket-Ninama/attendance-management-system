// Initialize data from localStorage or create default data
let students = [
    { id: 1, name: 'John Doe', email: 'john@example.com', roll: 'R001', semester: 1, section: 'A' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', roll: 'R002', semester: 1, section: 'A' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', roll: 'R003', semester: 1, section: 'B' },
    { id: 4, name: 'Sarah Williams', email: 'sarah@example.com', roll: 'R004', semester: 2, section: 'A' },
    { id: 5, name: 'David Brown', email: 'david@example.com', roll: 'R005', semester: 2, section: 'B' }
];

let teachers = JSON.parse(localStorage.getItem('teachers')) || [
    { id: 1, name: 'Dr. Robert Brown', email: 'robert@example.com', subject: 'Mathematics', phone: '1234567890' },
    { id: 2, name: 'Prof. Emily Davis', email: 'emily@example.com', subject: 'Science', phone: '0987654321' },
    { id: 3, name: 'Mr. David Wilson', email: 'david@example.com', subject: 'English', phone: '5555555555' }
];

let attendance = JSON.parse(localStorage.getItem('attendance')) || {};

// Save data to localStorage
function saveData() {
    localStorage.setItem('students', JSON.stringify(students));
    localStorage.setItem('teachers', JSON.stringify(teachers));
    localStorage.setItem('attendance', JSON.stringify(attendance));
}

// Show section
function showSection(section, event) {
    // Hide all sections
    document.querySelectorAll('[id$="Section"]').forEach(el => el.classList.add('hidden'));
    
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    
    // Show selected section
    const sectionElement = document.getElementById(section + 'Section');
    if (sectionElement) {
        sectionElement.classList.remove('hidden');
    }
    
    // Add active class to menu item
    event.target.closest('.menu-item').classList.add('active');
    
    // Update page title and header actions
    const titles = {
        dashboard: 'Dashboard',
        students: 'Students Management',
        teachers: 'Teachers Management',
        attendance: 'Attendance Management',
        reports: 'Reports'
    };
    
    document.getElementById('pageTitle').textContent = titles[section];
    
    // Update header actions based on section
    const headerActions = document.getElementById('headerActions');
    if (section === 'students') {
        headerActions.innerHTML = '<button class="btn btn-primary" onclick="openModal(\'addStudentModal\')">+ Add Student</button>';
        renderStudentsTable();
    } else if (section === 'teachers') {
        headerActions.innerHTML = '<button class="btn btn-primary" onclick="openModal(\'addTeacherModal\')">+ Add Teacher</button>';
        renderTeachersTable();
    } else if (section === 'attendance') {
        headerActions.innerHTML = '';
        setTodayDate();
        loadAttendance();
    } else if (section === 'reports') {
        headerActions.innerHTML = '';
        setReportDates();
    } else {
        headerActions.innerHTML = '';
        updateDashboard();
    }
}

// Update dashboard stats
function updateDashboard() {
    fetch('/render-dashboard')
    .then(response => response.json())
    .then(data => {
        document.getElementById('totalStudents').textContent = data.Total_students;
        document.getElementById('totalTeachers').textContent = data.Total_teachers;
        document.getElementById('todayAttendance').textContent = data.Todays_att + '%';
        document.getElementById('absentToday').textContent = data.Absent_stud;
    })    
}

// Render students table
function renderStudentsTable() {
    const tbody = document.getElementById('studentsTable');
    fetch('/render-students')
    .then(response => response.json())
    .then(data => {
            tbody.innerHTML = data.map(student => `
            <tr>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.semester}</td>
                <td>${student.section}</td>
                <td>${student.roll}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn btn-edit" onclick="editStudent(${student.id})">Edit</button>
                        <button class="action-btn btn-delete" onclick="deleteStudent(${student.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    })
    
}

// Render teachers table
function renderTeachersTable() {
    const tbody = document.getElementById('teachersTable');
    fetch('/render-teachers')
    .then(response => response.json())
    .then(data => {
            tbody.innerHTML = data.map(teacher => `
            <tr>
                <td>${teacher.name}</td>
                <td>${teacher.email}</td>
                <td>${teacher.subject}</td>
                <td>${teacher.phone}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn btn-edit" onclick="editTeacher(${teacher.id})">Edit</button>
                        <button class="action-btn btn-delete" onclick="deleteTeacher(${teacher.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    })
    
}

// Add student
function addStudent(event) {
    event.preventDefault();
    
    const newStudent = {
        name: document.getElementById('studentName').value,
        email: document.getElementById('studentEmail').value,
        semester: document.getElementById('studentSemester').value,
        section: document.getElementById('studentSec').value,
        roll: document.getElementById('studentRoll').value
    };
    fetch('/add-student',{
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
                newStudent
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message)
    })
    .catch(() => alert('Server error'));

    closeModal('addStudentModal');
    renderStudentsTable();
    event.target.reset();
}

// Add teacher
function addTeacher(event) {
    event.preventDefault();
    
    const newTeacher = {
        name: document.getElementById('teacherName').value,
        email: document.getElementById('teacherEmail').value,
        subject: document.getElementById('teacherSubject').value,
        phone: document.getElementById('teacherPhone').value
    };
    fetch('/add-teacher',{
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
                newTeacher
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message)
    })
    .catch(() => alert('Server error'));

    closeModal('addTeacherModal');
    renderTeachersTable();
    event.target.reset();
}

// Edit functions (simplified - you can expand these)
function editStudent(id) {
    fetch("/get-student-data", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id
        })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('editStudentName').value = data.name;
        document.getElementById('editStudentEmail').value = data.email;
        document.getElementById('editStudentSemester').value = data.semester;
        document.getElementById('editStudentSec').value = data.section;
        document.getElementById('editStudentRoll').value = data.roll;
        }
    )
    openModal('editStudentModal');
}

function saveEditStudent(event){
    event.preventDefault();
    if (confirm('Are you sure you want to edit ?')) {
        student_name = document.getElementById('editStudentName').value
        email = document.getElementById('editStudentEmail').value
        semester = document.getElementById('editStudentSemester').value
        section = document.getElementById('editStudentSec').value
        roll = document.getElementById('editStudentRoll').value
        fetch('/save-student-data',{
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_name,
                email,
                section,
                semester,
                roll
            })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            closeModal('editStudentModal'); 
            renderStudentsTable();   
        })  
        event.target.reset; 
    }
    
}

// Delete student
function deleteStudent(id) {
    if (confirm('Are you sure you want to delete this student?')) {
        fetch('/delete-student-data',{
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id
            })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            renderStudentsTable();  
        })  
    }
}

function editTeacher(id) {
    fetch("/get-teacher-data", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id
        })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('editTeacherName').value = data.name;
        document.getElementById('editTeacherEmail').value = data.email;
        document.getElementById('editTeacherPhone').value = data.phone;
        document.getElementById('editTeacherSubject').value = data.subject;
        }
    )
    openModal('editTeacherModal');
}

function saveEditTeacher(event){
    event.preventDefault();
    if (confirm('Are you sure you want to edit ?')) {
        teacher_name = document.getElementById('editTeacherName').value
        email = document.getElementById('editTeacherEmail').value
        subject = document.getElementById('editTeacherSubject').value
        phone = document.getElementById('editTeacherPhone').value
        fetch('/save-teacher-data',{
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teacher_name,
                email,
                subject,
                phone
            })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            closeModal('editTeacherModal'); 
            renderTeachersTable();   
        })  
        event.target.reset; 
    }
}

// Delete teacher
function deleteTeacher(id) {
    if (confirm('Are you sure you want to delete this teacher?')) {
        fetch('/delete-teacher-data',{
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id
            })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            renderTeachersTable();  
        })  
    }
}

// Set today's date for attendance
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
}

// Load attendance for selected date
function loadAttendance() {
    const date = document.getElementById('attendanceDate').value;
    if (!attendance[date]) {
        attendance[date] = students.map(student => ({
            studentId: student.id,
            status: 'absent'
        }));
        saveData();
    }
    
    renderAttendanceTable(date);
}

// Render attendance table
function renderAttendanceTable(date) {
    const tbody = document.getElementById('attendanceTable');
    const dateAttendance = attendance[date] || [];
    
    tbody.innerHTML = students.map(student => {
        const record = dateAttendance.find(a => a.studentId === student.id) || { status: 'absent' };
        return `
            <tr>
                <td>${student.name}</td>
                <td>${student.roll}</td>
                <td>${student.semester}</td>
                <td>${student.section}</td>
                <td>
                    <span class="status-badge status-${record.status}">
                        ${record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn btn-edit" onclick="toggleAttendance(${student.id}, '${date}')">
                            Toggle
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Toggle attendance
function toggleAttendance(studentId, date) {
    if (!attendance[date]) {
        attendance[date] = [];
    }
    
    const record = attendance[date].find(a => a.studentId === studentId);
    if (record) {
        record.status = record.status === 'present' ? 'absent' : 'present';
    } else {
        attendance[date].push({ studentId, status: 'present' });
    }
    
    saveData();
    renderAttendanceTable(date);
}

// Set report dates
function setReportDates() {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    document.getElementById('dailyReportDate').value = today;
    document.getElementById('monthlyReportDate').value = thisMonth;
}

// Generate daily report
function generateDailyReport() {
    const date = document.getElementById('dailyReportDate').value;
    const dateAttendance = attendance[date] || [];
    
    const presentCount = dateAttendance.filter(a => a.status === 'present').length;
    const absentCount = students.length - presentCount;
    const attendanceRate = students.length > 0 ? ((presentCount / students.length) * 100).toFixed(1) : 0;
    
    const reportOutput = document.getElementById('reportOutput');
    reportOutput.style.display = 'block';
    reportOutput.innerHTML = `
        <div style="padding: 24px; background: white; border-radius: 12px; border: 1px solid var(--border);">
            <h3 style="margin-bottom: 20px; color: var(--dark);">Daily Attendance Report - ${date}</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
                <div style="padding: 16px; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: 700; color: var(--success);">${presentCount}</div>
                    <div style="font-size: 14px; color: var(--text);">Present</div>
                </div>
                <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: 700; color: var(--danger);">${absentCount}</div>
                    <div style="font-size: 14px; color: var(--text);">Absent</div>
                </div>
                <div style="padding: 16px; background: rgba(99, 102, 241, 0.1); border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: 700; color: var(--primary);">${attendanceRate}%</div>
                    <div style="font-size: 14px; color: var(--text);">Attendance Rate</div>
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: var(--light);">
                        <th style="padding: 12px; text-align: left;">Student Name</th>
                        <th style="padding: 12px; text-align: left;">Roll No</th>
                        <th style="padding: 12px; text-align: left;">Semester</th>
                        <th style="padding: 12px; text-align: left;">Section</th>
                        <th style="padding: 12px; text-align: left;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map(student => {
                        const record = dateAttendance.find(a => a.studentId === student.id) || { status: 'absent' };
                        return `
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid var(--border);">${student.name}</td>
                                <td style="padding: 12px; border-bottom: 1px solid var(--border);">${student.roll}</td>
                                <td style="padding: 12px; border-bottom: 1px solid var(--border);">${student.semester}</td>
                                <td style="padding: 12px; border-bottom: 1px solid var(--border);">${student.section}</td>
                                <td style="padding: 12px; border-bottom: 1px solid var(--border);">
                                    <span class="status-badge status-${record.status}">${record.status.toUpperCase()}</span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Generate monthly report
function generateMonthlyReport() {
    const month = document.getElementById('monthlyReportDate').value;
    const [year, monthNum] = month.split('-');
    
    // Get all dates in the month
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const date = `${year}-${monthNum}-${String(i).padStart(2, '0')}`;
        dates.push(date);
    }
    
    // Calculate monthly stats
    const studentStats = students.map(student => {
        let presentDays = 0;
        let totalDays = 0;
        
        dates.forEach(date => {
            if (attendance[date]) {
                totalDays++;
                const record = attendance[date].find(a => a.studentId === student.id);
                if (record && record.status === 'present') {
                    presentDays++;
                }
            }
        });
        
        return {
            ...student,
            presentDays,
            totalDays,
            attendanceRate: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0
        };
    });
    
    const totalPresent = studentStats.reduce((sum, s) => sum + s.presentDays, 0);
    const totalPossible = students.length * dates.filter(d => attendance[d]).length;
    const overallRate = totalPossible > 0 ? ((totalPresent / totalPossible) * 100).toFixed(1) : 0;
    
    const reportOutput = document.getElementById('reportOutput');
    reportOutput.style.display = 'block';
    reportOutput.innerHTML = `
        <div style="padding: 24px; background: white; border-radius: 12px; border: 1px solid var(--border);">
            <h3 style="margin-bottom: 20px; color: var(--dark);">Monthly Attendance Report - ${month}</h3>
            <div style="padding: 20px; background: rgba(99, 102, 241, 0.1); border-radius: 8px; margin-bottom: 24px;">
                <div style="font-size: 32px; font-weight: 700; color: var(--primary); margin-bottom: 4px;">${overallRate}%</div>
                <div style="font-size: 14px; color: var(--text);">Overall Attendance Rate</div>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: var(--light);">
                        <th style="padding: 12px; text-align: left;">Student Name</th>
                        <th style="padding: 12px; text-align: left;">Roll No</th>
                        <th style="padding: 12px; text-align: center;">Present Days</th>
                        <th style="padding: 12px; text-align: center;">Total Days</th>
                        <th style="padding: 12px; text-align: center;">Attendance %</th>
                    </tr>
                </thead>
                <tbody>
                    ${studentStats.map(student => `
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid var(--border);">${student.name}</td>
                            <td style="padding: 12px; border-bottom: 1px solid var(--border);">${student.roll}</td>
                            <td style="padding: 12px; border-bottom: 1px solid var(--border); text-align: center;">${student.presentDays}</td>
                            <td style="padding: 12px; border-bottom: 1px solid var(--border); text-align: center;">${student.totalDays}</td>
                            <td style="padding: 12px; border-bottom: 1px solid var(--border); text-align: center;">
                                <span style="font-weight: 600; color: ${student.attendanceRate >= 75 ? 'var(--success)' : 'var(--danger)'}">
                                    ${student.attendanceRate}%
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Modal functions
function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add("active");
        }
}
function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("active");
        }
}


// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/logout';
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
});

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn-header');
    const floatingBtn = document.querySelector('.mobile-menu-btn-floating');
    
    // Check if click is outside sidebar and not on menu buttons
    if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
        if (!sidebar.contains(event.target) && 
            event.target !== menuBtn && 
            event.target !== floatingBtn) {
            sidebar.classList.remove('active');
        }
    }
});

// Close sidebar when menu item is clicked on mobile
document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                sidebar.classList.remove('active');
            }
        });
    });
});