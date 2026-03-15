'use strict';
'require form';
'require uci';
'require rpc';
'require poll';
'require view';
'require dom';
'require ui';

var callGetStatus = rpc.declare({
    object: 'luci.lucky',
    method: 'get_status',
    expect: { }
});

var callGetInfo = rpc.declare({
    object: 'luci.lucky',
    method: 'get_info',
    expect: { }
});

var callGetLog = rpc.declare({
    object: 'luci.lucky',
    method: 'get_log',
    expect: { }
});

var callSetConfig = rpc.declare({
    object: 'luci.lucky',
    method: 'set_config',
    params: ['key', 'value'],
    expect: { }
});

var callService = rpc.declare({
    object: 'luci.lucky',
    method: 'service',
    params: ['action'],
    expect: { }
});

return view.extend({
    load: function() {
        return uci.load('lucky');
    },

    render: function(data) {
        var m, s;

        var style = E('style', {}, [
            '.lucky-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }',
            '.lucky-table tr { border: none !important; }',
            '.lucky-table td { border: none !important; padding: 8px 4px !important; vertical-align: middle; }',
            '.lucky-table td:first-child { width: 33%; font-weight: bold; }',
            '.cbi-section legend { margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #eee; width: 100%; padding-bottom: 5px; }',
            '#_luckyLogView { width: 100%; height: 450px; background: #f4f4f4; color: #333; padding: 10px; border: 1px solid #ccc; border-radius: 3px; font-family: monospace; font-size: 12px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; margin-top: 10px; }',
            '.cbi-tabmenu { margin-bottom: 15px; }',
            '.lucky-loading { color: var(--cbi-text, #333); opacity: 0.7; font-style: italic; }',
            '.lucky-loading::after { content: "..."; }'
        ]);
        document.head.appendChild(style);

        m = new form.Map('lucky', _('Lucky'), _('IPv4/IPv6 port forwarding, DDNS, HTTP/HTTPS reverse proxy, WOL and more.'));

        s = m.section(form.TypedSection, 'lucky');
        s.anonymous = true;
        s.addremove = false;

        s.render = L.bind(function(view, section_id) {
            var container = E('div');

            var activeTab = 'settings';

            var tabMenu = E('ul', { class: 'cbi-tabmenu' }, [
                E('li', { class: 'cbi-tab', 'data-tab': 'settings' }, E('a', {
                    click: function(ev) { switchTab(ev, 'settings'); }
                }, _('Settings'))),
                E('li', { class: 'cbi-tab-disabled', 'data-tab': 'logs' }, E('a', {
                    click: function(ev) { switchTab(ev, 'logs'); }
                }, _('Running Logs')))
            ]);
            container.appendChild(tabMenu);

            function switchTab(ev, tab) {
                activeTab = tab;
                container.querySelectorAll('.cbi-tab, .cbi-tab-disabled').forEach(function(li) {
                    li.className = (li.getAttribute('data-tab') === tab) ? 'cbi-tab' : 'cbi-tab-disabled';
                });
                container.querySelector('#_luckySettingsPane').style.display = (tab === 'settings') ? '' : 'none';
                container.querySelector('#_luckyLogsPane').style.display = (tab === 'logs') ? '' : 'none';
                if (tab === 'logs') {
                    var logView = container.querySelector('#_luckyLogView');
                    logView.scrollTop = logView.scrollHeight;
                    fetchLog();
                }
                ev.preventDefault();
            }

            var settingsPane = E('div', { id: '_luckySettingsPane' });

            var statusSection = E('fieldset', {class: 'cbi-section'}, [
                E('legend', {}, _('Service Control')),
                E('table', {class: 'lucky-table'}, [
                    E('tr', {class: 'tr'}, [
                        E('td', {class: 'td left'}, _('Lucky Status')),
                        E('td', {class: 'td left', id: '_luckyStatus'}, E('span', {class: 'lucky-loading'}, _('Loading')))
                    ])
                ])
            ]);
            settingsPane.appendChild(statusSection);

            var table1 = E('table', {class: 'lucky-table'}, [
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Installation Status')), E('td', {class: 'td left', id: '_luckyInstallStatus'}, E('span', {class: 'lucky-loading'}, _('Loading'))) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Lucky Arch')), E('td', {class: 'td left', id: '_luckyArch'}, E('span', {class: 'lucky-loading'}, _('Loading'))) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Compilation Time')), E('td', {class: 'td left', id: '_luckyCompilationTime'}, E('span', {class: 'lucky-loading'}, _('Loading'))) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Lucky Version')), E('td', {class: 'td left', id: '_luckyVersion'}, E('span', {class: 'lucky-loading'}, _('Loading'))) ])
            ]);
            settingsPane.appendChild(E('fieldset', {class: 'cbi-section'}, [ E('legend', {}, _('Main Program Information')), table1 ]));

            var table2 = E('table', {class: 'lucky-table'}, [
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Admin Panel')), E('td', {class: 'td left', id: '_luckyAdminOpen'}, E('span', {class: 'lucky-loading'}, _('Loading'))) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Admin Panel Login Info')), E('td', {class: 'td left', id: '_luckyLoginInfo'}, E('span', {class: 'lucky-loading'}, _('Loading'))) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Lucky Admin Http Port')), E('td', {class: 'td left', id: '_luckyHttpPort'}, E('span', {class: 'lucky-loading'}, _('Loading'))) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Admin Safe URL')), E('td', {class: 'td left', id: '_luckySafeURL'}, E('span', {class: 'lucky-loading'}, _('Loading'))) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Allow Internet access')), E('td', {class: 'td left', id: '_luckyAllowInternetaccess'}, E('span', {class: 'lucky-loading'}, _('Loading'))) ])
            ]);
            settingsPane.appendChild(E('fieldset', {class: 'cbi-section'}, [ E('legend', {}, _('Admin Panel Information')), table2 ]));

            var table3 = E('table', {class: 'lucky-table'}, [
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Config dir path')), E('td', {class: 'td left', id: '_luckyConfigDir'}, E('span', {class: 'lucky-loading'}, _('Loading'))) ])
            ]);
            settingsPane.appendChild(E('fieldset', {class: 'cbi-section'}, [ E('legend', {}, _('Basic Settings')), table3 ]));

            container.appendChild(settingsPane);

            var logsPane = E('div', { id: '_luckyLogsPane', style: 'display:none' }, [
                E('fieldset', {class: 'cbi-section'}, [
                    E('legend', {}, _('Running Logs')),
                    E('div', {id: '_luckyLogView'}, E('span', {class: 'lucky-loading'}, _('Loading')))
                ])
            ]);
            container.appendChild(logsPane);

            var luckyInstalled = false;
            var adminHttpURL = "";
            var isUpdating = false;

            function fetchStatus() {
                return callGetStatus().then(function(statusData) {
                    if (statusData && typeof(statusData.running) != 'undefined') {
                        flushLuckyStatus(statusData.running);
                    }
                });
            }

            function fetchInfo() {
                return callGetInfo().then(function(infoData) {
                    if (infoData) {
                        flushLuckyInfo(infoData);
                    }
                });
            }

            function fetchLog() {
                return callGetLog().then(function(logData) {
                    var logView = container.querySelector('#_luckyLogView');
                    if (logData && logData.log) {
                        var isAtBottom = logView.scrollHeight - logView.clientHeight <= logView.scrollTop + 1;
                        dom.content(logView, logData.log);
                        if (isAtBottom) logView.scrollTop = logView.scrollHeight;
                    } else if (logData && logData.log === "") {
                        dom.content(logView, _('No log available.'));
                    }
                });
            }

            function fetchConfigDir() {
                var configPath = uci.get('lucky', '@lucky[0]', 'configdir') || '/etc/config/lucky.daji';
                dom.content(container.querySelector('#_luckyConfigDir'), [
                    E('input', {disabled: true, type: 'text', class: 'cbi-input-text', style: 'width:60%', value: configPath}),
                    '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0',
                    E('input', {
                        type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('Change'),
                        click: function() {
                            var newDir = prompt(_('Config dir path'), configPath);
                            if (!newDir) return;
                            handleUpdate('configdir', newDir);
                        }
                    })
                ]);
            }

            function loadAllData() {
                fetchStatus();
                fetchInfo();
                fetchConfigDir();
            }

            loadAllData();

            poll.add(function() {
                if (!isUpdating) {
                    fetchStatus();
                    if (activeTab === 'logs') {
                        fetchLog();
                    }
                }
            }, 5);

            function flushLuckyStatus(status) {
                var luckyStatus = container.querySelector('#_luckyStatus');
                var luckyAdminOpen = container.querySelector('#_luckyAdminOpen');

                var btnStart = E('input', {
                    type: 'button', class: 'btn cbi-button cbi-button-apply', value: _('Start'),
                    click: function() { handleServiceAction('start'); }
                });

                var btnStop = E('input', {
                    type: 'button', class: 'btn cbi-button cbi-button-reset', value: _('Stop'),
                    click: function() { handleServiceAction('stop'); }
                });

                var btnRestart = E('input', {
                    type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('Restart'),
                    click: function() { handleServiceAction('restart'); }
                });

                btnStart.disabled = status || isUpdating;
                btnStop.disabled = !status || isUpdating;
                btnRestart.disabled = !status || isUpdating;

                if (status) {
                    luckyInstalled = true;
                    dom.content(luckyStatus, [
                        E('b', {style: 'color:green'}, _('Running')),
                        '\u00a0\u00a0', btnStart, '\u00a0', btnStop, '\u00a0', btnRestart
                    ]);
                    dom.content(luckyAdminOpen, E('a', {href: adminHttpURL, target: '_blank', style: 'font-weight:bold; color:blue;'}, adminHttpURL));
                } else {
                    if (luckyInstalled) {
                        dom.content(luckyStatus, [
                            E('b', {style: 'color:red'}, _('Not running')),
                            '\u00a0\u00a0', btnStart, '\u00a0', btnStop, '\u00a0', btnRestart
                        ]);
                        dom.content(luckyAdminOpen, E('span', {style: 'color:grey'}, _('Service not running, Admin Panel is unavailable')));
                    } else {
                        dom.content(luckyStatus, E('b', {style: 'color:red'}, _('Not installed')));
                        dom.content(luckyAdminOpen, '');
                    }
                }
            }

            function handleServiceAction(action) {
                isUpdating = true;
                ui.showModal(null, [
                    E('p', { class: 'spinning' }, _('Updating configuration...'))
                ]);
                return callService(action).then(function() {
                    var startTime = Date.now();
                    var timeout = 10000;

                    function waitForServiceReady() {
                        if (Date.now() - startTime > timeout) {
                            isUpdating = false;
                            ui.hideModal();
                            alert(_('Operation timeout, please refresh the page'));
                            return;
                        }

                        callGetStatus().then(function(statusData) {
                            var isRunning = statusData && statusData.running;
                            var shouldBeRunning = (action === 'start' || action === 'restart');

                            if (shouldBeRunning ? isRunning : !isRunning) {
                                callGetInfo().then(function(infoData) {
                                    isUpdating = false;
                                    ui.hideModal();
                                    if (infoData) flushLuckyInfo(infoData);
                                    flushLuckyStatus(statusData.running);
                                });
                            } else {
                                setTimeout(waitForServiceReady, 200);
                            }
                        });
                    }
                    waitForServiceReady();
                });
            }

            function handleUpdate(key, value) {
                isUpdating = true;
                ui.showModal(null, [
                    E('p', { class: 'spinning' }, _('Updating configuration...'))
                ]);

                return callSetConfig(key, value).then(function(res) {
                    if (res && res.ret == 0) {
                        return callService('restart').then(function() {
                            var startTime = Date.now();
                            var timeout = 10000;

                            function waitForServiceReady() {
                                if (Date.now() - startTime > timeout) {
                                    isUpdating = false;
                                    ui.hideModal();
                                    alert(_('Operation timeout, please refresh the page'));
                                    return;
                                }

                                callGetStatus().then(function(statusData) {
                                    if (statusData && statusData.running) {
                                        callGetInfo().then(function(infoData) {
                                            isUpdating = false;
                                            ui.hideModal();
                                            if (infoData) flushLuckyInfo(infoData);
                                            flushLuckyStatus(statusData.running);
                                        });
                                    } else {
                                        setTimeout(waitForServiceReady, 200);
                                    }
                                });
                            }
                            waitForServiceReady();
                        });
                    } else {
                        isUpdating = false;
                        ui.hideModal();
                        alert(_('update failed'));
                    }
                });
            }

            function isNumber(val) {
                return /^[-]?[\.\d]+$/.test(val);
            }

            function flushLuckyInfo(infoData) {
                if (infoData) {
                    dom.content(container.querySelector('#_luckyArch'), E('b', {style: 'color:blue'}, infoData.luckyArch || ''));
                    if (!infoData.luckyInfo || infoData.luckyInfo === "") {
                        luckyInstalled = false;
                        var notInst = E('b', {style: 'color:red'}, _('Not installed'));
                        dom.content(container.querySelector('#_luckyStatus'), notInst.cloneNode(true));
                        dom.content(container.querySelector('#_luckyInstallStatus'), notInst.cloneNode(true));
                        dom.content(container.querySelector('#_luckyHttpPort'), notInst.cloneNode(true));
                        dom.content(container.querySelector('#_luckyCompilationTime'), notInst.cloneNode(true));
                        dom.content(container.querySelector('#_luckyLoginInfo'), notInst.cloneNode(true));
                        dom.content(container.querySelector('#_luckyAdminOpen'), notInst.cloneNode(true));
                        dom.content(container.querySelector('#_luckyAllowInternetaccess'), notInst.cloneNode(true));
                        dom.content(container.querySelector('#_luckySafeURL'), notInst.cloneNode(true));
                        dom.content(container.querySelector('#_luckyConfigDir'), notInst.cloneNode(true));

                        var verNode = container.querySelector('#_luckyVersion');
                        dom.content(verNode, [
                            notInst.cloneNode(true),
                            '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0',
                            E('input', {
                                type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('get latest version'),
                                click: function() { window.open("https://release.66666.host/"); }
                            })
                        ]);
                        return;
                    }

                    luckyInstalled = true;
                    dom.content(container.querySelector('#_luckyInstallStatus'), E('b', {style: 'color:green'}, _('Installed')));

                    var luckyInfo = {};
                    try { luckyInfo = JSON.parse(infoData.luckyInfo); } catch(e) {}

                    dom.content(container.querySelector('#_luckyCompilationTime'), E('b', {style: 'color:green'}, luckyInfo.Date || ''));
                    dom.content(container.querySelector('#_luckyVersion'), [
                        E('b', {style: 'color:green'}, luckyInfo.Version || ''),
                        '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0',
                        E('input', {
                            type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('get latest version'),
                            click: function() { window.open("https://release.66666.host/"); }
                        })
                    ]);

                    var baseConf = infoData.LuckyBaseConfigure || {};
                    adminHttpURL = "http://" + window.location.hostname + ":" + (baseConf.AdminWebListenPort || "16601");
                    if (baseConf.SafeURL) {
                        adminHttpURL += baseConf.SafeURL;
                    }

                    dom.content(container.querySelector('#_luckyLoginInfo'), [
                        E('b', {style: 'color:green'}, _('DefaultAuth') + ":666"),
                        '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0',
                        E('input', {
                            type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('Reset Account and Password'),
                            click: function() {
                                if (confirm(_('Reset Account and Password'))) {
                                    handleUpdate('reset_auth_info', '');
                                }
                            }
                        })
                    ]);

                    dom.content(container.querySelector('#_luckyHttpPort'), [
                        E('input', {disabled: true, type: 'text', class: 'cbi-input-text', style: 'width:30%', value: baseConf.AdminWebListenPort || "16601"}),
                        '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0',
                        E('input', {
                            type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('Change'),
                            click: function() {
                                var newPort = prompt(_('Lucky Admin Http Port'));
                                if (!newPort) return;
                                if (!isNumber(newPort)) { alert(_('portValueError')); return; }
                                var np = parseInt(newPort);
                                if (np <= 0 || np > 65535) { alert(_('portValueError')); return; }
                                handleUpdate('admin_http_port', newPort);
                            }
                        })
                    ]);

                    dom.content(container.querySelector('#_luckySafeURL'), [
                        E('input', {disabled: true, type: 'text', class: 'cbi-input-text', style: 'width:30%', value: baseConf.SafeURL || ""}),
                        '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0',
                        E('input', {
                            type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('Change'),
                            click: function() {
                                var newSafeURL = prompt(_('Admin Safe URL'));
                                if (newSafeURL == null) return;
                                handleUpdate('admin_safe_url', newSafeURL);
                            }
                        })
                    ]);

                    if (baseConf.AllowInternetaccess) {
                        dom.content(container.querySelector('#_luckyAllowInternetaccess'), [
                            E('b', {style: 'color:green'}, _('allow')),
                            '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0',
                            E('input', {
                                type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('not allow'),
                                click: function() {
                                    if (confirm(_('Are you sure Disable Internetaccess?'))) {
                                        handleUpdate('switch_Internetaccess', 'false');
                                    }
                                }
                            })
                        ]);
                    } else {
                        dom.content(container.querySelector('#_luckyAllowInternetaccess'), [
                            E('b', {style: 'color:red'}, _('not allow')),
                            '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0',
                            E('input', {
                                type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('allow'),
                                click: function() {
                                    if (confirm(_('Are you sure Enalbe Internetaccess?'))) {
                                        handleUpdate('switch_Internetaccess', 'true');
                                    }
                                }
                            })
                        ]);
                    }
                }
            }

            return container;
        }, this);

        return m.render();
    }
});