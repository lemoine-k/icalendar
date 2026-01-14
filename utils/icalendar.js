// RFC 5545 iCalendar 标准实现

/**
 * 生成 UID (唯一标识符)
 * RFC 5545 Section 3.8.4.7
 */
export function generateUID() {
  const timestamp = new Date().getTime();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}@icalendar-app`;
}

/**
 * 格式化日期为 iCalendar 格式
 * RFC 5545 Section 3.3.5 (DATE-TIME)
 * 格式: YYYYMMDDTHHMMSSZ
 */
export function formatICalDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * 格式化日期为 DATE 格式（仅日期，无时间）
 * RFC 5545 Section 3.3.4
 * 格式: YYYYMMDD
 */
export function formatICalDate(dateString) {
  const [year, month, day] = dateString.split('-');
  return `${year}${month}${day}`;
}

/**
 * 解析 iCalendar DATE 格式
 */
export function parseICalDate(icalDate) {
  const year = icalDate.substring(0, 4);
  const month = icalDate.substring(4, 6);
  const day = icalDate.substring(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * 解析时间字符串为 iCalendar DATE-TIME 格式
 * @param {string} dateString - 日期字符串 YYYY-MM-DD
 * @param {string} timeString - 时间字符串 HH:MM
 * @returns {string} - iCalendar DATE-TIME 格式
 */
export function formatICalDateTimeFromString(dateString, timeString) {
  const [year, month, day] = dateString.split('-');
  const [hours, minutes] = timeString ? timeString.split(':') : ['00', '00'];
  return `${year}${month}${day}T${hours.padStart(2, '0')}${minutes.padStart(2, '0')}00`;
}

/**
 * 解析 iCalendar DATE-TIME 为可读格式
 * @param {string} icalDateTime - iCalendar DATE-TIME 格式
 * @returns {object} - { date, time }
 */
export function parseICalDateTime(icalDateTime) {
  if (!icalDateTime) return { date: '', time: '' };
  
  // 移除 Z 后缀（如果有）
  const dt = icalDateTime.replace('Z', '');
  
  if (dt.includes('T')) {
    // DATE-TIME 格式
    const [datePart, timePart] = dt.split('T');
    const year = datePart.substring(0, 4);
    const month = datePart.substring(4, 6);
    const day = datePart.substring(6, 8);
    const hours = timePart.substring(0, 2);
    const minutes = timePart.substring(2, 4);
    
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    };
  } else {
    // DATE 格式（全天事件）
    const year = dt.substring(0, 4);
    const month = dt.substring(4, 6);
    const day = dt.substring(6, 8);
    
    return {
      date: `${year}-${month}-${day}`,
      time: ''
    };
  }
}

/**
 * 解析 iCalendar DATE-TIME 为 Date 对象
 * @param {string} icalDateTime - iCalendar DATE-TIME 格式
 * @returns {Date} - JavaScript Date 对象
 */
export function parseICalDateTimeToDate(icalDateTime) {
  if (!icalDateTime) return new Date();
  
  // 移除 Z 后缀（如果有）
  const dt = icalDateTime.replace('Z', '');
  
  if (dt.includes('T')) {
    // DATE-TIME 格式
    const [datePart, timePart] = dt.split('T');
    const year = parseInt(datePart.substring(0, 4));
    const month = parseInt(datePart.substring(4, 6)) - 1; // JavaScript 月份从 0 开始
    const day = parseInt(datePart.substring(6, 8));
    const hours = parseInt(timePart.substring(0, 2));
    const minutes = parseInt(timePart.substring(2, 4));
    const seconds = parseInt(timePart.substring(4, 6)) || 0;
    
    return new Date(year, month, day, hours, minutes, seconds);
  } else {
    // DATE 格式（全天事件）
    const year = parseInt(dt.substring(0, 4));
    const month = parseInt(dt.substring(4, 6)) - 1;
    const day = parseInt(dt.substring(6, 8));
    
    return new Date(year, month, day, 0, 0, 0);
  }
}

/**
 * 创建 VEVENT 对象
 * RFC 5545 Section 3.6.1
 */
export function createVEvent(params) {
  const {
    summary,        // 事件标题 (SUMMARY)
    dtstart,        // 开始日期时间 (DTSTART)
    dtend,          // 结束日期时间 (DTEND)
    description,    // 描述 (DESCRIPTION)
    location,       // 地点 (LOCATION)
    status,         // 状态 (STATUS): TENTATIVE, CONFIRMED, CANCELLED
    priority,       // 优先级 (PRIORITY): 0-9
    categories,     // 分类 (CATEGORIES)
    isAllDay,       // 是否全天事件
    rrule,          // 重复规则 (RRULE)
    alarms,         // 提醒列表 (VALARM)
  } = params;

  const now = new Date();
  
  return {
    uid: generateUID(),
    dtstamp: formatICalDateTime(now),      // 创建时间戳
    dtstart: dtstart,                       // 开始日期时间
    dtend: dtend || dtstart,                // 结束日期时间（默认同开始）
    summary: summary || '',                 // 标题
    description: description || '',         // 描述
    location: location || '',               // 地点
    status: status || 'CONFIRMED',          // 状态
    priority: priority || 0,                // 优先级
    categories: categories || [],           // 分类
    isAllDay: isAllDay || false,            // 是否全天
    rrule: rrule || '',                     // 重复规则
    alarms: alarms || [],                   // 提醒列表
    created: formatICalDateTime(now),       // 创建时间
    lastModified: formatICalDateTime(now),  // 最后修改时间
    sequence: 0,                            // 序列号（用于更新）
  };
}

/**
 * 更新 VEVENT
 * RFC 5545 Section 3.8.7.4 (SEQUENCE)
 */
export function updateVEvent(event, updates) {
  return {
    ...event,
    ...updates,
    lastModified: formatICalDateTime(new Date()),
    sequence: event.sequence + 1,
  };
}

/**
 * 导出为 iCalendar 格式字符串
 * RFC 5545 Section 3.4 (iCalendar Object)
 */
export function exportToICalendar(events) {
  let ical = 'BEGIN:VCALENDAR\r\n';
  ical += 'VERSION:2.0\r\n';
  ical += 'PRODID:-//iCalendar App//Calendar 1.0//CN\r\n';
  ical += 'CALSCALE:GREGORIAN\r\n';
  ical += 'METHOD:PUBLISH\r\n';
  
  events.forEach(event => {
    ical += 'BEGIN:VEVENT\r\n';
    ical += `UID:${event.uid}\r\n`;
    ical += `DTSTAMP:${event.dtstamp}\r\n`;
    
    // 根据是否全天事件选择格式
    if (event.isAllDay) {
      ical += `DTSTART;VALUE=DATE:${event.dtstart}\r\n`;
      if (event.dtend && event.dtend !== event.dtstart) {
        ical += `DTEND;VALUE=DATE:${event.dtend}\r\n`;
      }
    } else {
      ical += `DTSTART:${event.dtstart}\r\n`;
      if (event.dtend && event.dtend !== event.dtstart) {
        ical += `DTEND:${event.dtend}\r\n`;
      }
    }
    
    if (event.summary) {
      ical += `SUMMARY:${escapeICalText(event.summary)}\r\n`;
    }
    
    if (event.description) {
      ical += `DESCRIPTION:${escapeICalText(event.description)}\r\n`;
    }
    
    if (event.location) {
      ical += `LOCATION:${escapeICalText(event.location)}\r\n`;
    }
    
    ical += `STATUS:${event.status}\r\n`;
    ical += `PRIORITY:${event.priority}\r\n`;
    
    if (event.categories && event.categories.length > 0) {
      ical += `CATEGORIES:${event.categories.join(',')}\r\n`;
    }
    
    if (event.rrule) {
      ical += `RRULE:${event.rrule}\r\n`;
    }
    
    ical += `CREATED:${event.created}\r\n`;
    ical += `LAST-MODIFIED:${event.lastModified}\r\n`;
    ical += `SEQUENCE:${event.sequence}\r\n`;
    
    // 导出 VALARM
    if (event.alarms && event.alarms.length > 0) {
      event.alarms.forEach(alarm => {
        ical += 'BEGIN:VALARM\r\n';
        ical += `ACTION:${alarm.action}\r\n`;
        ical += `TRIGGER:${alarm.trigger}\r\n`;
        if (alarm.description) {
          ical += `DESCRIPTION:${escapeICalText(alarm.description)}\r\n`;
        }
        if (alarm.repeat && alarm.repeat > 0) {
          ical += `REPEAT:${alarm.repeat}\r\n`;
          ical += `DURATION:${alarm.duration}\r\n`;
        }
        ical += 'END:VALARM\r\n';
      });
    }
    
    ical += 'END:VEVENT\r\n';
  });
  
  ical += 'END:VCALENDAR\r\n';
  
  return ical;
}

/**
 * 转义 iCalendar 文本
 * RFC 5545 Section 3.3.11
 */
function escapeICalText(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * 解码 Quoted-Printable 编码
 * 支持UTF-8编码的多字节字符
 */
function decodeQuotedPrintable(text) {
  if (!text) return '';
  
  // 将Quoted-Printable编码的字节序列转换为UTF-8字符串
  const bytes = [];
  let i = 0;
  
  while (i < text.length) {
    if (text[i] === '=' && i + 2 < text.length) {
      const hex = text.substring(i + 1, i + 3);
      bytes.push(parseInt(hex, 16));
      i += 3;
    } else if (text[i] === '=') {
      // 软换行，忽略
      i += 1;
    } else {
      bytes.push(text.charCodeAt(i));
      i += 1;
    }
  }
  
  // 将字节数组转换为UTF-8字符串
  try {
    const uint8Array = new Uint8Array(bytes);
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(uint8Array);
  } catch (error) {
    // 如果解码失败，回退到简单解码
    return text.replace(/=([0-9A-Fa-f]{2})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
  }
}

/**
 * 反转义 iCalendar 文本
 */
function unescapeICalText(text) {
  if (!text) return '';
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * 解析 iCalendar 格式字符串
 * 支持 VEVENT 和 VALARM 解析
 */
export function parseICalendar(icalString) {
  const events = [];
  const lines = unfoldLines(icalString.split(/\r?\n/));
  let currentEvent = null;
  let currentAlarm = null;
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {
        alarms: [],
        categories: [],
        isAllDay: false,
        rrule: '',
        sequence: 0,
      };
    } else if (line === 'END:VEVENT' && currentEvent) {
      // 检测是否为全天事件
      if (currentEvent.dtstart && currentEvent.dtstart.length === 8) {
        currentEvent.isAllDay = true;
      }
      events.push(currentEvent);
      currentEvent = null;
    } else if (line === 'BEGIN:VALARM' && currentEvent) {
      currentAlarm = {};
    } else if (line === 'END:VALARM' && currentAlarm && currentEvent) {
      currentEvent.alarms.push(currentAlarm);
      currentAlarm = null;
    } else if (line.includes(':')) {
      const colonIndex = line.indexOf(':');
      const key = line.substring(0, colonIndex);
      const value = line.substring(colonIndex + 1);
      const [property, ...params] = key.split(';');
      
      // 检测编码参数
      const isQuotedPrintable = params.some(p => p.toUpperCase() === 'ENCODING=QUOTED-PRINTABLE');
      
      // 解码值
      let decodedValue = value;
      if (isQuotedPrintable) {
        decodedValue = decodeQuotedPrintable(value);
      }
      
      if (currentAlarm) {
        // 解析 VALARM 属性
        switch (property) {
          case 'ACTION':
            currentAlarm.action = decodedValue;
            break;
          case 'TRIGGER':
            currentAlarm.trigger = decodedValue;
            break;
          case 'DESCRIPTION':
            currentAlarm.description = unescapeICalText(decodedValue);
            break;
          case 'REPEAT':
            currentAlarm.repeat = parseInt(decodedValue, 10);
            break;
          case 'DURATION':
            currentAlarm.duration = decodedValue;
            break;
        }
      } else if (currentEvent) {
        // 解析 VEVENT 属性
        switch (property) {
          case 'UID':
            currentEvent.uid = decodedValue;
            break;
          case 'SUMMARY':
            currentEvent.summary = unescapeICalText(decodedValue);
            break;
          case 'DESCRIPTION':
            currentEvent.description = unescapeICalText(decodedValue);
            break;
          case 'DTSTART':
            currentEvent.dtstart = decodedValue.replace(/[TZ]/g, '');
            break;
          case 'DTEND':
            currentEvent.dtend = decodedValue.replace(/[TZ]/g, '');
            break;
          case 'LOCATION':
            currentEvent.location = unescapeICalText(decodedValue);
            break;
          case 'STATUS':
            currentEvent.status = decodedValue;
            break;
          case 'PRIORITY':
            currentEvent.priority = parseInt(decodedValue, 10) || 0;
            break;
          case 'CATEGORIES':
            currentEvent.categories = decodedValue.split(',').map(c => c.trim());
            break;
          case 'RRULE':
            currentEvent.rrule = decodedValue;
            break;
          case 'DTSTAMP':
            currentEvent.dtstamp = decodedValue;
            break;
          case 'CREATED':
            currentEvent.created = decodedValue;
            break;
          case 'LAST-MODIFIED':
            currentEvent.lastModified = decodedValue;
            break;
          case 'SEQUENCE':
            currentEvent.sequence = parseInt(decodedValue, 10) || 0;
            break;
        }
      }
    }
  }
  
  return events;
}

/**
 * 展开折叠的行
 * RFC 5545 Section 3.1 (Content Lines)
 */
function unfoldLines(lines) {
  const unfolded = [];
  let currentLine = '';
  
  for (let line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      // 续行
      currentLine += line.substring(1);
    } else {
      if (currentLine) {
        unfolded.push(currentLine);
      }
      currentLine = line;
    }
  }
  
  if (currentLine) {
    unfolded.push(currentLine);
  }
  
  return unfolded;
}

/**
 * 事件状态常量
 * RFC 5545 Section 3.8.1.11
 */
export const EVENT_STATUS = {
  TENTATIVE: 'TENTATIVE',   // 暂定
  CONFIRMED: 'CONFIRMED',   // 已确认
  CANCELLED: 'CANCELLED',   // 已取消
};

/**
 * 优先级常量
 * RFC 5545 Section 3.8.1.9
 * 0 = 未定义
 * 1 = 最高
 * 5 = 中等
 * 9 = 最低
 */
export const PRIORITY = {
  UNDEFINED: 0,
  HIGHEST: 1,
  HIGH: 2,
  MEDIUM: 5,
  LOW: 8,
  LOWEST: 9,
};

/**
 * 重复频率常量
 * RFC 5545 Section 3.3.10 (Recurrence Rule)
 */
export const FREQ = {
  DAILY: 'DAILY',       // 每天
  WEEKLY: 'WEEKLY',     // 每周
  MONTHLY: 'MONTHLY',   // 每月
  YEARLY: 'YEARLY',     // 每年
};

/**
 * 星期常量
 */
export const WEEKDAY = {
  SU: 'SU',  // 星期日
  MO: 'MO',  // 星期一
  TU: 'TU',  // 星期二
  WE: 'WE',  // 星期三
  TH: 'TH',  // 星期四
  FR: 'FR',  // 星期五
  SA: 'SA',  // 星期六
};

/**
 * 构建 RRULE 字符串
 * RFC 5545 Section 3.8.5.3
 * @param {object} params - RRULE 参数
 * @returns {string} - RRULE 字符串
 */
export function buildRRule(params) {
  const {
    freq,       // 频率: DAILY, WEEKLY, MONTHLY, YEARLY
    interval,   // 间隔: 1, 2, 3...
    count,      // 重复次数
    until,      // 结束日期
    byday,      // 星期几: MO, TU, WE, TH, FR, SA, SU
    bymonthday, // 每月第几天: 1-31
  } = params;

  if (!freq) return '';

  const parts = [`FREQ=${freq}`];
  
  if (interval && interval > 1) {
    parts.push(`INTERVAL=${interval}`);
  }
  
  if (count) {
    parts.push(`COUNT=${count}`);
  } else if (until) {
    parts.push(`UNTIL=${until}`);
  }
  
  if (byday && byday.length > 0) {
    parts.push(`BYDAY=${Array.isArray(byday) ? byday.join(',') : byday}`);
  }
  
  if (bymonthday) {
    parts.push(`BYMONTHDAY=${bymonthday}`);
  }
  
  return parts.join(';');
}

/**
 * 解析 RRULE 字符串
 * @param {string} rrule - RRULE 字符串
 * @returns {object} - 解析后的对象
 */
export function parseRRule(rrule) {
  if (!rrule) return null;
  
  const parts = rrule.split(';');
  const result = {};
  
  parts.forEach(part => {
    const [key, value] = part.split('=');
    switch (key) {
      case 'FREQ':
        result.freq = value;
        break;
      case 'INTERVAL':
        result.interval = parseInt(value, 10);
        break;
      case 'COUNT':
        result.count = parseInt(value, 10);
        break;
      case 'UNTIL':
        result.until = value;
        break;
      case 'BYDAY':
        result.byday = value.split(',');
        break;
      case 'BYMONTHDAY':
        result.bymonthday = parseInt(value, 10);
        break;
    }
  });
  
  return result;
}

/**
 * 获取 RRULE 的可读描述
 * @param {string} rrule - RRULE 字符串
 * @returns {string} - 可读描述
 */
export function getRRuleDescription(rrule) {
  if (!rrule) return '不重复';
  
  const parsed = parseRRule(rrule);
  if (!parsed) return '不重复';
  
  const freqMap = {
    DAILY: '每天',
    WEEKLY: '每周',
    MONTHLY: '每月',
    YEARLY: '每年',
  };
  
  const weekdayMap = {
    MO: '周一',
    TU: '周二',
    WE: '周三',
    TH: '周四',
    FR: '周五',
    SA: '周六',
    SU: '周日',
  };
  
  let desc = freqMap[parsed.freq] || parsed.freq;
  
  if (parsed.interval && parsed.interval > 1) {
    desc = `每${parsed.interval}${freqMap[parsed.freq]?.replace('每', '') || ''}`;
  }
  
  if (parsed.byday && parsed.byday.length > 0) {
    const days = parsed.byday.map(d => weekdayMap[d] || d).join('、');
    desc += ` (${days})`;
  }
  
  if (parsed.count) {
    desc += `，共${parsed.count}次`;
  } else if (parsed.until) {
    const { date } = parseICalDateTime(parsed.until);
    desc += `，直到${date}`;
  }
  
  return desc;
}

/**
 * 提醒时间常量
 * RFC 5545 Section 3.6.6 (Alarm Component)
 */
export const ALARM_TRIGGER = {
  AT_TIME: 'PT0M',           // 准时
  MINUTES_5: '-PT5M',        // 提前5分钟
  MINUTES_15: '-PT15M',      // 提前15分钟
  MINUTES_30: '-PT30M',      // 提前30分钟
  HOURS_1: '-PT1H',          // 提前1小时
  HOURS_2: '-PT2H',          // 提前2小时
  DAYS_1: '-P1D',            // 提前1天
  DAYS_2: '-P2D',            // 提前2天
  WEEK_1: '-P1W',            // 提前1周
};

/**
 * 提醒动作常量
 */
export const ALARM_ACTION = {
  DISPLAY: 'DISPLAY',        // 显示提醒
  AUDIO: 'AUDIO',            // 声音提醒
  EMAIL: 'EMAIL',            // 邮件提醒
};

/**
 * 创建 VALARM 对象
 * RFC 5545 Section 3.6.6
 * @param {object} params - 提醒参数
 * @returns {object} - VALARM 对象
 */
export function createVAlarm(params) {
  const {
    action,         // 动作: DISPLAY, AUDIO, EMAIL
    trigger,        // 触发时间: -PT15M (提前15分钟)
    description,    // 描述
    repeat,         // 重复次数
    duration,       // 重复间隔
  } = params;
  
  return {
    action: action || ALARM_ACTION.DISPLAY,
    trigger: trigger || ALARM_TRIGGER.MINUTES_15,
    description: description || '',
    repeat: repeat || 0,
    duration: duration || '',
  };
}

/**
 * 获取提醒的可读描述
 * @param {string} trigger - 触发时间字符串
 * @returns {string} - 可读描述
 */
export function getAlarmDescription(trigger) {
  const triggerMap = {
    'PT0M': '准时',
    '-PT5M': '提前5分钟',
    '-PT15M': '提前15分钟',
    '-PT30M': '提前30分钟',
    '-PT1H': '提前1小时',
    '-PT2H': '提前2小时',
    '-P1D': '提前1天',
    '-P2D': '提前2天',
    '-P1W': '提前1周',
  };
  
  // 如果在预设映射中找到，直接返回
  if (triggerMap[trigger]) {
    return triggerMap[trigger];
  }
  
  // 尝试解析自定义时间格式
  const match = trigger.match(/^-?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
  if (match) {
    const [, weeks, days, hours, minutes] = match;
    const parts = [];
    
    if (weeks) parts.push(`${weeks}周`);
    if (days) parts.push(`${days}天`);
    if (hours) parts.push(`${hours}小时`);
    if (minutes) parts.push(`${minutes}分钟`);
    
    if (parts.length > 0) {
      return `提前${parts.join('')}`;
    }
  }
  
  return trigger;
}

/**
 * 解析提醒触发时间为分钟数
 * @param {string} trigger - 触发时间字符串
 * @returns {number} - 提前的分钟数（负数表示提前）
 */
export function parseTriggerToMinutes(trigger) {
  if (trigger === 'PT0M') return 0;
  
  const match = trigger.match(/^-?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
  if (!match) return 0;
  
  const [, weeks, days, hours, minutes] = match;
  let totalMinutes = 0;
  
  if (weeks) totalMinutes += parseInt(weeks) * 7 * 24 * 60;
  if (days) totalMinutes += parseInt(days) * 24 * 60;
  if (hours) totalMinutes += parseInt(hours) * 60;
  if (minutes) totalMinutes += parseInt(minutes);
  
  return trigger.startsWith('-') ? -totalMinutes : totalMinutes;
}
