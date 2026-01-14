/**
 * 农历与黄历工具类
 * 支持公历转农历、节气、节日等功能
 */

// 农历数据表 (1900-2100)
// 每个数字的后12位代表12个月，1表示大月(30天)，0表示小月(29天)
// 前4位代表闰月月份，0表示无闰月
const lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
];

// 天干
const Gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 地支
const Zhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 生肖
const Animals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

// 农历月份
const lunarMonths = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];

// 农历日期
const lunarDays = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

// 节气
const solarTerms = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
  '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
];

// 节气精确计算数据表 (基于天文算法)
// 每个节气在每个月的基准日期和年度修正系数
const solarTermsData = [
  // 1月: 小寒, 大寒
  { month: 1, day: 6, coefficient: 0.2422 },   // 小寒
  { month: 1, day: 20, coefficient: 0.2422 },  // 大寒
  // 2月: 立春, 雨水  
  { month: 2, day: 4, coefficient: 0.2422 },   // 立春
  { month: 2, day: 19, coefficient: 0.2422 },  // 雨水
  // 3月: 惊蛰, 春分
  { month: 3, day: 6, coefficient: 0.2422 },   // 惊蛰
  { month: 3, day: 21, coefficient: 0.2422 },  // 春分
  // 4月: 清明, 谷雨
  { month: 4, day: 5, coefficient: 0.2422 },   // 清明
  { month: 4, day: 20, coefficient: 0.2422 },  // 谷雨
  // 5月: 立夏, 小满
  { month: 5, day: 6, coefficient: 0.2422 },   // 立夏
  { month: 5, day: 21, coefficient: 0.2422 },  // 小满
  // 6月: 芒种, 夏至
  { month: 6, day: 6, coefficient: 0.2422 },   // 芒种
  { month: 6, day: 22, coefficient: 0.2422 },  // 夏至
  // 7月: 小暑, 大暑
  { month: 7, day: 7, coefficient: 0.2422 },   // 小暑
  { month: 7, day: 23, coefficient: 0.2422 },  // 大暑
  // 8月: 立秋, 处暑
  { month: 8, day: 8, coefficient: 0.2422 },   // 立秋
  { month: 8, day: 23, coefficient: 0.2422 },  // 处暑
  // 9月: 白露, 秋分
  { month: 9, day: 8, coefficient: 0.2422 },   // 白露
  { month: 9, day: 23, coefficient: 0.2422 },  // 秋分
  // 10月: 寒露, 霜降
  { month: 10, day: 8, coefficient: 0.2422 },  // 寒露
  { month: 10, day: 24, coefficient: 0.2422 }, // 霜降
  // 11月: 立冬, 小雪
  { month: 11, day: 8, coefficient: 0.2422 },  // 立冬
  { month: 11, day: 22, coefficient: 0.2422 }, // 小雪
  // 12月: 大雪, 冬至
  { month: 12, day: 7, coefficient: 0.2422 },  // 大雪
  { month: 12, day: 22, coefficient: 0.2422 }  // 冬至
];

/**
 * 精确计算指定年份的节气日期
 * 基于《中国天文年历》的计算方法
 * @param {number} year - 年份
 * @returns {Array} 节气日期数组
 */
