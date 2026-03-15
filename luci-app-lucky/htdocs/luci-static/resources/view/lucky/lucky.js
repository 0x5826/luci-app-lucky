'use strict';
'require form';
'require uci';
'require rpc';
'require poll';
'require view';
'require dom';

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
    expect: { ret: 1 }
});

var callService = rpc.declare({
    object: 'luci.lucky',
    method: 'service',
    params: ['action'],
    expect: { }
});

return view.extend({
    load: function() {
        return Promise.all([
            uci.load('lucky'),
            callGetInfo()
        ]);
    },

    render: function(data) {
        var info = data[1] || {};
        var m, s, o;

        var style = E('style', {}, [
            '.lucky-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }',
            '.lucky-table tr { border: none !important; }',
            '.lucky-table td { border: none !important; padding: 8px 4px !important; vertical-align: middle; }',
            '.lucky-table td:first-child { width: 33%; font-weight: bold; color: #333; }',
            '.cbi-section legend { margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #eee; width: 100%; padding-bottom: 5px; }',
            '#_luckyLogView { width: 100%; height: 450px; background: #000; color: #00ff00; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; margin-top: 10px; }',
            '.cbi-tabmenu { margin-bottom: 15px; }'
        ]);
        document.head.appendChild(style);

        m = new form.Map('lucky', _('Lucky'), _('IPv4/IPv6 port forwarding, DDNS, HTTP/HTTPS reverse proxy, WOL and more.'));

        s = m.section(form.TypedSection, 'lucky');
        s.anonymous = true;
        s.addremove = false;

        s.render = L.bind(function(view, section_id) {
            var container = E('div');
            
            // Tab switcher logic
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
                }
                ev.preventDefault();
            }

            // Settings Pane
            var settingsPane = E('div', { id: '_luckySettingsPane' });
            
            var statusSection = E('fieldset', {class: 'cbi-section'}, [
                E('legend', {}, _('Service Control')),
                E('table', {class: 'lucky-table'}, [
                    E('tr', {class: 'tr'}, [
                        E('td', {class: 'td left'}, _('Lucky Status')),
                        E('td', {class: 'td left', id: '_luckyStatus'}, _('Collecting data...'))
                    ])
                ])
            ]);
            settingsPane.appendChild(statusSection);

            var table1 = E('table', {class: 'lucky-table'}, [
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Installation Status')), E('td', {class: 'td left', id: '_luckyInstallStatus'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Lucky Arch')), E('td', {class: 'td left', id: '_luckyArch'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Compilation Time')), E('td', {class: 'td left', id: '_luckyCompilationTime'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Lucky Version')), E('td', {class: 'td left', id: '_luckyVersion'}, _('Collecting data...')) ])
            ]);
            settingsPane.appendChild(E('fieldset', {class: 'cbi-section'}, [ E('legend', {}, _('Main Program Information')), table1 ]));

            var table2 = E('table', {class: 'lucky-table'}, [
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Admin Panel')), E('td', {class: 'td left', id: '_luckyAdminOpen'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Admin Panel Login Info')), E('td', {class: 'td left', id: '_luckyLoginInfo'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Lucky Admin Http Port')), E('td', {class: 'td left', id: '_luckyHttpPort'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Admin Safe URL')), E('td', {class: 'td left', id: '_luckySafeURL'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Allow Internet access')), E('td', {class: 'td left', id: '_luckyAllowInternetaccess'}, _('Collecting data...')) ])
            ]);
            settingsPane.appendChild(E('fieldset', {class: 'cbi-section'}, [ E('legend', {}, _('Admin Panel Information')), table2 ]));

            var table3 = E('table', {class: 'lucky-table'}, [
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left'}, _('Config dir path')), E('td', {class: 'td left', id: '_luckyConfigDir'}, _('Collecting data...')) ])
            ]);
            settingsPane.appendChild(E('fieldset', {class: 'cbi-section'}, [ E('legend', {}, _('Basic Settings')), table3 ]));

            container.appendChild(settingsPane);

            // Logs Pane
            var logsPane = E('div', { id: '_luckyLogsPane', style: 'display:none' }, [
                E('fieldset', {class: 'cbi-section'}, [
                    E('legend', {}, _('Running Logs')),
                    E('div', {id: '_luckyLogView'}, _('Fetching logs...'))
                ])
            ]);
            container.appendChild(logsPane);

            var luckyInstalled = false;
            var adminHttpURL = "";
            var luckyPreState = false;

            function updatePageData() {
                callGetLog().then(function(res) {
                    var logView = container.querySelector('#_luckyLogView');
                    if (res && res.log) {
                        var isAtBottom = logView.scrollHeight - logView.clientHeight <= logView.scrollTop + 1;
                        dom.content(logView, res.log);
                        if (isAtBottom) logView.scrollTop = logView.scrollHeight;
                    } else if (res && res.log === "") {
                        dom.content(logView, _('No log available.'));
                    }
                });

                return callGetStatus().then(function(data) {
                    if (data && typeof(data.running) != 'undefined') {
                        luckyPreState = data.running;
                        flushLuckyStatus(data.running);
                        return callGetInfo().then(function(infoData) {
                            flushLuckyInfo(infoData);
                        });
                    }
                });
            }

            function flushLuckyStatus(status) {
                var luckyStatus = container.querySelector('#_luckyStatus');
                var luckyAdminOpen = container.querySelector('#_luckyAdminOpen');
                
                var btnStart = E('input', {
                    type: 'button', class: 'btn cbi-button cbi-button-apply', value: _('Start'),
                    click: function(ev) {
                        ev.target.disabled = true;
                        callService('start').then(function() { setTimeout(updatePageData, 1000); });
                    }
                });

                var btnStop = E('input', {
                    type: 'button', class: 'btn cbi-button cbi-button-reset', value: _('Stop'),
                    click: function(ev) {
                        ev.target.disabled = true;
                        callService('stop').then(function() { setTimeout(updatePageData, 1000); });
                    }
                });

                var btnRestart = E('input', {
                    type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('Restart'),
                    click: function(ev) {
                        ev.target.disabled = true;
                        callService('restart').then(function() { setTimeout(updatePageData, 1000); });
                    }
                });

                btnStart.disabled = status;
                btnStop.disabled = !status;
                btnRestart.disabled = !status;

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
                        '\u00a0\u00a0',
                        E('input', {
                            type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('Reset Account and Password'),
                            click: function() {
                                if (confirm(_('Reset Account and Password'))) {
                                    callSetConfig('reset_auth_info', '').then(function(res) {
                                        if (res && res.ret == 0) {
                                            updatePageData();
                                        } else alert(_('update failed'));
                                    });
                                }
                            }
                        })
                    ]);

                    dom.content(container.querySelector('#_luckyHttpPort'), [
                        E('input', {disabled: true, type: 'text', class: 'cbi-input-text', style: 'width:30%', value: baseConf.AdminWebListenPort || "16601"}),
                        '\u00a0\u00a0',
                        E('input', {
                            type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('Change'),
                            click: function() {
                                var newPort = prompt(_('Lucky Admin Http Port'));
                                if (!newPort) return;
                                if (!isNumber(newPort)) { alert(_('portValueError')); return; }
                                var np = parseInt(newPort);
                                if (np <= 0 || np > 65535) { alert(_('portValueError')); return; }
                                callSetConfig('admin_http_port', newPort).then(function(res) {
                                    if (res && res.ret == 0) {
                                        callService('restart').then(function(){ setTimeout(updatePageData, 1000); });
                                    } else alert(_('update failed'));
                                });
                            }
                        })
                    ]);

                    dom.content(container.querySelector('#_luckySafeURL'), [
                        E('input', {disabled: true, type: 'text', class: 'cbi-input-text', style: 'width:30%', value: baseConf.SafeURL || ""}),
                        '\u00a0\u00a0',
                        E('input', {
                            type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('Change'),
                            click: function() {
                                var newSafeURL = prompt(_('Admin Safe URL'));
                                if (newSafeURL == null) return;
                                callSetConfig('admin_safe_url', newSafeURL).then(function(res) {
                                    if (res && res.ret == 0) {
                                        callService('restart').then(function(){ setTimeout(updatePageData, 1000); });
                                    } else alert(_('update failed'));
                                });
                            }
                        })
                    ]);

                    if (baseConf.AllowInternetaccess) {
                        dom.content(container.querySelector('#_luckyAllowInternetaccess'), [
                            E('b', {style: 'color:green'}, _('allow')),
                            '\u00a0\u00a0',
                            E('input', {
                                type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('not allow'),
                                click: function() {
                                    if (confirm(_('Are you sure Disable Internetaccess?'))) {
                                        callSetConfig('switch_Internetaccess', 'false').then(function(res) {
                                            if (res && res.ret == 0) {
                                                callService('restart').then(function(){ setTimeout(updatePageData, 1000); });
                                            } else alert(_('update failed'));
                                        });
                                    }
                                }
                            })
                        ]);
                    } else {
                        dom.content(container.querySelector('#_luckyAllowInternetaccess'), [
                            E('b', {style: 'color:red'}, _('not allow')),
                            '\u00a0\u00a0',
                            E('input', {
                                type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('allow'),
                                click: function() {
                                    if (confirm(_('Are you sure Enalbe Internetaccess?'))) {
                                        callSetConfig('switch_Internetaccess', 'true').then(function(res) {
                                            if (res && res.ret == 0) {
                                                callService('restart').then(function(){ setTimeout(updatePageData, 1000); });
                                            } else alert(_('update failed'));
                                        });
                                    }
                                }
                            })
                        ]);
                    }

                    // Render configdir
                    var configPath = uci.get('lucky', '@lucky[0]', 'configdir') || '/etc/config/lucky.daji';
                    dom.content(container.querySelector('#_luckyConfigDir'), [
                        E('input', {disabled: true, type: 'text', class: 'cbi-input-text', style: 'width:60%', value: configPath}),
                        '\u00a0\u00a0',
                        E('input', {
                            type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('Change'),
                            click: function() {
                                var newDir = prompt(_('Config dir path'), configPath);
                                if (!newDir) return;
                                callSetConfig('configdir', newDir).then(function(res) {
                                    if (res && res.ret == 0) {
                                        updatePageData();
                                    } else alert(_('update failed'));
                                });
                            }
                        })
                    ]);
                }
            }

            flushLuckyInfo(info);

            poll.add(updatePageData, 5);

            return container;
        }, this);

        return m.render();
    }
});
