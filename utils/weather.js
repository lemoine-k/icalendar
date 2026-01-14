/**
 * 天气API配置和功能
 * 使用 wttr.in 免费天气API
 */

const WEATHER_API_BASE = 'https://wttr.in';

const WEATHER_TYPE_MAP = {
  'Sunny': { icon: '☀️', type: '晴' },
  'Clear': { icon: '☀️', type: '晴' },
  'Partly cloudy': { icon: '⛅', type: '多云' },
  'Cloudy': { icon: '☁️', type: '阴' },
  'Overcast': { icon: '☁️', type: '阴' },
  'Mist': { icon: '🌫️', type: '雾' },
  'Fog': { icon: '🌫️', type: '雾' },
  'Freezing fog': { icon: '🌫️', type: '雾' },
  'Patchy rain possible': { icon: '🌧️', type: '小雨' },
  'Light rain': { icon: '🌧️', type: '小雨' },
  'Moderate rain': { icon: '🌧️', type: '中雨' },
  'Heavy rain': { icon: '⛈️', type: '大雨' },
  'Torrential rain': { icon: '⛈️', type: '暴雨' },
  'Patchy light rain': { icon: '🌧️', type: '小雨' },
  'Light drizzle': { icon: '🌧️', type: '小雨' },
  'Patchy light drizzle': { icon: '🌧️', type: '小雨' },
  'Thundery outbreaks possible': { icon: '⛈️', type: '雷阵雨' },
  'Thundery outbreaks in nearby': { icon: '⛈️', type: '雷阵雨' },
  'Patchy light rain with thunder': { icon: '⛈️', type: '雷阵雨' },
  'Moderate or heavy rain with thunder': { icon: '⛈️', type: '雷阵雨' },
  'Patchy snow possible': { icon: '❄️', type: '雪' },
  'Light snow': { icon: '❄️', type: '雪' },
  'Moderate snow': { icon: '❄️', type: '雪' },
  'Heavy snow': { icon: '❄️', type: '大雪' },
  'Patchy sleet possible': { icon: '🌨️', type: '雨夹雪' },
  'Light sleet': { icon: '🌨️', type: '雨夹雪' },
  'Moderate sleet': { icon: '�️', type: '雨夹雪' },
  'Blizzard': { icon: '❄️', type: '暴雪' },
};

const WEATHER_ADVICE_MAP = {
  '晴': '天气晴朗，适合户外活动，注意防晒',
  '多云': '天气舒适，适合外出',
  '阴': '天气凉爽，建议适当增减衣物',
  '雾': '能见度低，注意交通安全',
  '小雨': '记得带伞，注意防滑',
  '中雨': '雨势较大，建议减少外出',
  '大雨': '暴雨天气，避免外出，注意安全',
  '暴雨': '暴雨天气，避免外出，注意安全',
  '雷阵雨': '雷电天气，请留在室内',
  '雪': '注意保暖，路面可能结冰',
  '雨夹雪': '注意保暖，路面湿滑',
  '暴雪': '暴雪天气，避免外出，注意安全',
};

const WIND_DIR_MAP = {
  'N': '北风',
  'NNE': '东北偏北',
  'NE': '东北风',
  'ENE': '东北偏东',
  'E': '东风',
  'ESE': '东南偏东',
  'SE': '东南风',
  'SSE': '东南偏南',
  'S': '南风',
  'SSW': '西南偏南',
  'SW': '西南风',
  'WSW': '西南偏西',
  'W': '西风',
  'WNW': '西北偏西',
  'NW': '西北风',
  'NNW': '西北偏北',
  'Variable': '风向不定',
};

export async function getRealWeatherData(location = 'Beijing', days = 14) {
  const maxRetries = 3;
  const retryDelay = 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const weatherUrl = `${WEATHER_API_BASE}/${encodeURIComponent(location)}?format=j1`;
      console.log(`正在获取天气数据 (尝试 ${attempt}/${maxRetries}):`, weatherUrl);
      console.log(`请求的天数参数: ${days}天`);
      
      const response = await fetch(weatherUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('API返回空数据');
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON解析失败，响应内容:', responseText.substring(0, 200));
        throw new Error(`JSON解析错误: ${parseError.message}`);
      }
      
      if (!data || !data.weather) {
        console.error('API返回数据格式错误，完整数据:', JSON.stringify(data, null, 2));
        throw new Error('API返回数据格式错误');
      }
      
      console.log('✅ 成功获取天气数据');
      console.log('返回的天气数据结构:', Object.keys(data));
      console.log('天气数组长度:', data.weather.length);
      console.log('前3天数据概要:', data.weather.slice(0, 3).map((d, i) => ({
        date: d.date,
        maxtempC: d.maxtempC,
        mintempC: d.mintempC
      })));
      
      return data;
      
    } catch (error) {
      console.error(`获取天气数据失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
      console.error('错误详情:', error);
      
      if (attempt < maxRetries) {
        console.log(`等待 ${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('已达到最大重试次数，放弃获取天气数据');
        return null;
      }
    }
  }
  
  return null;
}

