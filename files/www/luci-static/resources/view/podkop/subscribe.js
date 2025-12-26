"use strict";

"require form";
"require ui";
"require dom";
"require baseclass";
"require view.podkop.main as main";


function enhanceSectionWithSubscribe(section) {
  // Subscribe URL для proxy_config_type = "url"
  let o = section.option(
    form.Value,
    "subscribe_url",
    _("Subscribe URL"),
    _("Введите Subscribe URL для получения конфигураций vless")
  );
  o.depends("proxy_config_type", "url");
  o.placeholder = "https://example.com/subscribe";
  o.rmempty = true;

  // Загрузка сохранённого Subscribe URL (url)
  o.load = function (section_id) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/cgi-bin/podkop-subscribe-url", true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result && result.url && result.url.length > 0) {
            setTimeout(function () {
              let subscribeInput =
                document.getElementById(
                  `widget.cbid.podkop.${section_id}.subscribe_url`
                ) ||
                document.getElementById(
                  `cbid.podkop.${section_id}.subscribe_url`
                ) ||
                document.querySelector('input[id*="subscribe_url"]');

              if (subscribeInput) {
                subscribeInput.value = result.url;
                if (subscribeInput.dispatchEvent) {
                  subscribeInput.dispatchEvent(
                    new Event("change", { bubbles: true })
                  );
                }
              }
            }, 100);
          }
        } catch (e) {
          // ignore
        }
      }
    };
    xhr.send();
  };

  // Валидация Subscribe URL (url)
  o.validate = function (section_id, value) {
    if (!value || value.length === 0) {
      return true;
    }
    const validation = main.validateUrl(value);
    if (validation.valid) {
      return true;
    }
    return validation.message;
  };

  // Кнопка «Получить конфигурации» (proxy_config_type = "url")
  o = section.option(
    form.Button,
    "subscribe_fetch",
    _("Получить конфигурации"),
    _("Получить конфигурации vless из Subscribe URL")
  );
  o.depends("proxy_config_type", "url");
  o.inputtitle = _("Получить");
  o.inputstyle = "add";

  o.onclick = function (ev, section_id) {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (ev && ev.stopPropagation) ev.stopPropagation();

    // Достаём значение Subscribe URL из DOM
    let subscribeUrl = "";
    try {
      const button = ev && ev.target ? ev.target : null;
      if (button) {
        const parentSection = button.closest(".cbi-section");
        if (parentSection) {
          const input = parentSection.querySelector(
            'input[placeholder*="Subscribe"], input[id*="subscribe_url"]'
          );
          if (input) {
            subscribeUrl = input.value || "";
          }
        }
      }
    } catch (e) {
      // ignore
    }

    if (!subscribeUrl) {
      try {
        const inputById = document.querySelector(
          `#widget\\.cbid\\.podkop\\.${section_id}\\.subscribe_url`
        );
        if (inputById) {
          subscribeUrl = inputById.value || "";
        }
      } catch (e) {
        // ignore
      }
    }

    if (!subscribeUrl || subscribeUrl.length === 0) {
      ui.addNotification(null, E("p", {}, _("Пожалуйста, введите Subscribe URL")));
      return false;
    }

    // Находим контейнер Subscribe поля
    let subscribeInput = null;
    try {
      const button = ev && ev.target ? ev.target : null;
      if (button) {
        const parentSection = button.closest(".cbi-section");
        if (parentSection) {
          subscribeInput = parentSection.querySelector(
            'input[placeholder*="Subscribe"], input[id*="subscribe_url"]'
          );
        }
      }
    } catch (e) {
      // ignore
    }

    if (!subscribeInput) {
      try {
        subscribeInput =
          document.querySelector(
            `#widget\\.cbid\\.podkop\\.${section_id}\\.subscribe_url`
          ) ||
          document.querySelector(
            `#cbid\\.podkop\\.${section_id}\\.subscribe_url`
          ) ||
          document.querySelector('input[id*="subscribe_url"]');
      } catch (e) {
        // ignore
      }
    }

    let subscribeContainer = null;
    if (subscribeInput) {
      subscribeContainer =
        subscribeInput.closest(".cbi-value") ||
        subscribeInput.closest(".cbi-section") ||
        subscribeInput.parentElement;
    }

    // Удаляем старый список конфигов
    const existingList = document.getElementById(
      "podkop-subscribe-config-list"
    );
    if (existingList && existingList.parentNode) {
      existingList.parentNode.removeChild(existingList);
    }

    // Индикатор загрузки
    let loadingIndicator = null;
    if (subscribeContainer) {
      loadingIndicator = document.createElement("div");
      loadingIndicator.id = "podkop-subscribe-loading";
      loadingIndicator.className = "cbi-value";
      loadingIndicator.style.cssText =
        "margin-top: 10px; margin-bottom: 10px;";

      const loadingLabel = document.createElement("label");
      loadingLabel.className = "cbi-value-title";
      loadingLabel.style.cssText =
        "width: 200px; padding-right: 10px; display: inline-block; vertical-align: top;";
      loadingLabel.textContent = "";
      loadingIndicator.appendChild(loadingLabel);

      const loadingContent = document.createElement("div");
      loadingContent.className = "cbi-value-field";
      loadingContent.style.cssText =
        "display: inline-block; width: calc(100% - 220px); padding: 10px; background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; color: #1976d2;";
      loadingContent.textContent = _("Получение конфигураций...");
      loadingIndicator.appendChild(loadingContent);

      if (subscribeContainer.nextSibling) {
        subscribeContainer.parentNode.insertBefore(
          loadingIndicator,
          subscribeContainer.nextSibling
        );
      } else {
        subscribeContainer.parentNode.appendChild(loadingIndicator);
      }
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/cgi-bin/podkop-subscribe", true);
    xhr.setRequestHeader("Content-Type", "text/plain");
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (loadingIndicator && loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }

        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (!result || !result.configs || result.configs.length === 0) {
              const errorDiv = document.createElement("div");
              errorDiv.style.cssText =
                "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
              errorDiv.textContent = _("Конфигурации не найдены");
              if (subscribeContainer && subscribeContainer.nextSibling) {
                subscribeContainer.parentNode.insertBefore(
                  errorDiv,
                  subscribeContainer.nextSibling
                );
              } else if (subscribeContainer) {
                subscribeContainer.parentNode.appendChild(errorDiv);
              }
              setTimeout(function () {
                if (errorDiv.parentNode) {
                  errorDiv.parentNode.removeChild(errorDiv);
                }
              }, 3000);
              return;
            }

            const configs = result.configs;
            if (!subscribeContainer) return;

            const configListContainer = document.createElement("div");
            configListContainer.id = "podkop-subscribe-config-list";
            configListContainer.className = "cbi-value";

            // по умолчанию показываем
            let shouldShow = true;
            try {
              let connectionTypeSelect = document.querySelector(
                'select[id*="connection_type"]'
              );
              if (!connectionTypeSelect) {
                connectionTypeSelect = document.querySelector(
                  'select[name*="connection_type"]'
                );
              }
              let proxyConfigTypeSelect = document.querySelector(
                'select[id*="proxy_config_type"]'
              );
              if (!proxyConfigTypeSelect) {
                proxyConfigTypeSelect = document.querySelector(
                  'select[name*="proxy_config_type"]'
                );
              }
              if (
                connectionTypeSelect &&
                proxyConfigTypeSelect &&
                (connectionTypeSelect.value !== "proxy" ||
                  proxyConfigTypeSelect.value !== "url")
              ) {
                shouldShow = false;
              }
            } catch (e) {
              shouldShow = true;
            }

            configListContainer.style.cssText =
              "margin-top: 15px; margin-bottom: 15px;" +
              (shouldShow ? "" : "display: none;");

            const labelContainer = document.createElement("label");
            labelContainer.className = "cbi-value-title";
            labelContainer.style.cssText =
              "width: 200px; padding-right: 10px; display: inline-block; vertical-align: top;";
            labelContainer.textContent = _("Доступные конфигурации");
            configListContainer.appendChild(labelContainer);

            const contentContainer = document.createElement("div");
            contentContainer.className = "cbi-value-field";
            contentContainer.style.cssText =
              "display: inline-block; width: calc(100% - 220px);";

            const title = document.createElement("div");
            title.style.cssText =
              "margin-bottom: 10px; font-size: 14px; color: #666;";
            title.textContent =
              _("Нажмите на конфигурацию для выбора") +
              " (" +
              configs.length +
              ")";
            contentContainer.appendChild(title);

            const configList = document.createElement("div");
            configList.style.cssText =
              "max-height: 300px; overflow-y: auto; padding: 15px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;";

            configs.forEach(function (config, index) {
              const configItem = document.createElement("div");
              configItem.style.cssText =
                "margin: 8px 0; padding: 10px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; transition: background 0.2s; background: white;";
              configItem.onmouseover = function () {
                this.style.background = "#e8f4f8";
                this.style.borderColor = "#0078d4";
              };
              configItem.onmouseout = function () {
                this.style.background = "white";
                this.style.borderColor = "#ccc";
              };

              const configTitle = document.createElement("div");
              configTitle.style.cssText =
                "font-weight: bold; margin-bottom: 3px; font-size: 13px;";
              configTitle.textContent =
                config.title ||
                _("Конфигурация") + " " + (index + 1);
              configItem.appendChild(configTitle);

              configItem.onclick = function (e) {
                e.stopPropagation();

                let proxyTextarea = document.getElementById(
                  "widget.cbid.podkop.main.proxy_string"
                );
                if (!proxyTextarea) {
                  proxyTextarea = document.querySelector(
                    'textarea[id*="proxy_string"]'
                  );
                }
                if (!proxyTextarea) {
                  proxyTextarea = document.getElementById(
                    `widget.cbid.podkop.${section_id}.proxy_string`
                  );
                }
                if (!proxyTextarea) {
                  proxyTextarea = document.getElementById(
                    "cbid.podkop.main.proxy_string"
                  );
                }
                if (!proxyTextarea) {
                  proxyTextarea = document.getElementById(
                    `cbid.podkop.${section_id}.proxy_string`
                  );
                }

                if (proxyTextarea) {
                  proxyTextarea.value = config.url;
                  if (proxyTextarea.dispatchEvent) {
                    proxyTextarea.dispatchEvent(
                      new Event("change", {
                        bubbles: true,
                      })
                    );
                    proxyTextarea.dispatchEvent(
                      new Event("input", {
                        bubbles: true,
                      })
                    );
                  }
                }

                const allItems =
                  configList.querySelectorAll(
                    'div[style*="cursor: pointer"]'
                  );
                allItems.forEach(function (item) {
                  item.style.background = "white";
                  item.style.borderColor = "#ccc";
                });
                configItem.style.background = "#d4edda";
                configItem.style.borderColor = "#28a745";

                const successDiv = document.createElement("div");
                successDiv.style.cssText =
                  "margin-top: 5px; padding: 5px; background: #d4edda; border: 1px solid #28a745; border-radius: 4px; color: #155724; font-size: 12px;";
                successDiv.textContent = _("Конфигурация выбрана");
                configItem.appendChild(successDiv);
                setTimeout(function () {
                  if (successDiv.parentNode) {
                    successDiv.parentNode.removeChild(successDiv);
                  }
                }, 2000);
              };

              configList.appendChild(configItem);
            });

            contentContainer.appendChild(configList);
            configListContainer.appendChild(contentContainer);

            if (subscribeContainer.nextSibling) {
              subscribeContainer.parentNode.insertBefore(
                configListContainer,
                subscribeContainer.nextSibling
              );
            } else {
              subscribeContainer.parentNode.appendChild(
                configListContainer
              );
            }

            // Сохраняем URL
            const saveUrlXhr = new XMLHttpRequest();
            saveUrlXhr.open(
              "POST",
              "/cgi-bin/podkop-subscribe-url",
              true
            );
            saveUrlXhr.setRequestHeader(
              "Content-Type",
              "text/plain"
            );
            saveUrlXhr.send(subscribeUrl);
          } catch (e) {
            const errorDiv = document.createElement("div");
            errorDiv.style.cssText =
              "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
            errorDiv.textContent =
              _("Ошибка при разборе ответа: ") + e.message;
            if (subscribeContainer && subscribeContainer.nextSibling) {
              subscribeContainer.parentNode.insertBefore(
                errorDiv,
                subscribeContainer.nextSibling
              );
            } else if (subscribeContainer) {
              subscribeContainer.parentNode.appendChild(errorDiv);
            }
            setTimeout(function () {
              if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
              }
            }, 5000);
          }
        } else {
          const errorDiv = document.createElement("div");
          errorDiv.style.cssText =
            "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
          errorDiv.textContent =
            _("Ошибка при получении конфигураций: HTTP ") +
            xhr.status;
          if (subscribeContainer && subscribeContainer.nextSibling) {
            subscribeContainer.parentNode.insertBefore(
              errorDiv,
              subscribeContainer.nextSibling
            );
          } else if (subscribeContainer) {
            subscribeContainer.parentNode.appendChild(errorDiv);
          }
          setTimeout(function () {
            if (errorDiv.parentNode) {
              errorDiv.parentNode.removeChild(errorDiv);
            }
          }, 5000);
        }
      }
    };

    xhr.onerror = function () {
      if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
      const errorDiv = document.createElement("div");
      errorDiv.style.cssText =
        "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
      errorDiv.textContent = _(
        "Ошибка сети при получении конфигураций"
      );
      if (subscribeContainer && subscribeContainer.nextSibling) {
        subscribeContainer.parentNode.insertBefore(
          errorDiv,
          subscribeContainer.nextSibling
        );
      } else if (subscribeContainer) {
        subscribeContainer.parentNode.appendChild(errorDiv);
      }
      setTimeout(function () {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 5000);
    };

    xhr.send(subscribeUrl);
    return false;
  };

  // Аналогичные поля/кнопки для proxy_config_type = "outbound"
  o = section.option(
    form.Value,
    "subscribe_url_outbound",
    _("Subscribe URL"),
    _("Введите Subscribe URL для получения конфигураций vless")
  );
  o.depends("proxy_config_type", "outbound");
  o.placeholder = "https://example.com/subscribe";
  o.rmempty = true;

  o.load = function (section_id) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/cgi-bin/podkop-subscribe-url", true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result && result.url && result.url.length > 0) {
            setTimeout(function () {
              let subscribeInput =
                document.getElementById(
                  `widget.cbid.podkop.${section_id}.subscribe_url_outbound`
                ) ||
                document.getElementById(
                  `cbid.podkop.${section_id}.subscribe_url_outbound`
                ) ||
                document.querySelector(
                  'input[id*="subscribe_url_outbound"]'
                );
              if (subscribeInput) {
                subscribeInput.value = result.url;
                if (subscribeInput.dispatchEvent) {
                  subscribeInput.dispatchEvent(
                    new Event("change", { bubbles: true })
                  );
                }
              }
            }, 100);
          }
        } catch (e) {
          // ignore
        }
      }
    };
    xhr.send();
  };

  o.validate = function (section_id, value) {
    if (!value || value.length === 0) {
      return true;
    }
    const validation = main.validateUrl(value);
    if (validation.valid) {
      return true;
    }
    return validation.message;
  };

  o = section.option(
    form.Button,
    "subscribe_fetch_outbound",
    _("Получить конфигурации"),
    _("Получить конфигурации vless из Subscribe URL")
  );
  o.depends("proxy_config_type", "outbound");
  o.inputtitle = _("Получить");
  o.inputstyle = "add";

  o.onclick = function (ev, section_id) {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (ev && ev.stopPropagation) ev.stopPropagation();

    let subscribeUrl = "";
    try {
      const button = ev && ev.target ? ev.target : null;
      if (button) {
        const parentSection = button.closest(".cbi-section");
        if (parentSection) {
          const input = parentSection.querySelector(
            'input[placeholder*="Subscribe"], input[id*="subscribe_url_outbound"]'
          );
          if (input) {
            subscribeUrl = input.value || "";
          }
        }
      }
    } catch (e) {
      // ignore
    }

    if (!subscribeUrl) {
      try {
        const inputById = document.querySelector(
          `#widget\\.cbid\\.podkop\\.${section_id}\\.subscribe_url_outbound`
        );
        if (inputById) {
          subscribeUrl = inputById.value || "";
        }
      } catch (e) {
        // ignore
      }
    }

    if (!subscribeUrl || subscribeUrl.length === 0) {
      ui.addNotification(
        null,
        E("p", {}, _("Пожалуйста, введите Subscribe URL"))
      );
      return false;
    }

    let subscribeInput = null;
    try {
      const button = ev && ev.target ? ev.target : null;
      if (button) {
        const parentSection = button.closest(".cbi-section");
        if (parentSection) {
          subscribeInput = parentSection.querySelector(
            'input[placeholder*="Subscribe"], input[id*="subscribe_url_outbound"]'
          );
        }
      }
    } catch (e) {
      // ignore
    }

    if (!subscribeInput) {
      try {
        subscribeInput =
          document.querySelector(
            `#widget\\.cbid\\.podkop\\.${section_id}\\.subscribe_url_outbound`
          ) ||
          document.querySelector(
            `#cbid\\.podkop\\.${section_id}\\.subscribe_url_outbound`
          ) ||
          document.querySelector('input[id*="subscribe_url_outbound"]');
      } catch (e) {
        // ignore
      }
    }

    let subscribeContainer = null;
    if (subscribeInput) {
      subscribeContainer =
        subscribeInput.closest(".cbi-value") ||
        subscribeInput.closest(".cbi-section") ||
        subscribeInput.parentElement;
    }

    const existingList = document.getElementById(
      "podkop-subscribe-config-list-outbound"
    );
    if (existingList && existingList.parentNode) {
      existingList.parentNode.removeChild(existingList);
    }

    let loadingIndicator = null;
    if (subscribeContainer) {
      loadingIndicator = document.createElement("div");
      loadingIndicator.id = "podkop-subscribe-loading-outbound";
      loadingIndicator.className = "cbi-value";
      loadingIndicator.style.cssText =
        "margin-top: 10px; margin-bottom: 10px;";

      const loadingLabel = document.createElement("label");
      loadingLabel.className = "cbi-value-title";
      loadingLabel.style.cssText =
        "width: 200px; padding-right: 10px; display: inline-block; vertical-align: top;";
      loadingLabel.textContent = "";
      loadingIndicator.appendChild(loadingLabel);

      const loadingContent = document.createElement("div");
      loadingContent.className = "cbi-value-field";
      loadingContent.style.cssText =
        "display: inline-block; width: calc(100% - 220px); padding: 10px; background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; color: #1976d2;";
      loadingContent.textContent = _("Получение конфигураций...");
      loadingIndicator.appendChild(loadingContent);

      if (subscribeContainer.nextSibling) {
        subscribeContainer.parentNode.insertBefore(
          loadingIndicator,
          subscribeContainer.nextSibling
        );
      } else {
        subscribeContainer.parentNode.appendChild(loadingIndicator);
      }
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/cgi-bin/podkop-subscribe", true);
    xhr.setRequestHeader("Content-Type", "text/plain");
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (loadingIndicator && loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }

        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (!result || !result.configs || result.configs.length === 0) {
              const errorDiv = document.createElement("div");
              errorDiv.style.cssText =
                "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
              errorDiv.textContent = _("Конфигурации не найдены");
              if (subscribeContainer && subscribeContainer.nextSibling) {
                subscribeContainer.parentNode.insertBefore(
                  errorDiv,
                  subscribeContainer.nextSibling
                );
              } else if (subscribeContainer) {
                subscribeContainer.parentNode.appendChild(errorDiv);
              }
              setTimeout(function () {
                if (errorDiv.parentNode) {
                  errorDiv.parentNode.removeChild(errorDiv);
                }
              }, 3000);
              return;
            }

            const configs = result.configs;
            if (!subscribeContainer) return;

            const configListContainer = document.createElement("div");
            configListContainer.id =
              "podkop-subscribe-config-list-outbound";
            configListContainer.className = "cbi-value";
            configListContainer.style.cssText =
              "margin-top: 15px; margin-bottom: 15px;";

            const labelContainer = document.createElement("label");
            labelContainer.className = "cbi-value-title";
            labelContainer.style.cssText =
              "width: 200px; padding-right: 10px; display: inline-block; vertical-align: top;";
            labelContainer.textContent = _("Доступные конфигурации");
            configListContainer.appendChild(labelContainer);

            const contentContainer = document.createElement("div");
            contentContainer.className = "cbi-value-field";
            contentContainer.style.cssText =
              "display: inline-block; width: calc(100% - 220px);";

            const title = document.createElement("div");
            title.style.cssText =
              "margin-bottom: 10px; font-size: 14px; color: #666;";
            title.textContent =
              _("Нажмите на конфигурацию для применения в Xray") +
              " (" +
              configs.length +
              ")";
            contentContainer.appendChild(title);

            const configList = document.createElement("div");
            configList.style.cssText =
              "max-height: 300px; overflow-y: auto; padding: 15px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;";

            configs.forEach(function (config, index) {
              const configItem = document.createElement("div");
              configItem.style.cssText =
                "margin: 8px 0; padding: 10px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; transition: background 0.2s; background: white;";
              configItem.onmouseover = function () {
                this.style.background = "#e8f4f8";
                this.style.borderColor = "#0078d4";
              };
              configItem.onmouseout = function () {
                if (!this.classList.contains("selected")) {
                  this.style.background = "white";
                  this.style.borderColor = "#ccc";
                }
              };

              const configTitle = document.createElement("div");
              configTitle.style.cssText =
                "font-weight: bold; margin-bottom: 3px; font-size: 13px;";
              configTitle.textContent =
                config.title ||
                _("Конфигурация") + " " + (index + 1);
              configItem.appendChild(configTitle);

              configItem.onclick = function (e) {
                e.stopPropagation();

                const loadingText = document.createElement("div");
                loadingText.style.cssText =
                  "margin-top: 5px; padding: 5px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; color: #856404; font-size: 12px;";
                loadingText.textContent = _(
                  "Применение конфигурации..."
                );
                configItem.appendChild(loadingText);

                const xhrConfig = new XMLHttpRequest();
                xhrConfig.open(
                  "POST",
                  "/cgi-bin/podkop-xray-config",
                  true
                );
                xhrConfig.setRequestHeader(
                  "Content-Type",
                  "text/plain"
                );
                xhrConfig.onreadystatechange = function () {
                  if (xhrConfig.readyState === 4) {
                    if (loadingText.parentNode) {
                      loadingText.parentNode.removeChild(
                        loadingText
                      );
                    }

                    if (xhrConfig.status === 200) {
                      try {
                        JSON.parse(xhrConfig.responseText);

                        const allItems =
                          configList.querySelectorAll(
                            'div[style*="cursor: pointer"]'
                          );
                        allItems.forEach(function (item) {
                          item.classList.remove("selected");
                          item.style.background = "white";
                          item.style.borderColor = "#ccc";
                        });

                        configItem.classList.add("selected");
                        configItem.style.background =
                          "#d4edda";
                        configItem.style.borderColor =
                          "#28a745";

                        const successDiv =
                          document.createElement("div");
                        successDiv.style.cssText =
                          "margin-top: 5px; padding: 5px; background: #d4edda; border: 1px solid #28a745; border-radius: 4px; color: #155724; font-size: 12px;";
                        successDiv.textContent = _(
                          "Конфигурация применена к Xray и служба перезапущена"
                        );
                        configItem.appendChild(successDiv);
                        setTimeout(function () {
                          if (successDiv.parentNode) {
                            successDiv.parentNode.removeChild(
                              successDiv
                            );
                          }
                        }, 3000);
                      } catch (e) {
                        const errorDiv =
                          document.createElement("div");
                        errorDiv.style.cssText =
                          "margin-top: 5px; padding: 5px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828; font-size: 12px;";
                        errorDiv.textContent =
                          _(
                            "Ошибка при применении конфигурации: "
                          ) + e.message;
                        configItem.appendChild(errorDiv);
                        setTimeout(function () {
                          if (errorDiv.parentNode) {
                            errorDiv.parentNode.removeChild(
                              errorDiv
                            );
                          }
                        }, 5000);
                      }
                    } else {
                      const errorDiv =
                        document.createElement("div");
                      errorDiv.style.cssText =
                        "margin-top: 5px; padding: 5px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828; font-size: 12px;";
                      errorDiv.textContent =
                        _(
                          "Ошибка при применении конфигурации: HTTP "
                        ) + xhrConfig.status;
                      configItem.appendChild(errorDiv);
                      setTimeout(function () {
                        if (errorDiv.parentNode) {
                          errorDiv.parentNode.removeChild(
                            errorDiv
                          );
                        }
                      }, 5000);
                    }
                  }
                };
                xhrConfig.onerror = function () {
                  if (loadingText.parentNode) {
                    loadingText.parentNode.removeChild(
                      loadingText
                    );
                  }
                  const errorDiv =
                    document.createElement("div");
                  errorDiv.style.cssText =
                    "margin-top: 5px; padding: 5px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828; font-size: 12px;";
                  errorDiv.textContent = _(
                    "Ошибка сети при применении конфигурации"
                  );
                  configItem.appendChild(errorDiv);
                  setTimeout(function () {
                    if (errorDiv.parentNode) {
                      errorDiv.parentNode.removeChild(
                        errorDiv
                      );
                    }
                  }, 5000);
                };
                xhrConfig.send(config.url);
              };

              configList.appendChild(configItem);
            });

            contentContainer.appendChild(configList);
            configListContainer.appendChild(contentContainer);

            if (subscribeContainer.nextSibling) {
              subscribeContainer.parentNode.insertBefore(
                configListContainer,
                subscribeContainer.nextSibling
              );
            } else {
              subscribeContainer.parentNode.appendChild(
                configListContainer
              );
            }

            const saveUrlXhr = new XMLHttpRequest();
            saveUrlXhr.open(
              "POST",
              "/cgi-bin/podkop-subscribe-url",
              true
            );
            saveUrlXhr.setRequestHeader(
              "Content-Type",
              "text/plain"
            );
            saveUrlXhr.send(subscribeUrl);
          } catch (e) {
            const errorDiv = document.createElement("div");
            errorDiv.style.cssText =
              "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
            errorDiv.textContent =
              _("Ошибка при разборе ответа: ") + e.message;
            if (subscribeContainer && subscribeContainer.nextSibling) {
              subscribeContainer.parentNode.insertBefore(
                errorDiv,
                subscribeContainer.nextSibling
              );
            } else if (subscribeContainer) {
              subscribeContainer.parentNode.appendChild(errorDiv);
            }
            setTimeout(function () {
              if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
              }
            }, 5000);
          }
        } else {
          const errorDiv = document.createElement("div");
          errorDiv.style.cssText =
            "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
          errorDiv.textContent =
            _("Ошибка при получении конфигураций: HTTP ") +
            xhr.status;
          if (subscribeContainer && subscribeContainer.nextSibling) {
            subscribeContainer.parentNode.insertBefore(
              errorDiv,
              subscribeContainer.nextSibling
            );
          } else if (subscribeContainer) {
            subscribeContainer.parentNode.appendChild(errorDiv);
          }
          setTimeout(function () {
            if (errorDiv.parentNode) {
              errorDiv.parentNode.removeChild(errorDiv);
            }
          }, 5000);
        }
      }
    };

    xhr.onerror = function () {
      if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
      const errorDiv = document.createElement("div");
      errorDiv.style.cssText =
        "margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828;";
      errorDiv.textContent = _(
        "Ошибка сети при получении конфигураций"
      );
      if (subscribeContainer && subscribeContainer.nextSibling) {
        subscribeContainer.parentNode.insertBefore(
          errorDiv,
          subscribeContainer.nextSibling
        );
      } else if (subscribeContainer) {
        subscribeContainer.parentNode.appendChild(errorDiv);
      }
      setTimeout(function () {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 5000);
    };

    xhr.send(subscribeUrl);
    return false;
  };
}

const EntryPoint = {
  enhanceSectionWithSubscribe,
};

return baseclass.extend(EntryPoint);

// return {enhanceSectionWithSubscribe}
