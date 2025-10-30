// API Client Module
const API = {
    baseURL: CONFIG.API_BASE_URL,

    // Make authenticated request
    async request(endpoint, options = {}) {
        const authHeader = Auth.getAuthHeader();
        if (!authHeader) {
            Auth.logout();
            throw new Error('Not authenticated');
        }

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
                ...options.headers
            }
        };

        try {
            const response = await fetch(this.baseURL + endpoint, config);
            
            // Handle 401 Unauthorized
            if (response.status === 401) {
                Auth.logout();
                throw new Error('Session expired');
            }

            // Handle 204 No Content
            if (response.status === 204) {
                return { success: true };
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Users
    users: {
        list: () => API.request('/users'),
        get: (uid) => API.request(`/users/${uid}`),
        create: (data) => API.request('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (uid, updates) => API.request(`/users/${uid}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        }),
        delete: (uid) => API.request(`/users/${uid}`, { method: 'DELETE' }),
        enable: (uid) => API.request(`/users/${uid}/enable`, { 
            method: 'PUT',
            body: JSON.stringify({})
        }),
        disable: (uid) => API.request(`/users/${uid}/disable`, { 
            method: 'PUT',
            body: JSON.stringify({})
        }),
        smppBan: (uid) => API.request(`/users/${uid}/smpp_ban`, { 
            method: 'PUT',
            body: JSON.stringify({})
        }),
        smppUnbind: (uid) => API.request(`/users/${uid}/smpp_unbind`, { 
            method: 'PUT',
            body: JSON.stringify({})
        })
    },

    // Groups
    groups: {
        list: () => API.request('/groups'),
        create: (gid) => API.request('/groups', {
            method: 'POST',
            body: JSON.stringify({ gid })
        }),
        delete: (gid) => API.request(`/groups/${gid}`, { method: 'DELETE' }),
        enable: (gid) => API.request(`/groups/${gid}/enable`, { 
            method: 'PUT',
            body: JSON.stringify({})
        }),
        disable: (gid) => API.request(`/groups/${gid}/disable`, { 
            method: 'PUT',
            body: JSON.stringify({})
        })
    },

    // Filters
    filters: {
        list: () => API.request('/filters'),
        get: (fid) => API.request(`/filters/${fid}`),
        create: (data) => API.request('/filters', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        delete: (fid) => API.request(`/filters/${fid}`, { method: 'DELETE' })
    },

    // SMPP Connectors
    smppConnectors: {
        list: () => API.request('/smppsconns'),
        get: (cid) => API.request(`/smppsconns/${cid}`),
        create: (data) => API.request('/smppsconns', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (cid, data) => API.request(`/smppsconns/${cid}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        delete: (cid) => API.request(`/smppsconns/${cid}`, { method: 'DELETE' }),
        start: (cid) => API.request(`/smppsconns/${cid}/start`, { 
            method: 'PUT',
            body: JSON.stringify({})
        }),
        stop: (cid) => API.request(`/smppsconns/${cid}/stop`, { 
            method: 'PUT',
            body: JSON.stringify({})
        })
    },

    // HTTP Connectors
    httpConnectors: {
        list: () => API.request('/httpsconns'),
        get: (cid) => API.request(`/httpsconns/${cid}`),
        create: (data) => API.request('/httpsconns', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        delete: (cid) => API.request(`/httpsconns/${cid}`, { method: 'DELETE' })
    },

    // MT Routers
    mtRouters: {
        list: () => API.request('/mtrouters'),
        get: (order) => API.request(`/mtrouters/${order}`),
        create: (data) => API.request('/mtrouters', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        delete: (order) => API.request(`/mtrouters/${order}`, { method: 'DELETE' }),
        flush: () => API.request('/mtrouters/flush', { method: 'DELETE' })
    },

    // MO Routers
    moRouters: {
        list: () => API.request('/morouters'),
        get: (order) => API.request(`/morouters/${order}`),
        create: (data) => API.request('/morouters', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        delete: (order) => API.request(`/morouters/${order}`, { method: 'DELETE' }),
        flush: () => API.request('/morouters/flush', { method: 'DELETE' })
    }
};
