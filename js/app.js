/* ============================================================================
   HRMASTER PRO - APPLICATION LOGIC & SQL TAI_KHOAN AUTHENTICATION CONTROLLER
   ============================================================================ */

class HRApp {
  constructor() {
    this.currentView = 'view-dashboard';
    this.deptChart = null;
    this.leaveChart = null;
    this.currentUser = null;

    this.init();
  }

  init() {
    this.bindNavigation();
    this.bindThemeToggle();
    this.bindTabs();
    this.checkSession();
    this.populateSelectDropdowns();

    // Reset Data Listener
    document.getElementById('btn-reset-data')?.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn đồng bộ lại dữ liệu từ CSDL SQL Server QLNHANSU?')) {
        window.db.resetToDefault();
        this.populateSelectDropdowns();
        this.renderCurrentView();
        this.showToast('Đã đồng bộ lại dữ liệu CSDL SQL Server thành công!', 'success');
      }
    });

    // Global Search listener
    document.getElementById('global-search-input')?.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        const val = e.target.value.trim().toLowerCase();
        if (val) {
          this.navigateTo('view-employees');
          const searchEmpInput = document.getElementById('search-emp-input');
          if (searchEmpInput) {
            searchEmpInput.value = val;
            this.renderEmployeesTable();
          }
        }
      }
    });
  }

  // Auth Mode Switcher (1. Login vs 2. Register)
  switchAuthMode(mode) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('auth-tab-login');
    const tabReg = document.getElementById('auth-tab-register');

    if (mode === 'register') {
      loginForm.style.display = 'none';
      regForm.style.display = 'block';
      tabLogin.classList.remove('active');
      tabReg.classList.add('active');
    } else {
      regForm.style.display = 'none';
      loginForm.style.display = 'block';
      tabReg.classList.remove('active');
      tabLogin.classList.add('active');
    }
  }

  // Session & Authentication Controller
  checkSession() {
    const savedUser = localStorage.getItem('HRMASTER_CURRENT_USER');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        document.getElementById('login-screen')?.classList.remove('active');
        this.updateUserRoleUI();
        this.renderCurrentView();
        return;
      } catch(e) {}
    }

    // Require Login Modal
    this.currentUser = null;
    document.getElementById('login-screen')?.classList.add('active');
  }

  async handleLogin(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-password').value;

    if (!email || !pass) {
      this.showToast('Vui lòng nhập đầy đủ Email và Mật khẩu!', 'warning');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, mat_khau: pass })
      });

      if (res.ok) {
        const user = await res.json();
        this.currentUser = {
          email: user.email,
          name: user.ho && user.ten ? `${user.ho} ${user.ten}` : user.email.split('@')[0],
          role: user.vai_tro,
          roleTitle: this.getRoleTitle(user.vai_tro),
          avatar: (user.ten || user.email).substring(0, 2).toUpperCase(),
          empId: user.nhan_vien_id
        };

        localStorage.setItem('HRMASTER_CURRENT_USER', JSON.stringify(this.currentUser));
        document.getElementById('login-screen')?.classList.remove('active');
        
        await window.db.syncFromSql();
        this.updateUserRoleUI();
        this.renderCurrentView();
        this.showToast(`Đăng nhập thành công! Chào mừng ${this.currentUser.name} (${this.currentUser.roleTitle})`, 'success');
      } else {
        // Local fallback check
        const accs = window.db.get('tai_khoan');
        const match = accs.find(a => a.email.toLowerCase() === email && a.mat_khau === pass);
        if (match) {
          const emps = window.db.get('nhan_vien');
          const emp = emps.find(e => e.nhan_vien_id === match.nhan_vien_id);
          this.currentUser = {
            email: match.email,
            name: emp ? `${emp.ho} ${emp.ten}` : match.email.split('@')[0],
            role: match.vai_tro,
            roleTitle: this.getRoleTitle(match.vai_tro),
            avatar: (match.email).substring(0, 2).toUpperCase(),
            empId: match.nhan_vien_id
          };
          localStorage.setItem('HRMASTER_CURRENT_USER', JSON.stringify(this.currentUser));
          document.getElementById('login-screen')?.classList.remove('active');
          this.updateUserRoleUI();
          this.renderCurrentView();
          this.showToast(`Đăng nhập thành công với tài khoản ${this.currentUser.name}!`, 'success');
        } else {
          this.showToast('Email hoặc mật khẩu không chính xác trong CSDL SQL Server!', 'danger');
        }
      }
    } catch(err) {
      // Local fallback
      const accs = window.db.get('tai_khoan');
      const match = accs.find(a => a.email.toLowerCase() === email && a.mat_khau === pass);
      if (match) {
        this.currentUser = {
          email: match.email,
          name: match.email.split('@')[0],
          role: match.vai_tro,
          roleTitle: this.getRoleTitle(match.vai_tro),
          avatar: match.email.substring(0, 2).toUpperCase()
        };
        localStorage.setItem('HRMASTER_CURRENT_USER', JSON.stringify(this.currentUser));
        document.getElementById('login-screen')?.classList.remove('active');
        this.updateUserRoleUI();
        this.renderCurrentView();
        this.showToast('Đăng nhập thành công!', 'success');
      } else {
        this.showToast('Email hoặc mật khẩu không chính xác!', 'danger');
      }
    }
  }

  async handleRegister(e) {
    if (e) e.preventDefault();
    const regData = {
      ho: document.getElementById('reg-ho').value.trim(),
      ten: document.getElementById('reg-ten').value.trim(),
      email: document.getElementById('reg-email').value.trim().toLowerCase(),
      mat_khau: document.getElementById('reg-password').value,
      so_dien_thoai: document.getElementById('reg-phone').value.trim(),
      vai_tro: document.getElementById('reg-role').value
    };

    if (!regData.ho || !regData.ten || !regData.email || !regData.mat_khau) {
      this.showToast('Vui lòng điền đầy đủ thông tin đăng ký!', 'warning');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      });

      if (res.ok) {
        this.showToast(`Đăng ký thành công tài khoản ${regData.email} (${this.getRoleTitle(regData.vai_tro)}) vào SQL Server!`, 'success');
        await window.db.syncFromSql();
        
        // Auto login
        this.currentUser = {
          email: regData.email,
          name: `${regData.ho} ${regData.ten}`,
          role: regData.vai_tro,
          roleTitle: this.getRoleTitle(regData.vai_tro),
          avatar: regData.ten.substring(0, 2).toUpperCase()
        };
        localStorage.setItem('HRMASTER_CURRENT_USER', JSON.stringify(this.currentUser));
        document.getElementById('login-screen')?.classList.remove('active');
        this.updateUserRoleUI();
        this.renderCurrentView();
        return;
      } else {
        const err = await res.json();
        this.showToast(err.error || 'Đăng ký thất bại!', 'danger');
      }
    } catch(err) {
      // Local fallback register
      window.db.insert('tai_khoan', {
        tai_khoan_id: window.db.get('tai_khoan').length + 1,
        email: regData.email,
        mat_khau: regData.mat_khau,
        vai_tro: regData.vai_tro,
        ngay_tao: new Date().toISOString()
      });
      this.currentUser = {
        email: regData.email,
        name: `${regData.ho} ${regData.ten}`,
        role: regData.vai_tro,
        roleTitle: this.getRoleTitle(regData.vai_tro),
        avatar: regData.ten.substring(0, 2).toUpperCase()
      };
      localStorage.setItem('HRMASTER_CURRENT_USER', JSON.stringify(this.currentUser));
      document.getElementById('login-screen')?.classList.remove('active');
      this.updateUserRoleUI();
      this.renderCurrentView();
      this.showToast(`Đã đăng ký và đăng nhập thành công tài khoản ${regData.email}!`, 'success');
    }
  }

  handleLogout() {
    this.currentUser = null;
    localStorage.removeItem('HRMASTER_CURRENT_USER');
    document.getElementById('login-screen')?.classList.add('active');
    this.showToast('Đã đăng xuất khỏi hệ thống thành công!', 'info');
  }

  getRoleTitle(roleKey) {
    switch(roleKey) {
      case 'ADMIN': return 'HR Admin (Quản Trị Viên)';
      case 'CEO': return 'Giám Đốc (CEO)';
      case 'MANAGER': return 'Trưởng Phòng';
      default: return 'Nhân Viên';
    }
  }

  updateUserRoleUI() {
    if (!this.currentUser) return;

    const avatarEl = document.getElementById('sidebar-avatar');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const badgeEl = document.getElementById('header-user-badge');

    if (avatarEl) avatarEl.innerText = this.currentUser.avatar;
    if (nameEl) nameEl.innerText = this.currentUser.name;
    if (roleEl) roleEl.innerText = this.currentUser.roleTitle;
    if (badgeEl) {
      let icon = this.currentUser.role === 'ADMIN' ? 'fa-user-shield' : 
                (this.currentUser.role === 'CEO' ? 'fa-user-tie' : 
                (this.currentUser.role === 'MANAGER' ? 'fa-user-gear' : 'fa-user'));
      badgeEl.innerHTML = `<i class="fa-solid ${icon}"></i> ${this.currentUser.roleTitle}`;
    }
  }

  formatDate(val) {
    if (!val) return '---';
    if (typeof val === 'string' && val.includes('/Date(')) {
      const ms = parseInt(val.replace(/\/Date\((-?\d+)\)\//, '$1'));
      if (!isNaN(ms)) {
        const d = new Date(ms);
        return d.toISOString().split('T')[0];
      }
    }
    if (typeof val === 'string' && val.includes('T')) {
      return val.split('T')[0];
    }
    return val;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'danger' ? 'fa-circle-xmark' : 'fa-circle-info');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  bindNavigation() {
    const navItems = document.querySelectorAll('.sidebar .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-target');
        if (targetView) {
          this.navigateTo(targetView);
        }
      });
    });
  }

  navigateTo(viewId) {
    this.currentView = viewId;

    document.querySelectorAll('.sidebar .nav-item').forEach(el => {
      if (el.getAttribute('data-target') === viewId) {
        el.classList.add('active');
        const titleEl = document.getElementById('current-page-title');
        if (titleEl) titleEl.innerText = el.querySelector('span')?.innerText || 'Dashboard';
      } else {
        el.classList.remove('active');
      }
    });

    document.querySelectorAll('.view-page').forEach(page => {
      page.classList.remove('active');
    });

    const activePage = document.getElementById(viewId);
    if (activePage) {
      activePage.classList.add('active');
    }

    this.renderCurrentView();
  }

  bindThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      
      toggleBtn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      this.showToast(`Đã chuyển sang Chế độ ${newTheme === 'dark' ? 'Tối (Dark Mode)' : 'Sáng (Light Mode)'}`, 'info');

      if (this.currentView === 'view-dashboard') {
        this.renderDashboardCharts();
      }
    });
  }

  bindTabs() {
    document.querySelectorAll('.tabs-header .tab-item').forEach(tab => {
      tab.addEventListener('click', () => {
        const parentSection = tab.closest('.view-page');
        if (!parentSection) return;

        parentSection.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const targetTabId = tab.getAttribute('data-tab');
        parentSection.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        const targetContent = document.getElementById(targetTabId);
        if (targetContent) targetContent.style.display = 'block';
      });
    });
  }

  populateSelectDropdowns() {
    const depts = window.db.get('phong_ban');
    const jobs = window.db.get('chuc_danh');
    const emps = window.db.get('nhan_vien');

    const filterDept = document.getElementById('filter-emp-dept');
    if (filterDept) {
      filterDept.innerHTML = '<option value="">-- Tất cả phòng ban --</option>' +
        depts.map(d => `<option value="${d.phong_ban_id}">${d.ten_phong_ban}</option>`).join('');
    }

    const empDeptSelect = document.getElementById('emp-dept-id');
    if (empDeptSelect) {
      empDeptSelect.innerHTML = depts.map(d => `<option value="${d.phong_ban_id}">${d.ten_phong_ban}</option>`).join('');
    }

    const empJobSelect = document.getElementById('emp-job-id');
    if (empJobSelect) {
      empJobSelect.innerHTML = jobs.map(j => `<option value="${j.chuc_danh_id}">${j.ten_chuc_danh}</option>`).join('');
    }

    const empManagerSelect = document.getElementById('emp-manager-id');
    if (empManagerSelect) {
      empManagerSelect.innerHTML = '<option value="">-- Không có (Trực thuộc BGD) --</option>' +
        emps.map(e => `<option value="${e.nhan_vien_id}">${e.ho} ${e.ten} (${e.ma_nhan_vien})</option>`).join('');
    }

    const deptParentSelect = document.getElementById('dept-parent-id');
    if (deptParentSelect) {
      deptParentSelect.innerHTML = '<option value="">-- Không có (Phòng ban Cấp cao) --</option>' +
        depts.map(d => `<option value="${d.phong_ban_id}">${d.ten_phong_ban}</option>`).join('');
    }

    const jobPostDeptSelect = document.getElementById('jobpost-dept-id');
    if (jobPostDeptSelect) {
      jobPostDeptSelect.innerHTML = depts.map(d => `<option value="${d.phong_ban_id}">${d.ten_phong_ban}</option>`).join('');
    }

    const leaveEmpSelect = document.getElementById('leave-emp-id');
    if (leaveEmpSelect) {
      leaveEmpSelect.innerHTML = emps.map(e => `<option value="${e.nhan_vien_id}">${e.ho} ${e.ten} (${e.ma_nhan_vien})</option>`).join('');
    }
  }

  renderCurrentView() {
    switch (this.currentView) {
      case 'view-dashboard':
        this.renderDashboard();
        break;
      case 'view-employees':
        this.renderEmployeesTable();
        break;
      case 'view-accounts':
        this.renderAccounts();
        break;
      case 'view-departments':
        this.renderDepartments();
        break;
      case 'view-jobs':
        this.renderJobs();
        break;
      case 'view-recruitment-jobs':
      case 'view-recruitment-candidates':
      case 'view-recruitment-interviews':
        this.renderRecruitment();
        break;
      case 'view-training-courses':
        this.renderTraining();
        break;
      case 'view-kpi-objectives':
        this.renderKPI();
        break;
      case 'view-payroll-slips':
      case 'view-payroll-contracts':
        this.renderPayroll();
        break;
      case 'view-leave-requests':
        this.renderLeave();
        break;
    }
  }

  // ============================================================================
  // 0. DASHBOARD RENDERER & CHARTS
  // ============================================================================
  renderDashboard() {
    const emps = window.db.get('nhan_vien');
    const jobs = window.db.get('tin_tuyen_dung');
    const leaves = window.db.get('don_xin_nghi_phep');
    const analytics = window.db.getDepartmentAnalytics();

    const totalStaff = emps.length;
    let totalBaseSal = 0;
    const contracts = window.db.get('luong_hop_dong');
    contracts.forEach(c => totalBaseSal += Number(c.luong_co_ban));
    const avgSalary = contracts.length ? Math.round(totalBaseSal / contracts.length) : 0;
    const openJobs = jobs.filter(j => j.trang_thai === 'DANG_TIN').length;
    const pendingLeaves = leaves.filter(l => l.trang_thai === 'CHO_DUYET').length;

    document.getElementById('stat-total-employees').innerText = totalStaff;
    document.getElementById('stat-avg-salary').innerText = this.formatMoney(avgSalary);
    document.getElementById('stat-open-jobs').innerText = openJobs;
    document.getElementById('stat-pending-leaves').innerText = pendingLeaves;

    const tbody = document.querySelector('#table-vw-phan-tich tbody');
    if (tbody) {
      tbody.innerHTML = analytics.map(a => `
        <tr>
          <td><strong style="color:var(--primary);">${a.ma_phong_ban}</strong></td>
          <td><strong>${a.ten_phong_ban}</strong></td>
          <td><span class="badge badge-neutral">${a.tong_so_nhan_vien} nhân sự</span></td>
          <td><span class="badge badge-success">${a.nhan_vien_dang_lam} đang làm</span></td>
          <td><strong style="color:var(--success);">${this.formatMoney(a.luong_co_ban_trung_binh)}</strong></td>
        </tr>
      `).join('');
    }

    this.renderDashboardCharts();
  }

  renderDashboardCharts() {
    const analytics = window.db.getDepartmentAnalytics();
    const leaves = window.db.get('don_xin_nghi_phep');

    const ctxDept = document.getElementById('chart-dept-analytics')?.getContext('2d');
    if (ctxDept) {
      if (this.deptChart) this.deptChart.destroy();
      this.deptChart = new Chart(ctxDept, {
        type: 'bar',
        data: {
          labels: analytics.map(a => a.ten_phong_ban),
          datasets: [
            {
              label: 'Tổng số NV',
              data: analytics.map(a => a.tong_so_nhan_vien),
              backgroundColor: '#4f46e5',
              borderRadius: 6
            },
            {
              label: 'Lương TB (Triệu VNĐ)',
              data: analytics.map(a => Math.round(a.luong_co_ban_trung_binh / 1000000)),
              backgroundColor: '#06b6d4',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }

    const ctxLeave = document.getElementById('chart-leave-status')?.getContext('2d');
    if (ctxLeave) {
      if (this.leaveChart) this.leaveChart.destroy();
      const approved = leaves.filter(l => l.trang_thai === 'DA_DUYET').length;
      const pending = leaves.filter(l => l.trang_thai === 'CHO_DUYET').length;
      const rejected = leaves.filter(l => l.trang_thai === 'TU_CHUOI').length;

      this.leaveChart = new Chart(ctxLeave, {
        type: 'doughnut',
        data: {
          labels: ['Đã Duyệt', 'Chờ Duyệt', 'Từ Chối'],
          datasets: [{
            data: [approved || 1, pending, rejected],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  // ============================================================================
  // 1. CORE HR & TAI_KHOAN TABLE RENDERER
  // ============================================================================
  renderAccounts() {
    const accounts = window.db.get('tai_khoan');
    const emps = window.db.get('nhan_vien');

    const tbody = document.querySelector('#table-accounts tbody');
    if (!tbody) return;

    if (accounts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:24px;">Không có tài khoản nào trong SQL Server</td></tr>`;
      return;
    }

    tbody.innerHTML = accounts.map(acc => {
      const emp = emps.find(e => e.nhan_vien_id === acc.nhan_vien_id);
      let roleBadge = acc.vai_tro === 'ADMIN' ? '<span class="badge badge-primary"><i class="fa-solid fa-user-shield"></i> HR Admin</span>' :
                     (acc.vai_tro === 'CEO' ? '<span class="badge badge-warning"><i class="fa-solid fa-user-tie"></i> Giám Đốc (CEO)</span>' :
                     (acc.vai_tro === 'MANAGER' ? '<span class="badge badge-info"><i class="fa-solid fa-user-gear"></i> Trưởng Phòng</span>' :
                     '<span class="badge badge-neutral"><i class="fa-solid fa-user"></i> Nhân Viên</span>'));

      return `
        <tr>
          <td>${acc.tai_khoan_id}</td>
          <td><strong style="color:var(--primary);">${acc.email}</strong></td>
          <td><code style="background:var(--bg-tertiary); padding:2px 6px; border-radius:4px;">${acc.mat_khau}</code></td>
          <td>${roleBadge}</td>
          <td>${emp ? `<strong>${emp.ho} ${emp.ten}</strong> (${emp.ma_nhan_vien})` : '<em style="color:var(--text-muted)">Không gán nhân viên</em>'}</td>
          <td>${this.formatDate(acc.ngay_tao)}</td>
        </tr>
      `;
    }).join('');
  }

  renderEmployeesTable() {
    const filterDept = document.getElementById('filter-emp-dept')?.value;
    const filterStatus = document.getElementById('filter-emp-status')?.value;
    const searchVal = document.getElementById('search-emp-input')?.value.toLowerCase().trim();

    let emps = window.db.get('nhan_vien');
    const depts = window.db.get('phong_ban');
    const jobs = window.db.get('chuc_danh');

    if (filterDept) emps = emps.filter(e => e.phong_ban_id == filterDept);
    if (filterStatus) emps = emps.filter(e => e.trang_thai === filterStatus);
    if (searchVal) {
      emps = emps.filter(e => 
        e.ma_nhan_vien.toLowerCase().includes(searchVal) ||
        `${e.ho} ${e.ten}`.toLowerCase().includes(searchVal) ||
        e.email.toLowerCase().includes(searchVal)
      );
    }

    const tbody = document.querySelector('#table-employees tbody');
    if (!tbody) return;

    if (emps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--text-muted); padding:24px;">Không tìm thấy nhân viên phù hợp</td></tr>`;
      return;
    }

    tbody.innerHTML = emps.map(emp => {
      const dept = depts.find(d => d.phong_ban_id == emp.phong_ban_id);
      const job = jobs.find(j => j.chuc_danh_id == emp.chuc_danh_id);
      const mgr = window.db.getById('nhan_vien', 'nhan_vien_id', emp.quan_ly_id);

      let statusBadge = '';
      if (emp.trang_thai === 'DANG_LAM') statusBadge = '<span class="badge badge-success"><span class="badge-dot"></span>Đang Làm</span>';
      else if (emp.trang_thai === 'NGHI_PHEP') statusBadge = '<span class="badge badge-warning"><span class="badge-dot"></span>Nghỉ Phép</span>';
      else statusBadge = '<span class="badge badge-danger"><span class="badge-dot"></span>Đã Nghỉ</span>';

      return `
        <tr>
          <td><strong style="color:var(--primary);">${emp.ma_nhan_vien}</strong></td>
          <td><strong>${emp.ho} ${emp.ten}</strong></td>
          <td>${emp.email}</td>
          <td>${emp.so_dien_thoai || '---'}</td>
          <td>${dept ? dept.ten_phong_ban : '---'}</td>
          <td>${job ? job.ten_chuc_danh : '---'}</td>
          <td>${mgr ? `${mgr.ho} ${mgr.ten}` : '<em style="color:var(--text-muted)">Không có</em>'}</td>
          <td>${this.formatDate(emp.ngay_vao_lam)}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="window.app.editEmployee('${emp.nhan_vien_id}')" title="Chỉnh sửa"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-sm btn-danger" onclick="window.app.deleteEmployee('${emp.nhan_vien_id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  }

  openEmployeeModal(empId = null) {
    this.populateSelectDropdowns();
    const modal = document.getElementById('modal-employee');
    const title = document.getElementById('modal-emp-title');
    const form = document.getElementById('form-employee');
    form.reset();

    if (empId) {
      const emp = window.db.getById('nhan_vien', 'nhan_vien_id', empId);
      if (emp) {
        title.innerText = 'Chỉnh Sửa Hồ Sơ Nhân Viên';
        document.getElementById('emp-id').value = emp.nhan_vien_id;
        document.getElementById('emp-code').value = emp.ma_nhan_vien;
        document.getElementById('emp-last-name').value = emp.ho;
        document.getElementById('emp-first-name').value = emp.ten;
        document.getElementById('emp-email').value = emp.email;
        document.getElementById('emp-phone').value = emp.so_dien_thoai || '';
        document.getElementById('emp-dept-id').value = emp.phong_ban_id;
        document.getElementById('emp-job-id').value = emp.chuc_danh_id;
        document.getElementById('emp-manager-id').value = emp.quan_ly_id || '';
        document.getElementById('emp-start-date').value = this.formatDate(emp.ngay_vao_lam);
        document.getElementById('emp-status').value = emp.trang_thai;
      }
    } else {
      title.innerText = 'Thêm Nhân Viên Mới';
      document.getElementById('emp-id').value = '';
      document.getElementById('emp-code').value = 'NV' + String(window.db.get('nhan_vien').length + 1).padStart(3, '0');
    }

    modal.classList.add('active');
  }

  saveEmployee() {
    const id = document.getElementById('emp-id').value;
    const empData = {
      ma_nhan_vien: document.getElementById('emp-code').value,
      ho: document.getElementById('emp-last-name').value,
      ten: document.getElementById('emp-first-name').value,
      email: document.getElementById('emp-email').value,
      so_dien_thoai: document.getElementById('emp-phone').value,
      phong_ban_id: Number(document.getElementById('emp-dept-id').value),
      chuc_danh_id: Number(document.getElementById('emp-job-id').value),
      quan_ly_id: document.getElementById('emp-manager-id').value || null,
      ngay_vao_lam: document.getElementById('emp-start-date').value,
      trang_thai: document.getElementById('emp-status').value
    };

    if (id) {
      window.db.update('nhan_vien', 'nhan_vien_id', id, empData);
      this.showToast('Cập nhật nhân viên thành công!', 'success');
    } else {
      empData.nhan_vien_id = 'nv-uuid-' + Date.now();
      window.db.insert('nhan_vien', empData);
      
      window.db.insert('luong_hop_dong', {
        nhan_vien_id: empData.nhan_vien_id,
        luong_co_ban: 15000000,
        ngay_ap_dung: empData.ngay_vao_lam,
        loai_tien: 'VND'
      });
      window.db.insert('quy_phep_nam', {
        nhan_vien_id: empData.nhan_vien_id,
        nam: 2026,
        tong_phep_nam: 12,
        phep_nam_da_dung: 0,
        phep_om_da_dung: 0
      });
      this.showToast('Thêm nhân viên mới thành công!', 'success');
    }

    this.closeModal('modal-employee');
    this.renderEmployeesTable();
  }

  deleteEmployee(empId) {
    if (confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      window.db.delete('nhan_vien', 'nhan_vien_id', empId);
      this.showToast('Đã xóa nhân viên thành công!', 'warning');
      this.renderEmployeesTable();
    }
  }

  editEmployee(empId) {
    this.openEmployeeModal(empId);
  }

  renderDepartments() {
    const depts = window.db.get('phong_ban');
    const tbody = document.querySelector('#table-departments tbody');
    if (tbody) {
      tbody.innerHTML = depts.map(d => {
        const parent = depts.find(p => p.phong_ban_id == d.phong_ban_id_cha || p.phong_ban_id == d.phong_ban_cha_id);
        return `
          <tr>
            <td>${d.phong_ban_id}</td>
            <td><strong style="color:var(--primary);">${d.ma_phong_ban}</strong></td>
            <td><strong>${d.ten_phong_ban}</strong></td>
            <td>${parent ? parent.ten_phong_ban : '<em style="color:var(--text-muted)">Cấp Cao Trực Thuộc</em>'}</td>
            <td>${this.formatDate(d.ngay_tao)}</td>
            <td>
              <button class="btn btn-sm btn-secondary" onclick="window.app.openDepartmentModal(${d.phong_ban_id})"><i class="fa-solid fa-pen"></i></button>
            </td>
          </tr>
        `;
      }).join('');
    }

    const treeContainer = document.getElementById('org-tree-container');
    if (treeContainer) {
      const topDepts = depts.filter(d => !d.phong_ban_cha_id && !d.phong_ban_id_cha);
      const subDepts = depts.filter(d => d.phong_ban_cha_id || d.phong_ban_id_cha);

      let html = '';
      topDepts.forEach(top => {
        html += `
          <div class="org-node" style="border-left:4px solid var(--primary);">
            <div>
              <strong><i class="fa-solid fa-building"></i> ${top.ten_phong_ban} (${top.ma_phong_ban})</strong><br>
              <small style="color:var(--text-muted)">Phòng Ban Điều Hành Cấp Cao</small>
            </div>
            <span class="badge badge-info">Cấp 1</span>
          </div>
        `;
        subDepts.forEach(sub => {
          html += `
            <div class="org-node sub-node">
              <div>
                <strong><i class="fa-solid fa-sitemap"></i> ${sub.ten_phong_ban} (${sub.ma_phong_ban})</strong><br>
                <small style="color:var(--text-muted)">Trực thuộc: ${top.ten_phong_ban}</small>
              </div>
              <span class="badge badge-neutral">Cấp 2</span>
            </div>
          `;
        });
      });
      treeContainer.innerHTML = html;
    }
  }

  openDepartmentModal(deptId = null) {
    this.populateSelectDropdowns();
    const modal = document.getElementById('modal-department');
    document.getElementById('form-department').reset();
    document.getElementById('dept-id').value = deptId || '';

    if (deptId) {
      const dept = window.db.getById('phong_ban', 'phong_ban_id', deptId);
      if (dept) {
        document.getElementById('dept-code').value = dept.ma_phong_ban;
        document.getElementById('dept-name').value = dept.ten_phong_ban;
        document.getElementById('dept-parent-id').value = dept.phong_ban_cha_id || '';
      }
    }
    modal.classList.add('active');
  }

  saveDepartment() {
    const id = document.getElementById('dept-id').value;
    const data = {
      ma_phong_ban: document.getElementById('dept-code').value,
      ten_phong_ban: document.getElementById('dept-name').value,
      phong_ban_cha_id: Number(document.getElementById('dept-parent-id').value) || null
    };

    if (id) {
      window.db.update('phong_ban', 'phong_ban_id', id, data);
      this.showToast('Cập nhật phòng ban thành công!', 'success');
    } else {
      data.phong_ban_id = window.db.get('phong_ban').length + 1;
      data.ngay_tao = new Date().toISOString().split('T')[0];
      window.db.insert('phong_ban', data);
      this.showToast('Tạo phòng ban mới thành công!', 'success');
    }

    this.closeModal('modal-department');
    this.renderDepartments();
  }

  renderJobs() {
    const jobs = window.db.get('chuc_danh');
    const tbody = document.querySelector('#table-jobs tbody');
    if (tbody) {
      tbody.innerHTML = jobs.map(j => `
        <tr>
          <td>${j.chuc_danh_id}</td>
          <td><strong style="color:var(--primary);">${j.ma_chuc_danh}</strong></td>
          <td><strong>${j.ten_chuc_danh}</strong></td>
          <td>${j.mo_ta || '---'}</td>
          <td>${this.formatDate(j.ngay_tao)}</td>
          <td>
            <button class="btn btn-sm btn-secondary"><i class="fa-solid fa-pen"></i></button>
          </td>
        </tr>
      `).join('');
    }
  }

  // ============================================================================
  // 2. RECRUITMENT MODULE
  // ============================================================================
  renderRecruitment() {
    const postings = window.db.get('tin_tuyen_dung');
    const depts = window.db.get('phong_ban');
    const tbodyJob = document.querySelector('#table-job-postings tbody');
    if (tbodyJob) {
      tbodyJob.innerHTML = postings.map(p => {
        const dept = depts.find(d => d.phong_ban_id == p.phong_ban_id);
        let badge = p.trang_thai === 'DANG_TIN' ? '<span class="badge badge-success"><span class="badge-dot"></span>Đang Đăng</span>' :
                   (p.trang_thai === 'NHAP' ? '<span class="badge badge-warning"><span class="badge-dot"></span>Bản Nháp</span>' : '<span class="badge badge-neutral">Đã Đóng</span>');
        return `
          <tr>
            <td>${p.tin_tuyen_dung_id}</td>
            <td><strong>${p.tieu_de}</strong></td>
            <td>${dept ? dept.ten_phong_ban : '---'}</td>
            <td><span class="badge badge-info">${p.so_luong_tuyen} chỉ tiêu</span></td>
            <td><strong style="color:var(--success);">${p.muc_luong_du_kien}</strong></td>
            <td>${this.formatDate(p.ngay_dang)}</td>
            <td>${this.formatDate(p.ngay_het_han)}</td>
            <td>${badge}</td>
            <td>
              <button class="btn btn-sm btn-secondary" onclick="window.app.toggleJobPostingStatus(${p.tin_tuyen_dung_id})"><i class="fa-solid fa-repeat"></i> Đổi Trạng Thái</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    const kanban = document.getElementById('recruitment-kanban');
    if (kanban) {
      const stages = [
        { key: 'DA_NHAN', title: '1. Đã Nhận Hồ Sơ', color: 'var(--info)' },
        { key: 'SO_TUYEN', title: '2. Sơ Tuyển CV', color: 'var(--accent-purple)' },
        { key: 'PHONG_VAN', title: '3. Lịch Phỏng Vấn', color: 'var(--accent-amber)' },
        { key: 'DE_NGHI', title: '4. Đề Nghị (Offer)', color: 'var(--success)' },
        { key: 'TU_CHUOI', title: '5. Từ Chối', color: 'var(--danger)' }
      ];

      const apps = window.db.get('ho_so_ung_tuyen');
      const candidates = window.db.get('ung_vien');

      kanban.innerHTML = stages.map(stg => {
        const stageApps = apps.filter(a => a.trang_thai === stg.key);
        const cardsHtml = stageApps.map(a => {
          const cand = candidates.find(c => c.ung_vien_id == a.ung_vien_id);
          const job = postings.find(j => j.tin_tuyen_dung_id == a.tin_tuyen_dung_id);
          return `
            <div class="kanban-card" onclick="window.app.moveCandidateNextStage(${a.ho_so_id}, '${a.trang_thai}')">
              <div class="kanban-card-title">${cand ? `${cand.ho} ${cand.ten}` : 'Ứng viên'}</div>
              <div style="font-size:12px; color:var(--primary); font-weight:600;">${job ? job.tieu_de : ''}</div>
              <div class="kanban-card-meta">
                <span><i class="fa-solid fa-envelope"></i> ${cand ? cand.email : ''}</span>
                <span><i class="fa-solid fa-phone"></i> ${cand ? cand.so_dien_thoai : ''}</span>
                <span><i class="fa-solid fa-calendar"></i> Nộp: ${this.formatDate(a.ngay_nop)}</span>
              </div>
              <div style="margin-top:10px; text-align:right;">
                <span class="badge badge-neutral" style="font-size:10px;"><i class="fa-solid fa-arrow-right"></i> Chuyển Bước</span>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="kanban-column">
            <div class="kanban-column-header">
              <h4 style="color:${stg.color}">${stg.title}</h4>
              <span class="kanban-count">${stageApps.length}</span>
            </div>
            <div class="kanban-cards-container">
              ${cardsHtml || '<div style="font-size:12px; color:var(--text-muted); text-align:center; margin-top:20px;">Trống</div>'}
            </div>
          </div>
        `;
      }).join('');
    }

    const interviews = window.db.get('phong_van');
    const tbodyInt = document.querySelector('#table-interviews tbody');
    if (tbodyInt) {
      tbodyInt.innerHTML = interviews.map(i => {
        const app = window.db.getById('ho_so_ung_tuyen', 'ho_so_id', i.ho_so_id);
        const cand = app ? window.db.getById('ung_vien', 'ung_vien_id', app.ung_vien_id) : null;
        const interviewer = window.db.getById('nhan_vien', 'nhan_vien_id', i.nguoi_phong_van_id);

        let resBadge = i.ket_qua === 'DAT' ? '<span class="badge badge-success">ĐẠT (Passed)</span>' :
                      (i.ket_qua === 'KHONG_DAT' ? '<span class="badge badge-danger">KHÔNG ĐẠT</span>' : '<span class="badge badge-warning">Chờ Kết Quả</span>');

        return `
          <tr>
            <td>${i.phong_van_id}</td>
            <td><strong>${cand ? `${cand.ho} ${cand.ten}` : 'Ứng viên'}</strong></td>
            <td>${interviewer ? `${interviewer.ho} ${interviewer.ten}` : '---'}</td>
            <td><strong style="color:var(--primary);">${this.formatDate(i.thoi_gian_phong_van)}</strong></td>
            <td>${i.dia_diem_hoac_link}</td>
            <td>${i.danh_gia || '<em>Chưa ghi nhận đánh giá</em>'}</td>
            <td>${resBadge}</td>
            <td>
              <button class="btn btn-sm btn-success" onclick="window.app.recordInterviewResult(${i.phong_van_id}, 'DAT')"><i class="fa-solid fa-check"></i> Đạt</button>
              <button class="btn btn-sm btn-danger" onclick="window.app.recordInterviewResult(${i.phong_van_id}, 'KHONG_DAT')"><i class="fa-solid fa-xmark"></i> Không Đạt</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  moveCandidateNextStage(hoSoId, currentStage) {
    const flow = ['DA_NHAN', 'SO_TUYEN', 'PHONG_VAN', 'DE_NGHI', 'TU_CHUOI'];
    const nextIdx = (flow.indexOf(currentStage) + 1) % flow.length;
    const nextStage = flow[nextIdx];

    window.db.update('ho_so_ung_tuyen', 'ho_so_id', hoSoId, { trang_thai: nextStage });
    this.showToast(`Đã chuyển ứng viên sang bước: ${nextStage}`, 'info');
    this.renderRecruitment();
  }

  recordInterviewResult(pvId, result) {
    window.db.update('phong_van', 'phong_van_id', pvId, { ket_qua: result });
    this.showToast(`Ghi nhận kết quả phỏng vấn: ${result}`, 'success');
    this.renderRecruitment();
  }

  openJobPostingModal() {
    this.populateSelectDropdowns();
    this.openModal('modal-job-posting');
  }

  saveJobPosting() {
    const data = {
      tieu_de: document.getElementById('jobpost-title').value,
      phong_ban_id: Number(document.getElementById('jobpost-dept-id').value),
      so_luong_tuyen: Number(document.getElementById('jobpost-count').value),
      muc_luong_du_kien: document.getElementById('jobpost-salary').value,
      ngay_het_han: document.getElementById('jobpost-deadline').value,
      mo_ta_cong_viec: document.getElementById('jobpost-desc').value,
      trang_thai: 'DANG_TIN',
      ngay_dang: new Date().toISOString().split('T')[0]
    };
    data.tin_tuyen_dung_id = window.db.get('tin_tuyen_dung').length + 1;
    window.db.insert('tin_tuyen_dung', data);

    this.showToast('Đã đăng tin tuyển dụng mới thành công!', 'success');
    this.closeModal('modal-job-posting');
    this.renderRecruitment();
  }

  toggleJobPostingStatus(jobId) {
    const job = window.db.getById('tin_tuyen_dung', 'tin_tuyen_dung_id', jobId);
    if (job) {
      const next = job.trang_thai === 'DANG_TIN' ? 'DONG' : 'DANG_TIN';
      window.db.update('tin_tuyen_dung', 'tin_tuyen_dung_id', jobId, { trang_thai: next });
      this.showToast(`Đã đổi trạng thái tin sang: ${next}`, 'info');
      this.renderRecruitment();
    }
  }

  // ============================================================================
  // 3. TRAINING MODULE
  // ============================================================================
  renderTraining() {
    const courses = window.db.get('khoa_hoc');
    const classes = window.db.get('lich_dao_tao');
    let enrollments = window.db.get('dang_ky_dao_tao');
    const emps = window.db.get('nhan_vien');

    const tbodyCourses = document.querySelector('#table-courses tbody');
    if (tbodyCourses) {
      tbodyCourses.innerHTML = courses.map(c => {
        const cls = classes.find(l => l.khoa_hoc_id == c.khoa_hoc_id);
        let clsBadge = cls ? (cls.trang_thai === 'DANG_DIEN_RA' ? '<span class="badge badge-success">Đang Diễn Ra</span>' : '<span class="badge badge-info">Kế Hoạch</span>') : '<span class="badge badge-neutral">Chưa có lịch</span>';
        return `
          <tr>
            <td><strong style="color:var(--primary);">${c.ma_khoa_hoc}</strong></td>
            <td><strong>${c.ten_khoa_hoc}</strong><br><small style="color:var(--text-muted);">${c.mo_ta}</small></td>
            <td><span class="badge badge-neutral">${c.thoi_luong_gio} giờ học</span></td>
            <td>${cls ? `<strong>${cls.ten_giang_vien}</strong><br><small>${this.formatDate(cls.ngay_bat_dau)} đến ${this.formatDate(cls.ngay_ket_thuc)}</small>` : '---'}</td>
            <td>${clsBadge}</td>
            <td>
              <button class="btn btn-sm btn-primary" onclick="window.app.showToast('Khóa học đang mở đăng ký', 'info')"><i class="fa-solid fa-eye"></i> Chi Tiết</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    const tbodyEnroll = document.querySelector('#table-enrollments tbody');
    if (tbodyEnroll) {
      tbodyEnroll.innerHTML = enrollments.map(e => {
        const cls = classes.find(l => l.lich_dao_tao_id == e.lich_dao_tao_id);
        const course = cls ? courses.find(c => c.khoa_hoc_id == cls.khoa_hoc_id) : null;
        const emp = emps.find(nv => nv.nhan_vien_id === e.nhan_vien_id);

        return `
          <tr>
            <td><strong>${course ? course.ten_khoa_hoc : 'Lớp Đào Tạo'}</strong></td>
            <td><strong>${emp ? `${emp.ho} ${emp.ten}` : 'Nhân viên'}</strong></td>
            <td><span class="badge badge-success">${e.trang_thai}</span></td>
            <td><strong style="color:var(--primary);">${e.diem_so ? `${e.diem_so} điểm` : '---'}</strong></td>
            <td><code style="background:var(--bg-tertiary); padding:2px 6px; border-radius:4px;">${e.ma_chung_chi || 'Chưa cấp'}</code></td>
            <td>${this.formatDate(e.ngay_cap_chung_chi)}</td>
            <td>
              ${!e.ma_chung_chi ? `<button class="btn btn-sm btn-success" onclick="window.app.issueCertificate(${e.dang_ky_id})"><i class="fa-solid fa-certificate"></i> Cấp Chứng Chỉ</button>` : '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Đã Cấp</span>'}
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  issueCertificate(dangKyId) {
    const certCode = 'CERT-2026-' + Math.floor(1000 + Math.random() * 9000);
    const today = new Date().toISOString().split('T')[0];
    window.db.update('dang_ky_dao_tao', 'dang_ky_id', dangKyId, {
      trang_thai: 'HOAN_THANH',
      ma_chung_chi: certCode,
      ngay_cap_chung_chi: today,
      diem_so: 90.0
    });

    this.showToast(`Đã hoàn thành khóa học & cấp mã chứng chỉ ${certCode}`, 'success');
    this.renderTraining();
  }

  // ============================================================================
  // 4. PERFORMANCE EVALUATION (KPI / OKR)
  // ============================================================================
  renderKPI() {
    let objectives = window.db.get('muc_tieu_danh_gia');
    let results = window.db.get('ket_qua_danh_gia');
    const emps = window.db.get('nhan_vien');

    const tbodyObj = document.querySelector('#table-kpi-objectives tbody');
    if (tbodyObj) {
      tbodyObj.innerHTML = objectives.map(o => {
        const emp = emps.find(e => e.nhan_vien_id === o.nhan_vien_id);
        const percent = Math.min(100, Math.round((o.thuc_te / o.chi_tieu) * 100));

        return `
          <tr>
            <td><strong>${emp ? `${emp.ho} ${emp.ten}` : 'Nhân viên'}</strong></td>
            <td><span class="badge badge-neutral">${o.loai_muc_tieu}</span></td>
            <td><strong>${o.tieu_de}</strong></td>
            <td>${o.trong_so}%</td>
            <td>${o.thuc_te} / ${o.chi_tieu}</td>
            <td>
              <div class="kpi-progress-wrapper">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width:${percent}%;"></div>
                </div>
                <span class="progress-percent">${percent}%</span>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    const tbodyRes = document.querySelector('#table-kpi-results tbody');
    if (tbodyRes) {
      tbodyRes.innerHTML = results.map(r => {
        const emp = emps.find(e => e.nhan_vien_id === r.nhan_vien_id);
        let badge = r.trang_thai === 'PHE_DUYET' ? '<span class="badge badge-success">Đã Phê Duyệt</span>' : '<span class="badge badge-warning">Đã Nộp (Chờ Duyệt)</span>';

        return `
          <tr>
            <td><strong>${emp ? `${emp.ho} ${emp.ten}` : 'Nhân viên'}</strong></td>
            <td>${r.diem_tu_danh_gia} đ</td>
            <td><strong style="color:var(--primary); font-size:16px;">${r.diem_chinh_thuc} đ</strong></td>
            <td>${badge}</td>
            <td>
              ${r.trang_thai !== 'PHE_DUYET' ? `<button class="btn btn-sm btn-primary" onclick="window.app.approveKpiResult(${r.danh_gia_id})"><i class="fa-solid fa-circle-check"></i> Phê Duyệt</button>` : '<span class="badge badge-neutral"><i class="fa-solid fa-check-double"></i> Hoàn tất</span>'}
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  approveKpiResult(id) {
    window.db.update('ket_qua_danh_gia', 'danh_gia_id', id, { trang_thai: 'PHE_DUYET' });
    this.showToast('Đã phê duyệt kết quả đánh giá KPI!', 'success');
    this.renderKPI();
  }

  // ============================================================================
  // 5. PAYROLL & COMPENSATION
  // ============================================================================
  renderPayroll() {
    const contracts = window.db.get('luong_hop_dong');
    let slips = window.db.get('phieu_luong');
    const periods = window.db.get('ky_tinh_luong');
    const emps = window.db.get('nhan_vien');
    const depts = window.db.get('phong_ban');

    const periodSelect = document.getElementById('filter-payroll-period');
    if (periodSelect) {
      periodSelect.innerHTML = periods.map(p => `<option value="${p.ky_luong_id}">Kỳ Lương Tháng ${p.thang}/${p.nam} (${p.trang_thai})</option>`).join('');
    }

    const tbodyContract = document.querySelector('#table-payroll-contracts tbody');
    if (tbodyContract) {
      tbodyContract.innerHTML = contracts.map(c => {
        const emp = emps.find(e => e.nhan_vien_id === c.nhan_vien_id);
        const dept = emp ? depts.find(d => d.phong_ban_id == emp.phong_ban_id) : null;
        return `
          <tr>
            <td><strong style="color:var(--primary);">${emp ? emp.ma_nhan_vien : ''}</strong></td>
            <td><strong>${emp ? `${emp.ho} ${emp.ten}` : ''}</strong></td>
            <td>${dept ? dept.ten_phong_ban : ''}</td>
            <td><strong style="color:var(--success); font-size:15px;">${this.formatMoney(c.luong_co_ban)}</strong></td>
            <td>${this.formatDate(c.ngay_ap_dung)}</td>
            <td><span class="badge badge-neutral">${c.loai_tien}</span></td>
            <td><button class="btn btn-sm btn-secondary"><i class="fa-solid fa-pen"></i> Adjust</button></td>
          </tr>
        `;
      }).join('');
    }

    const tbodySlips = document.querySelector('#table-payroll-slips tbody');
    if (tbodySlips) {
      tbodySlips.innerHTML = slips.map(s => {
        const emp = emps.find(e => e.nhan_vien_id === s.nhan_vien_id);
        return `
          <tr>
            <td><strong style="color:var(--primary);">${emp ? emp.ma_nhan_vien : ''}</strong></td>
            <td><strong>${emp ? `${emp.ho} ${emp.ten}` : ''}</strong></td>
            <td>${this.formatMoney(s.tong_luong_gross)}</td>
            <td>${this.formatMoney(s.tien_thuong)}</td>
            <td>${this.formatMoney(s.phu_cap)}</td>
            <td style="color:var(--danger);">${this.formatMoney(s.bao_hiem_xa_hoi)}</td>
            <td style="color:var(--danger);">${this.formatMoney(s.thue_tncn)}</td>
            <td><strong style="color:var(--primary); font-size:16px;">${this.formatMoney(s.luong_thuc_nhan)}</strong></td>
            <td>
              <button class="btn btn-sm btn-primary" onclick="window.app.viewPaySlip(${s.phieu_luong_id})"><i class="fa-solid fa-receipt"></i> Xem & In</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  calculatePayrollCurrentMonth() {
    const emps = window.db.get('nhan_vien');
    const contracts = window.db.get('luong_hop_dong');

    let periods = window.db.get('ky_tinh_luong');
    let currentPeriod = periods.find(p => p.thang === 3 && p.nam === 2026);
    if (!currentPeriod) {
      currentPeriod = { ky_luong_id: periods.length + 1, thang: 3, nam: 2026, ngay_tinh_luong: new Date().toISOString(), trang_thai: 'DA_TINH' };
      window.db.insert('ky_tinh_luong', currentPeriod);
    }

    let existingSlips = window.db.get('phieu_luong').filter(s => s.ky_luong_id !== currentPeriod.ky_luong_id);

    emps.forEach(emp => {
      const contract = contracts.find(c => c.nhan_vien_id === emp.nhan_vien_id);
      if (!contract) return;

      const gross = Number(contract.luong_co_ban);
      const bonus = gross >= 30000000 ? 5000000 : 2000000;
      const allowance = 1500000;
      const bhxh = Math.round(gross * 0.105);

      const taxable = Math.max(0, gross + bonus + allowance - bhxh - 11000000);
      let tax = 0;
      if (taxable > 0) {
        if (taxable <= 5000000) tax = taxable * 0.05;
        else if (taxable <= 10000000) tax = 250000 + (taxable - 5000000) * 0.10;
        else tax = 750000 + (taxable - 10000000) * 0.15;
      }
      tax = Math.round(tax);

      const netSalary = gross + bonus + allowance - bhxh - tax;

      existingSlips.push({
        phieu_luong_id: existingSlips.length + 1,
        ky_luong_id: currentPeriod.ky_luong_id,
        nhan_vien_id: emp.nhan_vien_id,
        tong_luong_gross: gross,
        tien_thuong: bonus,
        phu_cap: allowance,
        bao_hiem_xa_hoi: bhxh,
        thue_tncn: tax,
        luong_thuc_nhan: netSalary
      });
    });

    window.db.data.phieu_luong = existingSlips;
    window.db.save();

    this.showToast('Hệ thống đã TỰ ĐỘNG TÍNH LƯƠNG xong cho toàn bộ nhân viên!', 'success');
    this.navigateTo('view-payroll-slips');
  }

  viewPaySlip(slipId) {
    const slip = window.db.getById('phieu_luong', 'phieu_luong_id', slipId);
    if (!slip) return;

    const emp = window.db.getById('nhan_vien', 'nhan_vien_id', slip.nhan_vien_id);
    const depts = window.db.get('phong_ban');
    const jobs = window.db.get('chuc_danh');
    const dept = emp ? depts.find(d => d.phong_ban_id == emp.phong_ban_id) : null;
    const job = emp ? jobs.find(j => j.chuc_danh_id == emp.chuc_danh_id) : null;

    const container = document.getElementById('payslip-print-content');
    if (container) {
      container.innerHTML = `
        <div class="payslip-header">
          <div>
            <h2 style="color:#4f46e5; font-size:22px;">HRMASTER PRO</h2>
            <p style="font-size:12px; color:#64748b;">Công Ty Cổ Phần Công Nghệ HRMaster</p>
          </div>
          <div class="payslip-title">
            <h3>PHIẾU LƯƠNG NHÂN VIÊN</h3>
            <p style="font-size:13px; color:#64748b;">Kỳ Tính Lương Tháng 03/2026</p>
          </div>
        </div>

        <div class="payslip-grid">
          <div class="payslip-item"><label>Mã Nhân Viên</label><span>${emp ? emp.ma_nhan_vien : ''}</span></div>
          <div class="payslip-item"><label>Họ Và Tên</label><span>${emp ? `${emp.ho} ${emp.ten}` : ''}</span></div>
          <div class="payslip-item"><label>Phòng Ban</label><span>${dept ? dept.ten_phong_ban : ''}</span></div>
          <div class="payslip-item"><label>Chức Danh</label><span>${job ? job.ten_chuc_danh : ''}</span></div>
        </div>

        <table class="payslip-table">
          <thead>
            <tr>
              <th>Hạng Mục Thu Nhập & Trừ</th>
              <th style="text-align:right;">Số Tiền (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Lương Cơ Bản Gross</td>
              <td style="text-align:right; font-weight:600;">+ ${this.formatMoney(slip.tong_luong_gross)}</td>
            </tr>
            <tr>
              <td>Tiền Thưởng Hiệu Suất</td>
              <td style="text-align:right; font-weight:600;">+ ${this.formatMoney(slip.tien_thuong)}</td>
            </tr>
            <tr>
              <td>Phụ Cấp Ăn Trưa & Đi Lại</td>
              <td style="text-align:right; font-weight:600;">+ ${this.formatMoney(slip.phu_cap)}</td>
            </tr>
            <tr style="color:#ef4444;">
              <td>Bảo Hiểm Xã Hội, BHYT (10.5%)</td>
              <td style="text-align:right; font-weight:600;">- ${this.formatMoney(slip.bao_hiem_xa_hoi)}</td>
            </tr>
            <tr style="color:#ef4444;">
              <td>Thuế Thu Nhập Cá Nhân (TNCN)</td>
              <td style="text-align:right; font-weight:600;">- ${this.formatMoney(slip.thue_tncn)}</td>
            </tr>
          </tbody>
        </table>

        <div class="payslip-total">
          <span>LƯƠNG THỰC NHẬN (NET):</span>
          <span style="font-size:20px; font-weight:800;">${this.formatMoney(slip.luong_thuc_nhan)}</span>
        </div>
      `;
    }

    this.openModal('modal-payslip-view');
  }

  // ============================================================================
  // 6. LEAVE MANAGEMENT
  // ============================================================================
  renderLeave() {
    let requests = window.db.get('don_xin_nghi_phep');
    let balances = window.db.get('quy_phep_nam');
    const emps = window.db.get('nhan_vien');

    const tbodyReq = document.querySelector('#table-leave-requests tbody');
    if (tbodyReq) {
      tbodyReq.innerHTML = requests.map(r => {
        const emp = emps.find(e => e.nhan_vien_id === r.nhan_vien_id);
        const mgr = emps.find(e => e.nhan_vien_id === r.nguoi_duyet_id);

        let badge = r.trang_thai === 'DA_DUYET' ? '<span class="badge badge-success"><span class="badge-dot"></span>Đã Duyệt</span>' :
                   (r.trang_thai === 'TU_CHUOI' ? '<span class="badge badge-danger"><span class="badge-dot"></span>Từ Chối</span>' : '<span class="badge badge-warning"><span class="badge-dot"></span>Chờ Duyệt</span>');

        let typeText = r.loai_nghi_phep === 'PHEP_NAM' ? 'Phép Năm' : (r.loai_nghi_phep === 'NGHI_OM' ? 'Nghỉ Ốm' : 'Không Lương');

        return `
          <tr>
            <td>${r.don_nghi_id}</td>
            <td><strong>${emp ? `${emp.ho} ${emp.ten}` : ''}</strong></td>
            <td><span class="badge badge-neutral">${typeText}</span></td>
            <td>${this.formatDate(r.ngay_bat_dau)}</td>
            <td>${this.formatDate(r.ngay_ket_thuc)}</td>
            <td><strong style="color:var(--primary);">${r.tong_so_ngay} ngày</strong></td>
            <td>${r.ly_do}</td>
            <td>${badge}</td>
            <td>${mgr ? `${mgr.ho} ${mgr.ten}` : '---'}</td>
            <td>
              ${r.trang_thai === 'CHO_DUYET' ? `
                <button class="btn btn-sm btn-success" onclick="window.app.processLeaveRequest(${r.don_nghi_id}, 'DA_DUYET')"><i class="fa-solid fa-check"></i> Duyệt</button>
                <button class="btn btn-sm btn-danger" onclick="window.app.processLeaveRequest(${r.don_nghi_id}, 'TU_CHUOI')"><i class="fa-solid fa-xmark"></i> Từ Chối</button>
              ` : '<span class="badge badge-neutral">Đã xử lý</span>'}
            </td>
          </tr>
        `;
      }).join('');
    }

    const tbodyBal = document.querySelector('#table-leave-balances tbody');
    if (tbodyBal) {
      tbodyBal.innerHTML = balances.map(b => {
        const emp = emps.find(e => e.nhan_vien_id === b.nhan_vien_id);
        const remaining = b.tong_phep_nam - b.phep_nam_da_dung;
        return `
          <tr>
            <td><strong style="color:var(--primary);">${emp ? emp.ma_nhan_vien : ''}</strong></td>
            <td><strong>${emp ? `${emp.ho} ${emp.ten}` : ''}</strong></td>
            <td>${b.nam}</td>
            <td><span class="badge badge-neutral">${b.tong_phep_nam} ngày</span></td>
            <td style="color:var(--warning); font-weight:600;">${b.phep_nam_da_dung} ngày</td>
            <td>${b.phep_om_da_dung} ngày</td>
            <td><strong style="color:var(--success); font-size:16px;">${remaining} ngày</strong></td>
          </tr>
        `;
      }).join('');
    }
  }

  processLeaveRequest(donId, status) {
    const req = window.db.getById('don_xin_nghi_phep', 'don_nghi_id', donId);
    if (!req) return;

    window.db.update('don_xin_nghi_phep', 'don_nghi_id', donId, { trang_thai: status });

    if (status === 'DA_DUYET' && req.loai_nghi_phep === 'PHEP_NAM') {
      const balances = window.db.get('quy_phep_nam');
      const bal = balances.find(b => b.nhan_vien_id === req.nhan_vien_id && b.nam === 2026);
      if (bal) {
        window.db.update('quy_phep_nam', 'quy_phep_id', bal.quy_phep_id, {
          phep_nam_da_dung: bal.phep_nam_da_dung + Number(req.tong_so_ngay)
        });
      }
    }

    this.showToast(`Đã cập nhật trạng thái đơn nghỉ phép thành: ${status}`, 'success');
    this.renderLeave();
  }

  openLeaveRequestModal() {
    this.populateSelectDropdowns();
    if (this.currentUser && this.currentUser.empId) {
      const leaveEmpSelect = document.getElementById('leave-emp-id');
      if (leaveEmpSelect) leaveEmpSelect.value = this.currentUser.empId;
    }
    this.openModal('modal-leave-request');
  }

  saveLeaveRequest() {
    const data = {
      nhan_vien_id: document.getElementById('leave-emp-id').value,
      loai_nghi_phep: document.getElementById('leave-type').value,
      tong_so_ngay: Number(document.getElementById('leave-days').value),
      ngay_bat_dau: document.getElementById('leave-start-date').value,
      ngay_ket_thuc: document.getElementById('leave-end-date').value,
      ly_do: document.getElementById('leave-reason').value,
      trang_thai: 'CHO_DUYET',
      nguoi_duyet_id: 'b2222222-2222-2222-2222-222222222222',
      ngay_tao: new Date().toISOString().split('T')[0]
    };
    data.don_nghi_id = window.db.get('don_xin_nghi_phep').length + 1;
    window.db.insert('don_xin_nghi_phep', data);

    this.showToast('Gửi đơn xin nghỉ phép thành công!', 'success');
    this.closeModal('modal-leave-request');
    this.renderLeave();
  }

  openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
  }

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
  }

  formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  }
}

// Global Instant Binding
window.app = new HRApp();

document.addEventListener('DOMContentLoaded', () => {
  if (!window.app) window.app = new HRApp();
});
