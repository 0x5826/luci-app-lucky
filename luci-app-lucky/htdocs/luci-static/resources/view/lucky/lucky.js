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

        m = new form.Map('lucky', _('Lucky'), _('ipv4/ipv6 portforward,ddns,reverseproxy proxy,wake on lan,IOT and more...'));

        s = m.section(form.TypedSection, 'lucky');
        s.anonymous = true;
        s.addremove = false;

        s.render = L.bind(function(view, section_id) {
            var container = E('div');
            
            var adminLink = E('p', {id: '_luckyAdminLink', style: 'font-weight: bold; margin-bottom: 10px;'});
            container.appendChild(E('fieldset', {class: 'cbi-section'}, adminLink));

            var statusSection = E('fieldset', {class: 'cbi-section'}, [
                E('legend', {}, _('Service Control')),
                E('table', {class: 'table cbi-section-table'}, [
                    E('tr', {class: 'tr'}, [
                        E('td', {class: 'td left', style: 'font-weight: bold; width: 33%;'}, _('Lucky Status')),
                        E('td', {class: 'td left', id: '_luckyStatus'}, _('Collecting data...'))
                    ])
                ])
            ]);
            container.appendChild(statusSection);

            var table1 = E('table', {class: 'table cbi-section-table'}, [
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left', style: 'font-weight: bold; width: 33%;'}, _('Installation Status')), E('td', {class: 'td left', id: '_luckyInstallStatus'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left', style: 'font-weight: bold;'}, _('Lucky Arch')), E('td', {class: 'td left', id: '_luckyArch'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left', style: 'font-weight: bold;'}, _('Compilation Time')), E('td', {class: 'td left', id: '_luckyCompilationTime'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left', style: 'font-weight: bold;'}, _('Lucky Version')), E('td', {class: 'td left', id: '_luckyVersion'}, _('Collecting data...')) ])
            ]);
            container.appendChild(E('fieldset', {class: 'cbi-section'}, [ E('legend', {}, _('Main Program Information')), table1 ]));

            var table2 = E('table', {class: 'table cbi-section-table'}, [
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left', style: 'font-weight: bold; width: 33%;'}, _('Admin Panel')), E('td', {class: 'td left', id: '_luckyAdminOpen'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left', style: 'font-weight: bold;'}, _('Admin Panel Login Info')), E('td', {class: 'td left', id: '_luckyLoginInfo'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left', style: 'font-weight: bold;'}, _('Lucky Admin Http Port')), E('td', {class: 'td left', id: '_luckyHttpPort'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left', style: 'font-weight: bold;'}, _('Admin Safe URL')), E('td', {class: 'td left', id: '_luckySafeURL'}, _('Collecting data...')) ]),
                E('tr', {class: 'tr'}, [ E('td', {class: 'td left', style: 'font-weight: bold;'}, _('Allow Internet access')), E('td', {class: 'td left', id: '_luckyAllowInternetaccess'}, _('Collecting data...')) ])
            ]);
            container.appendChild(E('fieldset', {class: 'cbi-section'}, [ E('legend', {}, _('Admin Panel Information')), table2 ]));

            var luckyInstalled = false;
            var adminHttpURL = "";
            var luckyPreState = false;

            function flushLuckyStatus(status) {
                var luckyStatus = container.querySelector('#_luckyStatus');
                var luckyAdminOpen = container.querySelector('#_luckyAdminOpen');
                var luckyAdminLinkNode = container.querySelector('#_luckyAdminLink');
                
                var btnStart = E('input', {
                    type: 'button', class: 'btn cbi-button cbi-button-apply', value: _('Start'),
                    disabled: status,
                    click: function(ev) {
                        ev.target.disabled = true;
                        callService('start').then(function() { setTimeout(function() { location.reload(); }, 1500); });
                    }
                });

                var btnStop = E('input', {
                    type: 'button', class: 'btn cbi-button cbi-button-reset', value: _('Stop'),
                    disabled: !status,
                    click: function(ev) {
                        ev.target.disabled = true;
                        callService('stop').then(function() { setTimeout(function() { location.reload(); }, 1500); });
                    }
                });

                var btnRestart = E('input', {
                    type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('Restart'),
                    disabled: !status,
                    click: function(ev) {
                        ev.target.disabled = true;
                        callService('restart').then(function() { setTimeout(function() { location.reload(); }, 1500); });
                    }
                });

                if (status) {
                    luckyInstalled = true;
                    dom.content(luckyStatus, [
                        E('b', {style: 'color:green'}, _('The Lucky service is running.')),
                        '\u00a0\u00a0', btnStart, '\u00a0', btnStop, '\u00a0', btnRestart
                    ]);
                    dom.content(luckyAdminOpen, E('a', {href: adminHttpURL, target: '_blank', style: 'font-weight:bold; color:blue;'}, adminHttpURL));
                    dom.content(luckyAdminLinkNode, E('b', {}, E('a', {href: adminHttpURL, target: '_blank'}, adminHttpURL)));
                } else {
                    if (luckyInstalled) {
                        dom.content(luckyStatus, [
                            E('b', {style: 'color:red'}, _('The Lucky service is not running.')),
                            '\u00a0\u00a0', btnStart, '\u00a0', btnStop, '\u00a0', btnRestart
                        ]);
                        dom.content(luckyAdminOpen, E('b', {style: 'color:red'}, _('Service not running, Admin Panel is unavailable')));
                        dom.content(luckyAdminLinkNode, E('b', {style: 'color:red'}, _('Please start the service first to access the admin panel')));
                    } else {
                        dom.content(luckyStatus, E('b', {style: 'color:red'}, _('Not installed')));
                        dom.content(luckyAdminOpen, '');
                        dom.content(luckyAdminLinkNode, '');
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
                        
                        var verNode = container.querySelector('#_luckyVersion');
                        dom.content(verNode, [
                            notInst.cloneNode(true),
                            '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0',
                            E('input', {
                                type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('get latest version'),
                                click: function() { window.open("https://release.66666.host/"); }
                            })
                        ]);
                        dom.content(container.querySelector('#_luckyAdminLink'), '');
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
                            type: 'button', class: 'btn cbi-button cbi-button-reload', value: _('Reset 666 as admin account and password?').replace('?', ''),
                            click: function() {
                                if (confirm(_('Reset 666 as admin account and password?'))) {
                                    callSetConfig('reset_auth_info', '').then(function(res) {
                                        if (res && res.ret == 0) {
                                            alert(_('update success'));
                                            setTimeout(function() { location.reload(); }, 2000);
                                        } else alert(_('update failed'));
                                    });
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
                                callSetConfig('admin_http_port', newPort).then(function(res) {
                                    if (res && res.ret == 0) {
                                        alert(_('update success'));
                                        callService('restart').then(function(){ setTimeout(function() { location.reload(); }, 2000); });
                                    } else alert(_('update failed'));
                                });
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
                                callSetConfig('admin_safe_url', newSafeURL).then(function(res) {
                                    if (res && res.ret == 0) {
                                        alert(_('update success'));
                                        callService('restart').then(function(){ setTimeout(function() { location.reload(); }, 2000); });
                                    } else alert(_('update failed'));
                                });
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
                                        callSetConfig('switch_Internetaccess', 'false').then(function(res) {
                                            if (res && res.ret == 0) {
                                                alert(_('update success'));
                                                callService('restart').then(function(){ setTimeout(function() { location.reload(); }, 2000); });
                                            } else alert(_('update failed'));
                                        });
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
                                        callSetConfig('switch_Internetaccess', 'true').then(function(res) {
                                            if (res && res.ret == 0) {
                                                alert(_('update success'));
                                                callService('restart').then(function(){ setTimeout(function() { location.reload(); }, 2000); });
                                            } else alert(_('update failed'));
                                        });
                                    }
                                }
                            })
                        ]);
                    }
                }
            }

            flushLuckyInfo(info);

            poll.add(function() {
                return callGetStatus().then(function(data) {
                    if (data && typeof(data.running) != 'undefined') {
                        if (luckyPreState != data.running) {
                            callGetInfo().then(function(newInfo) { flushLuckyInfo(newInfo); });
                        }
                        luckyPreState = data.running;
                        flushLuckyStatus(data.running);
                    }
                });
            }, 3);

            return container;
        }, this);

        s = m.section(form.TypedSection, 'lucky', _('Basic Settings'));
        s.anonymous = true;
        s.addremove = false;

        o = s.option(form.Value, 'configdir', _('Config dir path'), _('The path to store the config file'));
        o.placeholder = '/etc/config/lucky.daji';

        return m.render();
    },

    handleSaveApply: function(ev, mode) {
        return this.super('handleSaveApply', [ev, mode]).then(function() {
            return callService('restart');
        });
    }
});
