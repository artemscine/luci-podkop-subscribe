# Installation & Uninstallation Guide

This guide explains how to install and uninstall `luci-app-podkop-subscribe` on your OpenWrt router.

## Prerequisites

Before installing, ensure you have:

1. **OpenWrt 24.x or later** installed on your router
2. **Podkop** (`luci-app-podkop`) already installed and configured
3. **SSH access** to your router
4. **Internet connection** on the router

## Installation

### Method 1: Automated Installation (Recommended)

Run the installation script directly from GitHub:

```bash
sh <(wget -O - https://raw.githubusercontent.com/mr-Abdrahimov/luci-podkop-subscribe/main/install.sh)
```

This script will:
- Check prerequisites
- Backup original Podkop files
- Download and install all necessary files
- Set proper permissions
- Restart uhttpd service

### Method 2: Manual Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/mr-Abdrahimov/luci-podkop-subscribe.git
   cd luci-podkop-subscribe
   ```

2. Transfer files to your router:
   ```bash
   # Copy CGI scripts
   scp files/www/cgi-bin/podkop-subscribe root@<router-ip>:/www/cgi-bin/
   scp files/www/cgi-bin/podkop-subscribe-url root@<router-ip>:/www/cgi-bin/
   
   # Backup original section.js
   ssh root@<router-ip> "cp /www/luci-static/resources/view/podkop/section.js /www/luci-static/resources/view/podkop/section.js.backup"
   
   # Copy JavaScript file
   scp files/www/luci-static/resources/view/podkop/section.js root@<router-ip>:/www/luci-static/resources/view/podkop/
   
   # Copy ACL file
   scp files/usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json root@<router-ip>:/usr/share/rpcd/acl.d/
   ```

3. Set proper permissions:
   ```bash
   ssh root@<router-ip>
   chmod +x /www/cgi-bin/podkop-subscribe
   chmod +x /www/cgi-bin/podkop-subscribe-url
   chmod 644 /www/luci-static/resources/view/podkop/section.js
   ```

4. Restart uhttpd:
   ```bash
   /etc/init.d/uhttpd restart
   ```

## Reinstallation

If you need to reinstall the plugin (for example, after updating Podkop), simply run the installation script again:

```bash
sh <(wget -O - https://raw.githubusercontent.com/mr-Abdrahimov/luci-podkop-subscribe/main/install.sh)
```

The script will:
- Detect existing installation
- Backup current files
- Completely reinstall all plugin files
- Restart services

## Uninstallation

### Method 1: Automated Uninstallation (Recommended)

Run the uninstallation script directly from GitHub:

```bash
sh <(wget -O - https://raw.githubusercontent.com/mr-Abdrahimov/luci-podkop-subscribe/main/uninstall.sh)
```

This script will:
- Remove all plugin files
- Restore original Podkop `section.js` from backup
- Clean up temporary files
- Restart uhttpd service
- **Never remove Podkop or its dependencies**

### Method 2: Manual Uninstallation

1. **Remove CGI scripts:**
   ```bash
   ssh root@<router-ip>
   rm -f /www/cgi-bin/podkop-subscribe
   rm -f /www/cgi-bin/podkop-subscribe-url
   ```

2. **Restore original section.js:**
   ```bash
   # If backup exists, restore it
   if [ -f /www/luci-static/resources/view/podkop/section.js.backup ]; then
       cp /www/luci-static/resources/view/podkop/section.js.backup /www/luci-static/resources/view/podkop/section.js
   else
       # Reinstall Podkop to restore original file
       opkg reinstall luci-app-podkop
   fi
   ```

3. **Remove ACL file:**
   ```bash
   rm -f /usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json
   ```

4. **Remove stored Subscribe URL (optional):**
   ```bash
   rm -f /tmp/podkop_subscribe_url.txt
   ```

5. **Restart uhttpd:**
   ```bash
   /etc/init.d/uhttpd restart
   ```

## Verification

### After Installation

1. Open LuCI web interface: `http://<router-ip>/cgi-bin/luci/admin/services/podkop`
2. Navigate to a Podkop section
3. Set "Connection Type" to "Proxy"
4. Set "Configuration Type" to "Connection URL"
5. You should see:
   - "Subscribe URL" input field
   - "Получить" (Get) button
   - "Available Configurations" section (after fetching)

### After Uninstallation

1. Open LuCI web interface: `http://<router-ip>/cgi-bin/luci/admin/services/podkop`
2. Navigate to a Podkop section
3. Set "Connection Type" to "Proxy"
4. Set "Configuration Type" to "Connection URL"
5. You should **NOT** see:
   - "Subscribe URL" input field
   - "Получить" (Get) button
   - "Available Configurations" section

## Troubleshooting

### Plugin not appearing in LuCI

- Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
- Restart uhttpd: `/etc/init.d/uhttpd restart`
- Check file permissions: `ls -la /www/cgi-bin/podkop-subscribe*`
- Verify section.js exists: `ls -la /www/luci-static/resources/view/podkop/section.js`

### CGI scripts not working

- Verify scripts are executable: `ls -l /www/cgi-bin/podkop-subscribe*`
- Check uhttpd logs: `logread | grep uhttpd`
- Ensure wget is installed: `opkg install wget`

### JavaScript errors

- Check browser console (F12)
- Verify section.js is in correct location
- Ensure file is readable: `chmod 644 /www/luci-static/resources/view/podkop/section.js`

### Podkop not working after uninstall

If Podkop interface is broken after uninstallation:

1. Reinstall Podkop:
   ```bash
   opkg reinstall luci-app-podkop
   ```

2. Clear browser cache

3. Restart uhttpd:
   ```bash
   /etc/init.d/uhttpd restart
   ```

## Important Notes

### Safety Guarantees

- **Podkop is never removed** during uninstallation
- **Dependencies are never removed** during uninstallation
- Original Podkop files are backed up before modification
- Uninstallation restores original Podkop files

### File Locations

- Plugin files:
  - `/www/cgi-bin/podkop-subscribe`
  - `/www/cgi-bin/podkop-subscribe-url`
  - `/www/luci-static/resources/view/podkop/section.js` (modified)
  - `/usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json`

- Backup files:
  - `/www/luci-static/resources/view/podkop/section.js.backup`

- Temporary files:
  - `/tmp/podkop_subscribe_url.txt` (Subscribe URL storage)

## Dependencies

The following packages are required (usually installed automatically):

- `luci-base` - LuCI web interface framework
- `luci-app-podkop` - Podkop application
- `wget` - For fetching subscription URLs
- `base64` - For decoding base64 data (usually in BusyBox)

Install missing dependencies:
```bash
opkg install wget
```

