# ============================================================================
# HRMASTER PRO - CLEAN RESET & SEED SQL SERVER QLNHANSU (WITH TAI_KHOAN TABLE)
# ============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$connStr = "Server=localhost;Database=QLNHANSU;Trusted_Connection=True;Encrypt=False;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)

try {
    $conn.Open()
    Write-Host "Resetting SQL Server QLNHANSU tables..." -ForegroundColor Yellow

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
-- Create tai_khoan table if not exists
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tai_khoan')
BEGIN
    CREATE TABLE tai_khoan (
        tai_khoan_id INT IDENTITY(1,1) PRIMARY KEY,
        nhan_vien_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES nhan_vien(nhan_vien_id) ON DELETE SET NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        mat_khau VARCHAR(100) NOT NULL,
        vai_tro VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE',
        ngay_tao DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
    );
END

-- Clear old data
DELETE FROM don_xin_nghi_phep;
DELETE FROM quy_phep_nam;
DELETE FROM phieu_luong;
DELETE FROM ky_tinh_luong;
DELETE FROM luong_hop_dong;
DELETE FROM ket_qua_danh_gia;
DELETE FROM muc_tieu_danh_gia;
DELETE FROM chu_ky_danh_gia;
DELETE FROM dang_ky_dao_tao;
DELETE FROM lich_dao_tao;
DELETE FROM khoa_hoc;
DELETE FROM phong_van;
DELETE FROM ho_so_ung_tuyen;
DELETE FROM ung_vien;
DELETE FROM tin_tuyen_dung;
DELETE FROM tai_khoan;
DELETE FROM nhan_vien;
DELETE FROM chuc_danh;
DELETE FROM phong_ban;
"@
    $cmd.ExecuteNonQuery() | Out-Null

    $sqlScript = @"
SET IDENTITY_INSERT phong_ban ON;
INSERT INTO phong_ban (phong_ban_id, ten_phong_ban, ma_phong_ban, phong_ban_cha_id) VALUES
(1, N'Ban Giám Đốc', 'BGD', NULL),
(2, N'Phòng Công Nghệ Thông Tin', 'IT', 1),
(3, N'Phòng Nhân Sự & Hành Chính', 'HR', 1),
(4, N'Phòng Kinh Doanh & Marketing', 'MKT', 1),
(5, N'Phòng Kế Toán - Tài Chính', 'KT', 1);
SET IDENTITY_INSERT phong_ban OFF;

SET IDENTITY_INSERT chuc_danh ON;
INSERT INTO chuc_danh (chuc_danh_id, ten_chuc_danh, ma_chuc_danh, mo_ta) VALUES
(1, N'Giám Đốc Điều Hành', 'CEO', N'Quản lý toàn bộ hoạt động chiến lược công ty'),
(2, N'Trưởng Phòng IT', 'TPIT', N'Điều hành phòng phần mềm & hạ tầng'),
(3, N'Kỹ Sư Phần Mềm Senior', 'SWE_SR', N'Phát triển phần mềm core & kiến trúc hệ thống'),
(4, N'Trưởng Phòng Nhân Sự', 'TPHR', N'Quản lý quy trình nhân sự, lương thưởng & đào tạo'),
(5, N'Chuyên Viên Tuyển Dụng', 'REC', N'Phụ trách thu hút nhân tài & phỏng vấn'),
(6, N'Trưởng Phòng Kinh Doanh', 'TPKD', N'Quản lý doanh số & mở rộng thị trường'),
(7, N'Chuyên Viên Kế Toán', 'KT_SR', N'Tài chính nội bộ & quản lý dòng tiền');
SET IDENTITY_INSERT chuc_danh OFF;

INSERT INTO nhan_vien (nhan_vien_id, ma_nhan_vien, ho, ten, email, so_dien_thoai, phong_ban_id, chuc_danh_id, quan_ly_id, ngay_vao_lam, trang_thai) VALUES
('A1111111-1111-1111-1111-111111111111', 'NV001', N'Nguyễn', N'Văn An', 'an.nguyen@hrmaster.vn', '0901234567', 1, 1, NULL, '2023-01-15', 'DANG_LAM'),
('B2222222-2222-2222-2222-222222222222', 'NV002', N'Trần', N'Thị Bình', 'binh.tran@hrmaster.vn', '0912345678', 2, 2, 'A1111111-1111-1111-1111-111111111111', '2023-03-01', 'DANG_LAM'),
('C3333333-3333-3333-3333-333333333333', 'NV003', N'Lê', N'Hoàng Cường', 'cuong.le@hrmaster.vn', '0923456789', 2, 3, 'B2222222-2222-2222-2222-222222222222', '2024-02-15', 'DANG_LAM'),
('D4444444-4444-4444-4444-444444444444', 'NV004', N'Phạm', N'Minh Dung', 'dung.pham@hrmaster.vn', '0934567890', 3, 4, 'A1111111-1111-1111-1111-111111111111', '2023-05-10', 'DANG_LAM'),
('E5555555-5555-5555-5555-555555555555', 'NV005', N'Võ', N'Văn Em', 'em.vo@hrmaster.vn', '0945678901', 3, 5, 'D4444444-4444-4444-4444-444444444444', '2024-06-01', 'DANG_LAM'),
('F6666666-6666-6666-6666-666666666666', 'NV006', N'Hoàng', N'Thu Giang', 'giang.hoang@hrmaster.vn', '0956789012', 5, 7, 'A1111111-1111-1111-1111-111111111111', '2023-11-20', 'DANG_LAM');

-- Table: tai_khoan seed
INSERT INTO tai_khoan (email, mat_khau, vai_tro, nhan_vien_id) VALUES
('admin@hrmaster.vn', '123456', 'ADMIN', NULL),
('an.nguyen@hrmaster.vn', '123456', 'CEO', 'A1111111-1111-1111-1111-111111111111'),
('binh.tran@hrmaster.vn', '123456', 'MANAGER', 'B2222222-2222-2222-2222-222222222222'),
('cuong.le@hrmaster.vn', '123456', 'EMPLOYEE', 'C3333333-3333-3333-3333-333333333333');

SET IDENTITY_INSERT tin_tuyen_dung ON;
INSERT INTO tin_tuyen_dung (tin_tuyen_dung_id, tieu_de, phong_ban_id, mo_ta_cong_viec, yeu_cau_cong_viec, so_luong_tuyen, muc_luong_du_kien, trang_thai, ngay_dang, ngay_het_han, nguoi_tao_id) VALUES
(1, N'Senior Fullstack Web Developer (Node.js & React)', 2, N'Phát triển phần mềm core.', N'3 năm kinh nghiệm React, SQL Server.', 2, N'25.000.000 - 35.000.000 VNĐ', 'DANG_TIN', '2026-02-01', '2026-03-31', 'E5555555-5555-5555-5555-555555555555'),
(2, N'Chuyên Viên Digital Marketing & Branding', 4, N'Tối ưu chiến dịch tiếp thị.', N'SEO, Ads, Content.', 1, N'15.000.000 - 20.000.000 VNĐ', 'DANG_TIN', '2026-02-10', '2026-03-15', 'E5555555-5555-5555-5555-555555555555');
SET IDENTITY_INSERT tin_tuyen_dung OFF;

SET IDENTITY_INSERT ung_vien ON;
INSERT INTO ung_vien (ung_vien_id, ho, ten, email, so_dien_thoai, duong_dan_cv) VALUES
(1, N'Đặng', N'Văn Hùng', 'hung.dang@gmail.com', '0988111222', 'https://example.com/cv_hung.pdf'),
(2, N'Trịnh', N'Thị Hoa', 'hoa.trinh@gmail.com', '0988333444', 'https://example.com/cv_hoa.pdf'),
(3, N'Lý', N'Văn Khoa', 'khoa.ly@gmail.com', '0988555666', 'https://example.com/cv_khoa.pdf');
SET IDENTITY_INSERT ung_vien OFF;

SET IDENTITY_INSERT ho_so_ung_tuyen ON;
INSERT INTO ho_so_ung_tuyen (ho_so_id, tin_tuyen_dung_id, ung_vien_id, trang_thai) VALUES
(1, 1, 1, 'PHONG_VAN'),
(2, 1, 2, 'DE_NGHI'),
(3, 2, 3, 'SO_TUYEN');
SET IDENTITY_INSERT ho_so_ung_tuyen OFF;

SET IDENTITY_INSERT khoa_hoc ON;
INSERT INTO khoa_hoc (khoa_hoc_id, ma_khoa_hoc, ten_khoa_hoc, mo_ta, thoi_luong_gio) VALUES
(1, 'KH01', N'Bảo Mật Thông Tin & DevSecOps Doanh Nghiệp', N'Đào tạo an toàn thông tin.', 24),
(2, 'KH02', N'Kỹ Năng Quản Lý Nhân Sự & Lãnh Đạo Nhóm', N'Dành cho quản lý cấp trung.', 16);
SET IDENTITY_INSERT khoa_hoc OFF;

SET IDENTITY_INSERT lich_dao_tao ON;
INSERT INTO lich_dao_tao (lich_dao_tao_id, khoa_hoc_id, ten_giang_vien, ngay_bat_dau, ngay_ket_thuc, dia_diem, trang_thai) VALUES
(1, 1, N'TS. Nguyễn Hoàng Nam', '2026-03-01', '2026-03-05', N'Hội trường Tầng 3', 'DANG_DIEN_RA');
SET IDENTITY_INSERT lich_dao_tao OFF;

SET IDENTITY_INSERT dang_ky_dao_tao ON;
INSERT INTO dang_ky_dao_tao (dang_ky_id, lich_dao_tao_id, nhan_vien_id, trang_thai, ma_chung_chi, ngay_cap_chung_chi, diem_so) VALUES
(1, 1, 'C3333333-3333-3333-3333-333333333333', 'HOAN_THANH', 'CERT-2026-IT01', '2026-03-05', 92.5);
SET IDENTITY_INSERT dang_ky_dao_tao OFF;

SET IDENTITY_INSERT chu_ky_danh_gia ON;
INSERT INTO chu_ky_danh_gia (chu_ky_id, ten_chu_ky, ngay_bat_dau, ngay_ket_thuc, trang_thai) VALUES
(1, N'Đánh Giá Hiệu Suất Q1/2026', '2026-01-01', '2026-03-31', 'DANG_DIEN_RA');
SET IDENTITY_INSERT chu_ky_danh_gia OFF;

SET IDENTITY_INSERT muc_tieu_danh_gia ON;
INSERT INTO muc_tieu_danh_gia (muc_tieu_id, chu_ky_id, nhan_vien_id, loai_muc_tieu, tieu_de, trong_so, chi_tieu, thuc_te) VALUES
(1, 1, 'C3333333-3333-3333-3333-333333333333', 'KPI', N'Phát triển & đóng gói 5 Module HRMaster', 40.0, 5.0, 4.0);
SET IDENTITY_INSERT muc_tieu_danh_gia OFF;

SET IDENTITY_INSERT ket_qua_danh_gia ON;
INSERT INTO ket_qua_danh_gia (danh_gia_id, chu_ky_id, nhan_vien_id, nguoi_danh_gia_id, diem_tu_danh_gia, diem_chinh_thuc, nhan_xet, trang_thai) VALUES
(1, 1, 'C3333333-3333-3333-3333-333333333333', 'B2222222-2222-2222-2222-222222222222', 88.5, 90.0, N'Hoàn thành xuất sắc nhiệm vụ.', 'PHE_DUYET');
SET IDENTITY_INSERT ket_qua_danh_gia OFF;

SET IDENTITY_INSERT luong_hop_dong ON;
INSERT INTO luong_hop_dong (luong_id, nhan_vien_id, luong_co_ban, ngay_ap_dung, loai_tien) VALUES
(1, 'A1111111-1111-1111-1111-111111111111', 50000000.00, '2023-01-15', 'VND'),
(2, 'B2222222-2222-2222-2222-222222222222', 35000000.00, '2023-03-01', 'VND'),
(3, 'C3333333-3333-3333-3333-333333333333', 25000000.00, '2024-02-15', 'VND'),
(4, 'D4444444-4444-4444-4444-444444444444', 30000000.00, '2023-05-10', 'VND'),
(5, 'E5555555-5555-5555-5555-555555555555', 16000000.00, '2024-06-01', 'VND'),
(6, 'F6666666-6666-6666-6666-666666666666', 20000000.00, '2023-11-20', 'VND');
SET IDENTITY_INSERT luong_hop_dong OFF;

SET IDENTITY_INSERT ky_tinh_luong ON;
INSERT INTO ky_tinh_luong (ky_luong_id, thang, nam, trang_thai) VALUES
(1, 2, 2026, 'DA_THANH_TOAN'),
(2, 3, 2026, 'DA_TINH');
SET IDENTITY_INSERT ky_tinh_luong OFF;

SET IDENTITY_INSERT phieu_luong ON;
INSERT INTO phieu_luong (phieu_luong_id, ky_luong_id, nhan_vien_id, tong_luong_gross, tien_thuong, phu_cap, bao_hiem_xa_hoi, thue_tncn, luong_thuc_nhan) VALUES
(1, 1, 'C3333333-3333-3333-3333-333333333333', 25000000.00, 3000000.00, 1500000.00, 2625000.00, 1850000.00, 25025000.00);
SET IDENTITY_INSERT phieu_luong OFF;

SET IDENTITY_INSERT quy_phep_nam ON;
INSERT INTO quy_phep_nam (quy_phep_id, nhan_vien_id, nam, tong_phep_nam, phep_nam_da_dung, phep_om_da_dung) VALUES
(1, 'A1111111-1111-1111-1111-111111111111', 2026, 12, 1.0, 0.0),
(2, 'B2222222-2222-2222-2222-222222222222', 2026, 12, 2.0, 1.0),
(3, 'C3333333-3333-3333-3333-333333333333', 2026, 12, 3.5, 0.0);
SET IDENTITY_INSERT quy_phep_nam OFF;

SET IDENTITY_INSERT don_xin_nghi_phep ON;
INSERT INTO don_xin_nghi_phep (don_nghi_id, nhan_vien_id, loai_nghi_phep, ngay_bat_dau, ngay_ket_thuc, tong_so_ngay, ly_do, trang_thai, nguoi_duyet_id) VALUES
(1, 'C3333333-3333-3333-3333-333333333333', 'PHEP_NAM', '2026-03-02', '2026-03-03', 2.0, N'Giải quyết công việc gia đình.', 'DA_DUYET', 'B2222222-2222-2222-2222-222222222222');
SET IDENTITY_INSERT don_xin_nghi_phep OFF;
"@

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sqlScript
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "RE-SEEDED CLEAN UTF8 SQL WITH TAI_KHOAN TABLE SUCCESSFULLY!" -ForegroundColor Green
    $conn.Close()
} catch {
    Write-Host "Error resetting SQL: $_" -ForegroundColor Red
}
