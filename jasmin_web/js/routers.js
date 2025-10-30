// Routers Management Module
window.Routers = {
    mtRouters: [],
    moRouters: [],
    currentTab: 'mt',

    async load() {
        await this.loadMT();
        await this.loadMO();
    },

    async loadMT() {
        try {
            App.showLoading();
            const response = await API.mtRouters.list();
            this.mtRouters = response.mtrouters || [];
            this.renderMT();
        } catch (error) {
            App.showToast('Error loading MT routers: ' + error.message, 'error');
            document.getElementById('mt-tbody').innerHTML = 
                '<tr><td colspan="6" class="text-center">Error loading MT routers</td></tr>';
        } finally {
            App.hideLoading();
        }
    },

    async loadMO() {
        try {
            App.showLoading();
            const response = await API.moRouters.list();
            this.moRouters = response.morouters || [];
            this.renderMO();
        } catch (error) {
            App.showToast('Error loading MO routers: ' + error.message, 'error');
            document.getElementById('mo-tbody').innerHTML = 
                '<tr><td colspan="5" class="text-center">Error loading MO routers</td></tr>';
        } finally {
            App.hideLoading();
        }
    },

    renderMT() {
        const tbody = document.getElementById('mt-tbody');
        
        if (this.mtRouters.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No MT routers found</td></tr>';
            return;
        }

        tbody.innerHTML = this.mtRouters.map(router => `
            <tr>
                <td><span class="badge badge-info">${router.order}</span></td>
                <td>${App.escapeHtml(router.type)}</td>
                <td>${router.rate || '0'}</td>
                <td>${Array.isArray(router.connectors) ? router.connectors.join(', ') : 'N/A'}</td>
                <td>${Array.isArray(router.filters) ? router.filters.join(', ') : 'N/A'}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="Routers.deleteMT('${router.order}')">Delete</button>
                </td>
            </tr>
        `).join('');
    },

    renderMO() {
        const tbody = document.getElementById('mo-tbody');
        
        if (this.moRouters.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No MO routers found</td></tr>';
            return;
        }

        tbody.innerHTML = this.moRouters.map(router => `
            <tr>
                <td><span class="badge badge-info">${router.order}</span></td>
                <td>${App.escapeHtml(router.type)}</td>
                <td>${Array.isArray(router.connectors) ? router.connectors.join(', ') : 'N/A'}</td>
                <td>${Array.isArray(router.filters) ? router.filters.join(', ') : 'N/A'}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="Routers.deleteMO('${router.order}')">Delete</button>
                </td>
            </tr>
        `).join('');
    },

    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('#routers-section .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#routers-section .tab-content').forEach(t => t.classList.remove('active'));
        
        if (tab === 'mt') {
            document.querySelector('#routers-section .tab:first-child').classList.add('active');
            document.getElementById('mt-tab').classList.add('active');
        } else {
            document.querySelector('#routers-section .tab:last-child').classList.add('active');
            document.getElementById('mo-tab').classList.add('active');
        }
    },

    async showCreateMTModal() {
        // Fetch connectors and filters for dropdowns
        let smppOptions = '<option value="">Loading...</option>';
        let httpOptions = '<option value="">Loading...</option>';
        let filterOptions = '<option value="">Loading...</option>';

        try {
            const [smppResp, httpResp, filterResp] = await Promise.all([
                API.smppConnectors.list().catch(() => ({ connectors: [] })),
                API.httpConnectors.list().catch(() => ({ connectors: [] })),
                API.filters.list().catch(() => ({ filters: [] }))
            ]);

            const smppConns = smppResp.connectors || [];
            const httpConns = httpResp.connectors || [];
            const filters = filterResp.filters || [];

            smppOptions = smppConns.length > 0
                ? smppConns.map(c => `<option value="${c.cid}">${c.cid}</option>`).join('')
                : '<option value="">No SMPP connectors available</option>';

            httpOptions = httpConns.length > 0
                ? httpConns.map(c => `<option value="${c.cid}">${c.cid}</option>`).join('')
                : '<option value="">No HTTP connectors available</option>';

            filterOptions = filters.length > 0
                ? filters.map(f => `<option value="${f.fid}">${f.fid} (${f.type})</option>`).join('')
                : '<option value="">No filters available</option>';
        } catch (error) {
            console.error('Error loading options:', error);
        }

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'create-mt-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create MT Router</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-mt-form">
                        <div class="form-group">
                            <label for="mt-type">Router Type *</label>
                            <select id="mt-type" class="form-control" required>
                                <option value="DefaultRoute">DefaultRoute (catch-all)</option>
                                <option value="StaticMTRoute">StaticMTRoute (single connector)</option>
                                <option value="RandomRoundrobinMTRoute">RandomRoundrobinMTRoute (load balance)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="mt-order">Order/Priority *</label>
                            <input type="number" id="mt-order" class="form-control" required>
                            <small style="color: #666;">Lower numbers = higher priority</small>
                        </div>
                        <div class="form-group">
                            <label for="mt-rate">Rate *</label>
                            <input type="number" step="0.01" id="mt-rate" class="form-control" value="0" required>
                            <small style="color: #666;">Cost for using this route (0 for free)</small>
                        </div>
                        <div class="form-group">
                            <label for="mt-smppconnectors">SMPP Connectors</label>
                            <select id="mt-smppconnectors" class="form-control" multiple size="4">
                                ${smppOptions}
                            </select>
                            <small style="color: #666;">Hold Ctrl/Cmd to select multiple</small>
                        </div>
                        <div class="form-group">
                            <label for="mt-httpconnectors">HTTP Connectors</label>
                            <select id="mt-httpconnectors" class="form-control" multiple size="4">
                                ${httpOptions}
                            </select>
                            <small style="color: #666;">Hold Ctrl/Cmd to select multiple</small>
                        </div>
                        <div class="form-group">
                            <label for="mt-filters">Filters</label>
                            <select id="mt-filters" class="form-control" multiple size="4">
                                ${filterOptions}
                            </select>
                            <small style="color: #666;">Hold Ctrl/Cmd to select multiple (not required for DefaultRoute)</small>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary" onclick="Routers.createMT()">Create</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.querySelector('.modal-cancel').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    },

    async showCreateMOModal() {
        // Fetch connectors and filters for dropdowns
        let smppOptions = '<option value="">Loading...</option>';
        let httpOptions = '<option value="">Loading...</option>';
        let filterOptions = '<option value="">Loading...</option>';

        try {
            const [smppResp, httpResp, filterResp] = await Promise.all([
                API.smppConnectors.list().catch(() => ({ connectors: [] })),
                API.httpConnectors.list().catch(() => ({ connectors: [] })),
                API.filters.list().catch(() => ({ filters: [] }))
            ]);

            const smppConns = smppResp.connectors || [];
            const httpConns = httpResp.connectors || [];
            const filters = filterResp.filters || [];

            smppOptions = smppConns.length > 0
                ? smppConns.map(c => `<option value="${c.cid}">${c.cid}</option>`).join('')
                : '<option value="">No SMPP connectors available</option>';

            httpOptions = httpConns.length > 0
                ? httpConns.map(c => `<option value="${c.cid}">${c.cid}</option>`).join('')
                : '<option value="">No HTTP connectors available</option>';

            filterOptions = filters.length > 0
                ? filters.map(f => `<option value="${f.fid}">${f.fid} (${f.type})</option>`).join('')
                : '<option value="">No filters available</option>';
        } catch (error) {
            console.error('Error loading options:', error);
        }

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'create-mo-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create MO Router</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-mo-form">
                        <div class="form-group">
                            <label for="mo-type">Router Type *</label>
                            <select id="mo-type" class="form-control" required>
                                <option value="DefaultRoute">DefaultRoute (catch-all)</option>
                                <option value="StaticMORoute">StaticMORoute (single connector)</option>
                                <option value="RandomRoundrobinMORoute">RandomRoundrobinMORoute (load balance)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="mo-order">Order/Priority *</label>
                            <input type="number" id="mo-order" class="form-control" required>
                            <small style="color: #666;">Lower numbers = higher priority</small>
                        </div>
                        <div class="form-group">
                            <label for="mo-smppconnectors">SMPP Connectors</label>
                            <select id="mo-smppconnectors" class="form-control" multiple size="4">
                                ${smppOptions}
                            </select>
                            <small style="color: #666;">Hold Ctrl/Cmd to select multiple</small>
                        </div>
                        <div class="form-group">
                            <label for="mo-httpconnectors">HTTP Connectors</label>
                            <select id="mo-httpconnectors" class="form-control" multiple size="4">
                                ${httpOptions}
                            </select>
                            <small style="color: #666;">Hold Ctrl/Cmd to select multiple</small>
                        </div>
                        <div class="form-group">
                            <label for="mo-filters">Filters</label>
                            <select id="mo-filters" class="form-control" multiple size="4">
                                ${filterOptions}
                            </select>
                            <small style="color: #666;">Hold Ctrl/Cmd to select multiple (not required for DefaultRoute)</small>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary" onclick="Routers.createMO()">Create</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.querySelector('.modal-cancel').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    },

    async createMT() {
        const type = document.getElementById('mt-type').value;
        const order = document.getElementById('mt-order').value;
        const rate = document.getElementById('mt-rate').value;
        
        // Get selected values from multi-select dropdowns
        const smppSelect = document.getElementById('mt-smppconnectors');
        const httpSelect = document.getElementById('mt-httpconnectors');
        const filterSelect = document.getElementById('mt-filters');
        
        const smppconnectors = Array.from(smppSelect.selectedOptions).map(opt => opt.value).join(',');
        const httpconnectors = Array.from(httpSelect.selectedOptions).map(opt => opt.value).join(',');
        const filters = Array.from(filterSelect.selectedOptions).map(opt => opt.value).join(',');

        if (!type || !order || !rate) {
            App.showToast('Type, order, and rate are required', 'error');
            return;
        }

        const data = { type, order, rate };
        if (smppconnectors) data.smppconnectors = smppconnectors;
        if (httpconnectors) data.httpconnectors = httpconnectors;
        if (filters) data.filters = filters;

        try {
            App.showLoading();
            await API.mtRouters.create(data);
            App.showToast('MT router created successfully', 'success');
            document.getElementById('create-mt-modal').remove();
            await this.loadMT();
        } catch (error) {
            App.showToast('Error creating MT router: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async createMO() {
        const type = document.getElementById('mo-type').value;
        const order = document.getElementById('mo-order').value;
        
        // Get selected values from multi-select dropdowns
        const smppSelect = document.getElementById('mo-smppconnectors');
        const httpSelect = document.getElementById('mo-httpconnectors');
        const filterSelect = document.getElementById('mo-filters');
        
        const smppconnectors = Array.from(smppSelect.selectedOptions).map(opt => opt.value).join(',');
        const httpconnectors = Array.from(httpSelect.selectedOptions).map(opt => opt.value).join(',');
        const filters = Array.from(filterSelect.selectedOptions).map(opt => opt.value).join(',');

        if (!type || !order) {
            App.showToast('Type and order are required', 'error');
            return;
        }

        const data = { type, order };
        if (smppconnectors) data.smppconnectors = smppconnectors;
        if (httpconnectors) data.httpconnectors = httpconnectors;
        if (filters) data.filters = filters;

        try {
            App.showLoading();
            await API.moRouters.create(data);
            App.showToast('MO router created successfully', 'success');
            document.getElementById('create-mo-modal').remove();
            await this.loadMO();
        } catch (error) {
            App.showToast('Error creating MO router: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async deleteMT(order) {
        if (!App.confirm(`Delete MT router with order ${order}?`)) return;
        
        try {
            App.showLoading();
            await API.mtRouters.delete(order);
            App.showToast('MT router deleted', 'success');
            await this.loadMT();
        } catch (error) {
            App.showToast('Error deleting MT router: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async deleteMO(order) {
        if (!App.confirm(`Delete MO router with order ${order}?`)) return;
        
        try {
            App.showLoading();
            await API.moRouters.delete(order);
            App.showToast('MO router deleted', 'success');
            await this.loadMO();
        } catch (error) {
            App.showToast('Error deleting MO router: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async flushMT() {
        if (!App.confirm('Flush entire MT routing table? This will delete ALL MT routers!')) return;
        
        try {
            App.showLoading();
            await API.mtRouters.flush();
            App.showToast('MT routing table flushed', 'success');
            await this.loadMT();
        } catch (error) {
            App.showToast('Error flushing MT routers: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async flushMO() {
        if (!App.confirm('Flush entire MO routing table? This will delete ALL MO routers!')) return;
        
        try {
            App.showLoading();
            await API.moRouters.flush();
            App.showToast('MO routing table flushed', 'success');
            await this.loadMO();
        } catch (error) {
            App.showToast('Error flushing MO routers: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    }
};
