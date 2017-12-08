const syslog     = require('syslog-client');
const { format } = require('util');

// Check and see if we're running on Homey.
try {
  var Homey = require('homey');
} catch(e) {
  throw Error('needs to run on Homey');
}

module.exports = (host = Homey.env.SYSLOG_HOST, opts = {}) => {
  let port           = opts.port           || Homey.env.SYSLOG_PORT     || 514;
  let syslogHostname = opts.syslogHostname || Homey.env.SYSLOG_HOSTNAME || 'Homey';
  let globalHandlers = opts.globalHandlers || Homey.env.SYSLOG_GLOBALHANDLERS === true;
  let transport      = opts.transport === 'tcp' ? syslog.Transport.Tcp : syslog.Transport.Udp;

  if (host == null || port == null) {
    throw Error('missing syslog host/port');
  }

  // Instantiate syslog client.
  let client = syslog.createClient(host, {
    port,
    transport,
    syslogHostname,
  }).on('error', e => {
    console.error('syslog error', e.message);
  });

  // Monkeypatch Homey.
  let log = console.log;
  console.log = function(...args) {
    client.log(format(...args));
    return log.apply(this, arguments);
  }

  // Install global error handlers?
  if (opts.globalHandlers === true) {
    let handler = e => {
      log.call(console, e);
      client.log(format(e), () => {
        client.close();
        process.exit(1);
      }, 3000);
    }
    process.on('uncaughtException', handler).on('unhandledRejection', handler);
  }
};
