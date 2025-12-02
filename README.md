# luci-app-podkop-subscribe

LuCI extension for Podkop that adds Subscribe URL functionality to fetch and manage VLESS proxy configurations.

## Description

This plugin extends the Podkop LuCI interface with a Subscribe feature that allows users to:

- Enter a Subscribe URL that contains base64-encoded VLESS configurations
- Fetch configurations from the Subscribe URL with a single click
- View available configurations in a user-friendly list
- Select and apply configurations directly to the proxy settings
- Automatically save and restore the Subscribe URL on page reload

## Features

- **Subscribe URL Field**: Input field for entering subscription links
- **Fetch Configurations**: Button to retrieve and parse VLESS configurations
- **Configuration List**: Displays available configurations with their titles
- **One-Click Selection**: Click on any configuration to apply it to proxy settings
- **Auto-Save**: Subscribe URL is automatically saved and restored
- **Smart Visibility**: Configuration list only appears when Connection Type is set to "Proxy" and Configuration Type is "Connection URL"

## Requirements

- OpenWrt 24.x or later
- luci-app-podkop (Podkop must be installed)
- wget
- base64 (usually included in BusyBox)

## Tested On

- **Podkop**: v0.7.9
- **LuCI App**: v0.7.9
- **OpenWrt**: 24.10.4

## Installation & Uninstallation

See [INSTALL_UNINSTALL.md](INSTALL_UNINSTALL.md) for detailed installation and uninstallation instructions.

### Quick Install

```bash
sh <(wget -O - https://raw.githubusercontent.com/mr-Abdrahimov/luci-podkop-subscribe/main/install.sh)
```

### Quick Uninstall

```bash
sh <(wget -O - https://raw.githubusercontent.com/mr-Abdrahimov/luci-podkop-subscribe/main/uninstall.sh)
```

## How It Works

1. User enters a Subscribe URL in the "Subscribe URL" field
2. Clicks the "Получить" (Get) button
3. The plugin fetches the URL content (expects base64-encoded data)
4. Decodes the base64 data and parses VLESS URLs
5. Displays configurations in a list below the Subscribe URL field
6. User clicks on a configuration to apply it to the proxy settings
7. The Subscribe URL is automatically saved for future use

## Technical Details

- **Frontend**: JavaScript extension to Podkop's section view
- **Backend**: Two CGI scripts:
  - `/cgi-bin/podkop-subscribe`: Fetches and parses subscription data
  - `/cgi-bin/podkop-subscribe-url`: Manages Subscribe URL storage
- **Storage**: Subscribe URL is saved in `/tmp/podkop_subscribe_url.txt`

## Important Notes

- This plugin modifies Podkop's `section.js` file
- Reinstalling the plugin will completely replace the modified file
- Uninstalling will restore the original Podkop `section.js` file
- Podkop and its dependencies are **never** removed during uninstallation

## License

GPL-2.0

## Repository

https://github.com/mr-Abdrahimov/luci-podkop-subscribe

## Author

mr-Abdrahimov
# luci-podkop-subscribe