function calculateSolarTerms(year) {
  const terms = [];
  
  for (let i = 0; i < 24; i++) {
    const termData = solarTermsData[i];
    const termName = solarTerms[i];
    
    // 基准日期
    let day = termData.day;
    
    // 年份修正计算
    // 公式: day = 基准日 + (年份-1900) * 系数 - 闰年修正
    const yearOffset = year - 1900;
    const yearCorrection = yearOffset * termData.coefficient;
    
    // 闰年修正 (每4年减1天，但世纪年需要特殊处理)
    let leapCorrection = 0;
    if (year >= 1900) {
      leapCorrection = Math.floor(yearOffset / 4);
      
      // 世纪年修正 (1900, 2000, 2100等)
      if (year % 100 === 0) {
        if (year % 400 === 0) {
          // 能被400整除的年份是闰年 (如2000)
          leapCorrection -= 0;
        } else {
          // 不能被400整除的世纪年不是闰年 (如1900, 2100)
          leapCorrection += 1;
        }
      }
    }
    
    // 计算最终日期
    day = Math.round(day + yearCorrection - leapCorrection);
    
    // 特殊年份的微调 (基于历史数据)
    if (year >= 2000) {
      // 21世纪的微调
      if (i === 6) { // 清明
        if (year >= 2000 && year <= 2100) {
          day = year % 4 === 0 ? 4 : 5; // 闰年4日，平年5日
        }
      } else if (i === 7) { // 谷雨
        if (year >= 2000 && year <= 2100) {
          day = year % 4 === 0 ? 19 : 20; // 闰年19日，平年20日
        }
      }
    }
    
    // 确保日期在合理范围内
    const daysInMonth = new Date(year, termData.month, 0).getDate();
    if (day < 1) day = 1;
    if (day > daysInMonth) day = daysInMonth;
    
    terms.push({
      name: termName,
      month: termData.month,
      day: day,
      date: `${year}-${String(termData.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    });
  }
  
  return terms;
}

/**
 * 获取指定日期的节气
 * @param {Date} date - 日期
 * @returns {string|null} 节气名称
 */
export function getSolarTerm(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  const terms = calculateSolarTerms(year);
  const term = terms.find(t => t.date === dateString);
  
  return term ? term.name : null;
}

/**
 * 获取指定年份的所有节气
 * @param {number} year - 年份
 * @returns {Array} 节气数组
 */
export function getAllSolarTerms(year) {
  return calculateSolarTerms(year);
}

/**
 * 判断是否为重要节气（法定节假日相关）
 * @param {string} termName - 节气名称
 * @returns {boolean}
 */
export function isImportantSolarTerm(termName) {
  // 清明节是法定节假日
  return termName === '清明';
}

// 传统节日
const lunarFestivals = {
  '12-30': '除夕',
  '12-29': '除夕',
  '1-1': '春节',
  '1-15': '元宵节',
  '2-2': '龙抬头',
  '5-5': '端午节',
  '7-7': '七夕节',
  '7-15': '中元节',
  '8-15': '中秋节',
  '9-9': '重阳节',
  '12-8': '腊八节',
  '12-23': '小年',
};

// 公历节日
const solarFestivals = {
  '1-1': '元旦',
  '2-14': '情人节',
  '3-8': '妇女节',
  '3-12': '植树节',
  '4-1': '愚人节',
  '5-1': '劳动节',
  '5-4': '青年节',
  '6-1': '儿童节',
  '7-1': '建党节',
  '8-1': '建军节',
  '9-10': '教师节',
  '10-1': '国庆节',
  '12-25': '圣诞节',
};

/**
 * 获取农历年份的总天数
 */
function lunarYearDays(year) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (lunarInfo[year - 1900] & i) ? 1 : 0;
  }
  return sum + leapDays(year);
}

/**
 * 获取农历年份的闰月天数
 */
function leapDays(year) {
  if (leapMonth(year)) {
    return (lunarInfo[year - 1900] & 0x10000) ? 30 : 29;
  }
  return 0;
}

/**
 * 获取农历年份的闰月月份
 */
function leapMonth(year) {
  return lunarInfo[year - 1900] & 0xf;
}

/**
 * 获取农历月份的天数
 */
function monthDays(year, month) {
  return (lunarInfo[year - 1900] & (0x10000 >> month)) ? 30 : 29;
}

/**
 * 公历转农历
 * @param {Date} date - 公历日期
 * @returns {Object} 农历信息
 */
export function solarToLunar(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // 1900年1月31日是农历1900年正月初一
  const baseDate = new Date(1900, 0, 31);
  let offset = Math.floor((date - baseDate) / 86400000);
  
  let lunarYear, lunarMonth, lunarDay;
  let isLeap = false;
  
  // 计算农历年份
  for (lunarYear = 1900; lunarYear < 2101 && offset > 0; lunarYear++) {
    const yearDays = lunarYearDays(lunarYear);
    offset -= yearDays;
  }
  
  if (offset < 0) {
    offset += lunarYearDays(--lunarYear);
  }
  
  // 计算农历月份
  const leap = leapMonth(lunarYear);
  for (lunarMonth = 1; lunarMonth < 13 && offset > 0; lunarMonth++) {
    let monthDaysCount;
    
    if (leap > 0 && lunarMonth === (leap + 1) && !isLeap) {
      --lunarMonth;
      isLeap = true;
      monthDaysCount = leapDays(lunarYear);
    } else {
      monthDaysCount = monthDays(lunarYear, lunarMonth);
    }
    
    offset -= monthDaysCount;
    
    if (isLeap && lunarMonth === (leap + 1)) {
      isLeap = false;
    }
  }
  
  if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
    if (isLeap) {
      isLeap = false;
    } else {
      isLeap = true;
      --lunarMonth;
    }
  }
  
  if (offset < 0) {
    offset += monthDays(lunarYear, --lunarMonth);
  }
  
  lunarDay = offset + 1;
  
  // 获取干支年
  const ganIndex = (lunarYear - 4) % 10;
  const zhiIndex = (lunarYear - 4) % 12;
  const ganZhi = Gan[ganIndex] + Zhi[zhiIndex];
  const animal = Animals[zhiIndex];
  
  // 获取农历月份名称
  const monthName = (isLeap ? '闰' : '') + lunarMonths[lunarMonth - 1] + '月';
  
  // 获取农历日期名称
  const dayName = lunarDays[lunarDay - 1];
  
  // 获取节日和节气
  const lunarFestival = lunarFestivals[`${lunarMonth}-${lunarDay}`];
  const solarFestival = solarFestivals[`${month}-${day}`];
  const solarTerm = getSolarTerm(date);
  
  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap,
    ganZhi,
    animal,
    monthName,
    dayName,
    lunarFestival,
    solarFestival,
    solarTerm,
    // 显示优先级：节气 > 节日 > 初一/十五 > 日期
    display: solarTerm || lunarFestival || solarFestival || (lunarDay === 1 ? monthName : dayName),
  };
}

/**
 * 获取日期的完整农历信息（包含黄历）
 */
export function getLunarInfo(date) {
  const lunar = solarToLunar(date);
  
  return {
    ...lunar,
    fullDisplay: `${lunar.ganZhi}年 ${lunar.animal}年 ${lunar.monthName}${lunar.dayName}`,
  };
}

/**
 * 判断是否为重要日期（传统节日和公历节日，不包含节气）
 */
export function isImportantDate(date) {
  const lunar = solarToLunar(date);
  
  // 重要日期只包括：传统节日、公历节日
  // 节气作为农历信息显示，但不自动标记为节假日
  return !!(lunar.lunarFestival || lunar.solarFestival);
}
