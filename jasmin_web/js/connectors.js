// Connectors Management Module
window.Connectors = {
    smppConnectors: [],
    httpConnectors: [],
    currentTab: 'smpp',

    async load() {
        await this.loadSMPP();
        await this.loadHTTP();
    },

    async loadSMPP() {
        try {
            App.showLoading();
            const response = await API.smppConnectors.list();
            this.smppConnectors = response.connectors || [];
            this.renderSMPP();
        } catch (error) {
            App.showToast('Error loading SMPP connectors: ' + error.message, 'error');
            document.getElementById('smpp-tbody').innerHTML = 
                '<tr><td colspan="6" class="text-center">Error loading SMPP connectors</td></tr>';
        } finally {
            App.hideLoading();
        }
    },

    async loadHTTP() {
        try {
            App.showLoading();
            const response = await API.httpConnectors.list();
            this.httpConnectors = response.connectors || [];
            this.renderHTTP();
        } catch (error) {
            App.showToast('Error loading HTTP connectors: ' + error.message, 'error');
            document.getElementById('http-tbody').innerHTML = 
                '<tr><td colspan="4" class="text-center">Error loading HTTP connectors</td></tr>';
        } finally {
            App.hideLoading();
        }
    },

    renderSMPP() {
        const tbody = document.getElementById('smpp-tbody');
        
        if (this.smppConnectors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No SMPP connectors found</td></tr>';
            return;
        }

        tbody.innerHTML = this.smppConnectors.map(conn => `
            <tr>
                <td>${App.escapeHtml(conn.cid)}</td>
                <td>${App.escapeHtml(conn.host || 'N/A')}</td>
                <td>${conn.port || 'N/A'}</td>
                <td>
                    <span class="badge ${conn.status === 'started' ? 'badge-success' : 'badge-danger'}">
                        ${conn.status || 'stopped'}
                    </span>
                </td>
                <td>
                    <span class="badge ${conn.session === 'bound' ? 'badge-success' : 'badge-warning'}">
                        ${conn.session || 'unbound'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${conn.status === 'started' 
                            ? `<button class="btn btn-warning btn-sm" onclick="Connectors.stopSMPP('${conn.cid}')">Stop</button>`
                            : `<button class="btn btn-success btn-sm" onclick="Connectors.startSMPP('${conn.cid}')">Start</button>`
                        }
                        <button class="btn btn-danger btn-sm" onclick="Connectors.deleteSMPP('${conn.cid}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    renderHTTP() {
        const tbody = document.getElementById('http-tbody');
        
        if (this.httpConnectors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No HTTP connectors found</td></tr>';
            return;
        }

        tbody.innerHTML = this.httpConnectors.map(conn => `
            <tr>
                <td>${App.escapeHtml(conn.cid)}</td>
                <td>${App.escapeHtml(conn.url || 'N/A')}</td>
                <td><span class="badge badge-info">${conn.method || 'GET'}</span></td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="Connectors.deleteHTTP('${conn.cid}')">Delete</button>
                </td>
            </tr>
        `).join('');
    },

    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('#connectors-section .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#connectors-section .tab-content').forEach(t => t.classList.remove('active'));
        
        if (tab === 'smpp') {
            document.querySelector('#connectors-section .tab:first-child').classList.add('active');
            document.getElementById('smpp-tab').classList.add('active');
        } else {
            document.querySelector('#connectors-section .tab:last-child').classList.add('active');
            document.getElementById('http-tab').classList.add('active');
        }
    },

    showCreateSMPPModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'create-smpp-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create SMPP Connector</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-smpp-form">
                        <div class="form-group">
                            <label for="smpp-cid">Connector ID *</label>
                            <input type="text" id="smpp-cid" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="smpp-host">Host</label>
                            <input type="text" id="smpp-host" class="form-control" placeholder="127.0.0.1">
                        </div>
                        <div class="form-group">
                            <label for="smpp-port">Port</label>
                            <input type="number" id="smpp-port" class="form-control" placeholder="2775">
                        </div>
                        <div class="form-group">
                            <label for="smpp-username">Username</label>
                            <input type="text" id="smpp-username" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="smpp-password">Password</label>
                            <input type="password" id="smpp-password" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="smpp-bind">Bind Mode</label>
                            <select id="smpp-bind" class="form-control">
                                <option value="transceiver">Transceiver</option>
                                <option value="transmitter">Transmitter</option>
                                <option value="receiver">Receiver</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary" onclick="Connectors.createSMPP()">Create</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.querySelector('.modal-cancel').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    },

    showCreateHTTPModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'create-http-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create HTTP Connector</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-http-form">
                        <div class="form-group">
                            <label for="http-cid">Connector ID *</label>
                            <input type="text" id="http-cid" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="http-url">URL *</label>
                            <input type="url" id="http-url" class="form-control" placeholder="http://example.com/api" required>
                        </div>
                        <div class="form-group">
                            <label for="http-method">Method *</label>
                            <select id="http-method" class="form-control" required>
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary" onclick="Connectors.createHTTP()">Create</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.querySelector('.modal-cancel').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    },

    async createSMPP() {
        const cid = document.getElementById('smpp-cid').value.trim();
        const host = document.getElementById('smpp-host').value.trim();
        const port = document.getElementById('smpp-port').value;
        const username = document.getElementById('smpp-username').value.trim();
        const password = document.getElementById('smpp-password').value;
        const bind = document.getElementById('smpp-bind').value;

        if (!cid) {
            App.showToast('Connector ID is required', 'error');
            return;
        }

        const data = { cid };
        if (host) data.host = host;
        if (port) data.port = parseInt(port);
        if (username) data.username = username;
        if (password) data.password = password;
        if (bind) data.bind = bind;

        try {
            App.showLoading();
            await API.smppConnectors.create(data);
            App.showToast('SMPP connector created successfully', 'success');
            document.getElementById('create-smpp-modal').remove();
            await this.loadSMPP();
        } catch (error) {
            App.showToast('Error creating SMPP connector: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async createHTTP() {
        const cid = document.getElementById('http-cid').value.trim();
        const url = document.getElementById('http-url').value.trim();
        const method = document.getElementById('http-method').value;

        if (!cid || !url || !method) {
            App.showToast('All fields are required', 'error');
            return;
        }

        try {
            App.showLoading();
            await API.httpConnectors.create({ cid, url, method });
            App.showToast('HTTP connector created successfully', 'success');
            document.getElementById('create-http-modal').remove();
            await this.loadHTTP();
        } catch (error) {
            App.showToast('Error creating HTTP connector: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async startSMPP(cid) {
        try {
            App.showLoading();
            await API.smppConnectors.start(cid);
            App.showToast('SMPP connector started', 'success');
            await this.loadSMPP();
        } catch (error) {
            App.showToast('Error starting connector: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async stopSMPP(cid) {
        try {
            App.showLoading();
            await API.smppConnectors.stop(cid);
            App.showToast('SMPP connector stopped', 'success');
            await this.loadSMPP();
        } catch (error) {
            App.showToast('Error stopping connector: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async deleteSMPP(cid) {
        if (!App.confirm(`Delete SMPP connector ${cid}?`)) return;
        
        try {
            App.showLoading();
            await API.smppConnectors.delete(cid);
            App.showToast('SMPP connector deleted', 'success');
            await this.loadSMPP();
        } catch (error) {
            App.showToast('Error deleting connector: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    },

    async deleteHTTP(cid) {
        if (!App.confirm(`Delete HTTP connector ${cid}?`)) return;
        
        try {
            App.showLoading();
            await API.httpConnectors.delete(cid);
            App.showToast('HTTP connector deleted', 'success');
            await this.loadHTTP();
        } catch (error) {
            App.showToast('Error deleting connector: ' + error.message, 'error');
        } finally {
            App.hideLoading();
        }
    }
};
