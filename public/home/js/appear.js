/*************************
jQuery Appear
*************************/
(function ($) { 'use strict'; $.fn.appear = function (fn, options) { let settings = $.extend({ data: undefined, one: true, accX: 0, accY: 0 }, options); return this.each(function () { let t = $(this); t.appeared = false; if (!fn) { t.trigger('appear', settings.data); return } let w = $(window); let check = function () { if (!t.is(':visible')) { t.appeared = false; return } let a = w.scrollLeft(); let b = w.scrollTop(); let o = t.offset(); let x = o.left; let y = o.top; let ax = settings.accX; let ay = settings.accY; let th = t.height(); let wh = w.height(); let tw = t.width(); let ww = w.width(); if (y + th + ay >= b && y <= b + wh + ay && x + tw + ax >= a && x <= a + ww + ax) { if (!t.appeared)t.trigger('appear', settings.data) } else { t.appeared = false } }; let modifiedFn = function () { t.appeared = true; if (settings.one) { w.unbind('scroll', check); let i = $.inArray(check, $.fn.appear.checks); if (i >= 0)$.fn.appear.checks.splice(i, 1) }fn.apply(this, arguments) }; if (settings.one)t.one('appear', settings.data, modifiedFn); else t.bind('appear', settings.data, modifiedFn); w.scroll(check); $.fn.appear.checks.push(check); (check)() }) }; $.extend($.fn.appear, { checks: [], timeout: null, checkAll: function () { let length = $.fn.appear.checks.length; if (length > 0) while (length--)($.fn.appear.checks[length])() }, run: function () { if ($.fn.appear.timeout)clearTimeout($.fn.appear.timeout); $.fn.appear.timeout = setTimeout($.fn.appear.checkAll, 20) } }); $.each(['append', 'prepend', 'after', 'before', 'attr', 'removeAttr', 'addClass', 'removeClass', 'toggleClass', 'remove', 'css', 'show', 'hide'], function (i, n) { let old = $.fn[n]; if (old) { $.fn[n] = function () { let r = old.apply(this, arguments); $.fn.appear.run(); return r } } }) })(jQuery)
