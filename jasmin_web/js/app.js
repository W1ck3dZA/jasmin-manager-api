// Main Application Module
const App = {
    // Show toast notification
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    // Show loading overlay
    showLoading() {
        document.getElementById('loading-overlay').classList.add('active');
    },

    // Hide loading overlay
    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('active');
    },

    // Show modal
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    // Hide modal
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    // Confirm action
    confirm(message) {
        return window.confirm(message);
    },

    // Format date
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString();
    },

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Navigate to section
    navigate(section) {
        console.log('App.navigate() called with section:', section);
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-section="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Hide all sections
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.add('hidden');
        });

        // Show selected section
        const selectedSection = document.getElementById(`${section}-section`);
        if (selectedSection) {
            selectedSection.classList.remove('hidden');
        }

        // Load section data
        App.loadSection(section);  // Changed from this.loadSection
    },

    // Load section data
    async loadSection(section) {
        console.log('App.loadSection() called with section:', section);
        
        switch(section) {
            case 'dashboard':
                console.log('Loading dashboard...');
                await App.loadDashboard();  // Changed from this.loadDashboard
                break;
            case 'users':
                console.log('Loading users...');
                console.log('window.Users exists?', typeof window.Users);
                if (window.Users) {
                    console.log('Calling Users.load()');
                    await Users.load();
                } else {
                    console.error('Users module not found!');
                }
                break;
            case 'groups':
                console.log('Loading groups...');
                console.log('window.Groups exists?', typeof window.Groups);
                if (window.Groups) {
                    console.log('Calling Groups.load()');
                    await Groups.load();
                } else {
                    console.error('Groups module not found!');
                }
                break;
            case 'connectors':
                console.log('Loading connectors...');
                if (window.Connectors) await Connectors.load();
                break;
            case 'routers':
                console.log('Loading routers...');
                if (window.Routers) await Routers.load();
                break;
            case 'filters':
                console.log('Loading filters...');
                if (window.Filters) await Filters.load();
                break;
        }
    },

    // Load dashboard statistics
    async loadDashboard() {
        try {
            App.showLoading();  // Changed from this.showLoading

            const [users, groups, smppConns, httpConns, mtRouters, moRouters, filters] = await Promise.all([
                API.users.list().catch(() => ({ users: [] })),
                API.groups.list().catch(() => ({ groups: [] })),
                API.smppConnectors.list().catch(() => ({ connectors: [] })),
                API.httpConnectors.list().catch(() => ({ connectors: [] })),
                API.mtRouters.list().catch(() => ({ mtrouters: [] })),
                API.moRouters.list().catch(() => ({ morouters: [] })),
                API.filters.list().catch(() => ({ filters: [] }))
            ]);

            // Update stats
            document.getElementById('stat-users').textContent = users.users?.length || 0;
            document.getElementById('stat-groups').textContent = groups.groups?.length || 0;
            document.getElementById('stat-connectors').textContent = 
                (smppConns.connectors?.length || 0) + (httpConns.connectors?.length || 0);
            document.getElementById('stat-routers').textContent = 
                (mtRouters.mtrouters?.length || 0) + (moRouters.morouters?.length || 0);
            document.getElementById('stat-filters').textContent = filters.filters?.length || 0;

            // Count active SMPP connectors
            const activeSmpp = smppConns.connectors?.filter(c => c.status === 'started').length || 0;
            document.getElementById('stat-active-smpp').textContent = activeSmpp;

        } catch (error) {
            console.error('Error loading dashboard:', error);
            App.showToast('Error loading dashboard data', 'error');  // Changed from this.showToast
        } finally {
            App.hideLoading();  // Changed from this.hideLoading
        }
    },

    // Initialize app
    init() {
        console.log('App.init() called');
        
        // Check authentication
        if (!Auth.requireAuth()) {
            return;
        }

        // Set username in top bar
        const creds = Auth.getCredentials();
        if (creds) {
            document.getElementById('username').textContent = creds.username;
        }

        // Setup navigation
        const navLinks = document.querySelectorAll('.nav-link');
        console.log('Found nav links:', navLinks.length);
        
        navLinks.forEach(link => {
            console.log('Attaching click handler to:', link.getAttribute('data-section'));
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                console.log('Nav link clicked:', section);
                App.navigate(section);  // Changed from this.navigate to App.navigate
            });
        });

        // Setup logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });

        // Setup modal close buttons
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Close modal on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Load dashboard by default
        App.navigate('dashboard');  // Changed from this.navigate
    }
};

// Initialize when DOM is ready AND all scripts are loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Give a tiny delay to ensure all scripts are parsed
        setTimeout(() => App.init(), 0);
    });
} else {
    // DOM already loaded
    setTimeout(() => App.init(), 0);
}
