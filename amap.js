/**
 * 高德地图API包装器
 * 提供地理编码（地址转经纬度）和逆地理编码（经纬度转地址）功能
 */

const https = require('https');
const querystring = require('querystring');

// 高德地图API配置
const AMAP_CONFIG = {
  KEY: process.env.AMAP_KEY || 'b3eb056d6cfaada646d3e57135107ba6', // 默认密钥，建议通过环境变量设置
  BASE_URL: 'https://restapi.amap.com/v3'
};

/**
 * 高德地图地理编码API（地址转经纬度）
 * @param {string} address - 地址
 * @param {string} city - 城市（可选）
 * @returns {Promise<Object>} 包含经纬度信息的对象
 */
function geocode(address, city = '') {
  return new Promise((resolve, reject) => {
    if (!address) {
      reject(new Error('地址不能为空'));
      return;
    }

    const params = {
      key: AMAP_CONFIG.KEY,
      address: address
    };

    if (city) {
      params.city = city;
    }

    const queryString = querystring.stringify(params);
    const url = `${AMAP_CONFIG.BASE_URL}/geocode/geo?${queryString}`;

    https.get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (response.statusCode === 200) {
            if (result.status === '1' && result.geocodes && result.geocodes.length > 0) {
              const geocode = result.geocodes[0];
              const location = geocode.location.split(',');

              resolve({
                name: address,
                country: '中国',
                province: geocode.province || '',
                city: geocode.city || '',
                district: geocode.district || '',
                formatted_address: geocode.formatted_address,
                lat: parseFloat(location[1]),
                lng: parseFloat(location[0]),
                adcode: geocode.adcode || ''
              });
            } else {
              reject(new Error('未找到该地址'));
            }
          } else {
            reject(new Error(`请求失败: ${response.statusCode}`));
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 高德地图逆地理编码API（经纬度转地址）
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {Promise<Object>} 包含地址信息的对象
 */
function reverseGeocode(lat, lng) {
  return new Promise((resolve, reject) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      reject(new Error('经纬度必须为数字'));
      return;
    }

    const params = {
      key: AMAP_CONFIG.KEY,
      location: `${lng},${lat}`
    };

    const queryString = querystring.stringify(params);
    const url = `${AMAP_CONFIG.BASE_URL}/geocode/regeo?${queryString}`;

    https.get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (response.statusCode === 200) {
            if (result.status === '1' && result.regeocode) {
              const regeocode = result.regeocode;

              resolve({
                formatted_address: regeocode.formatted_address,
                country: '中国',
                province: regeocode.addressComponent.province || '',
                city: regeocode.addressComponent.city || '',
                district: regeocode.addressComponent.district || '',
                street: regeocode.addressComponent.street || '',
                street_number: regeocode.addressComponent.streetNumber || '',
                lat: lat,
                lng: lng
              });
            } else {
              reject(new Error('未找到该位置'));
            }
          } else {
            reject(new Error(`请求失败: ${response.statusCode}`));
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

module.exports = {
  geocode,
  reverseGeocode
};