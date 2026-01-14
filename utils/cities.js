export const CITIES = [
  { code: '101010100', name: '北京', englishName: 'Beijing', province: '北京' },
  { code: '101020100', name: '上海', englishName: 'Shanghai', province: '上海' },
  { code: '101280101', name: '广州', englishName: 'Guangzhou', province: '广东' },
  { code: '101280601', name: '深圳', englishName: 'Shenzhen', province: '广东' },
  { code: '101210101', name: '杭州', englishName: 'Hangzhou', province: '浙江' },
  { code: '101190101', name: '南京', englishName: 'Nanjing', province: '江苏' },
  { code: '101200101', name: '武汉', englishName: 'Wuhan', province: '湖北' },
  { code: '101270101', name: '成都', englishName: 'Chengdu', province: '四川' },
  { code: '101040100', name: '重庆', englishName: 'Chongqing', province: '重庆' },
  { code: '101110101', name: '西安', englishName: "Xi'an", province: '陕西' },
  { code: '101120101', name: '郑州', englishName: 'Zhengzhou', province: '河南' },
  { code: '101130101', name: '济南', englishName: 'Jinan', province: '山东' },
  { code: '101030100', name: '天津', englishName: 'Tianjin', province: '天津' },
  { code: '101070101', name: '沈阳', englishName: 'Shenyang', province: '辽宁' },
  { code: '101050101', name: '哈尔滨', englishName: 'Harbin', province: '黑龙江' },
  { code: '101090101', name: '石家庄', englishName: 'Shijiazhuang', province: '河北' },
  { code: '101160101', name: '合肥', englishName: 'Hefei', province: '安徽' },
  { code: '101220101', name: '长沙', englishName: 'Changsha', province: '湖南' },
  { code: '101230101', name: '南昌', englishName: 'Nanchang', province: '江西' },
  { code: '101250101', name: '福州', englishName: 'Fuzhou', province: '福建' },
  { code: '101260101', name: '厦门', englishName: 'Xiamen', province: '福建' },
  { code: '101300101', name: '南宁', englishName: 'Nanning', province: '广西' },
  { code: '101310101', name: '海口', englishName: 'Haikou', province: '海南' },
  { code: '101320101', name: '昆明', englishName: 'Kunming', province: '云南' },
  { code: '101340101', name: '拉萨', englishName: 'Lhasa', province: '西藏' },
  { code: '101350101', name: '兰州', englishName: 'Lanzhou', province: '甘肃' },
  { code: '101360101', name: '西宁', englishName: 'Xining', province: '青海' },
  { code: '101370101', name: '银川', englishName: 'Yinchuan', province: '宁夏' },
  { code: '101380101', name: '乌鲁木齐', englishName: 'Urumqi', province: '新疆' },
  { code: '101390101', name: '台北', englishName: 'Taipei', province: '台湾' },
  { code: '101400101', name: '香港', englishName: 'Hong_Kong', province: '香港' },
  { code: '101410101', name: '澳门', englishName: 'Macau', province: '澳门' },
];

export function getCityByCode(code) {
  return CITIES.find(city => city.code === code);
}

export function getCityEnglishName(code) {
  const city = getCityByCode(code);
  return city ? city.englishName : 'Beijing';
}

export function getCitiesByProvince(province) {
  return CITIES.filter(city => city.province === province);
}

export function searchCities(keyword) {
  const lowerKeyword = keyword.toLowerCase();
  return CITIES.filter(city => 
    city.name.includes(keyword) || 
    city.province.includes(keyword) ||
    city.code.includes(keyword)
  );
}
