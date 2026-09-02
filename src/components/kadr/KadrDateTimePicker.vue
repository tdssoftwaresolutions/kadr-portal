<template>
  <div class="kadr-datetime-field" :class="{ 'is-time-only': mode === 'time', 'is-date-only': mode === 'date' }">
    <div class="kadr-datetime-input-wrap">
      <i
        class="kadr-datetime-icon"
        :class="mode === 'time' ? 'ri-time-line' : 'ri-calendar-schedule-line'"
        aria-hidden="true"
      ></i>
      <flat-pickr
        :key="pickerKey"
        v-model="innerValue"
        :config="mergedConfig"
        :placeholder="placeholder"
        class="form-control kadr-datetime-picker"
        @on-change="onChange"
      />
    </div>
    <small v-if="showTimezoneHint" class="kadr-datetime-hint">
      Times in {{ timezoneHint }}
    </small>
  </div>
</template>

<script>
import flatPickr from 'vue-flatpickr-component'
import 'flatpickr/dist/flatpickr.css'
import { getEffectiveTimezone } from '../../utils/timezone'

const DEFAULT_CONFIG = {
  enableTime: true,
  time_24hr: false,
  minuteIncrement: 15,
  dateFormat: 'Y-m-d H:i',
  altInput: true,
  altFormat: 'M j, Y · h:i K',
  allowInput: false,
  disableMobile: true,
  animate: true
}

export default {
  name: 'KadrDateTimePicker',
  components: { flatPickr },
  props: {
    modelValue: {
      type: [String, Date, Number],
      default: null
    },
    placeholder: {
      type: String,
      default: 'Select date and time'
    },
    minDate: {
      type: [String, Date],
      default: 'today'
    },
    maxDate: {
      type: [String, Date],
      default: null
    },
    config: {
      type: Object,
      default: () => ({})
    },
    mode: {
      type: String,
      default: 'datetime',
      validator: (v) => ['date', 'datetime', 'time'].includes(v)
    },
    showTimezoneHint: {
      type: Boolean,
      default: true
    },
    /** Force remount when prefilled date/mode changes */
    pickerKey: {
      type: [String, Number],
      default: 'default'
    }
  },
  data () {
    return {
      innerValue: this.modelValue || null
    }
  },
  computed: {
    timezoneHint () {
      return getEffectiveTimezone()
    },
    mergedConfig () {
      const modeConfig = {}
      if (this.mode === 'date') {
        modeConfig.enableTime = false
        modeConfig.dateFormat = 'Y-m-d'
        modeConfig.altFormat = 'M j, Y'
      } else if (this.mode === 'time') {
        modeConfig.enableTime = true
        modeConfig.noCalendar = true
        modeConfig.time_24hr = false
        modeConfig.dateFormat = 'H:i'
        modeConfig.altFormat = 'h:i K'
        modeConfig.static = false
      } else {
        modeConfig.enableTime = true
        modeConfig.time_24hr = false
        modeConfig.dateFormat = 'Y-m-d H:i'
        modeConfig.altFormat = 'M j, Y · h:i K'
      }

      const cfg = {
        ...DEFAULT_CONFIG,
        ...modeConfig,
        ...this.config,
        // 12-hour clock with AM/PM (stored value remains 24h via dateFormat)
        time_24hr: false
      }
      if (this.minDate != null && this.minDate !== '') {
        cfg.minDate = this.minDate
      }
      if (this.maxDate != null && this.maxDate !== '') {
        cfg.maxDate = this.maxDate
      }
      return cfg
    }
  },
  emits: ['update:modelValue'],
  watch: {
    modelValue (next) {
      if (next !== this.innerValue) {
        this.innerValue = next || null
      }
    },
    innerValue (next) {
      this.$emit('update:modelValue', next || '')
    }
  },
  methods: {
    onChange (selectedDates, dateStr) {
      this.$emit('change', dateStr, selectedDates)
    }
  }
}

function pad2 (n) {
  return String(n).padStart(2, '0')
}

