// Toggle sidebar for mobile - defined early to avoid errors
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
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
        fetchSubjects(() => {
            loadAttendance();
        });
;
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
                <td>${student.course_name}</td>
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
        course_name: document.getElementById('studentCourseName').value,
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
        closeModal('addStudentModal');
        renderStudentsTable();
        event.target.reset();
    })
    .catch(() => alert("Server error"));
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
        closeModal('addTeacherModal');
        renderTeachersTable();
        event.target.reset();
    })
    .catch(() => alert("Server error"));
}

// Edit functions (simplified - you can expand these)
function editStudent(id) {
    document.getElementById('editStudentId').value = id;
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
        document.getElementById('editCourseName').value = data.course_name;
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
        student_id = document.getElementById('editStudentId').value
        student_name = document.getElementById('editStudentName').value
        email = document.getElementById('editStudentEmail').value
        course_name = document.getElementById('editCourseName').value 
        semester = document.getElementById('editStudentSemester').value
        section = document.getElementById('editStudentSec').value
        roll = document.getElementById('editStudentRoll').value
        fetch('/save-student-data',{
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id,
                student_name,
                email,
                course_name,
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

function editTeacher(id) {
    document.getElementById('editTeacherId').value = id,
    fetch('/get-teacher-data', {
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
        document.getElementById('editTeacherSubject').value = data.subject;
        document.getElementById('editTeacherPhone').value = data.phone;
    })
    openModal('editTeacherModal')
}

function saveEditTeacher(event){
    event.preventDefault();
    const editTeacher = {
        teacher_id: document.getElementById('editTeacherId').value,
        teacher_name: document.getElementById('editTeacherName').value,
        email: document.getElementById('editTeacherEmail').value,
        subject: document.getElementById('editTeacherSubject').value,
        phone: document.getElementById('editTeacherPhone').value
    }
    fetch('/save-teacher-data',{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            editTeacher
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message)
        closeModal('editTeacherModal');
        renderTeachersTable();
    })
    .catch(() => alert('Server error'));
    
}

function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    fetch('/delete-student-data',{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message)
        renderStudentsTable();
    })
    .catch(() => alert("Server error"));
}

function deleteTeacher(id) {
    if (!confirm('Are you sure you want to delete this teacher?')) return;

    fetch('/delete-teacher-data',{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message)
        renderTeachersTable();
    })
    .catch(() => alert("Server error"));
}

// Attendance functions
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
}

