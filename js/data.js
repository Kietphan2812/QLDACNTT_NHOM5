/* ============================================================================
   HRMASTER PRO - REALTIME DATASTORE CONNECTED TO SQL SERVER QLNHANSU
   ============================================================================ */

const API_BASE_URL = 'http://localhost:5000/api';

class DataStore {
  constructor() {
    this.data = {
      phong_ban: [],
      chuc_danh: [],
      nhan_vien: [],
      tai_khoan: [],
      tin_tuyen_dung: [],
      ung_vien: [],
      ho_so_ung_tuyen: [],
      phong_van: [],
      khoa_hoc: [],
      lich_dao_tao: [],
      dang_ky_dao_tao: [],
      chu_ky_danh_gia: [],
      muc_tieu_danh_gia: [],
      ket_qua_danh_gia: [],
      luong_hop_dong: [],
      ky_tinh_luong: [],
      phieu_luong: [],
      quy_phep_nam: [],
      don_xin_nghi_phep: [],
      vw_phan_tich_phong_ban: []
    };

    this.initData();
  }

  async initData() {
    await this.syncFromSql();
  }

  async syncFromSql() {
    const tables = [
      'phong_ban', 'chuc_danh', 'nhan_vien', 'tai_khoan', 'tin_tuyen_dung',
      'ung_vien', 'ho_so_ung_tuyen', 'phong_van', 'khoa_hoc',
      'lich_dao_tao', 'dang_ky_dao_tao', 'chu_ky_danh_gia',
      'muc_tieu_danh_gia', 'ket_qua_danh_gia', 'luong_hop_dong',
      'ky_tinh_luong', 'phieu_luong', 'quy_phep_nam', 'don_xin_nghi_phep',
      'vw_phan_tich_phong_ban'
    ];

    for (const table of tables) {
      try {
        const res = await fetch(`${API_BASE_URL}/${table}`);
        if (res.ok) {
          const resData = await res.json();
          this.data[table] = Array.isArray(resData) ? resData : (resData ? [resData] : []);
        }
      } catch (err) {
        console.warn(`SQL Sync warning for ${table}:`, err);
      }
    }
  }

  get(tableName) {
    return this.data[tableName] || [];
  }

  getById(tableName, idKey, idVal) {
    const list = this.get(tableName);
    return list.find(item => item[idKey] == idVal) || null;
  }

  async insert(tableName, record) {
    this.data[tableName].unshift(record);
    try {
      await fetch(`${API_BASE_URL}/${tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
    } catch(e) {}
  }

  async update(tableName, idKey, idVal, updatedFields) {
    const list = this.get(tableName);
    const item = list.find(x => x[idKey] == idVal);
    if (item) {
      Object.assign(item, updatedFields);
      try {
        await fetch(`${API_BASE_URL}/${tableName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [idKey]: idVal, ...updatedFields })
        });
      } catch(e) {}
    }
  }

  async delete(tableName, idKey, idVal) {
    this.data[tableName] = this.get(tableName).filter(x => x[idKey] != idVal);
    try {
      await fetch(`${API_BASE_URL}/${tableName}?id=${idVal}`, {
        method: 'DELETE'
      });
    } catch(e) {}
  }

  getDepartmentAnalytics() {
    return this.get('vw_phan_tich_phong_ban');
  }

  resetToDefault() {
    this.syncFromSql();
  }
}

window.db = new DataStore();