/** Round a Date up to the next minute increment (default 15). */
export function roundUpToMinuteIncrement (date, increment = 15) {
  const d = new Date(date.getTime())
  d.setSeconds(0, 0)
  const minutes = d.getMinutes()
  const rem = minutes % increment
  if (rem !== 0) {
    d.setMinutes(minutes + (increment - rem))
  } else if (d.getTime() <= date.getTime()) {
    // Exactly on a boundary but not strictly in the future — bump one step
    d.setMinutes(minutes + increment)
  }
  return d
}

export function startOfLocalDay (date = new Date()) {
  const d = new Date(date.getTime())
  d.setHours(0, 0, 0, 0)
  return d
}

export function toYmd (date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function toHm (date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** True when Y-m-d is before today's local date. */
export function isCalendarDateBeforeToday (ymd) {
  if (!ymd) return true
  const day = new Date(`${ymd}T00:00:00`)
  if (Number.isNaN(day.getTime())) return true
  return day < startOfLocalDay()
}

/**
 * Format a FullCalendar dateClick / select payload into picker value `Y-m-d H:i`.
 */
export function calendarClickToDateTime (info, defaultHour = 10) {
  const parts = calendarClickToDateParts(info, defaultHour)
  if (!parts.date) return ''
  return `${parts.date} ${parts.time}`
}

/**
 * Split a FullCalendar click into `{ date: 'Y-m-d', time: 'H:i' }`.
 * All-day clicks on today default to the next available slot from now.
 */
export function calendarClickToDateParts (info, defaultHour = 10) {
  const empty = { date: '', time: '' }
  if (!info) return empty

  let date = null
  if (info.start instanceof Date) date = new Date(info.start)
  else if (info.date instanceof Date) date = new Date(info.date)
  else if (info.startStr) date = new Date(info.startStr)
  else if (info.dateStr) date = new Date(info.dateStr)
  if (!date || Number.isNaN(date.getTime())) return empty

  const allDay = info.allDay === true ||
    (typeof info.startStr === 'string' && info.startStr.length <= 10) ||
    (typeof info.dateStr === 'string' && info.dateStr.length <= 10)

  const now = new Date()
  const isToday = toYmd(date) === toYmd(now)

  if (allDay) {
    if (isToday) {
      const next = roundUpToMinuteIncrement(now, 15)
      date.setHours(next.getHours(), next.getMinutes(), 0, 0)
    } else {
      date.setHours(defaultHour, 0, 0, 0)
    }
  } else if (date.getTime() < now.getTime()) {
    // Timed slot already in the past (e.g. week view) — bump to next slot
    const next = roundUpToMinuteIncrement(now, 15)
    date.setHours(next.getHours(), next.getMinutes(), 0, 0)
  }

  return {
    date: toYmd(date),
    time: toHm(date)
  }
}

export function formatDisplayDate (ymd) {
  if (!ymd) return ''
  const d = new Date(`${ymd}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ymd
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<style>
.kadr-datetime-field {
  width: 100%;
}

.kadr-datetime-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.kadr-datetime-icon {
  position: absolute;
  left: 14px;
  z-index: 2;
  font-size: 1.15rem;
  color: var(--kadr-text-muted, #6d7693);
  pointer-events: none;
}

.kadr-datetime-picker.form-control,
.kadr-datetime-input-wrap .flatpickr-input.form-control,
.kadr-datetime-input-wrap input.flatpickr-input,
.kadr-datetime-input-wrap .flatpickr-input.form-control.input {
  min-height: 48px;
  padding: 0.65rem 1rem 0.65rem 2.65rem !important;
  border: 1px solid var(--kadr-border-strong, #d8deef);
  border-radius: 10px;
  background: var(--kadr-bg-surface, #fff);
  color: var(--kadr-text-primary, #374948);
  font-size: 0.95rem;
  font-weight: 500;
  box-shadow: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.kadr-datetime-input-wrap .flatpickr-input.form-control:hover,
.kadr-datetime-input-wrap input.flatpickr-input:hover {
  border-color: var(--kadr-primary, #0084ff);
}

.kadr-datetime-input-wrap .flatpickr-input.form-control:focus,
.kadr-datetime-input-wrap input.flatpickr-input:focus {
  border-color: var(--kadr-primary, #0084ff);
  box-shadow: 0 0 0 3px rgba(0, 132, 255, 0.15);
  outline: none;
}

.kadr-datetime-hint {
  display: block;
  margin-top: 0.4rem;
  font-size: 0.78rem;
  color: var(--kadr-text-muted, #6d7693);
}

.flatpickr-calendar {
  box-shadow: 0 12px 32px rgba(35, 55, 110, 0.16);
  border: 1px solid var(--kadr-border, #e8ebf5);
  border-radius: 14px;
  font-family: inherit;
  z-index: 1100 !important;
  overflow: hidden;
  padding: 0.35rem 0 0.5rem;
}

.flatpickr-calendar.noCalendar {
  width: 260px !important;
  min-width: 260px !important;
  overflow: visible;
  padding: 0.5rem;
}

.flatpickr-calendar.noCalendar.hasTime .flatpickr-time {
  height: 52px !important;
  max-height: 52px !important;
  border-top: none;
}

.flatpickr-months {
  padding: 0.35rem 0.25rem 0;
}

.flatpickr-months .flatpickr-month {
  background: transparent;
  color: var(--kadr-text-primary, #374948);
  fill: var(--kadr-text-primary, #374948);
  height: 40px;
}

.flatpickr-current-month {
  font-size: 0.95rem;
  font-weight: 600;
  padding-top: 0.45rem;
}

.flatpickr-months .flatpickr-prev-month,
.flatpickr-months .flatpickr-next-month {
  fill: var(--kadr-text-secondary, #777d74);
  padding: 0.55rem;
  border-radius: 8px;
}

.flatpickr-months .flatpickr-prev-month:hover,
.flatpickr-months .flatpickr-next-month:hover {
  background: var(--kadr-surface-muted, #f8faff);
  fill: var(--kadr-primary, #0084ff);
}

.flatpickr-weekdays {
  background: transparent;
}

span.flatpickr-weekday {
  color: var(--kadr-text-muted, #6d7693);
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.flatpickr-day {
  border-radius: 9px;
  color: var(--kadr-text-primary, #374948);
  font-weight: 500;
  max-width: 38px;
  height: 38px;
  line-height: 38px;
  margin: 1px;
}

.flatpickr-day:hover,
.flatpickr-day:focus {
  background: var(--kadr-surface-muted, #f8faff);
  border-color: transparent;
}

.flatpickr-day.today {
  border-color: var(--kadr-primary, #0084ff);
  color: var(--kadr-primary, #0084ff);
  font-weight: 700;
}

.flatpickr-day.selected,
.flatpickr-day.startRange,
.flatpickr-day.endRange,
.flatpickr-day.selected:hover,
.flatpickr-day.startRange:hover,
.flatpickr-day.endRange:hover {
  background: var(--kadr-primary, #0084ff);
  border-color: var(--kadr-primary, #0084ff);
  color: #fff;
  box-shadow: 0 4px 10px rgba(0, 132, 255, 0.28);
}

.flatpickr-day.flatpickr-disabled,
.flatpickr-day.prevMonthDay,
.flatpickr-day.nextMonthDay {
  color: #b8c0d4;
}

/* ---- Time picker (reset global overrides that break flatpickr layout) ---- */
.flatpickr-calendar .flatpickr-time {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0;
  height: 48px !important;
  max-height: 48px !important;
  line-height: 48px !important;
  overflow: hidden;
  border-top: 1px solid var(--kadr-border, #e8ebf5);
  box-sizing: border-box;
}

.flatpickr-calendar .flatpickr-time .numInputWrapper {
  position: relative !important;
  display: block !important;
  float: none !important;
  flex: 1 1 auto !important;
  width: 38% !important;
  height: 40px !important;
  margin: 0 2px;
  border-radius: 8px;
  background: var(--kadr-surface-muted, #f8faff);
}

.flatpickr-calendar .flatpickr-time .numInputWrapper:hover {
  background: #eef4ff;
}

.flatpickr-calendar .flatpickr-time input.numInput,
.flatpickr-calendar .flatpickr-time input.flatpickr-hour,
.flatpickr-calendar .flatpickr-time input.flatpickr-minute,
.flatpickr-calendar .flatpickr-time input.flatpickr-second {
  display: block !important;
  position: relative !important;
  width: 100% !important;
  height: 40px !important;
  line-height: 40px !important;
  margin: 0 !important;
  padding: 0 16px 0 0 !important;
  border: 0 !important;
  border-radius: 8px !important;
  background: transparent !important;
  box-shadow: none !important;
  text-align: center !important;
  font-size: 1.05rem !important;
  font-weight: 650 !important;
  color: var(--kadr-text-primary, #374948) !important;
  -moz-appearance: textfield !important;
  appearance: textfield !important;
}

.flatpickr-calendar .flatpickr-time input.numInput::-webkit-outer-spin-button,
.flatpickr-calendar .flatpickr-time input.numInput::-webkit-inner-spin-button,
.flatpickr-calendar .flatpickr-time input.flatpickr-hour::-webkit-outer-spin-button,
.flatpickr-calendar .flatpickr-time input.flatpickr-hour::-webkit-inner-spin-button,
.flatpickr-calendar .flatpickr-time input.flatpickr-minute::-webkit-outer-spin-button,
.flatpickr-calendar .flatpickr-time input.flatpickr-minute::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
  display: none !important;
}

/* Keep flatpickr's own up/down chevrons on the right of each field */
.flatpickr-calendar .flatpickr-time .numInputWrapper span.arrowUp,
.flatpickr-calendar .flatpickr-time .numInputWrapper span.arrowDown {
  position: absolute !important;
  display: block !important;
  right: 2px !important;
  left: auto !important;
  width: 16px !important;
  height: 50% !important;
  padding: 0 !important;
  margin: 0 !important;
  opacity: 0;
  border: none !important;
  background: transparent !important;
  box-sizing: border-box !important;
  cursor: pointer;
  z-index: 2;
}

.flatpickr-calendar .flatpickr-time .numInputWrapper span.arrowUp {
  top: 0 !important;
}

.flatpickr-calendar .flatpickr-time .numInputWrapper span.arrowDown {
  top: 50% !important;
}

.flatpickr-calendar .flatpickr-time .numInputWrapper:hover span.arrowUp,
.flatpickr-calendar .flatpickr-time .numInputWrapper:hover span.arrowDown {
  opacity: 1;
}

.flatpickr-calendar .flatpickr-time .numInputWrapper span.arrowUp:after,
.flatpickr-calendar .flatpickr-time .numInputWrapper span.arrowDown:after {
  display: block !important;
  content: "" !important;
  position: absolute !important;
  left: 50% !important;
  transform: translateX(-50%);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
}

.flatpickr-calendar .flatpickr-time .numInputWrapper span.arrowUp:after {
  top: 35% !important;
  border-bottom: 5px solid var(--kadr-text-secondary, #777d74);
  border-top: 0 !important;
}

.flatpickr-calendar .flatpickr-time .numInputWrapper span.arrowDown:after {
  top: 30% !important;
  border-top: 5px solid var(--kadr-text-secondary, #777d74);
  border-bottom: 0 !important;
}

.flatpickr-calendar .flatpickr-time .flatpickr-time-separator {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex: 0 0 12px !important;
  width: 12px !important;
  height: 40px !important;
  float: none !important;
  align-self: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--kadr-text-secondary, #777d74);
  line-height: 1 !important;
  user-select: none;
}

.flatpickr-calendar .flatpickr-time .flatpickr-am-pm {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex: 0 0 48px !important;
  width: 48px !important;
  min-width: 48px !important;
  height: 40px !important;
  margin-left: 6px;
  float: none !important;
  border-radius: 8px;
  background: rgba(0, 132, 255, 0.08);
  color: var(--kadr-primary, #0084ff) !important;
  font-size: 0.85rem !important;
  font-weight: 700 !important;
  line-height: 1 !important;
  cursor: pointer;
  user-select: none;
  pointer-events: auto !important;
}

.flatpickr-calendar .flatpickr-time .flatpickr-am-pm:hover,
.flatpickr-calendar .flatpickr-time .flatpickr-am-pm:focus {
  background: rgba(0, 132, 255, 0.16);
}
</style>
