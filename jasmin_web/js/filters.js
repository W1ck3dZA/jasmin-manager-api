// Filters Management Module
window.Filters = {
    allFilters: [],
    filterTypes: [
        'TransparentFilter',
        'ConnectorFilter',
        'UserFilter',
        'GroupFilter',
        'SourceAddrFilter',
        'DestinationAddrFilter',
        'ShortMessageFilter',
        'DateIntervalFilter',
        'TimeIntervalFilter',
        'TagFilter',
        'EvalPyFilter'
    ],

    async load() {
        try {
            App.showLoading();
            const response = await API.filters.list();
            this.allFilters = response.filters || [];
            this.render(this.allFilters);
        } catch (error) {
            App.showToast('Error loading filters: ' + error.message, 'error');
            document.getElementById('filters-tbody').innerHTML = 
                '<tr><td colspan="4" class="text-center">Error loading filters</td></tr>';
        } finally {
            App.hideLoading();
        }
    },

    render(filters) {
        const tbody = document.getElementById('filters-tbody');
        
        if (filters.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No filters found</td></tr>';
            return;
        }

        tbody.innerHTML = filters.map(filter => `
            <tr>
                <td>${App.escapeHtml(filter.fid)}</td>
                <td><span class="badge badge-info">${App.escapeHtml(filter.type)}</span></td>
                <td>${App.escapeHtml(filter.description || 'N/A')}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="Filters.deleteFilter('${filter.fid}')">Delete</button>
                </td>
            </tr>
        `).join('');
    },

    showCreateModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'create-filter-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create Filter</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-filter-form">
                        <div class="form-group">
                            <label for="filter-fid">Filter ID *</label>
                            <input type="text" id="filter-fid" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="filter-type">Filter Type *</label>
                            <select id="filter-type" class="form-control" required onchange="Filters.updateParameterField()">
                                <option value="">Select a type...</option>
                                ${this.filterTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" id="parameter-group" style="display: none;">
                            <label for="filter-parameter">Parameter</label>
                            <input type="text" id="filter-parameter" class="form-control">
                            <small id="parameter-help" style="color: #666;"></small>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary" onclick="Filters.create()">Create</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.querySelector('.modal-cancel').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    },

    updateParameterField() {
        const type = document.getElementById('filter-type').value;
        const paramGroup = document.getElementById('parameter-group');
        const paramHelp = document.getElementById('parameter-help');
        
        if (type === 'TransparentFilter') {
            paramGroup.style.display = 'none';
        } else {
            paramGroup.style.display = 'block';
            
            // Provide helpful hints based on filter type
            const hints = {
                'ConnectorFilter': 'Connector ID to filter by',
                'UserFilter': 'User ID to filter by',
                'GroupFilter': 'Group ID to filter by',
                'SourceAddrFilter': 'Source address pattern (regex)',
                'DestinationAddrFilter': 'Destination address pattern (regex)',
                'ShortMessageFilter': 'Message content pattern (regex)',
                'DateIntervalFilter': 'Date range (e.g., 2024-01-01;2024-12-31)',
                'TimeIntervalFilter': 'Time range (e.g., 09:00:00;17:00:00)',
                'TagFilter': 'Tag value to filter by',
                'EvalPyFilter': 'Python expression to evaluate'
            };
            
            paramHelp.textContent = hints[type] || 'Parameter for this filter type';
        }
    },

    async create() {
        const fid = document.getElementById('filter-fid').value.trim();
        const type = document.getElementById('filter-type').value;
        const parameter = document.getElementById('filter-parameter').value.trim();

        if (!fid || !type) {
            App.showToast('Filter ID and type are required', 'error');
            return;
        }

        const data = { fid, type };
        
        // Add parameter if needed (not for TransparentFilter)
        if (type !== 'TransparentFilter' && parameter) {
            data.parameter = parameter;
        }

        try {
            App.showLoading();
            await API.filters.create(data);
            App.showToast('Filter created successfully', 'success');
            document.getElementById('create-filter-modal').remove();
            await this.load();
        } catch (error) {
            App.showToast('Error creating filter: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async deleteFilter(fid) {
        if (!App.confirm(`Delete filter ${fid}? This action cannot be undone.`)) return;
        
        try {
            App.showLoading();
            await API.filters.delete(fid);
            App.showToast('Filter deleted successfully', 'success');
            await this.load();
        } catch (error) {
            App.showToast('Error deleting filter: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    }
};
