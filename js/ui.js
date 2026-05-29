// public/js/ui.js - UI Components Module
export const UIComponents = {
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    },
    
    setLoading(loading) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) loading ? spinner.classList.add('active') : spinner.classList.remove('active');
    },
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    escapeHtml(str) {
        if (!str) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return str.replace(/[&<>"']/g, m => map[m]);
    },
    
    showSkeletonCards(containerId, count = 6) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            container.innerHTML += `<div class="skeleton-card"><div class="skeleton-icon"></div><div class="skeleton-title"></div><div class="skeleton-text"></div><div class="skeleton-price"></div></div>`;
        }
    },
    
    updateAuthUI(user, elements) {
        if (user) {
            if (elements.authLinks) elements.authLinks.style.display = 'none';
            if (elements.userInfo) elements.userInfo.style.display = 'flex';
            if (elements.userName) elements.userName.textContent = user.full_name || user.email.split('@')[0];
        } else {
            if (elements.authLinks) elements.authLinks.style.display = 'flex';
            if (elements.userInfo) elements.userInfo.style.display = 'none';
        }
    },
    
    initMobileMenu(menuBtnId, closeBtnId, navId, overlayId) {
        const menuBtn = document.getElementById(menuBtnId);
        const closeBtn = document.getElementById(closeBtnId);
        const mobileNav = document.getElementById(navId);
        const overlay = document.getElementById(overlayId);
        if (!menuBtn) return;
        const open = () => { mobileNav?.classList.add('active'); overlay?.classList.add('active'); document.body.style.overflow = 'hidden'; };
        const close = () => { mobileNav?.classList.remove('active'); overlay?.classList.remove('active'); document.body.style.overflow = ''; };
        menuBtn.addEventListener('click', open);
        closeBtn?.addEventListener('click', close);
        overlay?.addEventListener('click', close);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    },
    
    initModal(modalId, openButtons, closeButtons) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        const open = () => { modal.classList.add('active'); document.body.style.overflow = 'hidden'; };
        const close = () => { modal.classList.remove('active'); document.body.style.overflow = ''; };
        openButtons.forEach(btn => document.getElementById(btn)?.addEventListener('click', open));
        closeButtons.forEach(btn => document.getElementById(btn)?.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('active')) close(); });
        this.initModalFocusTrap(modalId);
    },
    
    initModalFocusTrap(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const focusable = modal.querySelectorAll('button, input, a, [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
    }
};
