// ============================================
// APP LOGIC - Uses Supabase from supabase.js
// NO Supabase initialization here!
// ============================================

// Get Supabase instance from the global singleton
const supabase = window.initSupabase();

// App state
let currentUser = null;
let allCourses = [];
let userEnrollments = new Map();
let currentTab = 'all';
let authMode = 'login';

// Helper functions
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// Authentication functions
async function checkAuth() {
    console.log('🔐 Checking authentication...');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        console.log('✅ User authenticated:', currentUser.email);
        await loadUserData();
        await loadCourses();
        await loadEnrollments();
        showDashboard();
        return true;
    } else {
        console.log('⚠️ No user session found');
        showAuth();
        return false;
    }
}

async function loadUserData() {
    if (!currentUser) return;
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUser.id)
        .single();
    
    const displayName = profile?.full_name || currentUser.email.split('@')[0];
    document.getElementById('userName').textContent = displayName;
    document.getElementById('welcomeName').textContent = displayName.split(' ')[0];
    document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();
}

async function handleAuth() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    if (!email || !password) {
        showToast('Please enter email and password', true);
        return;
    }
    
    try {
        if (authMode === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showToast('Logged in successfully!');
        } else {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            showToast('Account created! Please check your email to confirm.');
        }
    } catch (error) {
        showToast(error.message, true);
    }
}

// Course functions
async function loadCourses() {
    console.log('📚 Loading courses...');
    
    const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('id');
    
    if (error) {
        console.error('Error loading courses:', error);
        return [];
    }
    
    allCourses = data || [];
    console.log(`✅ Loaded ${allCourses.length} courses`);
    document.getElementById('totalCourses').textContent = allCourses.length;
    return allCourses;
}

async function loadEnrollments() {
    if (!currentUser) return;
    
    console.log('📋 Loading enrollments...');
    userEnrollments.clear();
    
    const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', currentUser.id);
    
    if (error) {
        console.error('Error loading enrollments:', error);
        return;
    }
    
    if (data) {
        data.forEach(enrollment => {
            userEnrollments.set(enrollment.course_id, {
                enrolled: true,
                progress: enrollment.progress || 0,
                status: enrollment.status
            });
        });
        console.log(`✅ Loaded ${data.length} enrollments`);
    }
    
    updateStats();
    renderCourses();
}

async function enrollInCourse(courseId) {
    if (!currentUser) {
        showToast('Please login first', true);
        return;
    }
    
    if (userEnrollments.has(courseId)) {
        showToast('Already enrolled in this course!');
        return;
    }
    
    const course = allCourses.find(c => c.id === courseId);
    console.log(`🎓 Enrolling in: ${course?.name}`);
    
    const { error } = await supabase
        .from('enrollments')
        .insert([{
            user_id: currentUser.id,
            course_id: courseId,
            progress: 0,
            status: 'active',
            enrolled_at: new Date().toISOString()
        }]);
    
    if (error) {
        showToast('Failed to enroll: ' + error.message, true);
    } else {
        await loadEnrollments();
        showToast('Successfully enrolled! 🎉');
    }
}

async function updateProgress(courseId, newProgress) {
    const enrollment = Array.from(userEnrollments.entries()).find(([id]) => id === courseId);
    if (!enrollment) return;
    
    const progress = Math.min(100, newProgress);
    
    const { error } = await supabase
        .from('enrollments')
        .update({ progress, last_accessed: new Date() })
        .eq('user_id', currentUser.id)
        .eq('course_id', courseId);
    
    if (!error) {
        userEnrollments.set(courseId, {
            ...enrollment[1],
            progress: progress
        });
        updateStats();
        renderCourses();
        if (progress === 100) {
            showToast('🎉 Congratulations! Course completed!');
        }
    }
}

// UI functions
function updateStats() {
    const enrolled = Array.from(userEnrollments.values()).filter(e => e.enrolled).length;
    const completed = Array.from(userEnrollments.values()).filter(e => e.progress === 100).length;
    const totalProgress = Array.from(userEnrollments.values()).reduce((sum, e) => sum + (e.progress || 0), 0);
    const avgProgress = enrolled > 0 ? Math.round(totalProgress / enrolled) : 0;
    
    document.getElementById('enrolledCount').textContent = enrolled;
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('overallProgress').textContent = `${avgProgress}%`;
}

