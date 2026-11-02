/* Enquiry form (SRS 7 and 8): browser validation that mirrors the server,
   sending state, no duplicate submits, success only after confirmed delivery. */
(function () {
  var form = document.getElementById('enquiry-form');
  if (!form) return;
  var status = document.querySelector('.form-status');
  var button = form.querySelector('button[type="submit"]');
  var buttonText = button.querySelector('.btn-text');
  var sending = false;

  var LIMITS = { name: 100, email: 254, phone: 40, organisation: 150, location: 250, details: 5000, budget: 100 };
  var LABELS = { name: 'Name', email: 'Email address', phone: 'Telephone', organisation: 'Organisation', location: 'Venue or location', details: 'Event details', budget: 'Budget range' };
  var EMAIL_RE = /^[^\s@"<>(),;:\\[\]]+@[^\s@"<>(),;:\\[\]]+\.[^\s@"<>(),;:\\[\]]{2,}$/;
  var PHONE_RE = /^\+?[\d\s().\-\/]{6,40}$/;

  // Preselect a service when arriving from a Services link (?service=...).
  var pre = new URLSearchParams(location.search).get('service');
  if (pre) {
    var radio = form.querySelector('input[name="service"][value="' + pre.replace(/"/g, '') + '"]');
    if (radio) radio.checked = true;
  }

  function values() {
    var fd = new FormData(form), out = {};
    fd.forEach(function (v, k) { out[k] = typeof v === 'string' ? v.trim() : v; });
    if (out.name) out.name = out.name.replace(/\s+/g, ' ');
    return out;
  }

  function validate(d) {
    var e = {};
    if (!d.name) e.name = 'Enter your name.';
    if (!d.email) e.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(d.email)) e.email = 'Enter an email address in the format name@example.com.';
    if (!d.service) e.service = 'Choose the service you are interested in.';
    if (!d.details) e.details = 'Tell us about your event.';
    if (d.phone && !PHONE_RE.test(d.phone)) e.phone = 'Enter a telephone number using digits, spaces and an optional + country code.';
    if (d.guests && !/^[1-9]\d*$/.test(d.guests)) e.guests = 'Enter the guest count as a whole number, such as 120.';
    Object.keys(LIMITS).forEach(function (k) {
      if (!e[k] && d[k] && d[k].length > LIMITS[k]) e[k] = LABELS[k] + ' must be ' + LIMITS[k].toLocaleString('en-GB') + ' characters or fewer.';
    });
    return e;
  }

  function fieldFor(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.closest('.field') : null;
  }

  function showErrors(errors) {
    form.querySelectorAll('.err').forEach(function (p) { p.textContent = ''; });
    form.querySelectorAll('.has-error').forEach(function (f) { f.classList.remove('has-error'); });
    form.querySelectorAll('[aria-invalid]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
    var first = null;
    Object.keys(errors).forEach(function (name) {
      var msg = document.getElementById('e-' + name);
      if (msg) msg.textContent = errors[name];
      var f = fieldFor(name);
      if (f) f.classList.add('has-error');
      form.querySelectorAll('[name="' + name + '"]').forEach(function (i) { i.setAttribute('aria-invalid', 'true'); });
      if (!first) first = form.querySelector('[name="' + name + '"]');
    });
    return first;
  }

  function setStatus(kind, title, text) {
    status.hidden = false;
    status.className = 'form-status is-' + kind;
    status.innerHTML = '';
    var s = document.createElement('strong'); s.textContent = title;
    var p = document.createElement('p'); p.textContent = text;
    status.appendChild(s); status.appendChild(p);
    status.focus();
  }

  function setSending(on) {
    sending = on;
    button.setAttribute('aria-disabled', on ? 'true' : 'false');
    buttonText.textContent = on ? 'Sending…' : 'Send Enquiry';
    var sp = button.querySelector('.spinner');
    if (on && !sp) { sp = document.createElement('span'); sp.className = 'spinner'; sp.setAttribute('aria-hidden', 'true'); button.prepend(sp); }
    if (!on && sp) sp.remove();
  }

  // Clear a field's error as soon as it is corrected.
  form.addEventListener('input', function (ev) {
    var f = ev.target.closest('.field');
    if (!f || !f.classList.contains('has-error')) return;
    var errs = validate(values());
    if (!errs[ev.target.name]) {
      f.classList.remove('has-error');
      var msg = document.getElementById('e-' + ev.target.name); if (msg) msg.textContent = '';
      form.querySelectorAll('[name="' + ev.target.name + '"]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
    }
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (sending) return;
    var data = values();
    var errors = validate(data);
    var first = showErrors(errors);
    if (first) {
      setStatus('error', 'Check the highlighted fields', 'Some required details are missing or need correcting.');
      first.focus();
      return;
    }
    status.hidden = true;
    setSending(true);

    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'same-origin'
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) { return { res: res, body: body }; });
    }).then(function (r) {
      if (r.res.ok && r.body.ok === true) {
        form.reset();
        setStatus('success', 'Enquiry sent',
          'Thank you. Your enquiry has been sent to The House of Adam Events.' + (r.body.reference ? ' Your reference is ' + r.body.reference + '.' : ''));
        return;
      }
      if (r.res.status === 422 && r.body.errors) {
        var f = showErrors(r.body.errors);
        setStatus('error', 'Check the highlighted fields', 'Some details need correcting before the enquiry can be sent.');
        if (f) f.focus();
        return;
      }
      setStatus('error', 'Enquiry not sent', r.body.message || 'Your enquiry could not be sent. Please try again or contact us by email.');
    }).catch(function () {
      setStatus('error', 'Enquiry not sent', 'Your enquiry could not be sent. Please try again or contact us by email.');
    }).then(function () { setSending(false); });
  });
})();
