'use strict';
'require form';
'require rpc';
'require uci';
'require poll';
'require view';
'require ui';
'require dom';

var callLuckyStatus = rpc.declare({
	object: 'luci.lucky',
	method: 'get_status',
	expect: { '': { running: false } }
});

var callLuckyInfo = rpc.declare({
	object: 'luci.lucky',
	method: 'get_info',
	expect: { '': {} }
});

var callLuckySetConfig = rpc.declare({
	object: 'luci.lucky',
	method: 'set_config',
	params: [ 'key', 'value' ],
	expect: { '': { ret: 1 } }
});

var callLuckyServiceAction = rpc.declare({
	object: 'luci.lucky',
	method: 'service_action',
	params: [ 'action' ],
	expect: { '': { ret: 0 } }
});

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('lucky'),
			callLuckyInfo()
		]);
	},

	render: function(data) {
		var luckyInfo = data[1];
		var m, s, o;

		m = new form.Map('lucky', _('Lucky'), _('ipv4/ipv6 portforward,ddns,reverseproxy proxy,wake on lan,IOT and more...'));

		// Status Section
		s = m.section(form.NamedSection, '_status', '_status', _('Status'));
		s.render = function() {
			var container = dom.create('div', { 'class': 'cbi-section' });

			var adminLinkP = dom.create('p', { 'id': '_luckyAdminLink', 'style': 'font-weight: bold;' });
			dom.append(container, adminLinkP);

			var mainInfoFS = dom.create('fieldset', { 'class': 'cbi-section' }, [
				dom.create('legend', {}, _('Main Program Information')),
				dom.create('table', { 'style': 'width: 100%' }, [
					dom.create('tr', {}, [ dom.create('td', {}, _('Installation Status')), dom.create('td', { 'id': '_luckyInstallStatus' }, _('Collecting data...')) ]),
					dom.create('tr', {}, [ dom.create('td', {}, _('Lucky Status')), dom.create('td', { 'id': '_luckyStatus' }, _('Collecting data...')) ]),
					dom.create('tr', {}, [ dom.create('td', {}, _('Lucky Arch')), dom.create('td', { 'id': '_luckyArch' }, _('Collecting data...')) ]),
					dom.create('tr', {}, [ dom.create('td', {}, _('Compilation Time')), dom.create('td', { 'id': '_luckyCompilationTime' }, _('Collecting data...')) ]),
					dom.create('tr', {}, [ dom.create('td', {}, _('Lucky Version')), dom.create('td', { 'id': '_luckyVersion' }, _('Collecting data...')) ])
				])
			]);
			dom.append(container, mainInfoFS);

			var adminInfoFS = dom.create('fieldset', { 'class': 'cbi-section' }, [
				dom.create('legend', {}, _('Admin Panel Information')),
				dom.create('table', { 'style': 'width: 100%' }, [
					dom.create('tr', {}, [ dom.create('td', {}, _('Admin Panel')), dom.create('td', { 'id': '_luckyAdminOpen' }, _('Collecting data...')) ]),
					dom.create('tr', {}, [ dom.create('td', {}, _('Admin Panel Login Info')), dom.create('td', { 'id': '_luckyLoginInfo' }, _('Collecting data...')) ]),
					dom.create('tr', {}, [ dom.create('td', {}, _('Admin Panel Port')), dom.create('td', { 'id': '_luckyHttpPort' }, _('Collecting data...')) ]),
					dom.create('tr', {}, [ dom.create('td', {}, _('Admin Panel Safe URL')), dom.create('td', { 'id': '_luckySafeURL' }, _('Collecting data...')) ]),
					dom.create('tr', {}, [ dom.create('td', {}, _('Internet Access')), dom.create('td', { 'id': '_luckyAllowInternetaccess' }, _('Collecting data...')) ])
				])
			]);
			dom.append(container, adminInfoFS);

			var self = this;
			var luckyInstalled = false;
			var adminHttpURL = "";

			function flushLuckyStatus(running) {
				var statusEl = document.getElementById('_luckyStatus');
				var adminOpenEl = document.getElementById('_luckyAdminOpen');
				var adminLinkEl = document.getElementById('_luckyAdminLink');

				if (!statusEl) return;

				if (running) {
					statusEl.innerHTML = '<b style="color:green">' + _('The Lucky service is running.') + '</b>' +
						'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
						'<input type="button" class="btn cbi-button cbi-button-reload" value="' + _('Stop') + '" onclick="window.StopService()"/>';

					adminOpenEl.innerHTML = '<a href="' + adminHttpURL + '" target="_blank">' + adminHttpURL + '</a>';
					adminLinkEl.innerHTML = '<b><a href="' + adminHttpURL + '" target="_blank">' + adminHttpURL + '</a></b>';
				} else {
					if (luckyInstalled) {
						statusEl.innerHTML = '<b style="color:red">' + _('The Lucky service is not running.') + '</b>' +
							'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
							'<input type="button" class="btn cbi-button cbi-button-reload" value="' + _('Start') + '" onclick="window.StartService()"/>';
					} else {
						statusEl.innerHTML = '<b style="color:red">' + _('Not installed') + '</b>';
					}
					adminOpenEl.innerHTML = '';
					adminLinkEl.innerHTML = '';
				}
			}

			window.FlushLuckyInfo = function() {
				callLuckyInfo().then(function(info) {
					var archEl = document.getElementById('_luckyArch');
					var installStatusEl = document.getElementById('_luckyInstallStatus');
					var statusEl = document.getElementById('_luckyStatus');
					var compTimeEl = document.getElementById('_luckyCompilationTime');
					var versionEl = document.getElementById('_luckyVersion');
					var loginInfoEl = document.getElementById('_luckyLoginInfo');
					var httpPortEl = document.getElementById('_luckyHttpPort');
					var safeURLEl = document.getElementById('_luckySafeURL');
					var internetAccessEl = document.getElementById('_luckyAllowInternetaccess');

					if (!archEl) return;

					archEl.innerHTML = '<b style="color:blue">' + (info.luckyArch || '') + '</b>';

					if (!info.luckyInfo || info.luckyInfo === "") {
						luckyInstalled = false;
						statusEl.innerHTML = '<b style="color:red">' + _('Not installed') + '</b>';
						installStatusEl.innerHTML = '<b style="color:red">' + _('Not installed') + '</b>';
						compTimeEl.innerHTML = '<b style="color:red">' + _('Not installed') + '</b>';
						versionEl.innerHTML = '<b style="color:red">' + _('Not installed') + '</b>' +
							'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
							'<input type="button" class="btn cbi-button cbi-button-reload" value="' + _('get latest version') + '" onclick="window.OpenGithub()"/>';
						loginInfoEl.innerHTML = '<b style="color:red">' + _('Not installed') + '</b>';
						httpPortEl.innerHTML = '<b style="color:red">' + _('Not installed') + '</b>';
						safeURLEl.innerHTML = '<b style="color:red">' + _('Not installed') + '</b>';
						internetAccessEl.innerHTML = '<b style="color:red">' + _('Not installed') + '</b>';
						return;
					}

					luckyInstalled = true;
					installStatusEl.innerHTML = '<b style="color:green">' + _('Installed') + '</b>';

					var luckyParsed;
					try { luckyParsed = JSON.parse(info.luckyInfo); } catch(e) {}

					if (luckyParsed) {
						compTimeEl.innerHTML = '<b style="color:green">' + luckyParsed.Date + '</b>';
						versionEl.innerHTML = '<b style="color:green">' + luckyParsed.Version + '</b>' +
							'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
							'<input type="button" class="btn cbi-button cbi-button-reload" value="' + _('get latest version') + '" onclick="window.OpenGithub()"/>';
					}

					if (info.LuckyBaseConfigure) {
						adminHttpURL = "http://" + window.location.hostname + ":" + info.LuckyBaseConfigure.AdminWebListenPort;
						if (info.LuckyBaseConfigure.SafeURL) {
							adminHttpURL += info.LuckyBaseConfigure.SafeURL;
						}

						loginInfoEl.innerHTML = '<b style="color:green">' + _('DefaultAuth') + ':666</b>' +
							'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
							'<input type="button" class="btn cbi-button cbi-button-reload" value="' + _('Reset') + '" onclick="window.ResetAuthInfo()"/>';

						httpPortEl.innerHTML = '<input disabled type="text" class="cbi-input-text" style="width:30%" value="' + info.LuckyBaseConfigure.AdminWebListenPort + '"/>' +
							'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
							'<input type="button" class="btn cbi-button cbi-button-reload" value="' + _('Change') + '" onclick="window.SetNewHttpPort(\'' + info.LuckyBaseConfigure.AdminWebListenPort + '\')"/>';

						safeURLEl.innerHTML = '<input disabled type="text" class="cbi-input-text" style="width:30%" value="' + (info.LuckyBaseConfigure.SafeURL || '') + '"/>' +
							'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
							'<input type="button" class="btn cbi-button cbi-button-reload" value="' + _('Change') + '" onclick="window.SetNewSafeURL(\'' + (info.LuckyBaseConfigure.SafeURL || '') + '\')"/>';

						if (info.LuckyBaseConfigure.AllowInternetaccess) {
							internetAccessEl.innerHTML = '<b style="color:green">' + _('allow') + '</b>' +
								'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
								'<input type="button" class="btn cbi-button cbi-button-reload" value="' + _('Disable') + '" onclick="window.SwitchAllowInternetaccess(false)"/>';
						} else {
							internetAccessEl.innerHTML = '<b style="color:red">' + _('not allow') + '</b>' +
								'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
								'<input type="button" class="btn cbi-button cbi-button-reload" value="' + _('Enable') + '" onclick="window.SwitchAllowInternetaccess(true)"/>';
						}
					}
				});
			};

			window.StartService = function() {
				if (confirm(_('are you sure start lucky service?'))) {
					callLuckyServiceAction('start');
				}
			};

			window.StopService = function() {
				if (confirm(_('are you sure stop lucky service?'))) {
					callLuckyServiceAction('stop');
				}
			};

			window.OpenGithub = function() {
				window.open("https://release.66666.host/");
			};

			window.ResetAuthInfo = function() {
				if (confirm(_('Reset 666 as admin account and password?'))) {
					callLuckySetConfig('reset_auth_info', '').then(function(res) {
						if (res.ret == 0) {
							ui.addNotification(null, E('p', _('Update success, restarting service...')), 'info');
							callLuckyServiceAction('restart');
							setTimeout(function() { location.reload(); }, 2000);
						}
					});
				}
			};

			window.SetNewHttpPort = function(oldPort) {
				var newPort = prompt(_('NewHttpPort'));
				if (newPort === null || newPort === "" || newPort === oldPort) return;
				if (!/^\d+$/.test(newPort) || parseInt(newPort) <= 0 || parseInt(newPort) > 65535) {
					alert(_('portValueError'));
					return;
				}
				callLuckySetConfig('admin_http_port', newPort).then(function(res) {
					if (res.ret == 0) {
						ui.addNotification(null, E('p', _('Update success, restarting service...')), 'info');
						callLuckyServiceAction('restart');
						setTimeout(function() { location.reload(); }, 2000);
					}
				});
			};

			window.SetNewSafeURL = function(oldURL) {
				var newURL = prompt(_('New Safe URL')); // Placeholder title, since it's not in Lua's _()
				if (newURL === null || newURL === oldURL) return;
				callLuckySetConfig('admin_safe_url', newURL).then(function(res) {
					if (res.ret == 0) {
						ui.addNotification(null, E('p', _('Update success, restarting service...')), 'info');
						callLuckyServiceAction('restart');
						setTimeout(function() { location.reload(); }, 2000);
					}
				});
			};

			window.SwitchAllowInternetaccess = function(enable) {
				var msg = enable ? _('Are you sure Enalbe Internetaccess?') : _('Are you sure Disable Internetaccess?');
				if (confirm(msg)) {
					callLuckySetConfig('switch_Internetaccess', enable ? 'true' : 'false').then(function(res) {
						if (res.ret == 0) {
							ui.addNotification(null, E('p', _('Update success, restarting service...')), 'info');
							callLuckyServiceAction('restart');
							setTimeout(function() { location.reload(); }, 2000);
						}
					});
				}
			};

			var luckyPreState = false;
			poll.add(function() {
				return callLuckyStatus().then(function(data) {
					if (luckyPreState != data.running) {
						window.FlushLuckyInfo();
					}
					luckyPreState = data.running;
					flushLuckyStatus(data.running);
				});
			}, 3);

			window.FlushLuckyInfo();

			return container;
		};

		// Basic Settings Section
		s = m.section(form.TypedSection, 'lucky', _('Basic Settings'));
		s.addremove = false;
		s.anonymous = true;

		o = s.option(form.Value, 'configdir', _('Config dir path'), _('The path to store the config file'));
		o.placeholder = '/etc/config/lucky.daji';

		return m.render();
	},

	handleSaveApply: function(ev, mode) {
		return this.super('handleSaveApply', [ev, mode]).then(function() {
			return callLuckyServiceAction('restart');
		});
	}
});
