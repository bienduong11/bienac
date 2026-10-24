/* =====================================================================
 * Âm lịch Việt Nam theo thuật toán của Hồ Ngọc Đức (múi giờ +7).
 * Dùng được cả trên trình duyệt (window.AmLich) và Node (module.exports).
 * ===================================================================== */
(function (root) {
  'use strict';
  const PI = Math.PI;
  const INT = Math.floor;

  function jdFromDate(dd, mm, yy) {
    const a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
    let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    return jd;
  }
  function jdToDate(jd) {
    let a, b, c;
    if (jd > 2299160) { a = jd + 32044; b = INT((4 * a + 3) / 146097); c = a - INT((b * 146097) / 4); }
    else { b = 0; c = jd + 32082; }
    const d = INT((4 * c + 3) / 1461), e = c - INT((1461 * d) / 4), m = INT((5 * e + 2) / 153);
    return [e - INT((153 * m + 2) / 5) + 1, m + 3 - 12 * INT(m / 10), b * 100 + d - 4800 + INT(m / 10)];
  }
  function newMoon(k) {
    const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    let deltat;
    if (T < -11) deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
    else deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
    return Jd1 + C1 - deltat;
  }
  /** Kinh độ Mặt Trời (radian, 0..2π) tại ngày Julius jdn (lúc 0h giờ địa phương). */
  function sunLongitudeRad(jdn) {
    const T = (jdn - 2451545.0) / 36525, T2 = T * T, dr = PI / 180;
    const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
    let L = (L0 + DL) * dr;
    L = L - PI * 2 * INT(L / (PI * 2));
    return L;
  }
  const getNewMoonDay = (k, tz) => INT(newMoon(k) + 0.5 + tz / 24);
  const getSunLongitude = (dayNumber, tz) => INT((sunLongitudeRad(dayNumber - 0.5 - tz / 24) / PI) * 6);
  function getLunarMonth11(yy, tz) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = INT(off / 29.530588853);
    let nm = getNewMoonDay(k, tz);
    if (getSunLongitude(nm, tz) >= 9) nm = getNewMoonDay(k - 1, tz);
    return nm;
  }
  function getLeapMonthOffset(a11, tz) {
    const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last, i = 1, arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
    do { last = arc; i++; arc = getSunLongitude(getNewMoonDay(k + i, tz), tz); } while (arc !== last && i < 14);
    return i - 1;
  }
  /** Dương → âm: trả [ngày, tháng, năm, nhuận(0/1)] */
  function solar2lunar(dd, mm, yy, tz = 7) {
    const dayNumber = jdFromDate(dd, mm, yy);
    const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k + 1, tz);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k, tz);
    let a11 = getLunarMonth11(yy, tz), b11 = a11, lunarYear;
    if (a11 >= monthStart) { lunarYear = yy; a11 = getLunarMonth11(yy - 1, tz); }
    else { lunarYear = yy + 1; b11 = getLunarMonth11(yy + 1, tz); }
    const lunarDay = dayNumber - monthStart + 1;
    const diff = INT((monthStart - a11) / 29);
    let lunarLeap = 0, lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
      const leapMonthDiff = getLeapMonthOffset(a11, tz);
      if (diff >= leapMonthDiff) { lunarMonth = diff + 10; if (diff === leapMonthDiff) lunarLeap = 1; }
    }
    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
    return [lunarDay, lunarMonth, lunarYear, lunarLeap];
  }
  /** Âm → dương: trả [ngày, tháng, năm] hoặc null nếu không tồn tại */
  function lunar2solar(lDay, lMonth, lYear, lLeap, tz = 7) {
    let a11, b11;
    if (lMonth < 11) { a11 = getLunarMonth11(lYear - 1, tz); b11 = getLunarMonth11(lYear, tz); }
    else { a11 = getLunarMonth11(lYear, tz); b11 = getLunarMonth11(lYear + 1, tz); }
    const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
    let off = lMonth - 11;
    if (off < 0) off += 12;
    if (b11 - a11 > 365) {
      const leapOff = getLeapMonthOffset(a11, tz);
      let leapMonth = leapOff - 2;
      if (leapMonth < 0) leapMonth += 12;
      if (lLeap && lMonth !== leapMonth) return null;
      if (lLeap || off >= leapOff) off += 1;
    } else if (lLeap) return null;
    const monthStart = getNewMoonDay(k + off, tz);
    return jdToDate(monthStart + lDay - 1);
  }
  /** Tháng nhuận của năm âm lịch (0 nếu không có) */
  function leapMonthOf(lYear, tz = 7) {
    const a11 = getLunarMonth11(lYear - 1, tz), b11 = getLunarMonth11(lYear, tz);
    if (b11 - a11 <= 365) return 0;
    let m = getLeapMonthOffset(a11, tz) - 2;
    if (m <= 0) m += 12;
    return m;
  }

  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const GIAP = ['Chuột', 'Trâu', 'Hổ', 'Mèo', 'Rồng', 'Rắn', 'Ngựa', 'Dê', 'Khỉ', 'Gà', 'Chó', 'Lợn'];
  const TIET = ['Xuân phân', 'Thanh minh', 'Cốc vũ', 'Lập hạ', 'Tiểu mãn', 'Mang chủng', 'Hạ chí', 'Tiểu thử', 'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ',
    'Thu phân', 'Hàn lộ', 'Sương giáng', 'Lập đông', 'Tiểu tuyết', 'Đại tuyết', 'Đông chí', 'Tiểu hàn', 'Đại hàn', 'Lập xuân', 'Vũ thủy', 'Kinh trập'];
  const GIO_HD = ['110100101100', '001101001011', '110011010010', '101100110100', '001011001101', '010010110011'];

  const canChiNam = (y) => CAN[(y + 6) % 10] + ' ' + CHI[(y + 8) % 12];
  const canChiThang = (m, y) => CAN[(y * 12 + m + 3) % 10] + ' ' + CHI[(m + 1) % 12];
  const canChiNgay = (jd) => CAN[(jd + 9) % 10] + ' ' + CHI[(jd + 1) % 12];
  /** Can Chi của giờ, chiIdx 0 = giờ Tý */
  const canChiGio = (jd, chiIdx) => CAN[(((jd + 9) % 10) % 5 * 2 + chiIdx) % 10] + ' ' + CHI[chiIdx];
  /** Tiết khí đang chứa ngày jd (tính ở 12h trưa giờ địa phương) */
  const tietKhi = (jd, tz = 7) => TIET[INT(sunLongitudeRad(jd + 0.5 - tz / 24) / (PI / 12))];
  const gioHoangDao = (jd) => { const s = GIO_HD[((jd + 1) % 12) % 6]; return CHI.filter((_, i) => s[i] === '1'); };

  const api = { jdFromDate, jdToDate, solar2lunar, lunar2solar, leapMonthOf, canChiNam, canChiThang, canChiNgay, canChiGio, tietKhi, gioHoangDao, CAN, CHI, GIAP, TIET };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AmLich = api;
})(typeof window !== 'undefined' ? window : globalThis);
