/*************************
CountDown Clock
*************************/
!(function (e) { e.fn.countdown = function (t, n) { let o = e.extend({ date: null, offset: null, day: 'Day', days: 'Days', hour: 'Hour', hours: 'Hours', minute: 'Minute', minutes: 'Minutes', second: 'Second', seconds: 'Seconds' }, t); o.date || e.error('Date is not defined.'), Date.parse(o.date) || e.error('Incorrect date format, it should look like this, 12/24/2012 12:00:00.'); let r = this; let i = function () { let e = new Date(); let t = e.getTime() + 6e4 * e.getTimezoneOffset(); return new Date(t + 36e5 * o.offset) }; var s = setInterval(function () { let e = new Date(o.date) - i(); if (e < 0) return clearInterval(s), void (n && typeof n === 'function' && n()); let t = 36e5; let a = Math.floor(e / 864e5); let d = Math.floor(e % 864e5 / t); let f = Math.floor(e % t / 6e4); let u = Math.floor(e % 6e4 / 1e3); let l = a === 1 ? o.day : o.days; let c = d === 1 ? o.hour : o.hours; let h = f === 1 ? o.minute : o.minutes; let x = u === 1 ? o.second : o.seconds; a = String(a).length >= 2 ? a : '0' + a, d = String(d).length >= 2 ? d : '0' + d, f = String(f).length >= 2 ? f : '0' + f, u = String(u).length >= 2 ? u : '0' + u, r.find('.days').text(a), r.find('.hours').text(d), r.find('.minutes').text(f), r.find('.seconds').text(u), r.find('.days_text').text(l), r.find('.hours_text').text(c), r.find('.minutes_text').text(h), r.find('.seconds_text').text(x) }, 1e3) } }(jQuery))