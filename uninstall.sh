#!/bin/sh
# Uninstallation script for luci-app-podkop-subscribe

# Don't exit on errors - we want to clean up as much as possible
set +e

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

PLUGIN_REMOVED=0

# Remove CGI scripts
if [ -f /www/cgi-bin/podkop-subscribe ]; then
    rm -f /www/cgi-bin/podkop-subscribe
    if [ $? -eq 0 ]; then
        echo "  ✓ Removed: /www/cgi-bin/podkop-subscribe"
        PLUGIN_REMOVED=1
    else
        echo "  ✗ Error: Failed to remove /www/cgi-bin/podkop-subscribe"
    fi
fi

if [ -f /www/cgi-bin/podkop-subscribe-url ]; then
    rm -f /www/cgi-bin/podkop-subscribe-url
    if [ $? -eq 0 ]; then
        echo "  ✓ Removed: /www/cgi-bin/podkop-subscribe-url"
        PLUGIN_REMOVED=1
    else
        echo "  ✗ Error: Failed to remove /www/cgi-bin/podkop-subscribe-url"
    fi
fi

# Remove ACL file
if [ -f /usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json ]; then
    rm -f /usr/share/rpcd/acl.d/luci-app-podkop-subscribe.json
    if [ $? -eq 0 ]; then
        echo "  ✓ Removed: ACL configuration"
        PLUGIN_REMOVED=1
    else
        echo "  ✗ Error: Failed to remove ACL file"
    fi
fi

# Remove temporary files
if [ -f /tmp/podkop_subscribe_url.txt ]; then
    rm -f /tmp/podkop_subscribe_url.txt
    if [ $? -eq 0 ]; then
        echo "  ✓ Removed: temporary Subscribe URL storage"
    fi
fi

# Verify all plugin files are removed
if [ "$PLUGIN_REMOVED" -eq 0 ]; then
    echo "  ℹ No plugin files found to remove (may already be removed)"
fi

# Restore original section.js
echo ""
echo "Step 2: Restoring original Podkop section.js..."

RESTORED=0

# Method 1: Restore from backup if exists
if [ -f /www/luci-static/resources/view/podkop/section.js.backup ]; then
    cp /www/luci-static/resources/view/podkop/section.js.backup /www/luci-static/resources/view/podkop/section.js
    if [ $? -eq 0 ]; then
        echo "  ✓ Restored: section.js from backup"
        RESTORED=1
    fi
fi

# Method 2: If backup not found, reinstall Podkop package to restore original file
if [ "$RESTORED" -eq 0 ] && opkg list-installed | grep -q "^luci-app-podkop "; then
    echo "  - No backup found, restoring via Podkop reinstall..."
    # Remove the modified file first to ensure clean restore
    rm -f /www/luci-static/resources/view/podkop/section.js
    # Use --force-reinstall and --force-overwrite to ensure files are replaced
    # This will restore original files without removing Podkop
    opkg --force-reinstall --force-overwrite install luci-app-podkop 2>&1 | grep -v "^Removing\|^Installing\|^Configuring\|^Upgrading" || true
    if [ -f /www/luci-static/resources/view/podkop/section.js ]; then
        echo "  ✓ Restored: section.js via Podkop reinstall"
        RESTORED=1
    else
        echo "  ⚠ Warning: Podkop reinstall did not restore section.js"
    fi
fi

# Verify section.js was restored and doesn't contain our plugin code
if [ -f /www/luci-static/resources/view/podkop/section.js ]; then
    # Check if file contains plugin code
    if grep -q "podkop-subscribe-config-list\|podkop-subscribe-loading\|podkop-subscribe-url\|podkop-subscribe-config-list" /www/luci-static/resources/view/podkop/section.js 2>/dev/null; then
        echo "  ⚠ Warning: section.js still contains plugin code!"
        echo "  Attempting final restore by removing file and reinstalling Podkop..."
        if opkg list-installed | grep -q "^luci-app-podkop "; then
            # Remove the file and directory to force complete reinstall
            rm -f /www/luci-static/resources/view/podkop/section.js
            # Wait a moment for file system
            sleep 1
            # Reinstall with force flags
            opkg --force-reinstall --force-overwrite install luci-app-podkop 2>&1 | grep -v "^Removing\|^Installing\|^Configuring\|^Upgrading" || true
            sleep 1
            if [ -f /www/luci-static/resources/view/podkop/section.js ]; then
                # Check again
                if ! grep -q "podkop-subscribe-config-list\|podkop-subscribe-loading\|podkop-subscribe-url" /www/luci-static/resources/view/podkop/section.js 2>/dev/null; then
                    echo "  ✓ Restored: section.js verified clean"
                    RESTORED=1
                else
                    echo "  ✗ Error: section.js still contains plugin code after reinstall"
                    echo "  This may indicate the Podkop package itself was modified"
                    RESTORED=0
                fi
            else
                echo "  ✗ Error: section.js was not restored after reinstall"
                RESTORED=0
            fi
        fi
    else
        # File exists and doesn't contain plugin code - consider it restored
        if [ "$RESTORED" -eq 0 ]; then
            echo "  ✓ Verified: section.js does not contain plugin code (already clean)"
            RESTORED=1
        fi
    fi
else
    # File doesn't exist - this is a problem
    echo "  ✗ Error: section.js file is missing"
    if opkg list-installed | grep -q "^luci-app-podkop "; then
        echo "  Attempting to restore missing file..."
        opkg --force-reinstall --force-overwrite install luci-app-podkop 2>&1 | grep -v "^Removing\|^Installing\|^Configuring\|^Upgrading" || true
        if [ -f /www/luci-static/resources/view/podkop/section.js ]; then
            echo "  ✓ Restored: section.js file recreated"
            RESTORED=1
        else
            RESTORED=0
        fi
    else
        RESTORED=0
    fi
fi

if [ "$RESTORED" -eq 0 ]; then
    echo "  ✗ Error: Could not restore original section.js"
    echo "  Please run manually: opkg --force-reinstall --force-overwrite install luci-app-podkop"
fi

echo ""
echo "Step 3: Restarting uhttpd..."
/etc/init.d/uhttpd restart >/dev/null 2>&1 || true

echo ""
echo "=========================================="
if [ "$RESTORED" -eq 1 ]; then
    echo "Uninstallation completed successfully!"
else
    echo "Uninstallation completed with warnings!"
fi
echo "=========================================="
echo ""
echo "Plugin files have been removed."

if [ "$RESTORED" -eq 1 ]; then
    echo "✓ Original Podkop section.js has been restored."
else
    echo "⚠ Warning: Could not automatically restore Podkop section.js"
    echo ""
    echo "Please run the following command manually:"
    echo "  opkg --force-reinstall --force-overwrite install luci-app-podkop"
    echo ""
    echo "This will restore the original Podkop files without removing Podkop."
fi

echo ""
echo "✓ Podkop and its dependencies have NOT been removed."
echo ""
echo "Verification steps:"
echo "1. Clear your browser cache (Ctrl+F5 or Cmd+Shift+R)"
echo "2. Navigate to: LuCI -> Services -> Podkop"
echo "3. Set Connection Type to 'Proxy' and Configuration Type to 'Connection URL'"
echo "4. Verify that Subscribe URL field is NO LONGER visible"
echo "5. Verify that Podkop is working correctly"
echo ""
