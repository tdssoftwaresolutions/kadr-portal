/*************************
Skrollr
*************************/
/*! skrollr 0.6.30 (2015-08-12) | Alexander Prinzhorn - https://github.com/Prinzhorn/skrollr | Free to use under terms of MIT license */
!(function (a, b, c) {
  'use strict'

  function d (c) {
    if (e = b.documentElement, f = b.body, T(), ha = this, c = c || {}, ma = c.constants || {}, c.easing) { for (let d in c.easing) W[d] = c.easing[d] }
    ta = c.edgeStrategy || 'set', ka = {
      beforerender: c.beforerender,
      render: c.render,
      keyframe: c.keyframe
    }, la = c.forceHeight !== !1, la && (Ka = c.scale || 1), na = c.mobileDeceleration || y, pa = c.smoothScrolling !== !1, qa = c.smoothScrollingDuration || A, ra = {
      targetTop: ha.getScrollTop()
    }, Sa = (c.mobileCheck || function () {
      return /Android|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent || navigator.vendor || a.opera)
    })(), Sa ? (ja = b.getElementById(c.skrollrBody || z), ja && ga(), X(), Ea(e, [s, v], [t])) : Ea(e, [s, u], [t]), ha.refresh(), wa(a, 'resize orientationchange load', function () {
      let a = e.clientWidth
      let b = e.clientHeight;
      (b !== Pa || a !== Oa) && (Pa = b, Oa = a, Qa = !0)
    })
    let g = U()
    return (function h () {
      $(), va = g(h)
    }()), ha
  }
  let e; let f; let g = {
    get: function () {
      return ha
    },
    init: function (a) {
      return ha || new d(a)
    },
    VERSION: '0.6.30'
  }
  let h = Object.prototype.hasOwnProperty
  let i = a.Math
  let j = a.getComputedStyle
  let k = 'touchstart'
  let l = 'touchmove'
  let m = 'touchcancel'
  let n = 'touchend'
  let o = 'skrollable'
  let p = o + '-before'
  let q = o + '-between'
  let r = o + '-after'
  var s = 'skrollr'
  var t = 'no-' + s
  var u = s + '-desktop'
  var v = s + '-mobile'
  let w = 'linear'
  let x = 1e3
  var y = 0.004
  var z = 'skrollr-body'
  var A = 200
  let B = 'start'
  let C = 'end'
  let D = 'center'
  let E = 'bottom'
  let F = '___skrollable_id'
  let G = /^(?:input|textarea|button|select)$/i
  let H = /^\s+|\s+$/g
  let I = /^data(?:-(_\w+))?(?:-?(-?\d*\.?\d+p?))?(?:-?(start|end|top|center|bottom))?(?:-?(top|center|bottom))?$/
  let J = /\s*(@?[\w\-\[\]]+)\s*:\s*(.+?)\s*(?:;|$)/gi
  let K = /^(@?[a-z\-]+)\[(\w+)\]$/
  let L = /-([a-z0-9_])/g
  let M = function (a, b) {
    return b.toUpperCase()
  }
  let N = /[\-+]?[\d]*\.?[\d]+/g
  let O = /\{\?\}/g
  let P = /rgba?\(\s*-?\d+\s*,\s*-?\d+\s*,\s*-?\d+/g
  let Q = /[a-z\-]+-gradient/g
  let R = ''
  let S = ''
  var T = function () {
    let a = /^(?:O|Moz|webkit|ms)|(?:-(?:o|moz|webkit|ms)-)/
    if (j) {
      let b = j(f, null)
      for (let c in b) { if (R = c.match(a) || +c == c && b[c].match(a)) break }
      if (!R) return void (R = S = '')
      R = R[0], R.slice(0, 1) === '-'
        ? (S = R, R = {
            '-webkit-': 'webkit',
            '-moz-': 'Moz',
            '-ms-': 'ms',
            '-o-': 'O'
          }[R])
        : S = '-' + R.toLowerCase() + '-'
    }
  }
  var U = function () {
    let b = a.requestAnimationFrame || a[R.toLowerCase() + 'RequestAnimationFrame']
    let c = Ha()
    return (Sa || !b) && (b = function (b) {
      let d = Ha() - c
      let e = i.max(0, 1e3 / 60 - d)
      return a.setTimeout(function () {
        c = Ha(), b()
      }, e)
    }), b
  }
  let V = function () {
    let b = a.cancelAnimationFrame || a[R.toLowerCase() + 'CancelAnimationFrame']
    return (Sa || !b) && (b = function (b) {
      return a.clearTimeout(b)
    }), b
  }
  var W = {
    begin: function () {
      return 0
    },
    end: function () {
      return 1
    },
    linear: function (a) {
      return a
    },
    quadratic: function (a) {
      return a * a
    },
    cubic: function (a) {
      return a * a * a
    },
    swing: function (a) {
      return -i.cos(a * i.PI) / 2 + 0.5
    },
    sqrt: function (a) {
      return i.sqrt(a)
    },
    outCubic: function (a) {
      return i.pow(a - 1, 3) + 1
    },
    bounce: function (a) {
      let b
      if (a <= 0.5083) b = 3
      else if (a <= 0.8489) b = 9
      else if (a <= 0.96208) b = 27
      else {
        if (!(a <= 0.99981)) return 1
        b = 91
      }
      return 1 - i.abs(3 * i.cos(a * b * 1.028) / b)
    }
  }
  d.prototype.refresh = function (a) {
    let d; let e; let f = !1
    for (a === c ? (f = !0, ia = [], Ra = 0, a = b.getElementsByTagName('*')) : a.length === c && (a = [a]), d = 0, e = a.length; e > d; d++) {
      let g = a[d]
      let h = g
      let i = []
      let j = pa
      let k = ta
      let l = !1
      if (f && F in g && delete g[F], g.attributes) {
        for (let m = 0, n = g.attributes.length; n > m; m++) {
          let p = g.attributes[m]
          if (p.name !== 'data-anchor-target') {
            if (p.name !== 'data-smooth-scrolling') {
              if (p.name !== 'data-edge-strategy') {
                if (p.name !== 'data-emit-events') {
                  let q = p.name.match(I)
                  if (q !== null) {
                    let r = {
                      props: p.value,
                      element: g,
                      eventType: p.name.replace(L, M)
                    }
                    i.push(r)
                    let s = q[1]
                    s && (r.constant = s.substr(1))
                    let t = q[2];
                    /p$/.test(t) ? (r.isPercentage = !0, r.offset = (0 | t.slice(0, -1)) / 100) : r.offset = 0 | t
                    let u = q[3]
                    let v = q[4] || u
                    u && u !== B && u !== C ? (r.mode = 'relative', r.anchors = [u, v]) : (r.mode = 'absolute', u === C ? r.isEnd = !0 : r.isPercentage || (r.offset = r.offset * Ka))
                  }
                } else l = !0
              } else k = p.value
            } else j = p.value !== 'off'
          } else if (h = b.querySelector(p.value), h === null) throw 'Unable to find anchor target "' + p.value + '"'
        }
        if (i.length) {
          var w, x, y
          !f && F in g ? (y = g[F], w = ia[y].styleAttr, x = ia[y].classAttr) : (y = g[F] = Ra++, w = g.style.cssText, x = Da(g)), ia[y] = {
            element: g,
            styleAttr: w,
            classAttr: x,
            anchorTarget: h,
            keyFrames: i,
            smoothScrolling: j,
            edgeStrategy: k,
            emitEvents: l,
            lastFrameIndex: -1
          }, Ea(g, [o], [])
        }
      }
    }
    for (Aa(), d = 0, e = a.length; e > d; d++) {
      let z = ia[a[d][F]]
      z !== c && (_(z), ba(z))
    }
    return ha
  }, d.prototype.relativeToAbsolute = function (a, b, c) {
    let d = e.clientHeight
    let f = a.getBoundingClientRect()
    let g = f.top
    let h = f.bottom - f.top
    return b === E ? g -= d : b === D && (g -= d / 2), c === E ? g += h : c === D && (g += h / 2), g += ha.getScrollTop(), g + 0.5 | 0
  }, d.prototype.animateTo = function (a, b) {
    b = b || {}
    let d = Ha()
    let e = ha.getScrollTop()
    let f = b.duration === c ? x : b.duration
    return oa = {
      startTop: e,
      topDiff: a - e,
      targetTop: a,
      duration: f,
      startTime: d,
      endTime: d + f,
      easing: W[b.easing || w],
      done: b.done
    }, oa.topDiff || (oa.done && oa.done.call(ha, !1), oa = c), ha
  }, d.prototype.stopAnimateTo = function () {
    oa && oa.done && oa.done.call(ha, !0), oa = c
  }, d.prototype.isAnimatingTo = function () {
    return !!oa
  }, d.prototype.isMobile = function () {
    return Sa
  }, d.prototype.setScrollTop = function (b, c) {
    return sa = c === !0, Sa ? Ta = i.min(i.max(b, 0), Ja) : a.scrollTo(0, b), ha
  }, d.prototype.getScrollTop = function () {
    return Sa ? Ta : a.pageYOffset || e.scrollTop || f.scrollTop || 0
  }, d.prototype.getMaxScrollTop = function () {
    return Ja
  }, d.prototype.on = function (a, b) {
    return ka[a] = b, ha
  }, d.prototype.off = function (a) {
    return delete ka[a], ha
  }, d.prototype.destroy = function () {
    let a = V()
    a(va), ya(), Ea(e, [t], [s, u, v])
    for (let b = 0, d = ia.length; d > b; b++) fa(ia[b].element)
    e.style.overflow = f.style.overflow = '', e.style.height = f.style.height = '', ja && g.setStyle(ja, 'transform', 'none'), ha = c, ja = c, ka = c, la = c, Ja = 0, Ka = 1, ma = c, na = c, La = 'down', Ma = -1, Oa = 0, Pa = 0, Qa = !1, oa = c, pa = c, qa = c, ra = c, sa = c, Ra = 0, ta = c, Sa = !1, Ta = 0, ua = c
  }
  var X = function () {
    let d, g, h, j, o, p, q, r, s, t, u, v
    wa(e, [k, l, m, n].join(' '), function (a) {
      let e = a.changedTouches[0]
      for (j = a.target; j.nodeType === 3;) j = j.parentNode
      switch (o = e.clientY, p = e.clientX, t = a.timeStamp, G.test(j.tagName) || a.preventDefault(), a.type) {
        case k:
          d && d.blur(), ha.stopAnimateTo(), d = j, g = q = o, h = p, s = t
          break
        case l:
          G.test(j.tagName) && b.activeElement !== j && a.preventDefault(), r = o - q, v = t - u, ha.setScrollTop(Ta - r, !0), q = o, u = t
          break
        default:
        case m:
        case n:
          var f = g - o
          var w = h - p
          var x = w * w + f * f
          if (x < 49) {
            if (!G.test(d.tagName)) {
              d.focus()
              let y = b.createEvent('MouseEvents')
              y.initMouseEvent('click', !0, !0, a.view, 1, e.screenX, e.screenY, e.clientX, e.clientY, a.ctrlKey, a.altKey, a.shiftKey, a.metaKey, 0, null), d.dispatchEvent(y)
            }
            return
          }
          d = c
          var z = r / v
          z = i.max(i.min(z, 3), -3)
          var A = i.abs(z / na)
          var B = z * A + 0.5 * na * A * A
          var C = ha.getScrollTop() - B
          var D = 0
          C > Ja ? (D = (Ja - C) / B, C = Ja) : C < 0 && (D = -C / B, C = 0), A *= 1 - D, ha.animateTo(C + 0.5 | 0, {
            easing: 'outCubic',
            duration: A
          })
      }
    }), a.scrollTo(0, 0), e.style.overflow = f.style.overflow = 'hidden'
  }
  let Y = function () {
    let a; let b; let c; let d; let f; let g; let h; let j; let k; let l; let m; let n = e.clientHeight
    let o = Ba()
    for (j = 0, k = ia.length; k > j; j++) { for (a = ia[j], b = a.element, c = a.anchorTarget, d = a.keyFrames, f = 0, g = d.length; g > f; f++) h = d[f], l = h.offset, m = o[h.constant] || 0, h.frame = l, h.isPercentage && (l *= n, h.frame = l), h.mode === 'relative' && (fa(b), h.frame = ha.relativeToAbsolute(c, h.anchors[0], h.anchors[1]) - l, fa(b, !0)), h.frame += m, la && !h.isEnd && h.frame > Ja && (Ja = h.frame) }
    for (Ja = i.max(Ja, Ca()), j = 0, k = ia.length; k > j; j++) {
      for (a = ia[j], d = a.keyFrames, f = 0, g = d.length; g > f; f++) h = d[f], m = o[h.constant] || 0, h.isEnd && (h.frame = Ja - h.offset + m)
      a.keyFrames.sort(Ia)
    }
  }
  let Z = function (a, b) {
    for (let c = 0, d = ia.length; d > c; c++) {
      var e; var f; let i = ia[c]
      let j = i.element
      let k = i.smoothScrolling ? a : b
      let l = i.keyFrames
      let m = l.length
      let n = l[0]
      let s = l[l.length - 1]
      let t = k < n.frame
      let u = k > s.frame
      let v = t ? n : s
      let w = i.emitEvents
      let x = i.lastFrameIndex
      if (t || u) {
        if (t && i.edge === -1 || u && i.edge === 1) continue
        switch (t ? (Ea(j, [p], [r, q]), w && x > -1 && (za(j, n.eventType, La), i.lastFrameIndex = -1)) : (Ea(j, [r], [p, q]), w && m > x && (za(j, s.eventType, La), i.lastFrameIndex = m)), i.edge = t ? -1 : 1, i.edgeStrategy) {
          case 'reset':
            fa(j)
            continue
          case 'ease':
            k = v.frame
            break
          default:
          case 'set':
            var y = v.props
            for (e in y) h.call(y, e) && (f = ea(y[e].value), e.indexOf('@') === 0 ? j.setAttribute(e.substr(1), f) : g.setStyle(j, e, f))
            continue
        }
      } else i.edge !== 0 && (Ea(j, [o, q], [p, r]), i.edge = 0)
      for (let z = 0; m - 1 > z; z++) {
        if (k >= l[z].frame && k <= l[z + 1].frame) {
          let A = l[z]
          let B = l[z + 1]
          for (e in A.props) {
            if (h.call(A.props, e)) {
              let C = (k - A.frame) / (B.frame - A.frame)
              C = A.props[e].easing(C), f = da(A.props[e].value, B.props[e].value, C), f = ea(f), e.indexOf('@') === 0 ? j.setAttribute(e.substr(1), f) : g.setStyle(j, e, f)
            }
          }
          w && x !== z && (La === 'down' ? za(j, A.eventType, La) : za(j, B.eventType, La), i.lastFrameIndex = z)
          break
        }
      }
    }
  }
  var $ = function () {
    Qa && (Qa = !1, Aa())
    let a; let b; let d = ha.getScrollTop()
    let e = Ha()
    if (oa) e >= oa.endTime ? (d = oa.targetTop, a = oa.done, oa = c) : (b = oa.easing((e - oa.startTime) / oa.duration), d = oa.startTop + b * oa.topDiff | 0), ha.setScrollTop(d, !0)
    else if (!sa) {
      let f = ra.targetTop - d
      f && (ra = {
        startTop: Ma,
        topDiff: d - Ma,
        targetTop: d,
        startTime: Na,
        endTime: Na + qa
      }), e <= ra.endTime && (b = W.sqrt((e - ra.startTime) / qa), d = ra.startTop + b * ra.topDiff | 0)
    }
    if (sa || Ma !== d) {
      La = d > Ma ? 'down' : Ma > d ? 'up' : La, sa = !1
      let h = {
        curTop: d,
        lastTop: Ma,
        maxTop: Ja,
        direction: La
      }
      let i = ka.beforerender && ka.beforerender.call(ha, h)
      i !== !1 && (Z(d, ha.getScrollTop()), Sa && ja && g.setStyle(ja, 'transform', 'translate(0, ' + -Ta + 'px) ' + ua), Ma = d, ka.render && ka.render.call(ha, h)), a && a.call(ha, !1)
    }
    Na = e
  }
  var _ = function (a) {
    for (let b = 0, c = a.keyFrames.length; c > b; b++) {
      for (var d, e, f, g, h = a.keyFrames[b], i = {}; (g = J.exec(h.props)) !== null;) {
        f = g[1], e = g[2], d = f.match(K), d !== null ? (f = d[1], d = d[2]) : d = w, e = e.indexOf('!') ? aa(e) : [e.slice(1)], i[f] = {
          value: e,
          easing: W[d]
        }
      }
      h.props = i
    }
  }
  var aa = function (a) {
    let b = []
    return P.lastIndex = 0, a = a.replace(P, function (a) {
      return a.replace(N, function (a) {
        return a / 255 * 100 + '%'
      })
    }), S && (Q.lastIndex = 0, a = a.replace(Q, function (a) {
      return S + a
    })), a = a.replace(N, function (a) {
      return b.push(+a), '{?}'
    }), b.unshift(a), b
  }
  var ba = function (a) {
    let b; let c; let d = {}
    for (b = 0, c = a.keyFrames.length; c > b; b++) ca(a.keyFrames[b], d)
    for (d = {}, b = a.keyFrames.length - 1; b >= 0; b--) ca(a.keyFrames[b], d)
  }
  var ca = function (a, b) {
    let c
    for (c in b) h.call(a.props, c) || (a.props[c] = b[c])
    for (c in a.props) b[c] = a.props[c]
  }
  var da = function (a, b, c) {
    let d; let e = a.length
    if (e !== b.length) throw "Can't interpolate between \"" + a[0] + '" and "' + b[0] + '"'
    let f = [a[0]]
    for (d = 1; e > d; d++) f[d] = a[d] + (b[d] - a[d]) * c
    return f
  }
  var ea = function (a) {
    let b = 1
    return O.lastIndex = 0, a[0].replace(O, function () {
      return a[b++]
    })
  }
  var fa = function (a, b) {
    a = [].concat(a)
    for (var c, d, e = 0, f = a.length; f > e; e++) d = a[e], c = ia[d[F]], c && (b ? (d.style.cssText = c.dirtyStyleAttr, Ea(d, c.dirtyClassAttr)) : (c.dirtyStyleAttr = d.style.cssText, c.dirtyClassAttr = Da(d), d.style.cssText = c.styleAttr, Ea(d, c.classAttr)))
  }
  var ga = function () {
    ua = 'translateZ(0)', g.setStyle(ja, 'transform', ua)
    let a = j(ja)
    let b = a.getPropertyValue('transform')
    let c = a.getPropertyValue(S + 'transform')
    let d = b && b !== 'none' || c && c !== 'none'
    d || (ua = '')
  }
  g.setStyle = function (a, b, c) {
    let d = a.style
    if (b = b.replace(L, M).replace('-', ''), b === 'zIndex') isNaN(c) ? d[b] = c : d[b] = '' + (0 | c)
    else if (b === 'float') d.styleFloat = d.cssFloat = c
    else {
      try {
        R && (d[R + b.slice(0, 1).toUpperCase() + b.slice(1)] = c), d[b] = c
      } catch (e) {}
    }
  }
  let ha; let ia; let ja; let ka; let la; let ma; let na; let oa; let pa; let qa; let ra; let sa; let ta; let ua; let va; var wa = g.addEvent = function (b, c, d) {
    let e = function (b) {
      return b = b || a.event, b.target || (b.target = b.srcElement), b.preventDefault || (b.preventDefault = function () {
        b.returnValue = !1, b.defaultPrevented = !0
      }), d.call(this, b)
    }
    c = c.split(' ')
    for (var f, g = 0, h = c.length; h > g; g++) {
      f = c[g], b.addEventListener ? b.addEventListener(f, d, !1) : b.attachEvent('on' + f, e), Ua.push({
        element: b,
        name: f,
        listener: d
      })
    }
  }
  let xa = g.removeEvent = function (a, b, c) {
    b = b.split(' ')
    for (let d = 0, e = b.length; e > d; d++) a.removeEventListener ? a.removeEventListener(b[d], c, !1) : a.detachEvent('on' + b[d], c)
  }
  var ya = function () {
    for (var a, b = 0, c = Ua.length; c > b; b++) a = Ua[b], xa(a.element, a.name, a.listener)
    Ua = []
  }
  var za = function (a, b, c) {
    ka.keyframe && ka.keyframe.call(ha, a, b, c)
  }
  var Aa = function () {
    let a = ha.getScrollTop()
    Ja = 0, la && !Sa && (f.style.height = ''), Y(), la && !Sa && (f.style.height = Ja + e.clientHeight + 'px'), Sa ? ha.setScrollTop(i.min(ha.getScrollTop(), Ja)) : ha.setScrollTop(a, !0), sa = !0
  }
  var Ba = function () {
    let a; let b; let c = e.clientHeight
    let d = {}
    for (a in ma) b = ma[a], typeof b === 'function' ? b = b.call(ha) : /p$/.test(b) && (b = b.slice(0, -1) / 100 * c), d[a] = b
    return d
  }
  var Ca = function () {
    let a; let b = 0
    return ja && (b = i.max(ja.offsetHeight, ja.scrollHeight)), a = i.max(b, f.scrollHeight, f.offsetHeight, e.scrollHeight, e.offsetHeight, e.clientHeight), a - e.clientHeight
  }
  var Da = function (b) {
    let c = 'className'
    return a.SVGElement && b instanceof a.SVGElement && (b = b[c], c = 'baseVal'), b[c]
  }
  var Ea = function (b, d, e) {
    let f = 'className'
    if (a.SVGElement && b instanceof a.SVGElement && (b = b[f], f = 'baseVal'), e === c) return void (b[f] = d)
    for (var g = b[f], h = 0, i = e.length; i > h; h++) g = Ga(g).replace(Ga(e[h]), ' ')
    g = Fa(g)
    for (let j = 0, k = d.length; k > j; j++) Ga(g).indexOf(Ga(d[j])) === -1 && (g += ' ' + d[j])
    b[f] = Fa(g)
  }
  var Fa = function (a) {
    return a.replace(H, '')
  }
  var Ga = function (a) {
    return ' ' + a + ' '
  }
  var Ha = Date.now || function () {
    return +new Date()
  }
  var Ia = function (a, b) {
    return a.frame - b.frame
  }
  var Ja = 0
  var Ka = 1
  var La = 'down'
  var Ma = -1
  var Na = Ha()
  var Oa = 0
  var Pa = 0
  var Qa = !1
  var Ra = 0
  var Sa = !1
  var Ta = 0
  var Ua = []
  typeof define === 'function' && define.amd
    ? define([], function () {
      return g
    })
    : typeof module !== 'undefined' && module.exports ? module.exports = g : a.skrollr = g
}(window, document))
