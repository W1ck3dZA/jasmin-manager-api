// Groups Management Module
window.Groups = {
    allGroups: [],

    async load() {
        try {
            App.showLoading();
            const response = await API.groups.list();
            this.allGroups = response.groups || [];
            this.render(this.allGroups);
        } catch (error) {
            App.showToast('Error loading groups: ' + error.message, 'error');
            document.getElementById('groups-tbody').innerHTML = 
                '<tr><td colspan="3" class="text-center">Error loading groups</td></tr>';
        } finally {
            App.hideLoading();
        }
    },

    render(groups) {
        const tbody = document.getElementById('groups-tbody');
        
        if (groups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No groups found</td></tr>';
            return;
        }

        tbody.innerHTML = groups.map(group => `
            <tr>
                <td>${App.escapeHtml(group.name)}</td>
                <td>
                    <span class="badge ${group.status === 'enabled' ? 'badge-success' : 'badge-danger'}">
                        ${group.status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${group.status === 'enabled' 
                            ? `<button class="btn btn-warning btn-sm" onclick="Groups.disable('${group.name}')">Disable</button>`
                            : `<button class="btn btn-success btn-sm" onclick="Groups.enable('${group.name}')">Enable</button>`
                        }
                        <button class="btn btn-danger btn-sm" onclick="Groups.deleteGroup('${group.name}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    showCreateModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'create-group-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create Group</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-group-form">
                        <div class="form-group">
                            <label for="group-gid">Group ID *</label>
                            <input type="text" id="group-gid" class="form-control" required>
                            <small style="color: #666;">Unique identifier for the group</small>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary" onclick="Groups.create()">Create</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.querySelector('.modal-cancel').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    },

    async create() {
        const gid = document.getElementById('group-gid').value.trim();

        if (!gid) {
            App.showToast('Group ID is required', 'error');
            return;
        }

        try {
            App.showLoading();
            await API.groups.create(gid);
            App.showToast('Group created successfully', 'success');
            document.getElementById('create-group-modal').remove();
            await this.load();
        } catch (error) {
            App.showToast('Error creating group: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async enable(gid) {
        try {
            App.showLoading();
            await API.groups.enable(gid);
            App.showToast('Group enabled successfully', 'success');
            await this.load();
        } catch (error) {
            App.showToast('Error enabling group: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async disable(gid) {
        try {
            App.showLoading();
            await API.groups.disable(gid);
            App.showToast('Group disabled successfully', 'success');
            await this.load();
        } catch (error) {
            App.showToast('Error disabling group: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async deleteGroup(gid) {
        if (!App.confirm(`Delete group ${gid}? This action cannot be undone.`)) return;
        
        try {
            App.showLoading();
            await API.groups.delete(gid);
            App.showToast('Group deleted successfully', 'success');
            await this.load();
        } catch (error) {
            App.showToast('Error deleting group: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    }
};
