// Users Management Module
console.log('users.js is loading...');
window.Users = {
    allUsers: [],

    async load() {
        console.log('Users.load() called');
        try {
            App.showLoading();
            console.log('Fetching users from API...');
            const response = await API.users.list();
            console.log('API response:', response);
            this.allUsers = response.users || [];
            console.log('Users loaded:', this.allUsers.length);
            this.render(this.allUsers);
        } catch (error) {
            console.error('Error loading users:', error);
            App.showToast('Error loading users: ' + error.message, 'error');
            document.getElementById('users-tbody').innerHTML = 
                '<tr><td colspan="5" class="text-center">Error loading users</td></tr>';
        } finally {
            App.hideLoading();
        }
    },

    render(users) {
        const tbody = document.getElementById('users-tbody');
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => {
            // Get balance and SMS count from nested structure
            const balance = user.mt_messaging_cred?.quota?.balance || 'ND';
            const smsCount = user.mt_messaging_cred?.quota?.sms_count || 'ND';
            
            // Determine status - handle undefined/null values
            const status = user.status || 'enabled';
            const statusClass = status === 'enabled' ? 'badge-success' : 'badge-danger';
            
            return `
            <tr>
                <td>${App.escapeHtml(user.uid || 'N/A')}</td>
                <td>${App.escapeHtml(user.username || 'N/A')}</td>
                <td>${App.escapeHtml(user.gid || 'N/A')}</td>
                <td><span class="badge badge-info">${balance}</span></td>
                <td><span class="badge badge-info">${smsCount}</span></td>
                <td>
                    <span class="badge ${statusClass}">
                        ${status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-info btn-sm" onclick="Users.showInfo('${user.uid}')" title="View Details">ℹ️ Info</button>
                        <button class="btn btn-primary btn-sm" onclick="Users.showEditModal('${user.uid}')" title="Edit User">✏️ Edit</button>
                        ${status === 'enabled' 
                            ? `<button class="btn btn-warning btn-sm" onclick="Users.disable('${user.uid}')">Disable</button>`
                            : `<button class="btn btn-success btn-sm" onclick="Users.enable('${user.uid}')">Enable</button>`
                        }
                        <button class="btn btn-secondary btn-sm" onclick="Users.smppUnbind('${user.uid}')">Unbind</button>
                        <button class="btn btn-warning btn-sm" onclick="Users.smppBan('${user.uid}')">Ban</button>
                        <button class="btn btn-danger btn-sm" onclick="Users.deleteUser('${user.uid}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
    },

    search(query) {
        const filtered = this.allUsers.filter(user => 
            user.uid.toLowerCase().includes(query.toLowerCase()) ||
            user.username.toLowerCase().includes(query.toLowerCase()) ||
            user.gid.toLowerCase().includes(query.toLowerCase())
        );
        this.render(filtered);
    },

    async showCreateModal() {
        // Fetch groups for dropdown
        let groupsHtml = '<option value="">Loading groups...</option>';
        try {
            const response = await API.groups.list();
            const groups = response.groups || [];
            if (groups.length > 0) {
                groupsHtml = '<option value="">Select a group...</option>' +
                    groups.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
            } else {
                groupsHtml = '<option value="">No groups available</option>';
            }
        } catch (error) {
            groupsHtml = '<option value="">Error loading groups</option>';
        }

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'create-user-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create User</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-user-form">
                        <div class="form-group">
                            <label for="user-uid">User ID *</label>
                            <input type="text" id="user-uid" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="user-username">Username *</label>
                            <input type="text" id="user-username" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="user-password">Password *</label>
                            <input type="password" id="user-password" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="user-gid">Group ID *</label>
                            <select id="user-gid" class="form-control" required>
                                ${groupsHtml}
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary" onclick="Users.create()">Create</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.querySelector('.modal-cancel').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    },

    async create() {
        const uid = document.getElementById('user-uid').value.trim();
        const username = document.getElementById('user-username').value.trim();
        const password = document.getElementById('user-password').value;
        const gid = document.getElementById('user-gid').value.trim();

        if (!uid || !username || !password || !gid) {
            App.showToast('All fields are required', 'error');
            return;
        }

        try {
            App.showLoading();
            await API.users.create({ uid, username, password, gid });
            App.showToast('User created successfully', 'success');
            document.getElementById('create-user-modal').remove();
            await this.load();
        } catch (error) {
            App.showToast('Error creating user: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async enable(uid) {
        try {
            App.showLoading();
            await API.users.enable(uid);
            App.showToast('User enabled successfully', 'success');
            await this.load();
        } catch (error) {
            App.showToast('Error enabling user: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async disable(uid) {
        try {
            App.showLoading();
            await API.users.disable(uid);
            App.showToast('User disabled successfully', 'success');
            await this.load();
        } catch (error) {
            App.showToast('Error disabling user: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async smppUnbind(uid) {
        if (!App.confirm('Unbind this user from SMPP server?')) return;
        
        try {
            App.showLoading();
            await API.users.smppUnbind(uid);
            App.showToast('User unbound from SMPP', 'success');
        } catch (error) {
            App.showToast('Error unbinding user: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async smppBan(uid) {
        if (!App.confirm('Ban this user from SMPP server?')) return;
        
        try {
            App.showLoading();
            await API.users.smppBan(uid);
            App.showToast('User banned from SMPP', 'success');
        } catch (error) {
            App.showToast('Error banning user: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async deleteUser(uid) {
        if (!App.confirm(`Delete user ${uid}? This action cannot be undone.`)) return;
        
        try {
            App.showLoading();
            await API.users.delete(uid);
            App.showToast('User deleted successfully', 'success');
            await this.load();
        } catch (error) {
            App.showToast('Error deleting user: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async showInfo(uid) {
        try {
            App.showLoading();
            const response = await API.users.get(uid);
            const user = response.user;
            
            // Helper function to format nested objects
            const formatObject = (obj, indent = 0) => {
                if (!obj || typeof obj !== 'object') return App.escapeHtml(String(obj));
                
                return Object.entries(obj).map(([key, value]) => {
                    const spacing = '&nbsp;'.repeat(indent * 4);
                    if (typeof value === 'object' && value !== null) {
                        return `${spacing}<strong>${key}:</strong><br>${formatObject(value, indent + 1)}`;
                    }
                    return `${spacing}<strong>${key}:</strong> ${App.escapeHtml(String(value))}<br>`;
                }).join('');
            };

            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'user-info-modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>User Details: ${App.escapeHtml(user.uid)}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; gap: 20px;">
                            <!-- Basic Information -->
                            <div class="card" style="padding: 15px; background: #f8f9fa;">
                                <h4 style="margin-top: 0; color: #2c3e50;">📋 Basic Information</h4>
                                <strong>User ID:</strong> ${App.escapeHtml(user.uid)}<br>
                                <strong>Username:</strong> ${App.escapeHtml(user.username)}<br>
                                <strong>Group ID:</strong> ${App.escapeHtml(user.gid)}<br>
                                <strong>Status:</strong> <span class="badge ${(user.status || 'enabled') === 'enabled' ? 'badge-success' : 'badge-danger'}">${user.status || 'enabled'}</span>
                            </div>

                            <!-- MT Messaging Credentials -->
                            ${user.mt_messaging_cred ? `
                            <div class="card" style="padding: 15px; background: #f8f9fa;">
                                <h4 style="margin-top: 0; color: #2c3e50;">💰 Quotas & Balance</h4>
                                ${user.mt_messaging_cred.quota ? `
                                    <strong>Balance:</strong> ${user.mt_messaging_cred.quota.balance || 'ND'}<br>
                                    <strong>Early Percent:</strong> ${user.mt_messaging_cred.quota.early_percent || 'ND'}<br>
                                    <strong>SMS Count:</strong> ${user.mt_messaging_cred.quota.sms_count || 'ND'}<br>
                                    <strong>HTTP Throughput:</strong> ${user.mt_messaging_cred.quota.http_throughput || 'ND'}<br>
                                    <strong>SMPP Throughput:</strong> ${user.mt_messaging_cred.quota.smpps_throughput || 'ND'}
                                ` : 'No quota information'}
                            </div>

                            <div class="card" style="padding: 15px; background: #f8f9fa;">
                                <h4 style="margin-top: 0; color: #2c3e50;">🔐 MT Messaging Authorization</h4>
                                ${user.mt_messaging_cred.authorization ? formatObject(user.mt_messaging_cred.authorization) : 'No authorization data'}
                            </div>

                            <div class="card" style="padding: 15px; background: #f8f9fa;">
                                <h4 style="margin-top: 0; color: #2c3e50;">🔍 MT Value Filters</h4>
                                ${user.mt_messaging_cred.valuefilter ? formatObject(user.mt_messaging_cred.valuefilter) : 'No value filters'}
                            </div>

                            <div class="card" style="padding: 15px; background: #f8f9fa;">
                                <h4 style="margin-top: 0; color: #2c3e50;">⚙️ MT Default Values</h4>
                                ${user.mt_messaging_cred.defaultvalue ? formatObject(user.mt_messaging_cred.defaultvalue) : 'No default values'}
                            </div>
                            ` : ''}

                            <!-- SMPP Credentials -->
                            ${user.smpps_cred ? `
                            <div class="card" style="padding: 15px; background: #f8f9fa;">
                                <h4 style="margin-top: 0; color: #2c3e50;">📡 SMPP Credentials</h4>
                                ${user.smpps_cred.authorization ? `
                                    <strong>Authorization:</strong><br>
                                    ${formatObject(user.smpps_cred.authorization, 1)}
                                ` : ''}
                                ${user.smpps_cred.quota ? `
                                    <strong>Quota:</strong><br>
                                    ${formatObject(user.smpps_cred.quota, 1)}
                                ` : ''}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary modal-close">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelectorAll('.modal-close').forEach(btn => {
                btn.onclick = () => modal.remove();
            });
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        } catch (error) {
            App.showToast('Error loading user details: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async showEditModal(uid) {
        try {
            App.showLoading();
            
            // Fetch user details and groups
            const [userResp, groupsResp] = await Promise.all([
                API.users.get(uid),
                API.groups.list().catch(() => ({ groups: [] }))
            ]);
            
            const user = userResp.user;
            const groups = groupsResp.groups || [];
            
            // Build groups dropdown
            const groupsHtml = groups.length > 0
                ? groups.map(g => `<option value="${g.name}" ${g.name === user.gid ? 'selected' : ''}>${g.name}</option>`).join('')
                : `<option value="${user.gid}">${user.gid}</option>`;

            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'edit-user-modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>Edit User: ${App.escapeHtml(user.uid)}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-user-form">
                            <div class="form-group">
                                <label>User ID (cannot be changed)</label>
                                <input type="text" class="form-control" value="${App.escapeHtml(user.uid)}" disabled>
                            </div>
                            
                            <div class="form-group">
                                <label>Username (cannot be changed)</label>
                                <input type="text" class="form-control" value="${App.escapeHtml(user.username)}" disabled>
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-gid">Group ID</label>
                                <select id="edit-gid" class="form-control">
                                    ${groupsHtml}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-password">New Password (leave empty to keep current)</label>
                                <input type="password" id="edit-password" class="form-control" placeholder="Enter new password or leave empty">
                            </div>
                            
                            <h4 style="margin-top: 20px; color: #2c3e50;">💰 Quotas</h4>
                            <div class="form-group">
                                <label for="edit-balance">Balance (use 'ND' for unlimited)</label>
                                <input type="text" id="edit-balance" class="form-control" value="${user.mt_messaging_cred?.quota?.balance || 'ND'}">
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-sms-count">SMS Count (use 'ND' for unlimited)</label>
                                <input type="text" id="edit-sms-count" class="form-control" value="${user.mt_messaging_cred?.quota?.sms_count || 'ND'}">
                            </div>
                            
                            <small style="color: #666;">Note: Only the fields above can be edited. For advanced settings, please use the Jasmin CLI.</small>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary modal-cancel">Cancel</button>
                        <button class="btn btn-primary" onclick="Users.updateUser('${user.uid}')">Update User</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('.modal-close').onclick = () => modal.remove();
            modal.querySelector('.modal-cancel').onclick = () => modal.remove();
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        } catch (error) {
            App.showToast('Error loading user for editing: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async updateUser(uid) {
        const gid = document.getElementById('edit-gid').value.trim();
        const password = document.getElementById('edit-password').value;
        const balance = document.getElementById('edit-balance').value.trim();
        const smsCount = document.getElementById('edit-sms-count').value.trim();

        // Build updates array in the format required by the API
        const updates = [];
        
        // Add gid update
        if (gid) {
            updates.push(['gid', gid]);
        }
        
        // Add password update if provided
        if (password) {
            updates.push(['password', password]);
        }
        
        // Add quota updates
        if (balance) {
            updates.push(['mt_messaging_cred', 'quota', 'balance', balance]);
        }
        
        if (smsCount) {
            updates.push(['mt_messaging_cred', 'quota', 'sms_count', smsCount]);
        }

        if (updates.length === 0) {
            App.showToast('No changes to update', 'warning');
            return;
        }

        try {
            App.showLoading();
            // Send updates array directly (backend expects request.data to be the array itself)
            await API.users.update(uid, updates);
            App.showToast('User updated successfully', 'success');
            document.getElementById('edit-user-modal').remove();
            await this.load();
        } catch (error) {
            App.showToast('Error updating user: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    }
};