function renderAttendanceTable(data, semester, section, course) {
    const tbody = document.getElementById('attendanceTable');
    tbody.innerHTML = data.map(student => `
        <tr>
            <td>${student.student_name}</td>
            <td>${student.subject}</td>
            <td>${student.roll_no}</td>
            <td>${semester}</td>
            <td>${section}</td>
            <td>
                <span class="status-badge status-${student.status}">${student.status.toUpperCase()}</span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="action-btn ${student.status === 'present' ? 'btn-delete' : 'btn-edit'}" 
                            onclick="toggleAttendance(${student.student_id}, '${student.date}','${student.status}')">
                        ${student.status === 'present' ? 'Mark Absent' : 'Mark Present'}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text); opacity: 0.5;">No students found for Course ' + course + ': Semester '+ semester  + ', Section - ' + section + '</td></tr>';
    }
}

function toggleAttendance(studentId, date, status) {
    fetch('/toggle-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
                studentId,
                status,
                date,
                
        })
    })
    .then(res => res.json())
    .then(data => {
        loadAttendance();
    })
    .catch(() => alert('Server error'));
    
    
}

function searchStudentInAttendance() {
    const searchTerm = document.getElementById('searchStudent').value.toLowerCase();
    const date = document.getElementById('attendanceDate').value;
    const course = document.getElementById('courseName').value;
    const semester = document.getElementById('semester').value;
    const section = document.getElementById('section').value;
    const subject = document.getElementById('subjectName').value;
    fetch('/view-attendance',{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            date,
            course,
            semester,
            section,
            searchTerm,
            subject
        })
    })
    .then(response => response.json())
    .then(data => {
        renderAttendanceTable(data, semester, section, course)
    })
}

function fetchSubjects(callback){
    fetch('/get-subjects')
    .then(response => response.json())
    .then(data => {
        if(!data.success){
            alert(data.message);
        }
        else{
            const select = document.getElementById("subjectName");
            data.subjects.forEach((subject, index) => {
                const option = document.createElement("option");
                option.value = subject;
                option.textContent = subject;
                if(index == 0){
                    option.selected = true;
                }
                select.appendChild(option);
            });
            // ✅ call callback AFTER subjects are loaded
            if (typeof callback === 'function') {
                callback();
            }
        }
    })
}

function loadAttendance() {
    const date = document.getElementById('attendanceDate').value;
    const semester = document.getElementById('semester').value;
    const section = document.getElementById('section').value;
    const course = document.getElementById('courseName').value;
    const subject = document.getElementById('subjectName').value;
    fetch('/view-attendance',{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            date,
            course,
            semester,
            section,
            subject
        })
    })
    .then(response => response.json())
    .then(data => {
        renderAttendanceTable(data, semester, section, course)
    })
}

// Set report dates
function setReportDates() {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    document.getElementById('dailyReportDate').value = today;
    document.getElementById('monthlyReportDate').value = thisMonth;
}

// Generate daily report - UPDATED WITH RESPONSIVE STYLING
function generateDailyReport() {
    const date = document.getElementById('dailyReportDate').value;
    fetch('/daily-report',{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            date
        })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success){
            alert(data.message);
        }
        else{
        const reportOutput = document.getElementById('reportOutput');
        reportOutput.style.display = 'block';
        reportOutput.innerHTML = `
            <div class="report-container" style="padding: 24px; background: white; border-radius: 12px; border: 1px solid var(--border); overflow-x: auto;">
                <h3 style="margin-bottom: 20px; color: var(--dark); font-size: clamp(16px, 4vw, 20px);">📅 Daily Attendance Report - ${date}</h3>
                <div class="report-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div style="padding: 16px; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
                        <div style="font-size: clamp(20px, 5vw, 24px); font-weight: 700; color: var(--success);">${data["presentStudents"]}</div>
                        <div style="font-size: clamp(12px, 3vw, 14px); color: var(--text);">Present</div>
                    </div>
                    <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
                        <div style="font-size: clamp(20px, 5vw, 24px); font-weight: 700; color: var(--danger);">${data["absentStudents"]}</div>
                        <div style="font-size: clamp(12px, 3vw, 14px); color: var(--text);">Absent</div>
                    </div>
                    <div style="padding: 16px; background: rgba(99, 102, 241, 0.1); border-radius: 8px;">
                        <div style="font-size: clamp(20px, 5vw, 24px); font-weight: 700; color: var(--primary);">${data["attendancePercent"]}%</div>
                        <div style="font-size: clamp(12px, 3vw, 14px); color: var(--text);">Attendance Rate</div>
                    </div>
                </div>
                <div class="table-wrapper" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                    <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                        <thead>
                            <tr style="background: var(--light);">
                                <th style="padding: 12px 8px; text-align: left; font-size: clamp(10px, 2.5vw, 13px); white-space: nowrap;">Student Name</th>
                                <th style="padding: 12px 8px; text-align: left; font-size: clamp(10px, 2.5vw, 13px); white-space: nowrap;">Roll No</th>
                                <th style="padding: 12px 8px; text-align: left; font-size: clamp(10px, 2.5vw, 13px); white-space: nowrap;">Semester</th>
                                <th style="padding: 12px 8px; text-align: left; font-size: clamp(10px, 2.5vw, 13px); white-space: nowrap;">Section</th>
                                <th style="padding: 12px 8px; text-align: left; font-size: clamp(10px, 2.5vw, 13px); white-space: nowrap;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data["data"].map(student => {
                                return `
                                    <tr>
                                        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border); font-size: clamp(10px, 2.5vw, 14px);">${student.student_name}</td>
                                        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border); font-size: clamp(10px, 2.5vw, 14px);">${student.roll_no}</td>
                                        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border); font-size: clamp(10px, 2.5vw, 14px);">${student.semester}</td>
                                        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border); font-size: clamp(10px, 2.5vw, 14px);">${student.section}</td>
                                        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border);">
                                            <span class="status-badge status-${student.status}" style="padding: 4px 8px; border-radius: 6px; font-size: clamp(9px, 2vw, 12px); font-weight: 600; white-space: nowrap;">${student.status.toUpperCase()}</span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }})
    
    
}

// Generate monthly report - UPDATED WITH RESPONSIVE STYLING
function generateMonthlyReport() {
    const month = document.getElementById('monthlyReportDate').value;
    fetch('/monthly-report',{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            month
        })
    })
    .then(response => response.json())
    .then(data => {       
        if (!data.success){
            alert(data.message);
        }
        else{     
            const reportOutput = document.getElementById('reportOutput');
            reportOutput.style.display = 'block';
            reportOutput.innerHTML = `
                <div class="report-container" style="padding: 24px; background: white; border-radius: 12px; border: 1px solid var(--border); overflow-x: auto;">
                    <h3 style="margin-bottom: 20px; color: var(--dark); font-size: clamp(16px, 4vw, 20px);">📊 Monthly Attendance Report - ${month}</h3>
                    <div style="padding: 20px; background: rgba(99, 102, 241, 0.1); border-radius: 8px; margin-bottom: 24px;">
                        <div style="font-size: clamp(24px, 6vw, 32px); font-weight: 700; color: var(--primary); margin-bottom: 4px;">${data["overall_attendance"]}%</div>
                        <div style="font-size: clamp(12px, 3vw, 14px); color: var(--text);">Overall Attendance Rate</div>
                    </div>
                    <div class="table-wrapper" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                        <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                            <thead>
                                <tr style="background: var(--light);">
                                    <th style="padding: 12px 8px; text-align: left; font-size: clamp(10px, 2.5vw, 13px); white-space: nowrap;">Student Name</th>
                                    <th style="padding: 12px 8px; text-align: left; font-size: clamp(10px, 2.5vw, 13px); white-space: nowrap;">Roll No</th>
                                    <th style="padding: 12px 8px; text-align: center; font-size: clamp(10px, 2.5vw, 13px); white-space: nowrap;">Present Lectures</th>
                                    <th style="padding: 12px 8px; text-align: center; font-size: clamp(10px, 2.5vw, 13px); white-space: nowrap;">Total Lectures</th>
                                    <th style="padding: 12px 8px; text-align: center; font-size: clamp(10px, 2.5vw, 13px); white-space: nowrap;">Attendance %</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data["data"].map(student => `
                                    <tr>
                                        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border); font-size: clamp(10px, 2.5vw, 14px);">${student.student_name}</td>
                                        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border); font-size: clamp(10px, 2.5vw, 14px);">${student.roll_no}</td>
                                        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border); text-align: center; font-size: clamp(10px, 2.5vw, 14px);">${student.present_count}</td>
                                        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border); text-align: center; font-size: clamp(10px, 2.5vw, 14px);">${student.total_classes}</td>
                                        <td style="padding: 12px 8px; border-bottom: 1px solid var(--border); text-align: center;">
                                            <span style="font-weight: 600; color: ${student.attendance_rate >= 75 ? 'var(--success)' : 'var(--danger)'}; font-size: clamp(10px, 2.5vw, 14px);">
                                                ${student.attendance_rate}%
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
    }})
    
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
    fetch("/rewrite-admin-values")
    .then(response => response.json())
    .then(data => {
        const initials = data.admin_name.split(' ').map(n => n[0]).join('');
        document.querySelector('.user-avatar').textContent = initials;
        document.querySelector('.user-name').textContent = data.admin_name;
    })
});

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