export function convertWeatherToICalendar(weatherData, locationName = '本地', locationCode = '101010100') {
  if (!weatherData || !weatherData.weather || !Array.isArray(weatherData.weather)) {
    console.error('无效的天气数据:', weatherData);
    throw new Error('无效的天气数据');
  }
  
  console.log('开始转换天气数据，天气天数:', weatherData.weather.length);
  console.log('第一天数据示例:', JSON.stringify(weatherData.weather[0], null, 2));
  
  const now = new Date();
  let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Weather Calendar//wttr.in//CN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:天气预报
X-WR-TIMEZONE:Asia/Shanghai
`;

  weatherData.weather.forEach((dayWeather, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() + index);
    
    const hourlyData = dayWeather.hourly?.[0] || {};
    const langZhData = hourlyData.lang_zh?.[0] || {};
    
    const weatherText = langZhData.value || 
                       hourlyData.weatherDesc?.[0]?.value || 
                       dayWeather.avgtempC || 
                       'Sunny';
    
    console.log(`第${index + 1}天天气文本:`, weatherText);
    
    const weatherType = parseWeatherType(weatherText);
    const weatherInfo = WEATHER_TYPE_MAP[weatherType] || WEATHER_TYPE_MAP['Sunny'];
    
    const tempHigh = dayWeather.maxtempC || dayWeather.avgtempC || 0;
    const tempLow = dayWeather.mintempC || dayWeather.avgtempC || 0;
    const tempRange = `${tempLow}-${tempHigh}°C`;
    
    const dateStr = formatDate(date);
    const eventDate = formatDateTime(date);
    const eventEndDate = formatDateTime(new Date(date.getTime() + 24 * 60 * 60 * 1000));
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const uid = `weather-${locationCode}-${dateKey}@wttr-calendar.com`;

    const windDir = hourlyData.winddir16Point || '未知';
    const windSpeed = hourlyData.windspeedKmph || '未知';
    const humidity = hourlyData.humidity || '未知';
    const windDirCN = WIND_DIR_MAP[windDir] || windDir;

    const description = `温度: ${tempRange}
天气: ${weatherType}
建议: ${WEATHER_ADVICE_MAP[weatherType] || '注意天气变化'}
风向: ${windDirCN}
风力: ${windSpeed} km/h
湿度: ${humidity}%`;

    icalContent += `BEGIN:VEVENT
DTSTART:${eventDate}
DTEND:${eventEndDate}
DTSTAMP:${formatDateTime(now)}
UID:${uid}
CREATED:${formatDateTime(now)}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LAST-MODIFIED:${formatDateTime(now)}
LOCATION:${locationName}
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:${weatherInfo.icon} ${dateStr} ${weatherType} ${tempRange}
TRANSP:OPAQUE
END:VEVENT
`;
  });

  icalContent += `END:VCALENDAR`;
  console.log('天气数据转换完成');
  return icalContent;
}

function parseWeatherType(weatherText) {
  if (!weatherText) return '晴';
  
  const text = weatherText.toLowerCase();
  
  if (text.includes('blizzard') || text.includes('heavy snow') || text.includes('暴雪')) {
    return '暴雪';
  }
  if (text.includes('snow') || text.includes('雪')) {
    return '雪';
  }
  if (text.includes('sleet') || text.includes('雨夹雪')) {
    return '雨夹雪';
  }
  if (text.includes('thunder') || text.includes('thundery') || text.includes('雷')) {
    return '雷阵雨';
  }
  if (text.includes('torrential') || text.includes('heavy rain') || text.includes('暴雨')) {
    return '暴雨';
  }
  if (text.includes('heavy rain') || text.includes('大雨')) {
    return '大雨';
  }
  if (text.includes('moderate rain') || text.includes('中雨')) {
    return '中雨';
  }
  if (text.includes('light rain') || text.includes('drizzle') || text.includes('patchy rain') || text.includes('小雨')) {
    return '小雨';
  }
  if (text.includes('mist') || text.includes('fog') || text.includes('雾')) {
    return '雾';
  }
  if (text.includes('overcast') || text.includes('cloudy') || text.includes('阴')) {
    return '阴';
  }
  if (text.includes('partly cloudy') || text.includes('partly sunny') || text.includes('多云')) {
    return '多云';
  }
  if (text.includes('sunny') || text.includes('clear') || text.includes('晴')) {
    return '晴';
  }
  
  return '晴';
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

export function getWeatherAdvice(weatherType) {
  return WEATHER_ADVICE_MAP[weatherType] || '注意天气变化';
}

export function getWeatherIcon(weatherType) {
  const weatherInfo = WEATHER_TYPE_MAP[weatherType];
  return weatherInfo ? weatherInfo.icon : '☀️';
}
