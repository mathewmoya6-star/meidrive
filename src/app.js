// src/app.js - Works with Vite AND esbuild
import { AuthService } from './services/auth.js';
import { CourseService } from './services/courses.js';
import { UIManager } from './ui/manager.js';
import { Router } from './router.js';

export function createApp(config) {
    return {
        config,
        auth: null,
        courses: null,
        ui: null,
        router: null,
        
        async init() {
            // Initialize services
            this.auth = new AuthService(this.config);
            this.courses = new CourseService(this.auth);
            this.ui = new UIManager();
            this.router = new Router(this);
            
            // Get user session
            await this.auth.init();
            
            // Setup routes
            this.router.init();
            
            // Render initial view
            await this.router.handleRoute(window.location.pathname);
            
            // Setup event delegation
            this.setupEvents();
        },
        
        setupEvents() {
            document.body.addEventListener('click', async (e) => {
                const btn = e.target.closest('[data-action]');
                if (btn) {
                    e.preventDefault();
                    const action = btn.dataset.action;
                    const params = btn.dataset;
                    
                    switch(action) {
                        case 'enroll':
                            await this.courses.enroll(params.courseId);
                            break;
                        case 'view-course':
                            this.router.navigate(`/course/${params.courseId}`);
                            break;
                        case 'logout':
                            await this.auth.logout();
                            this.router.navigate('/');
                            break;
                    }
                }
            });
        }
    };
}
