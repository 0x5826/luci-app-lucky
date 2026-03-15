'use strict';
'require form';
'require rpc';
'require poll';
'require view';
'require uci';
'require ui';

var callGetStatus = rpc.declare({
	object: 'luci-app-lucky',
	method: 'get_status',
	expect: { running: false }
});

var callGetInfo = rpc.declare({
	object: 'luci-app-lucky',
	method: 'get_info',
	expect: { luckyInfo: '', luckyArch: '', LuckyBaseConfigure: {} }
});

var callSetConfig = rpc.declare({
	object: 'luci-app-lucky',
	method: 'set_config',
	params: [ 'key', 'value' ],
	expect: { ret: 1 }
});

var callServiceAction = rpc.declare({
	object: 'luci-app-lucky',
	method: 'service',
	params: [ 'action' ],
	expect: { result: false }
});

return L.view.extend({
	load: function() {
		return Promise.all([
			uci.load('lucky'),
			callGetInfo()
		]);
	},

	handleServiceAction: function(action) {
		var msg = action === 'stop' ? _('Are you sure you want to stop the Lucky service?') : _('Are you sure you want to start the Lucky service?');
		if (confirm(msg)) {
			return callServiceAction(action).then(function() {
				ui.addNotification(null, E('p', _('Service %s successfully.').format(action)), 'info');
				L.ui.refresh();
			});
		}
	},

	handleResetAuth: function() {
		if (confirm(_('Reset 666 as admin account and password?'))) {
			return callSetConfig('reset_auth_info', '').then(function(res) {
				if (res.ret === 0) {
					ui.addNotification(null, E('p', _('Reset success. Service is restarting...')), 'info');
					setTimeout(function() { location.reload(); }, 2000);
				} else {
					ui.addNotification(null, E('p', _('Reset failed.')), 'danger');
				}
			});
		}
	},

	handleSetConfig: function(key, value, label) {
		var newValue = prompt(_('New %s').format(label), value);
		if (newValue === null || newValue === value)
			return;

		if (key === 'admin_http_port') {
			var port = parseInt(newValue);
			if (isNaN(port) || port <= 0 || port > 65535) {
				alert(_('Invalid port number.'));
				return;
			}
		}

		return callSetConfig(key, newValue).then(function(res) {
			if (res.ret === 0) {
				ui.addNotification(null, E('p', _('Update %s success. Service is restarting...').format(label)), 'info');
				callServiceAction('restart');
				setTimeout(function() { location.reload(); }, 2000);
			} else {
				ui.addNotification(null, E('p', _('Update %s failed.').format(label)), 'danger');
			}
		});
	},

	handleSwitchInternetAccess: function(enabled) {
		var msg = enabled ? _('Are you sure you want to enable Internet access?') : _('Are you sure you want to disable Internet access?');
		if (confirm(msg)) {
			return callSetConfig('switch_Internetaccess', enabled ? 'true' : 'false').then(function(res) {
				if (res.ret === 0) {
					ui.addNotification(null, E('p', _('Update success. Service is restarting...')), 'info');
					callServiceAction('restart');
					setTimeout(function() { location.reload(); }, 2000);
				} else {
					ui.addNotification(null, E('p', _('Update failed.')), 'danger');
				}
			});
		}
	},

	render: function(data) {
		var infoData = data[1];
		var m, s, o;

		m = new form.Map('lucky', _('Lucky'), _('ipv4/ipv6 portforward,ddns,reverseproxy proxy,wake on lan,IOT and more...'));

		// Status Section
		s = m.section(form.NamedSection, '_status', 'lucky', _('Status'));
		s.render = function() {
			var node = E('div', { 'class': 'cbi-section' }, [
				E('legend', _('Status')),
				E('div', { 'class': 'cbi-section-node' }, [
					E('div', { 'class': 'cbi-value', 'id': 'status_running' }, [
						E('label', { 'class': 'cbi-value-title' }, _('Lucky Status')),
						E('div', { 'class': 'cbi-value-field' }, E('em', _('Collecting data...')))
					]),
					E('div', { 'class': 'cbi-value' }, [
						E('label', { 'class': 'cbi-value-title' }, _('Admin Panel')),
						E('div', { 'class': 'cbi-value-field', 'id': 'admin_url' }, '-')
					])
				])
			]);

			poll.add(L.bind(function() {
				return callGetStatus().then(L.bind(function(res) {
					var container = node.querySelector('#status_running .cbi-value-field');
					var adminContainer = node.querySelector('#admin_url');
					
					if (res.running) {
						var adminPort = '16601';
						var safeURL = '';
						if (infoData.LuckyBaseConfigureRaw) {
							try {
								var baseConf = JSON.parse(infoData.LuckyBaseConfigureRaw);
								if (baseConf.BaseConfigure) {
									adminPort = baseConf.BaseConfigure.AdminWebListenPort || '16601';
									safeURL = baseConf.BaseConfigure.SafeURL || '';
								}
							} catch(e) {}
						}
						var url = 'http://' + window.location.hostname + ':' + adminPort + safeURL;
						
						dom.content(container, [
							E('b', { 'style': 'color:green' }, _('The Lucky service is running.')),
							'\u00a0\u00a0\u00a0\u00a0',
							E('button', {
								'class': 'btn cbi-button cbi-button-remove',
								'click': ui.createHandlerFn(this, 'handleServiceAction', 'stop')
							}, _('Stop'))
						]);
						
						dom.content(adminContainer, E('a', { 'href': url, 'target': '_blank', 'style': 'font-weight:bold' }, url));
					} else {
						dom.content(container, [
							E('b', { 'style': 'color:red' }, _('The Lucky service is not running.')),
							'\u00a0\u00a0\u00a0\u00a0',
							E('button', {
								'class': 'btn cbi-button-apply',
								'click': ui.createHandlerFn(this, 'handleServiceAction', 'start')
							}, _('Start'))
						]);
						dom.content(adminContainer, '-');
					}
				}, this));
			}, this), 5);

			return node;
		};

		// Info Section
		s = m.section(form.NamedSection, '_info', 'lucky', _('Main Program Information'));
		s.render = function() {
			var luckyInfo = { Version: '-', Date: '-' };
			if (infoData.luckyInfo) {
				try {
					luckyInfo = JSON.parse(infoData.luckyInfo);
				} catch(e) {}
			}
			
			var baseConf = { AdminWebListenPort: '16601', SafeURL: '', AllowInternetaccess: false };
			if (infoData.LuckyBaseConfigureRaw) {
				try {
					var raw = JSON.parse(infoData.LuckyBaseConfigureRaw);
					if (raw.BaseConfigure) baseConf = raw.BaseConfigure;
				} catch(e) {}
			}

			return E('div', { 'class': 'cbi-section' }, [
				E('legend', _('Main Program Information')),
				E('table', { 'class': 'table' }, [
					E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td', 'style': 'width:30%' }, _('Installation Status')),
						E('td', { 'class': 'td' }, infoData.luckyInfo ? E('b', { 'style': 'color:green' }, _('Installed')) : E('b', { 'style': 'color:red' }, _('Not installed')))
					]),
					E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td' }, _('Lucky Arch')),
						E('td', { 'class': 'td' }, E('b', { 'style': 'color:blue' }, infoData.luckyArch || '-'))
					]),
					E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td' }, _('Compilation Time')),
						E('td', { 'class': 'td' }, E('b', { 'style': 'color:green' }, luckyInfo.Date))
					]),
					E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td' }, _('Lucky Version')),
						E('td', { 'class': 'td' }, [
							E('b', { 'style': 'color:green' }, luckyInfo.Version),
							'\u00a0\u00a0\u00a0\u00a0',
							E('button', {
								'class': 'btn cbi-button-action',
								'click': function() { window.open('https://release.66666.host/', '_blank'); }
							}, _('Get latest version'))
						])
					])
				]),
				E('legend', _('Admin Panel Information')),
				E('table', { 'class': 'table' }, [
					E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td', 'style': 'width:30%' }, _('Admin Panel Login Info')),
						E('td', { 'class': 'td' }, [
							E('b', { 'style': 'color:green' }, _('Default: 666')),
							'\u00a0\u00a0\u00a0\u00a0',
							E('button', {
								'class': 'btn cbi-button-remove',
								'click': ui.createHandlerFn(this, 'handleResetAuth')
							}, _('Reset'))
						])
					]),
					E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td' }, _('Admin Port')),
						E('td', { 'class': 'td' }, [
							E('span', baseConf.AdminWebListenPort),
							'\u00a0\u00a0\u00a0\u00a0',
							E('button', {
								'class': 'btn cbi-button-action',
								'click': ui.createHandlerFn(this, 'handleSetConfig', 'admin_http_port', baseConf.AdminWebListenPort, _('Admin Port'))
							}, _('Change'))
						])
					]),
					E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td' }, _('Safe URL Path')),
						E('td', { 'class': 'td' }, [
							E('span', baseConf.SafeURL || _('None')),
							'\u00a0\u00a0\u00a0\u00a0',
							E('button', {
								'class': 'btn cbi-button-action',
								'click': ui.createHandlerFn(this, 'handleSetConfig', 'admin_safe_url', baseConf.SafeURL || '', _('Safe URL Path'))
							}, _('Change'))
						])
					]),
					E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td' }, _('Internet Access')),
						E('td', { 'class': 'td' }, [
							baseConf.AllowInternetaccess ? E('b', { 'style': 'color:green' }, _('Allowed')) : E('b', { 'style': 'color:red' }, _('Not allowed')),
							'\u00a0\u00a0\u00a0\u00a0',
							E('button', {
								'class': 'btn cbi-button-action',
								'click': ui.createHandlerFn(this, 'handleSwitchInternetAccess', !baseConf.AllowInternetaccess)
							}, baseConf.AllowInternetaccess ? _('Disable') : _('Enable'))
						])
					])
				])
			]);
		};

		// Basic Settings Section
		s = m.section(form.TypedSection, 'lucky', _('Basic Settings'));
		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.Value, 'configdir', _('Config dir path'), _('The path to store the config file'));
		o.placeholder = '/etc/config/lucky.daji';
		o.rmempty = false;

		return m.render();
	}
});
