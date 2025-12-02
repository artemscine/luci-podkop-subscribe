include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-podkop-subscribe
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_MAINTAINER:=mr-Abdrahimov
PKG_LICENSE:=GPL-2.0

LUCI_TITLE:=Podkop Subscribe Extension
LUCI_DESCRIPTION:=Add Subscribe URL functionality to Podkop for fetching and managing VLESS configurations
LUCI_DEPENDS:=+luci-base +luci-app-podkop +rpcd +rpcd-mod-luci +wget

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature

