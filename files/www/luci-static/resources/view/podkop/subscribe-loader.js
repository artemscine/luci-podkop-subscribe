"use strict";

/**
 * Podkop Subscribe Loader
 *
 * This module automatically injects Subscribe URL functionality into Podkop
 * without modifying the original section.js file.
 *
 * It uses MutationObserver to detect when the form is loaded and injects
 * the subscribe fields dynamically.
 */

(function() {
  // Prevent multiple initializations
  if (window._podkopSubscribeLoaded) return;
  window._podkopSubscribeLoaded = true;

  // Wait for LuCI to be ready
  function waitForLuCI(callback, maxAttempts) {
    maxAttempts = maxAttempts || 50;
    var attempts = 0;

    function check() {
      attempts++;
      if (typeof L !== "undefined" && L.require) {
        callback();
      } else if (attempts < maxAttempts) {
        setTimeout(check, 100);
      }
    }

    check();
  }

  // Main initialization
  waitForLuCI(function() {
    L.require("view.podkop.subscribe").then(function(subscribeModule) {
      if (!subscribeModule || !subscribeModule.enhanceSectionWithSubscribe) {
        console.error("[podkop-subscribe] Failed to load subscribe module");
        return;
      }

      // Store the module for later use
      window._podkopSubscribeModule = subscribeModule;

      // Try to hook into the form system
      hookIntoFormSystem(subscribeModule);

      // Also set up DOM observer as fallback
      setupDOMObserver(subscribeModule);

    }).catch(function(err) {
      console.error("[podkop-subscribe] Error loading module:", err);
    });
  });

  // Hook into LuCI form system
  function hookIntoFormSystem(subscribeModule) {
    // Try to intercept form.TypedSection.prototype.renderContents
    if (typeof form !== "undefined" && form.TypedSection && form.TypedSection.prototype) {
      var originalRenderContents = form.TypedSection.prototype.renderContents;

      form.TypedSection.prototype.renderContents = function(cfgsections, nodes) {
        var result = originalRenderContents.apply(this, arguments);

        // Check if this is a podkop section
        if (this.sectiontype === "section" && this.config === "podkop") {
          try {
            subscribeModule.enhanceSectionWithSubscribe(this);
          } catch (e) {
            console.error("[podkop-subscribe] Error enhancing section:", e);
          }
        }

        return result;
      };
    }
  }

  // Set up MutationObserver to detect form loading
  function setupDOMObserver(subscribeModule) {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            // Check if this is a podkop form
            checkAndEnhance(node, subscribeModule);
          }
        });
      });
    });

    // Start observing
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      document.addEventListener("DOMContentLoaded", function() {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      });
    }

    // Also check existing content
    setTimeout(function() {
      checkAndEnhance(document.body, subscribeModule);
    }, 500);
  }

  // Check if element contains podkop form and enhance it
  function checkAndEnhance(element, subscribeModule) {
    if (!element || !element.querySelectorAll) return;

    // Look for proxy_config_type field
    var proxyConfigTypeFields = element.querySelectorAll(
      'select[id*="proxy_config_type"], select[name*="proxy_config_type"]'
    );

    proxyConfigTypeFields.forEach(function(field) {
      // Check if already enhanced
      if (field._podkopSubscribeEnhanced) return;
      field._podkopSubscribeEnhanced = true;

      // Find the section container
      var sectionContainer = field.closest(".cbi-section");
      if (!sectionContainer) return;

      // Mark as enhanced
      sectionContainer._podkopSubscribeEnhanced = true;

      // The enhanceSectionWithSubscribe expects a section object with option() method
      // Since we're doing DOM injection, we need to use a different approach
      injectSubscribeFields(sectionContainer, field, subscribeModule);
    });
  }

  // Inject subscribe fields via DOM manipulation
  function injectSubscribeFields(sectionContainer, proxyConfigTypeField, subscribeModule) {
    // Inject styles first
    if (subscribeModule.injectSubscribeStyles) {
      subscribeModule.injectSubscribeStyles();
    } else {
      injectDefaultStyles();
    }

    // Find the proxy_config_type cbi-value container
    var configTypeContainer = proxyConfigTypeField.closest(".cbi-value");
    if (!configTypeContainer) return;

    // Create subscribe URL field container
    var subscribeContainer = createSubscribeField(sectionContainer, proxyConfigTypeField);

    // Insert after proxy_config_type
    if (configTypeContainer.nextSibling) {
      configTypeContainer.parentNode.insertBefore(subscribeContainer, configTypeContainer.nextSibling);
    } else {
      configTypeContainer.parentNode.appendChild(subscribeContainer);
    }

    // Set up visibility based on proxy_config_type value
    updateSubscribeVisibility(proxyConfigTypeField, subscribeContainer);

    // Listen for changes
    proxyConfigTypeField.addEventListener("change", function() {
      updateSubscribeVisibility(proxyConfigTypeField, subscribeContainer);
    });
  }

  // Create subscribe URL field
  function createSubscribeField(sectionContainer, proxyConfigTypeField) {
    var container = document.createElement("div");
    container.className = "cbi-value podkop-subscribe-container";
    container.id = "podkop-subscribe-url-container";

    // Label
    var label = document.createElement("label");
    label.className = "cbi-value-title";
    label.textContent = "Subscribe URL";
    container.appendChild(label);

    // Field container
    var fieldContainer = document.createElement("div");
    fieldContainer.className = "cbi-value-field";

    // Input
    var input = document.createElement("input");
    input.type = "text";
    input.className = "cbi-input-text";
    input.id = "podkop-subscribe-url-input";
    input.placeholder = "https://example.com/subscribe";
    input.style.cssText = "width: calc(100% - 120px); margin-right: 10px;";
    fieldContainer.appendChild(input);

    // Button
    var button = document.createElement("button");
    button.type = "button";
    button.className = "cbi-button cbi-button-add";
    button.textContent = "Получить";
    button.style.cssText = "width: 100px;";
    button.onclick = function(ev) {
      ev.preventDefault();
      fetchAndDisplayConfigs(input.value, container, sectionContainer);
    };
    fieldContainer.appendChild(button);

    // Description
    var desc = document.createElement("div");
    desc.className = "cbi-value-description";
    desc.textContent = "Введите Subscribe URL для получения конфигураций";
    fieldContainer.appendChild(desc);

    container.appendChild(fieldContainer);

    // Load saved URL from localStorage
    var savedUrl = localStorage.getItem("podkop_subscribe_url");
    if (savedUrl) {
      input.value = savedUrl;
    }

    // Save URL to localStorage on change
    input.addEventListener("change", function() {
      localStorage.setItem("podkop_subscribe_url", input.value);
    });

    return container;
  }

  // Update visibility based on proxy_config_type
  function updateSubscribeVisibility(proxyConfigTypeField, subscribeContainer) {
    var value = proxyConfigTypeField.value;
    if (value === "url" || value === "outbound") {
      subscribeContainer.style.display = "";
    } else {
      subscribeContainer.style.display = "none";
    }
  }

  // Fetch and display configs
  function fetchAndDisplayConfigs(subscribeUrl, container, sectionContainer) {
    if (!subscribeUrl || subscribeUrl.trim() === "") {
      alert("Пожалуйста, введите Subscribe URL");
      return;
    }

    // Remove old config list
    var oldList = document.getElementById("podkop-subscribe-config-list-injected");
    if (oldList) {
      oldList.parentNode.removeChild(oldList);
    }

    // Show loading
    var loadingDiv = document.createElement("div");
    loadingDiv.className = "podkop-subscribe-loading";
    loadingDiv.textContent = "Получение конфигураций...";
    loadingDiv.style.marginTop = "10px";
    container.appendChild(loadingDiv);

    // Fetch
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/cgi-bin/podkop-subscribe", true);
    xhr.setRequestHeader("Content-Type", "text/plain");

    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (loadingDiv.parentNode) {
          loadingDiv.parentNode.removeChild(loadingDiv);
        }

        if (xhr.status === 200) {
          try {
            var result = JSON.parse(xhr.responseText);

            if (result.error) {
              showError(container, result.error);
              return;
            }

            if (!result.configs || result.configs.length === 0) {
              showError(container, "Конфигурации не найдены");
              return;
            }

            displayConfigList(result.configs, container, sectionContainer);
          } catch (e) {
            showError(container, "Ошибка при разборе ответа: " + e.message);
          }
        } else {
          showError(container, "Ошибка HTTP: " + xhr.status);
        }
      }
    };

    xhr.onerror = function() {
      if (loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }
      showError(container, "Ошибка сети");
    };

    xhr.send(subscribeUrl);
  }

  // Show error message
  function showError(container, message) {
    var errorDiv = document.createElement("div");
    errorDiv.className = "podkop-subscribe-error";
    errorDiv.textContent = message;
    errorDiv.style.marginTop = "10px";
    container.appendChild(errorDiv);

    setTimeout(function() {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }

  // Display config list
  function displayConfigList(configs, container, sectionContainer) {
    var listContainer = document.createElement("div");
    listContainer.id = "podkop-subscribe-config-list-injected";
    listContainer.className = "cbi-value";
    listContainer.style.marginTop = "15px";

    var label = document.createElement("label");
    label.className = "cbi-value-title";
    label.textContent = "Доступные конфигурации";
    listContainer.appendChild(label);

    var fieldContainer = document.createElement("div");
    fieldContainer.className = "cbi-value-field";

    var title = document.createElement("div");
    title.className = "podkop-subscribe-title";
    title.textContent = "Нажмите на конфигурацию для выбора (" + configs.length + ")";
    fieldContainer.appendChild(title);

    var list = document.createElement("div");
    list.className = "podkop-subscribe-list";

    configs.forEach(function(config, index) {
      var item = document.createElement("div");
      item.className = "podkop-subscribe-item";

      var itemTitle = document.createElement("div");
      itemTitle.className = "podkop-subscribe-item-title";
      itemTitle.textContent = config.title || "Config " + (index + 1);

      if (config.protocol) {
        var badge = document.createElement("span");
        badge.className = "podkop-subscribe-item-protocol";
        badge.textContent = config.protocol;
        itemTitle.appendChild(badge);
      }

      item.appendChild(itemTitle);

      item.onclick = function() {
        selectConfig(config, item, list, sectionContainer);
      };

      list.appendChild(item);
    });

    fieldContainer.appendChild(list);
    listContainer.appendChild(fieldContainer);
    container.appendChild(listContainer);
  }

  // Select configuration
  function selectConfig(config, item, list, sectionContainer) {
    // Find proxy_string textarea
    var proxyTextarea = sectionContainer.querySelector('textarea[id*="proxy_string"]');
    if (!proxyTextarea) {
      proxyTextarea = document.querySelector('textarea[id*="proxy_string"]');
    }

    if (proxyTextarea) {
      proxyTextarea.value = config.url;
      proxyTextarea.dispatchEvent(new Event("change", { bubbles: true }));
      proxyTextarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Update UI
    var allItems = list.querySelectorAll(".podkop-subscribe-item");
    allItems.forEach(function(i) {
      i.classList.remove("selected");
    });
    item.classList.add("selected");

    // Show success
    var successDiv = document.createElement("div");
    successDiv.className = "podkop-subscribe-success";
    successDiv.textContent = "Конфигурация выбрана";
    item.appendChild(successDiv);

    setTimeout(function() {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 2000);
  }

  // Inject default styles
  function injectDefaultStyles() {
    if (document.getElementById("podkop-subscribe-styles")) return;

    var style = document.createElement("style");
    style.id = "podkop-subscribe-styles";
    style.textContent = [
      ".podkop-subscribe-loading {",
      "  padding: 10px;",
      "  background: var(--primary-color-low, #e3f2fd);",
      "  border: 1px solid var(--primary-color-high, #2196f3);",
      "  border-radius: 4px;",
      "  color: var(--primary-color-high, #1976d2);",
      "}",
      ".podkop-subscribe-error {",
      "  padding: 10px;",
      "  background: var(--error-color-low, #ffebee);",
      "  border: 1px solid var(--error-color-medium, #f44336);",
      "  border-radius: 4px;",
      "  color: var(--error-color-medium, #c62828);",
      "}",
      ".podkop-subscribe-success {",
      "  margin-top: 5px;",
      "  padding: 5px;",
      "  background: var(--success-color-low, #d4edda);",
      "  border: 1px solid var(--success-color-medium, #28a745);",
      "  border-radius: 4px;",
      "  color: var(--success-color-medium, #155724);",
      "  font-size: 12px;",
      "}",
      ".podkop-subscribe-title {",
      "  margin-bottom: 10px;",
      "  font-size: 14px;",
      "  color: var(--text-color-medium, #666);",
      "}",
      ".podkop-subscribe-list {",
      "  max-height: 300px;",
      "  overflow-y: auto;",
      "  padding: 15px;",
      "  border: 1px solid var(--background-color-low, #ddd);",
      "  border-radius: 4px;",
      "  background: var(--background-color-high, #f9f9f9);",
      "}",
      ".podkop-subscribe-item {",
      "  margin: 8px 0;",
      "  padding: 10px;",
      "  border: 1px solid var(--background-color-low, #ccc);",
      "  border-radius: 4px;",
      "  cursor: pointer;",
      "  transition: all 0.2s ease;",
      "  background: var(--background-color-high, white);",
      "}",
      ".podkop-subscribe-item:hover {",
      "  background: var(--primary-color-low, #e8f4f8);",
      "  border-color: var(--primary-color-high, #0078d4);",
      "}",
      ".podkop-subscribe-item.selected {",
      "  background: var(--success-color-low, #d4edda);",
      "  border-color: var(--success-color-medium, #28a745);",
      "}",
      ".podkop-subscribe-item-title {",
      "  font-weight: bold;",
      "  margin-bottom: 3px;",
      "  font-size: 13px;",
      "}",
      ".podkop-subscribe-item-protocol {",
      "  display: inline-block;",
      "  padding: 2px 6px;",
      "  margin-left: 8px;",
      "  font-size: 10px;",
      "  font-weight: normal;",
      "  border-radius: 3px;",
      "  background: var(--primary-color-low, #e3f2fd);",
      "  color: var(--primary-color-high, #1976d2);",
      "  text-transform: uppercase;",
      "}"
    ].join("\n");

    document.head.appendChild(style);
  }
})();
