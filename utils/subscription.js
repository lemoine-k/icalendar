/**
 * 日历订阅管理
 * 支持订阅网络上的公开日历（iCalendar 格式）
 */

/**
 * 预设的公开日历订阅源
 */
export const PRESET_CALENDARS = {
  // 中国节假日
  CN_HOLIDAYS: {
    id: 'cn-holidays',
    name: '中国法定节假日',
    url: 'webcal://calendar.google.com/calendar/ical/zh.china%23holiday%40group.v.calendar.google.com/public/basic.ics',
    description: '包含中国法定节假日和调休安排',
    category: 'holidays',
    color: '#ff6b6b',
    enabled: true,
  },
};

/**
 * 订阅对象结构
 */
export function createSubscription(params) {
  const {
    id,
    name,
    url,
    description,
    category,
    color,
    enabled,
    refreshInterval,
  } = params;
  
  return {
    id: id || `sub-${Date.now()}`,
    name: name || '',
    url: url || '',
    description: description || '',
    category: category || 'custom',
    color: color || '#4A90E2',
    enabled: enabled !== false,
    refreshInterval: refreshInterval || 86400000, // 默认24小时
    lastSync: null,
    lastSyncStatus: 'pending', // pending, success, error
    lastSyncError: null,
    eventCount: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 从 URL 获取日历数据
 * @param {string} url - iCalendar URL
 * @returns {Promise<string>} - iCalendar 字符串
 */
export async function fetchCalendar(url) {
  console.log('正在获取日历数据:', url);
  
  try {
    // 处理测试数据
    if (url === 'test://local-data') {
      console.log('返回测试数据');
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      return TEST_ICAL_DATA;
    }
    
    // 处理 webcal:// 协议
    let fetchUrl = url;
    if (url.startsWith('webcal://')) {
      fetchUrl = url.replace('webcal://', 'https://');
      console.log('转换 webcal 为 https:', fetchUrl);
    }
    
    // 特殊处理 Google Calendar
    // Google Calendar 的 CORS 限制很严格，需要使用代理
    const isGoogleCalendar = fetchUrl.includes('calendar.google.com');
    if (isGoogleCalendar) {
      console.log('⚠️ 检测到 Google Calendar，将优先使用代理');
    }
    
    // 尝试多个 CORS 代理
    // 如果是 Google Calendar，跳过直接请求，直接使用代理
    const proxyUrls = isGoogleCalendar ? [
      `https://api.allorigins.win/get?url=${encodeURIComponent(fetchUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fetchUrl)}`,
      `https://thingproxy.freeboard.io/fetch/${fetchUrl}`,
    ] : [
      fetchUrl, // 直接尝试（可能成功）
      `https://api.allorigins.win/get?url=${encodeURIComponent(fetchUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fetchUrl)}`,
      `https://thingproxy.freeboard.io/fetch/${fetchUrl}`,
    ];
    
    let lastError = null;
    const errors = [];
    
    for (let i = 0; i < proxyUrls.length; i++) {
      const proxyUrl = proxyUrls[i];
      const proxyName = i === 0 ? '直接请求' : 
                        proxyUrl.includes('allorigins') ? 'AllOrigins' :
                        proxyUrl.includes('corsproxy') ? 'CorsProxy' :
                        proxyUrl.includes('codetabs') ? 'CodeTabs' :
                        proxyUrl.includes('thingproxy') ? 'ThingProxy' : `代理${i}`;
      
      try {
        console.log(`🔄 尝试方法 ${i + 1}/${proxyUrls.length} [${proxyName}]`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/calendar, text/plain, */*',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let text = await response.text();
        
        // 如果使用了 allorigins，需要解析 JSON
        if (proxyUrl.includes('allorigins.win')) {
          try {
            const data = JSON.parse(text);
            if (data.contents) {
              text = data.contents;
            } else {
              throw new Error('AllOrigins 响应格式错误');
            }
          } catch (e) {
            throw new Error(`AllOrigins 解析失败: ${e.message}`);
          }
        }
        
        // 验证是否为有效的 iCalendar 格式
        if (!text.includes('BEGIN:VCALENDAR')) {
          throw new Error('响应不是有效的 iCalendar 格式');
        }
        
        console.log(`✅ 成功获取日历数据 [${proxyName}]，长度:`, text.length);
        return text;
        
      } catch (error) {
        const errorMsg = error.name === 'AbortError' ? '请求超时' : error.message;
        console.warn(`❌ 方法 ${i + 1} [${proxyName}] 失败:`, errorMsg);
        errors.push(`${proxyName}: ${errorMsg}`);
        lastError = error;
        continue;
      }
    }
    
    // 所有代理都失败了
    const errorDetails = errors.join('\n');
    throw new Error(`无法获取日历数据，所有方法都失败了。\n\n尝试的方法:\n${errorDetails}\n\n建议:\n1. 使用"测试日历"验证功能\n2. 检查网络连接\n3. 稍后重试`);
    
  } catch (error) {
    console.error('Fetch calendar error:', error);
    throw error;
  }
}

/**
 * 同步订阅日历
 * @param {object} subscription - 订阅对象
 * @param {function} parseICalendar - iCalendar 解析函数
 * @returns {Promise<object>} - 同步结果
 */
export async function syncSubscription(subscription, parseICalendar) {
  try {
    const icalString = await fetchCalendar(subscription.url);
    const events = parseICalendar(icalString);
    
    // 为订阅的事件添加标记
    const markedEvents = events.map(event => ({
      ...event,
      subscriptionId: subscription.id,
      subscriptionName: subscription.name,
      subscriptionColor: subscription.color,
      isSubscribed: true,
      readonly: true, // 订阅的事件只读
    }));
    
    return {
      success: true,
      events: markedEvents,
      eventCount: markedEvents.length,
      syncTime: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      events: [],
      eventCount: 0,
      syncTime: new Date().toISOString(),
      error: error.message,
    };
  }
}

/**
 * 检查是否需要刷新
 * @param {object} subscription - 订阅对象
 * @returns {boolean}
 */
export function needsRefresh(subscription) {
  if (!subscription.lastSync) return true;
  
  const lastSyncTime = new Date(subscription.lastSync).getTime();
  const now = Date.now();
  const elapsed = now - lastSyncTime;
  
  return elapsed >= subscription.refreshInterval;
}

/**
 * 获取订阅状态描述
 * @param {object} subscription - 订阅对象
 * @returns {string}
 */
export function getSubscriptionStatus(subscription) {
  if (!subscription.lastSync) {
    return '未同步';
  }
  
  const lastSyncTime = new Date(subscription.lastSync);
  const now = new Date();
  const elapsed = now - lastSyncTime;
  
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}天前同步`;
  } else if (hours > 0) {
    return `${hours}小时前同步`;
  } else if (minutes > 0) {
    return `${minutes}分钟前同步`;
  } else {
    return '刚刚同步';
  }
}

/**
 * 验证订阅 URL
 * @param {string} url - URL 字符串
 * @returns {boolean}
 */
export function validateSubscriptionUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 分类常量
 */
export const SUBSCRIPTION_CATEGORIES = {
  HOLIDAYS: { id: 'holidays', name: '节假日', icon: '🎉' },
  SPORTS: { id: 'sports', name: '体育赛事', icon: '⚽' },
  TV: { id: 'tv', name: '电视节目', icon: '📺' },
  WEATHER: { id: 'weather', name: '天气预报', icon: '🌤️' },
  CUSTOM: { id: 'custom', name: '自定义', icon: '📅' },
};

/**
 * 示例订阅源
 */
export const EXAMPLE_SUBSCRIPTIONS = [
  {
    name: '中国法定节假日',
    url: 'webcal://calendar.google.com/calendar/ical/zh.china%23holiday%40group.v.calendar.google.com/public/basic.ics',
    category: 'holidays',
    description: '包含中国法定节假日、调休和补班信息',
  },
  {
    name: 'NBA 赛程',
    url: 'webcal://example.com/nba-schedule.ics',
    category: 'sports',
    description: 'NBA 常规赛和季后赛赛程',
  },
  {
    name: '热门电视剧',
    url: 'webcal://example.com/tv-shows.ics',
    category: 'tv',
    description: '热门电视剧更新时间表',
  },
];