function renderCourses() {
    const container = document.getElementById('coursesContainer');
    
    if (allCourses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-database"></i>
                <h3>No Courses Found</h3>
                <p>Please run the SQL setup in your Supabase SQL Editor to add courses.</p>
            </div>
        `;
        return;
    }
    
    let filteredCourses = [];
    if (currentTab === 'enrolled') {
        filteredCourses = allCourses.filter(c => userEnrollments.has(c.id));
    } else if (currentTab === 'completed') {
        filteredCourses = allCourses.filter(c => {
            const enrollment = userEnrollments.get(c.id);
            return enrollment && enrollment.progress === 100;
        });
    } else {
        filteredCourses = allCourses;
    }
    
    if (filteredCourses.length === 0) {
        let message = '';
        if (currentTab === 'enrolled') {
            message = 'No enrolled courses yet. Browse "All Courses" to get started!';
        } else if (currentTab === 'completed') {
            message = 'No completed courses yet. Keep learning!';
        }
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-info-circle"></i>
                <h3>${message}</h3>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredCourses.map(course => {
        const enrollment = userEnrollments.get(course.id);
        const isEnrolled = !!enrollment;
        const progress = enrollment?.progress || 0;
        const isCompleted = progress === 100;
        const isFree = course.type === 'free' || course.price === 0;
        
        let badge = '';
        if (isCompleted) {
            badge = '<span class="course-badge badge-enrolled">✅ COMPLETED</span>';
        } else if (isEnrolled) {
            badge = '<span class="course-badge badge-enrolled">📖 ENROLLED</span>';
        } else if (isFree) {
            badge = '<span class="course-badge badge-free">FREE</span>';
        } else {
            badge = '<span class="course-badge badge-premium">PREMIUM</span>';
        }
        
        return `
            <div class="course-card">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">${course.icon || '🚗'}</div>
                ${badge}
                <h3 class="course-title">${escapeHtml(course.name)}</h3>
                <p class="course-description">${escapeHtml((course.description || '').substring(0, 120))}${(course.description || '').length > 120 ? '...' : ''}</p>
                ${isEnrolled ? `
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div style="font-size: 0.8rem; color: #a0a0c0; margin-bottom: 10px;">${progress}% Complete</div>
                    <button class="btn-continue" onclick="window.updateProgress(${course.id}, ${progress + 10})">
                        ${isCompleted ? '📋 Review Course' : '▶️ Continue Learning'}
                    </button>
                ` : `
                    <div style="margin: 10px 0; font-weight: bold; color: ${isFree ? '#00ff88' : '#ff9800'}">
                        ${isFree ? 'FREE' : `KES ${(course.price || 0).toLocaleString()}`}
                    </div>
                    <button class="btn-enroll" onclick="window.enrollInCourse(${course.id})">
                        🎓 Enroll Now
                    </button>
                `}
            </div>
        `;
    }).join('');
}

// Navigation functions
function showDashboard() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('dashboardContainer').style.display = 'block';
}

function showAuth() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('dashboardContainer').style.display = 'none';
}

function toggleAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    const title = document.getElementById('authTitle');
    const button = document.getElementById('authButton');
    const switchText = document.getElementById('authSwitchText');
    
    if (authMode === 'login') {
        title.textContent = 'Login to MEI Drive';
        button.textContent = 'Login';
        switchText.textContent = "Don't have an account?";
    } else {
        title.textContent = 'Create Account';
        button.textContent = 'Register';
        switchText.textContent = 'Already have an account?';
    }
}

// Event listeners
document.getElementById('authButton').onclick = handleAuth;
document.getElementById('logoutBtn').onclick = async () => {
    await supabase.auth.signOut();
    showAuth();
};

document.getElementById('toggleAuthLink').onclick = (e) => {
    e.preventDefault();
    toggleAuthMode();
};

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        renderCourses();
    });
});

// Make functions available globally for onclick handlers
window.enrollInCourse = enrollInCourse;
window.updateProgress = updateProgress;

// Initialize app
console.log('🚀 Starting application...');
checkAuth();

// Listen for auth changes
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event);
    if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        await loadUserData();
        await loadCourses();
        await loadEnrollments();
        showDashboard();
        showToast('Logged in successfully!');
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        userEnrollments.clear();
        showAuth();
        showToast('Logged out');
    }
});
