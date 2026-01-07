/**
 * 挖矿数据刷新频率配置
 *
 * 根据不同场景和设备类型优化刷新频率，平衡用户体验和性能
 */

/**
 * 检测是否为移动设备
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * 检测网络连接类型（如果支持）
 */
export const getConnectionType = (): '4g' | '3g' | 'slow-2g' | 'wifi' | 'unknown' => {
  const connection = (navigator as any).connection
    || (navigator as any).mozConnection
    || (navigator as any).webkitConnection;

  if (!connection) return 'unknown';

  const effectiveType = connection.effectiveType;
  return effectiveType || 'unknown';
};

/**
 * 刷新频率配置（毫秒）
 */
export const REFRESH_INTERVALS = {
  // 挖矿奖励实时数据（pendingIvy）
  PENDING_IVY: {
    DESKTOP: 10000,          // 桌面端：10秒（推荐）
    MOBILE_WIFI: 15000,      // 移动端WiFi：15秒
    MOBILE_4G: 30000,        // 移动端4G：30秒
    MOBILE_SLOW: 60000,      // 移动端慢速网络：60秒
  },

  // 协议统计数据（dailyEmission, pidMultiplier等）
  PROTOCOL_STATS: {
    DESKTOP: 10000,          // 桌面端：10秒（优化：从5秒增加）
    MOBILE: 20000,           // 移动端：20秒（优化：从15秒增加）
  },

  // 用户余额
  USER_BALANCE: {
    DESKTOP: 10000,          // 桌面端：10秒（优化：从2秒增加）
    MOBILE: 15000,           // 移动端：15秒（优化：从5秒增加）
  },

  // 挖矿统计（bondPower等，变化较慢）
  MINING_STATS: {
    DESKTOP: 10000,          // 桌面端：10秒（优化：从5秒增加）
    MOBILE: 20000,           // 移动端：20秒（优化：从10秒增加）
  },

  // 锁仓信息（变化很慢）
  VESTING_INFO: {
    DESKTOP: 10000,          // 桌面端：10秒（优化：从5秒增加）
    MOBILE: 20000,           // 移动端：20秒（优化：从10秒增加）
  },

  // Genesis Node 总数（变化最慢）
  NODE_SUPPLY: {
    DESKTOP: 30000,          // 桌面端：30秒（优化：从10秒增加）
    MOBILE: 60000,           // 移动端：60秒（优化：从30秒增加）
  },
};

/**
 * 获取智能刷新频率
 *
 * 根据设备类型和网络状况自动选择最佳刷新频率
 */
export const getSmartRefreshInterval = (dataType: keyof typeof REFRESH_INTERVALS): number => {
  const isMobile = isMobileDevice();
  const intervals = REFRESH_INTERVALS[dataType];

  // 如果没有移动端配置，使用桌面端配置
  if (typeof intervals === 'number') {
    return intervals;
  }

  // pendingIvy 特殊处理（根据网络类型）
  if (dataType === 'PENDING_IVY') {
    if (!isMobile) {
      return intervals.DESKTOP; // 桌面端使用 10 秒
    }

    const connectionType = getConnectionType();
    switch (connectionType) {
      case 'wifi':
        return intervals.MOBILE_WIFI;
      case '4g':
        return intervals.MOBILE_4G;
      case '3g':
      case 'slow-2g':
        return intervals.MOBILE_SLOW;
      default:
        return intervals.MOBILE_4G; // 默认使用 4G 配置
    }
  }

  // 其他数据类型：简单的移动端/桌面端判断
  return isMobile ? intervals.MOBILE : intervals.DESKTOP;
};

/**
 * 用户可配置的显示模式
 */
export type DisplayMode = 'realtime' | 'balanced' | 'power-save';

/**
 * 根据用户选择的显示模式获取刷新频率
 */
export const getRefreshIntervalByMode = (
  dataType: keyof typeof REFRESH_INTERVALS,
  mode: DisplayMode = 'balanced'
): number => {
  const baseInterval = getSmartRefreshInterval(dataType);

  switch (mode) {
    case 'realtime':
      // 实时模式：使用最快速度
      return Math.min(baseInterval, 3000);

    case 'power-save':
      // 省电模式：2倍刷新间隔
      return baseInterval * 2;

    case 'balanced':
    default:
      // 平衡模式：使用推荐值
      return baseInterval;
  }
};

/**
 * 导出配置说明（用于前端设置面板）
 */
export const DISPLAY_MODE_DESCRIPTIONS = {
  realtime: {
    label: '实时模式',
    description: '数字快速跳动，耗电较多',
    icon: '⚡',
  },
  balanced: {
    label: '平衡模式',
    description: '推荐设置，体验流畅',
    icon: '⚖️',
  },
  'power-save': {
    label: '省电模式',
    description: '降低刷新频率，节省流量和电量',
    icon: '🔋',
  },
};
