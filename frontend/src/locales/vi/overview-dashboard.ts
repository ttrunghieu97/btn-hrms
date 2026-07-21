export const overviewDemoPageCopy = {
  greeting: 'Xin chao, chao mung quay lai',
  download: 'Tai xuong',
  tabs: {
    overview: 'Tong quan',
    analytics: 'Phan tich'
  },
  cards: {
    revenue: {
      title: 'Tong doanh thu',
      trend: '+12.5%',
      summary: 'Tang truong trong thang nay',
      description: 'Luot truy cap trong 6 thang gan day'
    },
    customers: {
      title: 'Khach hang moi',
      trend: '-20%',
      summary: 'Giam 20% trong ky nay',
      description: 'Kenh thu hut can duoc cai thien'
    },
    accounts: {
      title: 'Tai khoan hoat dong',
      trend: '+12.5%',
      summary: 'Ty le giu chan tot',
      description: 'Muc do tuong tac vuot muc muc tieu'
    },
    growth: {
      title: 'Toc do tang truong',
      trend: '+4.5%',
      summary: 'Hieu suat tang truong on dinh',
      description: 'Dat muc du bao tang truong'
    }
  }
} as const;

export const overviewDemoAreaChartData = [
  { month: 'January', desktop: 342, mobile: 245 },
  { month: 'February', desktop: 876, mobile: 654 },
  { month: 'March', desktop: 512, mobile: 387 },
  { month: 'April', desktop: 629, mobile: 521 },
  { month: 'May', desktop: 458, mobile: 412 },
  { month: 'June', desktop: 781, mobile: 598 },
  { month: 'July', desktop: 394, mobile: 312 },
  { month: 'August', desktop: 925, mobile: 743 },
  { month: 'September', desktop: 647, mobile: 489 },
  { month: 'October', desktop: 532, mobile: 476 },
  { month: 'November', desktop: 803, mobile: 687 },
  { month: 'December', desktop: 271, mobile: 198 }
];

export const overviewDemoBarChartData = [
  { month: 'January', desktop: 186, mobile: 80 },
  { month: 'February', desktop: 305, mobile: 200 },
  { month: 'March', desktop: 237, mobile: 120 },
  { month: 'April', desktop: 73, mobile: 190 },
  { month: 'May', desktop: 209, mobile: 130 },
  { month: 'June', desktop: 214, mobile: 140 }
];

export const overviewDemoPieChartData = [
  { browser: 'chrome', visitors: 275, fill: 'var(--color-chrome)' },
  { browser: 'safari', visitors: 200, fill: 'var(--color-safari)' },
  { browser: 'firefox', visitors: 187, fill: 'var(--color-firefox)' },
  { browser: 'edge', visitors: 173, fill: 'var(--color-edge)' },
  { browser: 'other', visitors: 90, fill: 'var(--color-other)' }
];

export const overviewDemoCopy = {
  areaGraph: {
    title: 'Bieu do vung cham',
    trend: '-5.2%',
    description: 'Tong luot truy cap trong 6 thang gan day',
    labels: {
      desktop: 'Desktop',
      mobile: 'Mobile'
    }
  },
  barGraph: {
    title: 'Bieu do cot nhieu chuoi',
    trend: '-5.2%',
    description: 'Thang 1 - Thang 6/2025',
    labels: {
      desktop: 'Desktop',
      mobile: 'Mobile'
    }
  },
  pieGraph: {
    title: 'Bieu do tron',
    trend: '+5.2%',
    description: 'Thang 1 - Thang 6/2024',
    labels: {
      visitors: 'Luot truy cap',
      chrome: 'Chrome',
      safari: 'Safari',
      firefox: 'Firefox',
      edge: 'Edge',
      other: 'Khac'
    }
  },
  recentSales: {
    title: 'Giao dich gan day',
    description: 'Ban co 265 giao dich trong thang nay.',
    avatarAlt: 'Avatar'
  }
} as const;

export const overviewDemoRecentSales = [
  {
    name: 'Olivia Martin',
    email: 'olivia.martin@email.com',
    avatar: 'https://api.slingacademy.com/public/sample-users/1.png',
    fallback: 'OM',
    amount: '+$1,999.00'
  },
  {
    name: 'Jackson Lee',
    email: 'jackson.lee@email.com',
    avatar: 'https://api.slingacademy.com/public/sample-users/2.png',
    fallback: 'JL',
    amount: '+$39.00'
  },
  {
    name: 'Isabella Nguyen',
    email: 'isabella.nguyen@email.com',
    avatar: 'https://api.slingacademy.com/public/sample-users/3.png',
    fallback: 'IN',
    amount: '+$299.00'
  },
  {
    name: 'William Kim',
    email: 'will@email.com',
    avatar: 'https://api.slingacademy.com/public/sample-users/4.png',
    fallback: 'WK',
    amount: '+$99.00'
  },
  {
    name: 'Sofia Davis',
    email: 'sofia.davis@email.com',
    avatar: 'https://api.slingacademy.com/public/sample-users/5.png',
    fallback: 'SD',
    amount: '+$39.00'
  }
];
