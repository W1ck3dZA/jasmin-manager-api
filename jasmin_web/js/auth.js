// Authentication Module
const Auth = {
    // Check if user is authenticated
    isAuthenticated() {
        return sessionStorage.getItem('jasmin_auth') !== null;
    },

    // Get stored credentials
    getCredentials() {
        const auth = sessionStorage.getItem('jasmin_auth');
        if (!auth) return null;
        try {
            return JSON.parse(atob(auth));
        } catch (e) {
            return null;
        }
    },

    // Store credentials
    setCredentials(username, password) {
        const credentials = { username, password };
        sessionStorage.setItem('jasmin_auth', btoa(JSON.stringify(credentials)));
    },

    // Get Basic Auth header
    getAuthHeader() {
        const creds = this.getCredentials();
        if (!creds) return null;
        return 'Basic ' + btoa(creds.username + ':' + creds.password);
    },

    // Login
    async login(username, password) {
        try {
            // Test credentials by making a simple API call
            const response = await fetch(CONFIG.API_BASE_URL + '/users', {
                headers: {
                    'Authorization': 'Basic ' + btoa(username + ':' + password)
                }
            });

            if (response.ok) {
                this.setCredentials(username, password);
                return { success: true };
            } else if (response.status === 401) {
                return { success: false, error: 'Invalid username or password' };
            } else {
                return { success: false, error: 'Server error. Please try again.' };
            }
        } catch (error) {
            return { success: false, error: 'Connection error. Please check if the API is running.' };
        }
    },

    // Logout
    logout() {
        sessionStorage.removeItem('jasmin_auth');
        window.location.href = 'index.html';
    },

    // Require authentication (redirect to login if not authenticated)
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
};
