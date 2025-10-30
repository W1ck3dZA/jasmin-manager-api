# Jasmin SMS Gateway - Web Management Portal

A modern, responsive web portal for managing the Jasmin SMS Gateway via its REST API.

## Features

- **Dashboard**: Overview statistics and system status
- **User Management**: Create, update, enable/disable users with SMPP access control
- **Group Management**: Organize users into groups
- **Connector Management**: 
  - SMPP Connectors: Configure and control SMPP server connections
  - HTTP Connectors: Set up HTTP endpoints for message delivery
- **Router Management**:
  - MT Routers: Mobile Terminated (outbound) message routing
  - MO Routers: Mobile Originated (inbound) message routing
- **Filter Management**: Create and manage 11 different filter types

## Technology Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **UI Design**: Modern white/grey theme with responsive layout
- **Authentication**: Basic Auth with session management
- **API Communication**: Fetch API for REST calls

## Installation

1. Copy the `jasmin_web` directory to your server
2. Ensure the Jasmin API is running and accessible
3. Configure your web server to serve the portal files

### Option 1: Using Python's Built-in Server (Development)

```bash
cd jasmin_web
python3 -m http.server 8080
```

Then access the portal at `http://localhost:8080`

### Option 2: Using Nginx (Production)

Add this to your Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/jasmin_web;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # Proxy API requests to Jasmin backend
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 3: Using Apache (Production)

Add this to your Apache configuration:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/jasmin_web
    
    <Directory /path/to/jasmin_web>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # Proxy API requests to Jasmin backend
    ProxyPass /api/ http://localhost:8000/api/
    ProxyPassReverse /api/ http://localhost:8000/api/
</VirtualHost>
```

## Usage

### Login

1. Navigate to the portal URL (e.g., `http://localhost:8080`)
2. Enter your Jasmin API credentials
3. Click "Login"

### Managing Users

- **Create User**: Click "Create User" button, fill in the form (uid, username, password, group)
- **Enable/Disable**: Click the respective button in the Actions column
- **SMPP Operations**: Use "Unbind" or "Ban" buttons for SMPP control
- **Delete**: Click "Delete" to remove a user (requires confirmation)
- **Search**: Use the search bar to filter users by ID, username, or group

### Managing Groups

- **Create Group**: Click "Create Group" button, enter a unique group ID
- **Enable/Disable**: Toggle group status
- **Delete**: Remove a group (requires confirmation)

### Managing Connectors

#### SMPP Connectors
- **Create**: Provide connector ID, host, port, credentials, and bind mode
- **Start/Stop**: Control connector status
- **Delete**: Remove a connector

#### HTTP Connectors
- **Create**: Provide connector ID, URL, and HTTP method (GET/POST)
- **Delete**: Remove a connector

### Managing Routers

#### MT Routers (Outbound)
- **Create**: Select type (DefaultRoute, StaticMTRoute, RandomRoundrobinMTRoute)
- **Configure**: Set order/priority, rate, connectors, and filters
- **Delete**: Remove individual routers
- **Flush**: Clear entire MT routing table

#### MO Routers (Inbound)
- **Create**: Select type (DefaultRoute, StaticMORoute, RandomRoundrobinMORoute)
- **Configure**: Set order/priority, connectors, and filters
- **Delete**: Remove individual routers
- **Flush**: Clear entire MO routing table

### Managing Filters

- **Create**: Select from 11 filter types and provide required parameters
- **Filter Types**:
  - TransparentFilter: Pass-through filter
  - ConnectorFilter: Filter by connector ID
  - UserFilter: Filter by user ID
  - GroupFilter: Filter by group ID
  - SourceAddrFilter: Filter by source address (regex)
  - DestinationAddrFilter: Filter by destination address (regex)
  - ShortMessageFilter: Filter by message content (regex)
  - DateIntervalFilter: Filter by date range
  - TimeIntervalFilter: Filter by time range
  - TagFilter: Filter by tag value
  - EvalPyFilter: Filter using Python expression
- **Delete**: Remove a filter

## File Structure

```
jasmin_web/
├── index.html              # Login page
├── dashboard.html          # Main dashboard
├── README.md              # This file
├── css/
│   └── style.css          # All styling
├── js/
│   ├── auth.js            # Authentication module
│   ├── api.js             # API client wrapper
│   ├── app.js             # Main application logic
│   ├── users.js           # User management
│   ├── groups.js          # Group management
│   ├── connectors.js      # Connector management
│   ├── routers.js         # Router management
│   └── filters.js         # Filter management
└── assets/                # Optional assets (logos, etc.)
```

## API Configuration

The portal expects the Jasmin API to be available at `/api` (relative path). This works when:

1. The portal and API are on the same server
2. You've configured a reverse proxy (see installation options above)

If your API is on a different server, modify `jasmin_web/js/api.js`:

```javascript
const API = {
    baseURL: 'http://your-api-server:8000/api',
    // ... rest of the code
};
```

## Security Considerations

- **HTTPS**: Always use HTTPS in production
- **Authentication**: Credentials are stored in sessionStorage (cleared on browser close)
- **CORS**: Configure CORS on your API server if portal is on different domain
- **Input Validation**: All user inputs are validated before API calls
- **Confirmation Dialogs**: Destructive actions require user confirmation

## Browser Compatibility

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- IE11: ❌ Not supported (uses modern JavaScript features)

## Troubleshooting

### Login fails with "Connection error"
- Ensure the Jasmin API is running
- Check that the API URL is correct
- Verify network connectivity

### "Session expired" errors
- Your session has timed out, please log in again
- Check if the API server is still running

### Data not loading
- Check browser console for errors (F12)
- Verify API endpoints are accessible
- Ensure proper CORS configuration if on different domain

### Styling issues
- Clear browser cache
- Ensure `css/style.css` is loading correctly
- Check browser console for CSS errors

## Development

To modify the portal:

1. Edit HTML files for structure changes
2. Edit `css/style.css` for styling changes
3. Edit JavaScript modules for functionality changes
4. No build process required - changes are immediately visible on refresh

## License

This portal is part of the Jasmin SMS Gateway project.
See the main project LICENSE file for details.

## Support

For issues and questions:
- GitHub: https://github.com/jookies/jasmin-api
- Documentation: Refer to Jasmin SMS Gateway documentation

## Version

Version: 1.0.0
Compatible with: Jasmin API v1.0.0+
