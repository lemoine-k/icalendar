# 天气API配置说明

## 概述

本应用使用 wttr.in 免费天气API获取天气数据，无需注册API密钥，直接使用即可。

## API信息

- **API提供商**: wttr.in
- **API类型**: 免费开源天气服务
- **数据来源**: 世界气象组织（WMO）和多个气象数据源
- **数据更新频率**: 实时更新
- **支持城市**: 全球城市
- **接口地址**: `https://wttr.in/{城市名}?format=j1`

## 使用说明

### 1. 基本配置

天气API已经集成在应用中，无需额外配置即可使用。

默认城市为 `Beijing`（北京）。

### 2. 城市名称格式

wttr.in 支持使用城市英文名称获取天气数据。

#### 常用城市名称

| 城市 | 英文名称 |
|------|----------|
| 北京 | Beijing |
| 上海 | Shanghai |
| 广州 | Guangzhou |
| 深圳 | Shenzhen |
| 杭州 | Hangzhou |
| 南京 | Nanjing |
| 武汉 | Wuhan |
| 成都 | Chengdu |
| 重庆 | Chongqing |
| 西安 | Xian |

#### 其他城市名称格式

- **中文城市拼音**: 如 `Beijing`, `Shanghai`
- **英文城市名**: 如 `London`, `New York`
- **机场代码**: 如 `PEK`, `SHA`
- **经纬度**: 如 `39.9042,116.4074`
- **IP地址**: 自动检测位置

### 3. 修改订阅城市

应用支持通过界面切换城市，无需手动修改代码。

如需修改默认城市，可以修改 `utils/cities.js` 文件中的城市数据。

## API数据格式

### 请求示例

```javascript
fetch('https://wttr.in/Beijing?format=j1')
  .then(response => response.json())
  .then(data => console.log(data));
```

### 响应数据结构

```json
{
  "current_condition": [
    {
      "FeelsLikeC": "12",
      "FeelsLikeF": "54",
      "cloudcover": "0",
      "humidity": "45",
      "observation_time": "02:20 PM",
      "temp_C": "15",
      "temp_F": "59",
      "uvIndex": "3",
      "visibility": "10",
      "weatherCode": "113",
      "weatherDesc": [
        {
          "value": "Sunny"
        }
      ],
      "winddir16Point": "N",
      "windspeedKmph": "15",
      "winddirDegree": "360"
    }
  ],
  "nearest_area": [
    {
      "areaName": [
        {
          "value": "Beijing"
        }
      ],
      "country": [
        {
          "value": "China"
        }
      ],
      "region": [
        {
          "value": "Beijing"
        }
      ]
    }
  ],
  "weather": [
    {
      "avgtempC": "15",
      "avgtempF": "59",
      "date": "2026-01-14",
      "hourly": [
        {
          "DewPointC": "3",
          "FeelsLikeC": "12",
          "HeatIndexC": "15",
          "WindChillC": "12",
          "WindGustKmph": "20",
          "chanceoffog": "0",
          "chanceoffrost": "0",
          "chanceofhightemp": "0",
          "chanceofovercast": "0",
          "chanceofrain": "0",
          "chanceofremdry": "0",
          "chanceofsnow": "0",
          "chanceofsunshine": "100",
          "chanceofthunder": "0",
          "chanceofwindy": "0",
          "cloudcover": "0",
          "humidity": "45",
          "precipMM": "0.0",
          "pressure": "1018",
          "tempC": "15",
          "time": "0",
          "uvIndex": "3",
          "visibility": "10",
          "weatherCode": "113",
          "weatherDesc": [
            {
              "value": "Sunny"
            }
          ],
          "winddir16Point": "N",
          "windspeedKmph": "15",
          "winddirDegree": "360"
        }
      ],
      "maxtempC": "20",
      "maxtempF": "68",
      "mintempC": "10",
      "mintempF": "50",
      "sunrise": "07:20 AM",
      "sunset": "05:30 PM",
      "totalSnow_cm": "0.0",
      "uvIndex": "3"
    }
  ]
}
```

