#!/bin/sh
# Uninstallation script for luci-app-podkop-subscribe

set -e

echo "=========================================="
echo "luci-app-podkop-subscribe Uninstallation"
echo "=========================================="
echo ""

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

echo "Step 1: Removing plugin files..."

# Remove CGI scripts
if [ -f /www/cgi-bin/podkop-subscribe ]; then
    rm -f /www/cgi-bin/podkop-subscribe
    echo "  ✓ Removed: /www/cgi-bin/podkop-subscribe"
fi

if [ -f /www/cgi-bin/podkop-subscribe-url ]; then
    rm -f /www/cgi-bin/podkop-subscribe-url
    echo "  ✓ Removed: /www/cgi-bin/podkop-subscribe-url"
fi

# Restore original section.js
if [ -f /www/luci-static/resources/view/podkop/section.js.backup ]; then
    echo "Step 2: Restoring original Podkop section.js..."
    cp /www/luci-static/resources/view/podkop/section.js.backup /www/luci-static/resources/view/podkop/section.js
    echo "  ✓ Restored: section.js from backup"
elif [ -f /www/luci-static/resources/view/podkop/section.js ]; then
    echo "Step 2: No backup found, reinstalling Podkop to restore original file..."
    if opkg list-installed | grep -q "^luci-app-podkop "; then
        opkg reinstall luci-app-podkop >/dev/null 2>&1 || {
            echo "  ⚠ Warning: Could not reinstall Podkop automatically"
            echo "  Please reinstall Podkop manually: opkg reinstall luci-app-podkop"
        }
        echo "  ✓ Podkop reinstalled"
    else
        echo "  ⚠ Warning: Podkop is not installed, cannot restore section.js"
        echo "  Please restore section.js manually or reinstall Podkop"
    fi
fi

# Remove ACL file
if [ -f /usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json ]; then
    rm -f /usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json
    echo "  ✓ Removed: ACL configuration"
fi

# Remove temporary files (optional)
if [ -f /tmp/podkop_subscribe_url.txt ]; then
    rm -f /tmp/podkop_subscribe_url.txt
    echo "  ✓ Removed: temporary Subscribe URL storage"
fi

echo "Step 3: Restarting uhttpd..."
/etc/init.d/uhttpd restart >/dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "Uninstallation completed successfully!"
echo "=========================================="
echo ""
echo "The plugin has been removed. Podkop and its dependencies"
echo "have NOT been removed and should continue working normally."
echo ""
echo "Please:"
echo "1. Clear your browser cache (Ctrl+F5)"
echo "2. Verify Podkop is working correctly"
echo ""
echo "Note: Backup file is preserved at:"
echo "  /www/luci-static/resources/view/podkop/section.js.backup"
echo "  (You can remove it manually if not needed)"
echo ""

