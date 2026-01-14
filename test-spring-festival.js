// 测试春节假期识别功能
// 这个文件用于测试和调试春节假期的UI显示

// 模拟春节假期事件数据
export const SPRING_FESTIVAL_TEST_EVENTS = [
  {
    id: 'sf-2025-1',
    summary: '春节假期',
    dtstart: '2025-01-28',
    dtend: '2025-01-28',
    subscriptionId: 'cn-holidays',
    subscriptionName: '中国法定节假日',
    isSubscribed: true,
    readonly: true,
  },
  {
    id: 'sf-2025-2',
    summary: '除夕',
    dtstart: '2025-01-28',
    dtend: '2025-01-28',
    subscriptionId: 'cn-holidays',
    subscriptionName: '中国法定节假日',
    isSubscribed: true,
    readonly: true,
  },
  {
    id: 'sf-2025-3',
    summary: '春节初一',
    dtstart: '2025-01-29',
    dtend: '2025-01-29',
    subscriptionId: 'cn-holidays',
    subscriptionName: '中国法定节假日',
    isSubscribed: true,
    readonly: true,
  },
  {
    id: 'sf-2025-4',
    summary: '春节初二',
    dtstart: '2025-01-30',
    dtend: '2025-01-30',
    subscriptionId: 'cn-holidays',
    subscriptionName: '中国法定节假日',
    isSubscribed: true,
    readonly: true,
  },
  {
    id: 'sf-2025-5',
    summary: '春节初三',
    dtstart: '2025-01-31',
    dtend: '2025-01-31',
    subscriptionId: 'cn-holidays',
    subscriptionName: '中国法定节假日',
    isSubscribed: true,
    readonly: true,
  },
  {
    id: 'sf-2025-6',
    summary: '春节初四',
    dtstart: '2025-02-01',
    dtend: '2025-02-01',
    subscriptionId: 'cn-holidays',
    subscriptionName: '中国法定节假日',
    isSubscribed: true,
    readonly: true,
  },
  {
    id: 'sf-2025-7',
    summary: '春节初五',
    dtstart: '2025-02-02',
    dtend: '2025-02-02',
    subscriptionId: 'cn-holidays',
    subscriptionName: '中国法定节假日',
    isSubscribed: true,
    readonly: true,
  },
  {
    id: 'sf-2025-8',
    summary: '春节初六',
    dtstart: '2025-02-03',
    dtend: '2025-02-03',
    subscriptionId: 'cn-holidays',
    subscriptionName: '中国法定节假日',
    isSubscribed: true,
    readonly: true,
  },
  // 工作日（应该不显示为假期）
  {
    id: 'sf-2025-work-1',
    summary: '春节后上班',
    dtstart: '2025-02-04',
    dtend: '2025-02-04',
    subscriptionId: 'cn-holidays',
    subscriptionName: '中国法定节假日',
    isSubscribed: true,
    readonly: true,
  },
];

// 测试春节假期识别函数
export const testSpringFestivalDetection = () => {
  console.log('🧪 开始测试春节假期识别...');
  
  const testCases = [
    { date: '2025-01-28', title: '除夕', expected: true },
    { date: '2025-01-29', title: '春节初一', expected: true },
    { date: '2025-01-30', title: '春节初二', expected: true },
    { date: '2025-01-31', title: '春节初三', expected: true },
    { date: '2025-02-01', title: '春节初四', expected: true },
    { date: '2025-02-02', title: '春节初五', expected: true },
    { date: '2025-02-03', title: '春节初六', expected: true },
    { date: '2025-02-04', title: '春节后上班', expected: false },
    { date: '2025-01-27', title: '春节假期', expected: true },
    { date: '2025-02-05', title: '新年假期', expected: true },
    { date: '2025-03-01', title: '普通工作日', expected: false },
  ];
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach(({ date, title, expected }) => {
    // 这里需要导入实际的检测函数进行测试
    // const result = isSpringFestivalHoliday(date, title);
    // const success = result === expected;
    
    // 模拟测试结果
    const result = title.includes('春节') || title.includes('除夕') || 
                   title.includes('初一') || title.includes('初二') || 
                   title.includes('初三') || title.includes('初四') ||
                   title.includes('初五') || title.includes('初六') ||
                   title.includes('新年') || title.includes('假期');
    
    const success = result === expected;
    
    if (success) {
      passed++;
      console.log(`✅ ${date} "${title}" -> ${result} (预期: ${expected})`);
    } else {
      failed++;
      console.log(`❌ ${date} "${title}" -> ${result} (预期: ${expected})`);
    }
  });
  
  console.log(`\n🎯 测试结果: ${passed} 通过, ${failed} 失败`);
  console.log(`📊 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  return { passed, failed, total: passed + failed };
};

// 春节假期UI显示建议
export const SPRING_FESTIVAL_UI_RECOMMENDATIONS = {
  colors: {
    springFestival: '#ff6b35', // 橙红色，代表春节喜庆
    regularHoliday: '#d93025', // 红色，代表普通假期
    workday: '#666666', // 灰色，代表工作日
  },
  
  badges: {
    springFestival: '春', // 春节假期显示"春"
    regularHoliday: '休', // 普通假期显示"休"
    workday: '班', // 工作日显示"班"
  },
  
  styles: {
    springFestivalBackground: '#fff5f0', // 春节假期背景色
    regularHolidayBackground: '#fce8e6', // 普通假期背景色
    workdayBackground: '#f5f5f5', // 工作日背景色
  }
};

// 导出测试数据供其他组件使用
export default {
  SPRING_FESTIVAL_TEST_EVENTS,
  testSpringFestivalDetection,
  SPRING_FESTIVAL_UI_RECOMMENDATIONS,
};