## 天气类型说明

应用支持以下天气类型：

| 天气类型 | 英文描述 | 图标 | 建议 |
|----------|----------|------|------|
| 晴 | Sunny, Clear | ☀️ | 天气晴朗，适合户外活动，注意防晒 |
| 多云 | Partly cloudy | ⛅ | 天气舒适，适合外出 |
| 阴 | Cloudy, Overcast | ☁️ | 天气凉爽，建议适当增减衣物 |
| 雾 | Mist, Fog | 🌫️ | 能见度低，注意交通安全 |
| 小雨 | Light rain, Drizzle | 🌧️ | 记得带伞，注意防滑 |
| 中雨 | Moderate rain | 🌧️ | 雨势较大，建议减少外出 |
| 大雨 | Heavy rain | ⛈️ | 暴雨天气，避免外出，注意安全 |
| 暴雨 | Torrential rain | ⛈️ | 暴雨天气，避免外出，注意安全 |
| 雷阵雨 | Thunder | ⛈️ | 雷电天气，请留在室内 |
| 雪 | Snow | ❄️ | 注意保暖，路面可能结冰 |
| 雨夹雪 | Sleet | 🌨️ | 注意保暖，路面湿滑 |
| 暴雪 | Blizzard | ❄️ | 暴雪天气，避免外出，注意安全 |

## API特性

### 优点

1. **完全免费**: 无需注册，无需API密钥
2. **全球覆盖**: 支持全球所有城市
3. **实时数据**: 数据实时更新
4. **多种格式**: 支持JSON、PNG、ASCII等多种输出格式
5. **HTTPS支持**: 支持安全连接
6. **开源**: 代码开源，社区维护

### 限制

1. **速率限制**: 每秒最多1000次请求
2. **数据精度**: 部分城市数据可能不够精确
3. **中文支持**: 城市名称需要使用英文

## 故障排除

### 问题1: 无法获取天气数据

**可能原因**:
- 网络连接问题
- 城市名称错误
- API服务暂时不可用

**解决方案**:
- 检查网络连接
- 确认城市英文名称正确
- 稍后重试
- 应用会自动降级使用模拟数据

### 问题2: 天气数据不准确

**可能原因**:
- 城市名称有歧义（如多个同名城市）
- 数据源延迟

**解决方案**:
- 使用更具体的城市名称
- 使用机场代码
- 使用经纬度坐标

### 问题3: 某些城市无法获取数据

**可能原因**:
- 城市名称拼写错误
- 该城市不在数据库中

**解决方案**:
- 检查城市英文名称拼写
- 尝试使用附近城市的名称
- 使用经纬度坐标

## 高级用法

### 使用经纬度

```javascript
fetch('https://wttr.in/39.9042,116.4074?format=j1')
  .then(response => response.json())
  .then(data => console.log(data));
```

### 使用机场代码

```javascript
fetch('https://wttr.in/PEK?format=j1')
  .then(response => response.json())
  .then(data => console.log(data));
```

### 获取多天预报

默认返回3天天气预报，可以通过参数调整：

```javascript
fetch('https://wttr.in/Beijing?format=j1&num_days=7')
  .then(response => response.json())
  .then(data => console.log(data));
```

## 注意事项

1. **城市名称**: 必须使用英文名称或拼音
2. **速率限制**: 请遵守API的速率限制
3. **数据准确性**: 部分数据可能存在误差
4. **服务稳定性**: 免费服务可能存在偶尔的不稳定
5. **HTTPS**: 建议使用HTTPS协议访问

## 技术支持

如有问题，请查看：
- wttr.in官网: https://wttr.in
- GitHub仓库: https://github.com/chubin/wttr.in
- API文档: https://wttr.in/:help

## 更新日志

### 2026-01-14
- 从中国天气网API切换到wttr.in API
- 支持全球城市天气查询
- 移除城市代码限制，使用城市英文名称
- 增加城市选择功能
